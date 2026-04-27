import { DisplayFormat, DisplayStyle, LayoutBucket } from '@/types/google-ads';
import { STYLE_PRESETS, type StylePreset } from './smartdent-constants';

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

export const DISPLAY_STYLES: { value: DisplayStyle; label: string; description: string }[] = (
  Object.entries(STYLE_PRESETS) as [DisplayStyle, typeof STYLE_PRESETS[StylePreset]][]
).map(([value, cfg]) => ({ value, label: cfg.label, description: cfg.description }));

// ===== SmartDent official logo (2 paths: navy/white curve + orange curve) =====
export const SMARTDENT_LOGO = {
  markLight: '<svg viewBox="0 0 130 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-label="SmartDent"><path d="M18 60Q65-5 115 50" stroke="#2C3E5F" stroke-width="14" stroke-linecap="round"/><path d="M32 85Q22 65 38 45" stroke="#E97935" stroke-width="13" stroke-linecap="round"/></svg>',
  markDark: '<svg viewBox="0 0 130 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-label="SmartDent"><path d="M18 60Q65-5 115 50" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"/><path d="M32 85Q22 65 38 45" stroke="#E97935" stroke-width="13" stroke-linecap="round"/></svg>',
  lockupLight: '<svg viewBox="0 0 480 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-label="SmartDent"><path d="M18 60Q65-5 115 50" stroke="#2C3E5F" stroke-width="14" stroke-linecap="round"/><path d="M32 85Q22 65 38 45" stroke="#E97935" stroke-width="13" stroke-linecap="round"/><text x="150" y="68" font-family="Segoe UI,Arial,sans-serif" font-size="44" font-weight="700" fill="#2C3E5F" letter-spacing="2">SMART DENT</text></svg>',
  lockupDark: '<svg viewBox="0 0 480 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-label="SmartDent"><path d="M18 60Q65-5 115 50" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"/><path d="M32 85Q22 65 38 45" stroke="#E97935" stroke-width="13" stroke-linecap="round"/><text x="150" y="68" font-family="Segoe UI,Arial,sans-serif" font-size="44" font-weight="700" fill="#FFFFFF" letter-spacing="2">SMART DENT</text></svg>',
} as const;

export function pickLogo(opts: { preset: StylePreset; withWordmark: boolean }): string {
  const variant = STYLE_PRESETS[opts.preset].logoVariant;
  if (opts.withWordmark) {
    return variant === 'lockupDark' ? SMARTDENT_LOGO.lockupDark : SMARTDENT_LOGO.lockupLight;
  }
  return variant === 'lockupDark' ? SMARTDENT_LOGO.markDark : SMARTDENT_LOGO.markLight;
}

// Back-compat re-export (legacy usages)
export const smartDentLogoSVG = SMARTDENT_LOGO.markDark;

// ===== Helpers =====
export function escapeHtml(value: string): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function smartTruncate(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  const base = lastSpace > 8 ? truncated.substring(0, lastSpace) : truncated;
  return base.replace(/[.,;:\-]+$/, '') + '…';
}

// ===== WCAG contrast =====
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    parseInt(v.substring(0, 2), 16),
    parseInt(v.substring(2, 4), 16),
    parseInt(v.substring(4, 6), 16),
  ];
}
function relLuminance([r, g, b]: [number, number, number]): number {
  const conv = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
}
export function contrastRatio(hex1: string, hex2: string): number {
  try {
    const l1 = relLuminance(hexToRgb(hex1));
    const l2 = relLuminance(hexToRgb(hex2));
    const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (a + 0.05) / (b + 0.05);
  } catch {
    return 0;
  }
}

// ===== Layout buckets =====
export function getLayoutBucket(w: number, h: number): LayoutBucket {
  const area = w * h;
  if (h >= w && area >= 100000) return 'INTERSTITIAL';
  if (area < 25000) return 'SMALL';
  if (area >= 100000) return 'LARGE';
  return 'MEDIUM';
}

const BUCKET_LIMITS: Record<LayoutBucket, { headline: number; subheadline: number }> = {
  SMALL:        { headline: 25, subheadline: 0  },
  MEDIUM:       { headline: 35, subheadline: 60 },
  LARGE:        { headline: 45, subheadline: 80 },
  INTERSTITIAL: { headline: 50, subheadline: 90 },
};

interface BannerParams {
  width: number;
  height: number;
  style: DisplayStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headline: string;
  subheadline?: string;
  ctaText: string;
  productImageUrl: string;
  logoUrl?: string;
  finalUrl: string;
  showFdaBadge?: boolean;
  campaignSlug?: string;
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
}

// ===== Renderers =====
function renderSMALL(p: BannerParams): { body: string; css: string } {
  const limits = BUCKET_LIMITS.SMALL;
  const headline = smartTruncate(p.headline, limits.headline);
  const cta = smartTruncate(p.ctaText, 14);
  const preset = STYLE_PRESETS[p.style as StylePreset];
  const logoSvg = pickLogo({ preset: p.style as StylePreset, withWordmark: false });
  const css = `
.b{background:${preset.bgGradient};padding:0 10px;display:flex;align-items:center;gap:8px;}
.lg{flex-shrink:0;height:22px;display:flex;align-items:center;}
.lg svg{height:22px;width:auto;}
.h{flex:1;min-width:0;font-size:12px;font-weight:700;color:${preset.textOnBg};line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.c{flex-shrink:0;background:${preset.ctaBg};color:${preset.ctaText};font-size:11px;font-weight:700;padding:5px 10px;border-radius:4px;border:none;cursor:pointer;white-space:nowrap;}
@keyframes ctaPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}
.c{animation:ctaPulse 2s ease-in-out 6;}
`;
  const body = `
<div class="lg">${logoSvg}</div>
<div class="h">${escapeHtml(headline)}</div>
<button class="c" aria-label="${escapeHtml(cta)}">${escapeHtml(cta)}</button>`;
  return { body, css };
}

function renderMEDIUM(p: BannerParams): { body: string; css: string } {
  const limits = BUCKET_LIMITS.MEDIUM;
  const isHorizontal = p.width / p.height > 1.5;
  const headline = smartTruncate(p.headline, isHorizontal ? Math.min(limits.headline, 32) : limits.headline);
  const sub = p.subheadline && !isHorizontal ? smartTruncate(p.subheadline, limits.subheadline) : '';
  const cta = smartTruncate(p.ctaText, 18);
  const preset = STYLE_PRESETS[p.style as StylePreset];
  const logoSvg = pickLogo({ preset: p.style as StylePreset, withWordmark: p.width >= 300 });
  const flexDir = isHorizontal ? 'row' : 'column';
  const imgDim = isHorizontal
    ? `width:${Math.min(p.height - 16, 80)}px;height:${Math.min(p.height - 16, 80)}px;`
    : `width:${Math.min(p.width * 0.55, 140)}px;height:${Math.min(p.width * 0.55, 140)}px;`;
  const css = `
.b{background:${preset.bgGradient};padding:10px;display:flex;flex-direction:${flexDir};align-items:center;gap:10px;${isHorizontal ? '' : 'justify-content:space-between;'}}
.pi{${imgDim}object-fit:contain;flex-shrink:0;border-radius:6px;}
.tw{display:flex;flex-direction:column;${isHorizontal ? 'flex:1;min-width:0;' : 'align-items:center;text-align:center;'}gap:4px;}
.h{font-size:${isHorizontal ? 14 : 17}px;font-weight:800;color:${preset.textOnBg};line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:normal;hyphens:none;}
.s{font-size:11px;color:${preset.textOnBg};opacity:0.88;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:normal;${sub ? '' : 'display:none;'}}
.fda{display:inline-block;background:${preset.fdaBadgeBg};color:${preset.fdaBadgeText};font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;letter-spacing:0.3px;align-self:flex-start;}
.c{background:${preset.ctaBg};color:${preset.ctaText};font-size:12px;font-weight:700;padding:7px 14px;border-radius:5px;border:none;cursor:pointer;white-space:nowrap;align-self:center;}
@keyframes ctaPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}
.c{animation:ctaPulse 2s ease-in-out 6;}
.lg{position:absolute;bottom:4px;right:6px;height:14px;opacity:0.85;}
.lg svg{height:14px;width:auto;}
`;
  const body = `
<img class="pi" src="${escapeHtml(p.productImageUrl)}" alt="${escapeHtml(p.headline)}" loading="lazy">
<div class="tw">
  ${p.showFdaBadge ? '<span class="fda">FDA K260152</span>' : ''}
  <div class="h">${escapeHtml(headline)}</div>
  ${sub ? `<div class="s">${escapeHtml(sub)}</div>` : ''}
  <button class="c" aria-label="${escapeHtml(cta)}">${escapeHtml(cta)}</button>
</div>
<div class="lg">${logoSvg}</div>`;
  return { body, css };
}

function renderLARGE(p: BannerParams): { body: string; css: string } {
  const limits = BUCKET_LIMITS.LARGE;
  const isHorizontal = p.width / p.height > 1.8;
  const isBillboard = p.width >= 900 && p.height >= 200;
  const headline = smartTruncate(p.headline, limits.headline);
  const sub = p.subheadline && isBillboard ? smartTruncate(p.subheadline, limits.subheadline) : '';
  const cta = smartTruncate(p.ctaText, 20);
  const preset = STYLE_PRESETS[p.style as StylePreset];
  const logoSvg = pickLogo({ preset: p.style as StylePreset, withWordmark: p.width >= 300 });
  const imgDim = isHorizontal
    ? `width:${Math.min(p.height - 16, 200)}px;height:${Math.min(p.height - 16, 200)}px;`
    : `width:${Math.min(p.width * 0.5, 220)}px;height:${Math.min(p.width * 0.5, 220)}px;`;
  const css = `
.b{background:${preset.bgGradient};padding:14px 18px;display:flex;flex-direction:${isHorizontal ? 'row' : 'column'};align-items:center;gap:16px;}
.pi{${imgDim}object-fit:contain;flex-shrink:0;border-radius:8px;}
.tw{display:flex;flex-direction:column;${isHorizontal ? 'flex:1;min-width:0;' : 'align-items:center;text-align:center;'}gap:6px;}
.h{font-size:${isBillboard ? 28 : isHorizontal ? 18 : 22}px;font-weight:800;color:${preset.textOnBg};line-height:1.15;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:normal;hyphens:none;}
.s{font-size:13px;color:${preset.textOnBg};opacity:0.9;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;${sub ? '' : 'display:none;'}}
.fda{display:inline-block;background:${preset.fdaBadgeBg};color:${preset.fdaBadgeText};font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:0.3px;align-self:flex-start;}
.c{background:${preset.ctaBg};color:${preset.ctaText};font-size:14px;font-weight:800;padding:10px 22px;border-radius:6px;border:none;cursor:pointer;white-space:nowrap;align-self:center;text-transform:uppercase;letter-spacing:0.4px;}
@keyframes ctaPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(0,0,0,0.15);}50%{transform:scale(1.06);box-shadow:0 4px 14px 0 rgba(0,0,0,0.18);}}
.c{animation:ctaPulse 2.2s ease-in-out 6;}
.lg{position:absolute;bottom:6px;right:10px;height:18px;opacity:0.9;}
.lg svg{height:18px;width:auto;}
`;
  const body = `
<img class="pi" src="${escapeHtml(p.productImageUrl)}" alt="${escapeHtml(p.headline)}" loading="lazy">
<div class="tw">
  ${p.showFdaBadge ? '<span class="fda">FDA K260152 · Restaurações Definitivas</span>' : ''}
  <div class="h">${escapeHtml(headline)}</div>
  ${sub ? `<div class="s">${escapeHtml(sub)}</div>` : ''}
  <button class="c" aria-label="${escapeHtml(cta)}">${escapeHtml(cta)}</button>
</div>
<div class="lg">${logoSvg}</div>`;
  return { body, css };
}

function renderINTERSTITIAL(p: BannerParams): { body: string; css: string } {
  const limits = BUCKET_LIMITS.INTERSTITIAL;
  const headline = smartTruncate(p.headline, limits.headline);
  const sub = p.subheadline ? smartTruncate(p.subheadline, limits.subheadline) : '';
  const cta = smartTruncate(p.ctaText, 22);
  const preset = STYLE_PRESETS[p.style as StylePreset];
  const logoSvg = pickLogo({ preset: p.style as StylePreset, withWordmark: true });
  const css = `
.b{background:${preset.bgGradient};padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center;box-sizing:border-box;}
.img-wrap{flex:1 1 auto;min-height:0;width:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.pi{max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;}
.tw{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px 0;width:100%;}
.h{font-size:20px;font-weight:800;color:${preset.textOnBg};line-height:1.18;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:normal;hyphens:none;}
.s{font-size:12px;color:${preset.textOnBg};opacity:0.9;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;${sub ? '' : 'display:none;'}}
.fda{display:inline-block;background:${preset.fdaBadgeBg};color:${preset.fdaBadgeText};font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:0.3px;}
.c{flex:0 0 auto;min-height:36px;margin-top:8px;background:${preset.ctaBg};color:${preset.ctaText};font-size:14px;font-weight:800;padding:10px 24px;border-radius:6px;border:none;cursor:pointer;text-transform:uppercase;letter-spacing:0.4px;}
@keyframes ctaPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}
.c{animation:ctaPulse 2.2s ease-in-out 6;}
.lg{flex:0 0 auto;height:16px;margin-top:6px;opacity:0.85;}
.lg svg{height:16px;width:auto;}
`;
  const body = `
<div class="img-wrap"><img class="pi" src="${escapeHtml(p.productImageUrl)}" alt="${escapeHtml(p.headline)}" loading="lazy"></div>
<div class="tw">
  ${p.showFdaBadge ? '<span class="fda">FDA K260152 · Classe II</span>' : ''}
  <div class="h">${escapeHtml(headline)}</div>
  ${sub ? `<div class="s">${escapeHtml(sub)}</div>` : ''}
</div>
<button class="c" aria-label="${escapeHtml(cta)}">${escapeHtml(cta)}</button>
<div class="lg">${logoSvg}</div>`;
  return { body, css };
}

// ===== Tracking script (IAB clickTag + UTM + GA4/GTM) =====
function buildTrackingScript(p: BannerParams): string {
  const utm = p.utm || {};
  const utmParams: Record<string, string> = {
    utm_source: utm.source || 'google_display',
    utm_medium: utm.medium || 'banner',
    utm_campaign: utm.campaign || p.campaignSlug || 'display_default',
    utm_content: `${p.width}x${p.height}`,
    utm_term: utm.term || smartTruncate(p.headline, 25).replace(/\s+/g, '_').toLowerCase(),
  };
  if (utm.content) utmParams.utm_content = utm.content;
  const utmJson = JSON.stringify(utmParams);
  const baseUrl = p.finalUrl || '#';
  return `
<script>
var clickTag = ${JSON.stringify(baseUrl)};
function handleBannerClick(e){
  if(e && e.preventDefault) e.preventDefault();
  var base = (typeof clickTag !== 'undefined' && clickTag) ? clickTag : ${JSON.stringify(baseUrl)};
  var utm = ${utmJson};
  var sep = base.indexOf('?') > -1 ? '&' : '?';
  var qs = Object.keys(utm).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(utm[k]);}).join('&');
  var finalUrl = base + sep + qs;
  try {
    if (window.parent && window.parent.dataLayer) {
      window.parent.dataLayer.push({event:'banner_click',banner_size:'${p.width}x${p.height}',banner_campaign:utm.utm_campaign});
    }
    if (window.parent && window.parent.gtag) {
      window.parent.gtag('event','banner_click',{banner_size:'${p.width}x${p.height}',campaign:utm.utm_campaign});
    }
  } catch(_) {}
  window.open(finalUrl,'_blank','noopener');
  return false;
}
</script>`;
}

export function generateBannerHTML(params: BannerParams | (Omit<BannerParams, 'accentColor'> & { accentColor?: string })): string {
  const p: BannerParams = {
    accentColor: (params as BannerParams).accentColor || params.primaryColor,
    showFdaBadge: false,
    ...(params as BannerParams),
  };
  const bucket = getLayoutBucket(p.width, p.height);
  const rendered =
    bucket === 'SMALL' ? renderSMALL(p)
    : bucket === 'LARGE' ? renderLARGE(p)
    : bucket === 'INTERSTITIAL' ? renderINTERSTITIAL(p)
    : renderMEDIUM(p);

  const baseCSS = `
*{margin:0;padding:0;box-sizing:border-box;}
html,body{overflow:hidden;width:${p.width}px;height:${p.height}px;}
body{font-family:'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
.b{width:${p.width}px;height:${p.height}px;position:relative;overflow:hidden;cursor:pointer;}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.b > *{animation:fadeIn 0.5s ease-out both;}
.b > *:nth-child(2){animation-delay:0.12s;}
.b > *:nth-child(3){animation-delay:0.24s;}
`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width=${p.width},height=${p.height}">
<title>${escapeHtml(p.headline)}</title>
<style>${baseCSS}${rendered.css}</style>
</head>
<body>
<a href="${escapeHtml(p.finalUrl || '#')}" role="link" aria-label="${escapeHtml(p.headline + ' — ' + p.ctaText)}" onclick="return handleBannerClick(event)" style="text-decoration:none;color:inherit;display:block;">
  <div class="b" data-bucket="${bucket}">${rendered.body}</div>
</a>
${buildTrackingScript(p)}
</body>
</html>`;
}
