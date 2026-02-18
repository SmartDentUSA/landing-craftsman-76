
# Correção: Repetições de Texto + Distorção de Imagens no Carrossel Visual

## Diagnóstico Preciso dos Dois Bugs

### Bug 1 — Repetição de Informações entre Slides

**Localização:** `InstagramCopyGenerator.tsx` linha 155–166, função `buildDefaultSlideTexts()`

O problema está na distribuição de dados entre slides:

- **Slide 4 keyword**: usa `f[0]` (primeira feature)
- **Slide 5 badge1**: usa `f[0]` novamente (mesma primeira feature)
- **Slide 5 badge2**: usa `f[1]` (segunda feature) ou `b[0]` (primeiro benefit)
- **Slide 4 benefit**: usa `b[1]` ou `b[0]` (mesmo benefit que pode ir para badge2)

Resultado: o usuário vê "Produto Nano-Híbrido Odontológico" tanto no Slide 4 (keyword gigante) quanto no Slide 5 (badge). "Biocompatibilidade comprovada..." aparece no Slide 4 (benefit) e como badge no Slide 5. "Longa duração..." idem.

**Distribuição correta (sem repetição):**

| Slide | Campo | Fonte |
|-------|-------|-------|
| 1 | hook | `b[0]` |
| 1 | productName | nome do produto |
| 2 | category | categoria |
| 4 | keyword | `f[0]` (feature 1 - característica técnica) |
| 4 | benefit | `b[2]` ou `b[1]` (benefit distinto do Slide 5) |
| 5 | badge1 | `f[1]` (feature 2 - diferente da keyword do Slide 4) |
| 5 | badge2 | `f[2]` ou `b[0]` (terceira característica) |
| 5 | badge3 | `f[3]` ou `b[1]` (quarta característica) |

Adicionalmente, os slide components em `StrategicCarouselPreview.tsx` têm um fallback duplo: se `texts` não tem o campo, caem no `productData.features[0]` diretamente — podendo sobrescrever o `slideTexts` com o dado repetido. O fallback precisa usar índices diferentes por slide.

### Bug 2 — Imagens Distorcidas

**Localização:** `StrategicCarouselPreview.tsx` — componentes HTML React dos slides 1, 3 e 4.

**Slide 1:** A `<img>` tem `height: '60%'` e `width: '100%'` com `objectFit: 'cover'` — isso está correto e não distorce. OK.

**Slide 2 (confirmado como o slide da screenshot):** 
```
style={{ maxWidth: '70%', maxHeight: 600, objectFit: 'contain' }}
```
O problema é que o container pai `flex: 1` não tem `height` definido em pixels — apenas `padding: '40px 0'`. Com `justifyContent: 'space-between'` no pai, a `flex: 1` area cresce variávelmente. O `maxHeight: 600` resolve para telas grandes mas em escala reduzida (`SLIDE_SCALE = 0.22`) pode causar efeito estranho.

O bug real: a imagem usa `objectFit: 'contain'` mas **não tem `width` nem `height` definidos explicitamente** — o navegador calcula a altura baseado no tamanho natural da imagem. Como o slide está escalado via `transform: scale(0.22)`, as proporções ficam corretas visualmente, mas a imagem pode exceder o espaço disponível no layout flex e ser "espremida".

**Fix:** Dar à div container da imagem `height` fixo (ex: `560px`) e à `img` `width: '100%', height: '100%', objectFit: 'contain'`.

**Slide 3:** `img` com `width: '100%', height: '100%'` no container `42%` de largura — funciona bem com `objectFit: 'cover'`, mas o container `div` com `42%` de width sem height definido em um flex row vai herdar `height: 100%` do pai `SLIDE_H` — correto.

**Slide 4:** `img` com `width: '100%', height: '100%'` num flex `50%` — correto pois o pai tem `height: SLIDE_H` fixo.

**Conclusão:** O problema principal é o Slide 2, e secundariamente o Slide 1 onde a imagem sem `objectPosition` pode distorcer rostos/produtos.

## Solução Completa

### Fix 1 — `buildDefaultSlideTexts` sem repetições

**Arquivo:** `src/components/InstagramCopyGenerator.tsx`, linhas 155–166.

Nova lógica de distribuição usando índices distintos:

```
function buildDefaultSlideTexts(): Partial<SlideTextsType> {
  const b = productBenefits || [];
  const f = productFeatures || [];
  return {
    1: {
      hook: b[0] ? `Você sabia que ${b[0].toLowerCase()}?`
                 : `Descubra o segredo por trás de ${productName}`,
      productName
    },
    2: { category: productCategory || '', productName },
    3: { title: 'Por que confiar?' },
    4: {
      label: 'EXPERIÊNCIA',
      keyword: f[0] || 'Excelência',          // Feature 1 (técnica)
      benefit: b[2] || b[1] || b[0]           // Benefit diferente do usado no Slide 1 e 5
               || 'Resultados excepcionais em cada uso'
    },
    5: {
      title: 'Você pode confiar',
      badge1: f[1] || f[0] || 'Biocompatível',   // Feature 2 (diferente da keyword)
      badge2: f[2] || b[1] || '5 Anos de Casos', // Feature 3 ou benefit
      badge3: f[3] || b[2] || 'Qualidade Premium' // Feature 4 ou benefit
    },
    6: {
      productName,
      ctaButton: '🛒 Comprar Agora',
      linkLabel: '🔗 Link na Bio',
      footer: 'Direct para mais informações'
    },
  };
}
```

### Fix 2 — Fallbacks nos slide components sem repetição

**Arquivo:** `src/components/StrategicCarouselPreview.tsx`

**Slide 4 (`Slide4Experience`):** O fallback do `benefit` atualmente usa `productData.benefits?.[1] || productData.benefits?.[0]`. Deve usar `[2] || [1]` para não repetir o `b[0]` que vai para o Slide 1 e potencialmente Slide 5.

**Slide 5 (`Slide5Security`):** Os badges atualmente usam:
- `badge1: features[0]` — mesmo que keyword do Slide 4
- `badge2: features[1] || benefits[0]`
- `badge3: features[2] || benefits[1]`

Deve usar:
- `badge1: features[1] || features[0]` — preferencialmente feature diferente da keyword
- `badge2: features[2] || benefits[1]`
- `badge3: features[3] || benefits[2]`

### Fix 3 — Distorção de imagens no Slide 2

**Arquivo:** `src/components/StrategicCarouselPreview.tsx`, função `Slide2Solution`, linha 281–287.

**Antes:**
```jsx
<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
  <img src={image} alt="produto" style={{ maxWidth: '70%', maxHeight: 600, objectFit: 'contain', ... }} />
```

**Depois:**
```jsx
<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', minHeight: 0, overflow: 'hidden' }}>
  <img src={image} alt="produto" style={{
    maxWidth: '70%',
    maxHeight: '100%',      // respeita o container flex
    height: 'auto',          // mantém proporção original
    width: 'auto',           // mantém proporção original
    objectFit: 'contain',
    filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.2))'
  }} />
```

A chave é `width: 'auto'` e `height: 'auto'` com `maxWidth` e `maxHeight` — o navegador calcula as dimensões mantendo o aspect ratio original da imagem. `minHeight: 0` no container flex permite que ele se comprima sem forçar a imagem a distorcer.

### Fix 4 — Imagem do Slide 1 com objectPosition correto

**Arquivo:** `src/components/StrategicCarouselPreview.tsx`, função `Slide1Hook`, linha 246.

```jsx
// Antes:
style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', width: '100%', objectFit: 'cover', objectPosition: 'center top' }}

// Depois - adicionar background branco para evitar transparência:
style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', width: '100%', objectFit: 'cover', objectPosition: 'center center', backgroundColor: '#f0f0f0' }}
```

### Fix 5 — Slide 3 e 4: garantir `objectPosition: 'top center'` para produto

Para produtos (não cenários), `objectPosition: 'center top'` mostra melhor a parte superior do produto. Nas imagens de produto com fundo branco, `objectFit: 'cover'` pode cortar parte da embalagem.

**Slide 3** (linha 313): trocar `objectFit: 'cover'` para `objectFit: 'contain'` no container left (fundo escuro #1a1a2e serve como fallback), ficando:
```jsx
<img src={image} alt="produto" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
```

**Slide 4** (linha 353): manter `objectFit: 'cover'` pois é a metade esquerda de um split layout — não deve ter borda de fundo visível.

## Resumo de Arquivos a Modificar

| Arquivo | Linhas | Mudança |
|---------|--------|---------|
| `src/components/InstagramCopyGenerator.tsx` | 155–166 | `buildDefaultSlideTexts`: usar índices f[1], f[2], f[3] para Slide 5 badges; usar b[2]||b[1] para Slide 4 benefit |
| `src/components/StrategicCarouselPreview.tsx` | 344, 372–379 | Fallbacks de `Slide4Experience` e `Slide5Security` com índices distintos |
| `src/components/StrategicCarouselPreview.tsx` | 281–287 | `Slide2Solution`: trocar `maxHeight: 600` por `height: 'auto'`, `width: 'auto'`, `maxHeight: '100%'` + `minHeight: 0` no container |
| `src/components/StrategicCarouselPreview.tsx` | 246 | `Slide1Hook`: adicionar `backgroundColor` na img |

## Resultado Esperado

- Slide 4 mostra a **palavra-chave técnica** (ex: "Nano-Híbrido") e um **benefício único** (ex: "Longa duração com mais de 5 anos")
- Slide 5 mostra **3 badges distintos** de features/benefits que NÃO se repetem com o Slide 4 (ex: "Biocompatibilidade comprovada", "ISO 9001", "Fácil aplicação")
- Slide 2 exibe a imagem do produto **sem distorção**, mantendo proporções originais (portrait, landscape, quadrada)
- Nenhum texto aparece em dois slides simultâneos
