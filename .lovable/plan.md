# PR Final — Paleta SmartDent + Fixes Críticos

Consolida correções pendentes e configura paleta oficial SmartDent. Ao final do merge, o gerador está pronto para produção.

## O que NÃO muda

- Sistema de 3 color pickers e validação WCAG em tempo real
- 4 estilos pré-definidos (Moderno/Minimalista/Bold/Clínico)
- 16 formatos / 5 categorias
- ClickTag IAB, animação CTA limitada a 6 ciclos
- UTMs + gtag/dataLayer via `window.parent`
- Toggle FDA, galeria de imagens, slug de campanha, "Baixar Todos (ZIP WebP)"

Apenas valores e bugs — nenhuma refatoração estrutural.

## Mudanças por arquivo

### 1. `src/components/google-ads/smartdent-constants.ts` (NOVO)

Define `BRAND` (paleta oficial: navy `#2C3E5F`, navyDark `#1a2942`, navyMid `#4A6585`, orange `#E97935`, white, offWhite) e `STYLE_PRESETS` com os 4 estilos como arranjos das cores oficiais. Cada preset expõe: `primary`, `secondary`, `accent`, `bgGradient`, `textOnBg`, `ctaBg`, `ctaText`, `fdaBadgeBg`, `fdaBadgeText`, `logoVariant` (`'lockupDark' | 'lockupLight'`). Default `'moderno'`.

### 2. `src/components/google-ads/display-templates.ts` (atualizar)

- Importar `BRAND`, `STYLE_PRESETS`, `StylePreset` do novo constants.
- Adicionar `SMARTDENT_LOGO` com 4 variantes SVG inline (`markLight`, `markDark`, `lockupLight`, `lockupDark`) — 2 paths separados (curva navy/branco + curva laranja), `text` opcional para os lockups.
- Adicionar `pickLogo({ preset, withWordmark })` que retorna o SVG correto: lockup quando `withWordmark` (largura ≥ 300), mark caso contrário.
- Manter `escapeHtml` e `smartTruncate` existentes (já corretos — `lastSpace > 8`).
- Adicionar tabela `BUCKET_LIMITS` com `headline` e `subheadline` por bucket (SMALL 25/0, MEDIUM 35/60, LARGE 45/80, INTERSTITIAL 50/90).
- Refatorar `getPalette` (ou substituir por leitura direta de `STYLE_PRESETS[stylePreset]`) — eliminar todo hex hardcoded (`#2563eb`, `#dc2626`, `#7c3aed`, `#1e3a8a`, `#f0f7ff`, etc).
- `bgGradient`, `ctaBg`, `ctaFg`, `textOnBg`, `fdaBg`, `fdaText` saem do preset. `logoSvg = pickLogo({ preset, withWordmark: width >= 300 })` injetado nos 4 renderers no lugar do `smartDentLogoSVG` global.
- Aplicar `BUCKET_LIMITS` em `smartTruncate` por renderer (substituir os `28/32/42/55/65/60` ad-hoc).
- CSS de `.h` (headline) em MEDIUM/LARGE/INTERSTITIAL trocar `overflow:hidden` puro por:
  ```css
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:normal;hyphens:none;
  ```
  SMALL mantém 1 linha (`white-space:nowrap`).
- FDA badge usa `fdaBadgeBg` / `fdaBadgeText` do preset (não mais `#dc2626` fixo).

### 3. `renderINTERSTITIAL` — fix CTA cortado em 480×320

Layout flex column com altura mínima reservada pro CTA:
```css
.b{padding:12px;display:flex;flex-direction:column;height:100%;box-sizing:border-box;}
.img-wrap{flex:1 1 auto;min-height:0;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.tw{flex:0 0 auto;padding:6px 0;}
.c{flex:0 0 auto;min-height:36px;margin-top:8px;}
```
Imagem absorve sobra (`flex:1`), CTA nunca é comprimido (`flex:0 0 auto`).

### 4. `src/components/google-ads/DisplayBannerGenerator.tsx`

- Importar `STYLE_PRESETS`, `DEFAULT_STYLE`, `StylePreset` do constants.
- Estado inicial: `style = DEFAULT_STYLE`, `primaryColor = STYLE_PRESETS.moderno.primary` (`#2C3E5F`), `secondaryColor = #1a2942`, `accentColor = #E97935`.
- Adicionar `handleStylePresetChange(preset)`: atualiza `style` + os 3 color pickers para os valores do preset.
- Trocar o `onClick={() => setStyle(s.value)}` no grid de 4 estilos por `handleStylePresetChange(s.value)`.
- Adicionar botão abaixo dos 3 color pickers:
  ```tsx
  <button type="button" onClick={() => handleStylePresetChange(DEFAULT_STYLE)}
    className="text-xs text-muted-foreground hover:text-foreground underline">
    ↻ Resetar para padrão SmartDent
  </button>
  ```
- Passar `style` (preset) dentro de `generateBannerHTML` — o templates já lê do preset.

### 5. Empacotamento ZIP — remover base64 e omitir WebP em SMALL

Bug atual: `productImageUrl` recebe `webpDataUrl` (base64), inflando cada banner para ~103KB.

- `handleGenerate`: passar `productImageUrl: 'product.webp'` (caminho relativo) em vez de `webpDataUrl`. Guardar `webpBlob` em estado/ref para reuso no ZIP.
- `handleDownload(banner)`:
  - Se `getLayoutBucket(w,h) === 'SMALL'`: ZIP só com `index.html` + `manifest.json` (sem `product.webp`).
  - Caso contrário: `index.html` + `product.webp` + `manifest.json`.
- `handleDownloadAll`: idem, por subpasta.
- Adicionar `manifest.json` simples por banner (size, bucket, headline, ctaText, campaignSlug, weightKB, generatedAt).
- Renderers SMALL já não usam `<img class="pi">` — confirmado no código atual; nada a mudar lá além do logo via `pickLogo`.

Resultado esperado: `300x250.zip ~80KB`, `320x50.zip ~3KB`.

### 6. `src/components/google-ads/DisplayBannerPreview.tsx` — checklist

Atualizar labels do checklist para refletir a paleta SmartDent (sem mudanças funcionais grandes — apenas texto e o item de bucket SMALL com peso esperado < 5KB).

## Critérios de aceite

Banner 300×250 estilo Moderno:
- `index.html` < 5KB; `<img src="product.webp">` (não data URI)
- background `linear-gradient(135deg,#2C3E5F 0%,#1a2942 100%)`
- CTA `#E97935` / texto `#FFFFFF`
- FDA badge `#E97935` / `#FFFFFF`
- Logo SmartDent contém path `M18 60Q65-5 115 50`
- Headline com `-webkit-line-clamp:2`, sem cortar palavra
- `var clickTag` presente, `animation: ctaPulse ... 6`, UTMs no link

Estilos Minimalista/Bold/Clínico: cores conforme preset (validadas no checklist do PR).

ZIP:
- SMALL (320×50, 300×50, 320×100, 468×60): só `index.html` + `manifest.json`
- MEDIUM/LARGE/INTERSTITIAL: incluem `product.webp`
- Cada banner < 100KB

Formulário:
- Clicar em estilo atualiza os 3 pickers
- Botão "Resetar para padrão SmartDent" volta ao Moderno
- Validação WCAG continua funcionando
- Default ao abrir: Moderno, accent `#E97935`

Interstitial 480×320: CTA não cortado, imagem absorve sobra.

## Não fazer

- Sem libs novas (sem framer-motion, react-color)
- Sem persistência em localStorage
- Sem grid no lugar de flex onde já funciona
- Não consolidar os 2 paths do logo em path único

## Ordem de implementação (1 PR)

1. `smartdent-constants.ts` (novo)
2. `display-templates.ts`: SMARTDENT_LOGO + pickLogo + BUCKET_LIMITS + refatorar `getPalette` e renderers
3. Fix layout interstitial 480×320
4. `DisplayBannerGenerator.tsx`: defaults, `handleStylePresetChange`, botão de reset, `productImageUrl: 'product.webp'`
5. ZIP: omitir WebP em SMALL + manifest.json
6. Atualizar checklist em `DisplayBannerPreview.tsx`
