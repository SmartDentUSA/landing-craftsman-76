

# Por que o Dashboard de Tokens IA não atualiza

## Causa raiz

Existem **2 problemas** distintos:

### Problema 1: `generate-product-blog` e outras 6 functions que usam `compareAndSelectBest` NÃO passam `trackingContext`

A chamada na linha 643 de `generate-product-blog/index.ts`:
```typescript
const result = await compareAndSelectBest(systemPrompt, userPrompt, {
  contentType: 'blog',
  minLength: 1200,
  maxLength: 2500,
  requiredKeywords: ...
});
// ← falta o 4º parâmetro: trackingContext
```

O `trackingContext` é **opcional**, então sem ele o tracking simplesmente não executa. Isso afeta **7 functions** que usam `compareAndSelectBest`:

| Function | Ação |
|----------|------|
| `generate-product-blog` | Blog de Produto |
| `generate-product-ai-content` | Benefits/Keywords/Features (3 chamadas) |
| `generate-social-content` | Conteúdo Social (2 chamadas) |
| `generate-tiktok-content` | TikTok |
| `generate-youtube-script` | Script YouTube |
| `generate-instagram-reels-script` | Script Reels |

### Problema 2: 4 functions que chamam AI diretamente também não têm tracking

| Function | Status |
|----------|--------|
| `ai-seo-generator` | Sem tracking |
| `generate-ad-copies` | Sem tracking |
| `moderate-reviews` | Sem tracking |
| `ai-content-generator` | Sem tracking |

## Correções

### Etapa 1 — Adicionar `trackingContext` nas 7 functions que usam `compareAndSelectBest`

Cada chamada a `compareAndSelectBest()` recebe o 4º parâmetro:
```typescript
const result = await compareAndSelectBest(systemPrompt, userPrompt, {
  contentType: 'blog', ...
}, { edgeFunctionId: 'generate-product-blog', actionName: 'Blog de Produto', productName: product.name });
```

**Arquivos a editar (7):**
- `supabase/functions/generate-product-blog/index.ts`
- `supabase/functions/generate-product-ai-content/index.ts` (3 chamadas)
- `supabase/functions/generate-social-content/index.ts` (2 chamadas)
- `supabase/functions/generate-tiktok-content/index.ts`
- `supabase/functions/generate-youtube-script/index.ts`
- `supabase/functions/generate-instagram-reels-script/index.ts`

### Etapa 2 — Adicionar `trackFromResponse` nas 4 functions diretas sem tracking

**Arquivos a editar (4):**
- `supabase/functions/ai-seo-generator/index.ts`
- `supabase/functions/generate-ad-copies/index.ts`
- `supabase/functions/moderate-reviews/index.ts`
- `supabase/functions/ai-content-generator/index.ts`

### Resumo

- **11 arquivos** editados
- **~14 chamadas** de tracking adicionadas
- Nenhuma tabela ou componente novo — apenas wiring correto do tracking existente

