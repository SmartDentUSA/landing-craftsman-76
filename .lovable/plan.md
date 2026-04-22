

## Plano: corrigir erro ao exportar ZIP do carrossel

### Diagnóstico

Sem o erro exato no console (logs vazios na captura), trabalho com as duas causas mais prováveis dadas a arquitetura atual (`canvas.captureStream` + `MediaRecorder` lendo vídeo do Supabase Storage):

**Causa #1 — CORS do Supabase Storage (mais provável)**
O `<video crossOrigin="anonymous">` em `generateEngagementSlideVideo` (linha 1472) exige que a resposta HTTP do Storage devolva `Access-Control-Allow-Origin: *`. O Supabase Storage devolve isso em `GET` simples, mas quando o `crossOrigin` está setado o browser faz preflight e às vezes a resposta vem sem o header se a URL for assinada/com token. Quando isso acontece:
- ou o `videoEl.onerror` dispara → `"Failed to load video for export"` → fallback para PNG
- ou o vídeo carrega mas o canvas fica **tainted** ao chamar `drawImage(video, ...)` → `MediaRecorder.start()` lança `SecurityError` na primeira frame e **derruba o ZIP inteiro**

**Causa #2 — `videoEl.duration` inválido**
WebM/MP4 sem `moov` atom no início devolvem `duration = Infinity`. O código já protege com `Math.min(..., 60)`, mas se for `NaN` (vídeo curto/corrompido) `totalFrames = NaN` e o loop nunca termina; após o timeout de 30s o slide é skipado, mas se isso acontece nos 6 slides, o ZIP final fica vazio → `"Nenhum slide pôde ser exportado"`.

**Causa #3 — Toast genérico mascara o erro real**
O `catch` externo (linha 417) mostra `"Falha ao exportar"` sem incluir `err.message`. Sem o detalhe não dá pra escolher entre as causas.

### Fase 0 — capturar o erro real (obrigatório antes de fix definitivo)

1. Tornar o toast de erro do `exportAllPNGs` informativo:
   - Incluir `err.message` no `description` e `duration: 10000`.
   - Logar `console.error('[CAROUSEL_ZIP_EXPORT_FAIL]', { phase, slideNum, error })` em cada `catch` interno.
2. No `generateEngagementSlideVideo`, distinguir os erros:
   - `"Failed to load video for export"` → erro de CORS/rede
   - `SecurityError` no canvas → tainted (CORS silencioso)
   - `Video load timeout (15s)` → arquivo grande/lento
   - Loggar `[VIDEO_RENDER_FAIL]` com URL truncada e tipo de erro.

### Fase 1 — fix robusto (independe da causa)

1. **Pré-fetch do vídeo como blob URL** antes de passar pro `<video>` element:
   - Em vez de `videoEl.src = videoUrl` (HTTPS do Supabase), fazer `fetch(videoUrl)` → `blob()` → `URL.createObjectURL(blob)`.
   - Blob URLs são **sempre same-origin**, eliminam tainting do canvas e o erro de CORS.
   - Mesma técnica que `fetchAsDataUrl` já usa para imagens.

2. **Validar `duration` antes do loop de frames**:
   ```ts
   let duration = videoEl.duration;
   if (!isFinite(duration) || duration <= 0 || isNaN(duration)) duration = 10;
   duration = Math.min(duration, 60);
   ```

3. **Garantir `Access-Control-Allow-Origin` na resposta do Storage**:
   - Não é necessário se aplicarmos #1 (blob URL bypassa CORS).
   - Como defesa em profundidade, manter `crossOrigin = 'anonymous'` no `<video>` mas só ativar quando NÃO estamos em blob URL.

4. **Fallback explícito por slide**: se o vídeo falhar em todos os passos, exportar o **frame atual do `<video>` no preview** como PNG (já existe `slideImageMap[i]` como thumbnail capturado), garantindo que o ZIP nunca venha vazio.

5. **Toast final detalhado**:
   - Se `skippedSlides.length > 0`: mostrar quais slides e o motivo principal capturado.

### Fase 2 — só se Fase 1 não resolver

- Trocar `MediaRecorder` por captura frame-a-frame em PNGs sequenciais e re-encodar via `ffmpeg.wasm` (pesado, ~30MB de bundle, evitar se possível).
- Ou exportar vídeos como **arquivo bruto** (link direto para Storage) dentro do ZIP em vez de re-renderizar com overlay.

### Arquivos a modificar

- `src/components/EngagementCarouselSection.tsx` — toast detalhado + log estruturado em cada `catch` (linhas ~367, 393, 417)
- `src/components/EngagementCarouselPreview.tsx` — `generateEngagementSlideVideo` (linhas 1458–1535): pré-fetch como blob URL, validação de `duration`, log estruturado

### Risco

- Pré-fetch como blob carrega o vídeo inteiro na memória antes de processar. Para vídeos de até 100 MB (limite atual do bucket), isso é aceitável em desktop mas pode estourar memória em mobile com vídeos grandes. Mitigação: já temos cap de 100 MB no upload e o usuário roda isso no desktop (viewport atual 1791x1132).

### Pergunta antes de aplicar

Para validar: **qual mensagem exata aparece no toast vermelho quando o erro acontece?** ("Erro ao exporta .zip" é o título do toast genérico — preciso saber se há detalhe na descrição, ou se é em algum slide específico). Se você puder abrir o DevTools (F12) → Console e tentar de novo, me mande o último erro vermelho que aparecer ali — ele vai estar prefixado com `Slide N export failed` ou similar. Mesmo sem isso eu consigo aplicar Fase 0 + Fase 1 que cobrem as três causas mais prováveis.

