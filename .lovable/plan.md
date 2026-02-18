
# Fix Slide 3 Canvas Export: Ícones e Textos Aglutinados

## Diagnóstico Preciso

### O que aparece no preview (JSX — correto)
O painel direito do Slide 3 usa CSS Flexbox com:
- `justifyContent: 'center'` — centraliza o bloco inteiro verticalmente
- `gap: 36` entre cada item
- Cada item é um `<div>` com `alignItems: 'flex-start'` e `gap: 24` entre ícone e texto
- O ícone (56×56px) e o texto ficam lado a lado, na mesma linha base

### O que acontece no canvas export (bug)

```text
CANVAS SLIDE 3 — BUG ATUAL:
ry = 100
[título]  ry += 120  →  ry = 220

Item 1:
  icon desenhado em ry=220
  texto em wrapText(rx+76, ry+10=230, ..., lineHeight=42)
  → texto tem 4 linhas → wrapText retorna ry = 220 + (4×42) = 388
  ry += 18  →  ry = 406

Item 2:
  icon desenhado em ry=406  ← só 18px depois do texto do item 1!
  ...

Resultado: ícone do item 2 aparece logo abaixo do último texto do item 1,
sem respiro, e desalinhado com seu próprio texto.
```

### Causa Raiz — 3 problemas encadeados

1. **Sem gap confortável entre itens**: apenas `+18px` após `wrapText`, independentemente de quantas linhas o texto ocupa
2. **Ícone e texto não são tratados como bloco único**: o canvas não tem flexbox — ícone e texto devem ser medidos juntos antes de desenhar
3. **Sem centramento vertical**: o JSX usa `justifyContent: 'center'` mas o canvas começa em `ry = 100` sem calcular o espaço disponível

## Solução

### Algoritmo correto para o canvas

```text
1. Pré-calcular a altura de cada item:
   - Simular wrapText → contar linhas → altura_texto = linhas × lineHeight
   - altura_item = max(56, altura_texto)  [ícone é 56px]

2. Calcular altura total do conteúdo:
   - total = altura_título + 60 + Σ(altura_item) + gap × (n-1)

3. Centrar verticalmente:
   - startY = (H - total) / 2

4. Desenhar cada item:
   - Ícone em (rx, itemY)
   - Texto em (rx+76, itemY+10)  [alinhado ao topo do ícone]
   - Avançar: itemY += max(56, altura_texto) + GAP_ENTRE_ITENS
```

## Mudança Técnica

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

**Seção canvas Slide 3** (linhas 981–1038) — substituição da lógica de posicionamento:

```typescript
} else if (slideNum === 3) {
  const title = texts?.title || 'Por que confiar?';
  const GAP = 44; // gap entre itens (equivale ao gap:36 do JSX + margem)
  const ICON_SIZE = 56;
  const LINE_H = 44;
  const TEXT_FONT = '700 34px system-ui, -apple-system, sans-serif';
  const RIGHT_X = imgW + 40;
  const TEXT_MAX_W = W - RIGHT_X - 60;

  // [fundo + imagem: igual ao atual]

  // Pré-calcular número de linhas de cada item para medir altura
  function measureLines(text: string): number {
    ctx.font = TEXT_FONT;
    const words = text.split(' ');
    let line = '';
    let lines = 1;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > TEXT_MAX_W && line !== '') {
        lines++;
        line = word + ' ';
      } else {
        line = test;
      }
    }
    return lines;
  }

  // Medir altura total do conteúdo
  const TITLE_H = 52 * 1.2 + 60; // fontSize + lineSpacing + gap após título
  const itemHeights = items.map(item => Math.max(ICON_SIZE, measureLines(item) * LINE_H));
  const totalContentH = TITLE_H + itemHeights.reduce((a, b) => a + b, 0) + GAP * (items.length - 1);

  // Centrar verticalmente
  let ry = Math.max(80, (H - totalContentH) / 2);

  // Título
  ctx.font = '900 52px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, RIGHT_X, ry);
  ry += TITLE_H;

  // Itens — ícone e texto como bloco único
  for (let i = 0; i < items.length; i++) {
    const itemH = itemHeights[i];
    const itemY = ry;

    // Ícone
    ctx.fillStyle = primaryColor;
    roundRect(RIGHT_X, itemY, ICON_SIZE, ICON_SIZE, 12);
    ctx.fill();
    ctx.font = '32px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ICONS_CANVAS[i % ICONS_CANVAS.length], RIGHT_X + 28, itemY + 28);

    // Texto (começa no mesmo Y do ícone)
    ctx.font = TEXT_FONT;
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    wrapText(ctx, items[i], RIGHT_X + 76, itemY + 10, TEXT_MAX_W, LINE_H);

    ry += itemH + GAP;
  }
}
```

## Impacto

| Problema | Antes | Depois |
|---|---|---|
| Itens aglutinados | ry avança só +18px após texto multilinha | Avança pela altura real do item + GAP=44px |
| Ícone desalinhado com texto | Ambos em `ry` mas ry já mudou | Ambos usam `itemY` fixo, calculado antes |
| Sem centramento vertical | Começa em ry=100 | Centrado verticalmente como no JSX |
| Textos longos | Quebram mais linhas e comprimem próximo item | Medidos antes, espaço garantido |

## Arquivo a Modificar

| Arquivo | Linhas |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | 981–1038 (canvas Slide 3) |

Apenas **1 arquivo**, **1 seção cirúrgica** no canvas export.
