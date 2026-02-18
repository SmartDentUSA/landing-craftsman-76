
# Correção Definitiva: Hook do Slide 1 gerado pela IA usa dados inventados

## Causa Raiz (2 vetores)

### Vetor 1 — Edge function `generate-instagram-carousel/index.ts`
A query ao banco **não inclui `sales_pitch`**:
```ts
.select('name, benefits, features, keywords, applications, target_audience')
// ← sales_pitch ausente
```
O prompt da IA pede um "Gancho impactante" sem restrição, então a IA **inventa livremente** frases como "Como transformar substratos escurecidos em sorrisos vibrantes e naturais".

### Vetor 2 — Frontend `InstagramCopyGenerator.tsx` linha 805
Ao receber o resultado da IA, o Slide 1 é sobrescrito com o texto da IA:
```ts
1: { ...(prev[1] as any), hook: s[0]?.text || ... }
```
Isso **ignora completamente** o `buildSmartHook` com `sales_pitch` que implementamos. O hook gerado pela IA sempre vence.

## Solução

### Fix 1 — Edge function: incluir `sales_pitch` no SELECT e usá-lo no prompt

Adicionar `sales_pitch` ao SELECT e instruir a IA a usar **apenas** o discurso de vendas real para o Slide 1 (gancho):

```ts
// ANTES:
.select('name, benefits, features, keywords, applications, target_audience')

// DEPOIS:
.select('name, benefits, features, keywords, applications, target_audience, sales_pitch')
```

E adicionar no prompt instrução explícita:

```
REGRA ANTI-ALUCINAÇÃO (OBRIGATÓRIA):
- O texto do Slide 1 (gancho/capa) deve ser extraído EXCLUSIVAMENTE do campo "DISCURSO DE VENDAS" abaixo.
- Use apenas a primeira frase significativa do discurso de vendas como gancho.
- NÃO invente, NÃO parafraseie com palavras próprias, NÃO use termos que não estejam no discurso de vendas.
- Se não houver discurso de vendas, use APENAS o nome do produto.
```

E no `userPrompt`, adicionar o `sales_pitch`:
```
DISCURSO DE VENDAS (USE EXCLUSIVAMENTE PARA O SLIDE 1 - GANCHO):
${product.sales_pitch || 'Não disponível — use apenas o nome do produto'}
```

### Fix 2 — Frontend: ao aplicar resultado da IA, o Slide 1 usa sempre `buildSmartHook`

Na linha 803-808 de `InstagramCopyGenerator.tsx`, ao aplicar os slides gerados pela IA, o hook do Slide 1 deve ser **sempre recalculado** via `buildSmartHook` — nunca usar o texto inventado pela IA:

```ts
// ANTES (linha 805):
setSlideTexts(prev => ({
  ...prev,
  1: { ...(prev[1] as any), hook: s[0]?.text || (prev[1] as any)?.hook || '' },
  ...
}));

// DEPOIS:
setSlideTexts(prev => ({
  ...prev,
  1: {
    ...(prev[1] as any),
    // Slide 1: SEMPRE usar o sales_pitch real — nunca o texto gerado pela IA
    hook: buildSmartHook(productName, productBenefits || [], productFeatures || [], productSalesPitch),
  },
  3: { ...(prev[3] as any), title: s[2]?.title || (prev[3] as any)?.title || 'Por que confiar?' },
  4: { ...(prev[4] as any), keyword: s[3]?.title || (prev[4] as any)?.keyword || '', benefit: s[3]?.text || (prev[4] as any)?.benefit || '' },
  6: { ...(prev[6] as any), ctaButton: s[6]?.text?.split('\n')[0] || (prev[6] as any)?.ctaButton || '🛒 Comprar Agora' },
}));
```

O Fix 2 é a **proteção definitiva**: mesmo que a IA retorne um hook inventado, ele é descartado e substituído pelo `buildSmartHook` com o `sales_pitch` real.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-instagram-carousel/index.ts` | Adicionar `sales_pitch` ao SELECT e ao prompt com instrução anti-alucinação |
| `src/components/InstagramCopyGenerator.tsx` | Linha 805: ao aplicar resultado da IA, Slide 1 sempre usa `buildSmartHook` |

## Comportamento Final

| Situação | Hook antes (quebrado) | Hook depois (correto) |
|----------|----------------------|----------------------|
| Usuário clica "Gerar com IA" | IA inventa "Como transformar substratos escurecidos..." | `buildSmartHook` sobrescreve com 1ª frase do `sales_pitch` |
| Modal abre sem dados salvos | Texto da última geração da IA preso | `buildSmartHook` recalcula do `sales_pitch` atual |
| Produto sem `sales_pitch` | Texto inventado | Apenas o nome do produto |
