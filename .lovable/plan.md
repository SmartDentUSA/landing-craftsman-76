

## Plano v3 — incorporando os 4 ajustes finais + benchmark

### Mudanças vs v2

**Ajuste 1: Query de diagnóstico cobre 3 colunas separadamente**

```sql
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE keywords::text ~* 'palavras-chave|palavras chave|taxonomia|metadados|glossário|dicionário|repositório|vocabulário') AS lixo_keywords,
  COUNT(*) FILTER (WHERE market_keywords::text ~* 'palavras-chave|palavras chave|taxonomia|metadados|glossário|dicionário|repositório|vocabulário') AS lixo_market,
  COUNT(*) FILTER (WHERE search_intent_keywords::text ~* 'palavras-chave|palavras chave|taxonomia|metadados|glossário|dicionário|repositório|vocabulário') AS lixo_intent,
  ROUND(100.0 * COUNT(*) FILTER (WHERE keywords::text ~* '...') / NULLIF(COUNT(*), 0), 1) AS pct_keywords,
  ROUND(100.0 * COUNT(*) FILTER (WHERE market_keywords::text ~* '...') / NULLIF(COUNT(*), 0), 1) AS pct_market,
  ROUND(100.0 * COUNT(*) FILTER (WHERE search_intent_keywords::text ~* '...') / NULLIF(COUNT(*), 0), 1) AS pct_intent
FROM products_repository;
-- Idem para landing_pages.data->'seo'->'ai_keywords'
```

Decisão de prosseguir/parar baseada no **maior** dos 3 percentuais, não na média.

**Ajuste 2: Floor + cap no penalty de truncate**

```ts
// No cálculo do quality_score
const truncatePenalty = Math.min(headlinesTruncated.count, 5) * -5; // cap em -25
// ...
const finalScore = Math.max(0, totalScore); // floor em 0

// Se count > 5 → flag separada que dispara prompt mais específico, não só temperatura
if (headlinesTruncated.count > 5) {
  quality_report.requires_prompt_revision = true;
  // Próxima regeneração usa prompt enriquecido com "ATENÇÃO: limite de 30 chars é RÍGIDO. Conte os caracteres antes de retornar cada headline."
}
```

**Ajuste 3: Migration explícita por ID, sem DEFAULT global**

```sql
-- ALTER sem default
ALTER TABLE company_profile ADD COLUMN default_collector_strategy text;

-- UPDATE explícito apenas para SmartDent
UPDATE company_profile
SET default_collector_strategy = 'niche'
WHERE company_name ILIKE '%smart%dent%' OR id IN (SELECT id FROM company_profile LIMIT 1);
```

UI trata `null` como fallback `'mass'` (preserva comportamento atual para qualquer outro registro).

**Ajuste 4: `normalize()` em `_shared/text-utils.ts`**

Criar `supabase/functions/_shared/text-utils.ts` com:
```ts
export function normalize(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
export function intelligentTruncate(text: string | null | undefined, maxLength: number): string { /* ... */ }
export const LLM_META_PATTERN = /\b(palavras-chave|palavras chave|vocabulário|taxonomia|metadados|metadata|glossário|dicionário|repositório|índice|catálogo|banco|lista|gerador|ferramenta|otimização)\s+(d[aeo]s?\s+)?produtos?\b/i;
export const STANDALONE_BLOCKLIST = ['ai_keywords', 'seo_keywords', 'keyword_list'];
```

Importado em `generate-ad-copies`, `export-google-ads-csv`, `export-product-google-ads-csv` e `keyword-validators`.

### Novo: Benchmark antes/depois (peça que faltava)

**Migration: tabela `ads_generation_benchmark`**
```sql
CREATE TABLE ads_generation_benchmark (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products_repository(id),
  product_name text,
  run_label text NOT NULL, -- 'pre-fix-v3' ou 'post-fix-v3'
  run_timestamp timestamptz DEFAULT now(),
  quality_score int,
  truncated_count int,
  duplicated_count int,
  blocked_keywords_count int,
  blocked_keywords_samples text[], -- amostras pra análise de falsos negativos
  csv_hash text,
  raw_quality_report jsonb
);
-- RLS: admin only (SELECT/INSERT)
```

**Fluxo de execução:**

```text
FASE 0 — DIAGNÓSTICO (read-only, decisão go/no-go)
  └─ Query 3-colunas em products_repository + landing_pages
  └─ Reportar: tabela com pct por coluna
  └─ Decisão do usuário:
     ├─ pct_max ≤ 5%   → seguir direto
     ├─ pct_max 5-30%  → seguir + criar tarefa de revisão de prompt
     └─ pct_max > 30%  → STOP, focar em consertar gerador upstream

FASE 1 — BENCHMARK PRÉ-FIX
  └─ Selecionar 5 produtos representativos (resina, scanner, curso, etc.)
  └─ Rodar geração com código atual (sem fix)
  └─ Insert em ads_generation_benchmark com run_label = 'pre-fix-v3'

FASE 2 — IMPLEMENTAÇÃO (na ordem do v2)
  ├─ _shared/text-utils.ts (normalize, intelligentTruncate, patterns)
  ├─ Migration: backup table + UPDATE limpeza + ALTER company_profile
  ├─ generate-ad-copies: dedup, fix ReferenceError, penalty c/ floor+cap, temperatura invertida, quality_report estruturado, prompt enriquecido quando requires_prompt_revision
  ├─ truncate.test.ts (incluir casos null, '', edge case "Super Resina...")
  ├─ keyword-validators: importar de text-utils, remover duplicações
  ├─ export-google-ads-csv + export-product-google-ads-csv: getMatchTypeRatio (300/1000), collector_strategy do company_profile, persistir quality_report
  ├─ Frontend: QualityReportPanel, toggle niche/mass
  └─ types/google-ads.ts atualizado

FASE 3 — BENCHMARK PÓS-FIX
  └─ Rodar mesmos 5 produtos
  └─ Insert com run_label = 'post-fix-v3'
  └─ Query comparativa lado-a-lado:
     SELECT product_name, 
            MAX(CASE WHEN run_label='pre-fix-v3' THEN quality_score END) as pre,
            MAX(CASE WHEN run_label='post-fix-v3' THEN quality_score END) as post
     FROM ads_generation_benchmark GROUP BY product_name;
  └─ Critérios de aceite:
     ├─ score médio sobe ≥ 15 pontos → SUCESSO
     ├─ truncated_count cai pra ≤ 1 por geração → SUCESSO
     ├─ blocked_keywords_count > 0 na primeira rodada pós-fix → prova que filtro pega algo real
     └─ Se qualquer critério falhar → ROLLBACK via backup table + reverter edge functions
```

### Logging estruturado para falsos negativos

Em `keyword-validators.ts`, toda vez que blocklist bloqueia uma keyword, logar:
```ts
console.warn('[KW_BLOCKED]', JSON.stringify({
  keyword: kw,
  source: src,
  pattern_matched: matchedPattern,
  product_id: productId,
  timestamp: new Date().toISOString()
}));
```
E inserir em `ads_generation_benchmark.blocked_keywords_samples` (até 10 amostras por run) para análise posterior de falsos negativos como "linhagem do produto".

### Arquivos afetados (consolidado v3)

**Database (migrations):**
1. `_keywords_cleanup_backup_<data>` — CREATE TABLE backup (drop em 30 dias)
2. UPDATE limpeza condicional ao diagnóstico (3 colunas em `products_repository`, ai_keywords em `landing_pages`)
3. `ALTER TABLE company_profile ADD COLUMN default_collector_strategy text` (sem DEFAULT) + UPDATE explícito SmartDent
4. `CREATE TABLE ads_generation_benchmark` + RLS admin

**Edge Functions:**
- `supabase/functions/_shared/text-utils.ts` — **criar** (normalize, intelligentTruncate, LLM_META_PATTERN, STANDALONE_BLOCKLIST)
- `supabase/functions/_shared/keyword-validators.ts` — **criar ou atualizar** (importa text-utils, blocklist semântica, logging estruturado)
- `supabase/functions/generate-ad-copies/index.ts` — fix truncate (importado), dedup com normalize, fix ReferenceError, penalty floor+cap, requires_prompt_revision, temperatura 0.5→0.3→0.1, quality_report estruturado, auditoria de try/catch
- `supabase/functions/generate-ad-copies/truncate.test.ts` — **criar** (casos null, '', edge cases)
- `supabase/functions/export-google-ads-csv/index.ts` — getMatchTypeRatio(300/1000), ler collector_strategy de company_profile, persistir quality_report
- `supabase/functions/export-product-google-ads-csv/index.ts` — idem

**Frontend:**
- `src/components/google-ads/QualityReportPanel.tsx` — **criar** (badge clicável que expande breakdown)
- `src/components/google-ads/GoogleAdsTab.tsx` — toggle niche/mass + QualityReportPanel
- `src/components/google-ads/GoogleAdsProductTab.tsx` — idem
- `src/types/google-ads.ts` — quality_report, collector_strategy

### Riscos aceitos (documentados)

- Deploy fora de horário de pico (sem branches Supabase) — mitigado por backup table
- Threshold 300/1000 ainda agressivo para B2B nicho — revisita com dado real de CPC
- Falso negativo em LLM_META_PATTERN — mitigado por logging estruturado em `blocked_keywords_samples`
- Se benchmark pós-fix não atingir critérios → rollback imediato (backup table + revert edge functions via histórico)

### Critério de "pronto"

Plano só é considerado entregue quando:
1. Benchmark pós-fix mostra score médio ≥ +15 vs pré
2. Zero headlines truncados em ≥ 4 dos 5 produtos testados
3. Pelo menos 1 keyword bloqueada por LLM_META_PATTERN (prova que filtro funciona)
4. Nenhum erro em produção nas 24h seguintes

