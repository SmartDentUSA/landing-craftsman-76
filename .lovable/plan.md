

## Diagnóstico completo: Google APIs — 3 problemas identificados

### Problema 1: Reviews — "generated: 0"
**Causa**: O filtro `.is('response_from_owner', null)` não encontra reviews porque **todas as 20+ reviews já têm `response_from_owner` preenchido**. Não há reviews "novas" para gerar respostas.
**Solução**: Não é bug — é ausência de dados novos. O botão funciona, mas precisa de reviews sem resposta do owner. Para testar, podemos adicionar um modo que regere respostas para reviews que existem mas não têm entrada na tabela `review_responses` (independente de `response_from_owner`).

### Problema 2: YouTube — funciona parcialmente
**Status**: A geração funciona (retornou `suggested_title` para vídeo `c9C5SpEB-7o`). O update retorna `updated: 0, failed: 0` porque não há items com `status: 'approved'` — o vídeo está com status `pending` (precisa ser aprovado na UI antes de aplicar no YouTube).
**Solução**: A UI precisa de um botão "Aprovar" visível para cada sugestão, e o fluxo precisa estar claro.

### Problema 3: SEO Local — páginas genéricas sem produtos reais
**Causa raiz**: O filtro `.eq('category', target.category_name)` usa igualdade exata. As categorias no banco são `"SCANNERS 3D"` e `"IMPRESSÃO 3D"`, mas os targets têm `"Scanners Intraorais"` e `"Impressoras 3D"` — **não fazem match**. Resultado: `productsText` fica vazio, a IA inventa conteúdo genérico.
**Solução**: Usar ILIKE fuzzy matching + buscar specs técnicas reais + injetar Clinical Brain Guard.

### Mudanças propostas

**Arquivo 1: `supabase/functions/generate-local-seo-page/index.ts`**
- Substituir `.eq('category', target.category_name)` por busca fuzzy com ILIKE
- Buscar mais campos do produto: `technical_specifications`, `benefits`, `features`, `competitive_advantages`
- Injetar specs técnicas reais no prompt
- Importar `injectClinicalBrainGuard` do `_shared/clinical-brain-guard.ts`
- Melhorar o prompt para exigir dados reais dos produtos e proibir invenção

**Arquivo 2: `supabase/functions/respond-review-ai/index.ts`**
- Adicionar modo alternativo: filtrar reviews que não têm entrada em `review_responses` (em vez de depender apenas de `response_from_owner`)
- Assim, reviews existentes que ainda não foram processadas pelo sistema AI podem ser geradas

**Arquivo 3: `src/components/repository/GoogleApisTab.tsx`**
- Na seção YouTube: tornar o botão "Aprovar" mais visível e funcional para items `pending`
- Na seção Reviews: mostrar mensagem clara quando não há reviews pendentes
- Na seção SEO Local: mostrar preview do HTML gerado

**Deploy**: `generate-local-seo-page`, `respond-review-ai`

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/generate-local-seo-page/index.ts` | Editar (fuzzy match + specs reais + guard) |
| `supabase/functions/respond-review-ai/index.ts` | Editar (filtro alternativo) |
| `src/components/repository/GoogleApisTab.tsx` | Editar (UX melhorias) |

