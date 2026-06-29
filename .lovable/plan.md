Plano cirúrgico para corrigir somente o 🎯 Carrossel Engajamento — 6 Slides Visuais:

1. Unificar o layout de preview e export de vídeo
   - Remover/contornar o renderizador canvas manual antigo que ainda usa medidas diferentes do preview.
   - Forçar `generateEngagementSlideVideo` a usar a mesma composição DOM do preview (`EngagementSlideRender`) sobre o vídeo, para que vídeos não sumam e o texto fique na mesma posição do card visto na tela.

2. Corrigir texto cortado em todos os slides
   - Slide 1: subir o bloco visual e reduzir dinamicamente o texto quando necessário, sem cortar no meio.
   - Slides 2 e 3: liberar área real para título + vídeo + corpo, com fonte responsiva ao conteúdo e sem `overflow` que corte linhas.
   - Slides 4 e 5: aplicar a mesma regra de ajuste de texto, preservando o layout atual.
   - Slide 6: aumentar a área do subtítulo no topo e reduzir o tamanho automaticamente se o subtítulo for maior.

3. Garantir vídeos nos slides 2 e 3
   - Validar `resolveVideoSource` no export e no preview.
   - Quando `mediaType` for vídeo e houver `videoSrc` ou `videoStorageUrl`, exportar `.webm` obrigatoriamente, não PNG.
   - Manter erro explícito se o vídeo falhar, para não exportar um arquivo diferente do preview.

4. Corrigir proporção da mídia
   - Usar sempre `object-fit: cover` equivalente no preview e export.
   - Remover pre-crop/scale divergente onde ele altera a aparência real do card.

5. Verificação
   - Conferir no código que as dimensões usadas no preview são as mesmas usadas no export para os 6 slides.
   - Não alterar banco, SmartOps, Sistema B, SEO, nem o Carrossel Visual nesta etapa.