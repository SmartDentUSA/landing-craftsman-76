

## Fix: Incluir .mp4 no ZIP quando slide tem video

### Problema
O export "Baixar ZIP" gera apenas PNGs para todos os 6 slides. Quando um slide tem video, o .mp4 nao e incluido no ZIP — apenas a thumbnail PNG e gerada.

### Causa
O `exportAllPNGs` (linha 238) itera os 6 slides e sempre gera PNG via canvas. Nao verifica se o slide tem `mediaType === 'video'` nem acessa o video source.

O video source esta em `slideTexts[i].videoSrc` como blob URL (efemero) ou, se foi uploaded para Storage, em `slideImageMap[i]` como URL publica. Blob URLs nao podem ser fetchados como arquivo — precisam ser convertidos.

### Solucao

**Arquivo: `src/components/EngagementCarouselSection.tsx`**

1. No loop do `exportAllPNGs`, verificar se `slideTexts[i].mediaType === 'video'`
2. Se for video:
   - Gerar o PNG da thumbnail normalmente (ja funciona com a imagem em `slideImageMap`)
   - Tambem incluir o .mp4 no ZIP:
     - Se o video esta no Supabase Storage (URL publica em `slideImageMap` ou `slideTexts.videoSrc` com dominio supabase): fetch como blob e adicionar ao ZIP
     - Se e blob URL local: fetch direto do blob URL (funciona no mesmo contexto do browser)
   - Nome: `engajamento_slide_{i}_video.mp4`
3. Atualizar toast para indicar "PNGs + Videos"

**Arquivo: `src/components/EngagementCarouselPreview.tsx`**

4. No `handleFileUpload` para video: alem do blob URL de preview, fazer upload do .mp4 para Supabase Storage via `onImageFileUpload` (o pai ja tem `uploadImageToStorage`)
5. Salvar a URL publica do video em `slideTexts[i].videoStorageUrl` para que persista entre sessoes e esteja disponivel no export

**Arquivo: `src/components/EngagementCarouselSection.tsx`**

6. Adicionar handler `handleVideoFileUpload` que faz upload do .mp4 para o bucket `product-images` e salva a URL em `slideTexts[slideNum].videoStorageUrl`

### Resultado esperado
- ZIP contem PNGs de todos os slides + arquivos .mp4 para slides com video
- Videos persistem no Storage e sobrevivem reload da pagina
- Preview continua mostrando video autoplay no card

