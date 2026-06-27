## Problema

No 🎨 Carrossel Visual o upload de vídeo continua funcional, mas a UI por card mostra apenas um único botão "Upload" (que aceita imagem e vídeo no mesmo input). Não há toggle visível Imagem/Vídeo como no card 🎣 Hook do 🎯 Carrossel Engajamento, então parece que o vídeo foi removido.

## Objetivo

Deixar a barra de ação de cada card do Carrossel Visual **idêntica** à do card Hook do Carrossel Engajamento.

## Referência (Engagement, `SlideWrapper` em `EngagementCarouselPreview.tsx`)

Barra abaixo do slide contém, nesta ordem:
1. Thumbnails das imagens do produto
2. Botão `Upload` (input `accept="image/*,video/*"`)
3. Botão toggle `Vídeo` / `Imagem` (alterna `mediaType` entre `'video'` e `'image'`)
4. Botão `Editar` (abre painel de edição)

## Mudanças

### `src/components/StrategicCarouselPreview.tsx` (componente `SlideContainer`, linhas ~481–535)

1. Manter o botão único "Upload" que já existe, mas:
   - Rótulo fixo "Upload" (parar de trocar para "Vídeo" após upload — esse estado vira responsabilidade do toggle).
   - Ícone fixo `Upload`.
2. Substituir o botão atual condicional "Imagem" (que só aparece quando `mediaType === 'video'`) por um **toggle persistente Vídeo/Imagem** sempre visível, igual ao Engagement:
   - Quando `mediaType === 'video'` → mostra ícone `Video` + label "Vídeo".
   - Quando `mediaType === 'image'` → mostra ícone `ImageIcon` + label "Imagem".
   - `onClick` alterna `mediaType` via `onSlideTextChange?.('mediaType', next)`. Ao voltar para `'image'`, limpa `videoSrc` e `videoStorageUrl` (preservar comportamento atual de remoção).
3. Manter ordem visual: thumbnails → Upload → toggle Vídeo/Imagem → (botão Editar existente).
4. Não mexer em nenhuma lógica de captura/exportação/handlers de upload — apenas a UI dos dois botões muda.

## Fora de escopo

- Comportamento de exportação, máscaras, fontes, logos e layout dos slides.
- `EngagementCarouselPreview.tsx` (já está correto, serve só de referência).
- `InstagramCopyGenerator.tsx` (handler `handleVisualSlideFileUpload` já aceita vídeo).

## Critério de aceite

- Em todo card do 🎨 Carrossel Visual aparece, sempre visível, o botão "Upload" + o toggle "Vídeo/Imagem", visualmente equivalente ao card 🎣 Hook do 🎯 Carrossel Engajamento.
- Upload de arquivo `.mp4/.webm/.mov` continua funcionando e o vídeo aparece no preview e na exportação como hoje.
