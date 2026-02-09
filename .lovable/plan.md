
# Plano: Corrigir persistencia dos dados da tabela importada do PDF

## Diagnostico

A investigacao revelou que:

1. **A edge function funciona corretamente** - Os logs mostram 31 linhas convertidas com dados reais (ex: `"Caracteristica": "Categoria"`, `"Medit i600": "Intermediario"`)
2. **O banco de dados tem 194 objetos vazios** (`map[]`) - Estes sao resquicios de uma importacao anterior (antes da correcao do schema)
3. **O callback `onApplyTable` nao salva no banco** - Ele apenas atualiza o estado em memoria (`setData`) e marca `dirtyRef.current = true`, mas NAO chama `saveDesktopInfo()` para persistir

Resultado: o usuario ve os dados corretos no preview do importador, clica "Aplicar", os dados entram em memoria, mas ao recarregar a pagina os dados antigos (194 linhas vazias) voltam do banco.

## Correcao

### Arquivo: `src/pages/Editor.tsx` (linhas 5023-5036)

Adicionar chamada a `saveDesktopInfo` apos `setData` no callback `onApplyTable`, seguindo o mesmo padrao usado em todas as outras interacoes do Desktop Info:

```
onApplyTable={(tableTitle, tableHeaders, tableData) => {
  const updatedData = {
    ...data,           // usa 'data' atual (nao prev)
    desktop_info: {
      ...(data.desktop_info || {}),
      show_table: true,
      table_title: tableTitle,
      table_headers: tableHeaders,
      table_data: tableData,
      visible_desktop: true,
    },
  };
  setData(updatedData);
  saveDesktopInfo(updatedData);   // <-- ADICIONAR: persiste no banco
  dirtyRef.current = true;
}}
```

Nota: Usar `data` em vez de `setData(prev => ...)` aqui segue o padrao consistente de todas as outras chamadas `saveDesktopInfo` no arquivo (linhas 4152, 4181, 4200, 4216, 4235, 4253, etc.)

### Impacto

- Os dados da tabela serao salvos automaticamente apos aplicar a importacao do PDF
- Os 194 objetos vazios serao substituidos pelos 31 registros corretos
- O padrao fica consistente com todos os outros pontos de edicao do Desktop Info
