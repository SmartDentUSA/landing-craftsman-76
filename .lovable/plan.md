

## Plano: Corrigir sobreposição imagem/texto nos Slides 2–5 exportados

### Problema raiz
O `drawRichText` no canvas renderiza TODAS as linhas do título, mas o `curY` avança apenas pela altura "clampada" (máx 4 linhas). O resultado: a imagem é desenhada por cima das linhas extras do título. No preview HTML, o CSS `overflow: hidden` cuida disso automaticamente — no canvas, não há clipping.

### Correção em `src/components/EngagementCarouselPreview.tsx`

**1. Slides 2–5 PNG (~linhas 1097-1134): Adicionar clipping rect ao título e body**
- Antes de chamar `drawRichText` para o título, fazer `ctx.save()` → `ctx.beginPath()` → `ctx.rect(pad, curY, contentW, titleH)` → `ctx.clip()` → desenhar → `ctx.restore()`
- Mesma lógica para o body: clipar a área de `bodyH` antes de renderizar
- Isso impede que texto longo extravase para a área da imagem

**2. Slides 2–5 Video (~linhas 1383-1415): Mesma correção de clipping**
- Aplicar `ctx.save()/clip()/restore()` idêntico ao desenho de título e body

### Resultado
O texto longo é cortado visualmente (como no preview), a imagem fica abaixo do título sem sobreposição, e o body fica abaixo da imagem — layout idêntico ao preview.

