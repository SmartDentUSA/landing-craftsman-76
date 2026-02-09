
# Plano: Corrigir dados da tabela "Comparativo Scanners Intraorais"

## Diagnostico

A landing page "Comparativo Scanners intraorais" tem:
- **6 headers corretos**: Caracteristica, Medit i600, Medit i700, Medit i700 Wireless, BLZ Ino200, Medit i900
- **194 linhas vazias** (`{}`): resquicios de uma importacao anterior que ocorreu ANTES da correcao de persistencia (deploy anterior)
- **Ultimo save no DB**: 11:57:08 — a importacao do PDF foi as 12:04:28, ou seja, o save nao chegou ao banco

A correcao anterior (adicionar `saveDesktopInfo` no `onApplyTable`) ja esta no codigo, porem o usuario importou o PDF antes do deploy da correcao. Alem disso, o `saveDesktopInfo` usa debounce de 1500ms e guardas de hidratacao que podem causar perda de dados em cenarios de navegacao rapida.

## Correcoes

### 1. Tornar o save da importacao PDF mais robusto (`src/pages/Editor.tsx`, ~linhas 5023-5040)

Substituir o `saveDesktopInfo(updatedData)` (debounced, com guardas) por uma chamada direta ao `updateLandingPage` no callback `onApplyTable`. Isso garante persistencia imediata sem depender de debounce ou guardas de hidratacao:

```typescript
onApplyTable={(tableTitle, tableHeaders, tableData) => {
  const updatedDesktopInfo = {
    ...(data.desktop_info || {}),
    show_table: true,
    table_title: tableTitle,
    table_headers: tableHeaders,
    table_data: tableData,
    visible_desktop: true,
  };
  const updatedData = {
    ...data,
    desktop_info: updatedDesktopInfo,
  };
  setData(updatedData);
  dirtyRef.current = true;

  // Save direto (sem debounce) para garantir persistencia imediata
  if (id) {
    updateLandingPage(id, { data: { desktop_info: updatedDesktopInfo } })
      .then((ok) => {
        if (ok) console.log('Tabela importada salva com sucesso');
        else console.warn('Falha ao salvar tabela importada');
      });
  }
}}
```

### 2. Limpar dados obsoletos no banco

Os 194 objetos vazios precisam ser substituidos. Ao re-importar o PDF com a correcao acima, os 31 registros corretos substituirao automaticamente os 194 vazios via deepMerge (arrays nao-vazios substituem arrays existentes).

## Impacto

- A importacao de tabela do PDF tera persistencia imediata e garantida
- Sem dependencia de debounce (1500ms) ou guardas de hidratacao
- O usuario precisara re-importar o PDF uma vez para substituir os dados vazios
- Nenhuma alteracao no frontend visual — apenas na logica de persistencia
