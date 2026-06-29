## Ajustes no Slide 6 (CTA) — 🎯 Carrossel Engajamento

Escopo restrito ao Slide 6. Não altera tamanho da imagem, nem outros slides, nem o Carrossel Visual.

### Mudanças

1. **Texto do topo (título + subtítulo) desce um pouco**
   - Aumentar `ctaTopPad` para empurrar o bloco do topo para baixo (mais respiro abaixo do título antes da imagem).

2. **Aumentar fonte do subtítulo (texto sob o título)**
   - Subir `ctaBodyFont` (atualmente 22–26) para 28–32 com escala dinâmica preservada para textos longos.

3. **Novo campo de texto abaixo da imagem, antes do botão CTA**
   - Adicionar campo `cta_caption` em `EngagementSlideTexts` (tipo).
   - Adicionar input no editor do Slide 6 em `EngagementCarouselSection.tsx` (label: "Texto abaixo da imagem").
   - Renderizar no `EngagementSlideRender` (JSX preview) entre a mídia e o botão CTA.
   - Replicar no `generateEngagementSlidePNG` (canvas export) na mesma posição.
   - Estilo: fonte ~22px, cor branca suave, centralizado, com `lineClamp`/escala dinâmica para não estourar.

4. **Persistência**
   - Garantir que `cta_caption` é salvo/carregado junto com os outros textos do slide (mesmo fluxo de `slideTexts`/`debouncedPersist`).

### Arquivos afetados

- `src/components/EngagementCarouselPreview.tsx` — tipo, métricas (`getEngagementLayoutMetrics`), JSX do Slide 6, export PNG do Slide 6.
- `src/components/EngagementCarouselSection.tsx` — novo input no editor do Slide 6.

### Fora de escopo

- Tamanho/posição da imagem (mantida).
- Demais slides (1–5).
- Carrossel Visual, SmartOps, Sistema B, SEO.
