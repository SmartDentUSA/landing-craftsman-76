import { supabase } from '@/integrations/supabase/client';

interface CompanyProfileData {
  company_name: string;
  company_description: string;
  location: string;
  contact_phone: string;
  contact_email: string;
  website_url: string;
  brand_values: string;
  mission_statement: string;
  vision_statement: string;
  seo_context_keywords: string[];
  seo_market_positioning: string;
  seo_service_areas: string;
  seo_technical_expertise: string;
  seo_competitive_advantages: string;
  institutional_links: Array<{
    label: string;
    url: string;
    category: string;
  }>;
  social_media_links: Array<{
    platform: string;
    url: string;
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
      .select(`
        company_name,
        company_description,
        location,
        contact_phone,
        contact_email,
        website_url,
        brand_values,
        mission_statement,
        vision_statement,
        seo_context_keywords,
        seo_market_positioning,
        seo_service_areas,
        seo_technical_expertise,
        seo_competitive_advantages,
        institutional_links,
        social_media_links
      `)
      .maybeSingle();

    if (error) {
      console.error('Error fetching company profile for SEO:', error);
      return null;
    }

    if (data) {
      companyProfileCache = data as CompanyProfileData;
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