

# Importacao CSV e DOCX para Tabela de Concorrentes

## Objetivo
Adicionar botoes de importacao de dados na Tabela de Comparacao com Concorrentes, suportando **CSV** (igual ao padrao do projeto) e **DOCX** (nova funcionalidade usando a biblioteca `mammoth`).

## O que sera feito

### 1. Instalar dependencia `mammoth`
- Biblioteca leve para extrair conteudo de arquivos `.docx` no browser
- Converte DOCX para HTML, de onde extraimos as tabelas automaticamente

### 2. Adicionar botoes ao componente `CompetitorComparisonTable`
- **"Importar CSV"** -- usa `papaparse` (ja instalado)
- **"Importar DOCX"** -- usa `mammoth` para extrair a primeira tabela do documento
- **"Baixar Template CSV"** -- gera um CSV de exemplo para download

### 3. Logica de importacao

**CSV:** A primeira linha do arquivo define os headers (colunas), as demais linhas sao os dados.

**DOCX:** O sistema procura a primeira tabela no documento Word, extrai a primeira linha como headers e as demais como dados. Se nao encontrar tabela, exibe erro.

### 4. Template CSV para download
```
Caracteristica,Nossa Solucao,Concorrente A,Concorrente B
Precisao,Alta (50um),Media (100um),Baixa (200um)
Velocidade,Rapida,Media,Lenta
Suporte Tecnico,24/7,Horario comercial,Email apenas
```

## Secao Tecnica

### Arquivo alterado
- `src/components/CompetitorComparisonTable.tsx`

### Dependencia adicionada
- `mammoth` (parse de DOCX no browser)

### Fluxo DOCX
1. Usuario clica "Importar DOCX"
2. Seleciona arquivo `.docx`
3. `mammoth.convertToHtml()` converte para HTML
4. Parser DOM busca o primeiro `<table>` no HTML
5. Primeira `<tr>` vira `table_headers`
6. Demais `<tr>` viram objetos em `table_data`
7. `handleChange()` atualiza estado e propaga via `onChange`

### Fluxo CSV
1. Usuario clica "Importar CSV"
2. `papaparse` faz parse com `header: true`
3. `meta.fields` vira `table_headers`
4. `data` vira `table_data`

### Posicionamento na UI
Os botoes serao adicionados logo abaixo do switch "Ativar", numa linha horizontal com os 3 botoes: `Importar CSV`, `Importar DOCX`, `Baixar Template`.

