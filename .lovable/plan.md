

# Gerar Apostila SPIN em DOCX

## Resumo

Alterar o botao "Gerar Apostila" no `SpinSolutionEditModal` para baixar um arquivo `.docx` em vez de `.md`. A conversao sera feita no lado do cliente (browser) usando o Markdown retornado pela edge function.

## Abordagem

A edge function `export-spin-apostila` continuara retornando Markdown (que tambem e salvo no metadata para a base de conhecimento). No frontend, o Markdown sera convertido em HTML (usando a biblioteca `marked`, ja instalada) e entao empacotado como DOCX usando o metodo "Word-compatible HTML" -- sem necessidade de bibliotecas extras.

O truque e: Microsoft Word abre arquivos `.doc` que contenham HTML valido com headers MIME especificos. Isso gera um arquivo `.doc` totalmente compativel com Word/Google Docs sem dependencias adicionais.

## Alteracoes

### 1. Arquivo: `src/components/SpinSolutionEditModal.tsx` (~linhas 3146-3155)

Substituir a logica de download que atualmente cria um Blob de texto Markdown por:

1. Converter o Markdown para HTML usando `marked.parse()`
2. Envolver o HTML em um template com headers Word-compatible (charset UTF-8, estilos basicos para tabelas, headings, etc.)
3. Criar um Blob com tipo `application/msword` 
4. Baixar como `.doc`

**Logica simplificada:**

```typescript
import { marked } from 'marked';

// Dentro do onClick:
const markdown = data.markdown;
const htmlContent = await marked.parse(markdown);

// Template Word-compatible
const docContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Calibri, sans-serif; font-size: 11pt; }
    h1 { font-size: 18pt; color: #1a1a2e; }
    h2 { font-size: 14pt; color: #16213e; border-bottom: 1px solid #ccc; }
    h3 { font-size: 12pt; color: #0f3460; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 6px; }
    blockquote { border-left: 3px solid #ccc; padding-left: 10px; color: #555; }
    code { background: #f4f4f4; padding: 2px 4px; font-family: Consolas, monospace; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;

const blob = new Blob([docContent], { type: 'application/msword' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `apostila-spin-${titulo}.doc`;
// ...download
```

### 2. Nenhuma alteracao na edge function

A edge function `export-spin-apostila` permanece inalterada. Ela continua retornando Markdown e salvando no metadata (para a base de conhecimento / AI training).

### 3. Nenhuma dependencia nova

- `marked` ja esta instalada no projeto
- O formato Word-compatible HTML nao requer bibliotecas adicionais
- O arquivo `.doc` abre nativamente no Word, Google Docs e LibreOffice

## Resultado

- Botao "Gerar Apostila" baixara um `.doc` com formatacao profissional
- Headings, tabelas, blockquotes e listas serao renderizados corretamente no Word
- O conteudo continua sendo salvo no metadata para uso na base de conhecimento
