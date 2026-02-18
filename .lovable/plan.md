
# Export de PNGs de Alta Resolução (1080×1350px) para o Carrossel Visual

## Problema Atual

O botão "Baixar ZIP" no Carrossel Visual exporta **6 arquivos `.html`** — o usuário precisa abrir cada HTML no Chrome e tirar screenshot manualmente. A solicitação é exportar **PNGs de alta resolução diretamente**, sem HTML intermediário.

## Solução: Canvas API Nativa (sem bibliotecas extras)

Não há `html2canvas` nem `dom-to-image` instalados — e não são necessários. A solução correta é **redesenhar cada slide diretamente num `<canvas>` de 1080×1350px** usando a Canvas 2D API nativa do browser, que já suporta:
- `drawImage()` para inserir fotos reais do produto
- `fillRect()` + `createLinearGradient()` para os fundos e gradientes
- `fillText()` para os textos com fontes do sistema
- `canvas.toBlob('image/png')` para exportar como PNG real de alta resolução

Cada slide é renderizado num canvas separado, convertido para PNG via blob e empacotado no ZIP com JSZip (já instalado).

---

## Arquivos Modificados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `src/components/StrategicCarouselPreview.tsx` | Edição | Substituir `generateSlideHTML()` por `generateSlidePNG()` — função async que renderiza cada slide num canvas e retorna `Blob` PNG |
| `src/components/InstagramCopyGenerator.tsx` | Edição | Atualizar `handleExportZip()` para usar `generateSlidePNG()` e salvar `.png` ao invés de `.html` no ZIP |

---

## Nova Função: `generateSlidePNG()`

Função assíncrona exportada de `StrategicCarouselPreview.tsx`:

```text
export async function generateSlidePNG(
  slideNum: number,
  imageUrl: string,
  primaryColor: string,
  accentColor: string,
  productData: ProductData
): Promise<Blob>
```

**Fluxo interno por slide:**

1. Cria `canvas` de `1080 × 1350px` com `devicePixelRatio = 1`
2. Carrega a imagem do produto via `new Image()` com `crossOrigin = 'anonymous'`
3. Desenha fundo, imagem, gradientes e texto com a Canvas 2D API
4. Retorna `canvas.toBlob('image/png')` como Promise

**Mapeamento dos 6 layouts:**

| Slide | Renderização Canvas |
|-------|---------------------|
| 1 Hook | `fillRect` primário na metade superior → `drawImage` na metade inferior → `createLinearGradient` na junção → `fillText` extrabold centralizado |
| 2 Solução | `fillRect` branco → `drawImage` centralizado com sombra → `fillText` nome/categoria |
| 3 Técnico | `fillRect` escuro → `drawImage` lateral esquerda → lista de specs com ícone Unicode (⚡ 🛡 ★) à direita |
| 4 Experiência | `drawImage` na metade esquerda → `fillRect` primário na metade direita → `fillText` benefício |
| 5 Segurança | `drawImage` full → `filter: blur` via offscreen canvas → overlay escuro → badges com `strokeRect` + `fillText` |
| 6 CTA | `fillRect` primário → `drawImage` miniatura circular com clip → botão simulado com `roundRect` + `fillText` |

**Tratamento do blur (Slide 5):**
Como a Canvas API não tem `filter: blur` diretamente no `drawImage`, será usado o truque de desenhar a imagem num canvas auxiliar com `ctx.filter = 'blur(12px)'` antes de compor no canvas principal — técnica 100% nativa.

---

## Atualização do `handleExportZip()`

```text
// Antes (versão atual):
const html = generateSlideHTML(i, slideImageMap[i] || '', primaryColor, accentColor, productData);
zip.file(`${SLIDE_FILE_NAMES[i]}.html`, html);

// Depois (nova versão):
const pngBlob = await generateSlidePNG(i, slideImageMap[i] || '', primaryColor, accentColor, productData);
zip.file(`${SLIDE_FILE_NAMES[i]}.png`, pngBlob);
```

O nome do arquivo muda de `.html` para `.png`. O ZIP final conterá:

```text
carrossel-nome-produto/
  slide-1-hook.png          ← 1080×1350px PNG real
  slide-2-solucao.png       ← 1080×1350px PNG real
  slide-3-tecnico.png       ← 1080×1350px PNG real
  slide-4-experiencia.png   ← 1080×1350px PNG real
  slide-5-seguranca.png     ← 1080×1350px PNG real
  slide-6-cta.png           ← 1080×1350px PNG real
```

---

## Limitação de CORS nas Imagens

Para que `drawImage()` funcione com imagens externas, é necessário carregar com `crossOrigin = 'anonymous'`. Se o servidor de imagens não retornar o header `Access-Control-Allow-Origin`, o canvas ficará "tainted" e o `toBlob()` falhará.

**Solução de fallback**: se a imagem falhar por CORS, o slide é gerado sem a foto do produto (fundo de cor pura), e um aviso é exibido no toast. O export do ZIP prossegue normalmente com os demais slides.

---

## Texto e Fontes

A Canvas API usa as fontes do sistema operacional. Para garantir aparência premium, os textos usarão:
- `font = '900 96px system-ui, -apple-system, sans-serif'` para títulos extrabold
- `font = '400 48px system-ui, -apple-system, sans-serif'` para subtítulos
- `font = '700 40px system-ui, -apple-system, sans-serif'` para badges

---

## Resultado Final para o Usuário

1. Abre o Instagram Modal → aba "Carrossel Visual"
2. Seleciona imagens por slide / ajusta cores
3. Clica "📦 Baixar ZIP (6 PNGs)"
4. Recebe um `.zip` com 6 arquivos `.png` de 1080×1350px
5. Faz upload direto no Instagram sem nenhuma etapa extra
