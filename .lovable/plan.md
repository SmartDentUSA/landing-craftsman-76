

# Correção de Dados Reais nos Prompts IA + Dashboard de Tokens

## Problemas Identificados

### 1. Dados não atualizados na aba "Prompts IA"
A tabela `prompts_configuration` tem campos `performance_metrics` (usage_count, success_rate, etc.) mas **nenhuma edge function registra uso**. Todas as 30+ edge functions que chamam a Lovable AI Gateway não fazem tracking de tokens nem de uso. Os contadores mostram "0 usos" e "0% taxa sucesso" porque ninguém escreve nesses campos.

### 2. Ausência de tracking de tokens
Não existe tabela nem lógica para rastrear consumo de tokens por ação. A API da Lovable AI Gateway retorna `usage.prompt_tokens`, `usage.completion_tokens` e `usage.total_tokens` na resposta, mas nenhuma function captura esses dados.

---

## Plano de Implementação

### Etapa 1 — Nova tabela `ai_token_usage`

```sql
CREATE TABLE ai_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_function_id text NOT NULL,
  action_name text NOT NULL,
  model text DEFAULT 'google/gemini-2.5-flash',
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  cost_usd numeric DEFAULT 0,
  cost_brl numeric DEFAULT 0,
  product_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ai_token_usage" ON ai_token_usage FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view ai_token_usage" ON ai_token_usage FOR SELECT USING (auth.uid() IS NOT NULL);

-- Index para filtro por mês
CREATE INDEX idx_ai_token_usage_created ON ai_token_usage(created_at);
CREATE INDEX idx_ai_token_usage_function ON ai_token_usage(edge_function_id);
```

### Etapa 2 — Helper compartilhado `_shared/track-ai-usage.ts`

Função utilitária que:
1. Recebe a response da AI Gateway, extrai `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`
2. Calcula custo em USD (baseado na tabela de preços por modelo) e converte para BRL (usando taxa fixa configurável ou API de câmbio)
3. Insere registro na tabela `ai_token_usage`
4. Atualiza `performance_metrics` na `prompts_configuration` (incrementa usage_count, atualiza last_used)

### Etapa 3 — Integração nas Edge Functions

Adicionar chamada `trackAIUsage()` após cada chamada à AI Gateway nas ~30 edge functions. Começar pelas mais usadas:
- `dual-ai-competition.ts` (cobre ~15 functions que usam `compareAndSelectBest`)
- `generate-social-content` 
- `ai-seo-generator`
- `generate-ecommerce-html`
- `generate-spin-landing-page`
- Demais functions que chamam diretamente `ai.gateway.lovable.dev`

Cada chamada registra: function_id, action_name, model, tokens, custo, produto associado.

### Etapa 4 — Componente `AITokenDashboard.tsx`

Nova aba "💰 Uso de Tokens" dentro do `EnhancedPromptsManager`, com:

**Cards resumo (topo):**
- Total de tokens no mês
- Custo total em R$
- Número de chamadas
- Custo médio por chamada

**Filtros:**
- Seletor de mês/ano
- Cotação USD→BRL editável (padrão: 5.50)

**Tabela detalhada:**
- Edge Function | Ação | Modelo | Tokens (prompt/completion/total) | Custo R$ | Data
- Agrupável por function ou por dia

**Gráfico (Recharts):**
- Barras empilhadas: uso diário de tokens por edge function
- Linha: custo acumulado no mês em R$

**Mapeamento de "onde é usado":**
Cada edge_function_id mapeado para descrição legível: ex. "generate-product-blog" → "Geração de Blog de Produto (aba Repositório → Blog)"

### Etapa 5 — Atualizar `EnhancedPromptsManager`

- Adicionar 4ª aba "💰 Tokens" ao TabsList existente (que já tem Prompts IA, Monitoramento, Analytics)
- Renderizar `<AITokenDashboard />` nessa aba

---

## Tabela de Preços por Modelo (referência)

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|----------------------|----------------------|
| gemini-2.5-flash | $0.15 | $0.60 |
| gemini-2.5-pro | $1.25 | $10.00 |
| deepseek-chat | $0.14 | $0.28 |

## Resumo

- **1 tabela** nova: `ai_token_usage`
- **1 helper** compartilhado: `track-ai-usage.ts`
- **~30 edge functions** atualizadas (maioria via helper centralizado)
- **1 componente** novo: `AITokenDashboard.tsx`
- **1 componente** editado: `EnhancedPromptsManager.tsx` (nova aba)

