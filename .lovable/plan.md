
# Fix: Dois Problemas na Exportação do Carrossel

## Diagnóstico Visual dos Slides Exportados

Analisando as 6 imagens enviadas, foram identificados **2 problemas concretos**:

---

### Problema 1 — Slide 4: Eyebrow label contém sugestão visual da IA

No **Slide 4** aparece no topo:
```
DENTISTA UTILIZANDO UMA ESPÁTULA DE INSERÇ...  (cortado)
```

Isso é o campo `label4` sendo renderizado via `ctx.fillText()` na linha 1491 do canvas. Esse texto vem de `texts?.label` quando o usuário editou manualmente o campo "Label topo" do Slide 4 no editor — e o valor veio diretamente da `image_suggestion` da IA (que a edge function retorna como sugestão de imagem, não como texto do card).

Causa técnica: o campo `label` do Slide 4 está sendo preenchido automaticamente em `InstagramCopyGenerator.tsx` com o valor da `image_suggestion` retornada pela IA.

**Solução**: No `buildImpactNarrative()` (que define o `narLabel` para o canvas Slide 4), o label deve ser fixo e conciso — nunca deve ser populado com `image_suggestion`. Corrigir o default para `'Experiência / Fluxo'` em vez de vir de dados variáveis. Além disso, aplicar `isVisualDescriptionLine()` também no campo `label4` no canvas, e truncar com `ctx.fillText` limitado por largura máxima.

---

### Problema 2 — Slide 6: Texto do CTA cortado horizontalmente

O texto `"s DA2. Clique no link da bio para conferir e"` aparece cortado na borda esquerda e direita — significa que o `ctaBtn` é uma frase longa que ultrapassa os 1080px do canvas. 

Causa técnica: na linha 1642 do canvas:
```typescript
ctx.fillText(ctaBtn, W / 2, btnY + btnH / 2);
```
O `fillText()` não faz word-wrap. Se o texto for longo, ele vai além do canvas. O botão tem largura `btnW = W - 200 = 880px`, mas `fillText` ignora esse limite.

**Solução**: Substituir `ctx.fillText(ctaBtn, ...)` por `wrapText(ctx, ctaBtn, ...)` passando a largura máxima do botão (`btnW - 80` para padding interno), e também reduzir a fonte dinamicamente para textos longos (igual ao padrão do Slide 1 e 2).

---

## Detalhamento Técnico das Correções

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

#### Correção 1 — `buildImpactNarrative()` label fixo (linha 766)

Mudar o label retornado para `'Experiência / Fluxo'` quando vier de `feedCopyProblemSolution`, pois é mais correto e conciso:

```typescript
// Linha 766 — DE:
label: 'Problema & Solução',

// PARA:
label: 'Experiência / Fluxo',
```

#### Correção 2 — Canvas Slide 4: aplicar isVisualDescriptionLine no label (linha 1491)

O label do Slide 4 vem de `texts?.label || narLabel`. Se o usuário populou `texts.label` com conteúdo de `image_suggestion`, precisamos detectar e ignorar:

```typescript
// Linha 1426 — DE:
const label4 = texts?.label || narLabel;

// PARA:
const rawLabel4 = texts?.label || narLabel;
const label4 = isVisualDescriptionLine(rawLabel4) ? 'Experiência / Fluxo' : rawLabel4;
```

E também truncar o label antes do `fillText` para evitar overflow:

```typescript
// Linha 1491 — DE:
ctx.fillText(label4.toUpperCase(), rx4, ry4);

// PARA:
ctx.fillText(label4.slice(0, 40).toUpperCase(), rx4, ry4);
```

#### Correção 3 — Canvas Slide 6: wrapText no botão CTA (linha 1638-1642)

```typescript
// DE (linha 1638-1642):
ctx.font = '900 52px system-ui, -apple-system, sans-serif';
ctx.fillStyle = textOnAccent;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(ctaBtn, W / 2, btnY + btnH / 2);

// PARA — fonte dinâmica + wrapText centrado:
const ctaBtnFontSize = ctaBtn.length > 25 ? 38 : ctaBtn.length > 18 ? 44 : 52;
ctx.font = `900 ${ctaBtnFontSize}px system-ui, -apple-system, sans-serif`;
ctx.fillStyle = textOnAccent;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
// Usar fillText limitado pela largura do botão — substituir por wrapText centrado
ctx.save();
ctx.rect((W - btnW) / 2, btnY, btnW, btnH);
ctx.clip();
ctx.fillText(ctaBtn, W / 2, btnY + btnH / 2);
ctx.restore();
```

Na verdade a solução mais limpa é usar `wrapText` com textBaseline `top` e ajustar o Y para centrar verticalmente:

```typescript
const ctaBtnFontSize = ctaBtn.length > 30 ? 36 : ctaBtn.length > 20 ? 44 : 52;
ctx.font = `900 ${ctaBtnFontSize}px system-ui, -apple-system, sans-serif`;
ctx.fillStyle = textOnAccent;
ctx.textAlign = 'center';
ctx.textBaseline = 'top';
const ctaBtnLineH = ctaBtnFontSize * 1.2;
// Calcular linhas para centrar verticalmente dentro do botão
const ctaBtnLines = Math.ceil(ctx.measureText(ctaBtn).width / (btnW - 80));
const ctaBtnBlockH = ctaBtnLines * ctaBtnLineH;
wrapText(ctx, ctaBtn, W / 2, btnY + (btnH - ctaBtnBlockH) / 2, btnW - 80, ctaBtnLineH, 'center');
```

---

## Resumo dos Arquivos Modificados

| Arquivo | Mudança | Linhas |
|---|---|---|
| `src/components/StrategicCarouselPreview.tsx` | 1) `label` fixo `'Experiência / Fluxo'` em `buildImpactNarrative()` | ~766 |
| `src/components/StrategicCarouselPreview.tsx` | 2) Filtrar `texts?.label` do Slide 4 com `isVisualDescriptionLine` + truncar a 40 chars | ~1426, ~1491 |
| `src/components/StrategicCarouselPreview.tsx` | 3) Font dinâmica + `wrapText` centrado no botão CTA do Slide 6 no canvas | ~1638-1642 |

**3 mudanças cirúrgicas, 1 arquivo. Zero impacto nos outros slides.**

## Antes / Depois

| Slide | Problema | Resultado esperado |
|---|---|---|
| Slide 4 label | "DENTISTA UTILIZANDO UMA ESPÁTULA DE INSERÇ..." | "EXPERIÊNCIA / FLUXO" |
| Slide 6 CTA botão | "s DA2. Clique no link da bio para conferir e" cortado | Texto centralizado e ajustado ao botão |
