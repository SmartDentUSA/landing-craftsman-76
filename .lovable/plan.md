
# Fix: Card 3 (Cientificidade) — Regeneração IA + Campos de Edição das Linhas

## Diagnóstico Completo

O Card 3 tem **dois problemas independentes**:

### Problema 1 — IA só gera o título, ignora o corpo

No mapeamento do botão "🤖 Gerar com IA" (`InstagramCopyGenerator.tsx`, linha 868):

```typescript
3: {
  title: s[2]?.title || 'Por que confiar?',
  // s[2]?.text (corpo com bullets técnicos da IA) é IGNORADO!
},
```

A edge function retorna `s[2]?.text` com frases como:
- "Fidelidade cromática ΔE < 1"
- "Elimina chalk effect sem jateamento"
- "Alta carga inorgânica 79%"

Mas esses dados nunca chegam ao card — ele sempre exibe `productData.feedCopyBenefits` ou `productData.technicalSpecs` (dados estáticos do produto).

### Problema 2 — Nenhum campo editável para o conteúdo principal

`SlideTextsType[3]` só tem:
```typescript
3: { title: string; imageScale?: string; bgColor?: string }
```

E `SLIDE_EDITOR_FIELDS[3]` só expõe `title` + `imageScale` + `bgColor` — sem campos para `headline`, `body` ou os `bullets` que são o conteúdo visual dominante do card.

---

## Solução em 3 Partes

### Parte 1 — Expandir `SlideTextsType[3]` com campos de conteúdo

Adicionar campos editáveis para o conteúdo do corpo:

```typescript
3: {
  title: string;
  headline?: string;    // frase em destaque com cor primária
  body?: string;        // texto de apoio
  bullet1?: string;     // linha técnica 1
  bullet2?: string;     // linha técnica 2
  bullet3?: string;     // linha técnica 3
  bullet4?: string;     // linha técnica 4
  imageScale?: string;
  bgColor?: string;
}
```

### Parte 2 — Adicionar campos em `SLIDE_EDITOR_FIELDS[3]`

```typescript
3: [
  { key: 'title',    label: 'Título da seção',     type: 'textarea' },
  { key: 'headline', label: 'Headline em destaque', type: 'textarea' },
  { key: 'body',     label: 'Texto de apoio',       type: 'textarea' },
  { key: 'bullet1',  label: 'Bullet técnico 1',     type: 'textarea' },
  { key: 'bullet2',  label: 'Bullet técnico 2',     type: 'textarea' },
  { key: 'bullet3',  label: 'Bullet técnico 3',     type: 'textarea' },
  { key: 'bullet4',  label: 'Bullet técnico 4',     type: 'textarea' },
  { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
  { key: 'bgColor',    label: 'Cor de fundo',         type: 'color'  },
],
```

### Parte 3 — Corrigir o mapeamento da IA (`InstagramCopyGenerator.tsx`)

Parsear o `s[2]?.text` gerado pela IA para extrair bullets e headline:

```typescript
3: (() => {
  const slide3Text = s[2]?.text || '';
  const slide3Lines = slide3Text
    .split('\n')
    .map((l: string) => l.replace(/^[-•*✅🔬⚡🛡⭐]\s*/, '').trim())
    .filter(Boolean);
  // Filtrar sugestões de imagem
  const contentLines = slide3Lines.filter((l: string) => !isAIVisualSuggestion(l));
  return {
    title:    s[2]?.title   || prevTexts[3]?.title    || 'Por que confiar?',
    headline: contentLines[0] || prevTexts[3]?.headline || '',
    body:     contentLines[1] || prevTexts[3]?.body     || '',
    bullet1:  contentLines[2] || prevTexts[3]?.bullet1  || '',
    bullet2:  contentLines[3] || prevTexts[3]?.bullet2  || '',
    bullet3:  contentLines[4] || prevTexts[3]?.bullet3  || '',
    bullet4:  contentLines[5] || prevTexts[3]?.bullet4  || '',
  };
})(),
```

### Parte 4 — Slide3Technical: usar `texts` quando preenchido

O componente `Slide3Technical` atualmente ignora `texts` para o corpo — usa sempre `productData.feedCopyBenefits`. Adicionar prioridade: **se `texts?.headline` ou `texts?.bullet1` estiverem preenchidos (vieram da IA ou edição manual), usar esses dados; caso contrário, fallback para `feedCopyBenefits` / `technicalSpecs`**.

```typescript
// PRIORIDADE 0: Textos editados/gerados por IA (texts?.headline, texts?.bullet1...)
const hasAITexts = texts?.headline || texts?.bullet1;

if (hasAITexts) {
  // Usar textos da IA/edição
  benefitsHeadline = texts?.headline || '';
  benefitsBody = texts?.body || '';
  benefitsBullets = [texts?.bullet1, texts?.bullet2, texts?.bullet3, texts?.bullet4]
    .filter(Boolean) as string[];
} else if (feedBenefits) {
  // PRIORIDADE 1: feedCopyBenefits (existente)
  ...
}
```

### Parte 5 — Canvas (`generateSlidePNG`): usar `texts` para os bullets

A função canvas do Slide 3 (linha ~1378) lê `productData.technicalSpecs` para os bullets. Adicionar a mesma prioridade: se `texts?.bullet1` existir, usar esses bullets em vez das specs.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/StrategicCarouselPreview.tsx` | `SlideTextsType[3]`: adicionar `headline`, `body`, `bullet1-4` |
| `src/components/StrategicCarouselPreview.tsx` | `SLIDE_EDITOR_FIELDS[3]`: adicionar campos de edição para headline, body, bullet1-4 |
| `src/components/StrategicCarouselPreview.tsx` | `Slide3Technical`: priorizar `texts?.headline/bullet1-4` sobre dados estáticos |
| `src/components/StrategicCarouselPreview.tsx` | Canvas Slide 3: usar `texts?.bullet1-4` quando disponíveis |
| `src/components/InstagramCopyGenerator.tsx` | Mapeamento Slide 3: parsear `s[2]?.text` para extrair headline e bullets |

**2 arquivos. Resultado: Card 3 regenerado pela IA com todos os campos editáveis.**

## Antes / Depois

| Aspecto | Antes | Depois |
|---|---|---|
| IA regenera corpo | Nunca — só título | Sim — headline + body + 4 bullets extraídos de `s[2]?.text` |
| Campos editáveis | Só `title` | `title` + `headline` + `body` + `bullet1` + `bullet2` + `bullet3` + `bullet4` |
| Prioridade de dados | Sempre `productData` estático | IA/edição manual → feedCopyBenefits → specs do produto |
