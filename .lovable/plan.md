
# Slide 4 (Experiência): Usar FAQs do Produto e HTML E-commerce

## O Problema

O Slide 4 usa a função `buildImpactNarrative()` que sintetiza dados de `salesPitch`, `description`, `benefits` e `features`. O resultado é genérico porque esses campos muitas vezes têm conteúdo repetitivo ou curto demais.

O usuário quer que o Slide 4 use fontes de conteúdo mais ricas e estratégicas:
1. **FAQs do produto** — perguntas e respostas já estruturadas com o raciocínio cliente/dor/solução
2. **HTML E-commerce gerado** — texto rico já otimizado com benefícios, argumentos de venda e contexto de uso

---

## Onde estão esses dados

### FAQs (`product.faq`)
- Já existe no tipo `Product` em `ModernProductCard.tsx` (linha 94): `faq?: Array<{ question: string; answer: string }>`
- **NÃO** está sendo passado para o `InstagramCopyGenerator` nem para o `ProductData` do carrossel
- Os FAQs são a fonte mais rica: cada Q&A contém a dor (`question`) e a resolução (`answer`)

### HTML E-commerce (`product.ecommerce_html`)
- Já existe no tipo `Product` (linha 116–129): `ecommerce_html?: { html_content: string; ... }`
- Contém HTML gerado por IA com argumentos completos de venda
- Precisamos extrair o texto puro (strip HTML tags) para usar no carrossel
- **NÃO** está sendo passado para o `InstagramCopyGenerator`

---

## Estratégia de Conteúdo do Slide 4

A nova `buildImpactNarrative()` seguirá esta ordem de prioridade:

```
1. FAQs  →  headline = primeira pergunta (FAQ[0].question)
             impactText = primeira resposta (FAQ[0].answer)
             bullets = perguntas subsequentes (FAQ[1..3].question)
2. HTML E-commerce (fallback)  →  extrai primeiros 300 chars de texto limpo
3. salesPitch / description / benefits (fallback final — comportamento atual)
```

### Por que FAQs são a melhor fonte:
- `question` captura a **dor** do cliente em linguagem natural ("Como isso resolve meu problema?")
- `answer` captura a **solução** já argumentada
- Estrutura Q&A é nativa para carrossel: headline = dor, texto = resolução, bullets = mais dúvidas comuns

---

## Mudanças Técnicas

### 1. `StrategicCarouselPreview.tsx` — Expandir `ProductData` interface

Adicionar `faq` e `ecommerceHtmlText` ao interface:

```typescript
interface FAQ {
  question: string;
  answer: string;
}

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
  targetAudience?: string[];
  applications?: string;
  faq?: FAQ[];               // NOVO
  ecommerceHtmlText?: string; // NOVO — texto limpo do HTML gerado
}
```

### 2. `StrategicCarouselPreview.tsx` — Atualizar `buildImpactNarrative()`

Substituir a lógica atual pela nova lógica com prioridade FAQs → ecommerce → fallback:

```typescript
function buildImpactNarrative(productData: ProductData) {
  const faqs = productData.faq || [];
  const ecommerceText = productData.ecommerceHtmlText || '';
  const salesPitch = productData.salesPitch || '';
  const description = productData.description || '';
  const benefits = productData.benefits || [];
  const features = productData.features || [];
  const specs = productData.technicalSpecs || [];

  let headline = '';
  let impactText = '';
  let proofBullets: string[] = [];

  if (faqs.length > 0) {
    // FAQs: headline = primeira pergunta, texto = primeira resposta, bullets = mais perguntas
    headline = faqs[0].question;
    impactText = faqs[0].answer.slice(0, 250);
    // Bullets: próximas perguntas (sem a que virou headline)
    const faqBullets = faqs.slice(1, 4).map(f => f.question).filter(q => q.length < 90);
    proofBullets = faqBullets.slice(0, 3);
  } else if (ecommerceText) {
    // HTML E-commerce: usar primeiros 300 chars como texto rico
    headline = benefits[0] || features[0] || productData.name;
    impactText = ecommerceText.slice(0, 250);
    proofBullets = [benefits[1], benefits[2], features[0]].filter(Boolean).slice(0, 3);
  } else {
    // Fallback atual: salesPitch → description → benefits
    headline = benefits[0] || features[0] || productData.name || 'Resultados que transformam';
    if (salesPitch) {
      impactText = salesPitch.slice(0, 220);
    } else if (description && benefits[1]) {
      impactText = `${description.slice(0, 130)}. ${benefits[1]}`.slice(0, 220);
    } else if (description) {
      impactText = description.slice(0, 220);
    } else {
      impactText = 'Solução desenvolvida para resultados reais e consistentes.';
    }
    const specBullets = specs.slice(0, 3).map(s => `${s.label}: ${s.value}`);
    const featureBullets = features.filter(f => f !== headline && f.length < 80);
    proofBullets = [...specBullets, ...featureBullets].slice(0, 3);
  }

  return { headline, impactText, proofBullets, label: 'Perguntas & Respostas' };
}
```

O `label` agora contextualiza a origem: `"Perguntas & Respostas"` quando FAQs estão disponíveis, `"Impacto Real"` nos outros casos.

### 3. `InstagramCopyGenerator.tsx` — Adicionar props `productFaq` e `productEcommerceHtml`

**Interface (`InstagramCopyGeneratorProps`):**
```typescript
productFaq?: Array<{ question: string; answer: string }>;
productEcommerceHtml?: string; // html_content bruto
```

**Função de extração de texto limpo (inline — sem dependência nova):**
```typescript
function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
```

**No `productData` passado ao `StrategicCarouselPreview` (linha ~1959):**
```typescript
productData={{
  // ...props existentes...
  faq: productFaq,
  ecommerceHtmlText: productEcommerceHtml ? stripHtmlToText(productEcommerceHtml).slice(0, 300) : undefined,
}}
```

### 4. `ModernProductCard.tsx` — Passar `faq` e `ecommerce_html` para `InstagramCopyGenerator`

```typescript
<InstagramCopyGenerator
  // ...props existentes...
  productFaq={product.faq}
  productEcommerceHtml={product.ecommerce_html?.html_content}
/>
```

---

## Resultado Visual Esperado

| Cenário | Label | Headline | Texto Principal | Bullets |
|---|---|---|---|---|
| Produto com FAQs | "Perguntas & Respostas" | 1ª pergunta do FAQ | 1ª resposta do FAQ | Próximas 3 perguntas |
| Produto com E-commerce HTML | "Impacto Real" | `benefits[0]` | Texto extraído do HTML | `benefits[1..2]` |
| Produto sem nenhum | "Impacto Real" | `benefits[0]` | `salesPitch` ou `description` | Specs técnicas |

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | Interface `ProductData` + função `buildImpactNarrative()` |
| `src/components/InstagramCopyGenerator.tsx` | 2 novas props + função `stripHtmlToText` + passar para `productData` |
| `src/components/ModernProductCard.tsx` | Passar `product.faq` e `product.ecommerce_html?.html_content` |

**3 arquivos, mudanças cirúrgicas. Canvas do Slide 4 já usa `buildImpactNarrative()` — se atualiza automaticamente.**
