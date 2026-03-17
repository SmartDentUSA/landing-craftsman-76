

# Por que as avaliações do Google não aparecem na página

## Diagnóstico

Encontrei **dois problemas distintos**:

### Problema 1: Nenhuma review foi aprovada para esta Landing Page

A tabela `raw_reviews` tem **10+ reviews** no banco de dados, mas a tabela `approved_reviews` está **completamente vazia**. O sistema exige que reviews sejam explicitamente aprovadas (vinculadas a uma landing page) antes de aparecerem. Nenhuma review foi aprovada para a LP `#1 - Institucional`.

### Problema 2: Não existe seção visual de reviews no template

O template engine (`src/lib/template-engine.ts`) **não possui uma seção HTML visual** para exibir reviews na página. As reviews só são usadas no **JSON-LD Schema** (dados estruturados invisíveis para SEO), mas não há cards, estrelas ou textos de avaliação renderizados visualmente no HTML da página.

O campo `data.schema.google_reviews` na LP está com `auto_extract: false` e `status: idle` — nunca foi ativado.

## Plano de Correção

### Etapa 1: Aprovar reviews existentes para esta LP (SQL migration)

Inserir as 10 reviews existentes em `approved_reviews` vinculadas à LP `5f7bea68-ae2e-4e6f-a725-61f0c1908bba`.

### Etapa 2: Criar seção visual de reviews no template engine

Adicionar uma nova seção HTML no `src/lib/template-engine.ts` que renderize as reviews visualmente na página, incluindo:

- Cards com nome do autor, nota (estrelas), texto da review
- Layout responsivo (grid 3 colunas desktop, 1 coluna mobile)
- Estilo consistente com o design existente (cores `var(--primary-color)`, fontes do template)
- Dados alimentados pelo campo `data.schema.google_reviews.reviews` ou `data.schema.manual_reviews`

### Etapa 3: Atualizar dados da LP no banco

Atualizar o campo `data->'schema'->'google_reviews'` da LP para incluir as reviews extraídas de `raw_reviews`, com `status: 'synced'`.

### Resultado esperado

Após regenerar a página, uma seção visual "Avaliações de Clientes" aparecerá com as 10 reviews do Google, incluindo estrelas, nomes e textos. O JSON-LD Schema também será populado corretamente para SEO.

