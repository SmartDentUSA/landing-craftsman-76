
# Correção Completa: Editor de Frases + Fontes + Textos Cortados + ZIP com CORS

## Diagnóstico Exato dos Bugs

Após leitura completa dos dois arquivos (952 e 1764 linhas), os problemas estão identificados com precisão:

### Bug 1 — Editor de Frases Não Funciona (crítico)
`StrategicCarouselPreview` em `InstagramCopyGenerator.tsx` linha 1733–1750 **não recebe** as props `slideTexts` nem `onSlideTextChange`. O editor abre, o usuário digita, mas nada atualiza porque as props não chegam ao componente.

### Bug 2 — ZIP Sem CORS Fix (crítico)
`handleExportZip` (linha 681–692) chama `generateSlidePNG(i, slideImageMap[i] || '', ...)` diretamente — sem passar pela função `fetchAsDataUrl` que foi criada exatamente para resolver o CORS. A imagem vai direto para o canvas sem conversão Base64, taintando o canvas e gerando PNGs vazios.

### Bug 3 — ZIP Não Passa `slideTexts`
`handleExportZip` chama `generateSlidePNG(i, ..., productData)` sem o parâmetro `texts` — assim os PNGs exportados ignoram qualquer texto que o usuário editou.

### Bug 4 — Textos Cortados (Slide 5 — Badges)
No preview HTML, badge usa `whiteSpace: 'nowrap'` com `overflow: 'hidden'` e `textOverflow: 'ellipsis'` (linha 400), mas o container não tem largura máxima definida. Em textos longos como "Produto Nano-Híbrido Odontológico com nanotecnologia exclusiva" o badge container expande além dos limites do slide.

### Bug 5 — Textos Cortados (Slide 4 — Palavra-chave)
No preview HTML, `Slide4Experience` usa `wordBreak: 'break-word'` na tag `h2` (linha 359) com `fontSize: kwFontSize` mas a div pai tem `overflow: 'hidden'` com `padding: '80px 70px'` — o texto da keyword quebra mas o benefício embaixo pode ser cortado pelo `overflow: hidden`.

### Bug 6 — Sem Seletor de Fonte e Tamanho
Não existe seletor de fonte (family) nem tamanho no código — é necessário adicionar ao estado e passar como prop para os slides.

### Bug 7 — Botão "Gerar com IA" Não Existe na UI
O estado `generatingVisualCarousel` existe mas nenhum botão no JSX o aciona.

### Bug 8 — Seção "Copy para Carrossel Visual" Não Existe
A função `buildCarouselCopy()` e o Card de copy não foram implementados no JSX.

---

## Solução Completa

### Arquivo 1: `src/components/InstagramCopyGenerator.tsx`

#### Fix A — Passar `slideTexts` e `onSlideTextChange` para o preview (linha ~1733)
```text
// ANTES (incompleto):
<StrategicCarouselPreview
  slideImageMap={slideImageMap}
  onImageChange={...}
  productImages={productImages}
  primaryColor={primaryColor}
  accentColor={accentColor}
  productData={{...}}
/>

// DEPOIS (correto):
<StrategicCarouselPreview
  slideImageMap={slideImageMap}
  onImageChange={...}
  productImages={productImages}
  primaryColor={primaryColor}
  accentColor={accentColor}
  productData={{...}}
  slideTexts={slideTexts}
  onSlideTextChange={(slideNum, key, value) =>
    setSlideTexts(prev => ({
      ...prev,
      [slideNum]: { ...(prev[slideNum] as any), [key]: value }
    }))
  }
  fontFamily={fontFamily}
  fontSize={fontSize}
  onFontFamilyChange={setFontFamily}
  onFontSizeChange={setFontSize}
/>
```

#### Fix B — `handleExportZip` usar `fetchAsDataUrl` + passar `slideTexts`
```text
// ANTES:
const pngBlob = await generateSlidePNG(i, slideImageMap[i] || '', primaryColor, accentColor, productData);

// DEPOIS:
const safeDataUrl = await fetchAsDataUrl(slideImageMap[i] || '');
const textsForSlide = (slideTexts[i as keyof SlideTextsType] as Record<string, string>) || {};
const pngBlob = await generateSlidePNG(i, safeDataUrl, primaryColor, accentColor, productData, textsForSlide);
```

#### Fix C — Adicionar estados de fonte
```text
const [fontFamily, setFontFamily] = useState<string>('system-ui');
const [fontSize, setFontSize] = useState<number>(100); // escala percentual 60-150%
```

#### Fix D — Seletores de fonte e tamanho na UI (abaixo dos color pickers)

**Famílias disponíveis:**
- `system-ui` — Padrão do sistema
- `Georgia, serif` — Serif elegante
- `'Arial', sans-serif` — Arial clássico
- `'Impact', sans-serif` — Impact (destaque)
- `'Courier New', monospace` — Monospace técnico

**Controle de tamanho:** slider de 60% a 150% (escala relativa aos tamanhos base de cada slide)

#### Fix E — Botão "🤖 Gerar com IA" no header do Card
Abaixo do botão ZIP, adicionar botão que chama `generateVisualCarouselTexts()`:
```text
const generateVisualCarouselTexts = async () => {
  setGeneratingVisualCarousel(true);
  try {
    const { data } = await supabase.functions.invoke('generate-instagram-carousel', {
      body: { productId, feedCopy: feedCopies[0]?.copy || '', approach: 'visual_carousel' }
    });
    // Mapear slides da IA → slideTexts (slide 1→hook, slide 4→keyword, slide 7→cta)
    if (data?.slides) {
      const s = data.slides;
      setSlideTexts(prev => ({
        ...prev,
        1: { ...prev[1] as any, hook: s[0]?.text || prev[1]?.hook || '' },
        4: { ...prev[4] as any, keyword: s[3]?.title || prev[4]?.keyword || '' },
        6: { ...prev[6] as any, ctaButton: s[6]?.text?.split('\n')[0] || prev[6]?.ctaButton || '' },
      }));
    }
  } catch {}
  setGeneratingVisualCarousel(false);
};
```

#### Fix F — Card "Copy para Carrossel Visual" abaixo dos slides
```text
function buildCarouselCopy(): string {
  const t = slideTexts as Partial<SlideTextsType>;
  return [
    `SLIDE 1 — HOOK\n${t[1]?.hook || ''}`,
    `━━━━━━━━━━━━━━━━━━\nSLIDE 2 — APRESENTAÇÃO\nProduto: ${t[2]?.productName || ''}\n${t[2]?.category ? `Categoria: ${t[2].category}` : ''}`,
    `━━━━━━━━━━━━━━━━━━\nSLIDE 3 — DIFERENCIAIS\n${t[3]?.title || 'Por que confiar?'}`,
    `━━━━━━━━━━━━━━━━━━\nSLIDE 4 — EXPERIÊNCIA\n${t[4]?.keyword || ''}\n${t[4]?.benefit || ''}`,
    `━━━━━━━━━━━━━━━━━━\nSLIDE 5 — SEGURANÇA\n${t[5]?.title || ''}\n✅ ${t[5]?.badge1 || ''}\n✅ ${t[5]?.badge2 || ''}\n✅ ${t[5]?.badge3 || ''}`,
    `━━━━━━━━━━━━━━━━━━\nSLIDE 6 — CTA\n${t[6]?.ctaButton || ''}\n${t[6]?.linkLabel || ''}\n${t[6]?.footer || ''}`,
  ].join('\n\n');
}
```

---

### Arquivo 2: `src/components/StrategicCarouselPreview.tsx`

#### Fix G — Adicionar props `fontFamily`, `fontSize` e repassar para slides

Adicionar ao `StrategicCarouselPreviewProps`:
```text
fontFamily?: string;
fontSize?: number; // escala 60-150
```

Cada slide component recebe `fontFamily` e usa via `style={{ fontFamily }}` na div raiz. O `fontSize` escala os tamanhos base de cada elemento multiplicando por `(fontSize / 100)`.

#### Fix H — Corrigir textos cortados no HTML preview (Slide 5 badges)
Mudar `whiteSpace: 'nowrap'` para `wordBreak: 'break-word'` + `overflow: 'visible'` no `<span>` do badge, ou limitar o texto com `maxWidth` calculado:
```text
// ANTES:
<span style={{ color: '#ffffff', fontSize: 40, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
  {badge.label}
</span>

// DEPOIS:
<span style={{ color: '#ffffff', fontSize: 40, fontWeight: 700, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
  {badge.label}
</span>
```

E ajustar a altura do card de badge para acomodar 2 linhas:
```text
// padding: '28px 44px' → padding: '20px 44px' com minHeight: 120
```

#### Fix I — Corrigir textos cortados no Slide 4 (keyword + benefit)
O `h2` da keyword tem `lineHeight: 1.05` mas `overflow: 'hidden'` no container. Solução: usar `overflowY: 'auto'` no container direito e separar keyword e benefit com layout flex:
```text
// Container direito: overflow: 'hidden' → overflow: 'visible'
// h2 keyword: adicionar flexShrink: 0
// p benefit: fontSize adaptativo se texto for longo
```

---

## Seletor de Fontes e Tamanhos na UI

No bloco de color pickers (linha ~1696), adicionar abaixo:

```text
Fonte:
[ sistema-ui ▼ ]   [ Arial ▼ ]   [ Georgia ▼ ]   [ Impact ▼ ]

Tamanho do texto:  [━━━━●━━━] 100%
```

**Opções de fonte:**
| Label | Value (CSS) |
|-------|-------------|
| Sistema (Padrão) | `system-ui, -apple-system, sans-serif` |
| Arial | `'Arial', Helvetica, sans-serif` |
| Georgia (Elegante) | `Georgia, 'Times New Roman', serif` |
| Impact (Destaque) | `Impact, 'Arial Narrow', sans-serif` |
| Courier (Técnico) | `'Courier New', Courier, monospace` |

**Escala de tamanho:** Slider de 60% a 150%, aplicado multiplicando todos os `fontSize` dos elementos canvas e CSS por `(escala / 100)`.

---

## Resumo das Mudanças por Arquivo

### `src/components/InstagramCopyGenerator.tsx`
1. Adicionar estados `fontFamily` e `fontSize`
2. Passar `slideTexts`, `onSlideTextChange`, `fontFamily`, `fontSize` para `<StrategicCarouselPreview>`
3. Corrigir `handleExportZip` para usar `fetchAsDataUrl` + passar `slideTexts` + passar opções de fonte ao `generateSlidePNG`
4. Adicionar botão "🤖 Gerar com IA" no header do Card
5. Adicionar seletores de fonte e tamanho nos controles de cor
6. Adicionar Card "📋 Copy para Carrossel Visual" com `buildCarouselCopy()` e botão copiar

### `src/components/StrategicCarouselPreview.tsx`
1. Adicionar props `fontFamily` e `fontSize` à interface
2. Passar `fontFamily` como `style.fontFamily` nas divs raiz de cada slide component
3. Aplicar escala de `fontSize` nos tamanhos de texto dos slides HTML preview
4. Corrigir Slide 5 badge: trocar `whiteSpace: nowrap` por clamp de 2 linhas
5. Corrigir Slide 4 keyword+benefit: overflow visível no container
6. Atualizar `generateSlidePNG` para aceitar e aplicar `fontFamily` e `fontSize`
