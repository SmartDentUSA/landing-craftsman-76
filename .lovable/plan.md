

# Auditoria de Microdata Schema.org — Resultado

## Status atual

A correção anterior (Reviews Seção 4 e Video Testimonials Seção 9) já está aplicada e correta.

## Problema encontrado

**1 issue restante** em `supabase/functions/_shared/authority-data-helper.ts`:

### Seção 8 — Videoteca (linha 896)

`<section itemscope itemtype="https://schema.org/VideoGallery">` — **`VideoGallery` NÃO é um tipo válido do schema.org**. O Google reportará erro de tipo desconhecido. O JSON-LD `ItemList` já cobre esses vídeos via `generateVideoGallerySchema()`.

**Correção:** Remover microdata inválido, manter apenas HTML semântico:
```html
<!-- Antes -->
<section itemscope itemtype="https://schema.org/VideoGallery">

<!-- Depois -->
<section>
```

## Demais geradores — OK

| Gerador | Microdata | Status |
|---------|-----------|--------|
| `authority-data-helper.ts` — Reviews | `LocalBusiness` + `AggregateRating` | ✅ Corrigido |
| `authority-data-helper.ts` — Testimonials | Sem microdata (JSON-LD cobre) | ✅ Corrigido |
| `authority-data-helper.ts` — Partnerships | `Organization` + `member` | ✅ Válido |
| `authority-data-helper.ts` — Videoteca | `VideoGallery` (inválido) | ❌ Corrigir |
| `generate-ecommerce-html` — GEO block | `Organization` (hidden) | ✅ OK |
| `clone-landing-page` — GEO block | `Organization` (hidden) | ✅ OK |
| `generate-spin-landing-page` — Content | `Article` | ✅ Válido |
| `publish-product-blog-cloudflare` — FAQ | `FAQPage` + `Question/Answer` | ✅ Válido |
| `authority-data-helper.ts` — Founder | `Person` | ✅ Válido |

## Alteração

**1 arquivo**, **1 linha**:
- `supabase/functions/_shared/authority-data-helper.ts` linha 896: remover `itemscope itemtype="https://schema.org/VideoGallery"` e `itemprop="video"` dos links internos (linha 902)

