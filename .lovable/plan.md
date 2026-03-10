

# Injetar Tracking Pixels (GTM, GA4, Meta, TikTok) nos Geradores HTML

## Problema

Os tracking pixels configurados no Perfil da Empresa (`company_profile.tracking_pixels`) **não estão sendo injetados** em 2 dos geradores HTML principais:

| Gerador | Tracking | Status |
|---------|----------|--------|
| `generate-spin-landing-page` | `generateTrackingHeadScripts()` | ✅ OK |
| `_shared/product-blog-html-v2.ts` | `generateTrackingHeadScripts()` | ✅ OK |
| `_shared/mustache-template-engine.ts` | `getTrackingScripts()` | ✅ OK |
| `clone-landing-page` | `injectTrackingIntoHTML()` | ✅ OK |
| **`generate-ecommerce-html`** | nenhum | ❌ FALTA |
| **`publish-blog-post`** | nenhum | ❌ FALTA |

## Plano

### 1. `supabase/functions/generate-ecommerce-html/index.ts`

- Importar `generateTrackingHeadScripts`, `generateGTMNoScript`, `TrackingPixels` de `../_shared/tracking-injector.ts`
- Alterar `buildSEOHead(product)` para `buildSEOHead(product, company)` — adicionar `company` como parâmetro
- Antes de `</head>`, injetar `generateTrackingHeadScripts(company?.tracking_pixels as TrackingPixels)`
- Após `<body>`, injetar `generateGTMNoScript(company?.tracking_pixels as TrackingPixels)`
- Atualizar a chamada em `buildEcommerceHTML()` para passar `company` ao `buildSEOHead`

### 2. `supabase/functions/publish-blog-post/index.ts`

- Importar `generateTrackingHeadScripts`, `generateGTMNoScript`, `TrackingPixels` de `../_shared/tracking-injector.ts`
- Buscar `company_profile` (SELECT `tracking_pixels`) no início da função
- Na função `generateBlogHTML()`: antes de `</head>` injetar tracking head scripts, após `<body>` injetar GTM noscript

### Arquivos alterados
- `supabase/functions/generate-ecommerce-html/index.ts`
- `supabase/functions/publish-blog-post/index.ts`

