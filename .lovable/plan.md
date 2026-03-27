

# Hardening Final: Concorrência, Upsert Atômico, Circuit Breaker e TTL

## Resumo

Implementar os ajustes críticos de última milha para garantir escrita segura no Wikidata: tabelas de persistência com upsert atômico (ON CONFLICT), advisory locks, circuit breaker, retry com backoff, canonicalização de hash, e TTL de logs via cron job.

---

## Arquitetura do Pipeline Final

```text
1. Build payload
2. Canonicalize (sort keys, remove nulls)
3. SHA-256 hash
4. Advisory lock (pg_advisory_xact_lock)
5. Atomic upsert (INSERT ... ON CONFLICT)
   ├─ same hash → SKIP
   └─ diff hash → UPDATE decision
6. Entity resolution (se novo)
   ├─ >0.85 → LINK existing
   ├─ 0.7-0.85 → COLLISION (manual review)
   └─ <0.7 → CREATE
7. Write guard (score < 0.7 → ABORT)
8. EXECUTE wbeditentity (futuro OAuth)
9. Persist entity_map com QID real (pós-write)
10. Log completo
11. Unlock automático (fim da transação)
```

---

## 1. Migração SQL

### Tabela `wikidata_entity_map`
- `id` UUID PK, `entity_type` TEXT NOT NULL, `internal_id` TEXT NOT NULL
- `wikidata_qid` TEXT (CHECK `~ '^Q[0-9]+$'` OR NULL)
- `payload_hash` TEXT, `sync_status` (pending/processing/synced/failed/collision/skipped)
- `lock_version` INTEGER DEFAULT 0 (optimistic locking)
- `resolution_source` TEXT (created/matched_existing/manual_link/merged)
- `collision_candidates` JSONB, `last_synced_at`, timestamps
- UNIQUE on `(entity_type, internal_id)` -- one mapping per entity
- INDEX on `sync_status`

### Tabela `wikidata_sync_logs`
- `id` UUID PK, `entity_map_id` FK nullable
- `action` TEXT, `entity_type`, `internal_id`, `wikidata_qid`
- `payload_hash`, `write_decision` (create/update/skip/abort)
- `success` BOOLEAN, `error_code` TEXT, `error_message` TEXT, `error_context` JSONB
- `semantic_grade`, `semantic_score` NUMERIC, `duration_ms` INTEGER
- `request_payload` JSONB, `response_data` JSONB
- `created_at`, `expires_at` (DEFAULT now() + 90 days)
- INDEX on `(success, created_at DESC)`

### Tabela `system_flags`
- `key` TEXT PK, `value` JSONB, `updated_at`
- Initial row: `WIKIDATA_WRITE_ENABLED = false` (circuit breaker)

### RLS
- Admin: full access via `has_role(auth.uid(), 'admin')`
- Authenticated: SELECT only on entity_map and sync_logs

### Cron Job (TTL cleanup)
- Via `pg_cron`: DELETE FROM `wikidata_sync_logs` WHERE `expires_at < now()` — scheduled daily

---

## 2. Atualizar `wikidata-payload-builder.ts`

### 2a. Canonicalização determinística
Nova função `canonicalizePayload(payload)`:
- Ordena keys recursivamente em objetos
- Remove campos null/undefined
- Ordena arrays de claims por property + datavalue determinístico

### 2b. SHA-256 real
Substituir hash simples (djb2) por `crypto.subtle.digest("SHA-256", ...)` nativo do Deno. Input = JSON do payload canonicalizado.

### 2c. Score externo
Adicionar ao `evaluateSemanticScore`:
- `+0.15` se claims têm referências com URLs externas (não apenas domínio próprio)

---

## 3. Atualizar `wikidata-sync/index.ts`

### 3a. Nova action: `resolve_and_persist`
Pipeline completo:
1. Build payload
2. Canonicalize + SHA-256
3. `pg_advisory_xact_lock(hashtext(entity_type || ':' || internal_id))`
4. Atomic upsert: `INSERT INTO wikidata_entity_map ... ON CONFLICT (entity_type, internal_id) DO UPDATE SET ...`
5. Se `payload_hash` idêntico → `write_decision = 'skip'`
6. Se novo → entity resolution → decisão automática
7. Write guard: `semantic_score < 0.7 → abort`
8. Circuit breaker: check `system_flags` WHERE key = `WIKIDATA_WRITE_ENABLED`
9. Log em `wikidata_sync_logs`
10. Retornar decisão + payload + score

### 3b. Retry com backoff exponencial
Wrapper `withRetry(fn, { max: 3, delays: [500, 1500, 3000], retryOn: ['API_RATE_LIMIT', 'NETWORK_ERROR'] })`.
Antes de retry: re-check `wikidata_entity_map.wikidata_qid` para evitar duplicação.

### 3c. Composite entity resolution
Score composto:
```
0.4 * label_similarity + 0.2 * manufacturer_match + 0.2 * domain_match + 0.2 * description_keyword_match
```
Decisão: >0.85 link, 0.7-0.85 collision, <0.7 create.

### 3d. Persistência pós-write (ordem correta)
1. Decisão → 2. Execução (wbeditentity) → 3. Persistência com QID real
Nunca registrar sucesso antes de confirmação da API.

---

## 4. Atualizar `src/services/wikidata-sync.ts`

- `resolveWikidataEntity(entityType, internalId)` — chama action `resolve_and_persist`
- Retorna `{ writeDecision, syncStatus, semanticScore, collisionCandidates }`

---

## 5. Atualizar `WikidataSyncButton.tsx`

- Badge de `sync_status` (synced/pending/collision/skipped)
- Indicador de `write_decision` no preview (create/update/skip/abort)
- Warning visual quando `writeBlocked` (score < 0.7)

---

## Arquivos

| Arquivo | Acao |
|---|---|
| SQL Migration | **Novo** — 3 tabelas, indices, RLS, cron |
| `_shared/wikidata-payload-builder.ts` | **Editar** — canonicalize, SHA-256, score externo |
| `wikidata-sync/index.ts` | **Editar** — resolve_and_persist, advisory lock, upsert, retry, circuit breaker |
| `src/services/wikidata-sync.ts` | **Editar** — resolveWikidataEntity |
| `src/components/WikidataSyncButton.tsx` | **Editar** — status badges, write decision display |

