<final-text>## Plano: restaurar exportação WEBM no Carrossel de Engajamento

### Diagnóstico
O problema não está no ZIP em si. O fluxo de vídeo ficou inconsistente:

- o preview trata como vídeo só quando existe `videoSrc` (blob local)
- a exportação prioriza `videoStorageUrl`
- se a renderização de vídeo falha, o código cai direto para PNG

Na prática, o slide pode parecer “vídeo” no editor, mas a exportação tenta outra fonte e faz fallback silencioso para imagem. É isso que faz “virar tudo JPG/PNG”.

### Correções
1. **Unificar a origem do vídeo**
   - Criar um helper único para resolver a fonte do vídeo
   - Preferir `videoSrc` na sessão atual
   - Usar `videoStorageUrl` apenas como fallback

2. **Corrigir o preview de vídeos salvos**
   - Permitir que o preview também use `videoStorageUrl`
   - Evitar que um slide salvo volte a se comportar como imagem após recarregar

3. **Restaurar prioridade real de WEBM na exportação**
   - Sempre tentar gerar `.webm` primeiro para slides em vídeo
   - Se houver duas fontes possíveis, tentar a segunda antes de degradar para PNG

4. **Remover o fallback silencioso**
   - Só cair para PNG depois de esgotar as tentativas de vídeo
   - Mostrar aviso claro quando algum slide for exportado como imagem por falha real

### Arquivos
- `src/components/EngagementCarouselSection.tsx`
- `src/components/EngagementCarouselPreview.tsx`

### Detalhes técnicos
Hoje existem duas regras diferentes no código:

- Preview: `texts.mediaType === 'video' && texts.videoSrc`
- Export: `texts.videoStorageUrl || texts.videoSrc`

Vou alinhar isso em uma função única, reutilizada no preview e na exportação, para que o slide use a mesma mídia nos dois fluxos.

### Resultado esperado
- Slides com vídeo voltam a sair em `.webm`
- Slides com imagem continuam saindo em `.png`
- Se algum vídeo falhar de verdade, o sistema avisa claramente em vez de trocar tudo para imagem sem explicar</final-text>