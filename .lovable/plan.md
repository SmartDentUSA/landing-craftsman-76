

## Plano: Corrigir exportação PNG/WEBM — texto cortado e alinhamento

### Problemas identificados

**1. Slides 2-5: Título longo empurra imagem/body para fora do canvas**
O export mede a altura total do texto sem limitar linhas. Títulos longos (como o do Slide 4 com ~10 linhas) consomem todo o espaço vertical. O preview funciona porque o flexbox com `overflow: hidden` corta naturalmente. O export precisa limitar linhas.

**2. Slide 6: Título cortado na esquerda**
O `drawRichText` com `align: 'center'` calcula `cx = x - lineWidth/2`. O export passa `x = pad` (60), então `cx = 60 - lineWidth/2` que fica **negativo** para linhas largas, cortando o texto na esquerda. Deveria passar `x = W/2` (540) como centro.

### Correções em `src/components/EngagementCarouselPreview.tsx`

**1. Slides 2-5 PNG (~linha 1076-1130): Limitar linhas do título e body**
- Após medir, limitar `titleH` a no máximo 4 linhas (`4 * titleLineH`)
- Limitar `bodyH` a no máximo 3 linhas (`3 * bodyLineH`)
- Isso garante que a soma `titleH + imgH + bodyH` cabe no canvas

**2. Slides 2-5 Video (~linha 1346-1419): Mesma limitação de linhas**

**3. Slide 6 PNG (~linha 975): Corrigir x do drawRichText para centro**
- Trocar `drawRichText(ctx, displayTitle, pad, curY, contentW, ...)` por `drawRichText(ctx, displayTitle, W/2, curY, contentW, ..., 'center')` — usando `W/2` como ponto central
- Mesma correção para o body do slide 6

**4. Slide 6 Video (~linha 1270-1301): Mesma correção de x para centro**

### Arquivo
- `src/components/EngagementCarouselPreview.tsx`

### Resultado
- Slides 2-5: títulos longos são limitados a 4 linhas, o layout permanece equilibrado como no preview
- Slide 6: título e body ficam centralizados sem cortar na esquerda

