

## Plano: Corrigir texto cortado no Slide 1 do Carrossel de Engajamento

### Problema
O texto do Slide 1 (título + corpo) está sendo cortado na parte inferior. O container de texto usa `bottom: 60px` sem limite de altura — com `fontSize: 72` no título e `36` no corpo, conteúdo longo ultrapassa a área visível.

### Correções em `src/components/EngagementCarouselPreview.tsx`

**1. Preview HTML (linhas ~608-621)**
- Adicionar `maxHeight` ao container de texto (ex: `maxHeight: '55%'`) para limitar a área ocupada
- Título: `fontSize: 72` → `52`, com `WebkitLineClamp: 3` e `overflow: hidden`
- Corpo: `fontSize: 36` → `24`, com `WebkitLineClamp: 2` e `overflow: hidden`
- Manter o posicionamento `bottom: 60` mas garantir que o conteúdo nunca ultrapasse

**2. Canvas PNG (linhas ~862-873)**
- Título: reduzir de 72px para 52px, e mover `H - 300` para um Y dinâmico que garante espaço
- Corpo: reduzir de 36px para 24px
- Limitar número de linhas renderizadas (máximo 3 título, 2 corpo)

**3. Canvas Vídeo** — aplicar mesmas reduções de fonte

### Resultado
O Slide 1 volta a exibir título e subtítulo compactos sobre o gradiente, sem cortar texto, como na referência enviada.

