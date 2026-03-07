

# Plano: Correcoes E-E-A-T e Qualidade Semantica

## 3 Fixes identificados pelo usuario

### Fix A: Unificar Meta Author duplicada (Blog V2)

**Arquivo**: `supabase/functions/_shared/product-blog-html-v2.ts`
**Problema**: Linha 1433 tem `<meta name="author" content="companyName">` e linha 1453 tem `<meta name="author" content="founder_name">`. A segunda sobrescreve a primeira — duplicacao desnecessaria.
**Correcao**: Remover a linha 1433 (primeira ocorrencia). Manter apenas a linha 1453 que usa `founder_name` com fallback para `companyName`. O `publisher` ja esta declarado como Organization no JSON-LD `@graph`, entao a empresa nao precisa estar na meta author.

### Fix B: Envolver fragmento E-commerce em `<main>`

**Arquivo**: `supabase/functions/generate-ecommerce-html/index.ts`
**Problema**: A funcao `buildEcommerceHTML()` gera um `<article>` solto. O full page wrapper (funcao na linha ~1560) gera `<head>` + `<body>` mas nao adiciona `<main>` nem `<header>`/`<footer>`. Se o container externo (Loja Integrada) nao tiver `<main>`, o conteudo perde hierarquia semantica.
**Correcao**: No output da funcao full page (~linha 1689 `<body>`), adicionar `<main id="main-content">` logo apos `<body>` e `</main></body>` no fechamento. O `<article>` do `buildEcommerceHTML` ficara corretamente aninhado dentro de `<main>`.

Necessario verificar onde o `</body></html>` e gerado — provavelmente no caller que concatena head + body + close. Vou adicionar o `<main>` wrapper diretamente no body open/close.

### Fix C: Alt Text fallback automatico para imagens

**Arquivo**: `supabase/functions/generate-ecommerce-html/index.ts` (imagens de produto)
**Arquivo**: `supabase/functions/_shared/product-blog-html-v2.ts` (galeria)
**Arquivo**: `src/lib/seo-image-helpers.ts` (helper existente)

**Problema**: Imagens podem ter alt vazio se o campo no banco estiver null.
**Correcao**: Criar uma funcao `getImageAlt(alt, productName, companyName)` que retorna:
1. Se alt existir e nao for generico → usar alt
2. Se alt estiver vazio → `"${productName} - Odontologia Digital ${companyName}"`

Aplicar essa funcao em todos os pontos onde `<img` e gerado nos 2 geradores.

---

## Arquivos afetados: 3

1. `supabase/functions/_shared/product-blog-html-v2.ts` — remover meta author duplicada (1 linha)
2. `supabase/functions/generate-ecommerce-html/index.ts` — adicionar `<main>` wrapper + alt fallback em imagens
3. `src/lib/seo-image-helpers.ts` — adicionar funcao `getProductImageAlt()` para reuso

