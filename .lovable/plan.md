
# Fix: Margens, Overflow de Texto e Filtros nos Cards Exportados

## Diagnóstico por Slide

Analisando as 4 imagens enviadas, foram identificados **4 problemas distintos** nos slides exportados:

---

### Problema 1 — Slide 3: Título cortado na borda direita

"Fidelidade Cromática Δ" aparece cortado no canto direito do card.

**Causa técnica (linha 1387):**
```typescript
ctx.fillText(title, rx, ry);  // ← fillText sem wrap!
```
O `rx = imgW + 40 ≈ 494px`. Com fonte `900 52px`, "Fidelidade Cromática ΔE < 1" mede ~620px, ultrapassando o canvas em `494 + 620 = 1114px > 1080px`.

**Correção:** Substituir `fillText` por `wrapText` para o título do Slide 3, limitando a largura ao espaço disponível (`W - rx - 60 = 526px`).

---

### Problema 2 — Slide 3: Texto dos bullets começa 76px mais à direita do `maxWidth` calculado

`TEXT_MAX_W_S3 = W - rx - 60 = 526px` é calculado a partir de `rx`, mas o texto começa em `rx + 76` (após o ícone). Então o `wrapText` recebe `526px` de largura mas começa deslocado — o texto ultrapassa o lado direito do canvas.

**Causa técnica (linhas 1352, 1362–1373, 1409):**
- `measureLinesS3` mede com `TEXT_MAX_W_S3 = 526px`
- `wrapText` usa `TEXT_MAX_W_S3 = 526px` mas texto começa em `rx + 76`
- Logo, as linhas quebram com base em 526px mas renderizam a partir de 570px, saindo do canvas

**Correção:** Definir `TEXT_W_S3 = W - rx - 76 - 60 = 450px` e usar em ambos `measureLinesS3` e `wrapText`.

---

### Problema 3 — Slide 4: Label ainda exibe "IMAGEM DAS MÃOS DE UM DENTISTA APLICANDO"

A função `isVisualDescriptionLine()` não captura esta frase. A palavra `imagem` seguida de `das mãos` e `dentista aplicando` não estão na lista de padrões.

**Causa técnica (linha 490–537):** Padrões ausentes:
- `"imagem das"` (ex: "imagem das mãos de um dentista...")
- `"imagem de"` (ex: "imagem de um profissional...")
- `"imagem do"`, `"imagem da"` (variações genéricas)
- `"dentista aplicando"`, `"profissional aplicando"`, `"aplicando o produto"`

**Correção:** Adicionar esses padrões à `isVisualDescriptionLine()`.

---

### Problema 4 — Slide 6: ctaBtn contém texto motivacional em vez de label de ação

No Slide 6, o botão CTA exibe "Elimine o risco de retrabalho e garanta a satisfação do seu paciente com a cor BL2 fiel." — isso é o corpo motivacional do Slide 6, não o label do botão CTA ("💡 Saiba Mais").

**Causa técnica (linha 1602):** O campo `texts?.ctaButton` foi salvo com o texto motivacional (vindo do campo de texto editável que o usuário preencheu erroneamente). Não há validação para detectar que o conteúdo é inadequado como botão CTA.

**Correção:** Adicionar um guard no canvas: se `ctaBtn` tiver mais de 60 caracteres (indicativo de texto longo/motivacional), fazer fallback para o default `'💡 Saiba Mais'`.

---

## Detalhamento Técnico das Correções

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

#### Correção 1 + 2 — Slide 3: título com wrapText + largura correta dos bullets (linhas 1347–1412)

```typescript
// Linha 1347: rx permanece igual
const rx = imgW + 40;
const TEXT_FONT_S3 = '700 34px system-ui, -apple-system, sans-serif';
const GAP_S3 = 44;
const ICON_SIZE_S3 = 56;
const LINE_H_S3 = 44;
// ANTES: const TEXT_MAX_W_S3 = W - rx - 60;
// DEPOIS: separar largura do título e largura do texto dos bullets
const TITLE_MAX_W_S3 = W - rx - 60;          // título: a partir de rx
const TEXT_MAX_W_S3 = W - rx - 76 - 60;      // bullets: a partir de rx+76 (após ícone)
```

No `measureLinesS3` (linha 1362): trocar `TEXT_MAX_W_S3` por `TEXT_MAX_W_S3` (já está correto com o novo valor).

Linha 1383–1388: substituir `fillText(title, ...)` por `wrapText(ctx, title, rx, ry, TITLE_MAX_W_S3, 52 * 1.2)` e calcular o avanço de `ry` multiplicando as linhas geradas.

Linha 1409: já usa `TEXT_MAX_W_S3` — passará a usar o novo valor mais estreito automaticamente.

```typescript
// DE (linha 1387):
ctx.fillText(title, rx, ry);
ry += TITLE_H_S3;

// PARA:
const titleEndY = wrapText(ctx, title, rx, ry, TITLE_MAX_W_S3, 52 * 1.2);
ry = titleEndY + 28;  // gap após o título
```

E o `TITLE_H_S3` que entrava no `totalContentH_S3` precisa ser recalculado dinamicamente medindo o título também.

#### Correção 3 — Slide 4: expandir `isVisualDescriptionLine()` (linhas 501–504)

Adicionar na função:
```typescript
// Padrões com "imagem de/da/do/das" — sugestões fotográficas
lower.startsWith('imagem de') ||
lower.startsWith('imagem da') ||
lower.startsWith('imagem do') ||
lower.startsWith('imagem das') ||
lower.startsWith('imagem dos') ||
lower.includes('dentista aplicando') ||
lower.includes('profissional aplicando') ||
lower.includes('aplicando o produto') ||
lower.includes('aplicando o cimento') ||
lower.includes('mãos de um dentista') ||
lower.includes('mãos do dentista') ||
```

#### Correção 4 — Slide 6: guard no ctaBtn (linha 1602)

```typescript
// DE:
const ctaBtn = texts?.ctaButton || '💡 Saiba Mais';

// PARA:
const rawCtaBtn = texts?.ctaButton || '';
const ctaBtn = (rawCtaBtn && rawCtaBtn.length <= 60) ? rawCtaBtn : '💡 Saiba Mais';
```

---

## Resumo dos Arquivos e Linhas Modificados

| Slide | Problema | Arquivo | Linhas |
|---|---|---|---|
| Slide 3 | Título sem wrap — cortado na direita | `StrategicCarouselPreview.tsx` | 1352, 1376–1388 |
| Slide 3 | Largura dos bullets errada (76px offset) | `StrategicCarouselPreview.tsx` | 1352, 1362–1373, 1409 |
| Slide 4 | Label com sugestão visual não filtrada | `StrategicCarouselPreview.tsx` | 501–535 |
| Slide 6 | ctaBtn com texto motivacional longo | `StrategicCarouselPreview.tsx` | 1602 |

**1 arquivo, 4 correções cirúrgicas. Zero impacto nos outros slides ou na preview interativa.**

## Antes / Depois por Slide

| Slide | Problema | Resultado Esperado |
|---|---|---|
| Slide 3 — título | "Fidelidade Cromática Δ" cortado na borda direita | Título quebra em 2 linhas dentro do painel |
| Slide 3 — bullets | Texto vaza para fora do canvas na borda direita | Bullets respeitam margem direita de 60px |
| Slide 4 — label | "IMAGEM DAS MÃOS DE UM DENTISTA APLICANDO" | "EXPERIÊNCIA / FLUXO" |
| Slide 6 — botão | "Elimine o risco de retrabalho..." (texto longo) | "💡 Saiba Mais" |
