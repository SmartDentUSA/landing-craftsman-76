## Plano: Abaixar texto do cabeçalho — Slide 6 (CTA)

O título e subtítulo do Slide 6 estão colados no topo do card. Vamos adicionar respiro superior para descer o bloco de texto, mantendo paridade preview ↔ export.

### Alterações em `src/components/EngagementCarouselPreview.tsx`

1. **Métricas (`getEngagementLayoutMetrics`, slideNum === 6)**
   - Aumentar `ctaTopPad` em ~60px (de 120 → 180) para empurrar o bloco título+subtítulo para baixo.

2. **Exportação canvas (`generateEngagementSlideVideo`, slideNum === 6)**
   - Deslocar Y inicial do título em +60px para refletir o novo `ctaTopPad`.
   - Subtítulo e caption seguem relativo ao título (sem alteração extra).

### Fora de escopo
Tamanho/posição da imagem central, fontes, botão CTA e demais slides permanecem inalterados.
