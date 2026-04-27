// Paleta oficial SmartDent (extraída do logo)
export const BRAND = {
  navy: '#2C3E5F',
  navyDark: '#1a2942',
  navyMid: '#4A6585',
  orange: '#E97935',
  orangeDark: '#C85F1F',
  white: '#FFFFFF',
  offWhite: '#F5F7FA',
} as const;

export type LogoVariant = 'lockupDark' | 'lockupLight';

export interface StylePresetConfig {
  label: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  bgGradient: string;
  /** Solid color used as the dominant background for WCAG validation (gradient still applied in CSS). */
  bgDominant: string;
  textOnBg: string;
  ctaBg: string;
  ctaText: string;
  fdaBadgeBg: string;
  fdaBadgeText: string;
  logoVariant: LogoVariant;
}

// Os 4 estilos pré-definidos. Cada estilo é um arranjo das cores oficiais.
// Regra de ouro WCAG: texto branco sobre #E97935 = 2.90:1 ✗.
// Em fundo laranja, sempre usar navyDark (#1a2942) como texto = 5.04:1 ✓.
export const STYLE_PRESETS: Record<'modern' | 'minimal' | 'bold' | 'clinical', StylePresetConfig> = {
  modern: {
    label: 'Moderno',
    description: 'Profissional corporate',
    primary: BRAND.navy,
    secondary: BRAND.navyDark,
    accent: BRAND.orange,
    bgGradient: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navyDark} 100%)`,
    bgDominant: BRAND.navy,           // 10.71:1 com texto branco
    textOnBg: BRAND.white,
    ctaBg: BRAND.orange,
    ctaText: BRAND.navyDark,          // 5.04:1 — NÃO branco
    fdaBadgeBg: BRAND.white,
    fdaBadgeText: BRAND.navy,         // 10.71:1
    logoVariant: 'lockupDark',
  },
  minimal: {
    label: 'Minimalista',
    description: 'Limpo, foco no produto',
    primary: BRAND.white,
    secondary: BRAND.offWhite,
    accent: BRAND.orange,
    bgGradient: `linear-gradient(135deg, ${BRAND.white} 0%, ${BRAND.offWhite} 100%)`,
    bgDominant: BRAND.white,
    textOnBg: BRAND.navy,             // 10.71:1
    ctaBg: BRAND.navy,                // CTA navy (laranja+branco falha)
    ctaText: BRAND.white,             // 10.71:1
    fdaBadgeBg: BRAND.orange,         // FDA mantém o laranja como destaque
    fdaBadgeText: BRAND.navyDark,     // 5.04:1
    logoVariant: 'lockupLight',
  },
  bold: {
    label: 'Bold',
    description: 'Conversão agressiva',
    primary: BRAND.orange,
    secondary: BRAND.navyDark,
    accent: BRAND.white,
    bgGradient: `linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.navyDark} 100%)`,
    bgDominant: BRAND.navyDark,       // gradiente termina em navyDark; branco mede 14.59:1
    textOnBg: BRAND.white,
    ctaBg: BRAND.orange,
    ctaText: BRAND.navyDark,          // 5.04:1
    fdaBadgeBg: BRAND.white,
    fdaBadgeText: BRAND.navyDark,     // 14.59:1
    logoVariant: 'lockupDark',
  },
  clinical: {
    label: 'Clínico',
    description: 'Hospitalar, tons de azul',
    primary: BRAND.navy,
    secondary: BRAND.navyMid,
    accent: BRAND.orange,
    bgGradient: `linear-gradient(135deg, ${BRAND.navyMid} 0%, ${BRAND.navy} 100%)`,
    bgDominant: BRAND.navy,
    textOnBg: BRAND.white,            // 10.71:1
    ctaBg: BRAND.white,               // CTA branco em fundo navy
    ctaText: BRAND.navyDark,          // 14.59:1
    fdaBadgeBg: BRAND.orange,
    fdaBadgeText: BRAND.navyDark,     // 5.04:1
    logoVariant: 'lockupDark',
  },
};

export type StylePreset = keyof typeof STYLE_PRESETS;
export const DEFAULT_STYLE: StylePreset = 'modern';

// ===== WCAG helpers (fonte única) =====
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length !== 6) return 0;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.substring(i, i + 2), 16) / 255);
  const c = (x: number) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

export function contrastRatio(c1: string, c2: string): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
