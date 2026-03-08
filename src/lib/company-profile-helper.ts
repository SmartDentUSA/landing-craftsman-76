import { supabase } from '@/integrations/supabase/client';

export interface CompanyProfileData {
  company_name: string;
  company_description: string;
  location: string; // ⚠️ DEPRECATED - auto-gerado
  
  // ✨ CAMPOS ESTRUTURADOS DE ENDEREÇO
  country?: string;
  state?: string;
  city?: string;
  street_address?: string;
  address_number?: string;
  postal_code?: string;
  
  // ✅ CAMPOS GEO (para Local SEO)
  latitude?: number;
  longitude?: number;
  
  contact_phone: string;
  contact_email: string;
  website_url: string;
  brand_values: string;
  mission_statement: string;
  vision_statement: string;
  instagram_profile?: string;
  youtube_channel?: string;
  
  // ✅ FASE 1: Campos críticos para SEO/SGE
  company_culture?: string;
  working_methodology?: string;
  delivery_approach?: string;
  differentiators?: string;
  founded_year?: number;
  team_size?: string;
  company_logo_url?: string;
  company_logo_supabase_path?: string;
  youtube_company_footer?: string;
  
  // ✅ NOVOS: Campos de redes sociais do fundador (E-E-A-T)
  founder_linkedin?: string;
  founder_instagram?: string;
  founder_twitter?: string;
  
  // ✅ CAMPOS E-E-A-T (Founder/Author)
  founder_name?: string;
  founder_title?: string;
  
  // ✅ CAMPOS AI/Business (para AI Content Tags)
  business_sector?: string;
  main_products_services?: string;
  
  // ✅ CAMPOS SEO
  seo_context_keywords: string[];
  seo_market_positioning: string;
  seo_service_areas: string;
  seo_technical_expertise: string;
  seo_competitive_advantages: string;
  seo_domains?: Array<{ domain: string; primary?: boolean }>;
  
  // ✅ NOVO: Certificações da empresa para hasCredential Schema
  certifications?: Array<{
    name: string;           // "ISO 9001:2015", "ANVISA", "FDA 510(k)"
    issuer: string;         // "ABNT", "ANVISA", "FDA"
    credentialCategory?: string; // "quality" | "regulatory" | "environmental"
    dateIssued?: string;    // ISO date
    validUntil?: string;    // ISO date
    url?: string;           // Link para certificado
  }>;
  
  // ✅ NOVOS CAMPOS: Redes Sociais
  social_media_hashtags?: string[];
  social_media_handles?: string[];
  youtube_tags?: string[];
  youtube_verified?: boolean;
  instagram_verified?: boolean;
  
  // ✅ NOVOS CAMPOS: Tracking e Analytics
  tracking_pixels?: {
    google_tag_manager?: { enabled: boolean; container_id?: string };
    meta_pixel?: { enabled: boolean; pixel_id?: string };
    tiktok_pixel?: { enabled: boolean; pixel_id?: string };
    google_analytics?: { enabled: boolean; measurement_id?: string };
  };
  
  // ✅ NOVOS CAMPOS: Vídeos da Empresa
  company_videos?: {
    youtube_videos?: Array<{ url: string; description?: string }>;
    instagram_videos?: Array<{ url: string; description?: string }>;
    testimonial_videos?: Array<{ url: string; description?: string }>;
    technical_videos?: Array<{ url: string; description?: string }>;
  };
  
  // ✅ NOVOS CAMPOS: Reviews e NPS
  company_reviews?: {
    google_place_id?: string;
    google_reviews_imported?: boolean;
    last_google_sync?: string;
    manual_reviews?: Array<{
      author_name: string;
      rating: number;
      review_text?: string;
      review_date?: string;
    }>;
  };
  nps_metrics?: {
    nps_score: number;
    total_responses: number;
    satisfaction_score: number;
    training_quality_score?: number;
    last_updated?: string;
    interest_themes?: Record<string, { count: number; percentage: number }>;
    insights?: {
      top_keywords?: string[];
      common_themes?: string[];
      content_opportunities?: string[];
    };
  };
  
  // ✅ NOVO: Navegação e Footer Configurável
  navigation_footer_config?: {
    navigation_menu?: Array<{
      label: string;
      href: string;
      order?: number;
      openInNewTab?: boolean;
    }>;
    footer?: {
      title?: string;
      locations?: Array<{
        label: string;
        address?: string;
        phone?: string;
        email?: string;
      }>;
      links?: Array<{
        label: string;
        href: string;
        openInNewTab?: boolean;
      }>;
      social_links?: Array<{
        platform?: string;
        href: string;
        icon_alt?: string;
      }>;
    };
  };
  
  // ✅ NOVOS: Campos jurídicos e LocalBusiness
  opening_hours?: any[];
  price_range?: string;
  areas_served?: any[];
  legal_name?: string;
  tax_id?: string;
  duns_number?: string;
  number_of_employees?: string;
  google_aggregate_rating?: { ratingValue: string; reviewCount: number };
  target_audience?: string;
  
  // Links institucionais
  institutional_links: Array<{
    label: string;
    url: string;
    category: string;
    description?: string;
    partnership_type?: 'manufacturer' | 'distributor' | 'certification' | 'media' | 'other';
    country?: string;
    since_year?: number;
    relevance_score?: number;
  }>;
  social_media_links: Array<{
    platform: string;
    url: string;
    href?: string;
  }>;
}

// Cache simples para evitar múltiplas consultas
let companyProfileCache: CompanyProfileData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function getCompanyProfileForSEO(): Promise<CompanyProfileData | null> {
  // Verificar cache
  const now = Date.now();
  if (companyProfileCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return companyProfileCache;
  }

  try {
    const { data, error } = await supabase
      .from('company_profile')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching company profile for SEO:', error);
      return null;
    }

    if (data && data.length > 0) {
      companyProfileCache = data[0] as unknown as CompanyProfileData;
      cacheTimestamp = now;
      return companyProfileCache;
    }

    return null;
  } catch (error) {
    console.error('Error in getCompanyProfileForSEO:', error);
    return null;
  }
}

export function buildSEOMetaFromCompany(companyData: CompanyProfileData, existingKeywords: string[] = []): {
  siteNameMeta: string;
  additionalKeywords: string[];
  geoContext: string;
  companyFooter: string;
  institutionalLinksHtml: string;
} {
  // Site name para og:site_name
  const siteNameMeta = companyData.company_name;

  // Keywords adicionais dos dados SEO Hidden
  const additionalKeywords = [
    ...existingKeywords,
    ...(companyData.seo_context_keywords || [])
  ];

  // Contexto geográfico para meta description
  const geoContext = companyData.seo_service_areas || companyData.location || '';

  // Footer automático com dados da empresa
  const companyFooter = `
    <div class="company-footer-info">
      <h3>${companyData.company_name}</h3>
      ${companyData.company_description ? `<p>${companyData.company_description}</p>` : ''}
      ${companyData.location ? `<p><strong>Localização:</strong> ${companyData.location}</p>` : ''}
      ${companyData.contact_phone ? `<p><strong>Telefone:</strong> ${companyData.contact_phone}</p>` : ''}
      ${companyData.contact_email ? `<p><strong>Email:</strong> ${companyData.contact_email}</p>` : ''}
      ${companyData.website_url ? `<p><strong>Website:</strong> <a href="${companyData.website_url}" target="_blank">${companyData.website_url}</a></p>` : ''}
    </div>
  `;

  // Links institucionais como HTML
  const institutionalLinksHtml = companyData.institutional_links?.length > 0 
    ? companyData.institutional_links.map(link => 
        `<a href="${link.url}" class="institutional-link ${link.category}" target="_blank">${link.label}</a>`
      ).join(' | ')
    : '';

  return {
    siteNameMeta,
    additionalKeywords,
    geoContext,
    companyFooter,
    institutionalLinksHtml
  };
}

/**
 * Retorna endereço completo formatado
 */
export function getFullAddress(companyData: CompanyProfileData): string {
  const parts = [
    companyData.street_address,
    companyData.address_number,
    companyData.city,
    companyData.state,
    companyData.postal_code,
    companyData.country
  ].filter(part => part && part.trim() !== '');
  
  return parts.length > 0 ? parts.join(', ') : companyData.location || '';
}

/**
 * Retorna objeto PostalAddress para Schema.org
 */
export function getPostalAddress(companyData: CompanyProfileData): {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
} {
  return {
    streetAddress: [companyData.street_address, companyData.address_number]
      .filter(Boolean)
      .join(', '),
    addressLocality: companyData.city || '',
    addressRegion: companyData.state || '',
    postalCode: companyData.postal_code || '',
    addressCountry: companyData.country || 'BR'
  };
}

/**
 * Retorna parcerias internacionais ordenadas por relevância
 */
export function getInternationalPartnerships(companyData: CompanyProfileData): Array<{
  name: string;
  url: string;
  description: string;
  country: string;
  type: string;
  sinceYear?: number;
  relevance: number;
}> {
  return (companyData.institutional_links || [])
    .filter(link => link.category === 'international_partnership')
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .map(link => ({
      name: link.label,
      url: link.url,
      description: link.description || '',
      country: link.country || '',
      type: link.partnership_type || 'other',
      sinceYear: link.since_year,
      relevance: link.relevance_score || 0
    }));
}

/**
 * Gera Schema.org para parcerias (memberOf / partner)
 */
export function generatePartnershipsSchema(companyData: CompanyProfileData): any[] {
  const partnerships = getInternationalPartnerships(companyData);
  
  return partnerships.map(p => ({
    '@type': 'Organization',
    'name': p.name,
    'url': p.url,
    'description': p.description,
    'areaServed': p.country || undefined
  }));
}