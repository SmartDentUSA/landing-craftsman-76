

# Correção de Microdata Schema.org para Reviews (Erros Google)

## Problemas identificados

Arquivo único: `supabase/functions/_shared/authority-data-helper.ts` — 2 seções com microdata inválido.

### Seção 4 (Reviews, linhas 759-772)

1. **`<section itemscope itemtype="Organization">`** — wrapper errado. Google espera que `review` esteja dentro de `LocalBusiness` ou `Product`, não `Organization` genérico sem propriedades obrigatórias (name, etc.)
2. **`<meta itemprop="reviewRating" itemscope itemtype="Rating" content="...">`** — `<meta>` não suporta `itemscope`. Precisa ser `<div>` ou `<span>` com `ratingValue` interno
3. Falta `aggregateRating` no container

### Seção 9 (Video Testimonials, linhas 898-914)

4. **`<li itemscope itemtype="Review">`** — Review sem `@context` implícito e sem `reviewRating`, gera warnings no Google

## Correções

### 1. Seção 4 — Reviews (linhas 759-772)

Trocar wrapper de `Organization` para `LocalBusiness` com `name` e `aggregateRating`, e corrigir `reviewRating`:

```html
<section itemscope itemtype="https://schema.org/LocalBusiness">
  <meta itemprop="name" content="${companyName}">
  <div itemprop="aggregateRating" itemscope itemtype="https://schema.org/AggregateRating">
    <meta itemprop="ratingValue" content="${avgRating}">
    <meta itemprop="reviewCount" content="${reviews.length}">
  </div>
  <h4>Avaliações de Clientes Verificados</h4>
  ${reviews.map(r => `
    <article itemprop="review" itemscope itemtype="https://schema.org/Review">
      <blockquote itemprop="reviewBody">...</blockquote>
      <cite itemprop="author" itemscope itemtype="https://schema.org/Person">
        <span itemprop="name">...</span>
      </cite>
      <div itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">
        <meta itemprop="ratingValue" content="${r.rating}">
        <meta itemprop="bestRating" content="5">
      </div>
    </article>
  `)}
</section>
```

- Calcular `avgRating` como média dos ratings dos reviews
- Adicionar `companyName` (já disponível como parâmetro da função)

### 2. Seção 9 — Video Testimonials (linhas 898-914)

Remover microdata `itemscope itemtype="Review"` dos `<li>` de vídeo testimonials — esses já são cobertos pelo JSON-LD `@graph`. Microdata duplicado sem campos obrigatórios gera erros. Manter apenas HTML semântico sem microdata.

### Resumo

- **1 arquivo** modificado: `authority-data-helper.ts`
- **2 seções** corrigidas
- Elimina erros Google de microdata inválido em todas as páginas geradas

