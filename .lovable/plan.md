
# Correção do Slide 1: Frases sem Contexto ("Você sabia que...")

## Diagnóstico do Problema

O hook do Slide 1 é gerado em **dois lugares** com a mesma lógica incorreta:

**1. `InstagramCopyGenerator.tsx` linha 160** — `buildDefaultSlideTexts()`:
```js
hook: b[0] ? `Você sabia que ${b[0].toLowerCase()}?` : `Descubra o segredo por trás de ${productName}`
```

**2. `StrategicCarouselPreview.tsx` linha 686** — fallback no canvas:
```js
const hookText = texts?.hook || (benefits[0] ? `Você sabia que ${benefits[0].toLowerCase()}?` : ...)
```

O `b[0]` é um **benefício completo** como `"Longa duração com mais de 5 anos de garantia"`. Ao concatenar com o prefixo:

> **"Você sabia que longa duração com mais de 5 anos de garantia?"**

Isso não é uma frase de impacto — é uma frase técnica mal formatada como pergunta retórica.

## Causa Raiz

O sistema foi pensado para que `productBenefits[0]` fosse uma frase curta e impactante (ex: `"dura mais tempo"`), mas na prática os benefícios cadastrados no repositório são **frases longas e descritivas** (ex: `"Biocompatibilidade comprovada clinicamente em pacientes"`, `"Longa durabilidade com mais de 5 anos"`).

O template `"Você sabia que {benefício}?"` só funciona quando o benefício é um **fragmento nominal curto**, não uma frase completa.

## Solução: Lógica de Hook Contextualizada

### Nova função `buildSmartHook()` em `InstagramCopyGenerator.tsx`

Criar uma função que gera hooks adequados baseados no contexto do produto, com lógica inteligente:

```ts
function buildSmartHook(): string {
  const b = productBenefits || [];
  const f = productFeatures || [];
  
  // Prioridade 1: se tiver nome do produto, fazer gancho direto sobre ele
  if (productName) {
    if (b[0]) {
      // Usar o benefício de forma diferente — não como complemento de "Você sabia que"
      // mas como punchline após o produto
      const shortBenefit = b[0].length > 50 
        ? b[0].split(' ').slice(0, 6).join(' ') + '...' 
        : b[0];
      return `${productName}: ${shortBenefit}`;
    }
    if (f[0]) {
      return `Conheça o ${productName}`;
    }
    return `${productName} vai mudar o jogo`;
  }
  return 'Descubra o segredo';
}
```

Na verdade, a abordagem mais simples e eficaz é **NÃO usar `"Você sabia que"` como template**. Em vez disso, usar ganchos de impacto direto:

**Nova lógica `buildDefaultSlideTexts` — Slide 1:**

```ts
1: {
  hook: (() => {
    const b = productBenefits || [];
    const f = productFeatures || [];
    // Gancho direto sem concatenação que cria frases sem sentido
    if (b[0] && b[0].length <= 40) {
      return `Você sabia que ${b[0].toLowerCase()}?`;   // só usa se for curto
    }
    if (productName) {
      return `${productName} vai mudar o jogo`;
    }
    return 'Descubra o segredo';
  })(),
  productName
}
```

Porém, a solução mais elegante é criar **4 templates de hook** e selecionar o mais adequado baseado no que está disponível:

```ts
function buildSmartHook(name: string, benefits: string[], features: string[]): string {
  const b = benefits || [];
  const f = features || [];

  // Template 1: Gancho de transformação — usa nome do produto
  if (name) return `${name} que vai mudar seu resultado`;

  // Template 2: Pergunta com feature curta (< 30 chars)
  const shortFeature = f.find(feat => feat && feat.length < 30);
  if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;

  // Template 3: Benefício como afirmação, não como complemento de "sabia que"
  const shortBenefit = b.find(ben => ben && ben.length < 40);
  if (shortBenefit) return shortBenefit;

  // Fallback
  return `Descubra o segredo por trás de ${name || 'nosso produto'}`;
}
```

## Implementação Final

### Arquivo: `src/components/InstagramCopyGenerator.tsx`

**Mudança 1 — Substituir a linha 160 do `buildDefaultSlideTexts`:**

```ts
// ANTES (linha 160):
1: { hook: b[0] ? `Você sabia que ${b[0].toLowerCase()}?` : `Descubra o segredo por trás de ${productName}`, productName },

// DEPOIS:
1: { hook: buildSmartHook(productName, b, f), productName },
```

**Adicionar a função `buildSmartHook` antes de `buildDefaultSlideTexts` (linha 156):**

```ts
function buildSmartHook(name: string, benefits: string[], features: string[]): string {
  // Tenta ganchos em ordem de preferência

  // 1. Feature curta em forma de pergunta (< 35 chars — funciona bem no formato "Você já ouviu falar em X?")
  const shortFeature = (features || []).find(f => f && f.length <= 35);
  if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;

  // 2. Benefício curto como afirmação impactante (< 45 chars — fica bem como headline solo)
  const shortBenefit = (benefits || []).find(b => b && b.length <= 45);
  if (shortBenefit) return `${shortBenefit.charAt(0).toUpperCase() + shortBenefit.slice(1)}`;

  // 3. Gancho direto com nome do produto
  if (name) return `${name}: a escolha que muda tudo`;

  // 4. Fallback genérico
  return 'Descubra o segredo por trás do melhor resultado';
}
```

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

**Mudança 2 — Corrigir o fallback no canvas (linha 686):**

```ts
// ANTES (linha 686):
const hookText = texts?.hook || (benefits[0] 
  ? `Você sabia que ${benefits[0].toLowerCase()}?` 
  : `Descubra o segredo por trás de ${productData.name}`);

// DEPOIS:
const hookText = texts?.hook || (() => {
  const shortFeature = (productData.features || []).find(f => f && f.length <= 35);
  if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;
  const shortBenefit = (benefits || []).find(b => b && b.length <= 45);
  if (shortBenefit) return shortBenefit.charAt(0).toUpperCase() + shortBenefit.slice(1);
  return `${productData.name}: a escolha que muda tudo`;
})();
```

**Mudança 3 — Mesmo fallback no HTML preview `Slide1Hook` (linha 245):**

```ts
// ANTES (linha 245-247):
const hook = texts?.hook || (productData.benefits?.[0]
  ? `Você sabia que ${productData.benefits[0].toLowerCase()}?`
  : `Descubra o segredo por trás de ${productData.name}`);

// DEPOIS:
const hook = texts?.hook || (() => {
  const features = productData.features || [];
  const benefits = productData.benefits || [];
  const shortFeature = features.find(f => f && f.length <= 35);
  if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;
  const shortBenefit = benefits.find(b => b && b.length <= 45);
  if (shortBenefit) return shortBenefit.charAt(0).toUpperCase() + shortBenefit.slice(1);
  return `${productData.name}: a escolha que muda tudo`;
})();
```

## Como o Hook Fica Agora — Exemplos

| Dados do produto | Hook gerado antes (quebrado) | Hook gerado depois (correto) |
|-----------------|------------------------------|------------------------------|
| Feature: "Nano-Híbrido" | "Você sabia que nano-híbrido?" | "Você já ouviu falar em Nano-Híbrido?" |
| Feature: "Tecnologia bioativa de última geração" | (muito longo) | ← pula para próxima regra |
| Benefit: "Longa duração com mais de 5 anos" | "Você sabia que longa duração com mais de 5 anos?" | ← pula (> 45 chars) |
| Benefit: "Resultados imediatos" | "Você sabia que resultados imediatos?" | "Resultados imediatos" (headline limpo) |
| Só nome: "Tetric N-Ceram" | "Descubra o segredo por trás de Tetric N-Ceram" | "Tetric N-Ceram: a escolha que muda tudo" |

## Arquivos a Modificar

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `src/components/InstagramCopyGenerator.tsx` | ~156 | Adicionar função `buildSmartHook()` |
| `src/components/InstagramCopyGenerator.tsx` | 160 | Usar `buildSmartHook()` no `buildDefaultSlideTexts` |
| `src/components/StrategicCarouselPreview.tsx` | 245–247 | Corrigir fallback hook em `Slide1Hook` (HTML) |
| `src/components/StrategicCarouselPreview.tsx` | 686 | Corrigir fallback hook no canvas `generateSlidePNG` |

## Resultado

- **Features curtas** (≤ 35 chars) → `"Você já ouviu falar em {feature}?"` — pergunta direta e impactante
- **Benefícios médios** (≤ 45 chars) → headline solo em maiúscula — clean e forte
- **Dados longos ou ausentes** → `"{Produto}: a escolha que muda tudo"` — fallback com identidade do produto
- **Nunca mais** `"Você sabia que longa duração com mais de 5 anos?"` ✅
