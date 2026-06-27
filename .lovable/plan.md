## Correções cirúrgicas — paridade preview/export

Aplicar exatamente as alterações solicitadas, sem mexer em nada além disso.

### 1. `src/components/StrategicCarouselPreview.tsx`
- `StrategicSlideRender`: máscara recebe `zIndex: 2` para parar de cobrir o conteúdo.
- Adicionar props `fontFamily` e `fontSize` em `Slide1Hook` … `Slide6CTA`, em `generateSlidePNG` e em `generateStrategicSlideVideo`; propagar até o shell do slide (style do container).
- `CarouselLogosOverlay`: substituir `filter: drop-shadow(...)` por `boxShadow` equivalente nos logos.
- `SlideWrapper`: resolver vídeo na ordem `videoStorageUrl || videoSrc`.
- `waitForDomMedia`: trocar timeout interno de `80ms` para `250ms`.

### 2. `src/components/EngagementCarouselPreview.tsx`
- Em `drawSlideFrameWithVideo`:
  - Slide 1: badge no topo (`top: 40`, `right: 48`).
  - Slide 6: `titleFontSize = 44`, `bodyFontSize = 26`.
  - Slide 1: gradiente começa em `H * 0.30`; bloco de texto posicionado a partir de `bottom: 340`.
  - `drawOrder` fixado em `'video-under-overlay'` para todos os slides com vídeo.
- `LogoOverlay`: trocar `filter: drop-shadow(...)` por `boxShadow`.
- Slides 2–5: aplicar `overflow: hidden` no card e `maxHeight` no body.
- Trocar `setTimeout(resolve, 80)` por `setTimeout(resolve, 250)`.

### 3. `src/components/InstagramCopyGenerator.tsx`
- Passar `fontFamily` e `fontSize` (já existem no state) nas 4 chamadas de export:
  - ZIP → `generateSlidePNG` e `generateStrategicSlideVideo`.
  - SmartOps → `generateSlidePNG` e `generateStrategicSlideVideo`.

### Verificação
- Reler os 3 arquivos antes de cada edição para localizar os trechos exatos.
- Aplicar as edições com `line_replace`.
- Confirmar que o build/typecheck automático passa sem erros.

### Fora de escopo
- Não alterar copy/IA, edge functions, banco, SmartOps backend.
- Não mexer em layouts além do listado acima.
- Manter comportamento de abortar export se não houver paridade (já existente).