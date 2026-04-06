

## Fix: Video upload não aparece no Carrossel Engajamento

### Problema
Quando o usuário faz upload de vídeo (.mp4), nada aparece no card. O código atual tenta extrair um frame do vídeo como thumbnail via canvas, mas:
1. O evento `onloadeddata` dispara antes do vídeo estar pronto para seek
2. Não há fallback se o seek falhar silenciosamente
3. O vídeo real nunca é armazenado — apenas um frame estático

### Solução

Duas mudanças no `src/components/EngagementCarouselPreview.tsx`:

**1. Corrigir o upload de vídeo para armazenar o blob URL do vídeo real**
- Guardar o blob URL do vídeo (não revogar imediatamente) para preview no card
- Também extrair thumbnail como fallback para o export PNG
- Armazenar ambos: `videoUrl` (blob para preview) e `imageUrl` (thumbnail para PNG)
- Usar `onImageChange` para o thumbnail e um novo campo `videoSrc` no slideTexts para o blob URL

**2. Renderizar `<video>` no card quando mediaType === 'video'**
- No `renderSlideContent`, quando o slide tem `mediaType === 'video'` e um `videoSrc`:
  - Renderizar `<video autoPlay muted loop playsInline>` em vez de `<img>`
  - Aplicar mesmo posicionamento (full-bleed no slide 1, área de imagem nos demais)
- No export PNG, continuar usando o thumbnail frame (canvas não suporta vídeo)

**3. Corrigir a sequência de eventos do video loader**
- Usar `loadeddata` → `requestVideoFrameCallback` ou `setTimeout` antes do seek
- Adicionar `onerror` handler para feedback ao usuário

### Arquivo afetado
| Arquivo | Ação |
|---|---|
| `src/components/EngagementCarouselPreview.tsx` | Corrigir handleFileUpload para vídeo, renderizar `<video>` no card, manter thumbnail para PNG |

### Resultado esperado
- Upload de vídeo mostra o vídeo tocando (autoplay, muted, loop) dentro do card
- Thumbnail é gerado automaticamente para export PNG
- Funciona no slide 1 (full-bleed) e nos demais slides

