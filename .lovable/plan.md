# Adicionar 4 marcos da linha ChairSide Print

Inserir na linha do tempo da empresa (tabela `company_milestones`) os quatro marcos enviados, publicados e prontos para aparecer no site, no Schema.org (Event/ItemList) e na exportação da Base de Conhecimento para IAs.

## Marcos a inserir

| Ano | Título |
|-----|--------|
| 2023 | ChairSide Print — Inédito no mundo |
| 2024 | ChairSide Print 4.0 com Elegoo Mars 4 |
| 2025 | ChairSide Print 4.0 com Elegoo Mars 5 Ultra |
| 2026 | ChairSide Print A.I. Pro |

Cada marco recebe o texto integral enviado, mapeado nos campos existentes:
- Resumo → descrição
- Contexto de Mercado → contexto de mercado
- Decisão Estratégica → decisão estratégica
- Impacto → impacto
- Legado Atual → legado
- Dados Técnicos → anexados ao final da descrição
- Produtos Envolvidos / Tecnologias / Certificações → listas estruturadas

Local padrão: São Carlos, SP, Brasil. Todos publicados.

## Detalhes técnicos

- Migração SQL de `INSERT` em `public.company_milestones`, usando o `user_id` já presente nos marcos existentes (`2dc85508-...`), sem alterar schema nem políticas.
- `slug` no padrão atual `ano-titulo-normalizado` (ex.: `2026-chairside-print-a-i-pro`), com `ON CONFLICT` seguro para evitar duplicidade em nova execução.
- `products_involved`, `technologies`, `certifications` gravados como arrays JSONB (formato já consumido por `milestone-schema-helper.ts` e pelo export `refresh-knowledge-base`).
- Após inserir, disparar `refresh-knowledge-base` para que os novos marcos entrem no cache RAG/JSON da Base de Conhecimento.
- Nenhuma alteração de UI necessária: a listagem e o gerador de Schema.org já leem a tabela.
