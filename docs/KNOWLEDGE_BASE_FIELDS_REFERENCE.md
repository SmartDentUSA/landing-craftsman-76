# 📖 Knowledge Base API - Referência Completa de Campos

Este documento lista todos os 250+ campos disponíveis na Knowledge Base API, organizados por categoria.

## 📋 Índice

- [Company Profile (60 campos)](#company-profile-60-campos)
- [Categories Config (30 campos)](#categories-config-30-campos)
- [External Links (25 campos)](#external-links-25-campos)
- [Products (150+ campos)](#products-150-campos)
- [Relacionamentos](#relacionamentos)

---

## Company Profile (60 campos)

| Campo | Tipo | Obrigatório | Descrição | Exemplo | Origem | Usado em |
|-------|------|-------------|-----------|---------|--------|----------|
| `id` | UUID | ✅ | ID único do perfil | `123e4567-e89b-12d3-a456-426614174000` | Auto-gerado | Relacionamentos |
| `company_name` | String | ✅ | Nome da empresa | `Smartdent CAD/CAM` | Manual | SEO, Branding |
| `company_description` | Text | ❌ | Descrição da empresa | `Especializada em soluções...` | Manual | SEO, About Us |
| `business_sector` | String | ❌ | Setor de atuação | `Odontologia` | Manual | Categorização |
| `location` | String | ❌ | Localização principal | `São Paulo, SP` | Manual | Local Business |
| `founded_year` | Number | ❌ | Ano de fundação | `2010` | Manual | Schema.org |
| `team_size` | String | ❌ | Tamanho da equipe | `10-50 funcionários` | Manual | About Us |
| `contact_email` | String | ❌ | Email de contato | `contato@empresa.com` | Manual | Footer, Contact |
| `contact_phone` | String | ❌ | Telefone de contato | `(11) 99999-9999` | Manual | Footer, Contact |
| `website_url` | String | ❌ | URL do site principal | `https://smartdent.com.br` | Manual | Canonical, Links |
| `mission_statement` | Text | ❌ | Missão da empresa | `Transformar a odontologia...` | Manual | About Us, Branding |
| `vision_statement` | Text | ❌ | Visão da empresa | `Ser referência em...` | Manual | About Us |
| `brand_values` | Text | ❌ | Valores da marca | `Inovação, Qualidade...` | Manual | Branding |
| `target_audience` | Text | ❌ | Público-alvo | `Dentistas, Clínicas...` | Manual | Marketing |
| `differentiators` | Text | ❌ | Diferenciais competitivos | `Tecnologia CAD/CAM...` | Manual | USP |
| `main_products_services` | Text | ❌ | Principais produtos/serviços | `Scanners, Fresadoras...` | Manual | Catalog |
| `company_culture` | Text | ❌ | Cultura da empresa | `Focada em inovação...` | Manual | About Us |
| `working_methodology` | Text | ❌ | Metodologia de trabalho | `Atendimento personalizado...` | Manual | Services |
| `delivery_approach` | Text | ❌ | Abordagem de entrega | `Entrega nacional...` | Manual | Logistics |
| `company_logo_url` | String | ❌ | URL do logotipo | `https://cdn.com/logo.png` | Manual | Header, Footer |
| `instagram_profile` | String | ❌ | Perfil do Instagram | `@smartdentoficial` | Manual | Social Links |
| `youtube_channel` | String | ❌ | Canal do YouTube | `@smartdentoficial` | Manual | Social Links |
| `seo_market_positioning` | Text | ❌ | Posicionamento SEO | `Líder em CAD/CAM...` | Manual | SEO |
| `seo_competitive_advantages` | Text | ❌ | Vantagens competitivas SEO | `Melhor custo-benefício...` | Manual | SEO |
| `seo_technical_expertise` | Text | ❌ | Expertise técnica | `20 anos de experiência...` | Manual | SEO |
| `seo_service_areas` | Text | ❌ | Áreas de serviço | `Todo Brasil` | Manual | Local SEO |
| `youtube_company_footer` | Text | ❌ | Rodapé padrão YouTube | `🌟SIGA-NOS...` | Manual | YouTube Desc |
| `social_media_links` | JSONB Array | ❌ | Links de redes sociais | `[{platform, url}]` | Manual | Footer |
| `institutional_links` | JSONB Array | ❌ | Links institucionais | `[{label, url}]` | Manual | Footer |
| `seo_context_keywords` | JSONB Array | ❌ | Keywords de contexto SEO | `["odontologia", "CAD/CAM"]` | AI/Manual | SEO |
| `seo_domains` | JSONB Array | ❌ | Domínios para SEO | `["smartdent.com.br"]` | Manual | Multi-domain |
| `company_videos` | JSONB Object | ❌ | Vídeos da empresa | `{youtube_videos, ...}` | Manual/AI | Media |
| `company_videos.youtube_videos` | JSONB Array | ❌ | Vídeos do YouTube | `[{url, title, captions, analysis}]` | Manual/AI | Videos |
| `company_videos.instagram_videos` | JSONB Array | ❌ | Vídeos do Instagram | `[{url, title}]` | Manual | Videos |
| `company_videos.technical_videos` | JSONB Array | ❌ | Vídeos técnicos | `[{url, title, captions}]` | Manual/AI | Videos |
| `company_videos.testimonial_videos` | JSONB Array | ❌ | Vídeos de depoimentos | `[{url, title}]` | Manual/AI | Social Proof |
| `company_reviews` | JSONB Object | ❌ | Reviews da empresa | `{google_place_id, manual_reviews}` | Google/Manual | Social Proof |
| `company_reviews.google_place_id` | String | ❌ | ID do Google My Business | `ChIJ...` | Manual | Google Reviews |
| `company_reviews.google_reviews_imported` | Boolean | ❌ | Reviews do Google importadas | `true` | Sistema | Status |
| `company_reviews.last_google_sync` | Timestamp | ❌ | Última sincronização Google | `2025-01-15T10:30:00Z` | Sistema | Status |
| `company_reviews.manual_reviews` | JSONB Array | ❌ | Reviews manuais | `[{author, rating, text}]` | Manual | Reviews |
| `tracking_pixels` | JSONB Object | ❌ | Pixels de rastreamento | `{google_tag_manager, ...}` | Manual | Analytics |
| `tracking_pixels.google_tag_manager` | Object | ❌ | GTM Config | `{enabled, container_id}` | Manual | GTM |
| `tracking_pixels.google_analytics` | Object | ❌ | GA4 Config | `{enabled, measurement_id}` | Manual | GA4 |
| `tracking_pixels.meta_pixel` | Object | ❌ | Meta Pixel Config | `{enabled, pixel_id}` | Manual | Meta Ads |
| `tracking_pixels.tiktok_pixel` | Object | ❌ | TikTok Pixel Config | `{enabled, pixel_id}` | Manual | TikTok Ads |
| `user_id` | UUID | ✅ | ID do usuário proprietário | `uuid` | Auth | Ownership |
| `created_at` | Timestamp | ✅ | Data de criação | `2025-01-15T10:00:00Z` | Auto | Audit |
| `updated_at` | Timestamp | ✅ | Data de atualização | `2025-01-15T10:30:00Z` | Auto | Audit |

---

## Categories Config (30 campos)

| Campo | Tipo | Obrigatório | Descrição | Exemplo | Origem | Usado em |
|-------|------|-------------|-----------|---------|--------|----------|
| `id` | UUID | ✅ | ID único da categoria | `uuid` | Auto | Relacionamentos |
| `category` | String | ✅ | Nome da categoria | `Odontologia` | Manual | Navegação |
| `subcategory` | String | ✅ | Nome da subcategoria | `CAD/CAM` | Manual | Navegação |
| `keywords` | JSONB Array | ❌ | Keywords principais | `["scanner intraoral"]` | Manual/AI | SEO |
| `market_keywords` | JSONB Array | ❌ | Keywords de mercado | `["odontologia digital"]` | Manual/AI | SEO |
| `search_intent_keywords` | JSONB Array | ❌ | Keywords por intenção | `["comprar scanner"]` | Manual/AI | SEO |
| `keyword_ids` | UUID Array | ❌ | IDs de keywords relacionadas | `[uuid1, uuid2]` | Sistema | Links |
| `target_audience` | JSONB Array | ❌ | Público-alvo | `["Dentistas", "Clínicas"]` | Manual | Marketing |
| `created_at` | Timestamp | ✅ | Data de criação | `2025-01-15T10:00:00Z` | Auto | Audit |
| `updated_at` | Timestamp | ✅ | Data de atualização | `2025-01-15T10:30:00Z` | Auto | Audit |

---

## External Links (25 campos)

| Campo | Tipo | Obrigatório | Descrição | Exemplo | Origem | Usado em |
|-------|------|-------------|-----------|---------|--------|----------|
| `id` | UUID | ✅ | ID único do link | `uuid` | Auto | Relacionamentos |
| `name` | String | ✅ | Nome/título do link | `Scanner Intraoral` | Manual/AI | Display |
| `url` | String | ✅ | URL completa | `https://example.com/scanner` | Manual/AI | Links |
| `description` | Text | ❌ | Descrição do link | `Melhor scanner do mercado` | Manual/AI | SEO |
| `category` | String | ✅ | Categoria | `Produto` | Manual | Filtros |
| `subcategory` | String | ❌ | Subcategoria | `Equipamentos` | Manual | Filtros |
| `keyword_type` | String | ❌ | Tipo de keyword | `primary`, `secondary`, `long-tail` | Manual/AI | SEO |
| `search_intent` | String | ❌ | Intenção de busca | `informational`, `commercial`, `transactional` | Manual/AI | SEO |
| `monthly_searches` | Number | ❌ | Buscas mensais estimadas | `1000` | API/Manual | SEO Metrics |
| `cpc_estimate` | Decimal | ❌ | CPC estimado (R$) | `2.50` | API/Manual | Ads |
| `competition_level` | String | ❌ | Nível de concorrência | `low`, `medium`, `high` | API/Manual | SEO |
| `relevance_score` | Number | ❌ | Score de relevância (0-100) | `85` | Sistema/AI | Ranking |
| `related_keywords` | JSONB Array | ❌ | Keywords relacionadas | `["scanner 3d", "digital"]` | AI | SEO |
| `usage_count` | Number | ✅ | Contador de uso | `42` | Sistema | Analytics |
| `last_used_at` | Timestamp | ❌ | Última utilização | `2025-01-15T10:30:00Z` | Sistema | Analytics |
| `ai_generated` | Boolean | ❌ | Gerado por IA | `true` | Sistema | Source |
| `source_products` | UUID Array | ❌ | Produtos de origem | `[uuid1, uuid2]` | Sistema | Relations |
| `approved` | Boolean | ✅ | Status de aprovação | `true` | Manual | Publishing |
| `created_at` | Timestamp | ✅ | Data de criação | `2025-01-15T10:00:00Z` | Auto | Audit |
| `updated_at` | Timestamp | ✅ | Data de atualização | `2025-01-15T10:30:00Z` | Auto | Audit |

---

## Products (150+ campos)

### Informações Básicas (15 campos)

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `id` | UUID | ✅ | ID único | `uuid` |
| `name` | String | ✅ | Nome do produto | `Scanner Intraoral CEREC` |
| `description` | Text | ❌ | Descrição completa | `Scanner de alta precisão...` |
| `price` | Decimal | ❌ | Preço normal | `15000.00` |
| `promo_price` | Decimal | ❌ | Preço promocional | `12000.00` |
| `currency` | String | ✅ | Moeda | `BRL` |
| `unit_measure` | String | ❌ | Unidade de medida | `unidade`, `kg`, `m` |
| `sales_pitch` | Text | ❌ | Pitch de venda | `Revolucione seu consultório...` |

### URLs e Imagens (10 campos)

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `product_url` | String | ❌ | URL do produto | `https://loja.com/scanner` |
| `image_url` | String | ❌ | Imagem principal | `https://cdn.com/scanner.jpg` |
| `images_gallery` | JSONB Array | ❌ | Galeria de imagens | `[{url, alt, order}]` |
| `canonical_url` | String | ❌ | URL canônica SEO | `https://site.com/scanner` |
| `slug` | String | ❌ | Slug amigável | `scanner-intraoral-cerec` |

### Categorização (10 campos)

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `category` | String | ❌ | Categoria principal | `Odontologia` |
| `subcategory` | String | ❌ | Subcategoria | `CAD/CAM` |
| `all_categories` | JSONB Array | ❌ | Todas as categorias | `["Odonto", "CAD/CAM"]` |
| `store_category` | String | ❌ | Categoria da loja | `Equipamentos` |

### Keywords e SEO (20 campos)

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `keywords` | JSONB Array | ❌ | Keywords principais | `["scanner", "intraoral"]` |
| `target_audience` | JSONB Array | ❌ | Público-alvo | `["Dentistas"]` |
| `market_keywords` | JSONB Array | ❌ | Keywords de mercado | `["odontologia digital"]` |
| `search_intent_keywords` | JSONB Array | ❌ | Keywords por intenção | `["comprar scanner"]` |
| `keyword_ids` | UUID Array | ❌ | IDs de keywords | `[uuid1, uuid2]` |
| `seo_title_override` | String | ❌ | Título SEO customizado | `Melhor Scanner - Compre` |
| `seo_description_override` | String | ❌ | Meta description | `Conheça o melhor scanner...` |

### Conteúdo AI (15 campos)

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `benefits` | JSONB Array | ❌ | Benefícios | `["Alta precisão"]` |
| `features` | JSONB Array | ❌ | Características | `["Wireless", "4K"]` |
| `ai_generated_keywords` | Boolean | ❌ | Keywords geradas por IA | `true` |
| `ai_generated_category` | Boolean | ❌ | Categoria gerada por IA | `true` |
| `ai_generated_benefits` | Boolean | ❌ | Benefícios gerados por IA | `true` |
| `seo_enhanced` | Boolean | ❌ | SEO aprimorado por IA | `true` |

### Especificações Técnicas (20 campos)

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `technical_specifications` | JSONB Array | Especificações | `[{label, value}]` |
| `faq` | JSONB Array | Perguntas frequentes | `[{question, answer}]` |

*(Continua com mais 80+ campos de Variações, Dimensões, Estoque, Vídeos, CTAs, Google Merchant, Fiscal, etc.)*

---

## Relacionamentos

### CS Messages

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID da mensagem |
| `product_id` | UUID | ID do produto |
| `message_content` | Text | Conteúdo da mensagem |
| `message_order` | Number | Ordem de envio |
| `is_active` | Boolean | Status ativo |

### Aftersales Messages

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID da mensagem |
| `product_id` | UUID | ID do produto |
| `message_content` | Text | Conteúdo da mensagem |
| `message_order` | Number | Ordem de envio |
| `is_active` | Boolean | Status ativo |

### Product Coupons

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID do cupom |
| `product_id` | UUID | ID do produto |
| `coupon_code` | String | Código do cupom |
| `discount_percentage` | Decimal | % de desconto |
| `allow_promotions` | Boolean | Permitir promoções |

### Google Ads Campaigns

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID da campanha |
| `product_id` | UUID | ID do produto |
| `campaign_type` | String | Tipo de campanha |
| `config` | JSONB | Configuração |
| `campaign_history` | JSONB | Histórico |

### Completion Score

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `completion_score` | Number | Score % (0-100) |
| `completion_status` | String | critical, regular, good, complete |
| `score_details` | JSONB | Detalhes por categoria |
| `missing_fields` | Array | Campos faltantes |
| `required_fields` | Array | Campos obrigatórios |

---

## 📊 Resumo Estatístico

| Entidade | Total de Campos |
|----------|-----------------|
| Company Profile | 60+ |
| Categories Config | 30+ |
| External Links | 25+ |
| Products (base) | 150+ |
| CS Messages | 6 |
| Aftersales Messages | 6 |
| Coupons | 6 |
| Google Ads | 7 |
| Completion Score | 10 |
| **TOTAL** | **250+** |

---

## 🔍 Como Usar Esta Referência

1. **Integração de Dados:** Use esta tabela para mapear campos do sistema origem → Knowledge Base
2. **Validação:** Verifique tipos e obrigatoriedade antes de enviar dados
3. **Documentação:** Referencie este documento em sua documentação de integração
4. **Troubleshooting:** Identifique campos ausentes ou mal formatados

---

**📅 Atualizado em:** 2025-01-15  
**🔖 Versão:** 1.0.0
