
# Corrigir Tabela NanoClean PoD Ausente na Landing Page SPIN

## Diagnostico

Apesar dos logs confirmarem que 3 tabelas sao identificadas e processadas (Rayshape, Resina, NanoClean PoD), o HTML final contem apenas 2. O `try/catch` adicionado na correcao anterior nao registrou nenhum erro, indicando que a falha ocorre silenciosamente dentro da avaliacao do template literal.

**Causa provavel:** O template literal aninhado (`.map()` dentro de `.map()` dentro de template literal) pode falhar silenciosamente no Deno quando os dados contem caracteres especiais como `™`, `®`, ou parenteses desbalanceados nos headers longos do NanoClean PoD. Isso ocorre porque o erro pode ser engolido pelo JavaScript engine durante a interpolacao de strings.

**Evidencia:** O HTML gerado (1,495,120 chars) vs HTML recuperado do Storage (1,488,877 chars) mostra uma diferenca de ~6KB - exatamente o tamanho estimado de uma tabela de comparacao com 8 linhas e 4 colunas.

## Solucao

Reescrever a renderizacao de tabelas para usar concatenacao explicita de strings em vez de template literals aninhados, e adicionar logging granular por produto.

## Secao Tecnica

### Arquivo: `supabase/functions/generate-spin-landing-page/generateHTML.ts`

**Mudanca no bloco de renderizacao (linhas 2699-2737):**

Substituir o template literal aninhado por construcao imperativa de strings:

```typescript
const renderedTables = validComparisons.map((item: any, idx: number) => {
  try {
    console.log(`📊 [HTML] Renderizando tabela ${idx + 1}/${validComparisons.length}: ${item.productName}`);
    
    // Construir headers
    const headerCells = (item.comparison.table_headers || []).map((header: string) => {
      return '<th>' + escapeHtml(String(header || '')) + '</th>';
    }).join('');
    
    // Construir linhas do body
    const bodyRows = (item.comparison.table_data || []).map((row: any, rowIdx: number) => {
      const cells = (item.comparison.table_headers || []).map((header: string) => {
        const cellValue = row[header];
        const displayValue = (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '')
          ? String(cellValue)
          : '-';
        return '<td>' + escapeHtml(displayValue) + '</td>';
      }).join('');
      return '<tr>' + cells + '</tr>';
    }).join('\n');
    
    // Construir subtitulo
    const subtitleHtml = item.comparison.subtitle 
      ? '<p style="color: var(--muted); margin-bottom: 1.5rem;">' + escapeHtml(String(item.comparison.subtitle)) + '</p>'
      : '';
    
    const tableHtml = [
      '<div style="margin-top: 3rem;">',
      '  <h3 style="font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 1rem;">',
      '    Comparativo: ' + escapeHtml(String(item.productName || '')),
      '  </h3>',
      subtitleHtml,
      '  <div class="desktop-table">',
      '    <table>',
      '      <thead><tr>' + headerCells + '</tr></thead>',
      '      <tbody>' + bodyRows + '</tbody>',
      '    </table>',
      '  </div>',
      '</div>'
    ].join('\n');
    
    console.log(`✅ [HTML] Tabela ${item.productName} renderizada: ${tableHtml.length} chars`);
    return tableHtml;
  } catch (err) {
    console.error(`❌ [HTML] ERRO ao renderizar tabela ${idx + 1} (${item.productName}):`, String(err));
    return '<!-- Erro ao renderizar tabela: ' + String(item.productName || 'desconhecido') + ' -->';
  }
}).join('\n');
```

### Mudancas chave:
1. **String concatenation** em vez de template literals aninhados - evita problemas com caracteres especiais do Deno
2. **`String()` defensivo** em todos os valores antes de passar para `escapeHtml`
3. **Logging por produto** - cada tabela loga inicio e fim com tamanho, facilitando debug
4. **`.join('\n')` entre tabelas** - separa com newline para evitar problemas de concatenacao

### Deploy
- Fazer deploy da edge function `generate-spin-landing-page` apos as alteracoes
- Re-gerar a landing page e verificar nos logs se as 3 tabelas sao renderizadas com seus tamanhos
