
# Corrigir Divergência: Imagens Exportadas ≠ Preview do Sistema

## Diagnóstico Completo

Analisando os 6 slides exportados versus o código, há **3 categorias de problemas**:

### Categoria 1 — Slide 4: Texto flutuante sobre imagem (principal problema)
O canvas do Slide 4 renderiza tudo sobre a imagem full-bleed com overlay gradiente. O resultado:
- Bullets sobrepostos à imagem ficam ilegíveis (texto sobre texto na foto)
- "INFOGRÁFICO DETALHADO..." é um texto de prompt AI que está vazando de algum campo do produto para o campo `label` ou `keyword`
- O layout full-bleed funciona bem no preview pequeno (escala 22%) mas falha no canvas 1080x1350px real

**Solução**: O Slide 4 no canvas deve usar o **mesmo layout split 40%/60%** que o Slide 3 (imagem à esquerda, painel escuro à direita com texto), em vez de full-bleed com overlay. Isso garante legibilidade total e consistência com o preview.

### Categoria 2 — Slide 6: "Link na Bio" persistindo no canvas
O canvas linha 1337-1338 foi atualizado para "💡 Saiba Mais" e "🔗 Saiba Mais", mas o `generateSlideHTML()` na linha 1433 ainda tem `'🛒 Comprar Agora'` e `'🔗 Link na Bio'` hardcoded. Isso afeta o export HTML (não o PNG), mas deve ser corrigido por consistência.

### Categoria 3 — Slide 5: Badges com texto cortado
O canvas usa `white-space: nowrap` (via `truncateToWidth`) para badges. Badges longos como "Volume de construção otimizado (144 × 81 × 150 mm) para peças dentárias" são truncados. A lógica JSX usa `wordBreak: 'break-word'` e funciona corretamente.

---

## Mudanças Técnicas

### Fix 1 — Canvas Slide 4: Trocar full-bleed por layout split (linhas 1172–1279)

Em vez do layout atual (imagem + overlay gradiente + texto flutuante), o canvas do Slide 4 passa a usar o mesmo padrão do Slide 3:

```
|── 42% imagem com clip ──|── 58% painel #0f0f14 com textos ──|
```

```typescript
} else if (slideNum === 4) {
  const { headline, impactText, proofBullets, label: narLabel } = buildImpactNarrative(productData);
  const keyword = texts?.keyword || headline;
  const mainText = texts?.benefit || impactText;
  const label4 = texts?.label || narLabel;
  const bulletPool4 = proofBullets;

  // Fundo escuro
  ctx.fillStyle = '#0f0f14';
  ctx.fillRect(0, 0, W, H);

  // Imagem à esquerda (42%) com clip
  const imgW4 = Math.round(W * 0.42);
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, imgW4, H);
    ctx.clip();
    drawImageCover(ctx, img, 0, 0, imgW4, H);
    ctx.restore();
    // Gradiente de feather na borda direita da imagem
    const grad4 = ctx.createLinearGradient(imgW4 - 120, 0, imgW4, 0);
    grad4.addColorStop(0, 'rgba(15,15,20,0)');
    grad4.addColorStop(1, '#0f0f14');
    ctx.fillStyle = grad4;
    ctx.fillRect(imgW4 - 120, 0, 120, H);
  }

  drawBadge(4, 60, 60, 'rgba(255,255,255,0.15)', '#ffffff');

  // Painel de texto à direita
  const rx4 = imgW4 + 40;
  const textW4 = W - rx4 - 60;

  // Font sizes dinâmicos
  const kwFontSizeCanvas = keyword.length > 30 ? 52 : keyword.length > 20 ? 62 : 72;
  const benFontSizeCanvas = mainText.length > 200 ? 28 : mainText.length > 120 ? 32 : 36;
  const benLineH4 = benFontSizeCanvas * 1.5;
  const kwLineH4 = kwFontSizeCanvas * 1.1;
  const bulletFontSize4 = benFontSizeCanvas * 0.85;

  // Calcular alturas para centramento vertical
  // ... (mesma lógica existente, mas com rx4 = imgW4 + 40)

  // Label, divider, keyword, mainText, bullets — mesma lógica existente
  // Só muda o ponto de origem rx4 e a ausência de overlay
}
```

### Fix 2 — Canvas Slide 5: Permitir wrap nos badges (linhas 1309–1331)

Trocar `truncateToWidth` por `wrapText` para badges longos:

```typescript
// Antes (linha 1330):
ctx.fillText(badge, 80 + 130, by + badgeBoxH / 2, maxBadgeTextW);

// Depois — medir linhas corretamente:
ctx.font = '700 40px system-ui, -apple-system, sans-serif';
const words5 = badge.split(' ');
// ... measureLines para calcular badgeLines antes de desenhar caixa
// usar wrapText centrado verticalmente dentro da caixa
```

A altura `badgeBoxH` já é calculada com base em `badgeLines`, mas o texto é renderizado com `fillText` em vez de `wrapText`. Basta substituir `fillText` por `wrapText` na linha correta.

### Fix 3 — generateSlideHTML Slide 6: Atualizar strings legadas (linha 1433)

```typescript
// Linha 1433, trocar no slideBodies[6]:
// '🛒 Comprar Agora'  →  '💡 Saiba Mais'
// '🔗 Link na Bio'    →  '🔗 Saiba Mais'
```

---

## Por que Slide 4 Split é a Solução Certa

O layout full-bleed com overlay foi projetado para quando o produto tem foto de alta qualidade e ambiente. Na prática, muitos produtos têm fundo branco ou cinza — o overlay escuro sobre fundo branco cria um visual cinza desbotado, e os bullets ficam sobrepostos à imagem do produto.

O split 42/58 resolve:
- Texto sempre sobre fundo escuro sólido (#0f0f14) — 100% legível
- Imagem do produto claramente visível à esquerda
- Consistência visual com o Slide 3 (padrão estabelecido)
- O JSX do preview também deve ser atualizado para usar split (remover full-bleed)

---

## Arquivos a Modificar

| Arquivo | Linhas | Mudança |
|---|---|---|
| `src/components/StrategicCarouselPreview.tsx` | 582–633 | Slide 4 JSX: trocar full-bleed por split 42/58 |
| `src/components/StrategicCarouselPreview.tsx` | 1172–1279 | Canvas Slide 4: trocar full-bleed por split idêntico ao Slide 3 |
| `src/components/StrategicCarouselPreview.tsx` | 1309–1331 | Canvas Slide 5: `fillText` → `wrapText` para badges |
| `src/components/StrategicCarouselPreview.tsx` | 1433 | `generateSlideHTML` Slide 6: atualizar strings CTA |

**1 arquivo, 4 seções cirúrgicas.**
