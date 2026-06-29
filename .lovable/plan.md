# Correção — 🎯 Carrossel Engajamento / Slide 3 (💡 Solução): vídeo exportado pula frames

## Diagnóstico

O export usa `generateDomCompositedVideo` em `src/components/StrategicCarouselPreview.tsx` (linhas 1807-2022). O loop de desenho atual é:

- `requestAnimationFrame` chama `drawFrame()` no ritmo do display (60/120/144 Hz).
- Cada frame: `clearRect` → `drawImage(overlay 1080×1350)` → `drawImage(video)`.
- Saída: `canvas.captureStream(30)` + `MediaRecorder` VP9 @ 8 Mbps em 1080×1350.

Dois pontos causam o "pula frames" relatado no Slide 3:

1. **Dessincronia rAF ↔ frames do vídeo.** O rAF roda no refresh do display, não no cadence do vídeo. Quando o vídeo tem fps diferente do display (ex.: 24/25 fps), o canvas é redesenhado várias vezes com o mesmo frame ou pula amostras, e o encoder VP9 — pesado em 1080×1350 — descarta frames quando não consegue acompanhar, gerando o stutter visível.
2. **VP9 @ 8 Mbps em 1080×1350 satura o encoder em hardware modesto.** É o único codec/bitrate aplicado a todos os slides; nos vídeos mais longos/complexos (como o de Solução) a defasagem aparece.

Slide 1 não exibe o problema com a mesma frequência porque o overlay tem muito menos pixels opacos (full-bleed transparente embaixo), mas a causa raiz é a mesma para qualquer slide 2-6.

## Mudanças (escopo cirúrgico, 1 arquivo)

**`src/components/StrategicCarouselPreview.tsx`** — apenas dentro de `generateDomCompositedVideo` (~linhas 1932-2013):

### 1. Acoplar o desenho ao cadence real do `<video>` via `requestVideoFrameCallback`
- Se `videoEl.requestVideoFrameCallback` existir (Chromium/Edge/recente Safari/Firefox), usar para chamar `drawFrame()` exatamente uma vez por frame decodificado do vídeo. Isso elimina redesenhos redundantes e garante 1:1 entre frames do source e frames capturados.
- Fallback para `requestAnimationFrame` quando a API não existir (mantém comportamento atual).
- A condição de parada (`ended` / `elapsed >= durationMs`) continua igual, com mesmo fallback de timeout.

### 2. Reduzir pressão de encoder sem perder qualidade percebida
- Trocar bitrate para 6 Mbps (mantém VP9 quando suportado) — bitrate de 8 Mbps em VP9 software encoder é o que mais derruba frames em máquinas comuns; 6 Mbps é o sweet spot para 1080×1350 social.
- Manter fallback para `video/webm` (VP8) inalterado.
- `captureStream(30)` permanece — combinado com vfc o stream agora recebe exatamente os frames pintados.

### 3. Forçar `playbackRate = 1` e `videoEl.play()` aguardando `playing`
- Pequeno ajuste: aguardar evento `playing` antes de iniciar o loop de desenho, evitando 1-2 frames pretos no início que o usuário poderia interpretar como "trava".

## Fora do escopo
- Nenhuma alteração em `EngagementCarouselPreview.tsx`, layouts, tipografia, ou outros geradores.
- Sem mudanças na UI, no painel de controles, no upload de vídeo, ou na pipeline de SmartOps.
- Sem mexer no Slide 1 (drawOrder `video-under-overlay`) — recebe o mesmo benefício automaticamente porque o loop é compartilhado.

## Validação
- Build TS.
- Reexportar Slide 3 (Solução) com o mesmo vídeo que travava e conferir reprodução fluida no `.webm` baixado.
- Reexportar Slides 1, 2, 4, 5, 6 para garantir paridade (sem regressão de duração nem de sincronia).
