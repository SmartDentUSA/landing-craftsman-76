
# Slide 4 (💫 Experiência): Layout Igual ao Slide 3 — Imagem Full-Card + Overlay em 1/3

## Diagnóstico do Estado Atual

O Slide 4 atualmente é dividido em **dois painéis 50/50** (flex row):
- **Esquerda 50%**: imagem do produto
- **Direita 50%**: fundo sólido `primaryColor` com label, keyword e benefit

O usuário quer que o Slide 4 adote a **mesma linguagem visual do Slide 3**: imagem cobrindo todo o card, com o conteúdo textual sobre um painel que ocupa apenas ~42% (esquerda), similar ao overlay do Slide 3.

Olhando o Slide 3 como referência:
- Fundo escuro `#0f0f14` no card inteiro
- Imagem na esquerda em `width: 42%`
- Gradiente de fade `linear-gradient(to right, transparent, #0f0f14)` na borda direita da imagem
- Painel direito com `flex: 1`, fundo transparente (o fundo escuro do card aparece)

## Mudança Visual

```text
ANTES (Slide 4)                    DEPOIS (Slide 4)
┌──────────┬──────────┐            ┌──────────────────────┐
│          │          │            │   [imagem full-card] │
│  imagem  │ cor sólida│           │                      │
│  50%     │  50%     │            │ ┌────────┐           │
│          │  label   │            │ │overlay │  label    │
│          │  keyword │            │ │~30% W  │  keyword  │
│          │  benefit │            │ │+fade   │  benefit  │
└──────────┴──────────┘            └──────────────────────┘
```

## Mudanças Técnicas

### 1 — JSX do `Slide4Experience` (linhas 520–538)

Reestruturar de layout flex 50/50 para:

1. **Container**: `position: 'relative'`, `overflow: 'hidden'`, fundo escuro `#0f0f14`
2. **Imagem full-bleed**: `position: absolute`, `top: 0, left: 0, width: 100%, height: 100%`, `objectFit: cover`
3. **Overlay lateral esquerdo** (~33% da largura): `position: absolute, left: 0, top: 0, bottom: 0, width: '33%'`, background `rgba(0,0,0,0.45)` — mais transparente que o Slide 3 (que usa gradiente mais escuro)
4. **Fade/gradiente de transição**: de `rgba(0,0,0,0.45)` para transparente, da borda direita do overlay para o centro, para não haver corte brusco
5. **Número "4"**: mantido no canto superior esquerdo
6. **Painel de conteúdo**: `position: absolute`, lado **direito** (58% da largura), centralizado verticalmente, com textos brancos sobre a imagem diretamente (sem fundo sólido), com textShadow leve para legibilidade

```tsx
// Nova estrutura JSX Slide4Experience:
<div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', background: '#0f0f14', fontFamily: '...' }}>
  
  {/* Imagem full-bleed */}
  {image ? (
    <img src={image} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
  ) : (
    <div style={{ position: 'absolute', inset: 0, background: '#1a1a2e' }} />
  )}

  {/* Overlay lateral esquerdo — 1/3 do card, semi-transparente */}
  <div style={{
    position: 'absolute', top: 0, left: 0, bottom: 0, width: '42%',
    background: 'linear-gradient(to right, rgba(15,15,20,0.75), transparent)'
  }} />

  {/* Número do slide */}
  <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ color: '#fff', fontWeight: 900, fontSize: 30 }}>4</span>
  </div>

  {/* Painel direito sobre a imagem — sem fundo sólido */}
  <div style={{
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '58%',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    padding: '80px 70px 80px 40px', gap: 20,
    background: 'linear-gradient(to left, rgba(15,15,20,0.72), transparent)'
  }}>
    <p style={{ color: '#fff', opacity: 0.7, fontSize: labelFontSize, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 3 }}>{label}</p>
    <h2 style={{ color: '#ffffff', fontSize: kwFontSize, fontWeight: 900, lineHeight: 1.1, wordBreak: 'break-word', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>{keyword}</h2>
    <p style={{ color: '#e0e0e0', opacity: 0.9, fontSize: benefitFontSize, lineHeight: 1.5, fontWeight: 400 }}>{benefit}</p>
  </div>
</div>
```

### 2 — Canvas Export do Slide 4 (linhas 1076–1114)

Replicar a mesma estrutura no canvas:

1. **Imagem full-bleed**: `drawImageCover(ctx, img, 0, 0, W, H)` — cobrindo todo o canvas 1080×1350
2. **Overlay lateral esquerdo**: gradiente linear horizontal de `rgba(15,15,20,0.75)` → `rgba(0,0,0,0)` nos primeiros ~42% da largura (`0` até `W*0.42`)
3. **Overlay lateral direito**: gradiente de `rgba(15,15,20,0.72)` começando em `W*0.42` → `rgba(0,0,0,0)` no centro, para dar profundidade ao painel de texto
4. **Textos**: posicionados no lado direito (`rx = W * 0.44`), centralizados verticalmente, brancos com textShadow simulado

```typescript
// Canvas Slide 4 — nova lógica:
if (img) {
  drawImageCover(ctx, img, 0, 0, W, H);
} else {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);
}

// Overlay esquerdo (fade out para direita)
const gradLeft = ctx.createLinearGradient(0, 0, W * 0.45, 0);
gradLeft.addColorStop(0, 'rgba(15,15,20,0.75)');
gradLeft.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = gradLeft;
ctx.fillRect(0, 0, W, H);

// Overlay direito (fade in da direita)
const gradRight = ctx.createLinearGradient(W * 0.42, 0, W, 0);
gradRight.addColorStop(0, 'rgba(0,0,0,0)');
gradRight.addColorStop(1, 'rgba(15,15,20,0.72)');
ctx.fillStyle = gradRight;
ctx.fillRect(0, 0, W, H);

// Badge "4"
drawBadge(4, 60, 60, 'rgba(255,255,255,0.15)', '#ffffff');

// Textos no lado direito — centralizados verticalmente
const rx4 = W * 0.44;
const textW4 = W - rx4 - 80;
const kwFontSizeCanvas = keyword.length > 30 ? 44 : keyword.length > 20 ? 55 : keyword.length > 15 ? 65 : 90;

// Calcular posição vertical centrada
const labelH = 40 + 30;
const kwLines = Math.ceil(/* medir */ 1);
const kwH = kwLines * (kwFontSizeCanvas * 1.15) + 30;
const benH = 200; // estimate
const totalH = labelH + kwH + benH;
let ry4 = (H - totalH) / 2;

// Label
ctx.font = '600 36px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
ctx.fillText(label4.toUpperCase(), rx4, ry4);
ry4 += labelH;

// Keyword
ctx.font = `900 ${kwFontSizeCanvas}px system-ui`; ctx.fillStyle = '#ffffff';
ry4 = wrapText(ctx, keyword, rx4, ry4, textW4, kwFontSizeCanvas * 1.15) + 30;

// Benefit
ctx.font = '400 38px system-ui'; ctx.fillStyle = '#e0e0e0'; ctx.globalAlpha = 0.9;
wrapText(ctx, benefit, rx4, ry4, textW4, 52);
ctx.globalAlpha = 1;
```

## Resumo das Mudanças

| Componente | Mudança |
|---|---|
| JSX `Slide4Experience` | Flex 50/50 → full-bleed + overlay lateral 1/3 |
| Canvas Slide 4 (`drawCanvas`) | Half-fill sólida → imagem full + gradientes laterais |
| Overlay JSX | `rgba(0,0,0,0.45)` fade — mais transparente que Slide 3 |
| Textos | Migram de fundo sólido para sobre a imagem com textShadow |

## Arquivo a Modificar

| Arquivo | Linhas |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | 520–538 (JSX Slide4) + 1076–1114 (Canvas Slide4) |

Apenas **1 arquivo**, **2 seções cirúrgicas**.
