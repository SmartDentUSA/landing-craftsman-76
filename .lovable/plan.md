

# Gerar Documento .MD — Mapeamento Completo dos Cards de Produtos

## Objetivo

Criar `/mnt/documents/product-card-mapping.md` documentando todos os 100+ campos, seções, sub-componentes, ações IA e consumidores do `ProductEditModal.tsx` (4568 linhas).

## Conteúdo do documento

### 1. Visão Geral da Arquitetura
- Tabela `products_repository` como source of truth
- Componente principal: `ProductEditModal.tsx`
- Auto-save via `useProductAutoSave`

### 2. Mapeamento por Seção (ordem exata da UI)

| Seção | Campos |
|-------|--------|
| **Importação Loja Integrada** | ProductLojaIntegradaImporter, overwrite toggle |
| **Auto-Preencher Card com IA** | Botão generate-product-card-from-transcription |
| **Dados Básicos** (6 campos) | name, category, description, sales_pitch, applications, subcategory |
| **Workflow Stages** | scan, design, print, process, finish, install (cada com applicable, role, description, pain_points, competitive_advantages, related_materials, related_products) |
| **Clinical Brain v1.0** (9 campos) | product_type, forbidden_products, required_products, anti_hallucination_rules, clinical_brain_status, generated_at, validated_at, validator_name, validation_notes |
| **SEO & URL** (4 campos) | seo_title_override, seo_description_override, slug, original_data.li_product_id |
| **Preço** (3 campos) | price, currency, promo_price |
| **Imagem Principal** (3 campos) | image_url, image_supabase_path, image_alt |
| **Galeria de Imagens** | images_gallery (array de até 10) |
| **Coleções de Vídeos** (5 tipos) | instagram_videos, youtube_videos, testimonial_videos, technical_videos, tiktok_videos + CaptionExtractor para YT/testimonial/technical |
| **Tutoriais** | tutorial_resources.tutorials (course_name, course_url) |
| **Público-Alvo** | target_audience (tags) |
| **Keywords** (3 tipos + IA) | keywords, market_keywords, search_intent_keywords |
| **AI Smart Merge** | ProductAISmartMerge (merge keywords/benefits/features) |
| **Benefícios** | benefits (array) |
| **Recursos/Features** | features (array) |
| **Bot Trigger Words** | bot_trigger_words (tags) |
| **FAQ** (+ IA) | faq (array question/answer) + FAQEditor |
| **Especificações Físicas** (5 campos) | weight, package_size, height, width, depth |
| **Estoque & Logística** (7 campos) | stock_quantity, min/max_order_quantity, shipping_time, free_shipping, stock_managed, unit_measure |
| **Categoria da Loja** | store_category |
| **Variações** | variations (name, price, stock, color, size) |
| **Google Merchant Center** (10 campos) | gtin, ean, mpn, brand, color, size, material, google_product_category, condition, availability |
| **Documentos Técnicos** (Sistema B) | technical_documents (tabela readonly) |
| **Transcrições PDF** | document_transcriptions (upload + IA) |
| **Comparativo Concorrentes** | competitor_comparison (enabled, title, subtitle, headers, data) |
| **Seções LP** (2 toggles) | show_in_resources, selected |
| **Resource CTAs** (3x3 campos) | resource_cta1/2/3 (label, url, visible) + resource_descriptions |
| **Offer Discount CTA** | offer_discount_cta (label, url, visible) |
| **Status & Flags** (4 toggles) | active, featured, launch, promotion |
| **Controles Finais** (2 toggles) | use_in_ai_generation, approved |

### 3. Sub-componentes utilizados
Lista de todos os componentes filhos com caminhos

### 4. Ações IA disponíveis
- Gerar Card Completo (generate-product-card-from-transcription)
- Gerar SEO (ai-seo-generator: seo_title, meta_description)
- Gerar Keywords (ai-seo-generator: keywords)
- Gerar Market Keywords (ai-seo-generator: market_keywords)
- Gerar Search Intent Keywords (ai-seo-generator: search_intent)
- Gerar FAQs (2 etapas)
- Gerar Clinical Brain (generate-clinical-brain)
- AI Smart Merge
- Extrair Legendas de Vídeo (CaptionExtractor)
- Transcrever PDF (transcribe-pdf)

### 5. Hooks consumidores
- useProductAutoSave, useCategoryConfig, useCategoryContext, useCompanyTargetAudience, useClinicalBrainGenerator

### 6. Campos do banco NÃO expostos na UI
Campos que existem em `products_repository` mas não aparecem no modal

## Implementação

Script que escreve o .MD completo em `/mnt/documents/product-card-mapping.md`.

