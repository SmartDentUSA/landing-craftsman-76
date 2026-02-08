

# Plano: Importador de PDF com IA para Landing Pages (com Extração de Tabelas)

## Visão Geral

Criar uma nova seção no editor de landing pages (aba **Conteúdo**, abaixo do **CTA Final**, antes do **Footer**) que permite:

1. Upload de um PDF com o conteúdo/propósito da landing page
2. A IA transcreve fielmente o texto do PDF
3. **Tabelas encontradas no PDF são extraídas e mapeadas diretamente para a seção "Informações Desktop > Mostrar Tabela"**, preservando cabeçalhos e dados exatamente como estão no PDF
4. Preview da transcrição + preview da tabela extraída para aprovação do usuário
5. Após aprovação, sugere preenchimento automático dos campos de texto da página
6. Após salvar, botão "Gerar FAQ por IA" cria FAQs baseadas no conteúdo importado

## Fluxo do Usuário

```text
[Upload PDF] --> [Processando com IA...]
                        |
              [Preview da Transcrição]
              [Preview da Tabela Extraída]  <-- NOVO
                        |
                 [Aprovar / Descartar]
                        |
              [Sugestões para campos de texto]
              [Tabela populada automaticamente em Desktop Info]  <-- NOVO
                        |
                 [Aceitar Sugestões]
                        |
                 [Salvar] --> [Botão Gerar FAQ por IA]
```

## Arquivos a Criar

### 1. `src/components/editor/PDFContentImporter.tsx`

Componente React que gerencia todo o fluxo:

**Estados:** `idle` | `uploading` | `preview` | `suggesting` | `suggestions_ready` | `applied`

**Interface visual:**
- Zona de upload drag-and-drop (PDF, max 10MB)
- Area de preview com scroll para texto transcrito
- **Preview visual da tabela extraída** (usando os componentes Table/TableHeader/TableRow/TableCell existentes) para que o usuário veja exatamente como ficará
- Botões "Aprovar Transcrição" e "Descartar"
- Cards de sugestões com checkbox individual para cada campo
- Botão "Gerar FAQ por IA" (aparece após conteúdo aplicado e salvo)

**Props do componente:**
- `data` - Dados atuais da landing page
- `onApplySuggestions(suggestions)` - Callback para aplicar nos campos de texto
- `onApplyTable(table_title, table_headers, table_data)` - Callback para popular desktop_info com a tabela do PDF
- `onFAQsGenerated(faqs)` - Callback para popular o array faq
- `onTranscriptionSaved(text)` - Callback para guardar transcrição no estado

### 2. `supabase/functions/transcribe-landing-page-pdf/index.ts`

Edge function que recebe o PDF e retorna:

**Entrada:** FormData com arquivo PDF + nome da landing page

**Processamento:**
1. Extrai texto com `pdfjs-serverless` (mesma lib já usada em `transcribe-product-document`)
2. Envia para Lovable AI (Gemini 2.5 Flash) com **tool calling** para resposta estruturada

**Saída estruturada via tool calling:**

```text
{
  transcribed_text: string,          // Texto fiel do PDF
  suggestions: {
    seo_title: string,
    seo_description: string,
    banner_title: string,
    banner_subtitle: string,
    banner_badge_text: string,
    solutions_title: string,
    advisory_title: string,
    advisory_paragraph: string,
    cta_final_title: string,
    cta_final_paragraph: string,
    desktop_info_title: string,
    desktop_info_text: string
  },
  extracted_tables: [                 // NOVO - Tabelas extraídas do PDF
    {
      title: string,                  // Título/contexto da tabela
      headers: string[],              // Cabeçalhos das colunas
      rows: Array<Record<string, string>>  // Dados das linhas, chaveados pelos headers
    }
  ]
}
```

**Regras para extração de tabelas:**
- A IA deve identificar TODAS as tabelas presentes no PDF
- Preservar cabeçalhos exatamente como escritos no documento
- Preservar dados de cada célula fielmente (números, unidades, textos)
- Cada linha é um objeto com chaves iguais aos headers
- Se múltiplas tabelas existirem, retornar array com todas (a primeira será usada por padrão)

**Mapeamento direto para desktop_info:**

| Campo do PDF (IA)    | Campo desktop_info     |
|----------------------|------------------------|
| `extracted_tables[0].title`   | `table_title`    |
| `extracted_tables[0].headers` | `table_headers`  |
| `extracted_tables[0].rows`    | `table_data`     |

Quando o usuário aprovar, o sistema automaticamente:
- Ativa `show_table: true` no desktop_info
- Popula `table_title` com o título da tabela
- Popula `table_headers` com os cabeçalhos extraídos
- Popula `table_data` com as linhas, no formato `Array<{ [header]: valor }>`

### 3. `supabase/functions/generate-landing-page-faqs/index.ts`

Edge function para gerar FAQs após importação:

**Entrada:** `transcribed_text`, `landing_page_name`, dados atuais

**Saída:** Array de 8-12 FAQs `{ question, answer }` com respostas em HTML

**Regras:** Usar EXCLUSIVAMENTE informações do texto transcrito, zero alucinações

## Arquivos a Editar

### 4. `src/pages/Editor.tsx`

**Novo estado:**
```text
const [pdfTranscription, setPdfTranscription] = useState<string | null>(null);
```

**Nova seção no Accordion** (entre "CTA Final" e "Footer", ~linha 4971):
```text
AccordionItem value="pdf-content-importer"
  - Título: "Importar Conteúdo (PDF)"
  - Componente PDFContentImporter
```

**Callback `onApplyTable`:**
Quando chamado, atualiza o estado `data` com:
```text
desktop_info: {
  ...data.desktop_info,
  show_table: true,
  table_title: title da tabela extraída,
  table_headers: headers extraídos,
  table_data: rows extraídos
}
```
E aciona `saveDesktopInfo()` para persistir.

**Callback `onApplySuggestions`:**
Atualiza os 12 campos de texto da landing page com as sugestões aceitas pelo usuário.

**Callback `onFAQsGenerated`:**
Adiciona FAQs ao array existente e ativa a seção FAQ.

### 5. `supabase/config.toml`

Registrar as duas novas edge functions:
```text
[functions.transcribe-landing-page-pdf]
verify_jwt = false

[functions.generate-landing-page-faqs]
verify_jwt = false
```

## Detalhes Importantes sobre a Extração de Tabelas

**Exemplo prático:**

Se o PDF contiver uma tabela como:

```text
Especificações Técnicas do NanoClean PoD
| Propriedade       | Valor         | Padrão ISO  |
| Resistência       | 150 MPa       | ISO 178     |
| Módulo Flexural   | 6.2 GPa       | ISO 178     |
| Absorção de Água  | 15.2 μg/mm³   | ISO 4049    |
```

O sistema extrairá e populará:
- `table_title`: "Especificações Técnicas do NanoClean PoD"
- `table_headers`: ["Propriedade", "Valor", "Padrão ISO"]
- `table_data`: [
    {"Propriedade": "Resistência", "Valor": "150 MPa", "Padrão ISO": "ISO 178"},
    {"Propriedade": "Módulo Flexural", "Valor": "6.2 GPa", "Padrão ISO": "ISO 178"},
    {"Propriedade": "Absorção de Água", "Valor": "15.2 μg/mm³", "Padrão ISO": "ISO 4049"}
  ]

O preview no componente mostrará esta tabela visualmente antes da aprovação.

**Se houver múltiplas tabelas no PDF:**
- O componente mostrará um seletor para o usuário escolher qual tabela usar
- A tabela selecionada será mapeada para desktop_info
- As demais poderão ser descartadas ou inseridas manualmente depois

## Resumo de Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/editor/PDFContentImporter.tsx` | Criar | Componente de upload, preview (texto + tabela), sugestões e FAQ |
| `supabase/functions/transcribe-landing-page-pdf/index.ts` | Criar | Transcrição + extração de tabelas + sugestões |
| `supabase/functions/generate-landing-page-faqs/index.ts` | Criar | Geração de FAQs baseada no conteúdo |
| `src/pages/Editor.tsx` | Editar | Adicionar seção, estados e callbacks (incluindo onApplyTable) |
| `supabase/config.toml` | Editar | Registrar 2 novas edge functions |

