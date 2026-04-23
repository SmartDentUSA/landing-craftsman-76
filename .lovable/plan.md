

## Plano: paridade Preview ↔ PNG no Carrossel Visual (6 Layouts)

### Diagnóstico

Os PNGs anexados (`slide-1-hook-7.png`, `slide-2-solucao-9.png`, etc.) **não vêm do Carrossel Engajamento** que corrigimos no turno anterior. Vêm de um **segundo gerador**: `🎨 Carrossel Visual — 6 Layouts de Alta Conversão`, em `src/components/StrategicCarouselPreview.tsx`.

Esse arquivo (1882 linhas) ainda usa o pipeline antigo:
- **Preview JSX**: 6 componentes `Slide1Hook`, `Slide2Solution`, `Slide3Technical`, `Slide4Experience`, `Slide5Security`, `Slide6CTA` — cada um com layout próprio (split, full-bleed, cards, etc.)
- **Export PNG**: `generateSlidePNG` (linha 1251 até ~1880, ~630 linhas de Canvas 2D manual) que reconstrói tudo com `measureText`, `roundRect`, `drawImageCover`

Os dois pipelines divergiram. Sintomas visíveis nos PNGs:

| Slide | Sintoma no PNG | Causa no canvas |
|---|---|---|
| 1 | Texto centralizado em vez do gancho posicionado pelo JSX, faixa colorida ausente | Canvas ignora `faixaVisible`/`faixaColor` |
| 2 | Imagem do screenshot FDA cobre tela inteira, texto "Entendemos a sua dúvida..." preto sobrescrevendo a imagem | Canvas usa imagem full-bleed mas o JSX usa layout duas-colunas com card de texto |
| 3 | Layout split funcionando porém ícones aparecem como `⚡ 🛡 ⭐` em quadrados pretos (canvas não renderiza emoji direito) | `ctx.fillText('⚡')` em algumas fontes vira tofu |
| 4 | "OVEREDÍTO FINAL" cortado pela esquerda, kicker "16 ANOS DE PESQUISA…5 AN" truncado no meio da palavra | Canvas não respeita padding-left e trunca sem ellipsis |
| 5 | Título "SEGURA E DEFINITIVA" sobrepondo os 3 cards de bullets do meio | Canvas desenha título e cards em coordenadas fixas que colidem quando o título tem 4 linhas |
| 6 | OK | Layout simples bate |

Mesmo problema estrutural que o Engagement antes do fix anterior — manter dois pipelines é insustentável e a divergência é intrínseca.

### Solução: aplicar Abordagem A (a mesma que já funcionou no Engagement)

Trocar a função `generateSlidePNG` (canvas manual) por uma renderização real do JSX via `html2canvas`. Os componentes JSX viram a fonte única de verdade.

### O que muda em código

**1. `src/components/StrategicCarouselPreview.tsx`**

- **Adicionar componente exportado `StrategicSlideRender`** (irmão do `EngagementSlideRender`):
  ```ts
  export function StrategicSlideRender({ slideNum, image, primaryColor, accentColor, productData, texts }) {
    if (slideNum === 1) return <Slide1Hook image={image} primaryColor={primaryColor} productData={productData} texts={texts} />;
    if (slideNum === 2) return <Slide2Solution ... />;
    if (slideNum === 3) return <Slide3Technical ... />;
    if (slideNum === 4) return <Slide4Experience ... />;
    if (slideNum === 5) return <Slide5Security ... />;
    if (slideNum === 6) return <Slide6CTA ... />;
    return null;
  }
  ```
- **Reescrever `generateSlidePNG`** (substituir as ~630 linhas de canvas por ~60 linhas de orquestração html2canvas):
  ```ts
  export async function generateSlidePNG(slideNum, imageUrl, primaryColor, accentColor, productData, texts): Promise<Blob> {
    // 1. Pre-fetch imagem como dataUrl (CORS-safe)
    const imgDataUrl = imageUrl ? await fetchAsDataUrl(imageUrl).catch(() => imageUrl) : '';
    
    // 2. Container off-screen 1080x1350
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-99999px;top:0;width:1080px;height:1350px;overflow:hidden;pointer-events:none;z-index:-1;';
    document.body.appendChild(container);
    
    // 3. Render React no container
    const root = createRoot(container);
    await new Promise<void>(resolve => {
      root.render(React.createElement(StrategicSlideRender, {
        slideNum, image: imgDataUrl, primaryColor, accentColor, productData, texts
      }));
      requestAnimationFrame(() => {
        // wait images decode (mesmo padrão do Engagement fix)
        const imgs = container.querySelectorAll('img');
        Promise.all(Array.from(imgs).map(i => 
          i.complete && i.naturalWidth > 0 
            ? Promise.resolve() 
            : new Promise<void>(r => { i.onload = i.onerror = () => r(); setTimeout(r, 3000); })
        )).then(() => setTimeout(resolve, 80));
      });
    });
    
    let blob: Blob | null = null;
    try {
      const snapshot = await html2canvas(container, {
        width: 1080, height: 1350, windowWidth: 1080, windowHeight: 1350,
        scale: 1, useCORS: true, allowTaint: false, backgroundColor: null, logging: false, imageTimeout: 4000,
      });
      blob = await new Promise<Blob | null>(resolve => snapshot.toBlob(resolve, 'image/png'));
    } finally {
      try { root.unmount(); } catch {}
      try { container.remove(); } catch {}
    }
    if (!blob) throw new Error('html2canvas snapshot failed');
    return blob;
  }
  ```
- **Manter** as funções helper de canvas usadas SÓ pelo `generateSlidePNG` antigo (`roundRect`, `drawBadge`, `drawImageCover`, `loadImage`, etc.) — apagar para reduzir os 1882 linhas para ~1250 linhas.
- **Imports novos** no topo: `import { createRoot } from 'react-dom/client';` e `import html2canvas from 'html2canvas';` (já instalados, usados no Engagement).

**2. `src/components/InstagramCopyGenerator.tsx`**

- **Sem mudanças na assinatura**: `handleExportZip` (linha 794) já chama `generateSlidePNG(i, safeDataUrl, primaryColor, accentColor, productData, textsForSlide)` — interface mantida igual, só a implementação interna muda.

### Validação esperada

Após o fix, ao clicar "📦 Baixar ZIP" no Carrossel Visual, os 6 PNGs sairão **idênticos** ao preview na tela:
- Slide 1: gancho posicionado e faixa colorida visível
- Slide 2: layout duas-colunas com card de texto preservado (não imagem full-bleed)
- Slide 3: ícones renderizados via Lucide (SVG, sem tofu de emoji)
- Slide 4: kicker, título e bullets nas posições corretas, sem truncar palavras
- Slide 5: título acima dos cards, cards renderizados como blocos com background
- Slide 6: já estava OK, continua OK

### Risco

- Mesmo risco do fix anterior do Engagement: cada PNG passa de ~50ms (canvas) para ~500ms (html2canvas). 6 slides → +3s no ZIP. Aceitável.
- O preview do Slide 4 ("Experience") usa `buildImpactNarrative` que lê `productData` — preciso garantir que o componente recebe o mesmo `productData` quando renderizado off-screen para export. Vou passar exatamente as mesmas props que o preview já usa.

### Arquivos modificados

- `src/components/StrategicCarouselPreview.tsx` — adicionar `StrategicSlideRender`, reescrever `generateSlidePNG`, remover ~600 linhas de canvas obsoleto
- (sem mudanças em `InstagramCopyGenerator.tsx`)

### Não escopo (fora deste plano)

- Vídeos no Carrossel Visual: este gerador hoje só exporta PNG estático, não tem `mediaType: 'video'` como o Engagement. Mantém igual.
- Mudanças visuais nos layouts JSX: se você quer ajustar **como** o preview é desenhado (por ex., mudar a posição do título do slide 5 para não colidir com cards), é um plano separado de redesign — este aqui só garante que o PNG = preview.

