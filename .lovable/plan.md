

## Plano: Gerar Documento de Auditoria Completa do Sistema (.MD)

### Objetivo
Gerar um documento Markdown completo e detalhado em `/mnt/documents/` contendo a auditoria profunda de todo o sistema Smart Dent Content Intelligence Platform.

### Estrutura do Documento

O arquivo `AUDITORIA_SISTEMA_COMPLETA.md` contera as seguintes secoes:

**1. Visao Geral da Arquitetura**
- Stack tecnologico (React 18, Vite 5, Tailwind CSS, TypeScript, Supabase)
- Projeto Supabase ref: pgfgripuanuwwolmtknn
- 62 tabelas, 91+ Edge Functions, 4 Storage Buckets, 111 RLS Policies
- Separacao Sistema A (Knowledge Brain) vs Sistema B (Marketing/Revenue)

**2. Banco de Dados — 62 Tabelas Detalhadas**
- Cada tabela com: nome, RLS status, todas as colunas com tipos/defaults
- Agrupamento por dominio: Empresa, Produtos, Landing Pages, Blog, Videos, Reviews, L.I.A., SEO, Wikidata, Analytics, Content Pipeline, OAuth, Calendar

**3. Seguranca — 111 Politicas RLS**
- Cada politica com tabela, comando, condicao USING/WITH CHECK
- Funcao `has_role` (SECURITY DEFINER) documentada
- 4 Storage Buckets com 16 politicas de objetos

**4. Edge Functions — 91+ Funcoes**
- Cada funcao com: nome, verify_jwt, descricao funcional, integracao com IA
- Agrupamento: Geracao de Conteudo, SEO, Publicacao, Integracao APIs, OAuth, Dados, Wikidata, Videos, RAG/Knowledge Base

**5. Integracao com IA**
- Gateway: `ai.gateway.lovable.dev` com modelo `google/gemini-2.5-flash`
- Clinical Brain v2.0 (anti-alucinacao, 8 regras obrigatorias)
- Dual-AI Competition (Gemini vs DeepSeek)
- Quality Gate v2.0 (scoring 0-100)
- Monitoramento de tokens via `ai_token_usage`
- Modulos compartilhados: `clinical-brain-guard.ts`, `prompt-templates.ts`, `master-system-prompt.ts`

**6. Frontend — Paginas e Componentes**
- 18 paginas (rotas com protecao de acesso)
- 120+ componentes organizados por funcao
- 60+ hooks customizados
- Servicos SEO (13 modulos)

**7. Ferramentas de Conteudo**
- Instagram Carousel (Tecnico 7 slides + Engajamento 6 slides)
- Blog Generator (Consolidado, Estrategico, Individual por produto)
- WhatsApp Message/Sequence/Promo Generator
- TikTok Content Generator
- YouTube Description/Script Generator
- Google Ads (Display Banners 16 formatos + Ad Copies + CSV Export)
- SPIN Selling (Campaign, FAQ, Journey, Metrics, Hero Banner, Landing Page)
- E-commerce HTML Generator
- Landing Page Clone
- Knowledge Feed

**8. Integracoes Externas**
- Google Business Profile (Reviews, Posts)
- YouTube (OAuth, Metadata, Captions, Upload)
- Loja Integrada (API v1, polling, sincronizacao)
- Cloudflare Pages (publicacao)
- FTP Publishing
- Git Deploy (KingHost via GitHub API)
- WordPress (teste de conexao)
- Wikidata (OAuth 1.0a, sincronizacao de entidades)
- Sistema B (sincronizacao de documentos)

**9. SEO e Publicacao Semantica**
- Cabeçalho SEO centralizado (`seo-fine-tuning.ts`)
- Knowledge Graph Orchestrator (`fetchKnowledgeGraph.ts`)
- Schema.org (JSON-LD @graph unificado)
- Programmatic SEO (variações de URL indexaveis)
- Auto-linking inteligente
- Sitemap/Robots.txt/Video Sitemap dinamicos
- Tracking pixels (GTM, Meta, TikTok, GA4)

**10. Sistema Dra. L.I.A. (Chatbot RAG)**
- Memoria Longitudinal (leads, conversations, messages, events)
- RAG com Knowledge Base vetorial (`knowledge_vectors`)
- Validacao LLM-as-Judge (`evaluate-interaction`)
- Lead scoring e perfil sumarizado

**11. Pipeline Autonomo de Conteudo**
- Content Submissions (Sistema B → Sistema A)
- Content Jobs (fila com retry)
- Pipeline Audit Logs
- Process Job Queue

**12. Monitoramento e Observabilidade**
- AI Token Dashboard
- System Monitoring Dashboard
- RAG Metrics Dashboard
- Content Quality Dashboard
- Pipeline Audit Viewer

### Execucao
- Script Python que gera o .MD completo em `/mnt/documents/AUDITORIA_SISTEMA_COMPLETA.md`
- Documento estimado: ~2000-3000 linhas

