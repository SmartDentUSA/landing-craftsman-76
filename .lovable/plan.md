Objetivo: garantir que ZIP e Upload SmartOps exportem os 6 slides do Carrossel Engajamento e do Carrossel Visual exatamente como aparecem no preview do editor.

Plano de correção:

1. Unificar a fonte visual do preview e export
- Fazer o export usar o mesmo componente/renderização JSX do preview, sem redesenhar layouts manualmente em canvas quando houver vídeo.
- Remover/contornar os caminhos que recriam texto, posições, tamanhos e mídias em funções separadas, porque hoje isso gera diferença visual.

2. Corrigir Carrossel Engajamento
- Substituir a renderização manual de vídeo em `drawSlideFrameWithVideo` por captura/composição baseada no mesmo DOM do `EngagementSlideRender`.
- Garantir que slides com vídeo exportem com o mesmo enquadramento, escala, logos, textos, CTA, cores e posições do preview.
- Manter PNG de slides com imagem via `EngagementSlideRender`/html2canvas, com espera real por imagens/logos carregados.

3. Corrigir Carrossel Visual
- Ajustar `StrategicSlideRender` para reproduzir exatamente a ordem visual do preview: vídeo no fundo, conteúdo na frente e máscara na mesma camada/ordem vista no editor.
- Fazer `generateStrategicSlideVideo` capturar o overlay a partir da mesma estrutura visual do preview, sem mudar fundo, máscara, logos ou texto no export.
- Garantir que `generateSlidePNG`, ZIP e SmartOps recebam os textos/customizações atuais: vídeos, máscaras, cores, toggles, uploads, logos e escalas.

4. Eliminar divergências conhecidas
- Corrigir diferenças entre preview e export em: ordem da máscara, vídeo cobrindo card, texto sobre vídeo, logos, escala da mídia, CTA e slides 1–6.
- Evitar fallback silencioso para PNG quando vídeo falha sem aviso claro; se falhar, mostrar erro específico em vez de exportar algo diferente sem o usuário perceber.

5. Validar no navegador
- Testar no preview com Playwright a existência dos controles e a renderização DOM dos carrosséis.
- Exportar pelo fluxo real quando possível e verificar que os arquivos gerados usam a mesma composição visual do preview.

Arquivos principais a alterar:
- `src/components/EngagementCarouselPreview.tsx`
- `src/components/StrategicCarouselPreview.tsx`
- `src/components/EngagementCarouselSection.tsx`
- `src/components/InstagramCopyGenerator.tsx`

Critério de aceite:
- Cada slide exportado deve ser uma captura fiel do slide visto no editor, incluindo vídeo, imagem, texto, máscara, logo, cores e posições.
- ZIP e Upload SmartOps devem usar a mesma lógica de renderização, sem resultados diferentes entre baixar e enviar.