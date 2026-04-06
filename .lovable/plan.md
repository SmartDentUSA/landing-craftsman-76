

## Fix: Slide com vídeo deve exportar APENAS o vídeo (sem PNG separado)

### Problema atual
Quando um slide tem vídeo, o ZIP gera **dois arquivos**: `slide_X_capa.png` + `slide_X_video.mp4` dentro de uma pasta. O usuário quer **apenas o vídeo final** para slides com vídeo — sem PNG separado.

### Solução

**Arquivo: `src/components/EngagementCarouselSection.tsx`** — bloco `exportAllPNGs` (linhas 270-309)

Para slides com vídeo (`mediaType === 'video'`):
1. Remover a geração do PNG (`generateEngagementSlidePNG`) 
2. Remover a pasta separada — tudo fica na raiz do ZIP
3. Exportar apenas o `.mp4` como `slide_{i}.mp4`
4. Fetch do vídeo via `videoStorageUrl` ou `videoSrc`

Para slides sem vídeo: manter o PNG como `slide_{i}.png` (sem mudança).

Atualizar toast para refletir "PNGs + Vídeos".

### Resultado
- Slides com imagem: `slide_1.png`, `slide_2.png`, etc.
- Slides com vídeo: `slide_3.mp4` (só o vídeo, sem PNG)
- Sem pastas aninhadas — tudo na raiz do ZIP

