
# Card 3 (Cientificidade): Usar `benefits` do Produto como Prioridade de Conteúdo

## Diagnóstico

O campo `productData.benefits` (benefícios cadastrados no card de produto no repositório) **já chega ao `Slide3Technical`**, mas não é utilizado em nenhuma prioridade de exibição. A cadeia atual é:

```
PRIORIDADE 0: texts?.headline / texts?.bullet1  (IA ou edição manual)
PRIORIDADE 1: feedCopyBenefits  (copy IA "Benefícios" — campo de texto livre)
FALLBACK:     technicalSpecs / features
```

O `productData.benefits` — que é o array de benefícios estruturado cadastrado diretamente no produto — **nunca é consultado**.

## Solução

Inserir `productData.benefits` como **PRIORIDADE 1.5**, entre o `feedCopyBenefits` e o fallback de specs:

```
PRIORIDADE 0: texts?.headline / texts?.bullet1  (IA ou edição manual)
PRIORIDADE 1: feedCopyBenefits  (copy IA)
PRIORIDADE 1.5: productData.benefits  ← NOVO
FALLBACK:     technicalSpecs / features
```

Isso significa: **se o produto tiver benefícios cadastrados e não houver copy IA gerada, esses benefícios aparecem no Card 3**.

## Mudanças Necessárias

### 1. `Slide3Technical` — Lógica de prioridade no JSX

Em `src/components/StrategicCarouselPreview.tsx`, no `else` do bloco `hasAITexts` (linha ~592–604), adicionar tratamento para `productData.benefits` **antes** do `feedCopyBenefits`:

```typescript
} else {
  // PRIORIDADE 1: Feed Copy Benefits (copy IA)
  const feedBenefits = productData.feedCopyBenefits;
  if (feedBenefits) {
    // ... lógica existente ...
  }
  // PRIORIDADE 1.5: Benefits do produto (array cadastrado no repositório) — NOVO
  else if (productData.benefits && productData.benefits.length > 0) {
    const rawBenefits = productData.benefits;
    // A primeira linha longa vira headline, o restante vira bullets
    benefitsHeadline = rawBenefits[0]?.slice(0, 80) || '';
    benefitsBullets = rawBenefits.slice(1, 5);  // até 4 bullets
  }
  // FALLBACK: specs/features já existentes (sem mudança)
}
```

### 2. Canvas (`generateSlidePNG`) — Mesmo ajuste na renderização PNG

No canvas do Slide 3 (linha ~1400-1450 em `StrategicCarouselPreview.tsx`), a mesma prioridade deve ser aplicada para que a exportação PNG também use os benefícios do produto:

```typescript
// Antes de usar specs/features como items, verificar:
const productBenefitsCanvas = texts?.bullet1
  ? null  // já tratado por aiCanvasBullets
  : (productData.benefits && productData.benefits.length > 0 ? productData.benefits : null);

const items = aiCanvasBullets.length > 0
  ? aiCanvasBullets
  : productBenefitsCanvas
    ? productBenefitsCanvas.slice(0, 5)
    : specs.length > 0
      ? specs.slice(0, 5).map(s => s.label + (s.value ? ': ' + s.value : ''))
      : features.slice(0, 5);
```

### 3. `buildDefaultSlideTexts` — Pré-popular `bullet1-4` com benefits

Em `InstagramCopyGenerator.tsx` (linha 210), o estado inicial do slide 3 é `{ title: 'Por que confiar?' }`. Adicionar pré-população com os benefits do produto no estado inicial:

```typescript
3: {
  title: 'Por que confiar?',
  headline: productBenefits?.[0] || '',
  bullet1: productBenefits?.[1] || '',
  bullet2: productBenefits?.[2] || '',
  bullet3: productBenefits?.[3] || '',
  bullet4: productBenefits?.[4] || '',
},
```

Isso garante que ao abrir o modal pela primeira vez, o Card 3 já aparece com os benefícios do produto — sem precisar clicar em "Gerar com IA".

## Arquivos Modificados

| Arquivo | Mudança | Onde |
|---|---|---|
| `src/components/StrategicCarouselPreview.tsx` | `Slide3Technical`: adicionar prioridade `productData.benefits` no `else` do `hasAITexts` | Linha ~592 |
| `src/components/StrategicCarouselPreview.tsx` | Canvas Slide 3: usar `productData.benefits` antes de specs/features | Linha ~1400 |
| `src/components/InstagramCopyGenerator.tsx` | `buildDefaultSlideTexts`: pré-popular slide 3 com benefits | Linha ~210 |

**2 arquivos, 3 mudanças localizadas.**

## Antes / Depois

| Situação | Antes | Depois |
|---|---|---|
| Produto com `benefits` cadastrados, sem IA gerada | Exibe specs técnicas ou mensagem vazia | Exibe os benefícios cadastrados como headline + bullets |
| Produto com `benefits` + copy IA gerada | IA ignorada no corpo (só título) — já corrigido antes | IA tem prioridade; benefits só aparecem se IA não gerou |
| Textos editados manualmente | Funcionam normalmente | Continuam com prioridade máxima |
| Exportação PNG | Usa specs mesmo com benefits cadastrados | Usa benefits quando disponíveis |
