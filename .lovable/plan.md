

# Correção e Melhoria do Sistema A — Plano de Implementação

## Resumo

5 entregas principais: (1) Dashboard RAG Metrics, (2) Rate Limiting shared module, (3) Indexes de performance, (4) Pipeline audit logging, (5) Frontend integration dos campos pendentes.

---

## 1. Dashboard de Métricas RAG (`/admin/metrics/rag`)

**Nova página:** `src/pages/RAGMetricsDashboard.tsx`
**Novo hook:** `src/hooks/useRAGMetrics.ts`

O hook consulta diretamente as tabelas existentes:
- `lia_messages` — `quality_score`, `hallucination_flag`, `chunks_used` para calcular precisao RAG e taxa de alucinacao
- `ai_token_usage` — filtrar por `edge_function_id = 'rag-chat'` e `'index-knowledge-base'` para latencia e custos
- `knowledge_vectors` — COUNT para total de chunks indexados
- `lia_conversations` — metricas de sessao (estados, duracoes)
- `products_repository` — filtrar por `clinical_brain_status` para precisao Clinical Brain

**Metricas exibidas:**
- Cards: Total chunks indexados, Taxa alucinacao (%), Quality Score medio, Custo RAG 24h (BRL)
- Grafico: Qualidade RAG ao longo do tempo (recharts AreaChart)
- Tabela: Ultimas mensagens com hallucination_flag=true
- Barra: Clinical Brain status breakdown (empty/generated/validated)

**Rota:** Adicionar `/admin/metrics/rag` em `App.tsx` com `<ProtectedRoute requiredRole="admin">`

---

## 2. Rate Limiting Global (Shared Module)

**Novo arquivo:** `supabase/functions/_shared/rate-limiter.ts`

Implementar rate limiter baseado em tabela `ai_token_usage` (sem nova tabela):
- Contar requests nos ultimos 60s por `edge_function_id`
- Limites configuráveis por funcao (default: 30 req/min para geradores, 60 req/min para RAG)
- Retornar `{ allowed: boolean, retryAfter?: number }`

Integrar no inicio das edge functions criticas:
- `rag-chat`
- `generate-ecommerce-html`
- `generate-social-content`
- `generate-product-ai-content`

**Nao cria nova tabela** — usa contagem em `ai_token_usage` que ja registra cada chamada AI.

---

## 3. Migração: Indexes de Performance

**SQL Migration:**
```sql
-- Job queue locking index (se nao existir)
CREATE INDEX IF NOT EXISTS idx_content_jobs_locked 
ON content_jobs(status, locked_at) 
WHERE locked_at IS NULL;

-- Content jobs por status e prioridade (worker query)
CREATE INDEX IF NOT EXISTS idx_content_jobs_pending
ON content_jobs(status, priority, scheduled_at)
WHERE status = 'pending';

-- Pipeline audit logs table
CREATE TABLE IF NOT EXISTS pipeline_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES content_submissions(id),
  step_number integer NOT NULL,
  step_name text NOT NULL,
  status text NOT NULL DEFAULT 'started',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  input_summary jsonb DEFAULT '{}',
  output_summary jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pipeline_audit_submission 
ON pipeline_audit_logs(submission_id, step_number);

-- RLS
ALTER TABLE pipeline_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read pipeline logs"
ON pipeline_audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

---

## 4. Pipeline Audit Logging

**Modificar:** `supabase/functions/process-content-submission/index.ts`

Adicionar helper `logPipelineStep()` que insere em `pipeline_audit_logs` no inicio e fim de cada step:

```typescript
async function logPipelineStep(supabase, submissionId, step, name, status, data?) {
  await supabase.from('pipeline_audit_logs').insert({
    submission_id: submissionId,
    step_number: step,
    step_name: name,
    status,
    ...(data || {})
  });
}
```

Envolver cada um dos 16 steps com try/catch + logging de inicio, sucesso, e erro com `duration_ms`.

**Dashboard integration:** O RAG Metrics Dashboard incluira uma tab "Pipeline" mostrando os logs de auditoria das ultimas submissions com status por step.

---

## 5. Frontend: Integrar Campos Pendentes

### 5.1 `rejection_reason` em `content_submissions`
- Nao existe nenhum componente frontend que leia `content_submissions`
- Criar componente `ContentSubmissionsManager.tsx` na aba Pipeline do RAG Dashboard
- Tabela com: title, source_system, processing_status, rejection_reason, processed_by, created_at
- Botao para rejeitar submission (preenche rejection_reason)

### 5.2 `canonical_url` em `generated_pages`
- Ja esta integrado no template engine (`src/lib/template-engine.ts`) e no SEO generator (`useSEOHTMLGenerator.ts`)
- Verificar que aparece no Pipeline dashboard ao listar generated_pages

### 5.3 `content_status` em `generated_pages`
- Exibir no Pipeline dashboard com badge colorido (draft/published/archived)

---

## Arquivos a Criar/Modificar

| Acao | Arquivo |
|------|---------|
| Criar | `src/pages/RAGMetricsDashboard.tsx` |
| Criar | `src/hooks/useRAGMetrics.ts` |
| Criar | `src/components/ContentSubmissionsManager.tsx` |
| Criar | `src/components/PipelineAuditViewer.tsx` |
| Criar | `supabase/functions/_shared/rate-limiter.ts` |
| Modificar | `supabase/functions/process-content-submission/index.ts` (add audit logging) |
| Modificar | `supabase/functions/rag-chat/index.ts` (add rate limiter) |
| Modificar | `src/App.tsx` (add /admin/metrics/rag route) |
| Modificar | `supabase/config.toml` (no changes needed, existing functions) |
| Migration | Create `pipeline_audit_logs` table + indexes |

