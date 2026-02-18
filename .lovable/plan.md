
# Fix: PNG Exportados — Imagens dos Produtos Perdendo Proporção

## Diagnóstico

Ao exportar o ZIP com os 6 PNGs (1080×1350px), 4 dos 6 slides chamam `ctx.drawImage(img, x, y, W, H)` passando diretamente as dimensões do slot de destino — sem calcular a proporção original da imagem. O resultado é estiramentos/distorções visíveis.

Mapeamento exato por slide:

| Slide | Linha | Chamada atual | Problema |
|-------|-------|---------------|----------|
| 1 | 718 | `drawImage(img, 0, H*0.40, W, H*0.60)` | Estica para 1080×810px ignorando ratio |
| 2 | 773 | `scale = Math.min(maxW/dw, maxH/dh)` | ✅ já usa contain corretamente |
| 3 | 807 | `drawImage(img, 0, 0, imgW, H)` | Estica para 454×1350px ignorando ratio |
| 4 | 867 | `drawImage(img, 0, 0, halfW, H)` | Estica para 540×1350px ignorando ratio |
| 5 | 908 | `drawImage(img, -20, -20, W+40, H+40)` | ✅ fundo borrado — distorção intencional |
| 6 | 961 | `drawImage(img, cx-r, cy-r, r*2, r*2)` | Thumbnail circular sem recorte centrado |

## Solução: Funções `drawImageCover` e `drawImageContain`

Adicionar dois helpers antes do `generateSlidePNG`:

### `drawImageCover(ctx, img, x, y, w, h)`
Equivale ao CSS `object-fit: cover` — recorta e centraliza a imagem para preencher a área sem distorção:
```ts
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;  // source width
  const sh = h / scale;  // source height
  const sx = (iw - sw) / 2;  // centrar horizontalmente
  const sy = (ih - sh) / 2;  // centrar verticalmente
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
```

### `drawImageContain(ctx, img, x, y, w, h)` — já existe implicitamente no slide 2, mas formalizar:
```ts
function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(w / iw, h / ih, 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}
```

## Mudanças por Slide

### Slide 1 (linha 717-718)
Região inferior da imagem — cover para preencher a faixa inferior sem distorcer:
```ts
// ANTES:
ctx.drawImage(img, 0, H * 0.40, W, H * 0.60);

// DEPOIS:
drawImageCover(ctx, img, 0, H * 0.40, W, H * 0.60);
```

### Slide 3 (linhas 803-808) — painel lateral esquerdo (42% da largura, altura total)
```ts
// ANTES:
ctx.drawImage(img, 0, 0, imgW, H);

// DEPOIS:
drawImageCover(ctx, img, 0, 0, imgW, H);
```

### Slide 4 (linhas 862-868) — metade esquerda (540×1350px)
```ts
// ANTES:
ctx.drawImage(img, 0, 0, halfW, H);

// DEPOIS:
drawImageCover(ctx, img, 0, 0, halfW, H);
```

### Slide 6 (linhas 957-962) — thumbnail circular (raio 120px = 240×240px)
O círculo precisa de `drawImageCover` na área 240×240, centralizado:
```ts
// ANTES:
ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);

// DEPOIS:
drawImageCover(ctx, img, cx - r, cy - r, r * 2, r * 2);
```

## Arquivo a Modificar

**`src/components/StrategicCarouselPreview.tsx`** — apenas uma mudança cirúrgica:

1. Adicionar as funções `drawImageCover` e `drawImageContain` logo antes de `generateSlidePNG` (linha 643)
2. Substituir as 4 chamadas `ctx.drawImage` problemáticas pelas funções acima

## Resumo do Impacto

| Slide | Antes | Depois |
|-------|-------|--------|
| 1 | Imagem esticada horizontalmente | Cover — recorte centrado preservando ratio |
| 2 | ✅ Sem alteração | ✅ Mantido |
| 3 | Imagem esticada no painel lateral | Cover — preenche sem distorcer |
| 4 | Imagem esticada na metade esquerda | Cover — preenche sem distorcer |
| 5 | ✅ Sem alteração (blur intencional) | ✅ Mantido |
| 6 | Thumbnail circular distorcido | Cover — recorte centrado no círculo |
