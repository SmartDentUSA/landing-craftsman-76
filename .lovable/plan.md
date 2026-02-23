

# Tabelas de Comparação dos Produtos na SPIN Selling

## Objetivo

Quando o usuario clicar em "Buscar tabelas de comparacao dos produtos selecionados", o sistema vai:
1. Consultar `products_repository` para cada `product_id` selecionado
2. Extrair o campo `competitor_comparison` de cada produto
3. Exibir as tabelas lado a lado no editor, separadas por produto
4. Ao gerar a Landing Page, inserir essas tabelas no HTML final

---

## O que existe hoje

- Cada produto no `products_repository` ja tem campo `competitor_comparison` (JSONB) com `enabled`, `title`, `table_headers`, `table_data`
- O `SpinSolutionEditModal` tem um unico `CompetitorComparisonTable` para a solucao SPIN (dados manuais)
- O `generateHTML.ts` ja renderiza a tabela de comparacao da solucao SPIN
- O `index.ts` ja coleta `competitorComparisons` dos produtos e passa para o contexto de IA, mas NAO renderiza no HTML

---

## Mudancas

### 1. SpinSolutionEditModal.tsx

**Adicionar botao + lista de tabelas dos produtos:**

Logo acima (ou abaixo) do `CompetitorComparisonTable` existente, adicionar:

- Um botao "Buscar Tabelas dos Produtos Selecionados"
- Ao clicar, faz query no Supabase: `SELECT id, name, competitor_comparison FROM products_repository WHERE id IN (product_ids)`
- Filtra apenas os que tem `competitor_comparison.enabled = true` e dados validos
- Renderiza uma lista de Cards com preview de cada tabela (read-only), separadas por nome do produto
- Estado local `productComparisonTables` para guardar os dados buscados

Isso e apenas para **visualizacao** no editor. Os dados continuam vindo dos produtos e nao sao duplicados na solucao SPIN.

### 2. generateHTML.ts

**Adicionar secao de tabelas por produto apos a tabela da solucao:**

Apos a secao existente da tabela de comparacao da solucao (linha ~2673), adicionar um novo bloco que itera sobre `enrichedProductContext.competitorComparisons` (ja disponivel via `aiContent`).

Para cada produto com `comparison.enabled && comparison.table_headers.length > 0`:
- Renderizar um `<h3>` com o nome do produto
- Renderizar a tabela HTML usando os mesmos estilos da tabela existente (`.comparison-section table`)
- Separar cada tabela visualmente com margem

O `enrichedProductContext.competitorComparisons` ja e montado no `index.ts` (linha 805-807) e passado para `generateHTML`. Basta usar esses dados na renderizacao.

### 3. index.ts (generate-spin-landing-page)

Garantir que `enrichedProductContext.competitorComparisons` chegue ao `generateHTML` como parte do `aiContent`. Verificar se ja esta sendo passado -- se nao, adicionar ao objeto que e enviado para `generateHTML()`.

---

## Fluxo Visual no Editor

```text
[Secao: Tabela de Comparacao com Concorrentes]
  - CompetitorComparisonTable (tabela manual da solucao SPIN - ja existe)
  
[NOVO - Botao: "Buscar Tabelas dos Produtos Selecionados"]
  - Ao clicar, carrega dados dos produtos
  - Exibe preview read-only de cada tabela, separada por produto:
    
    Produto: "Atos Resina Composta"
    | Caracteristica | Nossa Solucao | Concorrente A |
    |...             |...            |...            |
    
    Produto: "SmartMake Resina 3D"
    | Caracteristica | Nossa Solucao | Concorrente B |
    |...             |...            |...            |
```

---

## Fluxo na Landing Page Gerada

```text
[Tabela de Comparacao da Solucao SPIN] (ja existe)

[NOVO - Tabelas por Produto]
  <h3>Comparativo: Atos Resina Composta</h3>
  <table>...</table>
  
  <h3>Comparativo: SmartMake Resina 3D</h3>
  <table>...</table>
```

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `src/components/SpinSolutionEditModal.tsx` | Botao de busca + estado + preview read-only das tabelas dos produtos |
| `supabase/functions/generate-spin-landing-page/generateHTML.ts` | Renderizar tabelas por produto usando `competitorComparisons` do contexto |
| `supabase/functions/generate-spin-landing-page/index.ts` | Verificar/garantir que `competitorComparisons` chega ao `generateHTML` |

Nenhuma tabela nova no banco. Nenhuma migracao SQL. Os dados ja existem nos produtos.

