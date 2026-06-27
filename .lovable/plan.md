## Diagnóstico

Auditoria confirmou exatamente o que o usuário descreveu: o preview (React/JSX) e o export (canvas/html2canvas) usam **duas camadas de renderização diferentes** com layout duplicado e sem fonte única de verdade.

### Carrossel Engajamento — divergências mapeadas
- **DIV-01** Slide 1: badge no topo (preview) vs rodapé (vídeo).
- **DIV-02/03** Slide 6: fontes 44/26 (preview) vs 40/28 (vídeo).
- **DIV-04** Slide 1: gradiente 70% (preview) vs 60% (vídeo).
- **DIV-05** Slide 1: posição vertical do texto fixa no canvas vs dinâmica no preview.
- **DIV-06** `filter: drop-shadow` dos logos ignorado pelo html2canvas.
- **DIV-07** `backgroundImage` em `<div>` falha intermitente no html2canvas.
- **DIV-08** `-webkit-line-clamp` ignorado → overflow de texto no PNG.
- **DIV-09** Slide 6 padding-top 90 (preview) vs 60 (canvas).

### Carrossel Visual — divergências mapeadas
- **#1 CRÍTICO** Z-index invertido: máscara cobre o texto no export.
- **#2 CRÍTICO** `productData` no ZIP/SmartOps sem `salesPitch/description/targetAudience/applications/faq` → Slide 1 usa fallback errado.
- **#3 CRÍTICO** `fontFamily`/`fontSize` props aceitos mas nunca propagados aos slides.
- **#4 ALTO** `<style>` injetado para `textColor` não processado por html2canvas off-screen.
- **#5 ALTO** Ordem `videoSrc` vs `videoStorageUrl` invertida entre preview/export + blob pode estar revogado.
- **#6 MÉDIO** Espera de 80ms insuficiente após decode de imagens grandes.
- **#7 MÉDIO** Logos SVG via `readAsDataURL` falham em alguns browsers.

## Plano de correção

### Fase 1 — Carrossel Visual (`StrategicCarouselPreview.tsx` + `InstagramCopyGenerator.tsx`)
1. Corrigir z-index em `StrategicSlideRender`: máscara passa para `zIndex: 2` (igual ao `SlideWrapper` do preview).
2. Completar `productData` nos blocos de ZIP e SmartOps incluindo `salesPitch`, `description`, `targetAudience`, `applications`, `faq`.
3. Substituir `<style>` de `textColorOverride` por CSS Variable inline (`--slide-text-color`) lida em cada slide via `color: var(--slide-text-color, ...)`.
4. Unificar prioridade de mídia: `videoStorageUrl || videoSrc` em preview e export; limpar `videoSrc` blob após upload bem-sucedido.
5. Aumentar wait pós-decode para 250ms + duplo `requestAnimationFrame` antes do `html2canvas`.
6. Propagar `fontFamily`/`fontSize` por todos os Slide components, `StrategicSlideRender`, `generateSlidePNG`, `generateStrategicSlideVideo` e callers em `InstagramCopyGenerator`.
7. Em `fetchAsDataUrl`, detectar SVG e rasterizar para PNG via canvas antes de devolver o data URL.

### Fase 2 — Carrossel Engajamento (`EngagementCarouselPreview.tsx`)
1. Extrair constantes de layout (`TITLE_FONT_SIZE`, `BODY_FONT_SIZE`, `BADGE_TOP/RIGHT`, `GRADIENT_START_PCT`, `SLIDE6_TOP_PAD`) para um único objeto compartilhado por JSX e canvas.
2. Corrigir no `drawSlideFrameWithVideo`:
   - Slide 1 badge: y do topo (não rodapé).
   - Slide 6: `titleFontSize = 44`, `bodyFontSize = 26`.
   - Slide 1: gradiente a partir de `H*0.30`.
   - Slide 1: cálculo dinâmico de `startY` igual ao `bottom: 200` do JSX.
   - Slide 6: `topPad = 90`.
3. No JSX, trocar `filter: drop-shadow` dos logos por `box-shadow` (suportado por html2canvas). No canvas do vídeo, emular sombra via `ctx.shadow*`.
4. Substituir o `<div backgroundImage>` do `MediaBlock` por `<img>` real com `object-fit: cover` + `transform: scale()` para garantir render no html2canvas.
5. Adicionar `overflow: hidden` + `maxHeight` calculado nos blocos com `-webkit-line-clamp` como fallback garantido.
6. Propagar `fontFamily`/`fontSize` props em `renderSlideContent`, `EngagementSlideRender`, `generateEngagementSlidePNG` e `drawSlideFrameWithVideo`.

### Fase 3 — Validação
- Rodar export de PNG e WebM dos 6 slides de cada carrossel via Playwright contra o preview real.
- Comparar visualmente preview ↔ PNG ↔ frame de vídeo nos pontos críticos: posição do badge, tamanho de fontes, gradiente, máscara, texto sobre vídeo, logos, cor de fonte customizada.
- Confirmar que ZIP e Upload SmartOps produzem o mesmo arquivo binário (mesma pipeline).

## Critério de aceite
- Toda customização visível no editor (textos, cores, fontes, máscara, vídeo, logos, escala, posição) aparece **idêntica** no arquivo exportado, tanto no ZIP quanto no envio para SmartOps.
- Nenhum fallback silencioso: se o render falhar, erro explícito, nunca arquivo divergente.
- Layout constants existem em um único lugar por carrossel; JSX e canvas leem da mesma fonte.

## Arquivos afetados
- `src/components/StrategicCarouselPreview.tsx`
- `src/components/EngagementCarouselPreview.tsx`
- `src/components/InstagramCopyGenerator.tsx`
- `src/components/EngagementCarouselSection.tsx` (apenas se necessário para passar props novos)
