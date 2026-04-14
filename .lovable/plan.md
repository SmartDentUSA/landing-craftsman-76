

## Plano: Sincronizar exportação PNG/WEBM dos Slides 2–5 com o preview

### Problema
O preview HTML dos slides 2–5 usa `flexDirection: 'column'` com `justifyContent: 'center'`, distribuindo título, imagem e corpo de forma equilibrada e centralizada verticalmente. Mas a exportação PNG usa posições fixas:
- `titleY = 100` (sempre no topo)
- `imgY = Math.max(titleEndY + 20, 320)` (mínimo Y=320)
- `imgH = 440`
- Body text logo abaixo da imagem

Isso resulta em texto cortado ou layout desbalanceado quando o título é longo — o conteúdo não cabe ou fica espremido no topo com espaço vazio embaixo.

### Correção em `src/components/EngagementCarouselPreview.tsx`

**1. Slides 2–5 PNG (~linhas 1062-1128): centralizar verticalmente**
- Pré-medir a altura de cada bloco (título, imagem, corpo) antes de desenhar
- Calcular `totalH = titleH + gap + imgH + gap + bodyH`
- Calcular `startY = (H - totalH) / 2` para centralizar
- Desenhar sequencialmente a partir de `startY` — sem posições fixas
- Manter `imgH = 440` e `gap = 28` como no preview

**2. Slides 2–5 Video (~linhas 1290+): mesma lógica**
- Aplicar a mesma centralização vertical no `drawSlideFrameWithVideo` para slides 2-5

**3. Manter fontes iguais ao preview**
- Título: `fontSize: 56` (já correto)
- Corpo: `fontSize: 36` (já correto)

### Arquivo
- `src/components/EngagementCarouselPreview.tsx` — seções de slides 2-5 no PNG e no WEBM

### Resultado
As imagens e vídeos exportados dos slides 2–5 ficam visualmente idênticos ao preview: conteúdo centralizado verticalmente, sem texto cortado, sem vazio excessivo.

