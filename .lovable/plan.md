# Refatoração do Gerador de Display Banners (Google Ads) — v2

## Objetivo

Refatorar o gerador para produzir banners HTML5 prontos para campanha no Google Display Network: 4 buckets de layout dedicados, clickTag IAB, tracking UTM/GA4, smart truncate, validação de peso/contraste, animação compliant e acessibilidade.

Foco no produto **Resina Smart Print Bio Vitality** (FDA K260152, Classe II). Reutilizável para qualquer produto.

## Bugs colaterais corrigidos junto

1. `supabase/functions/generate-display-banners/index.ts` — `const toolCall` declarado 2x (linhas 114-115) → `SyntaxError`. Removido na refatoração da edge function.
2. `display-templates.ts` — extração de CSS por `split('\n')` frágil → reescrito com objeto estruturado por bucket.

## O que NÃO será tocado

Schema do banco, upload de imagem para Supabase Storage, sistema de auth, Sistema A da SmartDent.

## Arquitetura — Separação de responsabilidades (revisada)

**Front (`src/components/google-ads/`) é dono de TUDO que gera HTML.** Edge function só faz uma coisa: gerar copy via AI quando o usuário deixa headline vazia. Sem duplicação de renderers.

```text
DisplayBannerGenerator.tsx
  ├─ (opcional) chama edge fn → recebe { headline, subheadline } por bucket
  ├─ chama renderSmall/Medium/Large/Interstitial (display-templates.ts)
  ├─ valida peso, contraste, checklist
  └─ empacota ZIP

generate-display-banners/index.ts
  └─ APENAS: AI copy generator → retorna { copies: [{ bucket, headline, subheadline }] }
```

## Mudanças por arquivo

### 1. `src/types/google-ads.ts`

- `DisplayBucket = 'small' | 'medium' | 'large' | 'interstitial'`
- `DisplayFormat` ganha `bucket: DisplayBucket`
- `DisplayBannerConfig`: `headline`, `subheadline`, `ctaText`, `accentColor`, `fdaBadge`, `campaignSlug`, `baseUrl`, `bgGradient?`, `imagesByBucket?: Partial<Record<DisplayBucket, string>>`
- `DisplayBanner`: `bucket`, `weightTotalKB`, `accessibility`, `manifest`, `checklist`

### 2. `src/components/google-ads/display-templates.ts` — reescrita completa

**Catálogo (13 tamanhos) por bucket:**

```text
SMALL          MEDIUM         LARGE           INTERSTITIAL
320x50         300x250        728x90          320x480
300x50         336x280        970x250         480x320
320x100        250x250        300x600
                              160x600
                              200x200
```

**Helpers compartilhados (exports nomeados):**

```ts
export function escapeHtml(s: string): string  // & < > " ' → entidades
export function smartTruncate(text: string, maxChars: number): string
export function pickBgGradient(accentColor: string, custom?: string): string
export function buildClickHandler(o: { campaignSlug, size, headline }): string  // JS inline
export function buildAriaLabel(headline: string, ctaText: string): string
export function buildAltText(productName: string, headline: string): string
export function getContrastRatio(fg: string, bg: string): number  // WCAG 2.1 relative luminance
export function smartDentLogoSVG(color?: string): string  // SVG inline (~1KB) para SMALL
```

`escapeHtml` é aplicado **obrigatoriamente** em `headline`, `subheadline`, `ctaText`, `productName`, `altText`, `ariaLabel` antes de interpolar nos templates de cada bucket.

**4 funções de template (sem escala decimal):**

- `renderSmall(p)` — horizontal: faixa colorida + headline grande truncado + selo "FDA" + CTA. **Sem foto**: usa `smartDentLogoSVG()` inline (~1KB, sem requisição). Para 320x50/300x50 a subheadline é omitida.
- `renderMedium(p)` — vertical: foto + headline + subheadline + CTA pulsante.
- `renderLarge(p)` — premium horizontal/vertical: hero image, headline destacada, subheadline, FDA badge top-right, CTA grande pulsante.
- `renderInterstitial(p)` — fullscreen mobile: hero full-bleed + gradient overlay + headline grande + CTA fixo no rodapé.

**clickTag IAB padrão (em TODOS os templates):**

```html
<script>
  var clickTag = "{{BASE_URL_ESCAPED}}";
</script>
```

Handler de click usa `clickTag` se definido pelo Google Ads, senão `BASE_URL`:

```js
function handleBannerClick(e){
  e.preventDefault();
  var base = (typeof clickTag !== 'undefined' && clickTag) ? clickTag : "{{BASE_URL}}";
  var u = base + (base.indexOf('?')>-1?'&':'?')
    + 'utm_source=display&utm_medium=banner'
    + '&utm_campaign=' + encodeURIComponent("{{SLUG}}")
    + '&utm_content={{SIZE}}'
    + '&utm_term=' + encodeURIComponent("{{HEADLINE_TRUNC}}");
  if (typeof gtag !== 'undefined') gtag('event','banner_click',{banner_size:"{{SIZE}}",campaign:"{{SLUG}}",headline:"{{HEADLINE_ESC}}"});
  if (window.dataLayer) window.dataLayer.push({event:'banner_click',banner_size:"{{SIZE}}",campaign:"{{SLUG}}"});
  window.open(u,'_blank','noopener');
}
```

Substitui o `onclick="window.open(...)"` antigo. `.banner` recebe `role="link"`, `tabindex="0"`, `aria-label` completo.

**Animação CTA (limitada — Google Ads rejeita infinitas):**

```css
@keyframes ctaPulse {
  0%,100% { transform: scale(1); box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  50%     { transform: scale(1.04); box-shadow: 0 4px 16px var(--accent-glow); }
}
.cta-btn {
  animation: ctaPulse 2.5s ease-in-out 6;   /* iteration-count: 6 (~15s total) */
  animation-delay: 1s;
  animation-fill-mode: both;
}
```

Mantém `fadeIn` inicial. Total de animação ≤ 16s, dentro do limite Google Ads (30s).

**FDA Badge** quando `fdaBadge: true` — `<div class="fda-badge">FDA K260152</div>` absoluto top-right, com `escapeHtml` na classe se houver custom text futuro. Some no SMALL com altura ≤ 50.

**Imagens:**
- SMALL: SVG inline via `smartDentLogoSVG()`, sem `<img>`.
- MEDIUM/LARGE/INTERSTITIAL: **apenas WebP** (sem fallback JPG):
  ```html
  <img src="product.webp" alt="{altText}" loading="lazy">
  ```
  Reduz peso ~60%. Todos browsers suportados pelo Google Ads aceitam WebP desde 2020.

### 3. `src/components/google-ads/DisplayBannerGenerator.tsx`

**Novos campos no formulário:**

- **Headline** (Input + dropdown sugestões: "Restaurações DEFINITIVAS — FDA K260152", "A 1ª Resina 3D Classe II do Brasil", "Coroas e facetas em horas, não em dias", "Sem provisório. Definitivo de verdade.")
- **Subheadline** (Input opcional, max 60)
- **CTA Text** (dropdown: "Comprar agora", "Ver registro FDA", "Pedir amostra", "Falar com vendas")
- **Accent Color** (color picker, default `#00d4ff`)
- **FDA Badge** (Checkbox, default `true`)
- **Campaign Slug** (Input slugificado, default `vitality_fda_q2_2026`)
- **Base URL** (Input — antigo `finalUrl`)
- **Imagens por bucket** (UI colapsada, override opcional)

**Validações no submit (bloqueiam geração):**

- `campaignSlug` obrigatório
- `baseUrl` URL parseável
- `headline` ≤ 40 (medium) / ≤ 25 (small)
- **Contraste WCAG**: `getContrastRatio(accentColor, '#FFFFFF') ≥ 4.5` — se falhar, mensagem: *"Cor de destaque tem contraste insuficiente com o texto branco do CTA (X:1, mínimo 4.5:1). Escolha uma cor mais escura."* + sugestão de cor escurecida automaticamente.

**Conversão de imagem para WebP** (Canvas client-side):

```ts
async function imageToWebP(srcUrl, maxDim): Promise<Blob>
```

Uma chamada por bucket usado, max-dim = maior dimensão do bucket × 2 (retina). Resultado cacheado.

**Geração:**

1. Se `headline` vazia → chama edge fn para gerar copy AI por bucket
2. Para cada formato selecionado: aplica `renderXXX()` do `display-templates.ts`
3. Calcula peso total (HTML + WebP)
4. Roda checklist (10 itens)
5. Renderiza preview

### 4. `src/components/google-ads/DisplayBannerPreview.tsx`

- Painel "Checklist" colapsável com 10 critérios (cada um chip verde/vermelho).
- Badge de peso colorido: verde <100KB, amarelo 100-150KB, vermelho >150KB.
- Botão Download desabilitado se peso >150KB (tooltip explicativo).
- Selo "✅ Pronto para campanha" quando todos os 10 critérios passam.

### 5. `supabase/functions/generate-display-banners/index.ts` — simplificada drasticamente

**Responsabilidade única: gerar copy via AI.** Sem renderers, sem HTML.

- Corrige bug `const toolCall` duplicado.
- Aceita: `productName`, `productDescription`, `ctaText`, `buckets: DisplayBucket[]`, `tone?`.
- Retorna: `{ copies: [{ bucket, headline, subheadline }] }`.
- Prompt instrui limites por bucket: small ≤ 25 chars / medium ≤ 40 / large ≤ 60.
- Tool call único `generate_banner_copy_per_bucket`.
- Reduz arquivo de 234 → ~110 linhas.

### 6. `manifest.json` por banner (no ZIP)

```json
{
  "size": "300x250",
  "bucket": "medium",
  "headline": "...",
  "ctaText": "...",
  "campaignSlug": "vitality_fda_q2_2026",
  "weightTotalKB": 67.4,
  "generatedAt": "2026-04-27T...",
  "fdaBadge": true,
  "clickTag": "https://...",
  "checklist": { "weight": true, "truncate": true, "clickTag": true, ... }
}
```

### 7. ZIP por banner / "Exportar todos"

Cada ZIP por tamanho:

```text
banner-300x250.zip
├── index.html
├── product.webp        (omitido no SMALL bucket)
└── manifest.json
```

`Exportar todos` → `display-banners-all.zip` com 13 subpastas.

## Ordem de implementação (1 PR único)

1. Tipos (`google-ads.ts`)
2. Templates (`display-templates.ts`): helpers (`escapeHtml`, `smartTruncate`, `getContrastRatio`, `pickBgGradient`, `buildClickHandler`, `smartDentLogoSVG`) + 4 renderers + clickTag + animação 6 ciclos
3. Edge function: simplifica para AI-copy-only + corrige bug duplo `toolCall`
4. UI (`DisplayBannerGenerator.tsx`): novos campos, validação contraste WCAG, conversão WebP, dropdowns, checklist
5. Preview (`DisplayBannerPreview.tsx`): checklist + gating de download
6. ZIP com `manifest.json` + `product.webp` apenas

## Aguardando do usuário

**Logo SmartDent SVG simplificado**: o usuário enviará o arquivo. Implementação inicial usa um placeholder SVG (frasco minimalista + texto "SmartDent") e troca por `smartDentLogoSVG()` quando o arquivo chegar — não bloqueia o PR.

## Critérios de aceite (10 itens — chip por banner)

| # | Critério | Como validamos |
|---|---|---|
| 1 | Peso < 150KB | Soma HTML+WebP, badge no preview, bloqueia download se falhar |
| 2 | Headline ≤ limite do bucket | Validado no submit + `smartTruncate` |
| 3 | Description não corta no meio da palavra | `smartTruncate` adiciona `…` no último espaço |
| 4 | UTMs no link | `handleBannerClick` injetado |
| 5 | gtag/dataLayer event | Presente no JS inline |
| 6 | clickTag IAB definido | `<script>var clickTag=...</script>` presente |
| 7 | Background ≠ cor da imagem (sem #000→#000) | `pickBgGradient` valida |
| 8 | Contraste WCAG do CTA ≥ 4.5:1 | `getContrastRatio` no submit |
| 9 | Animação CTA com `iteration-count: 6` (não infinita) | Regex no CSS gerado |
| 10 | FDA badge presente (se ativo) + alt/aria-label preenchidos | DOM contém `.fda-badge`, `<img alt>`, `.banner[aria-label]` |

Cada item exibido como chip verde/vermelho. Selo "✅ Pronto para campanha" só se todos passarem.

## Sem mudanças de banco

Nenhuma migration. Tudo no front + edge function existente simplificada.
