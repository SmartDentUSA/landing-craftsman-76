
# Diagnosticar e Corrigir Tabela NanoClean PoD Ausente

## Diagnostico Atual

Os logs confirmam que todas as 3 tabelas sao renderizadas individualmente com sucesso:
- Rayshape: 1083 chars
- Resina: 1477 chars
- NanoClean PoD: 1820 chars

Porem o HTML final nao contem a tabela NanoClean. A unica parte do codigo que ainda usa template literal para montar a secao de tabelas e o `return` da IIFE (linhas 2748-2757), onde `${renderedTables}` e interpolado.

## Causa Provavel

Apesar de `renderedTables` ser uma string ja resolvida, o `return` da IIFE (linha 2748) ainda usa template literal. Essa string e entao interpolada na template literal PRINCIPAL do `generateHTML`, criando uma cadeia de interpolacao de 3 niveis. Embora isso devesse funcionar em teoria, a evidencia empirica mostra que o conteudo esta sendo perdido nessa cadeia.

## Solucao (2 mudancas)

### 1. `generateHTML.ts` - Eliminar template literal na IIFE (linhas 2748-2757)

Substituir o `return` com template literal por concatenacao de strings:

```typescript
// ANTES (linha 2748-2757):
return `
  <!-- TABELAS DE COMPARACAO POR PRODUTO -->
  <div class="container section-padding">
    <section class="comparison-section">
      ...
      ${renderedTables}
    </section>
  </div>
`;

// DEPOIS:
const sectionHtml = [
  '<!-- TABELAS DE COMPARACAO POR PRODUTO -->',
  '<div class="container section-padding">',
  '  <section class="comparison-section">',
  '    <h2>Comparativo Detalhado por Produto</h2>',
  '    <p class="subtitle">...</p>',
  renderedTables,
  '  </section>',
  '</div>'
].join('\n');

console.log('[HTML] Secao completa de tabelas por produto: ' + sectionHtml.length + ' chars');
return sectionHtml;
```

### 2. `index.ts` - Adicionar log diagnostico antes do upload (apos linha 1003)

Adicionar verificacao especifica para confirmar se todas as tabelas estao no HTML final:

```typescript
// Verificacao diagnostica
const compTableCount = (html.match(/Comparativo:/g) || []).length;
console.log('[DIAG] Tabelas "Comparativo:" encontradas no HTML final:', compTableCount);
```

### Deploy
- Fazer deploy da edge function `generate-spin-landing-page`
- Re-gerar a landing page
- Verificar nos logs se `compTableCount` e 3

Se o log mostrar 3 mas o HTML baixado tiver 2, o problema esta no Storage upload. Se mostrar 2, o problema esta na interpolacao da IIFE no template principal.
