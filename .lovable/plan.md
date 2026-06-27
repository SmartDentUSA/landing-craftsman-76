## Causa

No export de vídeo (`generateEngagementSlideVideo` em `src/components/EngagementCarouselPreview.tsx`), a sequência atual deixa o canvas com o **frame cru do vídeo (sem o layout/overlays do slide)** logo antes do `MediaRecorder` começar a gravar:

1. Linha 1526 — `ctx.drawImage(videoEl, 0, 0, W, H)` (teste de taint) pinta no canvas o frame puro do vídeo, **sem** o template do slide (textos, máscaras, logos).
2. Linha 1537 — `recorder.start()` começa a capturar o stream imediatamente.
3. Linhas 1538-1539 — `currentTime = 0` (seek) + `await videoEl.play()`.
4. Só depois o loop `rAF` desenha o frame composto (`drawSlideFrameWithVideo` + `drawLogos`).

Entre os passos 2 e 4, o `MediaRecorder` grava ~1-5 frames mostrando o vídeo cru sem template — é exatamente esse "frame de imagem" que aparece antes do vídeo no arquivo exportado de cada slide com vídeo.

## Correção (mínima e cirúrgica)

Editar somente `generateEngagementSlideVideo` em `src/components/EngagementCarouselPreview.tsx`:

1. **Mover o pré-carregamento dos logos** (`loadImg` + `Promise.all`) para ANTES do `recorder.start()`, para que o primeiro frame composto já contenha os logos.
2. **Forçar seek para `currentTime = 0` e aguardar o evento `seeked`** (com timeout curto, ~1.5s) antes de qualquer draw, para garantir que o vídeo está realmente no frame zero.
3. **Limpar o canvas e desenhar o primeiro frame composto** (`drawSlideFrameWithVideo` + `drawLogos`) **antes** de `recorder.start()`. Assim o frame inicial capturado já contém o template completo, não o vídeo cru.
4. Manter o teste de taint (`getImageData`) — porém logo após esse teste, fazer `ctx.clearRect(0, 0, W, H)` para apagar o frame cru deixado pelo `drawImage` de teste.
5. Só então: `recorder.start()` → `videoEl.play()` → loop `rAF` (inalterado).

Nenhuma alteração no fluxo do ZIP/SmartOps, na duração, no áudio, nos logos, no PNG ou em outros componentes. Resultado: o `.webm` de cada slide com vídeo começa direto no template composto, sem o frame solto de imagem do vídeo cru.

## Validação

- Após o build, exportar um carrossel com pelo menos um slide com vídeo e abrir o `.webm` resultante: o primeiro frame deve mostrar o template do slide (texto + máscara + logos) já sobre o vídeo, sem nenhum frame intermediário "limpo".
- Conferir no console que não há novos warnings em `[VIDEO_RENDER_FAIL]`.