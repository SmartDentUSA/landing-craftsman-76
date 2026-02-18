
# Slide 4 (💫 Experiência): Mover Texto para 75% da Largura do Card

## O que Muda

O usuário quer que o painel de texto fique posicionado a **75% da largura** do card — ou seja, começando em 3/4 do card (lado direito mais estreito), em vez dos atuais 25% (último quarto à direita).

**Interpretação**: o painel de texto ocupa os últimos **25% à direita**, mas o usuário quer mover o texto para que ocupe desde os **25% até o final** — mantendo a mesma largura, mas começando mais à direita. A instrução "75% a posição do texto" significa: o texto começa na posição horizontal de 75% do card.

## Estado Atual

| Elemento | Valor Atual |
|---|---|
| JSX: painel de texto | `width: '25%'`, `right: 0` |
| JSX: overlay direito | `right: 0`, `width: '28%'` |
| Canvas: posição X dos textos | `rx4 = W * 0.76` |
| Canvas: gradiente direito | inicia em `W * 0.72` |

## O que Mudar

O painel já está ancorado em `right: 0` (lado direito), então a largura de `25%` já posiciona o texto nos últimos 25% do card. O `rx4 = W * 0.76` confirma que o texto começa em 76% da largura no canvas.

Se o usuário quer "75% a posição", a mudança é **confirmar/fixar** a posição inicial em exatamente **75%** (`W * 0.75` no canvas e `right: 0, width: '25%'` no JSX — que já é 75% de início). Porém, olhando a imagem enviada, o texto está muito espremido à direita. O usuário provavelmente quer **ampliar o painel** para que ele ocupe **mais espaço**, iniciando em 25% e se estendendo até o fim (75% de largura), tornando o card mais legível.

**Interpretação mais provável**: o painel de texto deve ter **largura de 75%** do card (não 25%), tornando-o muito mais espaçoso e visível, começando em 25% do card.

## Mudanças Técnicas

### JSX (preview do editor)

**Arquivo**: `src/components/StrategicCarouselPreview.tsx`

1. **Painel de texto** (linha ~549-550):
   - `width: '25%'` → `width: '75%'`
   - Padding ajustado para o novo espaço

2. **Overlay direito** (linha ~537-540):
   - `width: '28%'` → `width: '78%'` (acompanha o painel)

3. **Overlay esquerdo** (linha ~530-533):
   - Mantido cobrindo `width: '33%'` como transição visual da imagem

### Canvas Export

**Arquivo**: `src/components/StrategicCarouselPreview.tsx`

1. **Posição X dos textos** (linha ~1129):
   - `rx4 = W * 0.76` → `rx4 = W * 0.26`

2. **Largura disponível para texto** (linha ~1130):
   - `textW4 = W - rx4 - 50` → texto pode usar `W * 0.74 - 80` de largura

3. **Gradiente direito** (linha ~1120):
   - `createLinearGradient(W * 0.72, 0, W, 0)` → `createLinearGradient(W * 0.22, 0, W, 0)` para cobrir os 75% onde ficam os textos

4. **Font sizes** (linha ~1132+):
   - Com mais espaço disponível, aumentar os breakpoints de tamanho de fonte para aproveitar a área maior (keyword: max 80px; benefit: max 36px)

5. **Vertical centering** (linha ~1145+):
   - Recalcular `totalH4` com os novos tamanhos de fonte

## Arquivo a Modificar

| Arquivo | Seções |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | JSX linhas 537–573 (overlays + painel) + Canvas linhas 1119–1176 |

Apenas **1 arquivo**, **2 seções cirúrgicas**.
