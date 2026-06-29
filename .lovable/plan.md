## 🎯 Engagement Carousel — Correções de paridade Preview↔Export

Três defeitos confirmados no código, todos em `src/components/EngagementCarouselPreview.tsx` (+ um em `StrategicCarouselPreview.tsx`). Nada fora desses dois arquivos.

### Problema 1 — Texto cortado no Slide 1

Hoje o bloco de texto fica em `bottom: 340` com `maxHeight: 55%`. Quando o título tem 2–3 linhas + subtítulo, o topo do bloco bate em ~`bottom: 590` e a *clamp* corta linhas. Como o preview é exibido em escala reduzida, o corte só aparece no PNG/MP4 a 1080×1350.

Correção:
- Substituir `bottom: 340` por `bottom: 220`.
- Aumentar `maxHeight` para `65%`.
- Aumentar o range do gradient (de `H * 0.30` para `H * 0.20`) tanto no JSX quanto no canvas legacy (`drawSlideFrameWithVideo` slide 1), para o texto continuar legível sobre o vídeo.
- Slide 1 canvas legacy: alinhar `H - 220` com o JSX.

### Problema 2 — Vídeo exportado é cortado (não vai até o fim)

Em `generateDomCompositedVideo` (StrategicCarouselPreview.tsx, l.1872–1882):
- O `loadeddata` resolve antes de a `duration` estar disponível para alguns webm/mp4 → cai no fallback `duration = 10s`.
- O loop encerra em `performance.now() - startedAt >= durationMs` mesmo se o vídeo real for mais longo.

Correção:
- Trocar `videoEl.onloadeddata` por `videoEl.onloadedmetadata` (duration é garantida nesse evento).
- Se `videoEl.duration` for `Infinity` (webm sem cues), forçar leitura: setar `currentTime = 1e10`, aguardar `durationchange`, depois `currentTime = 0`.
- Remover o cap de 10s default; em último caso usar `durationCapSeconds`.
- Manter `ended` como sinal primário de parada; só usar o timer como *fallback* (já está, mas com a duration correta agora bate certo).

### Problema 3 — Imagens esticadas dentro dos cards

`html2canvas` não respeita `object-fit: cover` em `<img>` quando combinado com `transform: scale()`. Resultado: o PNG vem com a imagem esticada ao tamanho do container.

Correção (apenas para o caminho de export PNG, sem mexer no preview interativo):
- Em `generateEngagementSlidePNG`, antes de injetar no container off-screen, pré-rasterizar `imageUrl` para um data URL **já recortado** em cover nas dimensões reais de cada slot:
  - Slide 1: 1080×1350.
  - Slides 2–5: contentW × 440.
  - Slide 6: contentW × 280.
- Helper local `rasterizeCover(dataUrl, w, h, scale)`: cria canvas off-screen, calcula o crop "cover" (mesma matemática do `drawImageCover` já existente) e devolve PNG data URL.
- Passar esse data URL pré-cortado como `imageUrl` no `EngagementSlideRender` de export; o `<img>` final fica com `width/height` exatos do container (sem `object-fit` necessário), eliminando o esticamento do html2canvas.
- O `imageScale` continua aplicado via crop matemático (não via CSS transform).

### Fora de escopo
- Não mexer em SmartOps, edge functions, banco, copy/IA.
- Não alterar StrategicCarousel além do ajuste em `generateDomCompositedVideo` (que é compartilhado).
- Não tocar em logos, badges, cores ou tipografia.

### Verificação
- Reler os 2 arquivos antes de editar para localizar os trechos exatos.
- Build/typecheck automático passa.
- Validação visual: usuário exporta Slide 1 com vídeo + texto de 3 linhas → texto inteiro visível, vídeo completo, imagem (quando trocada por foto) sem distorção.
