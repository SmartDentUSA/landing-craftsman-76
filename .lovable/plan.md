# Endpoint Único: `knowledge-export-full`

Criar **uma única Edge Function** que exponha **todo o conteúdo gerado no sistema** (produtos, blogs, landing pages, mensagens CS/pós-venda, imagens, vídeos, reviews, KOLs, SPIN, milestones, FAQs) já formatado em **HTML pronto + JSON estruturado + Schema.org JSON-LD**.

Substitui a necessidade de chamar `get-product-data`, `knowledge-feed`, `get_complete_knowledge_base`, `generate-product-blog`, etc., separadamente.

## URL

```
GET https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-export-full
```

## Query params (todos opcionais)

| Param | Default | Uso |
|---|---|---|
| `format` | `json` | `json` \| `html` \| `both` |
| `include` | `all` | csv: `products,blogs,landing_pages,reviews,kols,videos,messages,company,milestones,spin` |
| `slug` | — | filtra por produto específico |
| `category` | — | filtra por categoria |
| `approved_only` | `true` | só publicados/aprovados |
| `since` | — | ISO date — devolve só registros com `updated_at > since` (sync incremental) |
| `limit` / `offset` | `100` / `0` | paginação de produtos/blogs |
| `embed_html` | `true` | inclui campo `html_card` renderizado em cada item |

## Estrutura do retorno (JSON)

```json
{
  "generated_at": "2026-06-02T...",
  "company": { /* company_profile completo + JSON-LD Organization */ },
  "products": [{
    "id", "slug", "name", "category", "price", "currency",
    "description_html", "benefits[]", "features[]", "faq[]",
    "image_url", "images_gallery[]",
    "videos": {
      "youtube":   [{ "url","title","description","thumbnail" }],
      "instagram": [...], "tiktok":[...], "technical":[...], "testimonial":[...]
    },
    "ctas": { "product_url", "resource_cta1..3" },
    "messages": {
      "cs":          [/* cs_messages ordenadas */],
      "aftersales":  [/* aftersales_messages */]
    },
    "coupons": [...], "google_ads": [...],
    "schema_jsonld": { /* Product + Offer + AggregateRating */ },
    "html_card": "<article class='indexable-content'>...</article>",
    "completion_score": { "percentage", "details" }
  }],
  "blogs":         [{ "...generated_pages com html_full + schema_jsonld" }],
  "landing_pages": [{ "...landing_pages com data + html renderizado" }],
  "reviews": {
    "aggregate":   { "ratingValue","reviewCount" },
    "approved":    [...],
    "schema_jsonld": { /* AggregateRating + Review[] */ }
  },
  "video_testimonials": [...],
  "kols":              [...],
  "spin_solutions":    [...],
  "milestones":        [...],
  "stats": { "total_products", "total_blogs", "total_reviews" }
}
```

Quando `format=html` → devolve `text/html` com **um documento único** agregando todos os cards (`<article>` por produto/blog) — pronto para iframe/embed.

## Fontes de dados (já existentes, só reaproveitar)

| Bloco | Origem |
|---|---|
| Produtos + score + relações | RPC `get_complete_knowledge_base` (já consolida cs/aftersales/coupons/google_ads) |
| HTML de produto | reaproveitar `_shared/render-product-card.ts` (extrair do `generate-product-blog`) |
| HTML de blog | tabela `generated_pages.html` + `generate-blog-index` |
| HTML de LP | tabela `landing_pages.data` + builder do `save-landing-page` |
| Reviews + schema | RPC `fn_get_reviews_schema_block` |
| Vídeos | colunas JSONB já em `products_repository` |
| Schema produto | reaproveitar `useProductSchemaGenerator` (portar p/ Deno em `_shared/`) |

## Segurança e performance

- **Público (sem JWT)** — mesmo padrão do `get-product-data` / `knowledge-feed`
- Internamente usa `SERVICE_ROLE_KEY` (bypass RLS)
- **NUNCA** `select('*')` em `products_repository` — colunas explícitas (regra core do projeto)
- Cache HTTP: `Cache-Control: public, max-age=300, s-maxage=900`
- Reaproveita cache `pg_cron` de 3h do KB (regra core)
- Paginação obrigatória se `include` contém `products` sem `slug` (evita timeout)
- Suporte a `since` para sync incremental (Loja Integrada, sites externos, LIA RAG)
- CORS aberto

## Arquivos a criar/editar

```text
supabase/functions/knowledge-export-full/index.ts        (novo, < 800 linhas)
supabase/functions/_shared/render-product-card.ts        (novo — HTML do card)
supabase/functions/_shared/render-blog-card.ts           (novo — HTML do blog)
supabase/functions/_shared/build-export-payload.ts       (novo — montagem JSON)
```

Sem mudanças de schema/RLS — apenas leitura.

## Validação

1. `curl ".../knowledge-export-full?slug=bio-vitality&format=both"` → JSON + html_card preenchido
2. `curl ".../knowledge-export-full?include=reviews,company"` → payload mínimo
3. `curl ".../knowledge-export-full?since=2026-05-01"` → só deltas
4. Verificar contagem `stats.total_products` bate com SELECT count(*) WHERE approved=true
5. Validar JSON-LD com schema.org validator

## O que NÃO entra agora

- Escrita (endpoint é read-only)
- Conteúdo do System B (`okeogjgqijbfkudfjadz`) — imutável e fora do escopo
- Streaming/SSE (resposta única JSON)

Pronto para implementar quando você aprovar.
