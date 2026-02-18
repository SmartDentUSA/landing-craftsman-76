
# Slide 1: Imagem Full-Card + Faixa Opaca Centralizada com a Frase

## Diagnóstico do Estado Atual

O Slide 1 atualmente tem esta estrutura em camadas:
- **Fundo colorido** (`primaryColor`) nos 55% superiores
- **Imagem** nos 60% inferiores (não cobre todo o card)
- **Gradiente** de transição entre as duas áreas
- **Frase (hook)** centralizada na região do fundo colorido (`top: 8%` até `bottom: 48%`)
- **Nome do produto** fixo no rodapé

O que o usuário quer: a **imagem deve expandir por todo o card** (100% de largura e altura), e a **frase deve ficar centralizada verticalmente** sobre a imagem, mas com uma **faixa semi-opaca** atrás dela — criando legibilidade sem esconder a imagem.

## Mudança Visual

```text
ANTES                              DEPOIS
┌─────────────────────┐            ┌─────────────────────┐
│  [cor primária]     │            │  [imagem produto    │
│  [cor primária]     │            │   ocupando todo o   │
│  "Gancho aqui"      │            │   card full-bleed]  │
│  [gradiente]        │            │                     │
│  [imagem produto]   │            │ ┌─────────────────┐ │
│  [imagem produto]   │            │ │ faixa opaca     │ │← nova
│  [imagem produto]   │            │ │  "Gancho aqui"  │ │
│  Nome do Produto    │            │ └─────────────────┘ │
└─────────────────────┘            │                     │
                                   │  Nome do Produto    │← mantido
                                   └─────────────────────┘
```

## Mudanças Técnicas

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

#### Fix 1 — Slide1Hook JSX (linhas 364–384)

Substituir completamente a estrutura atual de Slide 1 por:

1. **Imagem full-bleed**: a `<img>` passa a ser `position: absolute; top: 0; left: 0; width: 100%; height: 100%; objectFit: cover` — cobrindo o card inteiro

2. **Overlay escuro geral leve**: um `<div>` com `background: rgba(0,0,0,0.25)` sobre a imagem para dar profundidade sem sufocar

3. **Faixa central opaca**: um `<div>` em `position: absolute; top: 50%; transform: translateY(-50%); left: 0; right: 0; padding: 60px 80px; background: rgba(0,0,0,0.55)` (ou baseado na `primaryColor` com opacidade — `rgba` derivado da cor primária) — centralizando a frase verticalmente no card

4. **Frase dentro da faixa**: `<p>` com cor branca (ou `textColor` com contraste garantido), `fontSize: 52`, `fontWeight: 400`, sem textShadow pois a faixa já garante legibilidade

5. **Gradiente + Nome do produto** no rodapé: mantido como está (gradiente escuro + nome em branco)

6. **Número "1"** no canto superior esquerdo: mantido

```tsx
// Nova estrutura JSX do Slide1Hook:
<div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', fontFamily: '...' }}>
  
  {/* Imagem full-bleed */}
  {image ? (
    <img src={image} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
  ) : (
    <div style={{ position: 'absolute', inset: 0, background: '#333' }} />
  )}

  {/* Overlay escuro geral sutil */}
  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)' }} />

  {/* Número do slide */}
  <div style={{ position: 'absolute', top: 60, left: 60, ... }}>
    <span>1</span>
  </div>

  {/* FAIXA CENTRAL OPACA com a frase */}
  <div style={{
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    left: 0,
    right: 0,
    padding: '60px 80px',
    background: 'rgba(0, 0, 0, 0.58)',   // faixa escura semi-opaca
    textAlign: 'center',
  }}>
    <p style={{ color: '#ffffff', fontWeight: 400, fontSize: 52, lineHeight: 1.3, margin: 0 }}>
      {hook}
    </p>
  </div>

  {/* Gradiente rodapé + nome do produto */}
  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }} />
  <div style={{ position: 'absolute', bottom: 60, left: 80, right: 80 }}>
    <p style={{ color: '#ffffff', fontSize: 44, fontWeight: 600, margin: 0, textAlign: 'center' }}>{name}</p>
  </div>
</div>
```

#### Fix 2 — Canvas export do Slide 1 (função `drawCanvas`)

No canvas, a mesma lógica precisa ser replicada:

1. **Imagem full-bleed**: desenhar a imagem com `drawImage(img, 0, 0, W, H)` — cobrindo todo o canvas 1080×1350

2. **Overlay escuro geral**: `ctx.fillStyle = 'rgba(0,0,0,0.28)'` + `fillRect(0, 0, W, H)`

3. **Faixa central opaca**: calcular `faixaH = 300` (altura da faixa), `faixaY = H/2 - faixaH/2`, depois `ctx.fillStyle = 'rgba(0,0,0,0.58)'` + `fillRect(0, faixaY, W, faixaH)`

4. **Texto da frase** dentro da faixa: `wrapText(ctx, hookText, W/2, faixaY + 60, W - 160, 70, 'center')` com fonte `400 52px`

5. **Gradiente rodapé + nome**: mantido

## Arquivo a Modificar

| Arquivo | Seção |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | `Slide1Hook` JSX (linhas 364–384) + canvas export `drawSlide1` |

Apenas **1 arquivo**, **2 seções cirúrgicas**.
