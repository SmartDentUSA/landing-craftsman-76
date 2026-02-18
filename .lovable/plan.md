
# Inserir Ferramentas de Edição Completas em Todos os Cards do Carrossel

## O Problema

O editor inline de cada card do carrossel tem ferramentas diferentes dependendo do slide. Atualmente apenas os Cards 2 e 4 têm os controles mais completos:

- **Card 2**: tem `slider` (escala de imagem %) e `color` (cor de fundo)
- **Card 4**: tem `textarea` com barra de formatação: **B** (Negrito), _I_ (Itálico), **AA** (Maiúsculas)

Os outros cards têm apenas `input` simples, sem nenhuma dessas ferramentas.

## Solução

Atualizar o objeto `SLIDE_EDITOR_FIELDS` em `src/components/StrategicCarouselPreview.tsx` para que **todos os cards** tenham:

1. Campos de texto longo como `textarea` (com barra B / I / AA)
2. `slider` de escala de imagem (`imageScale`)
3. `color` de cor de fundo (`bgColor`)

---

## Detalhamento por Card

### Card 1 — Gancho
Atualmente:
- `hook` → `textarea` ✅ (já tem B/I/AA)
- `productName` → `input`

Falta: `imageScale` (slider) e `bgColor` (color)

```typescript
1: [
  { key: 'hook', label: 'Texto do Gancho', type: 'textarea' },
  { key: 'productName', label: 'Nome do produto', type: 'input' },
  { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
  { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
],
```

### Card 3 — Diferencial Técnico
Atualmente:
- `title` → `input` simples (sem formatação)

Falta: formatação B/I/AA (mudar para `textarea`), `imageScale`, `bgColor`

```typescript
3: [
  { key: 'title', label: 'Título da seção', type: 'textarea' },
  { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
  { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
],
```

### Card 4 — Experiência/Fluxo
Atualmente:
- `label` → `input`
- `keyword` → `input`
- `benefit` → `textarea` ✅ (tem B/I/AA)

Falta: `imageScale` (slider) e `bgColor` (color)

```typescript
4: [
  { key: 'label', label: 'Label topo (ex: EXPERIÊNCIA)', type: 'input' },
  { key: 'keyword', label: 'Palavra-chave', type: 'input' },
  { key: 'benefit', label: 'Benefício', type: 'textarea' },
  { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
  { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
],
```

### Card 5 — Autoridade Smart Dent
Atualmente:
- `title` → `input`
- `badge1/2/3` → `input` simples

Falta: formatação B/I/AA (mudar para `textarea`), `imageScale`, `bgColor`

```typescript
5: [
  { key: 'title', label: 'Título', type: 'textarea' },
  { key: 'badge1', label: 'Badge 1', type: 'textarea' },
  { key: 'badge2', label: 'Badge 2', type: 'textarea' },
  { key: 'badge3', label: 'Badge 3', type: 'textarea' },
  { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
  { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
],
```

### Card 6 — CTA
Atualmente:
- todos `input` simples

Falta: formatação B/I/AA em campos de texto, `imageScale`, `bgColor`

```typescript
6: [
  { key: 'productName', label: 'Nome exibido', type: 'input' },
  { key: 'ctaButton', label: 'Texto do botão CTA', type: 'textarea' },
  { key: 'linkLabel', label: 'Label do link', type: 'input' },
  { key: 'footer', label: 'Texto de rodapé', type: 'textarea' },
  { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
  { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
],
```

---

## Impacto no Canvas (generateSlidePNG)

Os campos `imageScale` e `bgColor` são novos nos slides 1, 3, 4, 5 e 6. O canvas precisa usar esses valores quando renderizar cada slide. Atualmente o canvas só usa `imageScale` e `bgColor` no Slide 2. Precisamos:

- Aplicar `bgColor` como cor de fundo do painel em todos os slides que o possuam (como overlay escuro por padrão ou personalizado)
- Aplicar `imageScale` para controlar o zoom da imagem de cada slide no canvas

Isso será feito nas funções canvas de cada slide em `generateSlidePNG` (dentro de `StrategicCarouselPreview.tsx`) e no preview visual (JSX de cada slide), usando o mesmo padrão do Slide 2.

---

## Arquivo Modificado

| Arquivo | Mudança | Linhas |
|---|---|---|
| `src/components/StrategicCarouselPreview.tsx` | `SLIDE_EDITOR_FIELDS`: adicionar `slider` e `color` nos cards 1, 3, 4, 5, 6; mudar `input` para `textarea` nos campos de texto longo | 84–116 |
| `src/components/StrategicCarouselPreview.tsx` | Canvas + JSX: ler `texts?.imageScale` e `texts?.bgColor` para aplicar nos slides 1, 3, 4, 5, 6 | ~1340 (canvas), ~580 (JSX) |

**1 arquivo, mudanças focadas. Zero quebra em funcionalidades existentes.**

## Antes / Depois

| Card | Antes | Depois |
|---|---|---|
| Card 1 | `textarea` (B/I/AA) + `input` | `textarea` (B/I/AA) + `input` + `slider` + `color` |
| Card 2 | `input` × 3 + `slider` + `color` ✅ | sem mudança |
| Card 3 | `input` simples | `textarea` (B/I/AA) + `slider` + `color` |
| Card 4 | `input` × 2 + `textarea` (B/I/AA) | `input` × 2 + `textarea` (B/I/AA) + `slider` + `color` |
| Card 5 | `input` × 4 | `textarea` × 4 (B/I/AA) + `slider` + `color` |
| Card 6 | `input` × 4 | `input` × 2 + `textarea` × 2 (B/I/AA) + `slider` + `color` |
