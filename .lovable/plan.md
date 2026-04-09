

## Plano: Incluir TODOS os campos de TODAS as abas na exportacao da Apostila

### Problema
A funcao `generateCompanyMarkdown` (linhas 66-137) exporta apenas ~15 campos. A tabela `company_profile` tem ~60 campos organizados em 10 abas no frontend. Mais da metade esta ausente.

### Campos faltantes por aba

| Aba | Campos ausentes |
|-----|----------------|
| **Dados Basicos** | `company_logo_url`, `country`, `latitude`, `longitude`, `main_products_services`, `number_of_employees`, `duns_number`, `price_range`, `opening_hours`, `areas_served` |
| **Redes Sociais** | `instagram_profile`, `youtube_channel`, `social_media_handles`, `social_media_hashtags`, `youtube_tags`, `youtube_verified`, `instagram_verified` |
| **Videos da Empresa** | `company_videos` (4 arrays: youtube, instagram, testimonial, technical) |
| **Reviews** | `company_reviews` (manual_reviews array, google_place_id, last_google_sync) |
| **NPS & Interesses** | `nps_metrics` (score, total_responses, satisfaction, themes) |
| **SEO Hidden** | `seo_context_keywords`, `seo_market_positioning`, `seo_service_areas`, `seo_technical_expertise`, `seo_competitive_advantages`, `seo_domains` |
| **Parcerias** | `institutional_links` (array com label, url, category) |
| **TRK SEO** | `tracking_pixels` (GTM, Meta, TikTok, GA4 — enabled + IDs) |
| **Navegacao & Footer** | `navigation_footer_config` (menu, footer links, locations, social) |
| **Marcos** | Ja tem secao separada — OK |
| **Cultura/Metodologia** | `company_culture`, `working_methodology`, `delivery_approach` |
| **Fundador extras** | `founder_instagram`, `founder_twitter` |
| **Outros** | `wikidata_id`, `youtube_company_footer` |

### Alteracao

**Arquivo: `supabase/functions/export-complete-handbook/index.ts`**

Reescrever `generateCompanyMarkdown` (linhas 66-137) para incluir todas as subsecoes:

```text
## 1. PERFIL DA EMPRESA
### Informacoes Gerais (+ logo, country, lat/lng, employees, price_range)
### Contato e Endereco (sem mudanca)
### Missao, Visao e Valores (sem mudanca)
### Posicionamento (+ main_products_services)
### Cultura e Metodologia (company_culture, working_methodology, delivery_approach)
### Fundador / E-E-A-T (+ founder_instagram, founder_twitter)
### Redes Sociais (instagram_profile, youtube_channel, handles, hashtags, youtube_tags, verificacao)
### Videos da Empresa (4 categorias com url + description)
### SEO (6 campos seo_*)
### Tracking Pixels (GTM, Meta, TikTok, GA4 — status e IDs)
### Reviews (manual_reviews listados, google_place_id)
### NPS e Metricas (score, responses, satisfaction, themes)
### Links Institucionais / Parcerias (cada link com label, url, category)
### Navegacao e Footer (menu items, footer links, locations)
### Dados Juridicos (+ duns_number, opening_hours, areas_served)
### Wikidata (wikidata_id)
### YouTube Footer Template (youtube_company_footer)
```

A query ja faz `SELECT *` (linha 486), entao todos os dados ja estao disponiveis — so falta renderiza-los no Markdown.

