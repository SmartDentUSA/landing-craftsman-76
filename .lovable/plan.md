
# Plano: Corrigir visibilidade dos Google Reviews do Sistema B nas Landing Pages

## Diagnostico

O Sistema B sincroniza reviews do Google para a tabela `raw_reviews` com `place_id = '14424783289422732200'`. Porem, o `company_profile.company_reviews.google_place_id` esta com valor `'generated_129209929'` (de uma importacao anterior diferente).

Quando o template engine gera a landing page, chama `fetchAllReviewsForSchema()` em `src/lib/reviews.ts`, que busca reviews de `raw_reviews` filtrando por `place_id = google_place_id`. Como os IDs nao batem, retorna 0 reviews.

Dados atuais:
- `raw_reviews`: 30 reviews com `place_id = '14424783289422732200'`
- `company_profile.google_place_id`: `'generated_129209929'`
- Resultado: 0 reviews encontrados para schema/landing page

## Correcao

### Arquivo 1: `src/lib/reviews.ts` (linhas 141-164)

Alterar a busca de Google reviews para usar fallback: se o `google_place_id` nao retornar resultados, buscar TODOS os reviews de `raw_reviews` (sem filtro de place_id):

```typescript
// Buscar reviews do Google de raw_reviews
if (companyReviews.google_place_id) {
  const { data: googleRawReviews, error: googleRawError } = await supabase
    .from("raw_reviews")
    .select("*")
    .eq("place_id", companyReviews.google_place_id);

  if (!googleRawError && googleRawReviews && googleRawReviews.length > 0) {
    // Encontrou com place_id exato
    googleRawReviews.forEach((review: any) => { /* push */ });
  } else {
    // FALLBACK: buscar todos os raw_reviews (place_id pode estar dessincronizado)
    console.warn('Fallback: buscando todos os raw_reviews...');
    const { data: allRawReviews } = await supabase
      .from("raw_reviews")
      .select("*")
      .order("extracted_at", { ascending: false })
      .limit(50);

    if (allRawReviews) {
      allRawReviews.forEach((review: any) => { /* push */ });
    }
  }
} else {
  // Sem google_place_id configurado - buscar todos
  const { data: allRawReviews } = await supabase
    .from("raw_reviews")
    .select("*")
    .order("extracted_at", { ascending: false })
    .limit(50);

  if (allRawReviews) {
    allRawReviews.forEach((review: any) => { /* push */ });
  }
}
```

### Arquivo 2: `supabase/functions/_shared/aggregate-rating-helper.ts`

Aplicar o mesmo fallback na edge function que calcula o AggregateRating. Atualmente busca `raw_reviews` via `approved_reviews` (join), mas se nao encontrar, deve buscar diretamente de `raw_reviews` sem filtro.

### Arquivo 3: `supabase/functions/sync-system-b-documents/index.ts` (preventivo)

Garantir que o `google_place_id` salvo no `company_profile` corresponda ao `place_id` usado no `raw_reviews`. Atualmente ja faz isso (linha 419), mas a sincronia anterior pode ter falhado. Adicionar log de confirmacao.

## Impacto

- Os 30 reviews do Google importados do Sistema B passarao a aparecer no schema JSON-LD das landing pages
- O AggregateRating refletira os dados reais (nota media e contagem)
- Funciona mesmo que o `place_id` esteja dessincronizado entre tabelas
- Necessario re-gerar o codigo da landing page para ver os reviews
