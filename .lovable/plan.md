## Objetivo
Produzir um documento técnico completo listando **todos os dados que o Sistema A expõe a sistemas externos** — útil para parceiros, integradores, equipe de SEO e auditoria.

## Entregáveis (em `/mnt/documents/`)
1. `SmartDent-API-Endpoints-Externos.pdf` — versão formatada para distribuição
2. `SmartDent-API-Endpoints-Externos.md` — fonte editável

## Estrutura do documento (8 seções)

1. **Visão Geral** — Base URLs, autenticação (`verify_jwt=false`), CORS
2. **Endpoints de Conhecimento / Dados Estruturados**
   - `GET /knowledge-base` — params (`format`: json/ai_training/system_b/rag), cache 3h
   - `GET /knowledge-feed` — paginação, formatos json/rss/atom
   - `GET /get-product-data` — por `slug`/`product_id`/`category`
   - `GET /export-product-ai-playbook`
   - `POST /rag-chat` — Dra. L.I.A.
   - `GET|POST /mcp-server` — tools MCP expostos
3. **Endpoints SEO / Discovery**
   - `/generate-sitemap`, `/generate-video-sitemap`, `/generate-robots-txt`, `/generate-merchant-feed`
   - Rewrites `/llms.txt` e `/.well-known/llms.txt`
4. **Endpoints de Sincronização / Ingestão**
   - `/sync-system-b-articles` (modes ingest/full/incremental), `/sync-system-b-documents`, `/debug-systemb-product`, `/refresh-knowledge-base`
5. **Webhooks de Recebimento**
   - `POST /content-submission` (fila assíncrona `content_jobs`)
   - `POST /evaluate-interaction`
6. **Fonte Externa Consumida (Sistema B)** — `data-export?format=ai_ready`
7. **Matriz de Consumidores Conhecidos** (Google, IA crawlers, MCP clients, Loja Integrada, parceiros)
8. **Limites & Boas Práticas** — rate-limit recomendado, paginação, formato de erros

Cada endpoint incluirá: query params (tabela), body (quando POST), exemplo de request, exemplo de response JSON, e referência ao arquivo-fonte em `supabase/functions/`.

## Como será gerado
- Markdown completo já redigido a partir da inspeção real das funções (`supabase/functions/*/index.ts` + `supabase/config.toml`)
- Conversão para PDF via `pandoc` + `xelatex`, fonte Arial, margens 2cm, TOC com 3 níveis

## Não inclui
- Endpoints administrativos autenticados (publicação, geração de conteúdo, OAuth)
- Schemas internos de tabelas do Postgres
- Secrets / chaves de API
