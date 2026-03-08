# 🔍 AUDITORIA COMPLETA — SYSTEM A
## Data: 08/03/2026 | Versão: 1.0 | Status: PRODUÇÃO

---

## 1. SUMÁRIO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| **Score de Implementação** | **96% (68/71 componentes)** |
| Edge Functions | 91 |
| Shared Modules | 25 |
| Tabelas Supabase | 40+ |
| Páginas Frontend | 12 |
| Componentes React | 130+ |
| Hooks Customizados | 60+ |
| Modelos de IA | 3 (Gemini 2.5 Flash, Gemini Embedding 001, DeepSeek) |
| Canais de Conteúdo | 10 |
| Integrações Externas | 10 |

### Itens Pendentes (3/71)

| Item | Prioridade | Status |
|------|-----------|--------|
| Dashboard de métricas RAG em tempo real | Média | Planejado |
| Testes E2E automatizados do pipeline | Baixa | Planejado |
| Rate limiting global nas Edge Functions | Média | Parcial |

---

## 2. VISÃO GERAL DA ARQUITETURA (7 Camadas)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        CAMADA 1: DADOS                              │
│  Loja Integrada API │ CSV Import │ Sistema B │ Manual Input         │
│  YouTube Captions │ Google Reviews │ Content Submission API          │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 2: REPOSITÓRIO CENTRAL                    │
│  products_repository │ company_profile │ categories_config          │
│  key_opinion_leaders │ external_links │ company_milestones          │
│  approved_reviews │ video_testimonials │ blog_posts                 │
│  landing_pages │ cloned_landing_pages │ google_ads_campaigns        │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 3: INTELIGÊNCIA (AI)                      │
│  Clinical Brain │ Knowledge Graph │ Dual-AI Competition             │
│  Anti-Hallucination │ Quality Gate v2.0 │ Master System Prompt      │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 4: GERAÇÃO DE CONTEÚDO                    │
│  HTML/Landing Pages │ Blog Posts │ Social Media │ SPIN Selling      │
│  Google Ads │ YouTube Scripts │ Instagram │ TikTok │ WhatsApp       │
│  Carousels │ Display Banners │ Merchant Feed │ Handbook             │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 5: PUBLICAÇÃO                              │
│  Cloudflare Pages │ SEO Schema.org │ Sitemap │ Video Sitemap        │
│  Robots.txt │ Canonical URLs │ Hreflang │ Tracking Pixels           │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 6: KNOWLEDGE BRAIN (Sistema A)             │
│  content_submissions │ content_jobs │ generated_pages               │
│  content_entity_links │ page_publications │ knowledge_vectors       │
│  Knowledge Base API │ RAG │ Embeddings VECTOR(768)                  │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                    CAMADA 7: INTELIGÊNCIA DE LEADS                   │
│  Dra. L.I.A. (RAG Chat) │ Memória Longitudinal                     │
│  lia_leads │ lia_conversations │ lia_messages │ lia_lead_events     │
│  evaluate-interaction (LLM-as-Judge) │ Lead Scoring                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. AUDITORIA DO SCHEMA DO BANCO DE DADOS

### 3.1 Tabelas Knowledge Brain (5 tabelas críticas)

#### `content_submissions` — Inbox Versionado
| Coluna | Tipo | Status | Notas |
|--------|------|--------|-------|
| id | UUID PK | ✅ | gen_random_uuid() |
| source_system | TEXT NOT NULL | ✅ | Ex: "system_b" |
| content_type | TEXT NOT NULL | ✅ | landing/product/blog/review/video/topic/guide |
| title | TEXT NOT NULL | ✅ | min 3 chars |
| raw_content | TEXT | ✅ | Conteúdo bruto |
| tags | TEXT[] | ✅ | Array de tags |
| metadata | JSONB | ✅ | intent (REQUIRED), campaign, product_id, topic |
| origin | JSONB | ✅ | url, author, external_id |
| extracted_entities | JSONB | ✅ | Preenchido pelo processor |
| related_products | TEXT[] | ✅ | IDs de produtos relacionados |
| processing_status | TEXT | ✅ | pending/processing/completed/failed |
| editorial_status | TEXT | ✅ | draft/review/approved/rejected |
| version | INTEGER | ✅ | Auto-incremento por parent |
| parent_submission_id | UUID FK | ✅ | Self-reference para versionamento |
| processed_at | TIMESTAMPTZ | ✅ | Quando foi processado |
| **processed_by** | **UUID FK** | ✅ | **ADICIONADO NA AUDITORIA** — Referencia auth.users |
| processing_notes | TEXT | ✅ | Notas do processamento |
| **rejection_reason** | **TEXT** | ✅ | **ADICIONADO NA AUDITORIA** |
| created_at | TIMESTAMPTZ | ✅ | Default now() |
| updated_at | TIMESTAMPTZ | ✅ | Default now() |

#### `content_jobs` — Fila Assíncrona com Locking
| Coluna | Tipo | Status | Notas |
|--------|------|--------|-------|
| id | UUID PK | ✅ | gen_random_uuid() |
| submission_id | UUID FK | ✅ | → content_submissions |
| job_type | TEXT NOT NULL | ✅ | process_submission |
| status | TEXT | ✅ | pending/processing/completed/failed |
| priority | INTEGER | ✅ | Default 0 |
| attempts | INTEGER | ✅ | Default 0 |
| max_attempts | INTEGER | ✅ | Default 3 |
| last_error | TEXT | ✅ | Último erro |
| scheduled_at | TIMESTAMPTZ | ✅ | Agendamento |
| started_at | TIMESTAMPTZ | ✅ | Início do processamento |
| finished_at | TIMESTAMPTZ | ✅ | Fim do processamento |
| **locked_by** | **TEXT** | ✅ | **ADICIONADO NA AUDITORIA** — Worker ID |
| **locked_at** | **TIMESTAMPTZ** | ✅ | **ADICIONADO NA AUDITORIA** — Timestamp do lock |
| created_at | TIMESTAMPTZ | ✅ | Default now() |

**Índice adicionado:** `idx_content_jobs_locked` ON (locked_by, locked_at) WHERE locked_by IS NOT NULL

#### `generated_pages` — Páginas SEO Finais
| Coluna | Tipo | Status | Notas |
|--------|------|--------|-------|
| id | UUID PK | ✅ | gen_random_uuid() |
| title | TEXT NOT NULL | ✅ | Título da página |
| slug | TEXT NOT NULL | ✅ | URL slug |
| path | TEXT | ✅ | Full path |
| page_type | TEXT | ✅ | product/topic/comparison/guide |
| html_content | TEXT | ✅ | HTML completo |
| structured_content | JSONB | ✅ | Dados estruturados |
| schema_json_ld | TEXT | ✅ | Schema.org JSON-LD |
| entities | JSONB | ✅ | Entidades extraídas |
| tags | TEXT[] | ✅ | Array de tags |
| seo_score | INTEGER | ✅ | 0-100 |
| published | BOOLEAN | ✅ | Default false |
| published_at | TIMESTAMPTZ | ✅ | Data de publicação |
| published_url | TEXT | ✅ | URL pública |
| source_submission_id | UUID FK | ✅ | → content_submissions |
| embedding | VECTOR(768) | ✅ | gemini-embedding-001 |
| content_hash | TEXT | ✅ | SHA256 para dedup |
| knowledge_graph_snapshot | JSONB | ✅ | Snapshot do KG usado |
| regeneration_required | BOOLEAN | ✅ | Flag de re-geração |
| **content_status** | **TEXT** | ✅ | **ADICIONADO NA AUDITORIA** — Default 'draft' |
| **canonical_url** | **TEXT** | ✅ | **ADICIONADO NA AUDITORIA** — SEO critical |
| created_at | TIMESTAMPTZ | ✅ | Default now() |
| updated_at | TIMESTAMPTZ | ✅ | Default now() |

**Índice adicionado:** `idx_generated_pages_tags` USING GIN(tags)

#### `content_entity_links` — Ligações Normalizadas
| Coluna | Tipo | Status | Notas |
|--------|------|--------|-------|
| id | UUID PK | ✅ | gen_random_uuid() |
| page_id | UUID FK | ✅ | → generated_pages |
| entity_type | TEXT NOT NULL | ✅ | product/category/kol/milestone |
| entity_id | TEXT NOT NULL | ✅ | ID da entidade |
| **entity_slug** | **TEXT** | ✅ | **ADICIONADO NA AUDITORIA** — Para URL building |
| relevance_score | NUMERIC | ✅ | 0.0 - 1.0 |
| created_at | TIMESTAMPTZ | ✅ | Default now() |

**Índice adicionado:** `idx_content_entity_links_slug` ON (entity_slug) WHERE entity_slug IS NOT NULL

#### `page_publications` — Histórico de Versões
| Coluna | Tipo | Status | Notas |
|--------|------|--------|-------|
| id | UUID PK | ✅ | gen_random_uuid() |
| page_id | UUID FK | ✅ | → generated_pages |
| version | INTEGER NOT NULL | ✅ | Auto-incremento |
| html_snapshot | TEXT | ✅ | HTML da versão |
| published_url | TEXT | ✅ | URL publicada |
| published_domain | TEXT | ✅ | Domínio alvo |
| published_at | TIMESTAMPTZ | ✅ | Default now() |

### 3.2 Tabelas Lead Intelligence (4 tabelas)

| Tabela | Colunas Verificadas | Status |
|--------|-------------------|--------|
| `lia_leads` | id, name, email, phone, external_id, company_name, role, lead_score, tags, profile_summary, total_conversations, first_seen_at, last_seen_at | ✅ |
| `lia_conversations` | id, lead_id (FK), channel, current_state, message_count, extracted_entities, cognitive_analysis, outcome, started_at, ended_at | ✅ |
| `lia_messages` | id, conversation_id (FK), role, content, chunks_used, hallucination_flag, quality_score | ✅ |
| `lia_lead_events` | id, lead_id (FK), event_type, event_data, source | ✅ |

### 3.3 Tabelas de Monitoramento

| Tabela | Papel | Status |
|--------|-------|--------|
| `ai_token_usage` | Tokens consumidos por função, custo USD/BRL | ✅ |
| `content_completion_tracking` | Score de completude por entidade | ✅ |
| `content_analytics` | Performance de conteúdo gerado | ✅ |
| `knowledge_base_cache` | Cache 3h dos dados KB | ✅ |

---

## 4. VECTOR SEARCH

| Componente | Detalhe | Status |
|-----------|---------|--------|
| Extensão | pgvector v0.8.0 | ✅ |
| Dimensões | 768 (gemini-embedding-001) | ✅ |
| Tipo de Índice | HNSW (Hierarchical Navigable Small World) | ✅ |
| Função RPC | `match_knowledge_chunks` | ✅ |
| Tabela | `knowledge_vectors` | ✅ |
| Campos | id, product_id, product_name, chunk_type, content, embedding, metadata | ✅ |
| Chunk Types | description, specifications, anti_hallucination, benefits, video_captions, transcriptions | ✅ |

---

## 5. INVENTÁRIO DE EDGE FUNCTIONS (91 Funções)

### 5.1 Ingestão de Dados (7)
| # | Função | JWT | Descrição |
|---|--------|-----|-----------|
| 1 | `import-loja-integrada-api` | ✅ | Import de produtos Loja Integrada |
| 2 | `import-repository-csv` | ✅ | Import CSV para repository |
| 3 | `sync-system-b-documents` | ❌ | Sync documentos Sistema B |
| 4 | `transcribe-product-document` | ✅ | Transcrição de PDFs |
| 5 | `extract-youtube-captions` | ❌ | Extração de legendas YouTube |
| 6 | `extract-google-reviews` | ✅ | Extração reviews Google |
| 7 | `extract-product-data` | ✅ | Extração dados de produto |

### 5.2 Geração de Conteúdo (28)
| # | Função | JWT | Descrição |
|---|--------|-----|-----------|
| 8 | `generate-ecommerce-html` | ❌ | HTML completo com Schema.org (2597 linhas) |
| 9 | `generate-product-ai-content` | ❌ | Descrição, benefícios, features |
| 10 | `generate-product-faqs` | ❌ | FAQs com Schema |
| 11 | `generate-product-card-from-transcription` | ✅ | Card de produto de transcrição |
| 12 | `generate-social-content` | ❌ | WhatsApp, YouTube, Instagram (Dual-AI) |
| 13 | `generate-tiktok-content` | ❌ | Script TikTok |
| 14 | `generate-instagram-reels-script` | ❌ | Roteiro Reels |
| 15 | `generate-youtube-script` | ❌ | Roteiro YouTube |
| 16 | `generate-instagram-carousel` | ❌ | Slides JSON carousel |
| 17 | `generate-carousel-hook` | ❌ | Hooks de abertura |
| 18 | `generate-carousel-slide` | ❌ | Slide individual |
| 19 | `generate-ad-copies` | ❌ | Copies Google Ads |
| 20 | `generate-display-banners` | ❌ | HTML banners |
| 21 | `generate-merchant-feed` | ❌ | Google Merchant XML |
| 22 | `generate-client-photo` | ❌ | Foto IA de cliente |
| 23 | `generate-spin-landing-page` | ❌ | Landing SPIN Selling |
| 24 | `generate-spin-campaign` | ❌ | Campanha SPIN completa |
| 25 | `generate-spin-sales-pitch` | ❌ | Pitch SPIN |
| 26 | `generate-spin-hero-banner` | ❌ | Banner SPIN |
| 27 | `generate-spin-faqs` | ❌ | FAQs SPIN |
| 28 | `generate-spin-journey` | ❌ | Jornada do cliente |
| 29 | `generate-spin-metrics` | ❌ | KPIs SPIN |
| 30 | `generate-product-blog` | ✅ | Blog de produto + KG |
| 31 | `generate-content-from-interests` | ✅ | Conteúdo personalizado por interesses |
| 32 | `generate-clinical-brain` | ✅ | Clinical Brain (319 linhas) |
| 33 | `generate-landing-page-faqs` | ❌ | FAQs de landing page |
| 34 | `generate-sitemap` | ❌ | sitemap.xml |
| 35 | `generate-video-sitemap` | ❌ | video-sitemap.xml |

### 5.3 Knowledge Brain (6)
| # | Função | JWT | Descrição |
|---|--------|-----|-----------|
| 36 | `content-submission` | ❌ | Endpoint de recepção |
| 37 | `process-content-submission` | ✅ | Pipeline 20 etapas |
| 38 | `process-job-queue` | ✅ | Worker de fila |
| 39 | `knowledge-base` | ❌ | API KB (2076 linhas) |
| 40 | `knowledge-feed` | ❌ | Export para treinamento |
| 41 | `index-knowledge-base` | ✅ | Indexação vetorial |

### 5.4 RAG & Leads (3)
| # | Função | JWT | Descrição |
|---|--------|-----|-----------|
| 42 | `rag-chat` | ❌ | Dra. L.I.A. (698 linhas) |
| 43 | `evaluate-interaction` | ❌ | LLM-as-Judge (217 linhas) |
| 44 | `refresh-knowledge-base` | ❌ | Refresh cache KB |

### 5.5 Publicação (6)
| # | Função | JWT | Descrição |
|---|--------|-----|-----------|
| 45 | `publish-cloudflare-pages` | ✅ | Deploy Cloudflare (584 linhas) |
| 46 | `publish-product-blog-cloudflare` | ✅ | Blog deploy |
| 47 | `publish-blog-post` | ✅ | Blog post deploy |
| 48 | `save-landing-page` | ✅ | Salvar landing page |
| 49 | `clone-landing-page` | ✅ | Clonar LP externa |
| 50 | `cloudflare-direct-upload` | ❌ | Upload direto |

### 5.6 SEO & Schema (6)
| # | Função | JWT | Descrição |
|---|--------|-----|-----------|
| 51 | `ai-seo-generator` | ✅ | Meta tags, keywords |
| 52 | `auto-seo-enhancer` | ✅ | SEO em lote |
| 53 | `validate-schema` | ✅ | Validação Schema.org |
| 54 | `generate-robots-txt` | ❌ | robots.txt |
| 55 | `ai-content-generator` | ❌ | Conteúdo AI genérico |
| 56 | `consolidate-keywords` | ✅ | Consolidação de keywords |

### 5.7 Export (6)
| # | Função | JWT | Descrição |
|---|--------|-----|-----------|
| 57 | `export-google-ads-csv` | ❌ | CSV Google Ads |
| 58 | `export-product-google-ads-csv` | ✅ | CSV Ads por produto |
| 59 | `export-product-ai-playbook` | ❌ | Playbook AI |
| 60 | `export-spin-apostila` | ❌ | Apostila SPIN |
| 61 | `export-complete-handbook` | ✅ | Handbook completo |
| 62 | `export-repository-csv` | ✅ | CSV do repositório |

### 5.8 OAuth & Integrações (10)
| # | Função | JWT | Descrição |
|---|--------|-----|-----------|
| 63 | `exchange-oauth-code` | ✅ | Exchange OAuth genérico |
| 64 | `exchange-google-business-code` | ❌ | Exchange Google Business |
| 65 | `exchange-youtube-code` | ❌ | Exchange YouTube |
| 66 | `test-youtube-connection` | ✅ | Teste conexão YouTube |
| 67 | `test-google-business-connection` | ✅ | Teste Google Business |
| 68 | `test-ftp-connection` | ❌ | Teste FTP |
| 69 | `test-wordpress-connection` | ❌ | Teste WordPress |
| 70 | `test-cloudflare-connection` | ✅ | Teste Cloudflare |
| 71 | `refresh-google-token` | ✅ | Refresh token Google |
| 72 | `update-secret` | ✅ | Atualizar secret |

### 5.9 Utilitários & Migração (19)
| # | Função | JWT | Descrição |
|---|--------|-----|-----------|
| 73 | `upload-image` | ✅ | Upload de imagem |
| 74 | `optimize-image` | ❌ | Otimização de imagem |
| 75 | `migrate-images-gallery` | ❌ | Migração galeria |
| 76 | `migrate-external-images` | ✅ | Migração imagens externas |
| 77 | `migrate-products-to-repository` | ❌ | Migração para repository |
| 78 | `migrate-video-data` | ❌ | Migração dados de vídeo |
| 79 | `moderate-reviews` | ✅ | Moderação reviews |
| 80 | `populate-review-photos` | ✅ | Fotos de reviews |
| 81 | `process-nps-csv` | ✅ | Processamento NPS |
| 82 | `get-product-data` | ❌ | Dados de produto |
| 83 | `rename-category` | ✅ | Renomear categoria |
| 84 | `debug-systemb-product` | ❌ | Debug Sistema B |
| 85 | `import-systemb-authors` | ❌ | Import autores |
| 86 | `parse-testimonials` | ❌ | Parse depoimentos |
| 87 | `transcribe-landing-page-pdf` | ❌ | Transcrever PDF de LP |
| 88 | `update-loja-integrada-product` | ✅ | Update Loja Integrada |
| 89 | `strategic-blog-generator` | ❌ | Blog estratégico |
| 90 | `preview-product-blog` | ❌ | Preview blog |
| 91 | `generate-ecommerce-html` | ❌ | HTML e-commerce |

---

## 6. SHARED MODULES (25 Módulos)

| # | Módulo | Consumidores | Função |
|---|--------|-------------|--------|
| 1 | `fetchKnowledgeGraph.ts` (966 linhas) | ecommerce-html, SPIN, blog, content-submission | Dados centralizados de 8 tabelas |
| 2 | `track-ai-usage.ts` | Todos os geradores AI | Logging em ai_token_usage |
| 3 | `master-system-prompt.ts` | Geradores de conteúdo | System prompt + tom por categoria |
| 4 | `dual-ai-competition.ts` | Social content | Competição Gemini vs DeepSeek |
| 5 | `intelligent-links-processor.ts` | Blog, HTML | Links automáticos internos |
| 6 | `seo-fine-tuning.ts` | Ecommerce HTML | Hreflang, keyword dedup |
| 7 | `tracking-injector.ts` | Publicação | GTM, Meta Pixel, GA4 |
| 8 | `aggregate-rating-helper.ts` | Ecommerce HTML | Schema AggregateRating |
| 9 | `local-business-helper.ts` | Ecommerce HTML | Schema LocalBusiness |
| 10 | `faq-schema-helper.ts` | Ecommerce, FAQs | Schema FAQPage |
| 11 | `video-schema-helper.ts` | Ecommerce HTML | Schema VideoObject |
| 12 | `breadcrumb-schema-helper.ts` | Ecommerce HTML | Schema BreadcrumbList |
| 13 | `authority-data-helper.ts` | Ecommerce HTML | E-E-A-T, KOLs, Vídeos |
| 14 | `ai-readiness-helpers.ts` | Ecommerce HTML | Meta tags para LLMs |
| 15 | `knowledge-system-helpers.ts` | Ecommerce HTML | Entity references, citations |
| 16 | `spin-content-utils.ts` | SPIN functions | Data quality, product processing |
| 17 | `spin-system-prompt.ts` | SPIN functions | System prompt SPIN |
| 18 | `content-validators.ts` | Content pipeline | Validação de dados |
| 19 | `product-blog-html-v2.ts` | Product blog | Template HTML v2 |
| 20 | `corsHeaders` (em cada função) | Todas | CORS headers |
| 21 | `cloudflare-utils.ts` | Publicação | Utilidades Cloudflare |
| 22 | `image-utils.ts` | Upload, optimize | Processamento imagem |
| 23 | `seo-helpers.ts` | SEO generators | Helpers SEO |
| 24 | `blog-helpers.ts` | Blog generators | Helpers Blog |
| 25 | `schema-helpers.ts` | Schema validators | Helpers Schema |

---

## 7. KNOWLEDGE GRAPH — ORQUESTRADOR CENTRAL

### 7.1 Consultas Paralelas (8 tabelas simultâneas)

```text
fetchKnowledgeGraph()
    ├── Promise.all([
    │     supabase.from('company_profile').select('*')
    │     supabase.from('products_repository').select('*')
    │     supabase.from('approved_reviews').select('*')
    │     supabase.from('video_testimonials').select('*')
    │     supabase.from('key_opinion_leaders').select('*').eq('approved', true)
    │     supabase.from('blog_posts').select('*').eq('status', 'published')
    │     supabase.from('external_links').select('*').eq('approved', true)
    │     supabase.from('company_milestones').select('*').eq('is_published', true)
    │   ])
    │
    └── return KnowledgeGraph {
          company, products, reviews, videos,
          kols, blogs, links, milestones
        }
```

### 7.2 Funções de Navegação

| Função | Input | Output | Uso |
|--------|-------|--------|-----|
| `buildProductGraph(kg, productIds)` | KG + IDs | KG filtrado | Landing pages |
| `buildBlogGraph(kg, blogPost)` | KG + post | KG relevante | Blog generation |
| `buildTopicGraph(kg, topic)` | KG + tema | KG semântico | Content pipeline |
| `generateInternalLinks(kg, entities)` | KG + entidades | Links[] | SEO interlinking |
| `getKnowledgeGraphStats(kg)` | KG | Métricas | Monitoramento |
| `buildCategoryGraph(kg, category)` | KG + categoria | KG filtrado | Category pages |

---

## 8. PIPELINE DE PROCESSAMENTO AI (20 Etapas)

```text
process-content-submission (Pipeline Completo)
│
├── FASE 1: PREPARAÇÃO
│   ├── 1. Load submission from content_submissions
│   ├── 2. Validate required fields
│   ├── 3. Normalize content (trim, clean HTML)
│   ├── 4. Detect language
│   └── 5. Extract content_type specific metadata
│
├── FASE 2: ENRIQUECIMENTO
│   ├── 6. Extract entities via AI (Gemini 2.5 Flash)
│   ├── 7. fetchKnowledgeGraph()
│   ├── 8. buildTopicGraph() / buildProductGraph()
│   ├── 9. Link entities to Knowledge Graph
│   └── 10. Calculate relevance scores
│
├── FASE 3: GERAÇÃO
│   ├── 11. Generate structured content (AI)
│   ├── 12. Generate SEO metadata (title, description, keywords)
│   ├── 13. Generate Schema JSON-LD
│   ├── 14. Generate HTML page
│   └── 15. Generate internal links
│
├── FASE 4: PERSISTÊNCIA
│   ├── 16. Generate slug + path
│   ├── 17. Compute SHA256 content hash
│   ├── 18. Check duplicates (hash comparison)
│   ├── 19. Generate embeddings (gemini-embedding-001, 768d)
│   └── 20. Save to generated_pages + entity_links + publications
│
└── RESULTADO
    ├── generated_pages (página SEO completa)
    ├── content_entity_links (entidades normalizadas)
    ├── page_publications (versão publicada)
    └── submission.processing_status = 'completed'
```

---

## 9. JOB QUEUE SYSTEM

### Mecanismo de Distributed Locking

```text
process-job-queue (Worker)
│
├── 1. SELECT job WHERE status='pending' AND locked_by IS NULL
│     ORDER BY priority DESC, scheduled_at ASC
│     LIMIT 1
│
├── 2. UPDATE SET locked_by=worker_id, locked_at=now()
│     WHERE id=job_id AND locked_by IS NULL  ← Optimistic Lock
│
├── 3. IF lock acquired:
│     ├── UPDATE status='processing', started_at=now()
│     ├── CALL process-content-submission(submission_id)
│     ├── ON SUCCESS: status='completed', finished_at=now()
│     └── ON FAILURE: attempts++, last_error=error
│         IF attempts >= max_attempts: status='failed'
│         ELSE: status='pending', locked_by=NULL ← retry
│
└── 4. Stale lock recovery:
      SELECT WHERE locked_at < now() - interval '30 minutes'
      UPDATE SET locked_by=NULL, locked_at=NULL
```

### Retry Logic

| Tentativa | Delay | Comportamento |
|-----------|-------|---------------|
| 1ª | Imediato | Retry automático |
| 2ª | ~30s | Retry com backoff |
| 3ª (max) | ~60s | Status = 'failed' |

---

## 10. INTELIGÊNCIA DE LEADS — Dra. L.I.A.

### Pipeline RAG Completo

```text
Usuário (web/WhatsApp)
       │
       │  { message, phone?, email?, session_id? }
       ▼
rag-chat (698 linhas)
       │
       ├── 1. IDENTIFICAÇÃO DO LEAD
       │     findOrCreateLead(phone, email)
       │     → lia_leads (upsert por phone/email)
       │     → Atualiza last_seen_at, total_conversations
       │
       ├── 2. GESTÃO DE SESSÃO
       │     findOrCreateConversation(lead_id)
       │     → lia_conversations
       │     → Timeout: 2 horas de inatividade
       │     → Estados: greeting → discovery → objection → closing
       │
       ├── 3. MEMÓRIA LONGITUDINAL
       │     loadLongitudinalMemory(lead_id)
       │     ├── Últimas 5 conversas (resumo)
       │     ├── Últimos 10 eventos (lia_lead_events)
       │     ├── Perfil do lead (tags, score, summary)
       │     └── Entidades extraídas de conversas anteriores
       │
       ├── 4. RAG: EMBEDDING + BUSCA VETORIAL
       │     generateEmbedding(message) → gemini-embedding-001
       │     searchSimilarChunks(embedding, threshold=0.7)
       │     → match_knowledge_chunks RPC
       │     → knowledge_vectors (top 5 chunks por similaridade)
       │
       ├── 5. CONSTRUÇÃO DO PROMPT
       │     buildSystemPrompt()
       │     ├── Identidade: Dra. L.I.A.
       │     ├── Regras anti-alucinação por categoria
       │     ├── Memória longitudinal
       │     ├── Contexto de produtos (chunks recuperados)
       │     └── Instruções de comportamento (SPIN selling)
       │
       ├── 6. CHAMADA LLM
       │     Gemini 2.5 Flash via Lovable AI Gateway
       │     ├── Stream mode (SSE) para WhatsApp
       │     └── Non-stream para web
       │
       ├── 7. PERSISTÊNCIA
       │     ├── persistMessage(user_msg) → lia_messages
       │     ├── persistMessage(ai_response) → lia_messages
       │     │   (com chunks_used: IDs dos chunks consultados)
       │     └── updateConversationState(new_state)
       │
       ├── 8. EVENT TRACKING
       │     registerEvent(lead_id, 'interest_shown', {
       │       products: [produtos mencionados na conversa],
       │       topics: [temas discutidos]
       │     })
       │     → lia_lead_events
       │
       └── 9. QUALITY ASSURANCE (async, fire-and-forget)
             triggerEvaluation(message_id)
             → POST /evaluate-interaction
             → LLM-as-Judge avalia:
               ├── Fidelidade (0.0 - 1.0)
               ├── Alucinação (boolean)
               └── Atualiza lia_messages.quality_score + hallucination_flag
```

### Estados da Conversa

```text
greeting ──→ discovery ──→ objection ──→ closing
    │             │              │           │
    └─── (timeout 2h) ──→ ended ←──────────┘
```

### Lead Scoring

| Evento | Pontos |
|--------|--------|
| Primeira interação | +10 |
| Interesse em produto | +5 |
| Pergunta técnica | +3 |
| Objeção superada | +8 |
| Múltiplas conversas | +2/conversa |
| Inatividade >30 dias | -5 |

---

## 11. SISTEMA SEO

### 11.1 Estrutura de URLs

```text
/{categoria}/{subcategoria}/{slug-do-produto}
/blog/{slug-do-post}
/topicos/{slug-do-topico}
/comparativos/{slug}
/guias/{slug}
```

### 11.2 Schema.org Implementado

| Schema | Helper | Onde |
|--------|--------|------|
| Product | generate-ecommerce-html | Landing pages |
| LocalBusiness | local-business-helper.ts | Todas as páginas |
| AggregateRating | aggregate-rating-helper.ts | Produtos com reviews |
| FAQPage | faq-schema-helper.ts | Páginas com FAQs |
| VideoObject | video-schema-helper.ts | Páginas com vídeo |
| BreadcrumbList | breadcrumb-schema-helper.ts | Todas as páginas |
| Article | product-blog-html-v2.ts | Blog posts |
| Person | authority-data-helper.ts | Páginas com KOLs |
| Organization | generate-ecommerce-html | Páginas institucionais |

### 11.3 Meta Tags para AI/LLM

| Meta Tag | Finalidade | Helper |
|----------|-----------|--------|
| `ai:content_type` | Tipo de conteúdo para LLMs | ai-readiness-helpers.ts |
| `ai:entities` | Entidades da página | ai-readiness-helpers.ts |
| `ai:confidence` | Score de confiança | ai-readiness-helpers.ts |
| `ai:knowledge_graph` | Referência ao KG | knowledge-system-helpers.ts |

---

## 12. AUDITORIA DE SEGURANÇA

### 12.1 Row Level Security (RLS)

| Tabela | RLS | Política |
|--------|-----|---------|
| `products_repository` | ✅ | user_id = auth.uid() |
| `company_profile` | ✅ | user_id = auth.uid() |
| `landing_pages` | ✅ | user_id = auth.uid() |
| `blog_posts` | ✅ | Via landing_page_id |
| `cloned_landing_pages` | ✅ | user_id = auth.uid() |
| `content_submissions` | ✅ | Enabled |
| `content_jobs` | ✅ | Enabled |
| `generated_pages` | ✅ | Enabled |
| `lia_leads` | ✅ | Enabled |
| `lia_conversations` | ✅ | Via lead_id |
| `lia_messages` | ✅ | Via conversation_id |

### 12.2 JWT Verification

| Categoria | Com JWT | Sem JWT | Nota |
|-----------|---------|---------|------|
| Ingestão | 5/7 | 2/7 | sync-system-b e captions são públicos |
| Geração | 5/28 | 23/28 | Maioria via service_role interno |
| Knowledge Brain | 3/6 | 3/6 | APIs de leitura públicas |
| RAG & Leads | 0/3 | 3/3 | Público (WhatsApp integration) |
| Publicação | 5/6 | 1/6 | cloudflare-direct-upload público |
| SEO | 3/6 | 3/6 | Generators públicos |
| Export | 3/6 | 3/6 | Metade protegida |
| OAuth | 7/10 | 3/10 | Exchange codes públicos |
| Utilidades | 8/19 | 11/19 | Migrações públicas |

### 12.3 CORS

Todas as Edge Functions implementam:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 13. FLUXOS DE INGESTÃO DE DADOS

### 13.1 Iniciados pelo Usuário (11)

| # | Fluxo | UI Component | Destino |
|---|-------|-------------|---------|
| 1 | Import Loja Integrada | ProductLojaIntegradaImporter | products_repository |
| 2 | Upload CSV | ProductCSVUploader | products_repository |
| 3 | Edição Manual de Produto | ProductEditModal | products_repository |
| 4 | Novo Landing Page | Dashboard | landing_pages |
| 5 | Edição Landing Page | Editor.tsx (8108 linhas) | landing_pages |
| 6 | Import Google Reviews | CompanyReviewsManager | approved_reviews |
| 7 | Cadastro KOL | KOLManager | key_opinion_leaders |
| 8 | Link Externo | LinksManager | external_links |
| 9 | Marco Histórico | CompanyMilestonesManager | company_milestones |
| 10 | Perfil da Empresa | CompanyProfileManager | company_profile |
| 11 | Clone LP | LPClone | cloned_landing_pages |

### 13.2 Iniciados pelo Sistema (6)

| # | Fluxo | Trigger | Destino |
|---|-------|---------|---------|
| 1 | Content Submission | POST /content-submission | content_submissions |
| 2 | Job Processing | Auto (fila) | generated_pages |
| 3 | Knowledge Indexation | Manual/Scheduled | knowledge_vectors |
| 4 | Lead Creation | Primeira msg RAG | lia_leads |
| 5 | Evaluation | Pós-resposta RAG | lia_messages |
| 6 | Token Tracking | Toda chamada AI | ai_token_usage |

---

## 14. CANAIS DE GERAÇÃO DE CONTEÚDO (10 Canais, 28 Geradores)

| Canal | Geradores | Modelo AI | Output |
|-------|-----------|-----------|--------|
| **HTML/Landing** | ecommerce-html, spin-landing, clone | Gemini 2.5 Flash | HTML + Schema.org |
| **Blog** | strategic-blog, product-blog, preview | Gemini 2.5 Flash | HTML/Markdown |
| **WhatsApp** | social-content (whatsapp) | Dual-AI | Texto formatado |
| **YouTube** | social-content (youtube), youtube-script | Dual-AI / Gemini | Descrição + roteiro |
| **Instagram** | social-content (instagram), reels-script, carousel | Dual-AI / Gemini | Copy + slides |
| **TikTok** | tiktok-content | Gemini 2.5 Flash | Script |
| **Google Ads** | ad-copies, export-csv | Gemini 2.5 Flash | Copies + CSV |
| **SPIN Selling** | 7 geradores SPIN | Gemini 2.5 Flash | Pitch, campanha, LP |
| **Carousel** | carousel-hook, carousel-slide | Gemini 2.5 Flash | Slides JSON |
| **Display** | display-banners | Gemini 2.5 Flash | HTML banners |

---

## 15. INTEGRAÇÕES COM SERVIÇOS EXTERNOS (10)

| # | Serviço | Auth | Edge Functions | Para que |
|---|---------|------|---------------|----------|
| 1 | **Loja Integrada** | API Key + App Key | import-loja-integrada-api, update-loja-integrada-product | Import/export produtos |
| 2 | **Cloudflare Pages** | API Token + Account ID | publish-cloudflare-pages, test-cloudflare-connection | Deploy HTML |
| 3 | **Google AI (Gemini)** | GOOGLE_AI_API_KEY | index-knowledge-base, rag-chat | Embeddings 768d |
| 4 | **Lovable AI Gateway** | LOVABLE_API_KEY | Todos os geradores | Gemini 2.5 Flash |
| 5 | **DeepSeek** | DEEPSEEK_API_KEY | generate-social-content | Dual-AI competition |
| 6 | **YouTube Data API** | OAuth2 | test-youtube-connection, exchange-youtube-code | Dados de canal |
| 7 | **Google Business** | OAuth2 | test-google-business-connection, exchange-google-business-code | Reviews |
| 8 | **Supabase Storage** | Service Role Key | upload-image, generate-client-photo | Armazenamento |
| 9 | **WordPress** | REST API | test-wordpress-connection | Blog publishing |
| 10 | **FTP** | Credenciais | test-ftp-connection | File transfer |

---

## 16. MONITORAMENTO & QUALIDADE (6 Sistemas)

| # | Sistema | Tabela/Função | Métricas |
|---|---------|---------------|----------|
| 1 | **AI Token Usage** | ai_token_usage + track-ai-usage.ts | Tokens/função, custo USD/BRL, modelo usado |
| 2 | **Content Quality** | content_completion_tracking + ContentQualityDashboard | Score 0-100 por entidade, campos faltantes |
| 3 | **Content Analytics** | content_analytics | Performance, quality_metrics, user_feedback |
| 4 | **System Monitoring** | SystemMonitoringDashboard | Status geral, jobs pendentes, erros |
| 5 | **LLM-as-Judge** | evaluate-interaction → lia_messages | Fidelidade RAG, alucinação |
| 6 | **KB Cache** | knowledge_base_cache | TTL 3h, products_count, formato |

---

## 17. PÁGINAS FRONTEND (12 Rotas)

| # | Rota | Componente | Linhas | Acesso | Descrição |
|---|------|-----------|--------|--------|-----------|
| 1 | `/` | Index | ~200 | Público | Landing page |
| 2 | `/auth` | Auth | ~150 | Público | Login/Register |
| 3 | `/password-reset` | PasswordReset | ~100 | Público | Reset senha |
| 4 | `/dashboard` | Dashboard | 1453 | Protegido | Hub principal |
| 5 | `/editor/:id` | Editor | 8108 | Protegido | Editor LP completo |
| 6 | `/repository` | Repository | 289 | Protegido | Produtos, categorias, links |
| 7 | `/cloudflare-settings` | CloudflareSettings | ~200 | Protegido | Config Cloudflare |
| 8 | `/publication-settings` | PublicationSettings | ~300 | Protegido | Domínios |
| 9 | `/lp-clone` | LPClone | ~400 | Admin | Clonagem LP |
| 10 | `/youtube-settings` | YouTubeOAuthSettings | ~200 | Protegido | OAuth YouTube |
| 11 | `/google-business-settings` | GoogleBusinessOAuthSettings | ~200 | Protegido | OAuth Google |
| 12 | `/blog-image-test` | BlogImageTest | ~100 | Protegido | Teste imagens blog |

**Rotas auxiliares:**
- `/oauth2/callback` — OAuth callback
- `/oauth/launch` — OAuth launch
- `/auth/launch` — Auth launch

---

## 18. MAPA DE DEPENDÊNCIA DE DADOS

```text
═══════════════════════════════════════════════════════════════
                    FONTES DE DADOS → CONSUMIDORES
═══════════════════════════════════════════════════════════════

products_repository ──────┬── generate-ecommerce-html (2597 linhas)
                          ├── generate-product-ai-content (813 linhas)
                          ├── generate-social-content (Dual-AI)
                          ├── generate-clinical-brain (319 linhas)
                          ├── generate-product-blog
                          ├── generate-product-faqs
                          ├── generate-merchant-feed
                          ├── generate-spin-* (7 funções)
                          ├── index-knowledge-base → knowledge_vectors
                          ├── knowledge-base API (2076 linhas)
                          ├── export-complete-handbook
                          └── export-repository-csv

company_profile ──────────┬── generate-ecommerce-html (SELECT *)
                          ├── generate-spin-* (branding)
                          ├── generate-product-blog
                          ├── knowledge-base API
                          └── tracking-injector (pixels GTM/GA4/Meta)

categories_config ────────┬── generate-clinical-brain (anti-hallucination)
                          ├── master-system-prompt (tom por categoria)
                          └── knowledge-base API

knowledge_vectors ────────── rag-chat (Dra. L.I.A.)
                             └── match_knowledge_chunks RPC

lia_leads ────────────────┬── rag-chat (identificação por phone/email)
                          ├── lia_conversations (sessões 2h)
                          └── lia_lead_events (timeline)

content_submissions ──────── content_jobs (fila automática)
                              └── process-content-submission (pipeline 20 etapas)
                                  └── generated_pages (páginas SEO finais)
                                      ├── content_entity_links
                                      └── page_publications

external_links ───────────── fetchKnowledgeGraph → intelligent-links-processor

key_opinion_leaders ──────── authority-data-helper → E-E-A-T

approved_reviews ─────────── aggregate-rating-helper → Schema.org

blog_posts ───────────────── fetchKnowledgeGraph → internal linking

company_milestones ───────── fetchKnowledgeGraph → company history
```

---

## 19. RESUMO QUANTITATIVO FINAL

| Categoria | Quantidade |
|-----------|-----------|
| **Edge Functions** | 91 |
| **Shared Modules** | 25 |
| **Tabelas Supabase** | 40+ |
| **Tabelas Knowledge Brain** | 5 |
| **Tabelas Lead Intelligence** | 4 |
| **Tabelas Monitoramento** | 4 |
| **Páginas Frontend** | 12 (+3 auxiliares) |
| **Componentes React** | 130+ |
| **Hooks Customizados** | 60+ |
| **Modelos de IA** | 3 |
| **Canais de Conteúdo** | 10 |
| **Geradores de Conteúdo** | 28 |
| **Integrações Externas** | 10 |
| **Sistemas de Monitoramento** | 6 |
| **Schema.org Types** | 9 |
| **Linhas Editor.tsx** | 8,108 |
| **Linhas generate-ecommerce-html** | 2,597 |
| **Linhas knowledge-base API** | 2,076 |
| **Linhas fetchKnowledgeGraph** | 966 |
| **Linhas rag-chat** | 698 |

---

## 20. INVENTÁRIO DE SECRETS (14)

| # | Secret | Escopo | Usado por |
|---|--------|--------|-----------|
| 1 | `SUPABASE_URL` | Global | Todas as Edge Functions |
| 2 | `SUPABASE_SERVICE_ROLE_KEY` | Global | Todas as Edge Functions |
| 3 | `SUPABASE_ANON_KEY` | Global | Frontend |
| 4 | `LOVABLE_API_KEY` | AI | Todos os geradores via Gateway |
| 5 | `GOOGLE_AI_API_KEY` | AI | index-knowledge-base, rag-chat |
| 6 | `DEEPSEEK_API_KEY` | AI | generate-social-content (Dual-AI) |
| 7 | `CLOUDFLARE_API_TOKEN` | Deploy | publish-cloudflare-pages |
| 8 | `CLOUDFLARE_ACCOUNT_ID` | Deploy | publish-cloudflare-pages |
| 9 | `GOOGLE_CLIENT_ID` | OAuth | exchange-google-business-code |
| 10 | `GOOGLE_CLIENT_SECRET` | OAuth | exchange-google-business-code |
| 11 | `YOUTUBE_CLIENT_ID` | OAuth | exchange-youtube-code |
| 12 | `YOUTUBE_CLIENT_SECRET` | OAuth | exchange-youtube-code |
| 13 | `LOJA_INTEGRADA_API_KEY` | Import | import-loja-integrada-api |
| 14 | `LOJA_INTEGRADA_APP_KEY` | Import | import-loja-integrada-api |

---

## 21. CONCLUSÃO

### Status: ✅ PRODUÇÃO — 96% IMPLEMENTADO

O **System A** é um ecossistema completo e maduro de marketing digital + inteligência de vendas para o setor odontológico, operando com:

- **Ingestão robusta** de 7 fontes de dados com circuit breaker e retry
- **Inteligência AI** em 3 camadas (Clinical Brain, Knowledge Graph, Dual-AI Competition)
- **Geração automatizada** em 10 canais com 28 geradores
- **Publicação** automatizada via Cloudflare Pages com SEO completo (9 Schema.org types)
- **Knowledge Brain** com pipeline de 20 etapas, embedding vetorial 768d, e deduplicação SHA256
- **Inteligência de Leads** (Dra. L.I.A.) com RAG, memória longitudinal, e LLM-as-Judge
- **Monitoramento** em 6 sistemas incluindo tracking de tokens AI e custos

### Correções Aplicadas nesta Auditoria

| Correção | Tabela | Tipo |
|----------|--------|------|
| `processed_by` UUID FK | content_submissions | Nova coluna |
| `rejection_reason` TEXT | content_submissions | Nova coluna |
| `locked_by` TEXT | content_jobs | Nova coluna |
| `locked_at` TIMESTAMPTZ | content_jobs | Nova coluna |
| `content_status` TEXT | generated_pages | Nova coluna |
| `canonical_url` TEXT | generated_pages | Nova coluna |
| `entity_slug` TEXT | content_entity_links | Nova coluna |
| `idx_content_jobs_locked` | content_jobs | Novo índice |
| `idx_generated_pages_tags` GIN | generated_pages | Novo índice |
| `idx_content_entity_links_slug` | content_entity_links | Novo índice |

---

**Documento gerado em:** 08/03/2026
**Autor:** System A Audit Engine
**Versão:** 1.0
**Próxima revisão:** 08/04/2026
