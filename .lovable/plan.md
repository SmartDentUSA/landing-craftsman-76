

# Plano: Criar SYSTEM_DOCUMENTATION.md

## Arquivo a criar

**`SYSTEM_DOCUMENTATION.md`** — Documentação completa do sistema com ~800 linhas cobrindo:

1. **Visão Geral** — Propósito, arquitetura de 3 camadas (Sistema B → Sistema A → Consumidores)
2. **Módulos do Sistema** — 12 rotas frontend, 15 abas do Repositório Central
3. **Banco de Dados** — 15+ tabelas detalhadas, incluindo estrutura completa do company_profile (10 abas, 50+ campos)
4. **Edge Functions** — Inventário completo das 80+ funções organizadas em 8 categorias:
   - 5 Geradores de HTML + 25 shared helpers
   - 15+ Geradores de Conteúdo IA
   - 6 SPIN Selling Suite
   - 7 APIs Externas / Knowledge Base
   - 8 Importação e Sincronização
   - 15+ Processamento e Utilidades
   - 5 Publicação
   - 8 OAuth e Conexões
5. **Clinical Brain v2.0** — Anti-alucinação, workflow 6 etapas, regras de compatibilidade
6. **Dual-AI Competition** — Gemini vs DeepSeek, 5 critérios de avaliação, tracking
7. **Knowledge Graph** — `fetchKnowledgeGraph.ts`, `buildProductGraph`, `buildBlogGraph`
8. **Knowledge System** — Entity metas, AI Crawler Policy, Citation Blocks, Wikidata linking
9. **Integração Sistema B** — Endpoints, payload, fluxo bidirecional
10. **APIs Externas** — Knowledge Base (4 formatos), RAG Chat, Merchant Feed, Sitemaps
11. **Schema.org** — 16 tipos implementados com helpers dedicados
12. **SEO/GEO/AI** — Feature flags, domain config, auto-linking
13. **Publicação** — Cloudflare, WordPress, Merchant, 5 formatos de exportação
14. **Hooks React** — 60+ hooks em 3 categorias (dados, geração, utilidade)
15. **Segurança** — Auth, RLS, roles, OAuth, JWT verification
16. **Tracking** — AI usage, pixels (GTM/GA4/Meta/TikTok), quality dashboard
17. **Dependências** — 17 bibliotecas principais documentadas
18. **Fluxos** — 4 fluxos detalhados (produto, HTML, RAG, sync Sistema B)

## Implementação

Arquivo único `SYSTEM_DOCUMENTATION.md` na raiz do projeto. Aproximadamente 800 linhas de Markdown estruturado com tabelas, diagramas ASCII e blocos de código TypeScript.

