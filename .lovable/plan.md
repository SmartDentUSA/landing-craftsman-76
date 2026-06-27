## Objetivo
Trazer para o **🎨 Carrossel Visual** (`StrategicCarouselPreview.tsx`) o mesmo nível de customização do **🎯 Carrossel Engajamento**: upload de vídeo, mídia (vídeo/imagem) cobrindo todo o card, máscara com transparência ajustável, posição de texto, cor de fonte, slider para escalar o bloco de texto. No slide **✨ Apresentação** (Slide 2), permitir que a imagem cubra toda a área do card via um modo "cover".

## Arquivos afetados
- `src/components/StrategicCarouselPreview.tsx` (mudanças principais)
- `src/components/EngagementCarouselSection.tsx` (passar `onImageFileUpload` para o `StrategicCarouselPreview` — mesma rota de upload já usada no engajamento)

Sem mudanças em Sistema B, edge functions, `smartops-upload.ts`, `company_profile`, SEO/JSON-LD, ou no fluxo de export PNG/MP4 já existente.

## Mudanças

### 1. Tipos `SlideTextsType` — campos novos opcionais (backward compatible)
Adicionar em cada slide (1–6):
- `mediaType?: 'image' | 'video'`
- `videoSrc?: string` (blob URL local para preview)
- `videoStorageUrl?: string` (URL persistida no Storage)
- `coverMode?: 'contain' | 'cover'` (default: `cover` em 1/5/6, `contain` em 2/3/4)
- `maskOpacity?: string` (0–90, % de escurecimento sobre a mídia)
- `maskColor?: string` (default `#000000`)
- `textColor?: string` (cor das fontes do slide; sobrescreve o cálculo por luminância)
- `textPosition?: 'top' | 'center' | 'bottom'`
- `textBlockScale?: string` (60–140, escala do bloco de textos)

O `overlayOpacity` e `faixaColor` atuais do slide 1 continuam funcionando como estão.

### 2. `SLIDE_EDITOR_FIELDS` — controles novos por slide
Adicionar em todos os 6 slides:
- `coverMode` (toggle "Imagem cobre todo o card")
- `maskOpacity` (slider 0–90)
- `maskColor` (color)
- `textColor` (color)
- `textPosition` (select: topo / centro / rodapé)
- `textBlockScale` (slider 60–140)

Acrescentar o tipo `'select'` ao renderer do editor inline (hoje só há `input | textarea | slider | color | toggle`).

### 3. Upload de vídeo no `SlideWrapper`
Replicar o `handleFileUpload` do `EngagementCarouselPreview`:
- `accept="image/*,video/*"`
- Se `file.type.startsWith('video/')`: gerar `URL.createObjectURL(file)`, gravar `mediaType='video'` + `videoSrc=blobUrl`, e chamar `onImageFileUpload(slideNum, file)` para subir o arquivo no Storage.
- Se imagem: `mediaType='image'` + comportamento atual.
- Adicionar prop `onImageFileUpload?: (slideNum, file) => void` em `SlideWrapper` e em `StrategicCarouselPreviewProps`.
- Botão troca ícone `ImageIcon` / `Video` conforme `mediaType`.

### 4. Renderer compartilhado `<SlideMedia />`
Helper único reutilizado nos 6 slides:
- Se `mediaType === 'video'` e tem `videoSrc`/`videoStorageUrl` → `<video autoplay muted loop playsinline>` com `object-fit` controlado por `coverMode`.
- Caso contrário → `<img>` com `object-fit` por `coverMode`.
- Aplica `transform: scale(imageScale/100)`.
- Renderiza máscara logo acima: `<div style={{position:'absolute',inset:0,background:rgba(maskColor, maskOpacity/100)}} />`.

### 5. Aplicar nos 6 slides
- **Slide 1 (Hook)**: já full-bleed → trocar `<img>` por `<SlideMedia>`; a máscara nova é usada quando `maskOpacity` é definido (mantém `overlayOpacity` como fallback retrocompat).
- **Slide 2 (✨ Apresentação)**:
  - Se `coverMode === 'cover'` (opt-in): `<SlideMedia>` cobre todo o card como fundo absoluto; textos viram overlay com máscara.
  - Se `'contain'` (default atual): mantém layout atual (imagem centralizada com fundo bgColor).
- **Slides 3, 4, 5, 6**: trocar `<img>` por `<SlideMedia>`. Default mantém o comportamento atual (3/4 `contain`, 5/6 `cover`), mas `coverMode` permite alternar.

### 6. Posição e escala dos textos
Envolver o bloco principal de cada slide num wrapper que respeita:
- `textPosition` → topo (`top: 8%`), centro (`top:50%; translateY(-50%)`), rodapé (`bottom: 8%`).
- `textBlockScale` → `transform: scale(textBlockScale/100)` com `transform-origin` coerente com a posição.
- `textColor` → sobrescreve a cor calculada por luminância quando definido (caso contrário mantém auto).

### 7. Integração externa
Em `EngagementCarouselSection.tsx`, no ponto onde `StrategicCarouselPreview` é renderizado, passar a mesma função `onImageFileUpload` já usada pelo carrossel de engajamento. Sem mudanças no roteamento de Storage.

## Fora de escopo
- Lógica de export PNG/MP4 do Visual segue como está (sem mudanças no engine de captura agora — vídeo no preview funcionará; export do `.webm` por slide pode ser tratado em pedido separado, igual fizemos para Engajamento).
- Não mexer em Sistema B / edge functions / SEO / JSON-LD / `company_profile`.
- Não alterar layout, fonte ou copy do engajamento.

## Verificação
- Typecheck do projeto.
- Smoke visual no preview `/repository`: subir vídeo em cada um dos 6 slides, alternar `coverMode` no slide 2, mover slider de máscara, mudar cor da fonte, alternar posição do texto, ajustar slider de tamanho do bloco.
