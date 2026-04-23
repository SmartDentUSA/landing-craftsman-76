

## Plano: paridade Preview ↔ PNG exportado no Carrossel de Engajamento

### O problema real (confirmado pelos PNGs enviados)

O sistema tem **dois pipelines de renderização** que produzem resultados diferentes:

1. **Preview JSX** (`renderSlideContent`): HTML/CSS com `flex`, `WebkitLineClamp`, `objectFit: cover`
2. **PNG exportado** (`generateEngagementSlidePNG`): Canvas 2D com `measureText`, `clip()`, `drawImageCover` manual

Eles divergem em pontos específicos visíveis nos PNGs:

| Slide | Sintoma no PNG | Causa raiz |
|---|---|---|
| 2 | Imagem (screenshot FDA vertical) cortada no topo, texto "Entendemos a sua dúvida..." entrando no bloco da imagem | `imgH = 440` fixo + `drawImageCover` corta verticalmente uma imagem 9:16, e o título tem 4 linhas que estouram o `clip()` empurrando o `curY` da imagem para cima |
| 4 | Título "OVEREDÍTO FINAL" cortado pela esquerda, kicker "16 ANOS DE PESQUISA... 3 ANOS DE P&D, 5 AN" truncado no meio da palavra | Texto contém `\n` interno que o canvas trata como 1 linha só; o `clip()` corta horizontalmente sem ellipsis e sem reflow |
| 5 | Título "SEGURA E DEFINITIVA" sobrepondo os 3 cards de bullets do meio | Os cards de bullets na verdade estão **dentro do campo `text`** mas renderizados como blocos com background no preview JSX, enquanto o canvas desenha como texto plano sobreposto |

### Diagnóstico sintetizado

O canvas PNG **não é uma fotografia do preview** — é uma reconstrução manual que perdeu features ao longo do tempo:
- Não respeita `\n` (quebras manuais de linha)
- Não trunca com ellipsis quando estoura `maxLines`
- Não renderiza markdown/lista/cards como o JSX faria
- Calcula `imgH` fixo independente da proporção da imagem

### Solução proposta — duas abordagens

**Abordagem A — Substituir canvas por html2canvas (RECOMENDADA)**

Trocar `generateEngagementSlidePNG` por uma renderização real do JSX via `html2canvas`. O preview vira a fonte única de verdade.

```text
Pipeline novo:
  1. Renderizar <SlidePreview /> em <div> off-screen 1080x1350px (sem scale)
  2. html2canvas(div) → canvas 1080x1350
  3. canvas.toBlob() → PNG
  4. Resultado = pixel-perfect igual ao preview
```

Vantagens:
- **Paridade 100% garantida** — o que você vê é o que sai
- Elimina ~600 linhas de código duplicado de canvas
- Suporta automaticamente cards, listas, line-clamp, ellipsis
- Mudanças futuras em design só precisam atualizar JSX

Custo:
- +1 dependência (`html2canvas` ~120 KB minified)
- Vídeo export precisa de tratamento separado (continua via canvas+MediaRecorder, mas com overlay JSX renderizado uma vez via html2canvas)

**Abordagem B — Corrigir paridade do canvas atual (paliativa)**

Manter canvas mas alinhar com JSX em 5 pontos:
1. Suportar `\n` no `drawRichText` (quebra forçada de linha)
2. Adicionar ellipsis "..." quando texto truncado por `maxLines`
3. Calcular `imgH` dinamicamente baseado na proporção da imagem (não 440 fixo)
4. Slide 5: detectar se `text` contém marcadores de lista (`•`, `-`, números) e renderizar como cards igual ao JSX
5. Garantir que `clip()` nunca corte caracteres no meio (medir até último espaço cabível)

Vantagens:
- Sem nova dependência
- Mais leve em runtime

Desvantagens:
- ~300 linhas de código novo só pra reproduzir o que CSS faz nativamente
- Toda mudança futura de layout exige duplicar nos 2 pipelines
- Risco alto de divergência voltar em 1-2 sprints

### Recomendação: Abordagem A (html2canvas)

Pelo histórico do componente (preview e canvas já divergiram 3x desde criação) e pela complexidade dos slides (cards, listas, gradientes, badges), manter dois pipelines é insustentável.

### Arquivos a modificar (Abordagem A)

1. **`package.json`** — adicionar `html2canvas` (~120KB)

2. **`src/components/EngagementCarouselPreview.tsx`**:
   - Extrair `renderSlideContent` para componente exportado `<EngagementSlideRender />` (mesmo JSX, props)
   - Reescrever `generateEngagementSlidePNG`:
     ```ts
     export async function generateEngagementSlidePNG(slideNum, imageUrl, texts, ...) {
       // 1. Pre-fetch imagem como dataUrl (CORS)
       const imgDataUrl = imageUrl ? await fetchAsDataUrl(imageUrl) : '';
       
       // 2. Criar container off-screen 1080x1350
       const container = document.createElement('div');
       container.style.cssText = 'position:fixed;left:-99999px;top:0;width:1080px;height:1350px;';
       document.body.appendChild(container);
       
       // 3. Renderizar React no container
       const root = createRoot(container);
       await new Promise(resolve => {
         root.render(<EngagementSlideRender 
           slideNum={slideNum} texts={texts} imageUrl={imgDataUrl} 
           primaryColor={...} accentColor={...} brandName={...} handleName={...}
           onMounted={resolve}
         />);
       });
       
       // 4. html2canvas
       const canvas = await html2canvas(container, {
         width: 1080, height: 1350, scale: 1, useCORS: true, backgroundColor: null
       });
       
       // 5. Cleanup + Blob
       root.unmount();
       container.remove();
       return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
     }
     ```
   - Reescrever `drawSlideFrameWithVideo` (usado pelo MediaRecorder): manter canvas para a parte do vídeo (porque é frame-a-frame), mas injetar overlay de texto/badge **uma vez via html2canvas** num canvas separado e compor por cima do frame de vídeo a cada tick.

3. **`src/components/EngagementCarouselSection.tsx`** — sem mudanças (interface da função permanece igual)

### Fluxo de execução

```text
Fase 1 — Refactor preview (estrutural)
  ├─ Extrair renderSlideContent → componente EngagementSlideRender exportado
  ├─ SlideWrapper passa a usar <EngagementSlideRender /> em vez de inline render
  └─ Validar que preview continua idêntico (zero mudança visual no editor)

Fase 2 — Reescrever PNG export
  ├─ Adicionar html2canvas
  ├─ Implementar generateEngagementSlidePNG com createRoot + html2canvas
  ├─ Pré-fetch de imagens como dataUrl (CORS-safe)
  └─ Testar 6 slides com os textos atuais do produto Bio Vitality

Fase 3 — Adaptar video export
  ├─ Renderizar overlay (texto/badge/CTA) em canvas via html2canvas UMA vez
  ├─ Loop MediaRecorder: drawImage(videoFrame) + drawImage(overlayCanvas)
  └─ Manter pipeline atual de áudio mute + WebM
```

### Validação

Antes de aprovar, vou testar nos 6 slides do produto Bio Vitality (os que estão nos PNGs anexados):
- Slide 1 (full-bleed): título sobre gradient
- Slide 2 (imagem vertical extrema): screenshot FDA — **principal teste**
- Slide 3 (split): bullets icônicos
- Slide 4 (texto longo com kicker): testa quebras de linha e ellipsis
- Slide 5 (cards de lista): testa renderização de blocos com background
- Slide 6 (CTA): botão e ícone

### Risco

- `html2canvas` pode ter pequenas diferenças de renderização de fontes em alguns browsers (subpixel hinting). Mitigação: usar `system-ui` (já o caso) que é consistente.
- Renderização leva ~500ms por slide vs ~50ms do canvas atual. Para 6 slides + 6 PNGs no ZIP, exportação total vai de ~300ms para ~3s. Aceitável.
- React 18 `createRoot` em container off-screen pode disparar warnings. Mitigação: container com `position: fixed; left: -99999px` evita layout shift e é técnica padrão.

### Pergunta antes de aplicar

Confirma **Abordagem A** (html2canvas, paridade 100%, +120KB)? Ou prefere **Abordagem B** (corrigir canvas atual ponto a ponto, sem dependência nova mas com risco de divergência voltar)?

