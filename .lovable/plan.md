## Problema

No **🎨 Carrossel Visual — 6 Layouts de Alta Conversão**, as imagens dos slides **1 (🎣 Hook)** e **5 (🛡️ Segurança)** estão sendo renderizadas com aspect-ratio errado (esticadas/achatadas) tanto no preview quanto no export.

## Causa raiz

Em `src/components/StrategicCarouselPreview.tsx`:

1. **Slide 1 (`Slide1Hook`, linhas 689–796)** — o `<img>` usa `objectFit: cover`, mas combina com `transform: scale(imageScale/100)`. Quando `imageScale ≠ 100`, o transform expõe áreas vazias e o usuário percebe "distorção"/faixas. Além disso, o slide **não respeita** o toggle `coverMode` que já existe nos slides 2/3/4 — o usuário não tem controle sobre cover/contain nem sobre o reposicionamento do recorte.

2. **Slide 5 (`Slide5Security`, linhas 1337–1397)** — mesmo padrão: imagem de fundo (com `blur(8px)`) usa `objectFit: cover` + `transform: scale(imageScale/100 * 1.1)`. O scale em cima do cover causa o mesmo problema (e visualmente o "esticamento" fica mais evidente por causa do blur). Também não tem toggle `coverMode` nem `objectPosition`.

3. **Wrapper full-bleed** (`SlideWrapper`, linhas 453–469) já implementa render correto de imagem full-bleed via `mediaObjectFit` (cover/contain) — mas só é ativado quando `sideStripVisible === 'false'`, toggle que **não existe** no editor dos slides 1 e 5.

## Solução

### 1. Slide 1 (Hook)
- Remover o `transform: scale(...)` da `<img>` interna (causa o efeito de "estica/achata" visual).
- Substituir o render de imagem interno pelo caminho **full-bleed do wrapper** (`useFullBleedImage`), reutilizando o mecanismo já testado dos slides 3/4/5.
- Adicionar no editor do Slide 1 os controles **`coverMode`** (Cover/Contain) e **`objectPosition`** (Centro/Topo/Base/Esquerda/Direita), padrão `cover` + `center`.
- Ajustar `Slide1Hook` para receber `image=""` quando o wrapper assume o full-bleed (mesma lógica já usada nos slides 3/4/5 via `useFullBleedImage`).

### 2. Slide 5 (Segurança)
- Remover o `transform: scale(...)` da imagem de fundo blur.
- Manter o `filter: blur(8px)` mas com `objectFit: cover` puro + `objectPosition` controlável.
- Adicionar no editor do Slide 5 os mesmos controles **`coverMode`** e **`objectPosition`**.
- Padrão continua `cover + center` (atende a escolha do usuário).

### 3. Export (PNG + MP4)
- `StrategicSlideRender` já renderiza o mesmo JSX do preview, então a correção propaga automaticamente para `generateSlidePNG` e `generateStrategicSlideVideo`. Nenhuma mudança adicional necessária no pipeline de export.
- Verificar (e ajustar se preciso) que `html2canvas` honra `objectFit: cover` + `objectPosition` no snapshot — caso contrário, fallback usando `background-image` + `background-size: cover` + `background-position` no `<div>` (mesma técnica já aplicada anteriormente no Engagement).

### 4. Validação
- Reproduzir via Playwright headless: carregar `/copy-generator`, abrir Carrossel Visual, gerar Slide 1 e 5 com imagem de aspect 1:1 e 16:9, conferir preview e PNG/MP4 exportados em 1080×1350 com aspect correto (sem achatamento).

## Arquivos afetados
- `src/components/StrategicCarouselPreview.tsx` (Slide1Hook, Slide5Security, definição de campos do editor, SlideWrapper se necessário)

Sem mudanças de schema, sem mudanças em outros geradores.
