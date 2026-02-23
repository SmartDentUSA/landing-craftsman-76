
# Corrigir Renderizacao de Tabelas de Concorrentes na Landing Page SPIN

## Problema
A geracao de Landing Page SPIN processa corretamente 3 tabelas de comparacao de concorrentes (Rayshape, Resina e NanoClean PoD), mas o HTML final renderiza apenas 2 (NanoClean PoD esta ausente). O log da edge function confirma `competitorComparisons: 3`, porem o HTML gerado contem somente 2 blocos `<div style="margin-top: 3rem">`.

## Causa Raiz
Duas fraquezas no pipeline:

1. **Filtro frouxo no `index.ts` (linha 806):** O filtro `.filter((p: any) => p.competitor_comparison)` inclui qualquer produto com o campo preenchido, mesmo com `enabled: false` ou dados parciais. Isso causa inconsistencia entre a contagem logada e os itens que realmente passam a validacao no `generateHTML.ts`.

2. **Ausencia de logging no `generateHTML.ts`:** A funcao IIFE que renderiza as tabelas nao loga quais itens passaram pelo filtro `validComparisons`, dificultando o debug.

3. **Potencial falha silenciosa:** Se o `.map()` falhar para um item especifico (ex: caractere especial no header como `(>90%)` ou `™`), a excecao pode corromper a saida sem mensagem de erro.

## Correcoes

### 1. `supabase/functions/generate-spin-landing-page/index.ts`
- Refinar o filtro de `competitorComparisons` para validar `enabled`, `table_headers.length > 0` e `table_data.length > 0` ja na coleta
- Logar os nomes dos produtos cujas tabelas foram incluidas

### 2. `supabase/functions/generate-spin-landing-page/generateHTML.ts`
- Adicionar logging detalhado: nomes dos produtos que passaram pelo filtro `validComparisons`
- Envolver o `.map()` de cada item em try/catch para evitar que um erro em uma tabela impeca a renderizacao das demais
- Logar erros especificos por produto para facilitar debug

## Secao Tecnica

### Mudanca 1 - index.ts (filtro robusto)
```typescript
// ANTES (linha 805-807):
competitorComparisons: (products || [])
  .filter((p: any) => p.competitor_comparison)
  .map((p: any) => ({ productName: p.name, comparison: p.competitor_comparison })),

// DEPOIS:
competitorComparisons: (products || [])
  .filter((p: any) => 
    p.competitor_comparison?.enabled === true && 
    p.competitor_comparison?.table_headers?.length > 0 && 
    p.competitor_comparison?.table_data?.length > 0
  )
  .map((p: any) => ({ productName: p.name, comparison: p.competitor_comparison })),
```

### Mudanca 2 - generateHTML.ts (try/catch + logging)
```typescript
// Na IIFE das tabelas de comparacao por produto (linha 2685+):
const productComparisons = aiContent?.productComparisonTables || [];
const validComparisons = productComparisons.filter((item: any) => 
  item?.comparison?.enabled && 
  item?.comparison?.table_headers?.length > 0 && 
  item?.comparison?.table_data?.length > 0
);

if (validComparisons.length === 0) return '';

console.log(`[HTML] Tabelas de comparacao validas:`, 
  validComparisons.map((item: any) => item.productName));

return `
<!-- TABELAS DE COMPARACAO POR PRODUTO -->
<div class="container section-padding">
  <section class="comparison-section">
    <h2>Comparativo Detalhado por Produto</h2>
    <p class="subtitle">Veja como cada produto se destaca frente aos concorrentes</p>
    
    ${validComparisons.map((item: any) => {
      try {
        return `
          <div style="margin-top: 3rem;">
            <h3>Comparativo: ${escapeHtml(item.productName)}</h3>
            <!-- ... tabela ... -->
          </div>
        `;
      } catch (err) {
        console.error(`Erro ao renderizar tabela de ${item.productName}:`, err);
        return `<!-- Erro ao renderizar tabela: ${item.productName} -->`;
      }
    }).join('')}
  </section>
</div>
`;
```

### Deploy
- Fazer deploy da edge function `generate-spin-landing-page` apos as alteracoes
- Re-gerar a landing page para validar que as 3 tabelas aparecem
