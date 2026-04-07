
## Fix: exportar o vídeo já com o template/textos sobrepostos

### Diagnóstico confirmado
Hoje o preview mostra o vídeo dentro do card com overlay via JSX/CSS, mas o export do ZIP em `EngagementCarouselSection.tsx` só faz `fetch` do arquivo cru e salva `slide_X.mp4`. Por isso o resultado final vem sem textos, gradiente e badge.

### O que vou ajustar

#### 1) Criar gerador de vídeo final com overlay
**Arquivo:** `src/components/EngagementCarouselPreview.tsx`

Adicionar uma nova função de export, ao lado de `generateEngagementSlidePNG`, por exemplo:
- `generateEngagementSlideVideo(...)`

Essa função vai:
- carregar o vídeo original em um `<video>` offscreen
- desenhar frame a frame em um `<canvas>` 1080x1350
- aplicar por cima o mesmo template já usado no preview/PNG:
  - slide 1: vídeo full-bleed + gradiente inferior + título/subtítulo + badge
  - slides 2-6: layout editorial com título, bloco de mídia, texto e CTA quando existir
- gravar o canvas com `canvas.captureStream()` + `MediaRecorder`
- retornar um único arquivo final de vídeo para download

#### 2) Reaproveitar a mesma lógica visual do PNG
**Arquivo:** `src/components/EngagementCarouselPreview.tsx`

Para não duplicar layout de forma inconsistente:
- extrair helpers de desenho comuns para canvas
- reutilizar `drawImageCover`, `drawRichText`, cores, gradiente, badge e posicionamento
- garantir que vídeo exportado e PNG tenham a mesma identidade visual

#### 3) Trocar o export do ZIP para usar vídeo renderizado
**Arquivo:** `src/components/EngagementCarouselSection.tsx`

No `exportAllPNGs`:
- se `mediaType === 'video'`, parar de exportar o `.mp4` cru
- chamar o novo `generateEngagementSlideVideo(...)`
- salvar no ZIP apenas o arquivo final desse slide, por exemplo `slide_1.webm` ou `slide_3.webm`
- slides com imagem continuam saindo como `slide_X.png`

### Formato final
Como você aceitou “tanto faz”, o formato mais viável no browser será:
- **WEBM** para slides com vídeo
- **PNG** para slides com imagem

Isso evita tentar converter para MP4 no frontend, o que é pouco confiável no navegador.

### Fallback e comportamento
Se o navegador não suportar `MediaRecorder` ou a renderização falhar:
- mostrar toast claro dizendo que o vídeo final com overlay não pôde ser gerado
- não baixar vídeo cru “sem template” silenciosamente
- manter erro explícito para evitar arquivo incorreto

### Arquivos afetados
| Arquivo | Ação |
|---|---|
| `src/components/EngagementCarouselPreview.tsx` | Adicionar gerador de vídeo com overlay e extrair helpers de render canvas |
| `src/components/EngagementCarouselSection.tsx` | Alterar export do ZIP para usar o vídeo final renderizado em vez do arquivo cru |

### Resultado esperado
- Slide com vídeo exporta **um único arquivo final**, já com textos e sobreposições
- Nada sai “separado” para slides com vídeo
- O visual exportado bate com o template visto no card do carrossel
