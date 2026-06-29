Scope: Slide 6 (CTA) of the 🎯 Carrossel Engajamento — change the "Texto abaixo da imagem" (`cta_caption`) typography to match the Slide 6 subtitle (`text` / body).

Current mismatch:
- Subtitle: `fontSize: ctaBodyFont`, `fontWeight: 400`, `lineHeight: 1.28`
- Caption: `fontSize: ctaCaptionFont` (smaller), `fontWeight: 500`

Changes in `src/components/EngagementCarouselPreview.tsx`:

1. JSX preview (Slide 6 caption block):
   - Change `fontSize` from `metrics.ctaCaptionFont` to `metrics.ctaBodyFont`
   - Change `fontWeight` from `500` to `400`

2. Canvas export (`generateEngagementSlideVideo`, Slide 6 branch):
   - Replace dedicated `captionFontSize/captionFont/captionFontBold/captionLineH` variables
   - Reuse the existing `bodyFontSize/bodyFont/bodyFontBold/bodyLineH` values for caption rendering

No other slides, layouts, or export logic are affected.