import { DisplayFormat, DisplayStyle } from '@/types/google-ads';

export const DISPLAY_FORMATS: DisplayFormat[] = [
  // Popular
  { width: 300, height: 250, name: 'Medium Rectangle', category: 'popular' },
  { width: 336, height: 280, name: 'Large Rectangle', category: 'popular' },
  // Horizontal
  { width: 728, height: 90, name: 'Leaderboard', category: 'horizontal' },
  { width: 970, height: 90, name: 'Large Leaderboard', category: 'horizontal' },
  { width: 970, height: 250, name: 'Billboard', category: 'horizontal' },
  { width: 468, height: 60, name: 'Banner', category: 'horizontal' },
  // Mobile
  { width: 320, height: 50, name: 'Mobile Leaderboard', category: 'mobile' },
  { width: 320, height: 100, name: 'Large Mobile Banner', category: 'mobile' },
  { width: 300, height: 50, name: 'Mobile Banner', category: 'mobile' },
  { width: 480, height: 320, name: 'Mobile Interstitial', category: 'mobile' },
  { width: 320, height: 480, name: 'Mobile Interstitial Vertical', category: 'mobile' },
  // Vertical
  { width: 160, height: 600, name: 'Wide Skyscraper', category: 'vertical' },
  { width: 120, height: 600, name: 'Skyscraper', category: 'vertical' },
  { width: 300, height: 600, name: 'Half Page', category: 'vertical' },
  // Square
  { width: 250, height: 250, name: 'Square', category: 'square' },
  { width: 200, height: 200, name: 'Small Square', category: 'square' },
];

export const DISPLAY_STYLES: { value: DisplayStyle; label: string; description: string }[] = [
  { value: 'modern', label: 'Moderno', description: 'Gradiente sutil, overlay elegante' },
  { value: 'minimal', label: 'Minimalista', description: 'Fundo limpo, foco no produto' },
  { value: 'bold', label: 'Bold', description: 'Cores vibrantes, CTA chamativo' },
  { value: 'clinical', label: 'Clínico', description: 'Profissional, tons de azul' },
];

type LayoutType = 'horizontal' | 'vertical' | 'square';

function getLayoutType(w: number, h: number): LayoutType {
  const ratio = w / h;
  if (ratio > 1.5) return 'horizontal';
  if (ratio < 0.75) return 'vertical';
  return 'square';
}

function getStyleCSS(style: DisplayStyle, primary: string, secondary: string): string {
  const styles: Record<DisplayStyle, string> = {
    modern: `
      background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);
      .headline { color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
      .description { color: rgba(255,255,255,0.9); }
      .cta-btn { background: #fff; color: ${primary}; border-radius: 6px; }
      .cta-btn:hover { transform: scale(1.05); }
      .product-img { border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
    `,
    minimal: `
      background: #ffffff;
      border: 1px solid #e5e7eb;
      .headline { color: #111827; }
      .description { color: #6b7280; }
      .cta-btn { background: ${primary}; color: #fff; border-radius: 4px; }
      .product-img { border-radius: 4px; }
    `,
    bold: `
      background: ${primary};
      .headline { color: #fff; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
      .description { color: rgba(255,255,255,0.95); font-weight: 600; }
      .cta-btn { background: ${secondary}; color: #fff; border-radius: 50px; font-weight: 800; text-transform: uppercase; }
      .product-img { border-radius: 12px; border: 3px solid rgba(255,255,255,0.3); }
    `,
    clinical: `
      background: linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%);
      border: 1px solid #bfdbfe;
      .headline { color: #1e40af; }
      .description { color: #3b82f6; }
      .cta-btn { background: #1e40af; color: #fff; border-radius: 6px; }
      .product-img { border-radius: 6px; border: 1px solid #dbeafe; }
    `,
  };
  return styles[style];
}

export function generateBannerHTML(params: {
  width: number;
  height: number;
  style: DisplayStyle;
  primaryColor: string;
  secondaryColor: string;
  headline: string;
  description: string;
  ctaText: string;
  productImageUrl: string;
  logoUrl?: string;
  finalUrl: string;
}): string {
  const { width, height, style, primaryColor, secondaryColor, headline, description, ctaText, productImageUrl, logoUrl, finalUrl } = params;
  const layout = getLayoutType(width, height);
  const isCompact = width * height < 25000; // e.g. 320x50, 300x50
  const isTiny = height <= 60;

  const imgSize = layout === 'horizontal'
    ? `width: ${Math.min(height - 10, width * 0.3)}px; height: ${Math.min(height - 10, width * 0.3)}px;`
    : layout === 'vertical'
    ? `width: ${width - 20}px; height: ${Math.min(width - 20, height * 0.4)}px;`
    : `width: ${width * 0.6}px; height: ${width * 0.6}px;`;

  const flexDir = layout === 'horizontal' ? 'row' : 'column';

  const fontSizeH = isTiny ? 11 : isCompact ? 13 : Math.min(Math.max(width / 18, 14), 28);
  const fontSizeP = isTiny ? 0 : isCompact ? 0 : Math.max(fontSizeH * 0.65, 10);
  const fontSizeCTA = isTiny ? 10 : isCompact ? 11 : Math.max(fontSizeH * 0.6, 11);
  const ctaPad = isTiny ? '2px 8px' : isCompact ? '4px 10px' : '8px 20px';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width=${width},height=${height}">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { overflow:hidden; }
.banner {
  width:${width}px; height:${height}px; overflow:hidden; position:relative; cursor:pointer;
  display:flex; flex-direction:${flexDir}; align-items:center; justify-content:center;
  font-family: 'Segoe UI', Arial, sans-serif; gap:${isTiny ? 4 : 8}px; padding:${isTiny ? '2px 6px' : isCompact ? '6px' : '12px'};
  ${getStyleCSS(style, primaryColor, secondaryColor).split('\n').filter(l => !l.trim().startsWith('.')).join('\n')}
}
.product-img { object-fit:contain; ${imgSize} flex-shrink:0;
  ${getStyleCSS(style, primaryColor, secondaryColor).split('\n').filter(l => l.trim().startsWith('.product-img')).map(l => l.replace('.product-img {','').replace('}','')).join('')}
}
.text-wrap { display:flex; flex-direction:column; ${layout === 'horizontal' ? 'flex:1; min-width:0;' : 'align-items:center; text-align:center;'} gap:${isTiny ? 2 : 4}px; }
.headline { font-size:${fontSizeH}px; font-weight:700; line-height:1.2; overflow:hidden;
  ${getStyleCSS(style, primaryColor, secondaryColor).split('\n').filter(l => l.trim().startsWith('.headline')).map(l => l.replace('.headline {','').replace('}','')).join('')}
}
.description { font-size:${fontSizeP}px; line-height:1.3; overflow:hidden;
  ${fontSizeP === 0 ? 'display:none;' : ''}
  ${getStyleCSS(style, primaryColor, secondaryColor).split('\n').filter(l => l.trim().startsWith('.description')).map(l => l.replace('.description {','').replace('}','')).join('')}
}
.cta-btn { display:inline-block; font-size:${fontSizeCTA}px; padding:${ctaPad}; border:none; cursor:pointer; font-weight:700; transition:transform 0.2s; text-decoration:none; white-space:nowrap;
  ${getStyleCSS(style, primaryColor, secondaryColor).split('\n').filter(l => l.trim().startsWith('.cta-btn')).map(l => l.replace('.cta-btn {','').replace(/\.cta-btn:hover \{[^}]*\}/,'').replace('}','')).join('')}
}
.logo { position:absolute; bottom:${isTiny ? 2 : 6}px; right:${isTiny ? 4 : 8}px; height:${isTiny ? 12 : isCompact ? 16 : 24}px; opacity:0.7; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.banner > * { animation: fadeIn 0.5s ease-out both; }
.banner > *:nth-child(2) { animation-delay: 0.15s; }
.banner > *:nth-child(3) { animation-delay: 0.3s; }
</style>
</head>
<body>
<div class="banner" onclick="window.open('${finalUrl}','_blank')">
  <img class="product-img" src="product.jpg" alt="Produto">
  <div class="text-wrap">
    <div class="headline">${headline}</div>
    ${fontSizeP > 0 ? `<div class="description">${description}</div>` : ''}
    <button class="cta-btn">${ctaText}</button>
  </div>
  ${logoUrl ? `<img class="logo" src="logo.png" alt="Logo">` : ''}
</div>
</body>
</html>`;
}
