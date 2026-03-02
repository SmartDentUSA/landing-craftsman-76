

# Diagnóstico: Por que Usos e Taxa de Sucesso não atualizam

## Problemas encontrados

### 1. `ai_token_usage` tabela está VAZIA
A tabela existe mas tem **zero registros**. As edge functions foram editadas com o tracking mas **não foram re-deployadas** — o código no repositório tem `trackFromResponse` mas as versões em produção (no Supabase) não.

### 2. `track-ai-usage.ts` NÃO atualiza `prompts_configuration`
O helper só faz `INSERT` na tabela `ai_token_usage`. Ele **nunca toca** em `prompts_configuration.performance_metrics` (usage_count, success_rate). Os contadores "Usos" e "Taxa Sucesso" leem de `prompts_configuration`, mas nada os incrementa.

### 3. `moderate-reviews` não usa IA
Esta function não chama nenhuma API de IA (nem Lovable Gateway, nem DeepSeek). Não deveria estar na lista de prompts IA.

### 4. `extract-youtube-captions` não tem tracking
Usa IA mas não importa `trackFromResponse`.

## Situação atual de tracking por function

| Function | Tracking no código | Deployada? | `prompts_configuration` atualizado? |
|----------|-------------------|------------|-------------------------------------|
| generate-product-blog | ✅ (via compareAndSelectBest) | ❌ Precisa deploy | ❌ |
| strategic-blog-generator | ✅ (trackFromResponse direto) | ❌ Precisa deploy | ❌ |
| generate-product-ai-content | ✅ (via compareAndSelectBest) | ❌ Precisa deploy | ❌ |
| ai-seo-generator | ✅ (trackFromResponse direto) | ❌ Precisa deploy | ❌ |
| generate-social-content | ✅ (via compareAndSelectBest) | ❌ Precisa deploy | ❌ |
| generate-ad-copies | ✅ (trackFromResponse direto) | ❌ Precisa deploy | ❌ |
| generate-tiktok-content | ✅ (via compareAndSelectBest) | ❌ Precisa deploy | ❌ |
| generate-product-faqs | ✅ (trackFromResponse direto) | ❌ Precisa deploy | ❌ |
| generate-spin-* (6 funções) | ✅ (trackFromResponse direto) | ❌ Precisa deploy | ❌ |
| generate-ecommerce-html | ✅ (trackFromResponse direto) | ❌ Precisa deploy | ❌ |
| moderate-reviews | N/A (não usa IA) | — | — |
| extract-youtube-captions | ❌ Sem tracking | — | ❌ |

## Plano de Correção

### Etapa 1 — Atualizar `track-ai-usage.ts` para incrementar `prompts_configuration`
Após inserir em `ai_token_usage`, o helper deve também fazer um UPDATE em `prompts_configuration` incrementando `usage_count` e setando `last_used` e `success_rate` no campo `performance_metrics`. Isso faz os contadores "Usos" e "Taxa Sucesso" funcionarem automaticamente.

### Etapa 2 — Adicionar tracking em `extract-youtube-captions`
Adicionar `trackFromResponse` após cada chamada de IA nesta function.

### Etapa 3 — Remover `moderate-reviews` da lista de prompts IA
Ou substituí-la por uma function que realmente usa IA (ex: `extract-youtube-captions`, `generate-instagram-reels-script`, `generate-youtube-script`).

### Etapa 4 — Mudar dashboard "Usos" para ler de `ai_token_usage` em vez de `prompts_configuration`
Como `ai_token_usage` terá dados reais (pós-deploy), o componente deve contar chamadas diretamente da tabela de tokens — mais confiável que `performance_metrics` manual.

### Resumo de arquivos

- **1 arquivo editado**: `supabase/functions/_shared/track-ai-usage.ts` (adicionar update em prompts_configuration)
- **1 arquivo editado**: `supabase/functions/extract-youtube-captions/index.ts` (adicionar tracking)
- **1 arquivo editado**: `src/components/EnhancedPromptsManager.tsx` (trocar moderate-reviews por functions reais + ler contadores de ai_token_usage)

