## Igualar fonte do subtítulo Slide 6 (CTA) ao Slide 5

Escopo: apenas o subtítulo (body) do Slide 6 do 🎯 Carrossel Engajamento.

### Diferenças atuais
- Slides 2–5 body: `fontSize: cardBodyFont` (32/27/23), `lineHeight: 1.28`, `fontWeight: 400`.
- Slide 6 subtítulo: `fontSize: ctaBodyFont` (32/28/24), `lineHeight: 1.3`, `fontWeight: 500`.

### Mudança
Em `src/components/EngagementCarouselPreview.tsx` (linhas 959–967), aplicar no subtítulo do Slide 6 o mesmo estilo tipográfico do corpo dos slides 2–5:
- `lineHeight: 1.28`
- `fontWeight: 400`
- Reaproveitar a mesma escala (`cardBodyFont`) para 100% paridade visual — adicionar `cardBodyFont` ao retorno do `getEngagementLayoutMetrics` para `slideNum === 6` (32/27/23) e usar no lugar de `ctaBodyFont` no subtítulo.

Nada mais é alterado: título, caption, botão CTA, imagem, paddings, exports PNG/vídeo continuam exatamente como estão.

### Arquivos
- `src/components/EngagementCarouselPreview.tsx` — métricas do Slide 6 e estilo do subtítulo.

### Fora de escopo
Outros slides, Carrossel Visual, layout/posições, caption, botão CTA, lógica de export.
