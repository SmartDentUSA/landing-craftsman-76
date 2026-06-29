## Plano: Abaixar texto do Slide 1 (Capa / Gancho)

Ajustar a posição vertical do bloco de texto do Slide 1 para ficar mais próximo da base do card, mantendo paridade entre preview e exportação.

### Alterações

1. **`src/components/EngagementCarouselPreview.tsx`**
   - **Métricas de layout** (`getEngagementLayoutMetrics`, slideNum === 1):
     - `slide1Bottom`: `veryLong ? 520 : 500` → `veryLong ? 460 : 440`
     - Redução de 60 px no CSS `bottom`, descendo o bloco de texto no preview.
   - **Exportação de vídeo** (`generateEngagementSlideVideo`, slideNum === 1):
     - Título: coordenada Y de `H - 220` → `H - 280`
     - Subtítulo: manter `titleEndY + 16` relativo ao novo título
     - Redução de 60 px equivalente no canvas, preservando paridade preview ↔ export.

### Fora de escopo
Nenhuma alteração em fontes, cores, gradiente, conteúdo textual, badges ou outros slides.