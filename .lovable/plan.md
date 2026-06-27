# Plano — Carrossel Engajamento (Slide 6 CTA + Logos por slide)

Escopo: APENAS o `🎯 Carrossel Engajamento`. Não tocar no Visual/Estratégico.

## 1. Corrigir corte do texto no Slide 6 (CTA)

Arquivo: `src/components/EngagementCarouselPreview.tsx`

**Causa:** o container do Slide 6 usa `justifyContent: 'center'` + padding assimétrico `60px 60px 140px` + `overflow: hidden`. Quando título + mídia(260) + corpo + botão CTA somam mais que a área útil, o flex centraliza e **corta a parte superior** (o título "Tempo de impressão" some no topo).

**Correções (render HTML, ~linhas 703-778):**
- Trocar `justifyContent: 'center'` por `justifyContent: 'flex-start'`.
- Padding equilibrado: `padding: '90px 60px 110px'` (mais respiro no topo).
- Reduzir `gap` de 40 → 28.
- Reduzir `MediaBlock height` de 260 → 230.
- Título: `maxHeight: 180` → `maxHeight: 160` e `WebkitLineClamp: 3` → `2` (evita estouro vertical e mantém legibilidade).
- Corpo: `maxHeight: 130` → `110`, `WebkitLineClamp: 3` → `2`.
- Badge "6": mover de `bottom: 40` para `bottom: 24` para não competir com o CTA.

**Render Canvas/Vídeo (~linhas 1050-1160, Slide 6):** aplicar as mesmas reservas — topo 90, fundo 110, altura de mídia 230, gap 28, máx 2 linhas em título/corpo — para manter paridade com o PNG/MP4 exportado.

## 2. Upload de Logo da Empresa + Logo do Produto por slide (com slider)

Arquivo: `src/components/EngagementCarouselPreview.tsx` (+ persistência em `src/components/InstagramCopyGenerator.tsx`).

**Modelo de dados** — estender `EngagementSlideTexts`:
```ts
companyLogoUrl?: string;     // URL persistida em Storage
productLogoUrl?: string;
companyLogoScale?: string;   // "40".."200" (default "100")
productLogoScale?: string;
```

**Editor (✏️) de cada um dos 6 slides** — adicionar em `SLIDE_EDITOR_FIELDS` (slides 1-6):
- `companyLogoUrl` → tipo novo `logo-upload` (botão Upload + Remover + preview 48px).
- `companyLogoScale` → `slider` (40-200%, default 100).
- `productLogoUrl` → `logo-upload`.
- `productLogoScale` → `slider` (40-200%).

O handler `handleFileUpload` ganha um modo `'logo-company' | 'logo-product'` que sobe o arquivo via `onImageFileUpload` (estender assinatura para aceitar um `kind` opcional) e grava a URL no campo correspondente via `onSlideTextChange`.

**Overlay no slide (render HTML e Canvas)** — novo componente `LogoOverlay` renderizado dentro do shell 1080×1350 de **todos** os 6 slides:
- Logo da empresa: `top: 36, right: 36`, altura base 90px × `companyLogoScale/100`.
- Logo do produto: `bottom: 36, left: 36`, altura base 90px × `productLogoScale/100`.
- `z-index: 50`, `pointer-events: none`, `drop-shadow` leve, `object-fit: contain`, `maxWidth: 45%`.
- No Slide 6, posicionar o badge "6" para não colidir (já reposicionado em #1).

**Paridade na exportação:**
- HTML preview: render direto via `<img crossOrigin="anonymous">`.
- Canvas (vídeo/PNG): pré-buscar cada logo com `fetchAsDataUrl()` (já existe, importado de `StrategicCarouselPreview`) e desenhar no canvas com `ctx.drawImage` nas mesmas coordenadas, antes de finalizar o frame/encerrar a gravação.

**Persistência (Storage):**
- `src/components/InstagramCopyGenerator.tsx`: no handler `onImageFileUpload` do Engajamento, detectar `kind === 'logo-company' | 'logo-product'` e salvar em `product-images/engagement-carousel/{productId}/logo_company_<ts>.<ext>` (ou `logo_product_...`), atualizando o `slideTexts` do slide alvo com a URL pública retornada.

## 3. Verificação

- Abrir o Carrossel Engajamento, Slide 6: o título "Tempo de impressão" deve aparecer inteiro, sem corte no topo, com botão CTA visível e badge "6" sem sobreposição.
- Em qualquer slide, abrir ✏️ → conferir 4 novos campos (2 uploads + 2 sliders 40-200%).
- Upload de PNG do logo deve aparecer imediatamente no preview e ser mantido após "💾 Salvar".
- Baixar ZIP: os PNGs e o vídeo (Slide 1, quando houver) precisam conter os logos nas mesmas posições.
- Enviar para SmartOps: idem (arquivos no Sistema B contêm os logos).

Sem alterações no Visual/Estratégico, sem migrations, sem mudanças em outros componentes.
