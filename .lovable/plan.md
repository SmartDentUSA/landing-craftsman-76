
# Correção do Hook do Slide 1: Usar o Discurso de Vendas do Produto

## Diagnóstico

O hook do Slide 1 atualmente usa `buildSmartHook(name, benefits, features)` que busca features/benefícios curtos ou cai no fallback genérico `"[Produto]: a escolha que muda tudo"`.

O problema: o `sales_pitch` do produto — que contém **exatamente** a linguagem estratégica de venda — **nunca é passado** para o `InstagramCopyGenerator`. Olhando o banco, o pitch tem frases como:

> *"O SmartMake Intensivo Mahogany é a escolha ideal para profissionais que buscam controle cromático sem precedentes..."*
> *"A fusão perfeita entre alta estética e performance mecânica..."*

São exatamente esses pontos que devem virar o gancho do Slide 1.

**Falhas em cadeia:**
1. `ModernProductCard.tsx` → não passa `product.sales_pitch` para `<InstagramCopyGenerator />`
2. `InstagramCopyGenerator` → não tem prop `productSalesPitch`
3. `buildSmartHook()` → não usa o pitch para extrair o gancho
4. `StrategicCarouselPreview.tsx` → `ProductData` não tem campo `salesPitch`

## Solução: Extrair o Gancho do Sales Pitch

### Lógica de extração do hook a partir do pitch

O `sales_pitch` é um parágrafo longo. A estratégia é extrair a **primeira frase impactante** (geralmente a mais estratégica, pois redatores colocam o gancho principal no início).

**Nova hierarquia do `buildSmartHook`:**

1. **Sales pitch (nova prioridade #1)** → Pegar a primeira frase do pitch (até o primeiro `.` ou `!` ou `,`), limitada a ~80 chars para caber no slide
2. **Feature curta (≤35 chars)** → `"Você já ouviu falar em [feature]?"` (atual prioridade 1)
3. **Benefício curto (≤45 chars)** → headline solo (atual prioridade 2)
4. **Fallback com nome** → `"[Produto]: a escolha que muda tudo"` (atual prioridade 3)

**Função de extração de frase do pitch:**
```ts
function extractHookFromSalesPitch(pitch: string, productName: string): string | null {
  if (!pitch || pitch.length < 10) return null;

  // Remove o nome do produto do início (ex: "O SmartMake Intensivo Mahogany é..." → "é a escolha ideal...")
  // Pega a primeira frase completa (até ponto final ou ! ou limite de 90 chars)
  const sentences = pitch.split(/[.!]/);
  const firstSentence = sentences[0]?.trim();

  if (!firstSentence || firstSentence.length < 15) return null;

  // Se a frase for curta o bastante para o slide (≤ 90 chars), usa diretamente
  if (firstSentence.length <= 90) return firstSentence;

  // Se for longa, pega até a primeira vírgula (cláusula principal) — mais impactante
  const firstClause = firstSentence.split(',')[0]?.trim();
  if (firstClause && firstClause.length >= 20 && firstClause.length <= 90) return firstClause;

  // Último recurso: trunca em 80 chars na última palavra
  const truncated = firstSentence.slice(0, 80).split(' ').slice(0, -1).join(' ');
  return truncated.length >= 20 ? truncated + '...' : null;
}
```

## Arquivos a Modificar

### 1. `src/components/ModernProductCard.tsx`

Adicionar `product.sales_pitch` ao chamar `<InstagramCopyGenerator>`:

```tsx
// Linha 735-750 (dentro de <InstagramCopyGenerator>):
// ADICIONAR:
productSalesPitch={product.sales_pitch}
```

### 2. `src/components/InstagramCopyGenerator.tsx`

**A) Interface de props — adicionar `productSalesPitch`:**
```ts
// No InstagramCopyGeneratorProps:
productSalesPitch?: string;
```

**B) Destructuring — adicionar `productSalesPitch`:**
```ts
export function InstagramCopyGenerator({ ..., productSalesPitch, ... })
```

**C) Função `extractHookFromSalesPitch` — adicionar antes de `buildSmartHook`:**
```ts
function extractHookFromSalesPitch(pitch: string): string | null {
  if (!pitch || pitch.length < 10) return null;
  const sentences = pitch.split(/[.!]/);
  const firstSentence = sentences[0]?.trim();
  if (!firstSentence || firstSentence.length < 15) return null;
  if (firstSentence.length <= 90) return firstSentence;
  const firstClause = firstSentence.split(',')[0]?.trim();
  if (firstClause && firstClause.length >= 20 && firstClause.length <= 90) return firstClause;
  const truncated = firstSentence.slice(0, 80).split(' ').slice(0, -1).join(' ');
  return truncated.length >= 20 ? truncated + '...' : null;
}
```

**D) Atualizar `buildSmartHook` para usar pitch como prioridade #1:**
```ts
function buildSmartHook(name: string, benefits: string[], features: string[], pitch?: string): string {
  // 1. PRIORIDADE: Extrair da primeira frase do sales_pitch (fonte mais estratégica)
  if (pitch) {
    const pitchHook = extractHookFromSalesPitch(pitch);
    if (pitchHook) return pitchHook;
  }
  // 2. Feature curta em forma de pergunta (≤ 35 chars)
  const shortFeature = (features || []).find(f => f && f.length <= 35);
  if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;
  // 3. Benefício curto como headline impactante (≤ 45 chars)
  const shortBenefit = (benefits || []).find(b => b && b.length <= 45);
  if (shortBenefit) return shortBenefit.charAt(0).toUpperCase() + shortBenefit.slice(1);
  // 4. Gancho direto com nome do produto
  if (name) return `${name}: a escolha que muda tudo`;
  // 5. Fallback genérico
  return 'Descubra o segredo por trás do melhor resultado';
}
```

**E) Passar pitch para `buildSmartHook` em `buildDefaultSlideTexts`:**
```ts
1: { hook: buildSmartHook(productName, b, f, productSalesPitch), productName },
```

### 3. `src/components/StrategicCarouselPreview.tsx`

**A) Adicionar `salesPitch` ao tipo `ProductData`:**
```ts
interface ProductData {
  name: string;
  price?: number;
  category?: string;
  benefits?: string[];
  features?: string[];
  technicalSpecs?: TechnicalSpec[];
  productUrl?: string;
  salesPitch?: string;  // ← novo
}
```

**B) Atualizar fallback do hook no `Slide1Hook` e no canvas `generateSlidePNG`** para também usar `productData.salesPitch`:

No `Slide1Hook` (linha 245):
```ts
const hook = texts?.hook || (() => {
  // Prioridade: sales pitch
  if (productData.salesPitch) {
    const sentences = productData.salesPitch.split(/[.!]/);
    const first = sentences[0]?.trim();
    if (first && first.length >= 15 && first.length <= 90) return first;
    const clause = first?.split(',')[0]?.trim();
    if (clause && clause.length >= 20 && clause.length <= 90) return clause;
  }
  const features = productData.features || [];
  const benefits = productData.benefits || [];
  const shortFeature = features.find(f => f && f.length <= 35);
  if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;
  const shortBenefit = benefits.find(b => b && b.length <= 45);
  if (shortBenefit) return shortBenefit.charAt(0).toUpperCase() + shortBenefit.slice(1);
  return `${productData.name}: a escolha que muda tudo`;
})();
```

**C) Passar `salesPitch` ao montar `productData` em `InstagramCopyGenerator.tsx`** (dentro do `<StrategicCarouselPreview>`, onde é passado o objeto `productData`):
```tsx
productData={{
  name: productName,
  category: productCategory,
  benefits: productBenefits,
  features: productFeatures,
  technicalSpecs,
  productUrl,
  salesPitch: productSalesPitch,  // ← novo
}}
```

## Resultado por Exemplo Real

| Produto | Sales Pitch (início) | Hook Gerado |
|---------|---------------------|-------------|
| SmartMake Intensivo Mahogany | "O SmartMake Intensivo Mahogany é a escolha ideal para profissionais que buscam um controle cromático..." | "O SmartMake Intensivo Mahogany é a escolha ideal para profissionais que buscam um controle cromático" |
| Atos Resina Composta DA2 | "A Atos Resina Composta Direta - DA2 é a fusão perfeita entre alta estética e performance mecânica." | "A Atos Resina Composta Direta - DA2 é a fusão perfeita entre alta estética e performance mecânica" |
| Produto sem pitch | — | feature curta ou benefício (fallback atual) |

## Resumo dos arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/ModernProductCard.tsx` | Adicionar `productSalesPitch={product.sales_pitch}` |
| `src/components/InstagramCopyGenerator.tsx` | Prop `productSalesPitch`, função `extractHookFromSalesPitch`, atualizar `buildSmartHook`, passar `salesPitch` ao `productData` |
| `src/components/StrategicCarouselPreview.tsx` | Campo `salesPitch` na interface `ProductData`, usar no `Slide1Hook` e no canvas `generateSlidePNG` |
