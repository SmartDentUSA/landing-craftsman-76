

# Importacao CSV para Tabela de Concorrentes

## Objetivo
Adicionar funcionalidade de importacao e exportacao CSV na tabela de comparacao com concorrentes (`CompetitorComparisonTable`), seguindo o mesmo padrao ja existente na importacao de especificacoes tecnicas (`ProductTechnicalSpecsModal`).

## O que sera feito

### 1. Adicionar botoes de Import/Export CSV ao `CompetitorComparisonTable`
- Botao **"Importar CSV"** com icone Upload
- Botao **"Baixar Template"** com icone Download
- Input hidden de file para selecao do arquivo CSV

### 2. Logica de importacao CSV
- Usar `papaparse` (ja instalado no projeto) para parsear o CSV
- A primeira linha do CSV define os **headers da tabela** (colunas)
- As linhas seguintes definem os **dados** (rows)
- Deteccao inteligente: se ja existem headers, os dados importados sao mesclados (append); se nao existem, substitui tudo

### 3. Template CSV para download
- Gerar um CSV de exemplo com formato:
```
Caracteristica,Nossa Solucao,Concorrente A,Concorrente B
Precisao,Alta (50um),Media (100um),Baixa (200um)
Velocidade,Rapida,Media,Lenta
Suporte Tecnico,24/7,Horario comercial,Email apenas
```

### 4. Arquivo alterado
- `src/components/CompetitorComparisonTable.tsx` - Adicionar imports (Upload, Download, FileSpreadsheet, useRef), input file hidden, funcoes `handleCSVImport` e `downloadTemplate`, e botoes na UI ao lado de "Adicionar Coluna"

## Secao Tecnica

### Fluxo de importacao
1. Usuario clica em "Importar CSV"
2. Seleciona arquivo `.csv`
3. `papaparse` faz o parse com `header: true`
4. Headers do CSV viram `table_headers`
5. Cada linha vira um objeto em `table_data` mapeando header -> valor
6. Chama `handleChange()` para atualizar estado e propagar via `onChange`

### Formato esperado do CSV
- Primeira coluna = nome da caracteristica/criterio
- Demais colunas = competidores (incluindo a propria solucao)
- Primeira linha = nomes das colunas (headers)

