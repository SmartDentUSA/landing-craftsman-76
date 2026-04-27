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
  textOnBg: string;
  ctaBg: string;
  ctaText: string;
  fdaBadgeBg: string;
  fdaBadgeText: string;
  logoVariant: LogoVariant;
}

// Os 4 estilos pré-definidos. Cada estilo é um arranjo das cores oficiais.
export const STYLE_PRESETS: Record<'modern' | 'minimal' | 'bold' | 'clinical', StylePresetConfig> = {
  modern: {
    label: 'Moderno',
    description: 'Gradiente sutil, overlay elegante',
    primary: BRAND.navy,
    secondary: BRAND.navyDark,
    accent: BRAND.orange,
    bgGradient: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navyDark} 100%)`,
    textOnBg: BRAND.white,
    ctaBg: BRAND.orange,
    ctaText: BRAND.white,
    fdaBadgeBg: BRAND.orange,
    fdaBadgeText: BRAND.white,
    logoVariant: 'lockupDark',
  },
  minimal: {
    label: 'Minimalista',
    description: 'Fundo limpo, foco no produto',
    primary: BRAND.white,
    secondary: BRAND.offWhite,
    accent: BRAND.orange,
    bgGradient: `linear-gradient(135deg, ${BRAND.white} 0%, ${BRAND.offWhite} 100%)`,
    textOnBg: BRAND.navy,
    ctaBg: BRAND.orange,
    ctaText: BRAND.white,
    fdaBadgeBg: BRAND.orange,
    fdaBadgeText: BRAND.white,
    logoVariant: 'lockupLight',
  },
  bold: {
    label: 'Bold',
    description: 'Cores vibrantes, CTA chamativo',
    primary: BRAND.orange,
    secondary: BRAND.navy,
    accent: BRAND.white,
    bgGradient: `linear-gradient(135deg, ${BRAND.orange} 0%, ${BRAND.orangeDark} 100%)`,
    textOnBg: BRAND.white,
    ctaBg: BRAND.white,
    ctaText: BRAND.navy,
    fdaBadgeBg: BRAND.navy,
    fdaBadgeText: BRAND.white,
    logoVariant: 'lockupDark',
  },
  clinical: {
    label: 'Clínico',
    description: 'Profissional, tons de azul',
    primary: BRAND.navy,
    secondary: BRAND.navyMid,
    accent: BRAND.orange,
    bgGradient: `linear-gradient(135deg, ${BRAND.navyMid} 0%, ${BRAND.navy} 100%)`,
    textOnBg: BRAND.white,
    ctaBg: BRAND.orange,
    ctaText: BRAND.white,
    fdaBadgeBg: BRAND.white,
    fdaBadgeText: BRAND.navy,
    logoVariant: 'lockupDark',
  },
};

export type StylePreset = keyof typeof STYLE_PRESETS;
export const DEFAULT_STYLE: StylePreset = 'modern';
