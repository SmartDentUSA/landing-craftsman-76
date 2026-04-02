

## Fix Google APIs — 4 Correções

### Situação Atual (verificada via banco e logs)

| Problema | Status real |
|---|---|
| Reviews | Código correto no arquivo, mas edge function possivelmente não redeployada. 27 reviews sem resposta confirmadas no banco |
| YouTube hallucination | `product_id` e `product_name` são NULL no único item da fila. A função gera conteúdo inventado sem validação |
| YouTube aprovação | Botão "Aprovar" já existe na UI (linha 456), funciona. O item tem `suggested_title` preenchido |
| SEO Local | Fuzzy matching já funciona (log mostra 5 produtos encontrados). 16 targets aprovados pendentes |

### Correções necessárias

**FIX 1 — `supabase/functions/update-youtube-metadata/index.ts`** (linhas 65-78)
- Adicionar validação antes de chamar a IA: se `product_id` e `product_name` são ambos null, marcar como `error` com mensagem clara e pular
- Importar `injectClinicalBrainGuard` e `mapProductToContext` do `_shared/clinical-brain-guard.ts`
- Se `product_id` existe, buscar produto do `products_repository` e injetar specs reais no prompt via `buildFullPrompt`
- Se só `product_name` existe (sem `product_id`), usar no prompt mas sem specs detalhadas

**FIX 2 — `supabase/functions/respond-review-ai/index.ts`**
- O código atual (linhas 56-84) já faz a lógica correta (busca 50 reviews, filtra por existência em review_responses)
- Ação: **redeploy** da função para garantir que a versão correta está ativa
- Adicionar log de diagnóstico: `console.log('[REVIEWS] Found reviews:', reviews.length, 'Without response:', newReviews.length)` para facilitar debug

**FIX 3 — `supabase/functions/generate-local-seo-page/index.ts`**
- Já funciona (log confirma 5 produtos encontrados com ILIKE)
- Ação: **redeploy** para garantir versão atualizada
- Opcional: limpar o item com `suggested_title` inventado no `youtube_metadata_queue` (reset status para pending e limpar campos suggested_*)

**FIX 4 — `src/components/repository/GoogleApisTab.tsx`** (YouTubeQueueCard)
- No formulário "Adicionar vídeo à fila": adicionar campo `product_id` obrigatório com select de produtos do repositório
- Buscar produtos ativos do `products_repository` para popular o select
- Salvar `product_id` junto com `product_name` ao inserir na fila
- Mostrar alerta visual quando item existente tem `product_id` null

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/update-youtube-metadata/index.ts` | Editar (add product validation + Clinical Brain Guard) |
| `supabase/functions/respond-review-ai/index.ts` | Editar (add diagnostic log) + redeploy |
| `supabase/functions/generate-local-seo-page/index.ts` | Redeploy apenas |
| `src/components/repository/GoogleApisTab.tsx` | Editar (product select no YouTube form) |

### Deploy
- `respond-review-ai`, `update-youtube-metadata`, `generate-local-seo-page`

