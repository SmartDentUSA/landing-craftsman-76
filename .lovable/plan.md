

## Fix Carrossel Engajamento — 2 Erros

### Erro 1: Remover "Powered by..." e "@handle"
O header `Powered by {brandName}` e `@{handleName}` aparece em todos os slides. Nao deveria aparecer.

**Fix**: Remover o componente `Header` do `renderSlideContent` (linhas 480-491) e sua invocacao (linha 532). Tambem remover do canvas export (`generateEngagementSlidePNG`) onde o mesmo header e desenhado.

### Erro 2: Slide 1 — imagem cobrindo todo o card
Conforme a referencia (@brandsdecoded), o slide 1 (Capa/Gancho) deve ter:
- Imagem/video cobrindo 100% do card (1080x1350)
- Gradient escuro na parte inferior (~40% do card)
- Texto do titulo sobreposto na parte inferior, em branco, bold, grande
- Sem header, sem bordas na imagem

**Fix**: No `renderSlideContent`, quando `slideNum === 1`:
- Renderizar imagem como fundo absoluto cobrindo todo o card (object-fit: cover, 100% width/height)
- Adicionar overlay gradient (transparent -> rgba(0,0,0,0.75)) na metade inferior
- Posicionar titulo e subtitulo sobre o gradient, na parte inferior
- Sem `Header`, sem `ImageBlock` separado

Mesma logica no canvas export para PNG.

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| `src/components/EngagementCarouselPreview.tsx` | Remover Header de todos os slides. Redesenhar slide 1 com imagem full-cover + gradient + texto sobreposto. Atualizar canvas export. |

### Resultado esperado
- Nenhum slide mostra "Powered by..." ou "@handle"
- Slide 1: imagem cobre todo o card, texto aparece sobre gradient escuro na parte inferior (estilo @brandsdecoded)
- Export PNG reflete o mesmo layout

