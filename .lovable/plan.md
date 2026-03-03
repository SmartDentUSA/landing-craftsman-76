

# Memória Longitudinal Real — Plano de Implementação

## Estado Atual

- O `rag-chat` é **100% stateless** — nenhuma tabela de sessão, lead ou histórico existe
- Não há `evaluate-interaction`, `agent_sessions`, nem nenhuma tabela `lia_*` no banco
- A base vetorial (`knowledge_vectors`) funciona com `match_knowledge_chunks` para RAG
- O modelo usado é `gemini-2.0-flash` (precisa atualizar para `google/gemini-2.5-flash`)
- O endpoint de embeddings usa `api.lovable.dev` (precisa migrar para `ai.gateway.lovable.dev`)

---

## O que será implementado

### Etapa 1 — Migration SQL: 4 tabelas + RLS + indexes + triggers

**`lia_leads`** — Identidade unificada do lead
- `id`, `external_id` (Piperun), `phone`, `email`, `name`, `company_name`, `role`
- `first_seen_at`, `last_seen_at`, `total_conversations`, `lead_score` (0-100)
- `tags` JSONB, `profile_summary` TEXT

**`lia_conversations`** — Sessões com estado
- `lead_id` FK, `started_at`, `ended_at`
- `current_state` (greeting/discovery/presentation/objection/closing)
- `extracted_entities` JSONB, `outcome`, `cognitive_analysis` JSONB, `channel`

**`lia_messages`** — Cada mensagem persistida
- `conversation_id` FK, `role`, `content`
- `chunks_used` JSONB, `quality_score` DECIMAL, `hallucination_flag` BOOLEAN

**`lia_lead_events`** — Timeline longitudinal
- `lead_id` FK, `event_type`, `event_data` JSONB, `source`

**Extras SQL:**
- RLS: `service_role` only (todas as tabelas)
- Indexes: `lia_leads(phone)`, `lia_leads(email)`, `lia_conversations(lead_id, started_at DESC)`, `lia_messages(conversation_id, created_at)`, `lia_lead_events(lead_id, created_at DESC)`
- Trigger: `update_updated_at_column` em todas as tabelas

### Etapa 2 — Reescrever `rag-chat/index.ts`

O fluxo passa a ser:

1. **Receber** `phone`/`email` no request (opcionais, para identificação)
2. **Buscar/criar lead** em `lia_leads` pelo identificador
3. **Buscar/criar conversação** ativa (sessão < 2h sem `ended_at`)
4. **Carregar memória longitudinal**: últimas 5 conversas + últimos 10 eventos
5. **Injetar contexto de memória** no system prompt: "Este lead já interagiu N vezes. Última conversa: [data]. Interesses: [X]. Abandonou no estágio: [Y]."
6. **RAG normal**: embedding → search chunks → build context
7. **Chamar LLM** (migrar para `ai.gateway.lovable.dev` + `google/gemini-2.5-flash`)
8. **Persistir**: salvar mensagem do user e do assistant em `lia_messages`, atualizar `lia_conversations.current_state`
9. **Fire-and-forget**: registrar `lia_lead_events` quando detectar interesse em produto

### Etapa 3 — Criar `evaluate-interaction/index.ts`

Nova edge function que:
1. Recebe `message_id` de um `lia_messages`
2. Carrega a mensagem + `chunks_used`
3. Chama LLM-as-Judge para avaliar fidelidade (0-1) e detectar alucinação
4. Atualiza `quality_score` e `hallucination_flag` na mensagem
5. Fire-and-forget (não bloqueia a resposta ao usuário)

### Etapa 4 — Registrar no `config.toml`

Adicionar `[functions.evaluate-interaction]` com `verify_jwt = false`.

---

## Resumo de arquivos

| Ação | Arquivo |
|------|---------|
| **Migration SQL** | 4 tabelas, RLS, indexes, triggers |
| **Reescrever** | `supabase/functions/rag-chat/index.ts` |
| **Criar** | `supabase/functions/evaluate-interaction/index.ts` |
| **Editar** | `supabase/config.toml` (1 nova entrada) |

