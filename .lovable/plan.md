
# Implementação Completa: Carrossel Visual — Fix CORS + Editor + Upload + Copy

## Estado Atual Analisado

Após leitura completa dos dois arquivos principais:

### Problemas Identificados no Código

**1. CORS — Raiz do problema (linha 542-546 de StrategicCarouselPreview.tsx)**
```
img.crossOrigin = 'anonymous';
img.src = url;
```
Isso faz o canvas ficar "tainted" porque as imagens do Supabase Storage não retornam `Access-Control-Allow-Origin` para operações canvas. O `canvas.toBlob()` falha silenciosamente, gerando PNG vazio.

**2. `optimize-image` edge function — Já tem a infraestrutura mas não retorna Base64**
A função existe, faz `fetch(imageUrl)` server-side e tem os headers CORS corretos. Só precisa de um parâmetro `returnBase64: true` para retornar `data:` URL. Quando Cloudflare não está configurado (caso atual), ela usa o fallback que retorna a URL original — sem resolver o CORS.

**3. Slide 4 — Texto sobreposto (linhas 821-829)**
O `wrapText` da keyword em `900 90px` retorna o `curY` mas esse valor não é capturado — o benefício começa fixo em `y=500`, independente do espaço que a keyword ocupa.

**4. Slide 3 — Caixas sem ícone (linhas 768-778)**
O `roundRect` é preenchido com `primaryColor` mas nenhum texto/ícone é desenhado dentro. O código só executa `ctx.fill()` e parte para o `wrapText` do item.

**5. Slide 5 — Badge text sem truncagem (linhas 886-890)**
`ctx.fillText(badge, 80 + 130, by + 65)` sem medir a largura. Textos longos como "Certificação Internacional de Qualidade" saem do card.

**6. Slide 2 — Nome cortado (linha 726)**
`ctx.textBaseline = 'bottom'` + `fillText` em posição fixa `H - 100` = texto pode ser cortado embaixo do canvas se a fonte é grande.

**7. Recursos ausentes:** Upload por slide, editor de textos por slide, copy consolidada, botão IA.

---

## Estratégia de Implementação

### Parte 1 — Fix CORS: `fetchAsDataUrl()` (Abordagem em Camadas)

**Camada 1 — data: URL direta** (para uploads locais via FileReader — sempre funciona)

**Camada 2 — Edge function `optimize-image` com `returnBase64: true`**
Adicionar na edge function: quando `returnBase64 === true`, ao invés de retornar a URL otimizada, converte o `ArrayBuffer` da imagem em Base64 e retorna `{ dataUrl: "data:image/jpeg;base64,..." }`. O servidor faz o fetch da imagem (sem restrição CORS server-side) e retorna dados puros.

**Camada 3 — Fetch direto client-side como blob → FileReader**
Se a edge function falhar, tenta `fetch(url)` direto e converte blob para data: URL.

**Camada 4 — URL original** (último fallback, slide renderiza sem imagem se canvas ficar tainted)

A função `fetchAsDataUrl` é chamada para cada slide antes do `generateSlidePNG`, armazenando os data: URLs em um `Map` temporário durante o export do ZIP.

### Parte 2 — Estado `slideTexts` e Inicialização

Novo state em `InstagramCopyGenerator.tsx`:

```
type SlideTexts = {
  1: { hook: string; productName: string };
  2: { category: string; productName: string };
  3: { title: string };
  4: { label: string; keyword: string; benefit: string };
  5: { title: string; badge1: string; badge2: string; badge3: string };
  6: { productName: string; ctaButton: string; linkLabel: string; footer: string };
}
```

Inicializado no `useEffect([isOpen])` usando os dados do produto como padrão. Passado como prop para `StrategicCarouselPreview` e para `generateSlidePNG`.

### Parte 3 — Upload por Slide via FileReader

Adicionado dentro do `SlideWrapper`:
- Botão "📤 Upload" com `<input type="file" accept="image/*" hidden>`
- `FileReader.readAsDataURL()` → `onImageChange(slideNum, dataUrl)`
- data: URL armazenada em `slideImageMap` → CORS-safe 100%

### Parte 4 — Editor Inline Colapsável por Slide

Estado: `expandedSlideEditor: number | null` em `StrategicCarouselPreview`.

Cada `SlideWrapper` recebe um ícone ✏️ que toggle o editor do slide. O editor mostra campos específicos por número do slide:
- Slide 1: Textarea "Gancho", Input "Nome do produto"
- Slide 2: Input "Categoria", Input "Nome"
- Slide 3: Input "Título da seção"
- Slide 4: Input "Label topo", Input "Palavra-chave", Textarea "Benefício"
- Slide 5: Input "Título", 3x Input "Badge"
- Slide 6: Input "Nome", Input "Texto do botão", Input "Link label", Input "Footer"

Ao editar, `onSlideTextChange(slideNum, key, value)` é chamado → atualiza `slideTexts` no pai → re-renderiza o preview em tempo real.

### Parte 5 — Botão "🤖 Gerar com IA"

Novo botão no header do Card do Carrossel Visual. Chama `generate-instagram-carousel` com o productId. Mapeia a resposta de 7 slides para os 6 campos de `slideTexts`:
- Slide 1 IA → hook do Slide 1 visual
- Slide 7 IA (CTA) → ctaButton do Slide 6 visual
- Slide 4 IA (técnico) → keyword do Slide 4 visual
- etc.

Se `generate-instagram-carousel` não retornar no formato esperado, usa `generate-social-content` como fallback.

### Parte 6 — Seção "Copy para Carrossel Visual"

Novo Card abaixo do grid de slides em `InstagramCopyGenerator.tsx`. Função `buildCarouselCopy()` monta o texto de todos os 6 slides formatado com separadores `━━━`. Botão "📋 Copiar Copy" usa `navigator.clipboard.writeText()`.

### Parte 7 — Fixes de Layout no Canvas

**Slide 4 — Capturar Y final do keyword**:
```
const kwFontSize = (features[0] || 'Excelência').length > 15 ? 65 : 90;
ctx.font = `900 ${kwFontSize}px system-ui`;
const benefitStartY = wrapText(ctx, keyword, halfW + 70, 270, halfW - 100, kwFontSize * 1.15);
// Benefit começa onde keyword terminou + margem
ctx.font = '400 40px system-ui';
wrapText(ctx, benefit, halfW + 70, benefitStartY + 40, halfW - 100, 52);
```

**Slide 3 — Ícone Unicode dentro da caixa**:
```
const ICONS = ['⚡', '🛡', '⭐', '✅', '🔬'];
// Após ctx.fill() da roundRect:
ctx.font = '32px Arial, sans-serif';
ctx.fillStyle = '#ffffff';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(ICONS[itemIndex % ICONS.length], rx + 28, ry + 28);
// Resetar para texto do item
ctx.textAlign = 'left';
ctx.textBaseline = 'top';
```

**Slide 5 — Truncar badge text**:
```
function truncateToWidth(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (ctx.measureText(t + '…').width > maxW && t.length > 1) t = t.slice(0, -1);
  return t + '…';
}
const maxBadgeW = W - 160 - 130 - 60; // (canvas - margens - ícone - gap)
const truncBadge = truncateToWidth(ctx, badge, maxBadgeW);
ctx.fillText(truncBadge, 80 + 130, by + 65);
```

**Slide 2 — Nome do produto com wrapText**:
```
ctx.font = '900 72px system-ui';
ctx.fillStyle = '#111111';
ctx.textAlign = 'center';
ctx.textBaseline = 'top';
wrapText(ctx, productData.name, W / 2, H - 250, W - 160, 84);
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|---------|
| `supabase/functions/optimize-image/index.ts` | Adicionar suporte a `returnBase64: true` — retorna `{ dataUrl: "data:..." }` convertendo o ArrayBuffer via `btoa()` |
| `src/components/StrategicCarouselPreview.tsx` | (1) Nova função `fetchAsDataUrl()`, (2) Upload por slide em `SlideWrapper`, (3) Editor inline colapsável, (4) Props `slideTexts` + `onSlideTextChange`, (5) Fix layouts canvas slides 2/3/4/5, (6) `generateSlidePNG` aceita `slideTexts` |
| `src/components/InstagramCopyGenerator.tsx` | (1) Estado `slideTexts` + inicializador, (2) Botão "🤖 Gerar com IA", (3) `handleExportZip` com `fetchAsDataUrl` pré-carregando imagens, (4) Card "Copy para Carrossel Visual", (5) Instrução do ZIP corrigida |

---

## Fluxo de Export ZIP Corrigido

```
handleExportZip():
  1. Para cada slide i = 1..6:
     a. imageUrl = slideImageMap[i]
     b. safeDataUrl = await fetchAsDataUrl(imageUrl)
        → se data: → retorna direto
        → se URL → POST optimize-image?returnBase64=true → converte server-side
        → fallback → fetch direto + FileReader
     c. pngBlob = await generateSlidePNG(i, safeDataUrl, primaryColor, accentColor, productData, slideTexts[i])
     d. zip.file(`slide-${i}.png`, pngBlob)
  2. zip.generateAsync({ type: 'blob' }) → download
```

Este fluxo garante que o canvas **sempre** recebe um `data:` URL — eliminando completamente o "Tainted Canvas".

---

## Resultado para o Usuário

Após a implementação:

1. **ZIP com PNGs reais** — imagens do produto aparecem em todos os slides
2. **Upload individual** — botão "📤 Upload" em cada slide para usar foto própria
3. **Editor por slide** — ícone ✏️ expande campos editáveis específicos de cada slide
4. **Preview em tempo real** — alterações no editor refletem instantaneamente no preview
5. **Botão IA** — "🤖 Gerar com IA" popula textos dos 6 slides automaticamente
6. **Copy consolidada** — seção com texto completo de todos os slides para copiar e colar
7. **Layouts corretos** — Slide 4 sem sobreposição, Slide 3 com ícones, Slide 5 com truncagem, Slide 2 com nome completo

