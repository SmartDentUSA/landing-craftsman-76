
# Slides 3 e 4: Usar Copies de Feed (Benefits + Problem/Solution)

## O Que o Usuário Quer

O sistema já gera 4 variações de "Copy para Feed" por IA:
- **Variação 2 — Benefits** (`feedCopies[1].copy`): copy focada em benefícios
- **Variação 3 — Problem/Solution** (`feedCopies[2].copy`): copy com estrutura dor → solução

Essas copies já estão salvas no banco (campo `instagram_copies.feed_copies`). O usuário quer que os **Slides 3 e 4** do carrossel visual usem esses textos ricos como fonte de conteúdo.

---

## Mapeamento Proposto

| Slide | Fonte atual | Nova fonte (preferencial) |
|---|---|---|
| **Slide 3** — Diferenciais | `technicalSpecs` + `features` | **Feed Copy #2 — Benefits** |
| **Slide 4** — Experiência | FAQs → ecommerceHtml → salesPitch | **Feed Copy #3 — Problem/Solution** → FAQs → ecommerceHtml → salesPitch |

---

## Mudanças Técnicas

### 1. `InstagramCopyGenerator.tsx` — Passar copies para `StrategicCarouselPreview`

Adicionar duas novas props ao `productData` do `StrategicCarouselPreview`:

```typescript
productData={{
  // ...props existentes...
  faq: productFaq,
  ecommerceHtmlText: productEcommerceHtml ? stripHtmlToText(productEcommerceHtml).slice(0, 300) : undefined,
  feedCopyBenefits: feedCopies.find(v => v.approach === 'benefits')?.copy || undefined,       // NOVO
  feedCopyProblemSolution: feedCopies.find(v => v.approach === 'problem_solution')?.copy || undefined, // NOVO
}}
```

Isso aproveita os dados **já carregados** do banco — sem nenhuma chamada extra.

### 2. `StrategicCarouselPreview.tsx` — Expandir interface `ProductData`

```typescript
interface ProductData {
  // ...campos existentes...
  faq?: FAQ[];
  ecommerceHtmlText?: string;
  feedCopyBenefits?: string;        // NOVO — variação Benefits do Feed
  feedCopyProblemSolution?: string; // NOVO — variação Problem/Solution do Feed
}
```

### 3. `StrategicCarouselPreview.tsx` — Slide 3: Usar `feedCopyBenefits`

O **Slide 3** (`Slide3Technical`) exibe uma lista de bullets com specs/features. A nova lógica:

- **Se `feedCopyBenefits` existe**: exibir o texto diretamente no painel direito do slide (como parágrafo rico), em vez de uma lista de specs
- **Fallback**: comportamento atual (specs técnicas + features)

O título (`texts?.title || 'Por que confiar?'`) permanece editável normalmente.

**Layout do Slide 3 com feedCopyBenefits**:
- Lado esquerdo: imagem do produto (igual ao atual)
- Lado direito: título + divider + **texto da copy Benefits** em fonte fluida (tamanho auto-sizing por comprimento)

### 4. `StrategicCarouselPreview.tsx` — Slide 4: Usar `feedCopyProblemSolution`

A função `buildImpactNarrative()` ganha uma nova **prioridade 0** — antes dos FAQs:

```typescript
function buildImpactNarrative(productData: ProductData) {
  // NOVA Prioridade 0: Feed Copy Problem/Solution
  if (productData.feedCopyProblemSolution) {
    const copy = productData.feedCopyProblemSolution;
    // Extrai headline: primeira linha não-vazia
    const lines = copy.split('\n').map(l => l.trim()).filter(Boolean);
    const headline = lines[0]?.slice(0, 80) || productData.name;
    // Corpo: demais linhas até 250 chars
    const body = lines.slice(1).join(' ').slice(0, 250);
    // Bullets: linhas que começam com emoji ou hífen (listas)
    const bulletLines = lines.filter(l => /^[•\-💸⏳✅🔥⚡🎯]/.test(l)).slice(0, 3);
    return {
      headline,
      impactText: body || copy.slice(0, 250),
      proofBullets: bulletLines,
      label: 'Problema & Solução',
    };
  }

  // Prioridade 1: FAQs (comportamento atual)
  // ...resto da função sem mudanças
}
```

### 5. Canvas PNG — `generateSlidePNG()` no `InstagramCopyGenerator.tsx`

O `productData` passado para `generateSlidePNG()` (linha 805) já usa os campos do `productData` básico. Precisamos incluir os novos campos para que o export PNG também use as copies:

```typescript
const productData = {
  name: productName,
  // ...campos existentes...
  feedCopyBenefits: feedCopies.find(v => v.approach === 'benefits')?.copy || undefined,
  feedCopyProblemSolution: feedCopies.find(v => v.approach === 'problem_solution')?.copy || undefined,
};
```

---

## Hierarquia de Conteúdo Final

### Slide 3 — Diferenciais
```
1. feedCopyBenefits (copy IA gerada — mais rica)
2. technicalSpecs (comportamento atual)
3. features (fallback final)
```

### Slide 4 — Experiência
```
1. feedCopyProblemSolution (copy IA com estrutura dor → solução)
2. FAQs do produto (perguntas e respostas estruturadas)
3. ecommerceHtmlText (HTML gerado limpo)
4. salesPitch / description / benefits (fallback final)
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | Interface `ProductData` + `buildImpactNarrative()` + `Slide3Technical` |
| `src/components/InstagramCopyGenerator.tsx` | `productData` no `StrategicCarouselPreview` + `productData` no export ZIP |

**2 arquivos, mudanças cirúrgicas. Zero chamadas de API extras — usa dados já carregados.**
