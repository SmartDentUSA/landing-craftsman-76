
# Correção do Slide 1: Hook Usando Apenas o Discurso de Vendas Real

## Diagnóstico Definitivo

Existem **dois problemas distintos** causando alucinações no hook do Slide 1:

### Problema 1 — Valor "preso" no banco (principal causa)
No `loadExistingCopies` (linha 266–267 de `InstagramCopyGenerator.tsx`):
```ts
if (copies?.visual_carousel_texts) {
  setSlideTexts(copies.visual_carousel_texts);  // ← hook antigo/alucinado vem daqui
```

Quando `visual_carousel_texts` já foi salvo no banco (de uma sessão anterior com conteúdo gerado por IA ou genérico), o hook do Slide 1 fica **preso nesse valor antigo** e nunca é recalculado. O `buildSmartHook` não é chamado nesse caminho.

### Problema 2 — Fallbacks adicionam texto genérico inventado
Na função `buildSmartHook` (linha 169–185), quando não há `sales_pitch`:
- `"Você já ouviu falar em {feature}?"` → adiciona palavras que não existem no produto
- `"Biocompatível"`, `"5 Anos de Casos"`, `"Qualidade Premium"` (linhas 194–195 de `buildDefaultSlideTexts`) → texto 100% genérico não relacionado ao produto específico

O usuário quer que **apenas o `sales_pitch` real do produto** seja usado. Se não há `sales_pitch`, mostrar algo neutro baseado apenas no nome do produto — sem inventar características.

## Solução Cirúrgica

### Arquivo: `src/components/InstagramCopyGenerator.tsx`

**Fix 1 — `loadExistingCopies`: ao carregar textos salvos, SEMPRE recalcular o hook do Slide 1 com o `sales_pitch` atual**

O `sales_pitch` pode ter sido atualizado após o último salvamento do carrossel. A solução é: ao carregar `visual_carousel_texts` do banco, substituir o `hook` do slide 1 pelo valor derivado do `sales_pitch` atual:

```ts
// ANTES (linha 266–277):
if (copies?.visual_carousel_texts) {
  setSlideTexts(copies.visual_carousel_texts);
  ...
} else {
  setSlideTexts(buildDefaultSlideTexts());
}

// DEPOIS:
if (copies?.visual_carousel_texts) {
  const savedTexts = copies.visual_carousel_texts;
  // Sempre recalcular o hook do Slide 1 a partir do sales_pitch atual
  const freshHook = buildSmartHook(productName, productBenefits || [], productFeatures || [], productSalesPitch);
  setSlideTexts({
    ...savedTexts,
    1: {
      ...savedTexts[1],
      hook: freshHook,
      productName: productName,
    }
  });
  ...
} else {
  setSlideTexts(buildDefaultSlideTexts());
}
```

**Fix 2 — `buildSmartHook`: remover todos os fallbacks com texto genérico/inventado**

Quando não há `sales_pitch`, não inventar nada. Usar apenas o nome do produto de forma neutra:

```ts
// ANTES:
function buildSmartHook(name, benefits, features, pitch?): string {
  // 1. sales_pitch
  if (pitch) { ... }
  // 2. "Você já ouviu falar em {feature}?"  ← inventa texto
  const shortFeature = features.find(f => f.length <= 35);
  if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;
  // 3. benefício curto  ← pode ser texto longo/sem sentido
  const shortBenefit = benefits.find(b => b.length <= 45);
  if (shortBenefit) return shortBenefit;
  // 4. "{name}: a escolha que muda tudo"  ← "a escolha que muda tudo" é inventado
  if (name) return `${name}: a escolha que muda tudo`;
  return 'Descubra o segredo por trás do melhor resultado';  // ← 100% inventado
}

// DEPOIS — apenas dados reais do produto:
function buildSmartHook(name, benefits, features, pitch?): string {
  // 1. ÚNICA prioridade real: extrair do sales_pitch
  if (pitch) {
    const pitchHook = extractHookFromSalesPitch(pitch);
    if (pitchHook) return pitchHook;
  }
  // 2. Se não há pitch: usar apenas o nome do produto (sem adicionar palavras)
  if (name) return name;
  // 3. Fallback absolutamente neutro
  return 'Produto';
}
```

**Fix 3 — `buildDefaultSlideTexts`: remover textos inventados dos outros slides**

Na linha 194–195, os slides 4 e 5 têm fallbacks completamente inventados:
```ts
// ANTES:
4: { label: 'EXPERIÊNCIA', keyword: f[0] || 'Excelência', benefit: b[2] || b[1] || b[0] || 'Resultados excepcionais em cada uso' },
5: { ..., badge1: f[1] || f[0] || 'Biocompatível', badge2: f[2] || b[1] || '5 Anos de Casos', badge3: f[3] || b[2] || 'Qualidade Premium' },

// DEPOIS — usar apenas dados reais, sem fallback inventado:
4: { label: 'EXPERIÊNCIA', keyword: f[0] || '', benefit: b[2] || b[1] || b[0] || '' },
5: { ..., badge1: f[1] || f[0] || '', badge2: f[2] || b[1] || '', badge3: f[3] || b[2] || '' },
```

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

**Fix 4 — `Slide1Hook`: fallback do hook sem texto inventado**

Na linha 246–262, o fallback do hook (quando `texts?.hook` não existe) tem os mesmos problemas:
```ts
// ANTES:
const hook = texts?.hook || (() => {
  if (productData.salesPitch) { ... }
  const shortFeature = features.find(f => f.length <= 35);
  if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;  // inventa
  const shortBenefit = benefits.find(b => b.length <= 45);
  if (shortBenefit) return shortBenefit;
  return `${productData.name}: a escolha que muda tudo`;  // inventa "a escolha que muda tudo"
})();

// DEPOIS:
const hook = texts?.hook || (() => {
  // Somente o sales_pitch é fonte legítima para o gancho
  if (productData.salesPitch) {
    const sentences = productData.salesPitch.split(/[.!]/);
    const first = sentences[0]?.trim();
    if (first && first.length >= 15 && first.length <= 90) return first;
    const clause = first?.split(',')[0]?.trim();
    if (clause && clause.length >= 20 && clause.length <= 90) return clause;
    // pitch existe mas é muito longo: truncar na última palavra
    const truncated = (first || '').slice(0, 80).split(' ').slice(0, -1).join(' ');
    if (truncated.length >= 20) return truncated + '...';
  }
  // Sem pitch: apenas o nome do produto
  return productData.name || '';
})();
```

## Resumo das mudanças

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `InstagramCopyGenerator.tsx` | 266–277 | Ao carregar dados do banco, recalcular o hook do Slide 1 com `sales_pitch` atual |
| `InstagramCopyGenerator.tsx` | 169–185 | `buildSmartHook` usa apenas `sales_pitch`; fallback é só o nome do produto |
| `InstagramCopyGenerator.tsx` | 194–195 | Remover fallbacks inventados (`'Biocompatível'`, `'Qualidade Premium'`, etc.) |
| `StrategicCarouselPreview.tsx` | 246–262 | Fallback do `Slide1Hook` usa só `salesPitch` ou nome do produto |

## Comportamento Final

| Situação | Texto no Slide 1 (antes) | Texto no Slide 1 (depois) |
|----------|--------------------------|---------------------------|
| Produto com `sales_pitch` | Aleatório/alucinado (banco antigo) | Primeira frase do `sales_pitch` real |
| Produto com `sales_pitch` muito longo | Truncado na vírgula ou 80 chars | Idem — correto |
| Produto SEM `sales_pitch` | `"Você já ouviu falar em Nano-Híbrido?"` (inventado) | `"Tetric N-Ceram"` (só o nome real) |
| Banco com valor antigo salvo | Valor antigo preso (nunca atualizado) | Recalculado do `sales_pitch` atual ao abrir |

