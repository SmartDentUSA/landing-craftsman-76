

# Auditoria Completa do Sistema — Da Criação de Conteudo ate Inteligencia de Leads

## Visao Geral da Arquitetura

O sistema opera como um ecossistema completo de marketing digital e inteligencia de vendas para o setor odontologico, composto por 7 camadas principais, 80+ Edge Functions, 40+ tabelas, e 3 sistemas de IA integrados.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        CAMADA 1: DADOS                              │
│  Loja Integrada API │ CSV Import │ Sistema B │ Manual Input         │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 2: REPOSITORIO CENTRAL                    │
│  products_repository │ company_profile │ categories_config          │
│  key_opinion_leaders │ external_links │ company_milestones          │
│  approved_reviews │ video_testimonials │ blog_posts                 │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 3: INTELIGENCIA (AI)                      │
│  Clinical Brain │ Knowledge Graph │ Dual-AI Competition             │
│  Anti-Hallucination │ Quality Gate v2.0                             │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 4: GERACAO DE CONTEUDO                    │
│  HTML/Landing Pages │ Blog Posts │ Social Media │ SPIN Selling      │
│  Google Ads │ YouTube │ Instagram │ TikTok │ WhatsApp               │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 5: PUBLICACAO                              │
│  Cloudflare Pages │ SEO Schema │ Sitemap │ Robots.txt               │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 6: KNOWLEDGE BRAIN (Sistema A)             │
│  content_submissions │ content_jobs │ generated_pages               │
│  Knowledge Base API │ RAG │ Embeddings                              │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 7: INTELIGENCIA DE LEADS                   │
│  Dra. L.I.A. (RAG Chat) │ Memoria Longitudinal                     │
│  lia_leads │ lia_conversations │ lia_messages │ lia_lead_events     │
│  evaluate-interaction (LLM-as-Judge)                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## FLUXO 1: INGESTAO DE DADOS (Como os dados entram no sistema)

### 1.1 Import Loja Integrada
- **Funcao:** `import-loja-integrada-api` (1160 linhas)
- **Origem:** API Loja Integrada v1 (`api.awsli.com.br/v1`)
- **Destino:** `products_repository`
- **Tabelas lidas:** `products_repository` (para comparar existentes)
- **Mecanismo:** Polling com rate limit 800ms, Circuit Breaker, exponential backoff
- **Autenticacao:** Query params (`chave_api` + `chave_aplicacao`)
- **UI:** `ProductLojaIntegradaImporter` component
- **Fluxo usuario:** Repository > Importar Loja Integrada > Executar

### 1.2 CSV Import
- **Funcao:** `import-repository-csv`
- **Destino:** `products_repository`
- **UI:** `ProductRepositoryCSVImporter`, `ProductCSVUploader`
- **Fluxo usuario:** Repository > Upload CSV

### 1.3 Sistema B (Documentos Tecnicos)
- **Funcao:** `sync-system-b-documents`
- **Origem:** Sistema B envia documentos (PDFs, fichas tecnicas)
- **Funcao auxiliar:** `transcribe-product-document` (transcreve PDFs)
- **Destino:** `products_repository.document_transcriptions`
- **UI:** `SystemBDocumentSync` component
- **Fluxo usuario:** Repository > Sync Sistema B

### 1.4 Input Manual
- **UI:** `ProductEditModal`, campos no `Editor.tsx` (8108 linhas)
- **Destino:** `products_repository`, `landing_pages`
- **Fluxo usuario:** Repository > Editar Produto / Dashboard > Novo Landing Page

### 1.5 YouTube Captions
- **Funcao:** `extract-youtube-captions`
- **Destino:** `products_repository.video_captions`
- **UI:** `CaptionExtractor`, `GenericCaptionExtractor`
- **Fluxo usuario:** Repository > Produto > Extrair legendas

### 1.6 Google Reviews
- **Funcao:** `extract-google-reviews`
- **Destino:** `approved_reviews`, `manual_reviews`
- **UI:** `CompanyReviewsManager`, `ReviewModerationModal`
- **Fluxo usuario:** Dashboard > Reviews > Importar Google

### 1.7 Content Submission API (Sistema A)
- **Funcao:** `content-submission`
- **Destino:** `content_submissions` + `content_jobs` (queue)
- **Validacao:** `metadata.intent` (seo/education/comparison/commercial)
- **Fluxo sistema:** POST externo > validacao > fila > processamento

---

## FLUXO 2: REPOSITORIO CENTRAL (Tabelas canonicas)

### Tabelas e seus papeis:

| Tabela | Registros | Papel | Quem alimenta |
|--------|-----------|-------|----------------|
| `products_repository` | Principal | Catalogo completo | Loja Integrada, CSV, Manual, Sistema B |
| `company_profile` | Singleton | Identidade da empresa | Manual (CompanyProfileManager) |
| `categories_config` | Config | Categorias + anti-hallucination | Manual (CategoryManager) |
| `key_opinion_leaders` | Entidades | Especialistas/KOLs | Manual (KOLManager) |
| `external_links` | SEO | Links externos + keywords | Manual + AI (LinksManager) |
| `company_milestones` | Historia | Marcos historicos | Manual (CompanyMilestonesManager) |
| `approved_reviews` | Social Proof | Reviews aprovados | Google Reviews + Manual |
| `blog_posts` | Conteudo | Artigos do blog | AI Generation + Manual |
| `landing_pages` | HTML | Paginas de produto | Editor.tsx (8108 linhas) |
| `cloned_landing_pages` | HTML | Landing pages clonadas | LPClone |
| `google_ads_campaigns` | Marketing | Campanhas Google Ads | AI Generation |
| `nps_generated_content` | Feedback | Conteudo gerado de NPS | AI |
| `aftersales_messages` | CRM | Mensagens pos-venda | Manual (AfterSalesManager) |
| `cs_messages` | CRM | Mensagens de CS | Manual (CSManager) |

---

## FLUXO 3: INTELIGENCIA ARTIFICIAL (3 Sistemas de IA)

### 3.1 Clinical Brain
- **Funcao:** `generate-clinical-brain` (319 linhas)
- **Input:** `productId` de `products_repository`
- **Output:** `products_repository.clinical_brain_data`
- **O que gera:**
  - `product_type` (classificacao)
  - `workflow_stages` (etapas clinicas: planejamento, impressao, pos-processamento, acabamento, instalacao)
  - `forbidden_products` (produtos que NAO podem ser combinados)
  - `required_products` (produtos obrigatorios junto)
  - `anti_hallucination_rules` (regras de seguranca)
  - `confidence_score`
- **Modelo:** Lovable AI Gateway (Gemini 2.5 Flash)
- **UI:** Clinical Brain tab no Editor
- **Fluxo usuario:** Repository > Produto > Gerar Clinical Brain

### 3.2 Dual-AI Competition
- **Shared module:** `_shared/dual-ai-competition.ts`
- **Modelo 1:** Lovable AI (Gemini 2.5 Flash)
- **Modelo 2:** DeepSeek API
- **Usado por:** `generate-social-content` (WhatsApp, YouTube, Instagram, TikTok)
- **Mecanismo:** Ambas IAs geram, sistema escolhe a melhor
- **Fluxo usuario:** Repository > Produto > Gerar Conteudo Social

### 3.3 Knowledge Graph (Orquestrador Central)
- **Shared module:** `_shared/fetchKnowledgeGraph.ts` (966 linhas)
- **Tabelas que consulta (8 em paralelo):**
  1. `company_profile` (SELECT *)
  2. `products_repository` (todos os produtos)
  3. `approved_reviews` (reviews aprovados)
  4. `video_testimonials` (videos)
  5. `key_opinion_leaders` (KOLs aprovados)
  6. `blog_posts` (posts publicados)
  7. `external_links` (links aprovados)
  8. `company_milestones` (marcos publicados)
- **Funcoes de navegacao:**
  - `buildProductGraph(kg, productIds)` — filtra por produtos
  - `buildBlogGraph(kg, blogPost)` — filtra por blog
  - `buildTopicGraph(kg, topic)` — filtra por tema semantico
  - `generateInternalLinks(kg, entities)` — gera links internos
  - `getKnowledgeGraphStats(kg)` — metricas
- **Consumidores (Edge Functions que usam o KG):**
  - `generate-ecommerce-html` (2597 linhas — o maior)
  - `generate-spin-landing-page`
  - `generate-spin-campaign`
  - `generate-product-blog`
  - `process-content-submission`
  - `knowledge-base` API

---

## FLUXO 4: GERACAO DE CONTEUDO (Todos os geradores)

### 4.1 HTML / Landing Pages
| Gerador | Funcao | Input | Output |
|---------|--------|-------|--------|
| Ecommerce HTML | `generate-ecommerce-html` (2597 linhas) | KG + landing_page_data | HTML completo com Schema.org |
| SPIN Landing Page | `generate-spin-landing-page` | spin_selling_solutions + KG | HTML landing page SPIN |
| Clone Landing Page | `clone-landing-page` | HTML externo | `cloned_landing_pages` |
| Save Landing Page | `save-landing-page` | Editor data | `landing_pages.data` |

### 4.2 Blog
| Gerador | Funcao | Input | Output |
|---------|--------|-------|--------|
| Blog Estrategico | `strategic-blog-generator` | Produto + SEO config | `blog_posts` |
| Product Blog | `generate-product-blog` | Produto + KG | Blog HTML publicavel |
| Product Blog Preview | `preview-product-blog` | Produto | Preview HTML |
| Blog Publication | `publish-blog-post` | blog_post_id | Cloudflare deploy |

### 4.3 Social Media
| Gerador | Funcao | Input | Output |
|---------|--------|-------|--------|
| WhatsApp | `generate-social-content` (type: whatsapp) | Produto | Texto WhatsApp |
| YouTube Description | `generate-social-content` (type: youtube) | Produto | Descricao otimizada |
| Instagram Feed/Reels/Carousel | `generate-social-content` (type: instagram) | Produto | Copy + hashtags |
| TikTok | `generate-tiktok-content` | Produto | Script TikTok |
| Instagram Reels Script | `generate-instagram-reels-script` | Produto | Roteiro completo |
| YouTube Script | `generate-youtube-script` | Produto | Roteiro completo |
| Instagram Carousel | `generate-instagram-carousel` | Produto | Slides JSON |
| Carousel Hook | `generate-carousel-hook` | Produto | Hooks de abertura |
| Carousel Slide | `generate-carousel-slide` | Produto | Slide individual |

### 4.4 SPIN Selling
| Gerador | Funcao | Input | Output |
|---------|--------|-------|--------|
| Sales Pitch | `generate-spin-sales-pitch` | Solucao + Produtos | Pitch texto |
| Campaign | `generate-spin-campaign` | Solucao + KG | Campanha completa |
| Hero Banner | `generate-spin-hero-banner` | Solucao | Banner data |
| FAQs | `generate-spin-faqs` | Solucao | FAQs JSON |
| Journey | `generate-spin-journey` | Solucao | Jornada do cliente |
| Metrics | `generate-spin-metrics` | Solucao | KPIs estimados |
| Apostila Export | `export-spin-apostila` | Solucao | PDF/documento |

### 4.5 Google Ads
| Gerador | Funcao | Input | Output |
|---------|--------|-------|--------|
| Ad Copies | `generate-ad-copies` | Produto/Landing | Copies otimizados |
| Export CSV | `export-google-ads-csv` | Campanhas | CSV para upload |
| Product Ads CSV | `export-product-google-ads-csv` | Produto | CSV especifico |

### 4.6 SEO
| Gerador | Funcao | Input | Output |
|---------|--------|-------|--------|
| AI SEO | `ai-seo-generator` | Pagina | Meta tags, keywords |
| Auto SEO Enhancer | `auto-seo-enhancer` | Batch de paginas | SEO em lote |
| Sitemap | `generate-sitemap` | Todas as paginas | sitemap.xml |
| Video Sitemap | `generate-video-sitemap` | Videos | video-sitemap.xml |
| Robots.txt | `generate-robots-txt` | Config | robots.txt |
| Product FAQs | `generate-product-faqs` | Produto | FAQs Schema |
| Landing Page FAQs | `generate-landing-page-faqs` | Landing page | FAQs |

### 4.7 Outros Geradores
| Gerador | Funcao | Input | Output |
|---------|--------|-------|--------|
| AI Content | `generate-product-ai-content` (813 linhas) | Produto | Descricao, beneficios, features |
| Content from Interests | `generate-content-from-interests` | Interesses do lead | Conteudo personalizado |
| Display Banners | `generate-display-banners` | Produto | HTML banners |
| Client Photo | `generate-client-photo` | Config | Foto gerada |
| Merchant Feed | `generate-merchant-feed` | Produtos | Google Merchant XML |
| Complete Handbook | `export-complete-handbook` | Todos os dados | PDF completo |

---

## FLUXO 5: PUBLICACAO

### 5.1 Cloudflare Pages
- **Funcao:** `publish-cloudflare-pages` (584 linhas)
- **Input:** HTML gerado + dominio + path
- **Mecanismo:** Cloudflare Pages Direct Upload API com BLAKE3 hash
- **Destino:** `cloned_landing_pages.published_url`
- **UI:** Publication Settings, LPClone

### 5.2 Product Blog Publishing
- **Funcao:** `publish-product-blog-cloudflare`
- **Input:** Blog HTML + dominio
- **Destino:** Cloudflare Pages

### 5.3 Blog Post Publishing
- **Funcao:** `publish-blog-post`
- **Input:** `blog_posts.id`
- **Destino:** Cloudflare/dominio configurado

---

## FLUXO 6: KNOWLEDGE BRAIN (Sistema A — Canonical Source)

### Pipeline completo:

```text
Sistema B (externo)
       │
       │  POST /content-submission
       ▼
content_submissions (inbox versionado)
       │
       │  auto-create job
       ▼
content_jobs (fila async)
       │
       │  process-job-queue (worker)
       ▼
process-content-submission (pipeline 16 etapas)
       │
       ├── 1. Load submission
       ├── 2. Normalize content
       ├── 3. Extract entities (Gemini 2.5 Flash)
       ├── 4. fetchKnowledgeGraph()
       ├── 5. buildTopicGraph() / buildProductGraph()
       ├── 6. Link entities to KG
       ├── 7. Generate structured content (AI)
       ├── 8. Generate SEO metadata
       ├── 9. Generate Schema JSON-LD
       ├── 10. Generate HTML page
       ├── 11. Generate internal links
       ├── 12. Generate slug + path
       ├── 13. Compute SHA256 hash
       ├── 14. Check duplicates
       ├── 15. Generate embeddings (gemini-embedding-001)
       ├── 16. Save to generated_pages + entity_links + publications
       │
       ▼
generated_pages (paginas SEO finais)
       │
       ├── content_entity_links (entidades normalizadas)
       ├── page_publications (historico de versoes)
       └── embeddings VECTOR(768) (para RAG)
```

### Knowledge Base API
- **Funcao:** `knowledge-base` (2076 linhas)
- **Formatos:** json, ai_training, system_b, rag
- **Filtros:** company, categories, links, products, videos, reviews, KOLs, SPIN, blogs, landing pages, milestones
- **Consumidores:** Sistema B, chatbots externos, Dra. L.I.A.

### Knowledge Feed
- **Funcao:** `knowledge-feed`
- **UI:** `KnowledgeFeed` component
- **Papel:** Exporta dados formatados para treinamento de IA

---

## FLUXO 7: INTELIGENCIA DE LEADS (Dra. L.I.A.)

### Arquitetura completa:

```text
Usuario (web/WhatsApp)
       │
       │  mensagem + phone/email
       ▼
rag-chat (698 linhas)
       │
       ├── 1. LEAD IDENTIFICATION
       │     findOrCreateLead() → lia_leads
       │     (identifica por phone ou email)
       │
       ├── 2. SESSION MANAGEMENT
       │     findOrCreateConversation() → lia_conversations
       │     (timeout 2h, estados: greeting/discovery/objection)
       │
       ├── 3. LONGITUDINAL MEMORY
       │     loadLongitudinalMemory() ← lia_leads + lia_conversations + lia_lead_events
       │     (ultimas 5 conversas + 10 eventos + perfil)
       │
       ├── 4. RAG: EMBEDDING + SEARCH
       │     generateEmbedding() → gemini-embedding-001
       │     searchSimilarChunks() → match_knowledge_chunks RPC
       │     ← knowledge_vectors (chunks de produtos indexados)
       │
       ├── 5. PROMPT BUILDING
       │     buildSystemPrompt() (regras anti-hallucination + memoria)
       │     buildContext() (chunks recuperados por produto)
       │
       ├── 6. LLM CALL
       │     Gemini 2.5 Flash via Lovable AI Gateway
       │     Stream ou non-stream
       │
       ├── 7. PERSISTENCE
       │     persistMessage() → lia_messages (com chunks_used)
       │     updateConversationState()
       │
       ├── 8. EVENT TRACKING
       │     registerEvent() → lia_lead_events
       │     (interest_shown com produtos mencionados)
       │
       └── 9. QUALITY ASSURANCE (async)
             triggerEvaluation() → evaluate-interaction
```

### Tabelas do sistema de leads:

| Tabela | Papel | Campos chave |
|--------|-------|--------------|
| `lia_leads` | Cadastro de leads | phone, email, name, lead_score, tags, profile_summary, total_conversations |
| `lia_conversations` | Sessoes de chat | lead_id, current_state, extracted_entities, cognitive_analysis, outcome |
| `lia_messages` | Historico de mensagens | conversation_id, role, content, chunks_used, hallucination_flag, quality_score |
| `lia_lead_events` | Timeline de eventos | lead_id, event_type, event_data, source |

### evaluate-interaction (LLM-as-Judge)
- **Funcao:** `evaluate-interaction` (217 linhas)
- **Input:** `message_id` de `lia_messages`
- **O que avalia:**
  - Fidelidade (0.0 a 1.0) — resposta vs chunks
  - Alucinacao — informacao inventada?
- **Output:** `lia_messages.quality_score`, `hallucination_flag`
- **Execucao:** Fire-and-forget (async apos cada resposta)

### Indexacao da Base de Conhecimento
- **Funcao:** `index-knowledge-base` (296 linhas)
- **Input:** `products_repository` (todos os produtos)
- **O que faz:** Divide cada produto em chunks logicos:
  1. Descricao principal
  2. Especificacoes tecnicas
  3. Regras anti-alucinacao
  4. Beneficios + features
  5. Video captions
  6. Document transcriptions
- **Embedding:** `gemini-embedding-001` (768 dimensoes)
- **Destino:** `knowledge_vectors`
- **Busca:** RPC `match_knowledge_chunks` (vector similarity)

---

## FLUXO 8: SHARED MODULES (Reutilizados por multiplas funcoes)

| Modulo | Usado por | Funcao |
|--------|-----------|--------|
| `fetchKnowledgeGraph.ts` | ecommerce-html, SPIN, blog, content-submission | Dados centralizados |
| `track-ai-usage.ts` | Todos os geradores AI | Logging em `ai_token_usage` |
| `master-system-prompt.ts` | Geradores de conteudo | System prompt + tom por categoria |
| `dual-ai-competition.ts` | Social content | Competicao Gemini vs DeepSeek |
| `intelligent-links-processor.ts` | Blog, HTML | Links automaticos |
| `seo-fine-tuning.ts` | Ecommerce HTML | Hreflang, keyword dedup |
| `tracking-injector.ts` | Publicacao | GTM, Meta Pixel, GA4 |
| `aggregate-rating-helper.ts` | Ecommerce HTML | Schema AggregateRating |
| `local-business-helper.ts` | Ecommerce HTML | Schema LocalBusiness |
| `faq-schema-helper.ts` | Ecommerce, FAQs | Schema FAQPage |
| `video-schema-helper.ts` | Ecommerce HTML | Schema VideoObject |
| `breadcrumb-schema-helper.ts` | Ecommerce HTML | Schema BreadcrumbList |
| `authority-data-helper.ts` | Ecommerce HTML | E-E-A-T, KOLs, Videos |
| `ai-readiness-helpers.ts` | Ecommerce HTML | Meta tags para LLMs |
| `knowledge-system-helpers.ts` | Ecommerce HTML | Entity references, citations |
| `spin-content-utils.ts` | SPIN functions | Data quality, product processing |
| `spin-system-prompt.ts` | SPIN functions | System prompt SPIN |
| `content-validators.ts` | Content pipeline | Validacao de dados |
| `product-blog-html-v2.ts` | Product blog | Template HTML v2 |

---

## FLUXO 9: PAGINAS DA UI (Frontend)

| Rota | Pagina | Funcao | Acesso |
|------|--------|--------|--------|
| `/` | Index | Landing page publica | Publico |
| `/auth` | Auth | Login/Register | Publico |
| `/dashboard` | Dashboard (1453 linhas) | Lista landing pages, blogs, status | Admin |
| `/editor/:id` | Editor (8108 linhas) | Editor completo de landing page | Admin |
| `/repository` | Repository (289 linhas) | Hub central: produtos, categorias, links, SPIN, videos | Admin |
| `/cloudflare-settings` | Cloudflare | Config Cloudflare Pages | Admin |
| `/publication-settings` | Publicacao | Dominios e publicacao | Admin |
| `/lp-clone` | LP Clone | Clonar landing pages externas | Admin |
| `/youtube-settings` | YouTube OAuth | Conexao YouTube API | Admin |
| `/google-business-settings` | Google Business | Conexao Google Business | Admin |

---

## FLUXO 10: INTEGRACAO COM SERVICOS EXTERNOS

| Servico | Funcao | Autenticacao | Para que |
|---------|--------|--------------|----------|
| Loja Integrada | `import-loja-integrada-api` | API Key + App Key | Import de produtos e pedidos |
| Cloudflare Pages | `publish-cloudflare-pages` | API Token + Account ID | Deploy de HTML |
| Google AI (Gemini) | `index-knowledge-base`, `rag-chat` | GOOGLE_AI_API_KEY | Embeddings |
| Lovable AI Gateway | Todos os geradores | LOVABLE_API_KEY | Gemini 2.5 Flash |
| DeepSeek | `generate-social-content` | DEEPSEEK_API_KEY | Dual-AI competition |
| YouTube Data API | `test-youtube-connection` | OAuth2 | Dados de canal |
| Google Business | `test-google-business-connection` | OAuth2 | Reviews |

---

## FLUXO 11: MONITORAMENTO E QUALIDADE

| Sistema | Tabela/Funcao | O que monitora |
|---------|---------------|----------------|
| AI Token Usage | `ai_token_usage` + `track-ai-usage.ts` | Tokens consumidos por funcao, custo USD/BRL |
| Content Quality | `content_completion_tracking` + `ContentQualityDashboard` | Score de completude por entidade |
| Content Analytics | `content_analytics` | Performance de conteudo gerado |
| System Monitoring | `SystemMonitoringDashboard` | Status geral do sistema |
| LLM-as-Judge | `evaluate-interaction` | Fidelidade RAG, deteccao de alucinacao |
| Knowledge Base Cache | `knowledge_base_cache` | Cache 3h dos dados KB |

---

## RESUMO QUANTITATIVO

| Metrica | Valor |
|---------|-------|
| Edge Functions | 84 |
| Tabelas Supabase | 40+ |
| Shared Modules | 25 |
| Paginas Frontend | 12 |
| Componentes React | 130+ |
| Hooks customizados | 60+ |
| Modelos de IA usados | 3 (Gemini 2.5 Flash, Gemini Embedding, DeepSeek) |
| Linhas no maior arquivo (Editor.tsx) | 8,108 |
| Linhas no maior Edge Function (generate-ecommerce-html) | 2,597 |
| Linhas Knowledge Base API | 2,076 |
| Linhas Knowledge Graph | 966 |
| Canais de conteudo | 10 (HTML, Blog, WhatsApp, YouTube, Instagram, TikTok, Google Ads, Email, SPIN, Carousel) |

---

## MAPA DE DEPENDENCIA DE DADOS

Qual tabela alimenta qual funcionalidade:

```text
products_repository ──────┬── generate-ecommerce-html
                          ├── generate-product-ai-content
                          ├── generate-social-content
                          ├── generate-clinical-brain
                          ├── generate-product-blog
                          ├── generate-product-faqs
                          ├── generate-merchant-feed
                          ├── generate-spin-* (todos)
                          ├── index-knowledge-base → knowledge_vectors
                          ├── knowledge-base API
                          └── export-complete-handbook

company_profile ──────────┬── generate-ecommerce-html (SELECT *)
                          ├── generate-spin-* (branding)
                          ├── generate-product-blog
                          ├── knowledge-base API
                          └── tracking-injector (pixels)

categories_config ────────┬── Clinical Brain (anti-hallucination)
                          ├── master-system-prompt (tom por categoria)
                          └── knowledge-base API

knowledge_vectors ────────── rag-chat (Dra. L.I.A.)

lia_leads ────────────────┬── rag-chat (identificacao)
                          ├── lia_conversations (sessoes)
                          └── lia_lead_events (timeline)

content_submissions ──────── content_jobs → process-content-submission
                              → generated_pages → page_publications
```

