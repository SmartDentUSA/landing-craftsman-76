

# Plano: Documentacao Tecnica Completa do Sistema Smart Dent Content Intelligence Platform

Criar um arquivo `SYSTEM_DOCUMENTATION.md` na raiz do projeto com documentacao tecnica completa cobrindo:

## Estrutura do Documento

1. **Visao Geral da Arquitetura** — Stack (React/Supabase/Cloudflare/Gemini), paginas, rotas, modulos
2. **Repositorio de Produtos** — 150+ campos, scores de completude, importacao CSV/Loja Integrada
3. **Clinical Brain v2.0** — Anti-alucinacao, forbidden/required products, workflow 6 etapas
4. **Geracao de Conteudo Multi-Canal** — Dual-AI Competition (Gemini vs DeepSeek), 12+ geradores (Instagram, TikTok, YouTube, WhatsApp, Blog, E-commerce, Google Ads, SPIN)
5. **SEO/GEO/AI-Readiness** — Schema.org (Product, FAQ, HowTo, VideoObject, LocalBusiness, BreadcrumbList), E-E-A-T, hreflang, geo-context, tracking pixels
6. **Knowledge Base & RAG** — Exportacao multi-formato (json, ai_training, rag, system_b), embeddings (768d Google), match_knowledge_chunks, Dra. L.I.A. chatbot
7. **Publicacao** — Cloudflare Pages, LP Clone, Product Blog, SPIN Landing Pages, dominio customizado
8. **Integracoes Externas** — Loja Integrada (import/export), YouTube OAuth, Google Business, WordPress, FTP
9. **Quality Gate v2.0** — Score 0-100, auto-approve >= 85, evaluate-interaction (LLM-as-Judge)
10. **CRM/Leads** — lia_leads, lia_conversations, lia_messages, lia_lead_events, memoria longitudinal
11. **Checklist de Funcionalidades** — Status real (funcional/parcial/sem funcao) de cada modulo

## Arquivos Afetados

- `SYSTEM_DOCUMENTATION.md` (novo, ~800-1000 linhas)

## Fonte de Dados

Baseado na analise de:
- 90+ edge functions
- 60+ componentes React
- 60+ hooks
- 22 shared modules
- 30+ tabelas Supabase
- Memorias de arquitetura salvas

