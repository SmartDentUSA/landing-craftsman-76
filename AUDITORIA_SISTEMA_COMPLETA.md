# Auditoria Completa do Sistema — SmartDent / landing-craftsman-76

> Documento vivo de auditoria técnica, funcional e operacional.
> **Data do snapshot:** 28/05/2026
> **Projeto Lovable:** `b282ae68-9aa1-4f3f-8597-81ef6773926f`
> **Sistema A (canonical, escrita):** Supabase `pgfgripuanuwwolmtknn`
> **Sistema B (read-only, imutável):** Supabase `okeogjgqijbfkudfjadz`
> **Gateway IA:** Lovable AI Gateway — `google/gemini-2.5-flash`

Convenções: ✅ implementado e estável · ⚠️ parcial / risco · ❌ gap / bug ativo.

---

## 0. Sumário Executivo

A plataforma é um **CMS de IA proprietário** para a Smart Dent (insumos odontológicos / resinas para impressão 3D). Ela:

1. **Centraliza o catálogo de produtos** vindo da Loja Integrada + Sistema B (vídeos, documentos técnicos, autores).
2. **Gera conteúdo com IA** (blogs de produto, landing pages SPIN, carrosséis Instagram, anúncios Google Ads, scripts YouTube/Reels/TikTok, banners display, FAQs, copies WhatsApp).
3. **Publica em múltiplos destinos** (Cloudflare Pages, FTP KingHost, Git KingHost, Loja Integrada, GBP).
4. **Mantém um RAG** com 206 chunks indexados (`knowledge_vectors`) usados pela persona comercial "Dra. L.I.A." e pelos geradores de conteúdo.
5. **Aplica SEO/GEO v2026** (JSON-LD `@graph` unificado, semantic HTML, Schema.org Medical/Service/Product/Event/Video, Wikidata Q138636902).

### Snapshot de dados reais (28/05/2026)

| Tabela / Métrica | Valor |
|---|---|
| `products_repository` | 120 |
| `landing_pages` | 10 |
| `generated_pages` | **0** ⚠️ |
| `page_publications` | **0** ⚠️ |
| `content_submissions` | **0** ⚠️ |
| `content_jobs` (fila async) | **0** |
| `knowledge_vectors` (RAG) | 206 |
| `company_milestones` | 31 |
| `approved_reviews` | 11 |
| `company_profile` rows | **2** ❌ (deveria ser 1 — viola regra PGRST116) |
| `lia_conversations` | 0 (Dra. L.I.A. sem tráfego) |
| `lia_messages` | 0 |
| Custo IA 24h | sem uso |
| Custo IA 30d | R$ 0,10 |

> **Leitura:** o sistema está **arquiteturalmente completo** porém com **baixíssima atividade operacional atual** — nenhuma publicação registrada, fila vazia, RAG sem interações. Indica ou janela de uso muito recente, ou ambiente em transição (provavelmente o motivo dos erros recentes de publicação no domínio `www.smartdent.com.br`).

---

## 1. Stack & Topologia

### 1.1 Frontend
- **React 18 + Vite 5 + TypeScript 5**
- **Tailwind CSS v3** com tokens HSL semânticos (`src/index.css`, `tailwind.config.ts`)
- **shadcn/ui** (50+ componentes em `src/components/ui/`)
- **TanStack Query** para data fetching
- **React Router** (rotas em `src/App.tsx`)
- **Framer Motion** para animações (carrosséis, hero)

### 1.2 Backend
- **Supabase Edge Functions** (Deno nativo) — 106 funções ativas em `supabase/functions/`
- **Postgres** com RLS (Sistema A); 80+ tabelas + 10+ views
- **pg_cron** para refresh de KB a cada 3h
- **Storage Supabase** para imagens otimizadas

### 1.3 IA
- **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1`)
- Modelo padrão: `google/gemini-2.5-flash`
- Pipeline dual-AI (Gemini vs DeepSeek) com Quality Gate v2.0
- Embeddings: `gemini-embedding-001`

### 1.4 Hospedagem & Domínios
- **Lovable Preview:** `https://id-preview--b282ae68-9aa1-4f3f-8597-81ef6773926f.lovable.app`
- **Lovable Published:** `https://landing-craftsman-76.lovable.app`
- **Domínio cliente:** `www.smartdent.com.br` (KingHost via Git + FTP; Cloudflare como CDN)
- **GTM obrigatório:** `GTM-NZ64Q899` (bloquear `GTM-MNPGDCH`)

---

## 2. Arquitetura Frontend

### 2.1 Estrutura
```
src/
├── pages/           # 19 páginas (Dashboard, Editor, Repository, RAGMetrics, OAuth*, CodeView, LPClone, ...)
├── components/      # ~150 componentes (Manager*, *Generator, *Section, ClinicalBrain/, repository/, editor/, ui/)
├── hooks/           # 62 hooks (auth, data, autosave, SEO, RAG, OAuth)
├── contexts/        # CategoryContext (gating de uso)
├── services/seo/    # blogHTMLGenerator, schemaGenerator, semanticHTMLEnhancer, seoQualityValidator, ...
├── lib/             # auto-link, schema-consolidator, milestone-schema-helper, intelligent-links, oauth, ...
├── data/            # authors.ts (E-E-A-T estático)
├── config/          # feature-flags, domain-config
└── integrations/supabase/  # client + types (gerados, NÃO editar)
```

### 2.2 Padrões obrigatórios (gravados em memória)

| Padrão | Onde | Por quê |
|---|---|---|
| **Context-safe hooks com fallback** | `CategoryContext`, demais Providers | Nunca lançar quando consumido fora do Provider — retornar `defaultContext` |
| **`useRef` para estabilizar fetch em dashboards** | `Dashboard.tsx`, `RAGMetricsDashboard.tsx` | Evita loops de re-fetch |
| **`useAuthReady`** centralizado | `src/hooks/useAuthReady.ts` | Trata timeout e ambiente Preview |
| **Roles via RPC `has_role`** | `ProtectedRoute`, hooks de admin | Fallback evita lockout; nunca confiar em localStorage |
| **Auto-save + autosave protection** | `useProductAutoSave`, `useAutoSaveProtection`, `useUndoRedo` | Editores longos (Landing Page, Blog) |
| **`CategoryProvider` dentro de `ProtectedRoute`** | `App.tsx` | Resource gating — não carregar payload pesado sem auth |
| **Tokens HSL** em `index.css` + `tailwind.config.ts` | Todo o app | Proibido cor crua em componentes |

### 2.3 Páginas principais

| Rota | Página | Função |
|---|---|---|
| `/` | `Index` / `Dashboard` | Hub principal, painel de publicações |
| `/editor` | `Editor` | Editor de landing pages |
| `/blog-editor` | `BlogEditor` | Curadoria de blogs de produto |
| `/repository` | `Repository` | Catálogo de produtos (120 itens) |
| `/lp-clone` | `LPClone` | Clonagem assistida de landing pages |
| `/code-view` | `CodeView` | Visualização do HTML final gerado |
| `/rag-metrics` | `RAGMetricsDashboard` | Saúde do RAG + custo IA + hallucinations |
| `/publication-settings` | `PublicationSettings` | Configuração de destinos (Cloudflare/FTP/Git/LI) |
| `/cloudflare-settings` | `CloudflareSettings` | Token + zona CF |
| `/youtube-oauth-settings` | `YouTubeOAuthSettings` | OAuth YouTube |
| `/google-business-oauth-settings` | `GoogleBusinessOAuthSettings` | OAuth GBP |
| `/auth`, `/oauth/callback`, `/oauth/launch`, `/password-reset` | Auth flow | Login + recuperação |

### 2.4 Editores (UX detalhada)

#### Landing Page Editor (`Editor.tsx` + `src/components/editor/*`)
- Wizard com seções: Banner, Solutions (SPIN), KOL, KnowledgeFeed, SEO
- Rendering rules:
  - Descrições injetadas via **triple-stache Mustache** (`{{{ ... }}}`) — permite HTML
  - Auto-wrap de URLs em `<a>` no `intelligent-links-processor`
  - Google Reviews: prioriza GBP, fallback `approved_reviews` locais
  - Resources Section: layout **2 colunas mobile**, prioriza resinas
  - CTAs de produto: mapeamento **automático IFU/FDS** por nome exato do arquivo (regra `product-cta-mapping-rules`)
- `LPPublishDialog` deve espelhar exatamente o output de `CodeView` (parity)

#### Blog Editor
- Template Mustache V2 com dark mode
- Schema.org `BlogPosting` + `Person` + `Organization`
- Auto-link de termos (`useAutoLinker` + `intelligent-links-advanced`)
- Progress em tempo real via Realtime (`useBlogGenerationProgress`)

#### Instagram Carousel
- Hooks engagement vs strategic
- Slides 1-6 com regras de overlay e `object-fit: cover`
- **Slide 6 (CTA)** tem layout travado contra overflow
- Exportação ZIP via **Canvas + MediaRecorder API**, com `Promise.race` para timeout (carousel-export-resilience)

---

## 3. Arquitetura Backend (106 Edge Functions)

### 3.1 Regras invioláveis

- ✅ **`Deno.serve` nativo** (sem express/oak)
- ✅ **Máx. 2500 linhas** por função (soft-limit Deno bundler)
- ✅ **AI Gateway obrigatório** (`google/gemini-2.5-flash`)
- ✅ **`_shared/tracking-injector.ts`** em todo HTML publicável (injeta GTM-NZ64Q899, bloqueia GTM-MNPGDCH)
- ✅ **`_shared/seo-fine-tuning.ts`** para SEO logic (sameAs → Wikidata Q138636902)
- ✅ **`_shared/video-schema-helper.ts`** para VideoObject schemas
- ✅ Nunca usar `select('*')` em `products_repository`
- ✅ Sempre filtrar por `active` (não `is_active`)

### 3.2 Inventário por domínio

#### A. Geração de Conteúdo (IA)
| Função | Propósito |
|---|---|
| `ai-content-generator` | Gerador genérico (system prompt + Gemini) |
| `ai-seo-generator` | Meta tags, slugs, headings otimizados |
| `auto-seo-enhancer` | Pós-processamento enterprise (semantic + GEO) |
| `strategic-blog-generator` | Blog estratégico multi-produto |
| `generate-product-blog` | Blog por produto (template v2 Mustache) |
| `generate-product-ai-content` | Cards completos de produto |
| `generate-product-card-from-transcription` | A partir de transcrição PDF/áudio |
| `generate-product-faqs` | FAQ Schema.org por produto |
| `generate-landing-page-faqs` | FAQ por LP |
| `generate-blog-index` | Página de índice de blog |
| `generate-content-from-interests` | A partir de intents/interesses |
| `generate-clinical-brain` | "Cérebro clínico" do produto (v2 — regras imutáveis Bio Vitality) |
| `consolidate-keywords` | Agrega keywords cross-produto |
| `generate-merchant-feed` | Feed Google Merchant |
| `generate-ecommerce-html` | HTML para Loja Integrada (remove metadata não-visual) |
| `generate-local-seo-page` | Páginas locais (cidades, clínicas) |

#### B. SPIN Selling (campanha completa)
| Função | Propósito |
|---|---|
| `generate-spin-campaign` | Hub orquestrador |
| `generate-spin-landing-page` | LP SPIN com `systemBIntegration.ts` |
| `generate-spin-hero-banner` | Hero da campanha |
| `generate-spin-journey` | Jornada do cliente |
| `generate-spin-sales-pitch` | Pitch comercial |
| `generate-spin-metrics` | KPIs / benchmarks |
| `generate-spin-faqs` | FAQ SPIN |
| `export-spin-apostila` | Apostila PDF/DOCX para vendedores |

#### C. Mídia & Social
| Função | Propósito |
|---|---|
| `generate-instagram-carousel` | Hub do carrossel |
| `generate-carousel-hook` | Hook engagement/strategic |
| `generate-carousel-slide` | Slide individual |
| `generate-instagram-reels-script` | Reels |
| `generate-tiktok-content` | TikTok |
| `generate-youtube-script` | YouTube |
| `generate-display-banners` | Banners display Ads |
| `generate-client-photo` | Avatar IA de cliente |
| `generate-social-content` | Posts orgânicos |
| `generate-ad-copies` | Google Ads copies |

#### D. RAG / Knowledge Base
| Função | Propósito |
|---|---|
| `index-knowledge-base` | Gera embeddings → `knowledge_vectors` |
| `refresh-knowledge-base` | pg_cron 3h |
| `knowledge-base` | Endpoint público da KB (verify_jwt=false) |
| `knowledge-feed` | Feed JSON da KB |
| `rag-chat` | Conversação RAG (Dra. L.I.A.) |
| `export-complete-handbook` | Export consolidado |
| `export-product-ai-playbook` | Playbook por produto |
| `mcp-server` | Servidor MCP para integração com agentes externos |

#### E. Publicação Multi-Destino
| Função | Destino |
|---|---|
| `publish-cloudflare-pages` | Cloudflare Pages (direct upload) |
| `publish-static-cloudflare` | Estático em CF |
| `publish-ftp-pages` | FTP KingHost (TCP/21) |
| `publish-git-kinghost` | Git via GitHub REST API (atômico) |
| `publish-static-file` | Arquivo único estático |
| `publish-blog-post` | Blog completo |
| `publish-product-blog-cloudflare` | Blog de produto em CF |
| `publish-gbp-post` | Google Business Profile |
| `republish-domain-pages` | Re-deploy massivo por domínio |
| `republish-domain-cloudflare-bulk` | Bulk CF |
| `unpublish-pages` | Despublicação (limpa `nav-data.js`) |
| `clone-landing-page` | Clonagem |
| `save-landing-page` | Persistência |

#### F. Integrações Externas
| Função | Integração |
|---|---|
| `import-loja-integrada-api` | Polling 800ms + `since_atualizado` + JSON.parse manual |
| `update-loja-integrada-product` | Update produto + variações → pai |
| `sync-system-b-articles` | Artigos do Sistema B |
| `sync-system-b-documents` | Documentos técnicos |
| `import-systemb-authors` | Autores E-E-A-T |
| `debug-systemb-product` | Diagnóstico |
| `extract-google-reviews` | GBP reviews |
| `respond-review-ai` | Resposta IA a reviews |
| `moderate-reviews` | Moderação IA |
| `extract-youtube-captions` | Captions YouTube |
| `update-youtube-metadata` | Metadata YouTube |
| `extract-product-data` | Scraping/extração URL → produto |
| `transcribe-product-document` | Transcrição PDF/imagem (Gemini multimodal) |
| `transcribe-landing-page-pdf` | Transcrição PDF para LP |
| `exchange-oauth-code`, `exchange-oauth-code-direct` | OAuth genérico |
| `exchange-google-business-code` | OAuth GBP |
| `exchange-youtube-code` | OAuth YouTube |
| `refresh-google-token` | Refresh tokens Google |
| `test-google-business-connection` | Health check GBP |
| `test-youtube-connection` | Health check YT |
| `test-cloudflare-connection` | Health check CF |
| `test-ftp-connection` | Health check FTP |
| `test-wordpress-connection` | Health check WP |
| `wikidata-sync` | Sync protocol v4 (QID Q138636902) |
| `gsc-submit-sitemaps` | Submit ao Google Search Console |
| `cloudflare-direct-upload` | Upload direto CF |

#### G. Operacional / Fila / Auditoria
| Função | Propósito |
|---|---|
| `content-submission` | Ingestão (intent validation) |
| `process-content-submission` | Processamento + versionamento parent-child |
| `process-job-queue` | FIFO + distributed locks (`content_jobs`) |
| `evaluate-interaction` | Avaliação de qualidade |
| `validate-schema` | Validação JSON-LD |
| `generate-sitemap` | Sitemap XML |
| `generate-video-sitemap` | Video sitemap |
| `generate-robots-txt` | robots.txt dinâmico |
| `optimize-image` | Otimização (WebP, resize) |
| `upload-image` | Upload Storage |
| `migrate-images-gallery`, `migrate-external-images`, `migrate-products-to-repository`, `migrate-video-data` | Migrações pontuais |
| `populate-review-photos` | Foto IA para reviews |
| `process-nps-csv` | Ingestão CSV NPS |
| `parse-testimonials` | Parser de depoimentos |
| `rename-category` | Rename + propagação |
| `import-repository-csv`, `export-repository-csv`, `export-google-ads-csv`, `export-product-google-ads-csv` | CSVs |
| `get-product-data` | Endpoint público de produto |
| `preview-product-blog` | Preview sem publicar |
| `update-secret` | Gerencia secrets via UI |

### 3.3 `_shared` (utilitários canônicos)
Arquivos críticos em `supabase/functions/_shared/`:
- `seo-fine-tuning.ts` — SEO logic + Wikidata
- `tracking-injector.ts` — GTM unificado
- `video-schema-helper.ts` — VideoObject Schema.org
- `master-system-prompt.ts` — system prompt mestre da IA
- `spin-system-prompt.ts` — system prompt SPIN
- `dual-ai-competition.ts` — Gemini vs DeepSeek
- `clinical-brain-guard.ts` — guardrails clínicos
- `mustache-template-engine.ts` — render Mustache
- `product-blog-html-v2.ts` — template blog v2
- `prompt-processor.ts` + `prompt-templates.ts` — orquestração de prompts
- `intelligent-links-processor.ts` — auto-link
- `fetchKnowledgeGraph.ts` — Knowledge Graph Orchestrator (8 tabelas)
- `verified-authors.ts` — autores E-E-A-T
- `track-ai-usage.ts` — logging em `ai_token_usage`
- `rate-limiter.ts` — limites por função
- `google-auth.ts` — OAuth Google shared
- `wikidata-payload-builder.ts` — payload Wikidata
- helpers de schema: `aggregate-rating`, `authority-data`, `breadcrumb-schema`, `faq-schema`, `howto-schema`, `itemlist-schema`, `local-business`, `person-schema`

---

## 4. Modelo de Dados (Sistema A)

### 4.1 Tabelas (80+) — agrupadas por domínio

#### Produto & Catálogo
- `products_repository` (120 linhas) — catálogo principal. **Nunca `select('*')`**, sempre filtrar `active=true`.
- `categories_config` — config de categorias
- `product_coupons`, `coupons` — promoções
- `product_drive_folders` — Google Drive de assets
- `product_video_projects` — projetos de vídeo por produto
- `v_product_completeness`, `v_product_content_feed` — views consolidadas

#### Empresa & Autoridade
- `company_profile` (**2 linhas — ❌ deve ser 1**)
- `company_milestones` (31) — Schema.org `Event`/`Organization`
- `key_opinion_leaders` — KOLs
- `wikidata_entity_map`, `wikidata_sync_logs` — sync Wikidata

#### Reviews & UGC
- `approved_reviews` (11), `raw_reviews`, `manual_reviews`, `smartdent_reviews`
- `review_responses`, `v_reviews_with_responses`
- `video_testimonials` — **⚠️ falta coluna `city`**
- `ugc_intake`, `v_ugc_pipeline`

#### Landing Pages & Conteúdo
- `landing_pages` (10), `cloned_landing_pages`
- `generated_pages` (0), `page_publications` (0), `publication_settings`
- `blog_posts`, `blog_articles`, `blog_topics`, `v_blog_pipeline`
- `content_submissions` (0), `content_jobs` (0), `content_calendar`
- `content_analytics`, `content_completion_tracking`, `content_refresh_log`
- `content_entity_links`
- `nps_generated_content`
- `v_content_pipeline_summary`

#### SPIN
- `spin_selling_solutions`
- `flow_stages`

#### IA / Prompts / KB
- `prompts_configuration`, `enhanced_prompts` (em código)
- `knowledge_vectors` (206) — embeddings RAG
- `knowledge_base_cache` — cache 3h via pg_cron
- `smartdent_answer_blocks` — blocos pré-aprovados
- `ai_token_usage` — logging de custos (R$ 0,10 nos últimos 30d)
- `ads_generation_benchmark` — benchmark de geração

#### Dra. L.I.A. (RAG comercial)
- `lia_conversations` (0), `lia_messages` (0), `lia_leads`, `lia_lead_events`
- (aftersales/CS) `aftersales_messages`, `cs_messages`, `wa_generation_log`
- `gbp_posts_log`

#### Vídeos
- `panda_videos`, `v_panda_videos_dashboard`, `v_video_production_dashboard`
- `video_copies`, `video_publish_log`
- `external_links`, `external_links_backup_*`

#### SEO / Indexação
- `gsc_submission_log`, `indexing_debug_log`
- `local_seo_targets`, `v_local_seo_summary`
- `domain_config`

#### Auth / Roles
- `profiles`, `user_roles` (com `app_role` enum: admin/moderator/user)
- `oauth_client_configs`, `oauth_credentials`, `google_oauth_tokens`

#### Integrações externas
- `systemb_articles`, `v_sistema_b_integration_status`
- `extraction_jobs`
- `google_ads_campaigns`, `capcut_kits`
- `system_flags`, `system_monitoring`
- `pipeline_audit_logs` — auditoria do pipeline

### 4.2 RLS & Segurança
- ✅ Roles **em tabela separada** (`user_roles`) + função `has_role(uuid, app_role)` SECURITY DEFINER
- ⚠️ Auditoria 2026-04 listou **5 RLS faltando** (ver `mem://security/audit-findings-2026-04`)
- ✅ Triggers `updated_at` em todas as tabelas mutáveis (frontend usa `updated_at` como verdade)
- ✅ `pg_cron` para refresh KB 3h

### 4.3 Sistema B (read-only)
- Projeto `okeogjgqijbfkudfjadz` — **estritamente imutável**
- Endpoint público: `https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export?format=ai_ready`
- Payload contém: `videos_produtos`, `videos_resinas`, `documentos_catalogo`, `produtos.resinas`, autores
- Consumido por `systemBIntegration.ts` (correlação por `li_product_id` ou nome)
- Importação Sistema A: `import-systemb-authors`, `sync-system-b-articles`, `sync-system-b-documents`
- ❌ **Proibido** buscar `smartops_form_field_responses` cruzando boundaries

---

## 5. IA & Inteligência de Dados

### 5.1 Gateway & Modelos
- **Endpoint:** `https://ai.gateway.lovable.dev/v1`
- **Auth:** header `Lovable-API-Key` (secret `LOVABLE_API_KEY`)
- **Default chat:** `google/gemini-2.5-flash`
- **Imagens:** quando necessário, `google/gemini-2.5-flash-image` (Nano Banana)
- **Monitoramento:** toda chamada loga em `ai_token_usage` via `_shared/track-ai-usage.ts` (custo BRL, function id, tokens, latência)

### 5.2 Pipeline Dual-AI + Quality Gate v2.0
1. Prompt mestre (`master-system-prompt.ts`) + context-specific (`spin-system-prompt.ts`, `clinical-brain-guard.ts`)
2. Execução paralela em **Gemini** e (opcionalmente) **DeepSeek** (`dual-ai-competition.ts`)
3. **Quality Gate v2.0** valida:
   - Keywords mínimas (validators)
   - Coerência clínica (Bio Vitality = longa duração; rígidos NÃO levam +Flex)
   - Tom/PT-BR/length
   - Schema.org válido
   - Dedup SHA256 vs `knowledge_vectors`
4. Persistência em `content_submissions` → `process-content-submission` → `generated_pages`
5. Auditoria detalhada em `pipeline_audit_logs`

### 5.3 RAG — De onde vem, o que vem, como é usado

#### Fontes (8 tabelas — Knowledge Graph Orchestrator)
1. `products_repository` (descrição, specs, FAQ)
2. `company_profile` (institucional)
3. `company_milestones` (eventos / autoridade)
4. `approved_reviews` (social proof)
5. `key_opinion_leaders` (KOLs)
6. `landing_pages` (conteúdo publicado)
7. `blog_posts` / `blog_articles`
8. **Sistema B** (vídeos, documentos técnicos, autores)

#### Pipeline de indexação (`index-knowledge-base`)
1. Fetch das 8 fontes via `fetchKnowledgeGraph.ts`
2. Chunking + normalização
3. **Dedup SHA256** do conteúdo
4. Embeddings via `gemini-embedding-001`
5. Upsert em `knowledge_vectors` (atualmente **206 chunks**)
6. Cache 3h (`knowledge_base_cache` + `pg_cron`)

#### Pipeline de recuperação (`rag-chat`)
1. Query do usuário → embedding
2. Similarity search em `knowledge_vectors`
3. Filtro por contexto (produto, persona, vertical)
4. Re-ranking + injeção de schema (`smartdent_answer_blocks` quando aplicável)
5. Geração com Gemini 2.5 Flash
6. **Quality scoring** + `hallucination_flag` salvos em `lia_messages`
7. Métricas agregadas em `useRAGMetrics` (RAGMetricsDashboard)

#### Persona "Dra. L.I.A."
- Sales/clinical agent
- Logs em `lia_attendances`, `lia_leads`, `lia_lead_events`
- Atualmente **sem tráfego** (0 conversas)
- Integração com WhatsApp via `wa_generation_log` + campanhas

### 5.4 SEO Enhancer & Knowledge Graph
- `auto-seo-enhancer` aplica pós-processamento enterprise
- `_shared/seo-fine-tuning.ts` enforce sameAs Wikidata Q138636902
- Schemas unificados em **um único `@graph`** (`schema-consolidator.ts`)
- Standard SEO v2026: LCP otimizado, `<main>` + `<article class="indexable-content">`

---

## 6. Fluxos End-to-End

### 6.1 Criação de Blog de Produto
```
Usuário (Repository) seleciona produto
  → ProductBlogGeneratorModal
  → generate-product-blog (edge)
      ↳ fetchKnowledgeGraph(productId)
      ↳ dual-ai-competition (Gemini × DeepSeek)
      ↳ Quality Gate v2.0
      ↳ product-blog-html-v2 (Mustache)
      ↳ tracking-injector (GTM)
      ↳ schema-consolidator (@graph único)
  → INSERT content_submissions
  → process-content-submission
  → INSERT generated_pages
  → ProductBlogPublisherPanel (escolha destino)
  → publish-product-blog-cloudflare | publish-blog-post | publish-git-kinghost
  → INSERT page_publications + page_history
```

### 6.2 Criação de Landing Page
```
Editor (wizard 9 seções) → useProductAutoSave (rascunho)
  → save-landing-page (snapshot)
  → CodeView (preview HTML final)
  → LPPublishDialog (parity: mesmo HTML do CodeView)
  → router de publicação (Cloudflare / FTP / Git / LI)
  → upsert dedup (publishing/upsert-logic)
  → INSERT page_publications (com HTML diff)
```

### 6.3 Campanha SPIN
```
SpinSellingManager
  → generate-spin-campaign (orquestrador)
      ↳ generate-spin-hero-banner
      ↳ generate-spin-landing-page (+ systemBIntegration: vídeos/docs)
      ↳ generate-spin-journey
      ↳ generate-spin-sales-pitch
      ↳ generate-spin-metrics
      ↳ generate-spin-faqs
  → export-spin-apostila (PDF para vendedores)
```

### 6.4 Carrossel Instagram
```
EngagementCarouselSection | StrategicCarouselPreview
  → generate-carousel-hook
  → loop generate-carousel-slide (slides 1-6)
      ↳ Promise.race timeout 60s
      ↳ Canvas render
  → MediaRecorder → ZIP (raiz, sem subpasta)
  → download direto no browser
```

### 6.5 Async Job Queue
```
Qualquer gerador pesado → INSERT content_jobs (status='queued')
  → process-job-queue (cron / on-demand)
      ↳ SELECT FOR UPDATE SKIP LOCKED (distributed lock)
      ↳ executa job
      ↳ UPDATE status / retry
```

### 6.6 Sync Loja Integrada
```
import-loja-integrada-api (cron/manual)
  ↳ polling 800ms entre páginas
  ↳ since_atualizado=<timestamp>
  ↳ manual JSON.parse (workaround LI quirks)
  ↳ Circuit breaker (3 falhas → pausa)
  → upsert products_repository (active=true)

update-loja-integrada-product
  ↳ se variação alterada → propaga update para parent
```

### 6.7 Wikidata Sync v4
```
WikidataSyncButton → wikidata-sync
  ↳ Circuit breaker valida QID
  ↳ wikidata-payload-builder
  ↳ POST Wikidata API
  → INSERT wikidata_sync_logs
```

---

## 7. Publicação Multi-Destino

| Destino | Função | Notas |
|---|---|---|
| **Cloudflare Pages** | `publish-cloudflare-pages`, `publish-static-cloudflare`, `cloudflare-direct-upload` | Direct upload, sem build remoto |
| **FTP KingHost** | `publish-ftp-pages` | TCP/21, CWD logic, fallback params (`ftp-spec`) |
| **Git KingHost** | `publish-git-kinghost` | GitHub REST API atômico: blob → tree → commit → ref | ❌ **bug atual:** `SmartDentUSA/landing-craftsman-76` retorna 404 |
| **Loja Integrada** | `generate-ecommerce-html` + `update-loja-integrada-product` | Remove `<script>` não-visual |
| **Google Business Profile** | `publish-gbp-post` | OAuth Google |
| **GSC** | `gsc-submit-sitemaps` | Submit automático |

### Histórico, rollback, unpublish
- `page_publications` armazena **HTML diffs** por versão
- Rollback: restaura HTML anterior + republish
- `unpublish-pages` limpa `nav-data.js` dinamicamente (Site-wide Navigation)
- `republish-domain-pages` / `republish-domain-cloudflare-bulk` para re-deploy em massa

---

## 8. SEO / Semântica (Standard v2026)

- ✅ **JSON-LD `@graph` único** por página (`schema-consolidator.ts`)
- ✅ Schemas: `Organization`, `MedicalBusiness`, `Service`, `Product`, `BlogPosting`, `FAQPage`, `Event`, `VideoObject`, `DigitalDocument`, `Review`, `BreadcrumbList`, `Person` (autores E-E-A-T)
- ✅ `<main>` + `<article class="indexable-content">` envolvem conteúdo indexável **E** blocos AI-readiness/JSON-LD ocultos
- ✅ sameAs → **Wikidata Q138636902**
- ✅ E-E-A-T: autores estáticos em `src/data/authors.ts` (autoridade verificada)
- ✅ `MedicalEntity` validado por CRO/CFO
- ✅ LCP optimization
- ✅ Sitemap, video-sitemap, robots.txt dinâmicos
- ✅ `public/llms.txt` + `public/.well-known/llms.txt`

---

## 9. Integrações (Resumo)

| Integração | Secret(s) | Status |
|---|---|---|
| Lovable AI Gateway | `LOVABLE_API_KEY` | ✅ |
| Loja Integrada | LI key (em DB/secret) | ✅ com circuit breaker |
| Google Business Profile | OAuth (`oauth_credentials`) | ✅ |
| YouTube Data API | OAuth | ✅ |
| Google Search Console | OAuth + sitemap submit | ✅ |
| Cloudflare | API token | ✅ |
| FTP KingHost | usuário/senha (secrets) | ✅ |
| GitHub (Git KingHost) | `GITHUB_PAT_DEPLOY` | ❌ **repo 404** (ver §11) |
| Wikidata | sem auth | ✅ |
| Meta / Instagram Graph | — | ❌ **credenciais ausentes** |
| MCP | — | ✅ servidor disponível |
| WordPress | API | ⚠️ apenas health-check |

---

## 10. Segurança

- ✅ Roles em `user_roles` + `has_role()` SECURITY DEFINER
- ✅ Service role nunca exposto ao frontend
- ✅ Anon key OK no frontend
- ✅ Auth via `useAuthReady` (timeout-safe)
- ✅ Validação Zod nas edge functions críticas
- ⚠️ **5 RLS faltando** (auditoria 2026-04) — pendente correção
- ⚠️ `company_profile` com 2 linhas (deveria ter unique constraint efetivo)
- ✅ Secrets gerenciados via `update-secret` + Supabase Functions secrets

---

## 11. Gaps, Bugs e Falhas Recorrentes

### ❌ Bugs ativos
| # | Bug | Localização | Status |
|---|---|---|---|
| 1 | **`publish-git-kinghost` — repo 404** | `SmartDentUSA/landing-craftsman-76` não existe ou inacessível com `GITHUB_PAT_DEPLOY` | **Bloqueia publicação no domínio cliente.** Pendente owner/repo correto. |
| 2 | **`company_profile` tem 2 linhas** | DB | Gera PGRST116 em `.single()`. Precisa de DELETE + unique constraint. |
| 3 | **`video_testimonials.city` ausente** | DB | Queries que pedem `city` quebram. Fallback parcial implementado. |
| 4 | **Instagram Meta API ausente** | secrets | Carrossel não publica direto no IG — só exporta ZIP. |
| 5 | **5 RLS faltando** | tabelas (audit 2026-04) | Risco de leitura indevida. |
| 6 | **Edge functions próximas de 2500 linhas** | algumas funções de geração | Risco de falha no bundler Deno. |

### ⚠️ Riscos / Code smells
- `select('*')` acidental em `products_repository` causa **timeout DB**
- Uso de `is_active` em vez de `active` quebra sync
- Loja Integrada manual `JSON.parse` é frágil — necessário monitorar
- KB cache 3h pode entregar conteúdo defasado em janelas de promoção
- Carrossel: Canvas + MediaRecorder não funcionam em Safari iOS (resilience parcial via Promise.race)
- Dashboards sem `useRef` re-fetch em loop (regra já documentada)
- Contextos sem `defaultContext` lançam fora do Provider (regra já documentada)

### 📊 Sinais operacionais preocupantes (snapshot atual)
- **0 publicações registradas** (`page_publications`) — coerente com bug §11.1
- **0 conteúdos submetidos** (`content_submissions`) nas últimas semanas
- **0 jobs na fila** — pipeline async não está sendo exercitado
- **RAG sem tráfego** (0 lia_conversations) — Dra. L.I.A. não está atendendo
- **Custo IA 30d = R$ 0,10** — uso de geração muito baixo

---

## 12. UI/UX por Área

### Dashboard
- Lista de publicações com status (publicado / despublicado / substituído)
- Data baseada em `updated_at` do DB (trigger), nunca timestamp do frontend
- Filtros por domínio/tipo

### RAG Metrics Dashboard
- Total chunks (206)
- Hallucination rate (atualmente N/A — sem mensagens)
- Quality score médio
- Custo IA 24h
- Conversas ativas
- Gráfico qualidade × tempo
- Lista das últimas mensagens com hallucination flag

### Repository
- Grid de 120 produtos
- Score de completude (`v_product_completeness`)
- Importação CSV / Loja Integrada
- Edição com auto-save
- Geração IA por produto

### Editor (LP)
- Wizard 9 seções
- Auto-save com proteção (não perde drafts)
- Undo/Redo
- Preview ao vivo
- Restore from HTML

### Carrosséis
- Preview com Framer Motion
- Overlays e `object-fit: cover` consistentes
- Slide 6 (CTA) com layout travado

---

## 13. Apêndices

### 13.1 Variáveis de Ambiente / Secrets
| Secret | Uso | Origem |
|---|---|---|
| `LOVABLE_API_KEY` | AI Gateway | Auto-gerenciado |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Edge functions | Supabase auto |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID` | Frontend | `.env` auto |
| `GITHUB_PAT_DEPLOY` | Git KingHost | Manual |
| `CLOUDFLARE_*` | CF Pages | Manual |
| `FTP_*` (host/user/pass) | KingHost FTP | Manual |
| `GOOGLE_CLIENT_ID/SECRET` (GBP, YouTube) | OAuth | Manual |
| `LOJA_INTEGRADA_*` | Sync LI | Manual |
| Flags Vite: `VITE_ENABLE_SEO_CONTEXT`, `VITE_LINK_AUTOLINK_ALL`, `VITE_DEBUG_SEO`, `VITE_SEO_ENHANCER` | feature flags | `.env` |

### 13.2 Links úteis (Supabase)
- SQL Editor: https://supabase.com/dashboard/project/pgfgripuanuwwolmtknn/sql/new
- Edge Functions: https://supabase.com/dashboard/project/pgfgripuanuwwolmtknn/functions
- Logs `publish-git-kinghost`: https://supabase.com/dashboard/project/pgfgripuanuwwolmtknn/functions/publish-git-kinghost/logs
- Logs `rag-chat`: https://supabase.com/dashboard/project/pgfgripuanuwwolmtknn/functions/rag-chat/logs
- Storage: https://supabase.com/dashboard/project/pgfgripuanuwwolmtknn/storage/buckets
- Secrets: https://supabase.com/dashboard/project/pgfgripuanuwwolmtknn/settings/functions

### 13.3 Documentos correlatos (no repo)
- `DOCUMENTACAO_SISTEMA.md`
- `DOCUMENTACAO_TECNICA_COMPLETA.md`
- `AUDITORIA_TECNICA_COMPLETA.md`
- `docs/AUDITORIA_COMPLETA_2026_03_17.md`
- `docs/KNOWLEDGE_BASE_API.md`
- `docs/KNOWLEDGE_BASE_FIELDS_REFERENCE.md`
- `docs/PRODUCT_BLOG_GENERATORS.md`
- `docs/PROMPTS_SYSTEM.md`
- `docs/SPIN_SCHEMA_INTEGRATION.md`
- `docs/OAUTH_ARCHITECTURE_OVERVIEW.md`
- `CLAUDE.md`

### 13.4 Glossário
- **Sistema A**: Supabase canonical (escrita) — `pgfgripuanuwwolmtknn`
- **Sistema B**: Supabase read-only / fonte da verdade técnica (vídeos, docs) — `okeogjgqijbfkudfjadz`
- **RAG**: Retrieval-Augmented Generation (busca semântica + Gemini)
- **Quality Gate v2.0**: pipeline de validação multi-dimensão
- **SPIN**: metodologia Situação/Problema/Implicação/Necessidade aplicada a campanhas
- **Dra. L.I.A.**: persona IA comercial (Lead Intelligent Agent)
- **KB**: Knowledge Base — `knowledge_vectors` + cache 3h
- **E-E-A-T**: Experience, Expertise, Authoritativeness, Trust (Google)
- **Quality Gate v2.0**: validações pós-geração (keywords, coerência clínica, schema, dedup)
- **Knowledge Graph Orchestrator**: agregador das 8 fontes para indexação RAG

---

## 14. Prioridades Recomendadas

| Prioridade | Ação |
|---|---|
| **P0** | Resolver bug do repo GitHub (`publish-git-kinghost`) — bloqueia produção |
| **P0** | Deduplicar `company_profile` (manter 1 linha) + adicionar unique constraint |
| **P1** | Implementar 5 RLS faltantes (audit 2026-04) |
| **P1** | Adicionar coluna `city` em `video_testimonials` (ou remover dependências) |
| **P2** | Decidir destino do Instagram Meta API (configurar credenciais ou descontinuar publicação direta) |
| **P2** | Refatorar edge functions > 2000 linhas |
| **P3** | Investigar **por que não há tráfego** (0 publicações, 0 RAG, 0 jobs) — possivelmente pipeline parado por causa do bug P0 |
| **P3** | Adicionar telemetria de uso por feature para detectar gaps de adoção |

---

_Fim do documento._
