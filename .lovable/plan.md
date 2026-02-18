
# Slide 2: Imagem Maior, Slider de Escala + Editor com Formatação

## Problemas Identificados

Analisando os screenshots e o código em `StrategicCarouselPreview.tsx`:

### 1. Slide 2 — Imagem pequena
- No preview React (JSX): `maxWidth: '70%'` e `maxHeight: 100%` com `flex: 1`
- No canvas export: `maxW = W * 0.70` (756px) e `maxH = 600px` — muito restritivo para uma imagem que deve ser o centro da composição
- Correção: aumentar para `maxW = W * 0.88` e `maxH = 780px` no canvas; no JSX mudar para `maxWidth: '88%'` e `maxHeight: '75%'`

### 2. Textos truncados no Slide 5 (badges) e Slide 6 (CTA)
- No Slide 5, os badges usam CSS `-webkit-line-clamp: 2` em `<span>` — quando o texto é longo como "Biocompatibilidade comprovada seg..." aparece cortado
- No canvas do Slide 6, `truncateToWidth` corta o texto do botão CTA: "...vação clínica. Clique no link da bio"
- Correção: no JSX do Slide 5, trocar para `overflow: 'visible'` e `display: 'block'`; no canvas Slide 6, usar `wrapText` em vez de `truncateToWidth`

### 3. Sem formatação no editor de texto dos cards
- O `SlideWrapper` usa apenas `<Input>` e `<Textarea>` simples, sem negrito/itálico
- Correção: adicionar mini toolbar com Bold (**), Itálico (*), maiúsculas (AA) para campos `textarea`

### 4. Slide 2 — Slider de escala da imagem dentro do card
- O usuário quer poder ampliar/reduzir a imagem do Slide 2 sem perder proporção
- Implementar via novo campo `imageScale` no `slideTexts[2]` (valor de 60 a 150, default 100)
- O slider aparece no editor inline do Slide 2 após clicar no ícone de lápis
- No JSX: `transform: scale(imageScale / 100)` aplicado à `<img>` dentro de um container com `overflow: 'hidden'`
- No canvas export: `const scale = Math.min(maxW / dw, maxH / dh, 1) * (imageScale / 100)`

## Mudanças Técnicas

### Arquivo: `src/components/StrategicCarouselPreview.tsx`

#### Fix 1 — `Slide2Solution` JSX: aumentar imagem e aplicar scale

```tsx
// Área da imagem com scale controlado
const imageScale = Number((texts as any)?.imageScale) || 100;

// Container flex com mais espaço
<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0', minHeight: 0, overflow: 'hidden' }}>
  {image ? (
    <img
      src={image}
      alt="produto"
      style={{
        maxWidth: '88%',
        maxHeight: '85%',        // era '100%'
        height: 'auto',
        width: 'auto',
        objectFit: 'contain',
        transform: `scale(${imageScale / 100})`,
        transformOrigin: 'center center',
        filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.2))',
        transition: 'transform 0.2s ease',
      }}
    />
  ) : ...}
</div>
```

#### Fix 2 — `SLIDE_EDITOR_FIELDS` para Slide 2: adicionar slider de escala

```ts
2: [
  { key: 'category', label: 'Categoria', type: 'input' },
  { key: 'productName', label: 'Nome do produto', type: 'input' },
  { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },  // NOVO
],
```

#### Fix 3 — `SlideWrapper` inline editor: renderizar slider e mini toolbar

O `SlideWrapper` precisa suportar o novo tipo `'slider'` nos campos:

```tsx
// Dentro do map de fields:
{field.type === 'slider' ? (
  <div className="flex items-center gap-2">
    <input
      type="range"
      min={50}
      max={150}
      step={5}
      value={Number(slideTexts?.[field.key]) || 100}
      onChange={(e) => onSlideTextChange(field.key, e.target.value)}
      className="flex-1 h-2 accent-primary"
    />
    <span className="text-xs font-mono w-10">{slideTexts?.[field.key] || '100'}%</span>
  </div>
) : field.type === 'textarea' ? (
  // Textarea com mini toolbar Bold/Italic
  <div>
    <div className="flex gap-1 mb-1">
      <button type="button" className="text-xs px-2 py-0.5 border rounded font-bold hover:bg-muted" onClick={() => insertFormat(field.key, '**', '**')}>B</button>
      <button type="button" className="text-xs px-2 py-0.5 border rounded italic hover:bg-muted" onClick={() => insertFormat(field.key, '_', '_')}>I</button>
      <button type="button" className="text-xs px-2 py-0.5 border rounded hover:bg-muted" onClick={() => applyUppercase(field.key)}>AA</button>
    </div>
    <Textarea ... />
  </div>
) : (
  <Input ... />
)}
```

Nota: os botões B/I/AA são auxiliares de edição de texto (inserem marcação ou transformam o texto). O canvas de exportação já usa texto puro, então os caracteres `**texto**` ficam no campo — e o Slide 2 não usa os campos de texto com formatação, apenas a categoria e nome do produto.

#### Fix 4 — Slide 5 JSX: remover clamp nos badges para não truncar

```tsx
// ANTES:
<span style={{ ..., overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', ... }}>

// DEPOIS:
<span style={{ ..., display: 'block', wordBreak: 'break-word', lineHeight: 1.3 }}>
```

#### Fix 5 — Canvas Slide 2: aumentar área da imagem e aplicar imageScale

```ts
// ANTES:
const maxW = W * 0.70;
const maxH = 600;
let dw = img.naturalWidth || img.width;
let dh = img.naturalHeight || img.height;
const scale = Math.min(maxW / dw, maxH / dh, 1);

// DEPOIS:
const imageScale = Number(texts?.imageScale) || 100;
const maxW = W * 0.88;
const maxH = 800;
let dw = img.naturalWidth || img.width;
let dh = img.naturalHeight || img.height;
const scale = Math.min(maxW / dw, maxH / dh, 1) * (imageScale / 100);
```

#### Fix 6 — Canvas Slide 6: wrapText para o botão CTA em vez de truncateToWidth

```ts
// ANTES:
const ctaBtnText = truncateToWidth(ctx, ctaButton, W - 240);
ctx.fillText(ctaBtnText, W / 2, ctaY + 50);

// DEPOIS:
wrapText(ctx, ctaButton, W / 2, ctaY + 20, W - 240, 65, 'center');
```

## Resumo das Mudanças

| Componente | Mudança |
|---|---|
| `Slide2Solution` (JSX) | `maxWidth: 88%`, `maxHeight: 85%`, `transform: scale(imageScale/100)` |
| `SLIDE_EDITOR_FIELDS[2]` | Adicionar campo `imageScale` com type `'slider'` |
| `SlideWrapper` | Suporte a type `'slider'` no inline editor; mini toolbar B/I/AA para textareas |
| `Slide5Security` (JSX) | Remover `-webkit-line-clamp` dos badges — sem truncamento |
| Canvas Slide 2 | `maxW = W * 0.88`, `maxH = 800`, aplicar `imageScale` ao scale final |
| Canvas Slide 6 | `wrapText` no CTA em vez de `truncateToWidth` |
| `SlideTextsType` interface | Adicionar `imageScale?: string` em key `2` |

## Comportamento Final

- **Slide 2 preview**: imagem 88% de largura, scale controlado pelo slider sem perder proporção
- **Slide 2 editor**: slider aparece no painel inline ao clicar no lápis, valor de 50% a 150%
- **Slide 2 export PNG**: canvas aplica a mesma escala do preview
- **Slide 5**: todos os textos dos badges aparecem completos, sem "seg..." ou "..."
- **Slide 6**: botão CTA quebra em 2 linhas se necessário, sem corte
- **Todos os slides com textarea**: toolbar B/I/AA para flexibilidade de formatação
