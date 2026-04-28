## Causa raiz (independente do DEEPSEEK_API_KEY)

`DEEPSEEK_API_KEY` está corretamente configurada — mas **ela nem chega a ser usada nesse fluxo**, porque o frontend invoca a Edge Function errada.

Em `src/components/google-ads/GoogleAdsProductTab.tsx`, linha 221, a função `generateAdCopies` chama:

```ts
supabase.functions.invoke('ai-content-generator', {
  body: { type: 'google_ads', productId, productData, keywords }
})
```

Problemas:

1. **A função `ai-content-generator` não existe** no projeto. As funções reais são `generate-ad-copies` (RSA via DeepSeek) e `export-product-google-ads-csv`.
2. Como o invoke retorna sem `data.adCopies`, o `if (data?.adCopies)` da linha 232 falha → cai no `else` da linha 247 → toast **"Anúncios gerados (fallback)"** com headlines genéricas tipo "Comprar X", "Melhor X em Oferta".
3. Mesmo se a função existisse com esse nome, o **contrato está duplamente errado**:
   - Body esperado por `generate-ad-copies`: `{ seoTitle, seoDescription, primaryKeyword, targetAudience }` — não `{ type, productId, productData, keywords }`.
   - Resposta de `generate-ad-copies`: `{ headlines, descriptions, paths, quality_report }` na **raiz** — não `{ adCopies: {...} }`.

Confirmado: o outro caller (`ProductAICompleteGenerator.tsx` linha 197) já usa `generate-ad-copies` com o body certo e funciona. Só `GoogleAdsProductTab` está fora do padrão.

## Correção (1 arquivo, ~30 linhas)

**`src/components/google-ads/GoogleAdsProductTab.tsx`** — reescrever apenas a função `generateAdCopies` (linhas 215-286):

- Trocar invoke para `generate-ad-copies` com body correto:
  ```ts
  {
    seoTitle: product.name,
    seoDescription: product.description || product.name,
    primaryKeyword: getProductKeywords()[0] || product.name,
    targetAudience: 'profissionais da área'
  }
  ```
- Tratar `error` real do invoke com `throw` (em vez de cair em fallback silencioso, mostra o erro real ao usuário).
- Aceitar resposta na raiz: `if (data?.headlines?.length)` em vez de `data?.adCopies`.
- Montar `updatedPreview.adCopies = { headlines: data.headlines, descriptions: data.descriptions, paths: data.paths }` e `setQualityReport(data.quality_report)` quando presente.
- Manter o ramo de fallback genérico **apenas** como rede de segurança para resposta vazia (caso raro), preservando o toast atual.

## Verificação pós-fix

1. Abrir um produto → aba Google Ads → clicar em "Gerar anúncios".
2. Esperado: toast verde **"Anúncios gerados com sucesso!"** com headlines/descriptions reais vindos do DeepSeek (não mais "Comprar X em Oferta").
3. Se houver erro real (rate limit, etc.), agora vai borbulhar como toast vermelho em vez de mascarar como "fallback".

## Não tocar

- `supabase/functions/generate-ad-copies/index.ts` (já correto)
- `ProductAICompleteGenerator.tsx` (já correto)
- Validação WCAG, banners display v4.1, quality_report, CSV export
- Demais ramos do `switch` em `GoogleAdsProductTab`

Tempo estimado: 5 min.