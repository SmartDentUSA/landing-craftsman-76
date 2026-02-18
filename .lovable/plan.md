
# Fix Slide 1: Texto Truncado + Conexão Contextual com o Slide 2

## Diagnóstico dos Dois Problemas

### Problema 1 — Texto cortado no Slide 1

O hook do Slide 1 recebe textos longos gerados pelo `buildSmartHook` (ex: "A Fronteira da Ciência Nano-Híbrida na Odontologia Digital Excelência Clínica e..."). Isso acontece porque:

- A `<div>` do hook está em `position: absolute; top: 15%` e ocupa `left: 80, right: 80` (largura de ~920px no canvas 1080px)
- Com `fontSize: 58` e textos longos, o texto transborda verticalmente para dentro da área da imagem (que começa em 60% do slide)
- O `<p>` não tem altura máxima limitada, e visualmente o texto fica sobreposto à imagem ou simplesmente desaparece atrás dela
- No canvas export, o `wrapText` com `lineHeight: 92` empurra linhas para baixo de `H * 0.17 = 229px`, ultrapassando facilmente os 540px da área disponível

**Solução:** Reduzir o `lineHeight` do canvas para `70` (adequado para 58px) e adicionar uma altura máxima segura na `<div>` do JSX — além de limitar o texto do hook a no máximo ~120 caracteres no `buildSmartHook`.

### Problema 2 — Slide 2 não contextualiza o Slide 1

Atualmente:
- **Slide 1** mostra: hook + nome do produto (o hook fala sobre a tecnologia/pitch, sem pedir para "ver a seguir")
- **Slide 2** mostra: categoria + nome + imagem (apresentação fria, sem conectar com o gancho do slide anterior)

O usuário quer que o Slide 2 dê **contexto** — ou seja, que a frase do Slide 1 faça o leitor "querer passar para o próximo". A solução é:

1. **No Slide 2 (JSX)**: Adicionar uma pequena frase de transição ("Apresentando:" ou "Conheça o") acima do nome do produto, tornando o Slide 2 uma revelação do que foi prometido no Slide 1
2. **No Slide 1 (canvas e JSX)**: Adicionar uma chamada de ação sutil no rodapé inferior do texto do hook ("👇 Deslize para conhecer") para criar tensão narrativa entre os slides
3. **No `buildSmartHook`**: Garantir que o texto retornado seja sempre curto o suficiente (máx. 100 chars) para não truncar

## Mudanças Técnicas

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

#### Fix 1 — JSX Slide 1: limitar altura e evitar transbordamento

```tsx
// ANTES (linha 345):
<div style={{ position: 'absolute', top: '15%', left: 80, right: 80, textAlign: 'center' }}>
  <p style={{ color: textColor, fontWeight: 400, fontSize: 58, lineHeight: 1.2, margin: 0, ... }}>{hook}</p>
</div>

// DEPOIS:
<div style={{ position: 'absolute', top: '12%', left: 80, right: 80, textAlign: 'center', maxHeight: '30%', overflow: 'hidden' }}>
  <p style={{ color: textColor, fontWeight: 400, fontSize: 52, lineHeight: 1.25, margin: 0, ... }}>{hook}</p>
</div>
```
- `top: '15%'` → `top: '12%'` (mais espaço vertical)
- `fontSize: 58` → `fontSize: 52` (cabe mais texto sem transbordar)
- `maxHeight: '30%'` com `overflow: 'hidden'` garante que texto longo nunca ultrapassa a imagem
- Adicionar abaixo do `<p>` uma pequena legenda de transição: `"👇 Deslize para ver"` em fonte 28, opacidade 0.8

#### Fix 2 — JSX Slide 2: adicionar frase de transição/revelação

```tsx
// Adicionar ACIMA do nome do produto:
<div style={{ textAlign: 'center', marginBottom: 12 }}>
  <span style={{ fontSize: 32, fontWeight: 400, color: '#888', letterSpacing: 3, textTransform: 'uppercase' }}>
    Apresentando
  </span>
</div>
<h2 style={{ margin: 0, fontSize: 68, fontWeight: 900, color: '#111', lineHeight: 1.1 }}>{name}</h2>
```

Este "Apresentando" (ou "Conheça o", editável pelo campo `introLabel` no editor) conecta o gancho do Slide 1 com a revelação do produto no Slide 2.

#### Fix 3 — SLIDE_EDITOR_FIELDS: adicionar campo `introLabel` no Slide 2

```ts
2: [
  { key: 'category', label: 'Categoria', type: 'input' },
  { key: 'introLabel', label: 'Frase de introdução (ex: Apresentando)', type: 'input' },
  { key: 'productName', label: 'Nome do produto', type: 'input' },
  { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
],
```

#### Fix 4 — SlideTextsType: adicionar `introLabel` em key `2`

```ts
2: { category: string; introLabel?: string; productName: string; imageScale?: string };
```

#### Fix 5 — Canvas Slide 1: corrigir lineHeight para não truncar

```ts
// ANTES (linha 842):
wrapText(ctx, hookText, W / 2, H * 0.17, W - 160, 92, 'center');

// DEPOIS:
wrapText(ctx, hookText, W / 2, H * 0.14, W - 160, 70, 'center');
```
- `lineHeight: 92` → `70` (correto para 58px de fonte, equivalente a `lineHeight: 1.2`)
- `H * 0.17` → `H * 0.14` (mais espaço acima)

Adicionalmente, após o hook, renderizar a frase de transição no canvas:

```ts
ctx.font = '400 32px system-ui, -apple-system, sans-serif';
ctx.globalAlpha = 0.75;
ctx.fillText('👇 Deslize para conhecer', W / 2, H * 0.45);
ctx.globalAlpha = 1;
```

#### Fix 6 — Canvas Slide 2: renderizar `introLabel`

```ts
// Antes de renderizar o productName no canvas Slide 2:
const introLabel = texts?.introLabel || 'Apresentando';
ctx.font = '400 32px system-ui, -apple-system, sans-serif';
ctx.fillStyle = '#888888';
ctx.letterSpacing = '3px';
ctx.fillText(introLabel.toUpperCase(), W / 2, productNameY - 60);
```

### Arquivo: `src/components/InstagramCopyGenerator.tsx`

#### Fix 7 — `buildSmartHook`: truncar em 100 caracteres para evitar textos longos

```ts
// ANTES (linha 170):
function buildSmartHook(name: string, benefits: string[], features: string[], pitch?: string): string {
  if (pitch) {
    const sentences = pitch.split(/[.!]/);
    const first = sentences[0]?.trim();
    if (first && first.length >= 15 && first.length <= 90) return first;
    const clause = first?.split(',')[0]?.trim();
    if (clause && clause.length >= 20 && clause.length <= 90) return clause;
    ...
  }
}

// DEPOIS: reduzir limite máximo de 90 → 80 e truncar fallbacks também
function buildSmartHook(name: string, benefits: string[], features: string[], pitch?: string): string {
  if (pitch) {
    const sentences = pitch.split(/[.!]/);
    const first = sentences[0]?.trim();
    if (first && first.length >= 15 && first.length <= 80) return first;
    const clause = first?.split(',')[0]?.trim();
    if (clause && clause.length >= 20 && clause.length <= 80) return clause;
    // Truncar no limite de 80 chars na última palavra inteira
    const truncated = (first || '').slice(0, 80).split(' ').slice(0, -1).join(' ');
    if (truncated.length >= 20) return truncated;
  }
  // Sem pitch: nome do produto (curto por natureza)
  return name;
}
```

#### Fix 8 — `setSlideTexts` inicial: incluir `introLabel` default no Slide 2

```ts
// Linha ~186:
2: { category: productCategory || '', introLabel: 'Apresentando', productName },
```

## Resumo Visual

```text
SLIDE 1 (ANTES)                    SLIDE 1 (DEPOIS)
┌─────────────────────┐            ┌─────────────────────┐
│ [1]                 │            │ [1]                 │
│                     │            │                     │
│ "A Fronteira da     │            │ "Fronteira da       │
│  Ciência Nano-Hí... │ ← CORTADO  │  Ciência Nano-      │
│  [texto desaparece] │            │  Híbrida"           │
│                     │            │                     │
│ ████████████████    │            │ 👇 Deslize para     │
│ [imagem produto]    │            │    conhecer         │
│                     │            │                     │
│ Nome do Produto     │            │ ████████████████    │
└─────────────────────┘            │ [imagem produto]    │
                                   │ Nome do Produto     │
                                   └─────────────────────┘

SLIDE 2 (ANTES)                    SLIDE 2 (DEPOIS)
┌─────────────────────┐            ┌─────────────────────┐
│ [2]   CATEGORIA     │            │ [2]   CATEGORIA     │
│                     │            │                     │
│   [imagem produto]  │            │   [imagem produto]  │
│                     │            │                     │
│   Nome do Produto   │            │   APRESENTANDO      │← novo
│                     │            │   Nome do Produto   │
└─────────────────────┘            └─────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Mudanças |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | Fix 1 (JSX Slide 1), Fix 2 (JSX Slide 2), Fix 3 (editor fields), Fix 4 (type), Fix 5 (canvas Slide 1 lineHeight), Fix 6 (canvas Slide 2 introLabel) |
| `src/components/InstagramCopyGenerator.tsx` | Fix 7 (buildSmartHook limite 80 chars), Fix 8 (default introLabel) |
