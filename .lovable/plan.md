

# Plano: Corrigir PDF Importer - Textos nao aplicados + Tabelas duplicadas

## Diagnostico

Foram identificadas **2 causas raiz** distintas:

### Bug 1: Textos e tabela nao populados nos campos do editor

**Causa raiz: Race condition no `setData`**

No `PDFContentImporter.tsx`, o metodo `handleApplySuggestions` (linha 168) chama duas callbacks em sequencia:

```text
1. onApplySuggestions(toApply)   --> setData(prev => {...})   [forma funcional - OK]
2. onApplyTable(title, headers, rows)  --> setData({...data...})  [usa "data" do closure - BUG]
```

O problema esta no `onApplyTable` dentro de `Editor.tsx` (linha 5018-5031):

```text
onApplyTable={(tableTitle, tableHeaders, tableData) => {
  const updatedData = {
    ...data,        // <-- USA "data" ANTIGO do closure!
    desktop_info: { ... }
  };
  setData(updatedData);   // <-- SOBRESCREVE as sugestoes de texto!
}}
```

Quando `onApplyTable` executa, `data` ainda referencia o estado ANTERIOR (antes das sugestoes de texto serem aplicadas). Como `setData(updatedData)` nao usa a forma funcional (`prev =>`), ele sobrescreve o estado com os dados antigos + tabela, eliminando todas as sugestoes de texto que `onApplySuggestions` acabou de definir.

**Resultado:** Apenas a tabela seria aplicada (mas tambem nao persiste porque `debouncedDesktopSave` recebe dados stale), e os textos sao perdidos.

### Bug 2: IA retornou 3 tabelas quando o PDF tem apenas 1

O PDF "Tabela Comparativa -- Scanners Intraorais" contem **UMA unica tabela comparativa** que se estende por 3 paginas:

- **Pagina 1:** Especificacoes de hardware (Conectividade, Velocidade, Peso...)
- **Pagina 2:** Recursos de software (Smart Scan, Workflows, Linha de termino...)
- **Pagina 3:** IA clinica e precos (Workflows clinicos, Preco ponteira, Preco cabo...)

Todas as paginas comparam os **mesmos 5 scanners** (Medit i600, i700, i700 Wireless, BLZ Ino200, Medit i900). A IA interpretou cada pagina como uma tabela separada porque:

1. O prompt diz "Se houver multiplas tabelas, retorne TODAS no array extracted_tables"
2. Cada pagina tem um sub-titulo diferente ("Software base", "Relatorios clinicos inteligentes")
3. Nao ha instrucao para consolidar tabelas que comparam os mesmos itens

---

## Correcoes

### Correcao 1: Eliminar race condition no Editor.tsx

**Arquivo:** `src/pages/Editor.tsx` (linhas 5018-5031)

Mudar `onApplyTable` para usar a forma funcional do `setData` (com `prev`), eliminando a dependencia do `data` stale do closure. Remover `debouncedDesktopSave` pois o usuario ira clicar "Salvar" para persistir tudo junto.

**De:**
```text
onApplyTable={(tableTitle, tableHeaders, tableData) => {
  const updatedData = {
    ...data,                    // <-- STALE!
    desktop_info: {
      ...data.desktop_info,     // <-- STALE!
      show_table: true,
      table_title: tableTitle,
      table_headers: tableHeaders,
      table_data: tableData,
      visible_desktop: true,
    },
  };
  setData(updatedData);
  debouncedDesktopSave(updatedData);
}}
```

**Para:**
```text
onApplyTable={(tableTitle, tableHeaders, tableData) => {
  setData(prev => ({
    ...prev,
    desktop_info: {
      ...prev.desktop_info,
      show_table: true,
      table_title: tableTitle,
      table_headers: tableHeaders,
      table_data: tableData,
      visible_desktop: true,
    },
  }));
  dirtyRef.current = true;
}}
```

### Correcao 2: Consolidar tabelas no prompt da IA

**Arquivo:** `supabase/functions/transcribe-landing-page-pdf/index.ts` (linhas 67-85)

Adicionar regra explicita no SYSTEM_PROMPT para consolidar tabelas que comparam os mesmos itens em paginas diferentes:

**Adicionar ao SYSTEM_PROMPT (secao REGRAS CRITICAS PARA TABELAS):**

```text
- REGRA DE CONSOLIDACAO: Se o documento contiver secoes em paginas diferentes que
  comparam os MESMOS itens/produtos/colunas (ex: mesmos scanners, mesmas marcas),
  consolide TODAS as linhas em UMA UNICA tabela. Use os nomes das colunas da
  primeira ocorrencia como cabecalho padrao
- Sub-titulos de paginas diferentes (ex: "Software base", "Relatorios clinicos")
  devem virar linhas separadoras ou categorias dentro da mesma tabela, NAO tabelas
  separadas
- Ao consolidar, adicione uma linha com o sub-titulo da secao como separador
  (ex: {"Caracteristica": "--- Software ---", ...colunas vazias})
```

### Correcao 3: Garantir persistencia apos aplicar sugestoes

**Arquivo:** `src/components/editor/PDFContentImporter.tsx` (linhas 168-190)

Atualmente, `handleApplySuggestions` chama `onApplySuggestions` e `onApplyTable` em sequencia. Para garantir que as duas atualizacoes de estado sejam processadas corretamente, inverter a ordem (primeiro tabela com forma funcional, depois textos com forma funcional) e acionar o save manual.

Na verdade, com a Correcao 1 ja aplicada (ambos usando `setData(prev => ...)`), a ordem nao importa pois o React batcha ambas as chamadas corretamente. Nao e necessaria alteracao aqui.

---

## Resumo de Arquivos

| Arquivo | Linhas | Correcao |
|---------|--------|----------|
| `src/pages/Editor.tsx` | 5018-5031 | Usar `setData(prev => ...)` em vez de `setData({...data})` no onApplyTable |
| `supabase/functions/transcribe-landing-page-pdf/index.ts` | 67-85 | Adicionar regras de consolidacao de tabelas ao prompt |

## Resultado Esperado

- **Textos**: Ao clicar "Aplicar Selecionados", todos os campos selecionados (SEO, Banner, Advisory, CTA, Desktop Info) serao populados corretamente no editor
- **Tabela**: A tabela sera aplicada em "Informacoes Desktop > Mostrar Tabela" sem sobrescrever os textos
- **PDF com 1 tabela em varias paginas**: A IA consolidara em uma unica tabela com todos os dados fielmente preservados
- **Persistencia**: `dirtyRef.current = true` garante que o usuario veja que ha alteracoes pendentes para salvar

