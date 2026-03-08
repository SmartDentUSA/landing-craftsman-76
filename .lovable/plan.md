

## Auditoria SEO: Template Engine Principal (`src/lib/template-engine.ts`)

### Gerador Principal (`generateHTML`) — COMPLETO ✅

O gerador principal de landing pages está **bem equipado** com todas as técnicas avançadas de SEO:

| Técnica SEO | Status | Detalhes |
|---|---|---|
| `meta robots: index, follow` | ✅ Forçado | Linha 3764 + fallback linha 4454 |
| Canonical URL | ✅ | Com sanitização de `https://https://` |
| Open Graph completo | ✅ | og:title, og:description, og:image, og:type, og:site_name, og:url |
| Twitter Cards | ✅ | card, title, description, image, site, creator |
| Hreflang multi-idioma | ✅ | pt-BR, en-US, es-ES, x-default |
| AI Content Policy | ✅ | GPTBot, ClaudeBot, PerplexityBot, etc. |
| Entity Reference Metas | ✅ | entity:organization, entity:product, entity:category |
| Geo Location Tags | ✅ | geo.region, geo.placename, geo.position, ICBM |
| E-E-A-T Authority | ✅ | expertise, brand-values, partnerships |
| AI Summary Block | ✅ | `clip:rect(0,0,0,0)` visually hidden |
| Definition Paragraph | ✅ | itemprop="description" |
| LLM Knowledge Layer | ✅ | role="doc-glossary" |
| Entity Index (Wikidata) | ✅ | role="doc-index" com links Wikidata |
| Citation Block | ✅ | blockquote com cite |
| Entity Index JSON-LD | ✅ | ItemList com entidades |
| Schema.org @graph | ✅ | Organization, Person, WebPage, Service, hasCredential, Speakable |
| LCP Preload | ✅ | `fetchpriority="high"` para banner |
| Lazy Loading | ✅ | CSS `content-visibility: auto` |
| Keywords deduplicação | ✅ | Max 20, deduplicadas |
| FAQ auto-agregação | ✅ | De produtos vinculados |
| Knowledge Feed SEO | ✅ | Schema + keywords enriquecidas |
| Skip to content | ✅ | Acessibilidade |
| Sitemap reference | ✅ | `<link rel="sitemap">` |

---

### Gerador de Blog (`generateBlogHTML`) — DEFICIENTE ❌

O `generateBlogHTML` (linha 5814-6275) está **muito básico** comparado ao gerador principal. Faltam:

| Técnica SEO | Status |
|---|---|
| Canonical URL | ❌ Ausente |
| Open Graph | ❌ Ausente |
| Twitter Cards | ❌ Ausente |
| Hreflang | ❌ Ausente |
| AI Content Policy | ❌ Ausente |
| Entity Reference Metas | ❌ Ausente |
| Geo Location Tags | ❌ Ausente |
| E-E-A-T (author meta) | ❌ Ausente |
| AI Summary Block | ❌ Ausente |
| Definition Paragraph | ❌ Ausente |
| LLM Knowledge Layer | ❌ Ausente |
| Schema.org JSON-LD | ❌ Ausente (nem Article/BlogPosting) |
| LCP Preload | ❌ Ausente |
| Speakable | ❌ Ausente |
| Sitemap reference | ❌ Ausente |
| `article.indexable-content` wrapper | ❌ Ausente |

---

### Plano de Implementação

**Objetivo**: Equipar `generateBlogHTML` com o mesmo nível de SEO avançado do gerador principal.

**Alterações em `src/lib/template-engine.ts`** (função `generateBlogHTML`, linhas 5814-6275):

1. **HEAD — Adicionar meta tags SEO completas**:
   - Canonical URL (baseada no domínio da landing page + slug do blog)
   - Open Graph: og:title, og:description, og:image (cover_image), og:type="article", og:site_name
   - Twitter Cards: summary_large_image
   - AI Content Policy e AI Crawler Policy
   - Entity reference metas (entity:product, entity:organization)
   - Geo location tags (do company_profile)
   - E-E-A-T: author meta, expertise
   - Hreflang tags (pt-BR, en-US, es-ES)
   - Sitemap reference
   - LCP preload para cover_image

2. **HEAD — Adicionar Schema.org JSON-LD**:
   - BlogPosting com author, datePublished, headline, image, publisher
   - Organization (do company_profile)
   - BreadcrumbList (Home → Blog → Artigo)

3. **BODY — Adicionar AI-readiness blocks**:
   - Wrapper `<article class="indexable-content">`
   - AI Summary block (visually hidden)
   - Definition paragraph (itemprop="description")
   - LLM Knowledge layer (doc-glossary)
   - Citation block

4. **Receber `companyProfile` como parâmetro** (ou buscar via `getCompanyProfileForSEO()`) para preencher dados de empresa, geo, E-E-A-T nos blogs.

