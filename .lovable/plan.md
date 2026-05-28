# Plano: Documento de Auditoria Completa do Sistema

Vou produzir um único arquivo `AUDITORIA_SISTEMA_COMPLETA.md` (em `/mnt/documents/` e também salvo no repo na raiz) consolidando tudo o que existe hoje no sistema SmartDent / landing-craftsman-76, em nível de auditoria técnica e funcional.

## Escopo do documento

1. **Visão geral do produto**
   - Propósito (gestão de conteúdo, landing pages, blogs, SEO, IA comercial, integrações com Loja Integrada / Google / Cloudflare / KingHost / Sistema B)
   - Stack: React 18 + Vite + TS + Tailwind + shadcn, Supabase (Sistema A `pgfgripuanuwwolmtknn`), Sistema B read-only (`okeogjgqijbfkudfjadz`), Lovable AI Gateway (Gemini 2.5 Flash)
   - Mapa de domínios publicados (smartdent.com.br etc.) e ambientes (preview/published)

2. **Arquitetura Front-end**
   - Estrutura `src/` (pages, components, hooks, contexts, services, lib)
   - Roteamento (`App.tsx`), Auth (`useAuthReady`), ProtectedRoute, CategoryContext (gating)
   - Padrões: context-safe hooks com fallback, useRef nos dashboards, auto-save protection, undo/redo
   - Design system (`index.css`, `tailwind.config.ts`, tokens HSL semânticos)
   - UI/UX: editores (Landing Page, Blog, Carousel), dashboards (RAG, NPS, publicações), Repository, fluxos de publicação

3. **Arquitetura Back-end (Supabase Edge Functions)**
   - Inventário completo das ~120 funções em `supabase/functions/` agrupadas por domínio:
     - Geração de conteúdo (`generate-*`, `strategic-blog-generator`, `ai-content-generator`)
     - SPIN Selling (`generate-spin-*`)
     - Publicação (`publish-cloudflare-pages`, `publish-ftp-pages`, `publish-git-kinghost`, `publish-static-file`, `unpublish-pages`, `republish-*`)
     - Integrações (`import-loja-integrada-api`, `update-loja-integrada-product`, `sync-system-b-*`, `extract-google-reviews`, `extract-youtube-captions`, OAuth)
     - RAG / KB (`rag-chat`, `index-knowledge-base`, `refresh-knowledge-base`, `knowledge-feed`, `knowledge-base`, `generate-clinical-brain`)
     - Mídia (`generate-instagram-carousel`, `generate-carousel-slide/hook`, `generate-display-banners`, `generate-tiktok-content`, `generate-youtube-script`, `generate-instagram-reels-script`)
     - Operacionais (`process-job-queue`, `content-submission`, `process-content-submission`, `evaluate-interaction`, `wikidata-sync`, `mcp-server`)
   - Padrões obrigatórios: `Deno.serve`, limite 2500 linhas, `_shared/tracking-injector.ts`, `_shared/seo-fine-tuning.ts`, `_shared/video-schema-helper.ts`, `_shared/ai-gateway.ts`
   - `verify_jwt` por função (extraído de `supabase/config.toml`)

4. **Modelo de Dados (Sistema A)**
   - Tabelas principais por domínio: `company_profile` (1 registro), `products_repository` (sem `select(*)`, usar `active`), `landing_pages`, `generated_pages`, `page_publications`, `content_submissions`, `content_jobs`, `knowledge_vectors`, `lia_conversations`, `lia_messages`, `lia_leads`, `lia_attendances`, `ai_token_usage`, `user_roles`, `authors`, `approved_reviews`, `company_milestones`, campanhas/whatsapp templates
   - RLS e `has_role` (security definer)
   - Triggers `updated_at`, cache `pg_cron` (3h) para KB

5. **Sistema B (read-only)**
   - O que é (`okeogjgqijbfkudfjadz`), imutabilidade, fontes: `data-export?format=ai_ready`, vídeos de produtos/resinas, documentos técnicos, autores
   - Como é consumido pelos geradores (ex.: `systemBIntegration.ts`)

6. **IA & RAG — Inteligência de Dados**
   - Gateway: Lovable AI (`google/gemini-2.5-flash`), monitoramento via `ai_token_usage`
   - Pipeline Dual-AI (Gemini vs DeepSeek) e Quality Gate v2.0
   - Clinical Brain v2 (regras imutáveis Bio Vitality / Vitality)
   - RAG:
     - Origem dos chunks: KB exportada (System A canonical) + Sistema B (vídeos, docs, produtos, resinas) + `company_profile` + milestones + autores + reviews
     - Embeddings `gemini-embedding-001`, dedup SHA256
     - Indexação: `index-knowledge-base` -> `knowledge_vectors`
     - Recuperação: `rag-chat` (busca semântica + filtro por contexto + injeção de schema)
     - Quality scoring, hallucination flag, métricas em `useRAGMetrics`
   - SEO Enhancer pós-processamento, Knowledge Graph Orchestrator (8 tabelas)
   - Auto-link, intelligent-links, schema consolidator, JSON-LD único `@graph`

7. **Fluxos de criação de conteúdo (end-to-end)**
   - Blog de produto: input → `generate-product-blog` → Quality Gate → `generated_pages` → publicação (Cloudflare/FTP/Git/LI)
   - Landing Page: editor → `save-landing-page` → preview → publish dialog (parity) → multi-destino
   - SPIN Campaign: hub `generate-spin-campaign` orquestrando landing/journey/pitch/metrics/hero/faqs + apostila
   - Instagram Carousel: hook → slides → exportação ZIP (Canvas+MediaRecorder, Promise.race)
   - Display banners, YouTube script, Reels, TikTok
   - Async Job Queue (`content_jobs` FIFO + locks distribuídos) — `process-job-queue`
   - Content ingestion + versionamento (`content-submission` → `process-content-submission`)

8. **Publicação Multi-Destino**
   - Cloudflare Pages, FTP (KingHost), Git KingHost (REST atômico), Loja Integrada (polling 800ms, `since_atualizado`)
   - Upsert dedup, histórico (`page_publications`), rollback, unpublish (limpa `nav-data.js`)
   - Domain Publishing UI, republish bulk
   - Site-wide navigation, social links, Open Graph

9. **Integrações externas**
   - Google: Business Profile (reviews), YouTube (captions/metadata), GSC (sitemaps), OAuth shared utility
   - Loja Integrada: import/update produto, variações → pai, circuit breaker
   - Wikidata: sync v4, QID Q138636902 (sameAs)
   - Cloudflare Direct Upload, FTP test, WordPress test
   - GTM-NZ64Q899 (bloqueia GTM-MNPGDCH)
   - MCP server, Meta Instagram (gap: credenciais ausentes)

10. **SEO / Semântica**
    - Standard v2026: LCP, `@graph` único, `<main>`/`<article class="indexable-content">`
    - Schemas: Service, MedicalEntity, Product, Event, Organization, VideoObject, DigitalDocument, FAQ, Review
    - Sitemaps, robots, video-sitemap, llms.txt
    - E-E-A-T: autores em `src/data/authors.ts`

11. **UI/UX por área**
    - Dashboard (publicações, datas via `updated_at` trigger)
    - RAG Metrics Dashboard
    - Repository (produtos)
    - Editores (Landing Page rendering rules, Google Reviews visibility, Resources 2-col, Product CTA mapping IFU/FDS)
    - Carousel UI (overlays, object-fit, slide 6 CTA layout)

12. **Segurança**
    - Roles em tabela separada + `has_role`
    - Auditoria 2026-04: 5 RLS faltando (referenciar)
    - Secrets (`GITHUB_PAT_DEPLOY`, `LOVABLE_API_KEY`, Google OAuth, FTP, Cloudflare)
    - Token GitHub `SmartDentUSA`

13. **Gaps, bugs e falhas recorrentes**
    - Publish Git KingHost: repo `SmartDentUSA/landing-craftsman-76` retornando 404 (pendente correção owner/repo)
    - Instagram Meta API: credenciais ausentes
    - Video testimonials: coluna `city` ausente
    - 5 RLS faltando (audit 2026-04)
    - Timeouts em `products_repository` quando `select('*')`
    - PGRST116 se `company_profile` ≠ 1 registro
    - Naming `active` vs `is_active` (constraint)
    - Edge Functions perto do limite 2500 linhas
    - Histórico de erros: Loja Integrada parsing manual, KB cache 3h, fallback de roles, context sem Provider

14. **Apêndices**
    - Tabela completa de Edge Functions × propósito × `verify_jwt`
    - Mapa de variáveis de ambiente / secrets
    - Links úteis (Supabase dashboard, logs, SQL editor)
    - Glossário (Sistema A, Sistema B, RAG, Quality Gate, SPIN, KB)

## Metodologia

- Reler `mem://index.md` e os arquivos de memória citados acima para garantir fidelidade às regras já consolidadas
- Listar `supabase/functions/` e `src/` para inventário factual
- Consultar `supabase--read_query` para contagens reais (tabelas, registros em `knowledge_vectors`, `content_submissions`, `page_publications`, `ai_token_usage`) e incluir snapshot
- Reaproveitar `DOCUMENTACAO_SISTEMA.md`, `DOCUMENTACAO_TECNICA_COMPLETA.md`, `AUDITORIA_TECNICA_COMPLETA.md`, `docs/AUDITORIA_COMPLETA_2026_03_17.md` como fontes — citar e atualizar, não duplicar cegamente
- Marcar claramente: ✅ implementado, ⚠️ parcial, ❌ gap/bug

## Entregáveis

- `AUDITORIA_SISTEMA_COMPLETA.md` na raiz do repositório (versão viva, versionada com o código)
- Cópia em `/mnt/documents/AUDITORIA_SISTEMA_COMPLETA.md` como artefato baixável
- Sem alterações de código de runtime

## Confirmação rápida

Antes de gerar, confirme:
1. Quer **um único MD** consolidado (~3000-6000 linhas) ou **prefere dividido** em vários arquivos por domínio em `docs/auditoria/`?
2. Devo incluir **snapshot de dados reais** do Supabase (contagens, últimas publicações, custos IA 24h) ou manter só estrutural?
3. Idioma: **PT-BR** integral (incluindo títulos), correto?
