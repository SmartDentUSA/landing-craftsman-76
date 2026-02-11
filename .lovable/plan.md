
# Plano: mainEntity + mentions/about em TODOS os geradores (AI-Readiness 8.0 -> 9.5)

## Diagnostico

A funcao `enrichSchemaWithAIContext()` ja existe em `advancedSchemaEnhancer.ts` com logica completa para injetar `mainEntity`, `about` e `mentions` -- mas **nao e chamada em nenhum lugar do sistema**. Alem disso, varios geradores nao possuem esses campos no WebPage schema.

### Status atual por gerador

| Gerador | mainEntity | about | mentions | Acao |
|---------|-----------|-------|----------|------|
| product-blog-html-v2.ts | Sim | Sim | Sim | Nenhuma |
| publish-product-blog-cloudflare | Sim | Nao | Nao | Adicionar about/mentions |
| generate-spin-landing-page | Sim | Nao | Nao | Adicionar about/mentions |
| template-engine.ts (LPs) | Nao | Parcial | Nao | Adicionar os 3 |
| useSEOHTMLGenerator.ts (Blog index) | Nao | Nao | Nao | Adicionar os 3 |
| generate-ecommerce-html (E-commerce) | N/A (sem JSON-LD) | N/A | N/A | Injetar schema completo |
| clone-landing-page | N/A (sem schema) | N/A | N/A | Injetar schema completo |

## Alteracoes planejadas

### 1. template-engine.ts (LP Generator) - WebPage schema ~linha 4836

Adicionar `mainEntity`, `about` semantico (baseado em produto/solucao SPIN), e `mentions` (produtos + empresa) ao WebPage schema. Usar dados ja disponiveis em `data`, `companyProfile` e `relatedSpinSolutions`.

```text
webPageSchema.mainEntity = {
  "@type": "Product" ou "Organization",
  "@id": referencia ao produto principal ou empresa
};
webPageSchema.about = [
  { "@type": "Thing", "name": setor da empresa },
  { "@type": "Thing", "name": expertise tecnica }
];
webPageSchema.mentions = [
  produtos do @graph + Organization
];
```

### 2. generate-spin-landing-page/generateHTML.ts - WebPage ~linha 177

Ja tem `mainEntity`. Adicionar `about` (baseado no pain_type + business_sector da empresa) e `mentions` (lista de produtos da solucao + Organization).

### 3. publish-product-blog-cloudflare/index.ts - BlogPosting ~linha 776

Ja tem `mainEntity`. Adicionar `about` e `mentions` identicos ao que `product-blog-html-v2.ts` ja faz (copiar padrao).

### 4. useSEOHTMLGenerator.ts - WebPage JSON-LD ~linha 1475

O WebPage inline nao tem nenhum dos 3 campos. Adicionar `mainEntity` (Organization), `about` e `mentions` usando dados do `companySEO` e `companyProfile` ja disponiveis no escopo.

### 5. generate-ecommerce-html/index.ts - SEM JSON-LD

Este gerador produz HTML puro para e-commerce (fragmento, nao pagina completa). Nao possui nenhum bloco `<script type="application/ld+json">`. Adicionar um bloco de schema completo com Product + WebPage + FAQPage incluindo mainEntity, about e mentions.

### 6. clone-landing-page/index.ts - SEM schema

O clone manipula HTML existente (captura e transforma). Nao injeta schemas proprios. Adicionar injecao de JSON-LD com WebPage + Organization + mainEntity/about/mentions no `<head>` do HTML clonado.

### 7. Ativar enrichSchemaWithAIContext no template-engine.ts

Chamar `enrichSchemaWithAIContext(schemaGraph, companyProfile, products)` no final da construcao do `schemaGraph` no template-engine, antes de serializar. Isso garante que QUALQUER schema que passe pelo template engine receba os campos automaticamente.

## Secao Tecnica

### Arquivos modificados

1. **src/lib/template-engine.ts** (~linhas 4836-4880, ~4880+)
   - Adicionar about/mentions/mainEntity ao webPageSchema
   - Chamar enrichSchemaWithAIContext antes da serializacao final

2. **supabase/functions/generate-spin-landing-page/generateHTML.ts** (~linha 177-203)
   - Adicionar about e mentions ao WebPage schema existente

3. **supabase/functions/publish-product-blog-cloudflare/index.ts** (~linha 776-785)
   - Adicionar about e mentions ao BlogPosting schema

4. **src/hooks/useSEOHTMLGenerator.ts** (~linha 1475-1482)
   - Expandir WebPage JSON-LD inline com mainEntity, about, mentions

5. **supabase/functions/generate-ecommerce-html/index.ts** (~linha 2370+)
   - Novo bloco: injetar JSON-LD com Product + WebPage + about/mentions/mainEntity

6. **supabase/functions/clone-landing-page/index.ts**
   - Injetar JSON-LD no head do HTML clonado com WebPage + Organization

### Edge Functions a re-deployar
- generate-spin-landing-page
- publish-product-blog-cloudflare
- generate-ecommerce-html
- clone-landing-page

### Impacto esperado
- AI-Readiness: 8.0 -> 9.5/10
- Todos os geradores terao mainEntity, about e mentions
- SGE/GEO: pegada semantica expandida para motores de IA (Google SGE, Perplexity, ChatGPT Search)
- enrichSchemaWithAIContext finalmente ativado como "safety net" no template engine
