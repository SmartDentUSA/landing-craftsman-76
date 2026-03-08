

# Auditoria: Uso dos Dados do Perfil da Empresa pelos Geradores de HTML

## Tabs do Perfil da Empresa (CompanyProfileManager.tsx)

```text
Tab                    │ Campos no DB
═══════════════════════╪═══════════════════════════════════════════
1. Dados Básicos       │ company_name, company_description, business_sector,
                       │ target_audience, main_products_services, brand_values,
                       │ website_url, contact_email, contact_phone,
                       │ youtube_channel, instagram_profile,
                       │ country, state, city, street_address, address_number,
                       │ postal_code, mission_statement, vision_statement,
                       │ company_culture, working_methodology, delivery_approach,
                       │ differentiators, founded_year, team_size,
                       │ company_logo_url, company_logo_supabase_path,
                       │ youtube_company_footer, founder_name, founder_title,
                       │ founder_linkedin, latitude, longitude,
                       │ opening_hours, price_range, areas_served,
                       │ legal_name, tax_id, duns_number, number_of_employees
2. Redes Sociais       │ social_media_links, social_media_hashtags,
                       │ social_media_handles, youtube_verified, instagram_verified
3. Vídeos da Empresa   │ company_videos (youtube, instagram, testimonial, technical)
4. Reviews             │ company_reviews (google_place_id, manual_reviews)
5. NPS & Interesses    │ nps_metrics
6. SEO Hidden          │ seo_context_keywords, seo_market_positioning,
                       │ seo_competitive_advantages, seo_technical_expertise,
                       │ seo_service_areas, seo_domains
7. Parcerias           │ institutional_links (with partnership_type, country, etc.)
8. TRK SEO             │ tracking_pixels (GTM, GA4, Meta, TikTok)
9. Navegação & Footer  │ navigation_footer_config (menu + footer)
10. Marcos             │ company_milestones (tabela separada)
```

## Matriz: Quem Consome o Quê

```text
Campo DB                    │ ecommerce │ SPIN  │ blog-v2 │ clone │ template │
════════════════════════════╪═══════════╪═══════╪═════════╪═══════╪══════════╡
Tab 1: DADOS BÁSICOS        │           │       │         │       │          │
 company_name               │ ✅ select │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 company_description        │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 business_sector            │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 target_audience            │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 main_products_services     │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 brand_values               │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 website_url                │ ✅ select │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 contact_email              │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 contact_phone              │ ✅ select │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 youtube_channel            │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 instagram_profile          │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 country/state/city/address │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ✅ client│
 postal_code                │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ✅ client│
 mission_statement          │ ✅ select │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 vision_statement           │ ✅ select │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 company_culture            │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ❌       │
 working_methodology        │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ❌       │
 delivery_approach          │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 differentiators            │ ✅ select │ ✅ *  │ ✅ auth │ ✅ *  │ ❌       │
 founded_year               │ ✅ select │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 team_size                  │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 company_logo_url           │ ✅ select │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 youtube_company_footer     │ ✅ select │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 founder_name               │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ❌       │
 founder_title              │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ❌       │
 founder_linkedin           │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ❌       │
 latitude/longitude         │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ✅ client│
 opening_hours              │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 price_range                │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 areas_served               │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 legal_name                 │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 tax_id                     │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 duns_number                │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 number_of_employees        │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
────────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
Tab 2: REDES SOCIAIS        │           │       │         │       │          │
 social_media_links         │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 social_media_hashtags      │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 social_media_handles       │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 youtube_verified           │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 instagram_verified         │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
────────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
Tab 3: VÍDEOS               │           │       │         │       │          │
 company_videos             │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ❌       │
────────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
Tab 4: REVIEWS              │           │       │         │       │          │
 company_reviews            │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
 google_aggregate_rating    │ ❌        │ ✅ *  │ ✅ agg  │ ✅ *  │ ❌       │
────────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
Tab 5: NPS                  │           │       │         │       │          │
 nps_metrics                │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
────────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
Tab 6: SEO HIDDEN           │           │       │         │       │          │
 seo_context_keywords       │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 seo_market_positioning     │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 seo_competitive_advantages │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 seo_technical_expertise    │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 seo_service_areas          │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ✅ client│
 seo_domains                │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ❌       │
────────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
Tab 7: PARCERIAS            │           │       │         │       │          │
 institutional_links        │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ✅ client│
────────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
Tab 8: TRK SEO              │           │       │         │       │          │
 tracking_pixels            │ ❌        │ ✅ *  │ ✅ auth │ ✅ *  │ ❌       │
────────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
Tab 9: NAVEGAÇÃO & FOOTER   │           │       │         │       │          │
 navigation_footer_config   │ ❌        │ ✅ *  │ ❌      │ ✅ *  │ ✅ client│
────────────────────────────┼───────────┼───────┼─────────┼───────┼──────────┤
Tab 10: MARCOS              │           │       │         │       │          │
 company_milestones (table) │ ❌        │ ❌    │ ❌      │ ❌    │ ❌       │

* SPIN e clone-LP fazem SELECT * — recebem todos os campos
```

**Legenda:**
- `✅ select` = Campo listado explicitamente no SELECT
- `✅ *` = SELECT * (recebe tudo mas pode não usar)
- `✅ auth` = Recebido via `authority-data-helper.ts` (select parcial)
- `✅ client` = Via `getCompanyProfileForSEO()` client-side
- `❌` = Não buscado / não disponível

## Problemas Identificados

### CRÍTICO: E-commerce busca apenas 11 de 50+ campos

O `generate-ecommerce-html/index.ts` linha 186 faz:
```
SELECT company_name, company_description, company_logo_url,
       mission_statement, vision_statement, differentiators,
       founded_year, website_url, contact_phone, location,
       youtube_company_footer
```

Faltam **39+ campos** incluindo: endereço estruturado, founder, SEO Hidden, tracking pixels, redes sociais, reviews, NPS, institutional_links, opening_hours, areas_served, dados jurídicos.

### CRÍTICO: Blog-v2 não busca direto — depende do authority-data-helper

O `product-blog-html-v2.ts` recebe dados via `authority-data-helper.ts` que busca 25 campos — mas falta: `country/state/city/address`, `founded_year`, `team_size`, `opening_hours`, `price_range`, `areas_served`, `legal_name`, `tax_id`, `duns_number`, `number_of_employees`, `seo_domains`, `navigation_footer_config`, `tracking_pixels` (parcial), `nps_metrics`, `company_reviews`.

### CRÍTICO: Template-engine depende de `getCompanyProfileForSEO()` client-side

O helper client-side busca ~35 campos, mas não inclui: `opening_hours`, `price_range`, `areas_served`, `legal_name`, `tax_id`, `duns_number`, `number_of_employees`, `google_aggregate_rating`, `founder_linkedin`.

### CRÍTICO: company_milestones não é consumido por NENHUM gerador

A tabela `company_milestones` (Tab 10) com timeline, certificações, tecnologias, key_people — dados riquíssimos para E-E-A-T — não é buscada por nenhum gerador de HTML.

### Problema de design: SELECT * vs SELECT explícito

SPIN e clone-LP usam `SELECT *` — automaticamente recebem novos campos. Mas ecommerce, blog-v2 e template-engine usam SELECT explícito — novos campos adicionados ao perfil **não fluem automaticamente** para esses geradores.

## Plano de Correção — 4 Mudanças

### Fix 1: E-commerce — expandir SELECT para `*`
**Arquivo**: `supabase/functions/generate-ecommerce-html/index.ts` (~linha 186)
Trocar o SELECT explícito de 11 campos por `SELECT *` (igual SPIN e clone-LP). Garantir que o `buildEcommerceHTML()` receba e utilize os campos adicionais para: tracking pixels no HEAD, endereço no footer, founder no schema Person, opening_hours no LocalBusiness, areas_served no GeoCircle.

### Fix 2: Blog-v2 — expandir authority-data-helper
**Arquivo**: `supabase/functions/_shared/authority-data-helper.ts` (~linha 172)
Adicionar ao SELECT: `country, state, city, street_address, address_number, postal_code, latitude, longitude, founded_year, team_size, opening_hours, price_range, areas_served, legal_name, tax_id, duns_number, number_of_employees, seo_domains, navigation_footer_config, google_aggregate_rating, nps_metrics, company_reviews, tracking_pixels, company_logo_supabase_path`.
Alternativa: trocar para `SELECT *`.

### Fix 3: Template-engine — expandir `getCompanyProfileForSEO()`
**Arquivo**: `src/lib/company-profile-helper.ts` (~linha 182)
Adicionar ao SELECT: `opening_hours, price_range, areas_served, legal_name, tax_id, duns_number, number_of_employees, google_aggregate_rating, founder_linkedin`. Atualizar a interface `CompanyProfileData` para incluir esses campos.

### Fix 4: Integrar company_milestones nos geradores
**Arquivo**: `supabase/functions/_shared/authority-data-helper.ts`
Criar nova função `fetchCompanyMilestones()` que busca milestones publicados. Integrar no JSON-LD como `Event` schema ou no Authority Context HTML como timeline de conquistas. Injetar nos 5 geradores via o helper existente.

**Impacto**: Ao trocar para `SELECT *` nos geradores (fixes 1-3), qualquer novo campo adicionado ao Perfil da Empresa fluirá automaticamente para os geradores. O fix 4 garante que marcos/certificações da empresa também sejam consumidos.

**Total: 4 arquivos, ~80 linhas de alteração**

