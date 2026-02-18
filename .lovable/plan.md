
# Slide 4 (Experiência): Síntese Inteligente de Impacto da Solução

## O Problema Real

O Slide 4 atualmente exibe dados brutos do produto — apenas o `salesPitch` ou a `description` — sem nenhuma inteligência de síntese. O resultado é um texto genérico e desconectado da dor do cliente.

O que o usuário quer: o sistema deve **analisar todo o contexto do produto** (benefits, features, technicalSpecs, salesPitch, description, target_audience) e **sintetizar automaticamente** uma narrativa focada em:

1. A **dor** que o produto resolve (problema do cliente)
2. O **impacto** concreto da solução na vida do cliente
3. **Provas técnicas** que sustentam a afirmação (specs, features)

---

## Abordagem: Função de Síntese Inteligente no Frontend

Sem latência de IA, criamos uma função `buildImpactNarrative()` que usa lógica de prioridade e combinação para construir um texto orientado a impacto com **todos os dados disponíveis**.

### Estrutura do Slide 4 Redesenhado

Em vez de um único texto longo, o slide passa a ter 3 camadas visuais:

```
[ RÓTULO CONTEXTUAL ] — ex: "Impacto Real"
[ DIVIDER ACCENT ]
[ HEADLINE: Benefício principal extraído ] — maior, impactante
[ TEXTO DE IMPACTO: síntese da dor + resolução ] — 2–3 frases
[ PROVAS TÉCNICAS: até 3 bullets com ícone ] — features ou specs chave
```

---

## Função `buildImpactNarrative()`

A função analisa os dados nesta ordem de prioridade:

**1. Headline (impacto principal)**
- Prioridade: `benefits[0]` → `features[0]` → `name`
- O primeiro benefício tende a ser o mais estratégico/impactante

**2. Texto de impacto (narrativa da dor → resolução)**
- Se `salesPitch` existe: usar integralmente (é o pitch de vendas)
- Se não: combinar `description` + `benefits[1]` com conector `". "` para criar narrativa
- Se só `benefits` existem: concatenar os 2 primeiros com ` — `
- Limitar a 220 chars para garantir legibilidade

**3. Bullets de prova técnica (até 3 itens)**
- Pool: `technicalSpecs[0..2]` formatados como `"${label}: ${value}"` + `features` restantes + `benefits` restantes
- Seleciona os 3 mais curtos/impactantes (evita bullets muito longos)
- Exclui o que já aparece no headline

**4. Label contextual**
- `"Impacto Real"` como padrão fixo (mais impactante que "Experiência com [Nome]")
- Ou `texts?.label` se o usuário editou manualmente

---

## Mudanças Técnicas

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

**Seção 1 — `interface ProductData` (linha 12)**

Adicionar `targetAudience` e `applications` ao interface:

```typescript
interface ProductData {
  name: string;
  price?: number;
  category?: string;
  description?: string;
  benefits?: string[];
  features?: string[];
  technicalSpecs?: TechnicalSpec[];
  productUrl?: string;
  salesPitch?: string;
  targetAudience?: string[];   // NOVO
  applications?: string;       // NOVO
}
```

**Seção 2 — Nova função `buildImpactNarrative()` (inserir antes do `Slide4Experience`)**

```typescript
function buildImpactNarrative(productData: ProductData): {
  headline: string;
  impactText: string;
  proofBullets: string[];
  label: string;
} {
  const benefits = (productData.benefits as string[]) || [];
  const features = (productData.features as string[]) || [];
  const specs = productData.technicalSpecs || [];
  const salesPitch = productData.salesPitch || '';
  const description = productData.description || '';
  const name = productData.name || '';

  // 1. Headline — benefício mais impactante
  const headline = benefits[0] || features[0] || name || 'Resultados que transformam';

  // 2. Texto de impacto
  let impactText = '';
  if (salesPitch) {
    impactText = salesPitch.slice(0, 220);
  } else if (description && benefits[1]) {
    impactText = `${description.slice(0, 140)}. ${benefits[1]}`;
  } else if (description) {
    impactText = description.slice(0, 220);
  } else if (benefits.length >= 2) {
    impactText = `${benefits[1]}${benefits[2] ? ` — ${benefits[2]}` : ''}`;
  } else {
    impactText = 'Solução desenvolvida para resultados reais e consistentes.';
  }

  // 3. Bullets de prova técnica (excluir o headline)
  const specBullets = specs.slice(0, 3).map(s => `${s.label}: ${s.value}`);
  const featureBullets = features.filter(f => f !== headline);
  const benefitBullets = benefits.filter(b => b !== headline).slice(1);
  
  const allBullets = [...specBullets, ...featureBullets, ...benefitBullets]
    .filter(Boolean)
    .filter(b => b.length < 80) // evita bullets muito longos
    .slice(0, 3);

  return {
    headline,
    impactText,
    proofBullets: allBullets,
    label: 'Impacto Real',
  };
}
```

**Seção 3 — `Slide4Experience` JSX (linhas 509–588)**

Substituir toda a lógica de dados por chamada à `buildImpactNarrative()`:

```typescript
function Slide4Experience({ image, primaryColor, productData, texts }) {
  const { headline, impactText, proofBullets, label } = buildImpactNarrative(productData);

  // Respeitar edições manuais do usuário
  const finalLabel = texts?.label || label;
  const finalKeyword = texts?.keyword || headline;
  const finalImpact = texts?.benefit || impactText;
  const finalBullets = proofBullets;

  // Auto-sizing calibrado para conteúdo rico
  const kwFontSize = finalKeyword.length > 50 ? 38 : finalKeyword.length > 35 ? 46 : finalKeyword.length > 22 ? 56 : 68;
  const labelFontSize = 22;
  const impactFontSize = finalImpact.length > 180 ? 20 : finalImpact.length > 120 ? 22 : finalImpact.length > 70 ? 25 : 28;

  // JSX com estrutura: Label → Divider → Headline → Texto de Impacto → Bullets
}
```

**Seção 4 — Canvas `drawCanvas` (linhas 1125–1240)**

Sincronizar com a mesma `buildImpactNarrative()` para garantir que o PNG exportado espelhe o preview:

```typescript
} else if (slideNum === 4) {
  const { headline, impactText, proofBullets, label: defaultLabel } = buildImpactNarrative(productData);
  
  const keyword = texts?.keyword || headline;
  const mainText = texts?.benefit || impactText;
  const label4 = texts?.label || defaultLabel;
  const bulletPool4 = proofBullets;
  // ... resto da lógica de renderização
}
```

**Seção 5 — `InstagramCopyGenerator.tsx` (linha 1957–1966)**

Passar `targetAudience` e `applications` para `productData`:

```typescript
productData={{
  name: productName,
  price: productPrice,
  category: productCategory,
  description: productDescription,
  benefits: productBenefits,
  features: productFeatures,
  technicalSpecs: technicalSpecs,
  productUrl: productUrl,
  salesPitch: productSalesPitch,
  targetAudience: productTargetAudience,   // NOVO
  applications: productApplications,        // NOVO
}}
```

E adicionar as novas props em `InstagramCopyGeneratorProps` e o parâmetro na função.

**Seção 6 — `ModernProductCard.tsx` (linha 735–752)**

Passar `target_audience` e `applications` para o `InstagramCopyGenerator`:

```typescript
productTargetAudience={product.target_audience}
productApplications={product.applications}
```

---

## Resultado Visual Esperado

| Elemento | Antes | Depois |
|---|---|---|
| Label | "Experiência com [Nome]" | "Impacto Real" (direto e focado) |
| Headline | `features[0]` curto | `benefits[0]` — o impacto mais estratégico |
| Texto principal | `salesPitch` bruto ou `description` genérico | Síntese inteligente: dor → resolução |
| Bullets | `features` + `benefits` genéricos | `technicalSpecs` + features curtas como provas técnicas |

---

## Arquivos a Modificar

| Arquivo | Seções |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | Interface + nova função + Slide4 JSX + Canvas |
| `src/components/InstagramCopyGenerator.tsx` | Props + productData object |
| `src/components/ModernProductCard.tsx` | Props passadas ao InstagramCopyGenerator |

**3 arquivos, mudanças cirúrgicas.**
