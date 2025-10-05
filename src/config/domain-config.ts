/**
 * Domain Configuration
 * Configurações específicas por domínio (Dentala, Eodonto)
 */

export interface DomainConfig {
  domain: 'dentala' | 'eodonto';
  BASE_URL: string;
  BLOG_PATH: string;
  OG_IMAGE: string;
  SITE_NAME: string;
  THEME_COLOR: string;
}

export const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  dentala: {
    domain: 'dentala',
    BASE_URL: 'https://dentala.com.br',
    BLOG_PATH: '/blog',
    OG_IMAGE: 'https://dentala.com.br/static/og/blog-dentala.jpg',
    SITE_NAME: 'Dentala - Odontologia Digital',
    THEME_COLOR: '#007bff',
  },
  eodonto: {
    domain: 'eodonto',
    BASE_URL: 'https://eodonto.com.br',
    BLOG_PATH: '/blog',
    OG_IMAGE: 'https://eodonto.com.br/static/og/blog-eodonto.jpg',
    SITE_NAME: 'Eodonto - Tecnologia Odontológica',
    THEME_COLOR: '#28a745',
  },
};

export function getDomainConfig(domain: string): DomainConfig {
  const normalized = domain.toLowerCase().replace(/\.com\.br$/, '');
  return DOMAIN_CONFIGS[normalized] || DOMAIN_CONFIGS.dentala;
}

export function isSupportedDomain(domain: string): boolean {
  const normalized = domain.toLowerCase().replace(/\.com\.br$/, '');
  return normalized in DOMAIN_CONFIGS;
}
