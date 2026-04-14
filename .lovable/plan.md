

## Plano: Alinhar exportação PNG/WEBM do Slide 6 com o preview

### Problema real
O **preview HTML** do Slide 6 usa flexbox com `justifyContent: 'center'`, que distribui título, imagem, corpo e CTA de forma equilibrada. Mas o **canvas export** (PNG e WEBM) usa posicionamento fixo com `btnY = Math.max(curY, H - btnH - 120)`, que empurra o CTA para o fundo e deixa um vazio enorme no meio.

Além disso, o título no canvas começa em `curY = 120` (topo), enquanto no preview tudo é centralizado verticalmente.

### Correções em `src/components/EngagementCarouselPreview.tsx`

**1. Centralizar verticalmente no canvas (PNG e WEBM)**
- Calcular a altura total dos blocos (título + gap + imagem + gap + corpo + gap + CTA) antes de desenhar
- Derivar o `startY` como `(H - totalHeight) / 2` para centralizar tudo
- Remover o `Math.max(curY, H - btnH - 120)` que empurra o botão para baixo

**2. Corrigir alinhamento do título**
- O `ctx.textAlign` está como `'left'` mas `drawRichText` recebe `'center'` — o `drawRichText` já lida com alinhamento internamente, então basta garantir que `ctx.textAlign` não interfira

**3. Corrigir build errors (TS2554)**
- Verificar e corrigir chamadas a `drawRichText` que possam ter argumentos extras em algum estado do build

### Lógica proposta para o canvas (simplificada)

```text
// Calcular alturas antes de desenhar:
titleH  = estimativa de linhas * lineHeight
imgH    = 320
bodyH   = estimativa de linhas * lineHeight  
ctaBtnH = linhas CTA * lineHeight + padding
gaps    = 24 * 3

totalH  = titleH + imgH + bodyH + ctaBtnH + gaps
startY  = (1350 - totalH) / 2   // centralizar

// Desenhar sequencialmente a partir de startY
```

### Arquivo
- `src/components/EngagementCarouselPreview.tsx` — seções do Slide 6 no PNG (~linhas 901-1034) e no WEBM (~linhas 1172-1286)

### Resultado
A exportação PNG e WEBM do Slide 6 vai ficar visualmente idêntica ao preview: conteúdo centralizado, sem vazio, CTA logo abaixo do corpo.

