# 📋 Smart Dent Content Intelligence Platform — Documentação Técnica Completa

> **Versão:** 2.0 — Março 2026  
> **Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Supabase + Cloudflare Pages + Gemini 2.5 Flash  
> **Projeto Supabase:** `pgfgripuanuwwolmtknn`

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Repositório de Produtos](#2-repositório-de-produtos)
3. [Clinical Brain v2.0](#3-clinical-brain-v20)
4. [Geração de Conteúdo Multi-Canal](#4-geração-de-conteúdo-multi-canal)
5. [SEO / GEO / AI-Readiness](#5-seo--geo--ai-readiness)
6. [Knowledge Base & RAG](#6-knowledge-base--rag)
7. [Dra. L.I.A. — Chatbot Inteligente](#7-dra-lia--chatbot-inteligente)
8. [Publicação & Deploy](#8-publicação--deploy)
9. [Integrações Externas](#9-integrações-externas)
10. [Quality Gate v2.0](#10-quality-gate-v20)
11. [CRM / Leads / Memória Longitudinal](#11-crm--leads--memória-longitudinal)
12. [Template Engine & HTML Gerado](#12-template-engine--html-gerado)
13. [Tracking & Analytics](#13-tracking--analytics)
14. [Checklist de Funcionalidades](#14-checklist-de-funcionalidades)

---

## 1. Visão Geral da Arquitetura

### Stack Tecnológico

| Camada | Tecnologia | Papel |
|--------|-----------|-------|
| Frontend | React 18 + TypeScript + Vite | SPA com TailwindCSS + shadcn/ui |
| Backend | Supabase Edge Functions (Deno) | 90+ funções serverless |
| Banco de Dados | PostgreSQL (Supabase) | 30+ tabelas com RLS |
| IA Principal | Google Gemini 2.5 Flash | Via Lovable AI Gateway |
| IA Fallback | DeepSeek Chat | Fallback quando Gemini falha |
| Embeddings | Google `gemini-embedding-001` | 768 dimensões |
| Publicação | Cloudflare Pages | Deploy via Direct Upload API |
| Armazenamento | Supabase Storage | Imagens e documentos |
| Templates | Mustache | Motor de templates HTML |

### Páginas do Sistema (18 rotas)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `Index.tsx` | Landing page / dashboard principal |
| `/auth` | `Auth.tsx` | Login / registro |
| `/auth-launch` | `AuthLaunch.tsx` | Tela de boas-vindas pós-auth |
| `/dashboard` | `Dashboard.tsx` | Painel com métricas e atalhos |
| `/editor/:id` | `Editor.tsx` | Editor de Landing Page (principal) |
| `/repository` | `Repository.tsx` | Repositório de produtos (CRUD) |
| `/blog-editor/:id` | `BlogEditor.tsx` | Editor de blog posts |
| `/code-view/:id` | `CodeView.tsx` | Visualizador de código HTML |
| `/lp-clone` | `LPClone.tsx` | Clonagem de landing pages externas |
| `/publication-settings` | `PublicationSettings.tsx` | Config de domínios e publicação |
| `/cloudflare-settings` | `CloudflareSettings.tsx` | Config Cloudflare Pages |
| `/youtube-oauth-settings` | `YouTubeOAuthSettings.tsx` | OAuth YouTube |
| `/google-business-oauth-settings` | `GoogleBusinessOAuthSettings.tsx` | OAuth Google Business |
| `/oauth-callback` | `OAuthCallback.tsx` | Callback genérico OAuth |
| `/oauth-launch` | `OAuthLaunch.tsx` | Lançamento OAuth |
| `/password-reset` | `PasswordReset.tsx` | Redefinição de senha |
| `/blog-image-test` | `BlogImageTest.tsx` | Teste de imagens blog |
| `*` | `NotFound.tsx` | Página 404 |

### Shared Modules (22 módulos compartilhados)

Localizados em `supabase/functions/_shared/`:

| Módulo | Linhas | Função |
|--------|--------|--------|
| `master-system-prompt.ts` | 603 | Núcleo de inteligência clínica — prompt master com regras anti-alucinação |
| `seo-fine-tuning.ts` | 458 | 6 otimizações SEO: FAQPage, lazy loading, sameAs, Service Schema, credentials, dedup keywords |
| `dual-ai-competition.ts` | 273 | Competição Gemini vs DeepSeek com scoring automático (structure, readability, keywords, accuracy, engagement) |
| `tracking-injector.ts` | 233 | Injeção centralizada de GTM, GA4, Meta Pixel, TikTok Pixel |
| `track-ai-usage.ts` | 165 | Tracker de tokens/custos por modelo (USD/BRL) com tabela `ai_token_usage` |
| `authority-data-helper.ts` | ~400 | E-E-A-T completo: Authority Data, Video Testimonials, sameAs, Reviews Schema |
| `local-business-helper.ts` | ~200 | Schema LocalBusiness + geo-context HTML |
| `howto-schema-helper.ts` | ~150 | Schema HowTo baseado em workflow_stages |
| `faq-schema-helper.ts` | ~100 | Schema FAQPage centralizado |
| `video-schema-helper.ts` | ~200 | Schema VideoObject + VideoGallery + ItemList de vídeos |
| `breadcrumb-schema-helper.ts` | ~150 | Schema BreadcrumbList para e-commerce e LPs |
| `itemlist-schema-helper.ts` | ~100 | Schema ItemList para listas de produtos |
| `person-schema-helper.ts` | ~100 | Schema Person para KOLs (E-E-A-T) |
| `aggregate-rating-helper.ts` | ~80 | AggregateRating dinâmico de `raw_reviews` |
| `intelligent-links-processor.ts` | ~100 | Processador de links inteligentes para blogs |
| `content-validators.ts` | ~80 | Validadores de conteúdo gerado |
| `mustache-template-engine.ts` | ~60 | Wrapper do Mustache para Edge Functions |
| `prompt-processor.ts` | ~100 | Processador de prompts customizáveis |
| `spin-content-utils.ts` | ~150 | Utilities para conteúdo SPIN Selling |
| `spin-system-prompt.ts` | ~200 | Prompt especializado SPIN Selling |
| `video-captions-processor.ts` | ~100 | Processador de legendas YouTube |
| `product-blog-html-v2.ts` | ~300 | Template HTML v2 para blogs de produto |

---

## 2. Repositório de Produtos

### Tabela `products_repository` — 150+ campos

O repositório centraliza TODOS os dados de produto em uma única tabela com campos agrupados em categorias:

#### Informações Básicas
- `name`, `description`, `price`, `promo_price`, `currency`
- `brand`, `category`, `subcategory`, `product_type`
- `ean`, `gtin`, `mpn`, `ncm`, `sku` (identificadores)
- `weight`, `height`, `width`, `depth` (dimensões)
- `color`, `size`, `material`, `package_size`

#### Conteúdo Rico
- `features` (JSON array) — Características do produto
- `benefits` (JSON array) — Benefícios do produto
- `sales_pitch` (text) — Pitch de vendas
- `target_audience` (JSON array) — Público-alvo
- `applications` (text) — Aplicações clínicas
- `faq` (JSON array) — Perguntas frequentes `[{question, answer}]`
- `technical_specifications` (JSON) — Especificações técnicas

#### Clinical Brain
- `product_type` — Tipo classificado (e.g. "RESINAS 3D > Biocompatíveis")
- `workflow_stages` (JSON) — Mapa das 6 etapas do workflow odontológico
- `forbidden_products` (JSON) — Produtos proibidos de combinar
- `required_products` (JSON) — Produtos obrigatórios
- `anti_hallucination_rules` (JSON) — Regras anti-alucinação
- `clinical_brain_status` — `empty` | `generated` | `validated`
- `clinical_brain_generated_at`, `clinical_brain_validated_at`
- `clinical_brain_validator_name`, `clinical_brain_validation_notes`

#### Mídia & Vídeos
- `image_url`, `image_url_original`, `images_gallery` (JSON)
- `youtube_videos`, `instagram_videos`, `technical_videos` (JSON arrays)
- `testimonial_videos`, `tiktok_videos` (JSON arrays)
- `video_captions` (JSON) — Legendas extraídas de vídeos YouTube

#### SEO & Marketing
- `keywords`, `search_intent_keywords`, `market_keywords` (JSON arrays)
- `keyword_ids` (text[]) — IDs de keywords consolidadas
- `seo_title_override`, `seo_description_override`
- `canonical_url`, `slug`
- `tags` (JSON array)

#### Conteúdo Gerado por IA
- `instagram_copies` (JSON) — Copies para Instagram
- `instagram_reels_scripts` (JSON) — Roteiros de Reels
- `tiktok_content` (JSON) — Conteúdo TikTok
- `youtube_scripts` (JSON) — Roteiros YouTube
- `youtube_descriptions` (JSON) — Descrições YouTube
- `whatsapp_messages` (JSON) — Mensagens WhatsApp
- `whatsapp_sequences` (JSON) — Sequências de WhatsApp
- `individual_blog_content` (JSON) — Blog individual
- `ecommerce_html` (JSON) — HTML e-commerce gerado
- `document_transcriptions` (JSON) — Transcrições de documentos
- `bot_trigger_words` (JSON) — Palavras-gatilho para chatbot

#### Flags de Controle
- `active`, `approved`, `selected`, `featured`, `showcase`, `launch`, `promotion`
- `free_shipping`, `stock_managed`, `stock_quantity`
- `use_in_ai_generation` — Flag para incluir na geração IA
- `show_in_resources` — Exibir na seção de recursos
- `seo_enhanced` — SEO já otimizado
- `ai_generated_keywords`, `ai_generated_benefits`, `ai_generated_category`

#### Origem e Importação
- `source_type` — `manual` | `csv_import` | `loja_integrada` | `system_b`
- `source_landing_page_id` — LP de origem
- `original_data` (JSON) — Dados originais preservados

### Score de Completude (ProductScoreCalculator.ts)

O sistema calcula um score de 0-115 pontos (convertido em %) para cada produto:

| Categoria | Pontos | Campos Avaliados |
|-----------|--------|-----------------|
| Informações Básicas | 25 | nome, descrição, categoria, subcategoria, preço |
| Conteúdo Rico | 25 | features, benefits, sales_pitch, target_audience |
| FAQ | 5 | faq array |
| Mídia | 20 | image_url, vídeos (YouTube/Instagram/Técnicos/Testimonials/TikTok) |
| SEO & Marketing | 25 | keywords, search_intent, market_keywords, SEO title, meta description (120-160 chars), canonical_url, slug |
| Comercial | 10 | product_url, tags |

**Labels:**
- ≥90% → ✅ Completo
- ≥70% → ⚠️ Bom
- ≥50% → 🟡 Regular
- <50% → ❌ Crítico

### Importação de Dados

| Método | Edge Function | Descrição |
|--------|--------------|-----------|
| CSV | `import-repository-csv` | Upload de CSV com mapeamento de campos |
| Loja Integrada | `import-loja-integrada-api` | Importação via API REST (auth por query params) |
| System B | `sync-system-b-documents` | Sincronização com sistema legado |
| Manual | Frontend CRUD | Criação/edição no painel |
| Migração | `migrate-products-to-repository` | Migração de dados antigos |

---

## 3. Clinical Brain v2.0

### Conceito

O Clinical Brain é o "cérebro clínico" que garante que TODO conteúdo gerado pelo sistema respeite regras técnicas da odontologia digital. É o principal mecanismo anti-alucinação da plataforma.

### Workflow Odontológico Digital — 6 Etapas

```
1. SCANEAR  → Captura com scanners intraorais
2. DESENHAR → CAD, planejamento, espessuras mínimas
3. IMPRIMIR → Impressão 3D, resinas, hardware
4. PROCESSAR → Lavagem, cura UV, pós-processamento
5. FINALIZAR → Acabamento, maquiagem, glaze
6. INSTALAR → Cimentação, entrega, assentamento clínico
```

Cada produto tem um mapeamento `workflow_stages`:

```json
{
  "scanear": { "applicable": false, "role": null, "description": "" },
  "desenhar": { "applicable": false, "role": null, "description": "" },
  "imprimir": { "applicable": true, "role": "principal", "description": "Resina biocompatível para impressão 3D", "pain_points_addressed": ["Fragilidade de provisórios"], "competitive_advantages": ["Resistência superior"] },
  "processar": { "applicable": true, "role": "acessorio", "description": "Requer NanoClean para lavagem" },
  "finalizar": { "applicable": false, "role": null, "description": "" },
  "instalar": { "applicable": false, "role": null, "description": "" }
}
```

### Regras Anti-Alucinação

```json
{
  "never_claim": ["Frases que a IA nunca pode afirmar"],
  "never_mix_with": ["Produtos que nunca podem ser combinados"],
  "never_use_in_stages": ["Etapas proibidas para o produto"],
  "always_require": ["Produtos obrigatórios sempre citar"],
  "always_explain": ["Conceitos que sempre devem ser explicados"]
}
```

### Produtos Proibidos / Obrigatórios

- **`forbidden_products`**: Lista de produtos que NUNCA podem ser mencionados junto com o produto atual
- **`required_products`**: Lista de produtos que SEMPRE devem ser mencionados (com contexto)

### Fluxo de Geração Automática

```
1. Usuário clica "Gerar Clinical Brain" → Edge Function `generate-clinical-brain`
2. IA analisa: nome, descrição, features, categoria, documentos técnicos
3. Retorna: product_type, workflow_stages, forbidden_products, required_products, anti_hallucination_rules
4. Status: `generated` + confidence_score
5. Usuário revisa e valida → Status: `validated`
```

### Categorias Dinâmicas (`categories_config`)

As categorias são gerenciadas no banco de dados, não hardcoded:
- `category` + `subcategory` (e.g. "RESINAS 3D" > "Biocompatíveis")
- `icon_name` — Ícone visual
- `clinical_tone` — Tom de voz por categoria
- `criticality_percent` — Nível de criticidade (0-100)
- `anti_hallucination_rules` — Regras padrão por categoria
- `keywords`, `search_intent_keywords`, `market_keywords` — SEO por categoria

---

## 4. Geração de Conteúdo Multi-Canal

### Dual-AI Competition (`dual-ai-competition.ts`)

O sistema implementa um modelo de competição entre duas IAs:

1. **Lovable AI (Gemini 2.5 Flash)** — IA principal via `ai.gateway.lovable.dev`
2. **DeepSeek Chat** — IA fallback via `api.deepseek.com`

**Fluxo atual (otimizado):**
```
1. Tenta gerar com Gemini 2.5 Flash
2. Avalia o conteúdo (score 0-100)
3. Se Gemini falhar → Fallback para DeepSeek
4. Retorna: { content, winner, score }
```

**Critérios de avaliação (5 dimensões):**
- **Structure** (0-100): Headings, parágrafos, tamanho adequado ao tipo
- **Readability** (0-100): Tamanho médio das frases (ideal 10-20 palavras)
- **Keywords** (0-100): Presença de keywords obrigatórias
- **Accuracy** (0-100): Detecção de padrões de alucinação (preços inventados, "100% eficaz", etc.)
- **Engagement** (0-100): Emojis, CTAs, perguntas

### Geradores de Conteúdo (Edge Functions)

| Edge Function | Canal | Linhas | IA Usada | Clinical Brain |
|--------------|-------|--------|----------|----------------|
| `generate-social-content` | WhatsApp, YouTube, Instagram | 1269 | DeepSeek | Não |
| `generate-tiktok-content` | TikTok | 407 | DeepSeek | Opcional (v1.0) |
| `generate-youtube-script` | YouTube Scripts | 406 | Gemini/DeepSeek | Opcional (v1.0) |
| `generate-instagram-reels-script` | Instagram Reels | ~400 | Gemini | Sim |
| `generate-instagram-carousel` | Instagram Carrossel | ~300 | Gemini | Não |
| `generate-ecommerce-html` | HTML E-commerce | 2502 | Gemini | Sim (via schemas) |
| `generate-product-blog` | Blog de Produto | ~500 | Gemini | Sim |
| `generate-product-faqs` | FAQ de Produto | ~200 | Gemini | Não |
| `generate-ad-copies` | Google Ads Copies | ~300 | Gemini | Não |
| `generate-display-banners` | Banners Display | ~200 | Gemini | Não |
| `generate-spin-campaign` | SPIN Selling Campaign | ~400 | Gemini | Não |
| `generate-spin-landing-page` | SPIN Landing Page | ~500 | Gemini | Não |
| `generate-spin-sales-pitch` | SPIN Sales Pitch | ~300 | Gemini | Não |
| `generate-spin-hero-banner` | SPIN Hero Banner | ~200 | Gemini | Não |
| `generate-spin-faqs` | SPIN FAQs | ~200 | Gemini | Não |
| `generate-spin-journey` | SPIN Customer Journey | ~300 | Gemini | Não |
| `generate-spin-metrics` | SPIN Metrics | ~200 | Gemini | Não |
| `generate-carousel-hook` | Carousel Hooks | ~150 | Gemini | Não |
| `generate-carousel-slide` | Carousel Slides | ~200 | Gemini | Não |
| `generate-client-photo` | Foto simulada de cliente | ~150 | Gemini | Não |
| `generate-content-from-interests` | Conteúdo por interesses (CRM) | ~200 | Gemini | Não |
| `strategic-blog-generator` | Blog Estratégico | ~500 | Gemini | Não |
| `ai-content-generator` | Conteúdo genérico IA | ~300 | Gemini | Não |
| `generate-product-ai-content` | Conteúdo IA de produto | ~300 | Gemini | Não |
| `ai-seo-generator` | SEO otimizado IA | ~300 | Gemini | Não |

### Fluxo de Geração de Conteúdo — Exemplo Instagram

```
1. Frontend: Usuário seleciona produto → clica "Gerar Instagram"
2. Hook: useProductFullContext() carrega produto + company_profile + categories_config
3. Edge Function: generate-social-content({ type: 'instagram', productId, instagramType: 'feed' })
4. Backend:
   a. Busca produto do banco (150+ campos)
   b. Monta system prompt via master-system-prompt.ts
   c. Injeta regras anti-alucinação do Clinical Brain
   d. Chama DeepSeek API
   e. Avalia conteúdo (score)
   f. Salva em products_repository.instagram_copies
   g. Registra tokens em ai_token_usage
5. Frontend: Exibe resultado com opção de editar/regenerar
```

### Fluxo de Geração — E-commerce HTML

```
1. Edge Function: generate-ecommerce-html (2502 linhas — o maior gerador)
2. Carrega:
   - Produto completo
   - AggregateRating dinâmico (raw_reviews)
   - LocalBusiness data (company_profile)
   - Authority Data (E-E-A-T)
   - Video Testimonials
   - Workflow Stages → HowTo Schema
   - FAQs → FAQPage Schema
   - Products list → ItemList Schema
   - Videos → VideoObject Schema
   - Breadcrumbs → BreadcrumbList Schema
3. Gera HTML com 10+ schemas JSON-LD
4. Injeta geo-context, hreflang, lazy loading
5. Salva em products_repository.ecommerce_html
```

### Version History

Geradores como `generate-social-content` mantêm histórico de versões:
```json
{
  "versions": [
    { "content": "...", "generated_at": "2026-03-01T10:00:00Z", "model": "deepseek-chat" },
    { "content": "...", "generated_at": "2026-03-02T14:00:00Z", "model": "google/gemini-2.5-flash" }
  ]
}
```

---

## 5. SEO / GEO / AI-Readiness

### Schemas JSON-LD Implementados

O sistema gera automaticamente os seguintes Schema.org types no HTML:

| Schema Type | Helper | Usado em |
|------------|--------|----------|
| `Organization` | `local-business-helper.ts` | LPs, E-commerce, Blogs |
| `LocalBusiness` | `local-business-helper.ts` | LPs, E-commerce |
| `Product` | `authority-data-helper.ts` | E-commerce HTML |
| `FAQPage` | `faq-schema-helper.ts` | LPs, E-commerce, SPIN |
| `HowTo` | `howto-schema-helper.ts` | E-commerce (workflow 6 etapas) |
| `VideoObject` | `video-schema-helper.ts` | E-commerce, Blogs |
| `ItemList` | `itemlist-schema-helper.ts` | E-commerce, LPs |
| `BreadcrumbList` | `breadcrumb-schema-helper.ts` | E-commerce, LPs |
| `Person` | `person-schema-helper.ts` | Blogs (KOLs como autores E-E-A-T) |
| `AggregateRating` | `aggregate-rating-helper.ts` | LPs, E-commerce |
| `Review` | `authority-data-helper.ts` | E-commerce |
| `Service` | `seo-fine-tuning.ts` | LPs |
| `SpeakableSpecification` | Template inline | LPs, Blogs |
| `WebSite` | Template inline | LPs |
| `WebPage` | Template inline | LPs |

### SEO Fine-Tuning — 6 Pontos de Otimização (`seo-fine-tuning.ts`)

1. **FAQPage Schema** — Agrega FAQs de produtos automaticamente (max 10, dedup por question)
2. **Lazy Loading** — `loading="lazy" decoding="async"` em imagens below-fold; `fetchpriority="high"` em LCP
3. **sameAs Expansion** — Coleta links do fundador + redes sociais da empresa para E-E-A-T
4. **Service Schema** — Gera schemas de serviço a partir do campo `main_products_services`
5. **hasCredential** — Certificações ISO/ANVISA/FDA como `EducationalOccupationalCredential`
6. **Keyword Deduplication** — Remove keywords duplicadas preservando case original

### GEO-SEO — Otimização Geográfica

- **Bloco `geo-context`** (CSS `clip: rect(0,0,0,0)` — invisível para humanos, visível para crawlers):
  - Nome da empresa
  - Endereço completo (rua, número, cidade, estado, CEP)
  - Áreas atendidas
  - Coordenadas (lat/lng)
  - Telefone e e-mail
- **Schema `LocalBusiness`** com `geo`, `openingHoursSpecification`, `address`
- **Tracking Pixels** por domínio (GTM, GA4, Meta Pixel, TikTok Pixel)

### AI-Readiness — Otimização para IAs

- **`SpeakableSpecification`** — Indica a IAs quais seções são "faláveis"
- **Campos `about` e `mentions`** no JSON-LD `@graph`
- **`mainEntity`** vinculando conteúdo a entidades
- **Estrutura semântica HTML5** — `<article>`, `<main>`, `<section>`, `<nav>`, `<header>`, `<footer>`
- **`data-semantic-enhanced="true"`** — Atributo de marcação

### E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)

- **Author Schema** (`Person`) com KOLs: nome, especialidade, mini-CV, links (Lattes, Instagram, YouTube)
- **Founder Schema** com `sameAs` expandido (LinkedIn, Instagram, Twitter)
- **`hasCredential`** — Certificações da empresa
- **AggregateRating** real de `raw_reviews` (fallback: 30 reviews)
- **Company Milestones** — Timeline corporativa para autoridade

### Hreflang — Internacionalização

```html
<link rel="alternate" hreflang="pt-BR" href="...">
<link rel="alternate" hreflang="es" href="...">
<link rel="alternate" hreflang="en" href="...">
<link rel="alternate" hreflang="x-default" href="...">
```

### Indexação — Política Obrigatória

- **SEMPRE** `<meta name="robots" content="index, follow">`
- **NUNCA** `noindex`, mesmo em preview
- **Canonical URL** obrigatório em todas as gerações

### SEO Quality Validator (`seoQualityValidator.ts`)

Score de qualidade do HTML gerado (0-10 por dimensão):

| Dimensão | Peso | Verificações |
|----------|------|-------------|
| SEO | 30% | Title, meta description, canonical, alt text, H1 único |
| GEO | 25% | Schema Organization/LocalBusiness, bloco geo-context, addressLocality |
| IA-Readiness | 25% | SpeakableSpecification, about, mentions, HTML5 semântico |
| Performance | 20% | Sem base64, font-display:swap, lazy loading, tamanho HTML |

---

## 6. Knowledge Base & RAG

### Exportação Multi-Formato (`knowledge-base/index.ts` — 2076 linhas)

A Knowledge Base exporta dados em 4 formatos:

| Formato | Uso | Conteúdo |
|---------|-----|---------|
| `json` | API REST | Dados estruturados completos |
| `ai_training` | Fine-tuning | Formato otimizado para treinamento de LLMs |
| `rag` | Retrieval | Chunks otimizados para RAG com metadados |
| `system_b` | Sistema legado | Formato compatível com sistema externo |

### Dados Incluídos na Knowledge Base

- ✅ Produtos (150+ campos, filtro por categoria, approved_only)
- ✅ Company Profile (descrição, missão, visão, fundador, geo, ratings)
- ✅ Categories Config (categorias, keywords, regras anti-alucinação)
- ✅ External Links (links aprovados com SEO data)
- ✅ Video Testimonials
- ✅ Google Reviews (da tabela `raw_reviews`)
- ✅ KOLs (Key Opinion Leaders)
- ✅ SPIN Solutions
- ✅ Blog Posts
- ✅ Landing Pages
- ✅ External Videos
- ✅ Company Milestones (timeline corporativa)

### Otimizações para Tokens

- `stripHtml()` — Remove tags HTML
- `omitEmpty()` — Remove campos null/undefined/empty
- Limitação de campos por produto (apenas dados relevantes)

### Indexação Vetorial (`index-knowledge-base/index.ts`)

**Modelo de Embeddings:** Google `gemini-embedding-001` (768 dimensões)

**Processo:**
```
1. Busca produtos do banco (batch_size + offset)
2. Divide cada produto em chunks lógicos:
   - description (nome + descrição)
   - features (características técnicas)
   - benefits (benefícios)
   - faq (perguntas e respostas)
   - clinical_brain (workflow + regras)
   - sales_pitch
   - video_captions (legendas de vídeos)
3. Para cada chunk:
   a. Gera embedding via Google API (768d)
   b. Salva na tabela knowledge_vectors
4. Rate limiting com exponential backoff (10s, 20s, 40s)
```

**Tabela `knowledge_vectors`:**
- `id` (uuid)
- `product_id` (text)
- `product_name` (text)
- `chunk_type` (text) — description, features, benefits, faq, clinical_brain, etc.
- `content` (text) — Texto do chunk
- `embedding` (vector(768)) — Embedding vetorial
- `metadata` (jsonb) — Metadados do chunk

**Busca Semântica (`match_knowledge_chunks`):**
```sql
SELECT * FROM match_knowledge_chunks(
  query_embedding := <vector>,
  match_threshold := 0.7,
  match_count := 5,
  filter_chunk_type := 'description',
  filter_product_id := '<uuid>'
);
```

Retorna: id, product_id, product_name, chunk_type, content, metadata, similarity

**Índice:** HNSW (`vector_cosine_ops`) para busca eficiente

---

## 7. Dra. L.I.A. — Chatbot Inteligente

### Arquitetura (`rag-chat/index.ts` — 698 linhas)

A Dra. L.I.A. é um chatbot RAG especializado em vendas odontológicas com memória longitudinal.

**Fluxo de uma mensagem:**

```
1. Recebe: { message, conversation_id?, lead_identifier? }
2. findOrCreateLead() — Identifica lead por telefone/e-mail
3. findOrCreateConversation() — Recupera ou cria sessão (timeout 2h)
4. Carrega histórico:
   - Últimas mensagens da conversa atual
   - Últimas 5 conversas do lead (memória longitudinal)
   - Últimos 10 eventos do lead
5. Gera embedding da pergunta (768d)
6. match_knowledge_chunks() — Busca semântica (top 5, threshold 0.7)
7. Monta system prompt com:
   - Persona da Dra. L.I.A.
   - Chunks do RAG como contexto
   - Histórico da conversa
   - Perfil do lead
8. Chama Gemini 2.5 Flash
9. Salva mensagem em lia_messages (com chunks_used)
10. Dispara evaluate-interaction assíncrono (LLM-as-Judge)
11. Retorna resposta
```

### Modelo de IA: `google/gemini-2.5-flash`
### Timeout de Sessão: 2 horas

---

## 8. Publicação & Deploy

### Cloudflare Pages (`publish-cloudflare-pages/index.ts`)

**Fluxo de publicação:**
```
1. Recebe: { lpId, domain, pagePath, isHomepage }
2. Busca HTML gerado (Landing Page ou LP Clone)
3. Injeta tracking pixels (GTM, GA4, Meta, TikTok)
4. Calcula BLAKE3 hash do conteúdo
5. Upload via Cloudflare Pages Direct Upload API
6. Cria deployment
7. Atualiza status: published_url, publish_status, cloudflare_deployment_id
```

### Tipos de Publicação

| Tipo | Tabela | Edge Function | Formato |
|------|--------|--------------|---------|
| Landing Page | `landing_pages` | `save-landing-page` → `publish-cloudflare-pages` | HTML completo via template-engine |
| LP Clone | `cloned_landing_pages` | `clone-landing-page` → `publish-cloudflare-pages` | HTML transformado |
| Product Blog | `product_blog_publications` | `generate-product-blog` → `publish-product-blog-cloudflare` | HTML via product-blog-html-v2 |
| SPIN Landing Page | Dentro de LP | `generate-spin-landing-page` | HTML gerado por IA |

### Template Engine (`src/lib/template-engine.ts` — 6095 linhas)

O motor de templates é o MAIOR arquivo do projeto. Ele:
- Usa **Mustache** como motor de renderização
- Gera HTML completo com:
  - SEO meta tags (title, description, OG, Twitter Cards)
  - Hreflang tags
  - JSON-LD `@graph` com 15+ schemas
  - CSS crítico inline no `<head>`
  - Seções: Hero, Produtos, FAQ, Vídeos, Depoimentos, KOLs, Footer
  - Tracking pixels
  - Geo-context invisível
  - Lazy loading automático
  - `robots: "index, follow"` obrigatório

---

## 9. Integrações Externas

### Loja Integrada

| Edge Function | Direção | Descrição |
|--------------|---------|-----------|
| `import-loja-integrada-api` | ← Import | Importa produtos via API REST (auth por query params) |
| `update-loja-integrada-product` | → Export | Atualiza produto na loja |
| `poll-loja-integrada-orders` | ← Import | Polling de pedidos (planejado, cron 5min) |

**Autenticação:** `chave_api` + `chave_aplicacao` como query parameters (NÃO headers)

### YouTube

| Edge Function | Descrição |
|--------------|-----------|
| `exchange-youtube-code` | Troca code OAuth por tokens |
| `test-youtube-connection` | Testa conexão |
| `extract-youtube-captions` | Extrai legendas de vídeos |
| `refresh-google-token` | Renova token OAuth |

### Google Business

| Edge Function | Descrição |
|--------------|-----------|
| `exchange-google-business-code` | Troca code OAuth |
| `test-google-business-connection` | Testa conexão |
| `exchange-oauth-code` | Callback genérico |

### Cloudflare

| Edge Function | Descrição |
|--------------|-----------|
| `publish-cloudflare-pages` | Deploy via Direct Upload API |
| `test-cloudflare-connection` | Testa conexão |
| `cloudflare-direct-upload` | Upload direto de assets |

### WordPress / FTP

| Edge Function | Descrição |
|--------------|-----------|
| `test-wordpress-connection` | Testa conexão WordPress |
| `test-ftp-connection` | Testa conexão FTP |
| `publish-blog-post` | Publica blog post |

### Google Reviews

| Edge Function | Descrição |
|--------------|-----------|
| `extract-google-reviews` | Extrai reviews do Google |
| `moderate-reviews` | Moderação com IA |
| `populate-review-photos` | Popula fotos dos reviews |

---

## 10. Quality Gate v2.0

### Evaluate Interaction (`evaluate-interaction/index.ts`)

Sistema LLM-as-Judge que avalia qualidade das respostas do chatbot:

**Input:** `message_id` de uma mensagem `assistant`

**Processo:**
1. Carrega mensagem + chunks_used do RAG
2. Envia para Gemini como "auditor de qualidade"
3. Avalia:
   - **quality_score** (0-10) — Precisão, relevância, completude
   - **hallucination_flag** (boolean) — Detectou informação inventada?
4. Atualiza `lia_messages` com scores

### Auto-Approve Rules
- Score ≥ 85: Auto-aprovado
- Score < 85: Requer revisão manual

### Token Usage Tracking (`track-ai-usage.ts`)

Registra TODOS os custos de IA na tabela `ai_token_usage`:

| Campo | Descrição |
|-------|-----------|
| `edge_function_id` | Qual função chamou |
| `action_name` | Ação específica |
| `model` | Modelo usado |
| `prompt_tokens` | Tokens de entrada |
| `completion_tokens` | Tokens de saída |
| `total_tokens` | Total |
| `cost_usd` | Custo em USD |
| `cost_brl` | Custo em BRL (taxa 5.50) |
| `product_name` | Produto associado |

**Pricing configurado:**
| Modelo | Input/1M tokens | Output/1M tokens |
|--------|-----------------|------------------|
| Gemini 2.5 Flash | $0.15 | $0.60 |
| Gemini 2.5 Pro | $1.25 | $10.00 |
| DeepSeek Chat | $0.14 | $0.28 |

---

## 11. CRM / Leads / Memória Longitudinal

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `lia_leads` | Identidade unificada: nome, email, telefone, company, lead_score, tags |
| `lia_conversations` | Sessões: current_state (greeting/discovery/objection/...), extracted_entities, cognitive_analysis |
| `lia_messages` | Mensagens: role (user/assistant), content, chunks_used, quality_score, hallucination_flag |
| `lia_lead_events` | Timeline: event_type (product_interest, question, objection), event_data, source |

### Memória Longitudinal

O sistema injeta no prompt:
- **Últimas 5 conversas** do lead (resumo)
- **Últimos 10 eventos** do lead (interesses, objeções, preferências)
- **Perfil do lead** (nome, empresa, role, tags)

Isso permite que a Dra. L.I.A. "lembre" de interações passadas:
> "Dr. Silva, na última conversa você perguntou sobre resinas biocompatíveis. Chegamos a discutir a Vitality..."

---

## 12. Template Engine & HTML Gerado

### Qualidade do HTML Gerado

O HTML gerado pelo template-engine.ts segue padrões de excelência:

#### Estrutura Semântica
```html
<!DOCTYPE html>
<html lang="pt-br" translate="no">
<head>
  <!-- Meta tags completas (robots, description, canonical) -->
  <!-- Hreflang tags -->
  <!-- Open Graph + Twitter Cards -->
  <!-- JSON-LD @graph com 15+ schemas -->
  <!-- CSS Crítico inline (LCP/FCP) -->
  <!-- Tracking Pixels (GTM, GA4, Meta, TikTok) -->
</head>
<body>
  <header><!-- Navegação --></header>
  <main data-semantic-enhanced="true">
    <article>
      <section class="hero"><!-- H1 único, fetchpriority="high" --></section>
      <section class="products"><!-- ItemList --></section>
      <section class="faq"><!-- FAQPage --></section>
      <section class="videos"><!-- VideoObject --></section>
      <section class="testimonials"><!-- Reviews --></section>
    </article>
  </main>
  <footer><!-- Contato, links, redes sociais --></footer>
  <!-- Geo-context invisível -->
  <!-- GTM noscript -->
</body>
</html>
```

#### O que fica exposto para IA / Busca

**No `<head>` (crawlers e IAs):**
- `<title>` otimizado (< 60 chars)
- `<meta name="description">` (120-160 chars)
- `<meta name="robots" content="index, follow">`
- `<link rel="canonical">`
- Hreflang (pt-BR, es, en, x-default)
- Open Graph completo (title, description, image, type, site_name)
- Twitter Cards (summary_large_image)

**No JSON-LD `@graph` (Google, Bing, ChatGPT, Perplexity):**
- Organization com `sameAs`, `hasCredential`, `areaServed`
- LocalBusiness com geo, openingHours, aggregateRating
- Product com offers, review, brand
- FAQPage com mainEntity
- HowTo com 6 steps (workflow odontológico)
- VideoObject com embedUrl, thumbnailUrl
- BreadcrumbList
- ItemList (produtos)
- Person (KOLs/autores)
- SpeakableSpecification (seções faláveis)
- WebSite com potentialAction (SearchAction)

**No HTML invisível (geo-context):**
```html
<div class="geo-context" style="position:absolute;clip:rect(0,0,0,0);overflow:hidden">
  <span>Smart Dent - Rua X, 123 - Cidade/SP - CEP 00000-000</span>
  <span>Atende: São Paulo, Rio de Janeiro, Brasil</span>
  <span>Coordenadas: -23.55, -46.63</span>
</div>
```

#### Performance do HTML

- CSS crítico inline no `<head>` (evita FOUC)
- `fetchpriority="high"` na imagem hero (LCP)
- `loading="lazy" decoding="async"` em todas as imagens below-fold
- `font-display: swap` em fontes
- YouTube embeds com `youtube-nocookie.com`
- HTML compacto (média ~100-200KB por página)

---

## 13. Tracking & Analytics

### Tracking Pixels (`tracking-injector.ts`)

Configurados em `company_profile.tracking_pixels`:

| Pixel | Formato | Injeção |
|-------|---------|---------|
| Google Tag Manager | Container ID (GTM-XXXX) | `<head>` script + `<body>` noscript |
| Google Analytics 4 | Measurement ID (G-XXXX) | `<head>` gtag.js |
| Meta Pixel | Pixel ID (número) | `<head>` fbq |
| TikTok Pixel | Pixel ID (número) | `<head>` ttq |

**Regra:** Tracking NÃO é injetado em modo preview.

### AI Token Usage Dashboard

Tabela `ai_token_usage` permite monitorar:
- Custo total por dia/semana/mês
- Custo por edge function
- Custo por modelo
- Custo por produto
- Tokens consumidos

---

## 14. Checklist de Funcionalidades

### ✅ Funcionalidades 100% Operacionais

| # | Funcionalidade | Edge Function | Status |
|---|---------------|---------------|--------|
| 1 | CRUD de Produtos | Frontend + Supabase | ✅ Funcional |
| 2 | Score de Completude | `ProductScoreCalculator.ts` | ✅ Funcional |
| 3 | Importação CSV | `import-repository-csv` | ✅ Funcional |
| 4 | Importação Loja Integrada | `import-loja-integrada-api` | ✅ Funcional |
| 5 | Clinical Brain - Geração | `generate-clinical-brain` | ✅ Funcional |
| 6 | Clinical Brain - Validação | `useClinicalBrainGenerator.ts` | ✅ Funcional |
| 7 | Categorias Dinâmicas | `categories_config` CRUD | ✅ Funcional |
| 8 | Geração Instagram (Feed/Reels/Carousel) | `generate-social-content` | ✅ Funcional |
| 9 | Geração TikTok | `generate-tiktok-content` | ✅ Funcional |
| 10 | Geração YouTube Scripts | `generate-youtube-script` | ✅ Funcional |
| 11 | Geração Instagram Reels Scripts | `generate-instagram-reels-script` | ✅ Funcional |
| 12 | Geração WhatsApp Messages | `generate-social-content` (type: whatsapp) | ✅ Funcional |
| 13 | Geração WhatsApp Sequences | `generate-social-content` (type: whatsapp_sequence) | ✅ Funcional |
| 14 | Geração E-commerce HTML | `generate-ecommerce-html` | ✅ Funcional |
| 15 | Geração FAQ de Produto | `generate-product-faqs` | ✅ Funcional |
| 16 | Geração Google Ads Copies | `generate-ad-copies` | ✅ Funcional |
| 17 | Export Google Ads CSV | `export-google-ads-csv` | ✅ Funcional |
| 18 | Export Product Google Ads CSV | `export-product-google-ads-csv` | ✅ Funcional |
| 19 | Editor de Landing Pages | `Editor.tsx` + `save-landing-page` | ✅ Funcional |
| 20 | Template Engine HTML | `template-engine.ts` (6095 linhas) | ✅ Funcional |
| 21 | Publicação Cloudflare | `publish-cloudflare-pages` | ✅ Funcional |
| 22 | Blog Editor | `BlogEditor.tsx` + `publish-blog-post` | ✅ Funcional |
| 23 | Blog de Produto | `generate-product-blog` | ✅ Funcional |
| 24 | Blog Estratégico | `strategic-blog-generator` | ✅ Funcional |
| 25 | Preview Blog | `preview-product-blog` | ✅ Funcional |
| 26 | LP Clone | `clone-landing-page` (2840 linhas) | ✅ Funcional |
| 27 | Knowledge Base API | `knowledge-base` (2076 linhas) | ✅ Funcional |
| 28 | Knowledge Feed | `knowledge-feed` | ✅ Funcional |
| 29 | Indexação Vetorial | `index-knowledge-base` | ✅ Funcional |
| 30 | RAG Chat (Dra. L.I.A.) | `rag-chat` (698 linhas) | ✅ Funcional |
| 31 | Evaluate Interaction | `evaluate-interaction` | ✅ Funcional |
| 32 | CRM Leads | `lia_leads` + `lia_conversations` + `lia_messages` | ✅ Funcional |
| 33 | Token Usage Tracking | `track-ai-usage.ts` + `ai_token_usage` | ✅ Funcional |
| 34 | SEO Validator | `seoQualityValidator.ts` | ✅ Funcional |
| 35 | Schemas JSON-LD (15+ types) | `_shared/*-helper.ts` | ✅ Funcional |
| 36 | Tracking Pixels | `tracking-injector.ts` | ✅ Funcional |
| 37 | Google Reviews Extraction | `extract-google-reviews` | ✅ Funcional |
| 38 | Reviews Moderation | `moderate-reviews` | ✅ Funcional |
| 39 | YouTube Captions | `extract-youtube-captions` | ✅ Funcional |
| 40 | Sitemap Generator | `generate-sitemap` | ✅ Funcional |
| 41 | Video Sitemap | `generate-video-sitemap` | ✅ Funcional |
| 42 | Robots.txt Generator | `generate-robots-txt` | ✅ Funcional |
| 43 | SPIN Selling Campaign | `generate-spin-campaign` | ✅ Funcional |
| 44 | SPIN Landing Page | `generate-spin-landing-page` | ✅ Funcional |
| 45 | SPIN Sales Pitch | `generate-spin-sales-pitch` | ✅ Funcional |
| 46 | SPIN Hero Banner | `generate-spin-hero-banner` | ✅ Funcional |
| 47 | SPIN FAQs | `generate-spin-faqs` | ✅ Funcional |
| 48 | SPIN Journey | `generate-spin-journey` | ✅ Funcional |
| 49 | SPIN Metrics | `generate-spin-metrics` | ✅ Funcional |
| 50 | SPIN Apostila Export | `export-spin-apostila` | ✅ Funcional |
| 51 | Instagram Carousel | `generate-instagram-carousel` | ✅ Funcional |
| 52 | Carousel Hook/Slide | `generate-carousel-hook` / `generate-carousel-slide` | ✅ Funcional |
| 53 | KOLs Management | CRUD `key_opinion_leaders` | ✅ Funcional |
| 54 | Company Profile | CRUD `company_profile` | ✅ Funcional |
| 55 | Company Milestones | CRUD `company_milestones` | ✅ Funcional |
| 56 | NPS Processing | `process-nps-csv` | ✅ Funcional |
| 57 | Content from Interests | `generate-content-from-interests` | ✅ Funcional |
| 58 | Product Document Transcription | `transcribe-product-document` | ✅ Funcional |
| 59 | LP PDF Transcription | `transcribe-landing-page-pdf` | ✅ Funcional |
| 60 | LP FAQs Generation | `generate-landing-page-faqs` | ✅ Funcional |
| 61 | Display Banners | `generate-display-banners` | ✅ Funcional |
| 62 | Export Repository CSV | `export-repository-csv` | ✅ Funcional |
| 63 | Consolidate Keywords | `consolidate-keywords` | ✅ Funcional |
| 64 | Rename Category | `rename-category` | ✅ Funcional |
| 65 | Upload Image | `upload-image` | ✅ Funcional |
| 66 | Optimize Image | `optimize-image` | ✅ Funcional |
| 67 | Auto SEO Enhancer | `auto-seo-enhancer` | ✅ Funcional |
| 68 | Validate Schema | `validate-schema` | ✅ Funcional |
| 69 | Export AI Playbook | `export-product-ai-playbook` | ✅ Funcional |
| 70 | Export Complete Handbook | `export-complete-handbook` | ✅ Funcional |
| 71 | Merchant Feed | `generate-merchant-feed` | ✅ Funcional |
| 72 | Client Photo Generation | `generate-client-photo` | ✅ Funcional |
| 73 | Parse Testimonials | `parse-testimonials` | ✅ Funcional |
| 74 | Refresh Knowledge Base | `refresh-knowledge-base` | ✅ Funcional |
| 75 | Save Landing Page | `save-landing-page` | ✅ Funcional |
| 76 | Product Card from Transcription | `generate-product-card-from-transcription` | ✅ Funcional |
| 77 | Coupons Management | CRUD `product_coupons` | ✅ Funcional |
| 78 | Aftersales Messages | CRUD `aftersales_messages` | ✅ Funcional |
| 79 | CS Messages | CRUD `cs_messages` | ✅ Funcional |
| 80 | OAuth Token Management | `google_oauth_tokens` + `oauth_credentials` | ✅ Funcional |

### ⚠️ Funcionalidades Parciais ou com Limitações

| # | Funcionalidade | Status | Limitação |
|---|---------------|--------|-----------|
| 81 | Dual-AI Competition Real | ⚠️ Parcial | Atualmente usa modelo único (Gemini) com DeepSeek apenas como fallback. A "competição" original (gerar com ambas e comparar) foi desativada para evitar WORKER_LIMIT |
| 82 | WordPress Publishing | ⚠️ Parcial | `test-wordpress-connection` existe mas `publish-blog-post` requer configuração manual |
| 83 | FTP Publishing | ⚠️ Parcial | `test-ftp-connection` existe mas sem endpoint de upload real |
| 84 | Update Loja Integrada | ⚠️ Parcial | `update-loja-integrada-product` existe mas depende de campos mapeados corretamente |
| 85 | Poll Loja Integrada Orders | ⚠️ Planejado | Código escrito mas não deployado; requer cron job via pg_cron |
| 86 | Publish Product Blog Cloudflare | ⚠️ Parcial | `publish-product-blog-cloudflare` funciona mas depende de domínio configurado |
| 87 | System B Sync | ⚠️ Parcial | `sync-system-b-documents` e `debug-systemb-product` dependem de API externa |
| 88 | System B Authors | ⚠️ Parcial | `import-systemb-authors` depende de API externa |

### ❌ Edge Functions sem Função Real ou Obsoletas

| # | Edge Function | Status | Motivo |
|---|--------------|--------|--------|
| 89 | `migrate-products-to-repository` | ❌ Obsoleta | Migração one-time já executada |
| 90 | `migrate-video-data` | ❌ Obsoleta | Migração one-time já executada |
| 91 | `migrate-images-gallery` | ❌ Obsoleta | Migração one-time já executada |
| 92 | `migrate-external-images` | ❌ Obsoleta | Migração one-time de imagens |
| 93 | `populate-review-photos` | ❌ Obsoleta | Populou fotos uma vez |
| 94 | `update-secret` | ❌ Insegura | Permite atualizar secrets via API (risco de segurança) |
| 95 | `get-product-data` | ❌ Redundante | Dados podem ser obtidos diretamente via Supabase client |
| 96 | `extract-product-data` | ❌ Uso raro | Extrai dados de URL externa (scraping) |

### 📊 Tabelas de Backup sem Utilidade

| Tabela | Status | Recomendação |
|--------|--------|-------------|
| `external_links_backup_20250120` | ❌ Sem RLS, dados antigos | Pode ser removida |
| `external_links_backup_20251013` | ❌ Apenas leitura admin | Pode ser removida |

---

## Resumo Quantitativo

| Métrica | Quantidade |
|---------|-----------|
| Edge Functions | 90 |
| Funções Operacionais | 80 (89%) |
| Funções Parciais | 8 (9%) |
| Funções Obsoletas | 6 (7%) |
| Tabelas Supabase | 30+ |
| Schemas JSON-LD | 15 types |
| Canais de Conteúdo | 12+ |
| Shared Modules | 22 |
| Hooks React | 60+ |
| Páginas | 18 |
| Linhas template-engine | 6095 |
| Linhas knowledge-base | 2076 |
| Linhas clone-landing-page | 2840 |
| Linhas generate-ecommerce-html | 2502 |

---

> **Nota:** Este documento reflete o estado do sistema em Março/2026. Para atualizações, consulte o repositório e as memórias de arquitetura no Lovable.
