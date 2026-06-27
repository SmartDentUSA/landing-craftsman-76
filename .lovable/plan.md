## Objetivo

Replicar no Slide 4 (💫 Experiência) e Slide 5 (🛡️ Segurança) os mesmos controles "slice" (toggles de visibilidade) que existem hoje no Slide 3 (🔬 Cientificidade): mostrar/ocultar bloco colorido e mostrar/ocultar faixa lateral de imagem. Quando ocultados, o conteúdo se adapta ao espaço cheio.

## Mapeamento

**Slide 3 (referência):**
- `headlineVisible` → liga/desliga bloco colorido (headline)
- `sideStripVisible` → liga/desliga faixa lateral com imagem (texto ocupa 100%)

**Slide 4 (💫 Experiência) — equivalência:**
- `headlineVisible` → liga/desliga o headline "keyword" (h2 principal) + divider accent
- `sideStripVisible` → liga/desliga a faixa esquerda 42% com a imagem; quando desligada o painel direito ocupa 100%

**Slide 5 (🛡️ Segurança) — equivalência:**
- `headlineVisible` → liga/desliga o `title` ("Você pode confiar")
- `sideStripVisible` → liga/desliga a imagem de fundo (blur) + overlay escuro; quando desligada usa só `bgColor` sólido e ajusta cor dos badges/textos via luminância para manter legibilidade

## Mudanças (somente apresentação)

Arquivo: `src/components/StrategicCarouselPreview.tsx`

1. **Tipos** (linhas 65–75): adicionar `headlineVisible?: string; sideStripVisible?: string` nos tipos de `slideTexts[4]` e `slideTexts[5]`.

2. **SLIDE_EDITOR_FIELDS[4] e [5]** (linhas 171–187): adicionar os dois toggles, exatamente com os mesmos labels do Slide 3:
   - `{ key: 'headlineVisible', label: 'Mostrar bloco colorido (headline)', type: 'toggle' }`
   - `{ key: 'sideStripVisible', label: 'Mostrar faixa lateral (imagem)', type: 'toggle' }`

3. **`Slide4Experience`** (linhas 1212–1280):
   - Ler `sideStripVisible` e `headlineVisible` com default `'true'`.
   - Envolver `<div style={{ width: '42%' ... }}>` em `{sideStripVisible && (...)}`.
   - Quando `!sideStripVisible`: painel direito usa `maxWidth: '100%'` e padding simétrico.
   - Envolver `<h2>` do `finalKeyword` + divider em `{headlineVisible && (...)}`.

4. **`Slide5Security`** (linhas 1284–1327):
   - Ler os dois toggles.
   - Envolver `<img ... blur>` + overlay escuro em `{sideStripVisible && (...)}`. Quando off, apenas `bgColor5` (com fallback `#0f0f14`) e recalcular cor de textos/badges via `getLuminance` para legibilidade.
   - Envolver o `<h2>` do `title` em `{headlineVisible && (...)}`.

Nada mais é alterado — lógica de vídeo, logos, fontes e export permanecem intactos.