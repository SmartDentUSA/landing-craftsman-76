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
  
  // ✅ NOVOS CAMPOS DE ABORDAGEM EDITORIAL
  editorial_approach: 'technical' | 'solution-focused';
  content_tone: string;
  primary_focus: string;
  cta_style: string;
  keyword_strategy: string;
}

export const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  dentala: {
    domain: 'dentala',
    BASE_URL: 'https://dentala.com.br',
    BLOG_PATH: '/blog',
    OG_IMAGE: 'https://dentala.com.br/static/og/blog-dentala.jpg',
    SITE_NAME: 'Dentala - Odontologia Digital',
    THEME_COLOR: '#007bff',
    
    // ✅ ABORDAGEM EDITORIAL TÉCNICA
    editorial_approach: 'technical',
    content_tone: 'Técnico-profissional, baseado em dados e evidências',
    primary_focus: 'Especificações técnicas, diferenciais tecnológicos, aplicações clínicas',
    cta_style: 'Informativo e educacional ("Veja especificações", "Compare modelos")',
    keyword_strategy: 'Termos técnicos + especificações + nomenclatura científica'
  },
  eodonto: {
    domain: 'eodonto',
    BASE_URL: 'https://eodonto.com.br',
    BLOG_PATH: '/blog',
    OG_IMAGE: 'https://eodonto.com.br/static/og/blog-eodonto.jpg',
    SITE_NAME: 'Eodonto - Tecnologia Odontológica',
    THEME_COLOR: '#28a745',
    
    // ✅ ABORDAGEM EDITORIAL COMERCIAL
    editorial_approach: 'solution-focused',
    content_tone: 'Persuasivo, orientado a benefícios práticos e resultados',
    primary_focus: 'Soluções práticas, facilidade de uso, custo-benefício, resultados tangíveis',
    cta_style: 'Comercial e acionável ("Descubra a solução", "Transforme seu consultório")',
    keyword_strategy: 'Termos de solução + benefícios práticos + intenção de compra'
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
