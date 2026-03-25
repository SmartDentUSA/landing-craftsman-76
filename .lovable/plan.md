

# 5 Melhorias Semânticas — Todos os Geradores HTML

## Geradores identificados (8 total)

| # | Gerador | Arquivo |
|---|---------|---------|
| 1 | **LP Principal** (Mustache) | `src/lib/template-engine.ts` |
| 2 | **Blog Editor** | `src/lib/template-engine.ts` (blogTemplate, linha 6043) |
| 3 | **SPIN Landing Page** | `supabase/functions/generate-spin-landing-page/generateHTML.ts` |
| 4 | **Clone Landing Page** | `supabase/functions/clone-landing-page/index.ts` |
| 5 | **E-commerce** | `supabase/functions/generate-ecommerce-html/index.ts` |
| 6 | **Product Blog (Mustache)** | `supabase/functions/_shared/mustache-template-engine.ts` |
| 7 | **Product Blog Publisher** | `supabase/functions/publish-product-blog-cloudflare/index.ts` |
| 8 | **Speakable config** | `src/services/seo/advancedSchemaEnhancer.ts` |

## As 5 Melhorias

### 1. Wikidata Q138636902 no `<head>` (meta + link alternate)

Adicionar em **todos os 7 geradores de HTML** (após as metas existentes):

```html
<meta name="wikidata-id" content="{wikidata_id}">
<link rel="alternate" type="application/ld+json" href="https://www.wikidata.org/wiki/Special:EntityData/{wikidata_id}.json">
```

- **LP Principal**: Adicionar no TEMPLATE_HTML (após linha 86), usando `{{#wikidata_id}}...{{/wikidata_id}}`; popular `wikidata_id` a partir de `companyProfile.wikidata_id` no processamento de dados
- **Blog Editor**: Adicionar no blogTemplate (após linha 6084)
- **SPIN**: Adicionar após linha 888 em generateHTML.ts, usando `company?.wikidata_id`
- **Clone**: Adicionar no head do HTML (após metas entity)
- **E-commerce**: Adicionar no head do HTML
- **Mustache Template**: Adicionar no head do template
- **Product Blog Publisher**: Adicionar no head

Garantir que o Organization `sameAs` em **cada gerador** inclua `https://www.wikidata.org/wiki/{wikidata_id}`. Já existe no `seo-fine-tuning.ts` (linha 148-150) — verificar que todos os geradores passam `wikidata_id` ao construir o Organization schema.

### 2. Unificar JSON-LD em bloco @graph único

**Problema atual**: `template-engine.ts` linha 5639 concatena strings (`+= '\n' + reviewsSchema`), criando 2 blocos `<script type="application/ld+json">` separados.

**Correção** no `template-engine.ts` (linhas 5636-5642):

```typescript
if (processedData.schema_json_ld) {
  const existing = JSON.parse(processedData.schema_json_ld);
  const reviewsParsed = JSON.parse(reviewsSchema);
  if (existing['@graph'] && reviewsParsed['@graph']) {
    existing['@graph'].push(...reviewsParsed['@graph']);
  } else if (existing['@graph']) {
    const { '@context': _, ...rest } = reviewsParsed;
    existing['@graph'].push(rest);
  }
  processedData.schema_json_ld = JSON.stringify(existing, null, 2);
}
```

Os demais geradores (SPIN, Clone, E-commerce) já usam `@graph` único — sem mudança necessária. O E-commerce tem um `generateFAQSchema` separado (linha 1688-1691) que gera um segundo bloco — mesclar no `@graph` principal.

### 3. Entity Linking — bloco Thing antes do footer

Adicionar em **todos os geradores**, antes do `</body>`, um bloco condicional:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Thing",
  "@id": "{website_url}/#smartdent",
  "sameAs": "https://www.wikidata.org/wiki/{wikidata_id}",
  "name": "{company_name}",
  "description": "{company_description}"
}
</script>
```

Condicional ao `wikidata_id` existir. Cada gerador recebe esse bloco de forma levemente diferente (Mustache vs template literal).

### 4. `itemscope` no `<html>` + speakable expandido

**`<html>` tag**: Em todos os 7 geradores, mudar:
- `<html lang="pt-br">` → `<html lang="pt-br" itemscope itemtype="https://schema.org/WebPage">`
- `<html lang="pt-BR">` → `<html lang="pt-BR" itemscope itemtype="https://schema.org/WebPage">`

**Speakable expandido** em `advancedSchemaEnhancer.ts` (função `generateSpeakableSpecification`): Adicionar seletores:
```typescript
".reviews-section h2",
".knowledge-feed h2",
".footer .footer-company-name",
"article p:first-of-type",
".spin-hero h1",
".product-title"
```

### 5. BreadcrumbList automático em todas as páginas

- **LP Principal**: Já tem lógica de BreadcrumbList condicional (~linha 5032). Adicionar geração automática de breadcrumb mínimo `[Home → Página Atual]` quando `schema?.breadcrumb` não estiver configurado, baseado no `canonical_url` e `seo_title`.
- **Blog Editor**: Já tem BreadcrumbList (linha 6023-6028) — OK
- **SPIN**: Verificar se já tem BreadcrumbList no `schemas` array; se não, adicionar `[Home → Soluções → {solution.title}]`
- **Clone**: Verificar/adicionar breadcrumb ao `schemaGraph["@graph"]`
- **E-commerce**: Já tem `breadcrumbSchema` no `@graph` (linha 1447) — OK
- **Product Blog**: Verificar/adicionar

## Arquivos a editar

| Arquivo | Alterações |
|---------|-----------|
| `src/lib/template-engine.ts` | Melhorias 1-5 (TEMPLATE_HTML + blogTemplate + processamento) |
| `src/services/seo/advancedSchemaEnhancer.ts` | Melhoria 4 (speakable expandido) |
| `supabase/functions/generate-spin-landing-page/generateHTML.ts` | Melhorias 1, 3, 4, 5 |
| `supabase/functions/clone-landing-page/index.ts` | Melhorias 1, 3, 4, 5 |
| `supabase/functions/generate-ecommerce-html/index.ts` | Melhorias 1, 2, 3, 4 |
| `supabase/functions/_shared/mustache-template-engine.ts` | Melhorias 1, 3, 4, 5 |
| `supabase/functions/publish-product-blog-cloudflare/index.ts` | Melhorias 1, 3, 4 |

## O que NÃO muda

- CSS, estilos, animações, carrosséis, mobile menu, FAQ interativo
- Blocos ocultos existentes (ai-summary, llm-knowledge, entity-index)
- JavaScript de interação existente
- Layout visual de qualquer página
- Edge functions que não geram HTML (republish-domain-pages, etc.)

