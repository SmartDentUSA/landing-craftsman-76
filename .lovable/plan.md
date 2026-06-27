## Problema
Ao baixar o ZIP do **🎯 Carrossel Engajamento**, os vídeos saem com duração menor do que o vídeo original inserido no card.

## Causa raiz
Em `src/components/EngagementCarouselPreview.tsx`, dentro de `generateEngagementSlideVideo` (linhas ~1339–1424), o loop de gravação tem dois bugs que cortam o tempo:

1. **`requestAnimationFrame` está sendo tratado como se rodasse a 30 fps**, mas o navegador despacha rAF na taxa de atualização do display (60 Hz típico, podendo chegar a 120 Hz). O código faz:
   ```
   const fps = 30;
   const totalFrames = Math.ceil(duration * fps);
   // ... rAF loop incrementa frame++ a cada tick
   if (frame >= totalFrames) recorder.stop();
   ```
   Como rAF dispara ~60×/s e `totalFrames` é calculado a 30 fps, o loop para em `duration / 2` segundos de tempo real. O `MediaRecorder` grava em tempo de parede → o `.webm` resultante fica com metade (ou menos) da duração original. Em telas 120 Hz fica 1/4.

2. **Cap rígido de 60 s** (`duration = Math.min(duration, 60)`) — corta vídeos mais longos sem aviso.

## Correção (somente lógica de captura, sem mexer em UI)

Arquivo: `src/components/EngagementCarouselPreview.tsx`, função `generateEngagementSlideVideo`.

1. **Trocar o critério de parada de "contagem de frames" para "tempo de parede / fim do vídeo"**, de modo que o recorder grave exatamente o tempo do vídeo:
   - Marcar `startedAt = performance.now()` logo após `videoEl.play()`.
   - No loop de rAF, parar quando `videoEl.ended === true` **ou** `(performance.now() - startedAt) >= duration * 1000`.
   - Remover `totalFrames` / `frame++` como condição de parada (o rAF apenas redesenha o frame atual do `<video>` — cada rAF chama `drawSlideFrameWithVideo` com o `videoEl` no instante corrente, então a taxa real de desenho é irrelevante para a duração).

2. **Aumentar o cap** de `60s` para `120s` (ou remover) — vídeos do Instagram chegam a 90 s; manter um teto apenas como guarda de segurança contra metadata corrompido (`Infinity`).

3. **Pequeno hardening**: usar `videoEl.addEventListener('ended', …)` como caminho primário de parada, com `setTimeout(stop, duration*1000 + 500)` como fallback, para garantir que o `recorder.stop()` aconteça mesmo se rAF for pausado (aba em background).

4. Manter:
   - `cleanup()`, validação de duração `Infinity/NaN/0 → 10s`, detecção de canvas tainted, logs `[VIDEO_RENDER_FAIL]`.
   - Toda a UI, layout, `MediaBlock`, captura de imagens (`html2canvas`), upload para SmartOps, fluxo do ZIP em `EngagementCarouselSection.tsx`.

## Fora de escopo
- Nenhuma mudança em `StrategicCarouselPreview`, `smartops-upload.ts`, Sistema B, edge functions, layout dos slides, máscara, fontes, posição de texto.
- Sem mudanças no áudio (o `.webm` segue sem trilha — `canvas.captureStream` não captura áudio do `<video>`; isso é outro assunto e o usuário não pediu).

## Verificação
- Subir um vídeo de ~30 s em um slide, exportar ZIP e confirmar que o `.webm` baixado tem ~30 s (`ffprobe` ou player).
- Confirmar que o frame final ainda contém os textos/overlays do slide.
- Conferir console: nenhum `[VIDEO_RENDER_FAIL]` novo.
