

# Upload em Massa de Depoimentos com Parsing por IA e Geracao de Fotos

## Objetivo

Adicionar na secao "Casos de Sucesso" do editor SPIN um botao **"Importar Depoimentos (Texto)"** que:
1. Abre um Textarea para colar varios depoimentos de uma vez (formato livre)
2. Envia o texto para uma Edge Function que usa Gemini para extrair nome, especialidade, area, depoimento de cada pessoa
3. Preenche automaticamente os campos `success_cases` do formulario
4. Para cada caso, gera uma foto realista do profissional usando Gemini Image (google/gemini-2.5-flash-image) e faz upload para Supabase Storage

---

## Arquivos a Criar

### 1. `supabase/functions/parse-testimonials/index.ts` (NOVA)

Edge Function que recebe o texto bruto dos depoimentos e retorna um array estruturado.

**Fluxo:**
- Recebe `{ text: string }` no body
- Envia para Gemini (`google/gemini-2.5-flash`) via Lovable AI Gateway com tool calling para extrair JSON estruturado
- Tool schema retorna array de objetos com: `client_name`, `specialty` (mapeado para os valores do enum SPECIALTIES), `area` (mapeado para BUSINESS_AREAS), `results_achieved` (o texto do depoimento), `clinic_name` (se mencionado)
- Retorna o array parseado

**Prompt da IA:**
```
Extraia todos os depoimentos do texto abaixo. Para cada depoimento, retorne:
- client_name: nome completo
- specialty: especialidade (mapear para: CLINICO_GERAL, DENTISTICA, IMPLANTODONTIA, PROTESE, ENDODONTIA, ORTODONTIA, PERIODONTIA, CIRURGIA, ODONTOPEDIATRIA, RADIOLOGIA, ESTETICA, HARMONIZACAO, LABORATORIO, TPD, GESTAO, ASB, PESQUISADOR, OUTRO)
- area: area de atuacao (mapear para: CLINICA_CONSULTORIO, LABORATORIO_PROTESE, PLANNING_CENTER, EMPRESA_ALINHADORES, GESTOR_REDE_CLINICAS, EDUCACAO, CENTRAL_IMPRESSOES, RADIOLOGIA_ODONTOLOGICA, GESTOR_FRANQUIAS)
- results_achieved: texto completo do depoimento (sem aspas)
- clinic_name: nome da clinica se mencionado, senao vazio
```

### 2. `supabase/functions/generate-client-photo/index.ts` (NOVA)

Edge Function que gera uma foto realista de um profissional usando Gemini Image.

**Fluxo:**
- Recebe `{ client_name: string, specialty: string, area: string }`
- Chama Lovable AI Gateway com `model: "google/gemini-2.5-flash-image"` e `modalities: ["image", "text"]`
- Prompt: "Generate a professional headshot photo of a Brazilian dental professional named [name]. They are a [specialty]. The photo should be a realistic portrait, warm lighting, professional attire (white coat), friendly smile, neutral background. The person should appear natural and authentic, not AI-generated."
- Recebe base64 da imagem
- Faz upload para Supabase Storage no bucket `product-images` no path `spin-clients/ai-generated-{timestamp}.png`
- Retorna a URL publica e o supabase_path

---

## Arquivos a Modificar

### 3. `src/components/SpinSolutionEditModal.tsx`

**Mudancas na secao "Casos de Sucesso" (linhas ~1583-1805):**

Adicionar entre o titulo e a lista de casos:

- Botao **"Importar Depoimentos"** (icone Upload) ao lado de "Adicionar Caso"
- Ao clicar, abre um Dialog com:
  - Textarea grande para colar o texto dos depoimentos
  - Botao "Processar com IA"
  - Loading state enquanto processa
- Apos o parse, os casos sao adicionados ao `formData.success_cases`
- Um segundo passo opcional: botao **"Gerar Fotos com IA"** que aparece apos o import
  - Itera sobre os casos sem foto (`client_photo === null`)
  - Chama `generate-client-photo` para cada um
  - Atualiza o `client_photo` de cada caso com a imagem gerada

**Novo estado local:**
```typescript
const [showImportDialog, setShowImportDialog] = useState(false);
const [importText, setImportText] = useState('');
const [isParsingTestimonials, setIsParsingTestimonials] = useState(false);
const [isGeneratingPhotos, setIsGeneratingPhotos] = useState(false);
const [photoGenerationProgress, setPhotoGenerationProgress] = useState({ current: 0, total: 0 });
```

**Nova funcao `handleImportTestimonials`:**
- Chama `supabase.functions.invoke('parse-testimonials', { body: { text: importText } })`
- Mapeia resultado para `SuccessCase[]`
- Adiciona ao array existente de `success_cases`
- Fecha dialog e mostra toast com quantidade importada

**Nova funcao `handleGeneratePhotos`:**
- Filtra casos sem foto
- Para cada um (sequencial, para evitar rate limit):
  - Chama `supabase.functions.invoke('generate-client-photo', { body: { client_name, specialty, area } })`
  - Atualiza `success_cases[i].client_photo` com o resultado
  - Atualiza progress
- Salva automaticamente no banco se solutionId existe

### 4. `supabase/config.toml`

Adicionar:
```toml
[functions.parse-testimonials]
verify_jwt = false

[functions.generate-client-photo]
verify_jwt = false
```

---

## Fluxo do Usuario

```text
1. Abre o editor SPIN de uma solucao
2. Na secao "Casos de Sucesso", clica em "Importar Depoimentos"
3. Cola o texto com 10 depoimentos no textarea
4. Clica "Processar com IA"
5. IA extrai os 10 casos e preenche automaticamente os campos
6. Clica "Gerar Fotos com IA" (botao aparece apos import)
7. Sistema gera 10 fotos realistas uma a uma (com barra de progresso)
8. Cada foto e salva no Supabase Storage e vinculada ao caso
9. Usuario revisa e clica "Salvar"
```

---

## Detalhes Tecnicos

| Item | Detalhe |
|---|---|
| Parse de texto | Gemini 2.5 Flash via tool calling (structured output) |
| Geracao de fotos | Gemini 2.5 Flash Image (`modalities: ["image", "text"]`) |
| Storage | Bucket `product-images`, path `spin-clients/ai-generated-*.png` |
| Rate limit | Fotos geradas sequencialmente (1 por vez) para evitar 429 |
| Secret | `LOVABLE_API_KEY` (ja configurada) |
| Nenhuma migracao SQL | Os dados entram nos campos existentes de `success_cases` |

---

## Arquivos Resumo

| Arquivo | Tipo |
|---|---|
| `supabase/functions/parse-testimonials/index.ts` | NOVO |
| `supabase/functions/generate-client-photo/index.ts` | NOVO |
| `src/components/SpinSolutionEditModal.tsx` | MODIFICAR |
| `supabase/config.toml` | MODIFICAR |

