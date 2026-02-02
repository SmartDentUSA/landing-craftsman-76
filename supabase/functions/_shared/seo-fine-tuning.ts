/**
 * 🎯 SEO Fine-Tuning Shared Module
 * Implements 6 SEO optimization points for 10/10 score:
 * A. FAQPage Schema aggregation
 * B. Lazy loading (Core Web Vitals)
 * C. sameAs expansion (E-E-A-T)
 * D. Service Schema
 * E. hasCredential (certifications)
 * F. Keyword deduplication
 */

// ============================================
// A. FAQPage Schema - Aggregate FAQs from products
// ============================================
export interface FAQItem {
  question: string;
  answer: string;
}

export function aggregateFAQsFromProducts(products: any[], maxFaqs: number = 10): FAQItem[] {
  const aggregated: FAQItem[] = [];
  const seenQuestions = new Set<string>();
  
  for (const product of products) {
    if (product.faq && Array.isArray(product.faq)) {
      for (const faq of product.faq.slice(0, 3)) {
        if (aggregated.length >= maxFaqs) break;
        if (faq.question && faq.answer) {
          const normalizedQ = faq.question.toLowerCase().trim();
          if (!seenQuestions.has(normalizedQ)) {
            seenQuestions.add(normalizedQ);
            aggregated.push({
              question: faq.question,
              answer: String(faq.answer).replace(/<[^>]*>/g, '').trim()
            });
          }
        }
      }
    }
  }
  
  console.log(`📋 [SEO] Aggregated ${aggregated.length} FAQs from ${products.length} products`);
  return aggregated;
}

export function generateFAQPageSchema(faqs: FAQItem[]): object | null {
  if (!faqs || faqs.length < 2) return null;
  
  return {
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

// ============================================
// B. Lazy Loading - Core Web Vitals
// ============================================
export function generateLazyImageAttrs(isBelowFold: boolean): string {
  return isBelowFold 
    ? 'loading="lazy" decoding="async"' 
    : 'fetchpriority="high"';
}

export function addLazyLoadingToImages(html: string): string {
  // Add lazy loading to images that don't have it (except hero images with fetchpriority)
  return html.replace(
    /<img([^>]*?)(?!loading=)([^>]*)>/gi,
    (match, before, after) => {
      // Skip if it's a hero image (has fetchpriority)
      if (match.includes('fetchpriority="high"') || match.includes("fetchpriority='high'")) {
        return match;
      }
      // Skip if already has loading attribute
      if (match.includes('loading=')) {
        return match;
      }
      return `<img${before} loading="lazy" decoding="async"${after}>`;
    }
  );
}

// ============================================
// C. sameAs Expansion - E-E-A-T Author
// ============================================
export interface CompanyProfile {
  founder_linkedin?: string;
  founder_instagram?: string;
  founder_twitter?: string;
  instagram_profile?: string;
  youtube_channel?: string;
  twitter_profile?: string;
  social_media_links?: Array<{ url?: string; href?: string; platform?: string }>;
}

export function expandFounderSameAs(company: CompanyProfile | any): string[] {
  const sameAs: string[] = [];
  
  // Founder-specific links
  if (company?.founder_linkedin) {
    sameAs.push(company.founder_linkedin);
  }
  
  if (company?.founder_instagram) {
    const igUrl = company.founder_instagram.startsWith('http') 
      ? company.founder_instagram 
      : `https://instagram.com/${company.founder_instagram.replace('@', '')}`;
    if (!sameAs.includes(igUrl)) sameAs.push(igUrl);
  }
  
  if (company?.founder_twitter) {
    const twUrl = company.founder_twitter.startsWith('http')
      ? company.founder_twitter
      : `https://twitter.com/${company.founder_twitter.replace('@', '')}`;
    if (!sameAs.includes(twUrl)) sameAs.push(twUrl);
  }
  
  // Company social links as fallback
  if (company?.instagram_profile) {
    const igUrl = company.instagram_profile.startsWith('http') 
      ? company.instagram_profile 
      : `https://instagram.com/${company.instagram_profile.replace('@', '')}`;
    if (!sameAs.includes(igUrl)) sameAs.push(igUrl);
  }
  
  if (company?.youtube_channel) {
    const ytUrl = company.youtube_channel.startsWith('http')
      ? company.youtube_channel
      : `https://youtube.com/${company.youtube_channel}`;
    if (!sameAs.includes(ytUrl)) sameAs.push(ytUrl);
  }
  
  if (company?.twitter_profile) {
    const twUrl = company.twitter_profile.startsWith('http')
      ? company.twitter_profile
      : `https://twitter.com/${company.twitter_profile.replace('@', '')}`;
    if (!sameAs.includes(twUrl)) sameAs.push(twUrl);
  }
  
  // Social media links array
  if (Array.isArray(company?.social_media_links)) {
    company.social_media_links.forEach((link: any) => {
      const url = link.url || link.href;
      if (url && !sameAs.includes(url)) {
        sameAs.push(url);
      }
    });
  }
  
  console.log(`🔗 [SEO] Expanded sameAs with ${sameAs.length} social links`);
  return sameAs;
}

// ============================================
// D. Service Schema
// ============================================
export interface ServiceSchemaOptions {
  websiteUrl: string;
  businessSector?: string;
  areaServed?: string;
}

export function generateServiceSchemas(
  servicesText: string | null | undefined, 
  company: any,
  options: ServiceSchemaOptions
): object[] {
  if (!servicesText) return [];
  
  const services = servicesText
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 3 && s.length < 100);
  
  if (services.length === 0) return [];
  
  const schemas = services.slice(0, 4).map((serviceName, i) => ({
    "@type": "Service",
    "@id": `${options.websiteUrl}/#service-${i + 1}`,
    "name": serviceName,
    "provider": { 
      "@type": "Organization", 
      "@id": `${options.websiteUrl}/#organization`,
      "name": company?.company_name || 'Smart Dent'
    },
    "areaServed": { 
      "@type": "Country", 
      "name": options.areaServed || "Brasil" 
    },
    "serviceType": options.businessSector || "Odontologia Digital"
  }));
  
  console.log(`🛠️ [SEO] Generated ${schemas.length} Service schemas`);
  return schemas;
}

// ============================================
// E. hasCredential - Certifications
// ============================================
export interface Credential {
  "@type": "EducationalOccupationalCredential";
  name: string;
  credentialCategory: string;
  recognizedBy?: { "@type": string; name: string };
}

export function generateHasCredential(
  certifications: string | string[] | null | undefined
): Credential[] | null {
  if (!certifications) return null;
  
  const certsList = Array.isArray(certifications) 
    ? certifications 
    : certifications.split(/[,;]/).map(c => c.trim()).filter(Boolean);
  
  if (certsList.length === 0) return null;
  
  const credentials = certsList.map(cert => {
    const lowerCert = cert.toLowerCase();
    let category = 'certification';
    let recognizedBy = undefined;
    
    if (lowerCert.includes('anvisa')) {
      category = 'regulatory';
      recognizedBy = { "@type": "GovernmentOrganization", name: "ANVISA" };
    } else if (lowerCert.includes('fda')) {
      category = 'regulatory';
      recognizedBy = { "@type": "GovernmentOrganization", name: "FDA" };
    } else if (lowerCert.includes('iso')) {
      category = 'quality';
      recognizedBy = { "@type": "Organization", name: "ISO" };
    } else if (lowerCert.includes('ce') || lowerCert.includes('inmetro')) {
      category = 'regulatory';
    }
    
    const credential: Credential = {
      "@type": "EducationalOccupationalCredential",
      name: cert,
      credentialCategory: category
    };
    
    if (recognizedBy) {
      credential.recognizedBy = recognizedBy;
    }
    
    return credential;
  });
  
  console.log(`🏅 [SEO] Generated ${credentials.length} hasCredential entries`);
  return credentials;
}

export function addHasCredentialToOrganization(
  orgSchema: any, 
  company: any
): any {
  const credentials = generateHasCredential(company?.certifications);
  if (credentials && credentials.length > 0) {
    orgSchema.hasCredential = credentials;
  }
  return orgSchema;
}

export function addHasCredentialToProduct(
  productSchema: any, 
  product: any
): any {
  const credentials = generateHasCredential(product?.certifications);
  if (credentials && credentials.length > 0) {
    productSchema.hasCredential = credentials;
  }
  return productSchema;
}

// ============================================
// F. Keyword Deduplication
// ============================================
export function deduplicateKeywords(keywords: string[], maxKeywords: number = 20): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  
  for (const keyword of keywords) {
    if (!keyword) continue;
    
    // Split by comma in case of compound keywords
    const parts = keyword.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    for (const part of parts) {
      const normalized = part.toLowerCase().trim();
      if (normalized && normalized.length > 2 && normalized.length < 100 && !seen.has(normalized)) {
        seen.add(normalized);
        unique.push(part); // Keep original casing
        if (unique.length >= maxKeywords) break;
      }
    }
    
    if (unique.length >= maxKeywords) break;
  }
  
  console.log(`🔑 [SEO] Deduplicated keywords: ${keywords.length} → ${unique.length}`);
  return unique;
}

export function generateKeywordsMetaContent(keywords: string[]): string {
  return deduplicateKeywords(keywords, 20).join(', ');
}

// ============================================
// Combined SEO Enhancement
// ============================================
export interface SEOEnhancementResult {
  faqSchema: object | null;
  serviceSchemas: object[];
  expandedSameAs: string[];
  hasCredential: Credential[] | null;
  deduplicatedKeywords: string[];
}

export function enhanceSEO(
  products: any[],
  company: any,
  keywords: string[],
  options: { websiteUrl: string; businessSector?: string }
): SEOEnhancementResult {
  // A. Aggregate FAQs
  const aggregatedFaqs = aggregateFAQsFromProducts(products);
  const faqSchema = generateFAQPageSchema(aggregatedFaqs);
  
  // C. Expand sameAs
  const expandedSameAs = expandFounderSameAs(company);
  
  // D. Generate Service schemas
  const serviceSchemas = generateServiceSchemas(
    company?.main_products_services,
    company,
    options
  );
  
  // E. Generate hasCredential
  const hasCredential = generateHasCredential(company?.certifications);
  
  // F. Deduplicate keywords
  const deduplicatedKeywords = deduplicateKeywords(keywords);
  
  console.log(`✅ [SEO] Enhancement complete: ${aggregatedFaqs.length} FAQs, ${serviceSchemas.length} Services, ${expandedSameAs.length} sameAs, ${deduplicatedKeywords.length} keywords`);
  
  return {
    faqSchema,
    serviceSchemas,
    expandedSameAs,
    hasCredential,
    deduplicatedKeywords
  };
}

// ============================================
// G. Hreflang Multi-Language Support
// ============================================
export interface HreflangConfig {
  defaultLang: string;
  supportedLangs: string[];
  langPaths: Record<string, string>;
}

export const DEFAULT_HREFLANG_CONFIG: HreflangConfig = {
  defaultLang: 'pt-BR',
  supportedLangs: ['pt-BR', 'en-US', 'es-ES'],
  langPaths: {
    'pt-BR': '',      // Raiz (sem prefixo)
    'en-US': '/en',   // /en/slug
    'es-ES': '/es',   // /es/slug
    'pt-PT': '/pt'    // /pt/slug (reservado para futuro)
  }
};

export interface HreflangTag {
  lang: string;
  url: string;
}

/**
 * Gera array de tags hreflang para SEO internacional
 * @param canonicalUrl URL canônica da página (pt-BR)
 * @param config Configuração opcional de idiomas suportados
 * @returns Array de objetos { lang, url }
 */
export function generateHreflangTags(
  canonicalUrl: string,
  config: Partial<HreflangConfig> = {}
): HreflangTag[] {
  if (!canonicalUrl) {
    console.warn('⚠️ [SEO] generateHreflangTags: canonicalUrl vazia');
    return [];
  }

  const finalConfig = { ...DEFAULT_HREFLANG_CONFIG, ...config };
  const tags: HreflangTag[] = [];
  
  try {
    // Parse canonical URL
    const urlObj = new URL(canonicalUrl);
    const baseDomain = `${urlObj.protocol}//${urlObj.host}`;
    const pathname = urlObj.pathname;
    
    // Remove any existing language prefix from pathname
    const cleanPath = pathname.replace(/^\/(en|es|pt)\//, '/');
    
    // Generate tag for each supported language
    for (const lang of finalConfig.supportedLangs) {
      const langPath = finalConfig.langPaths[lang] || '';
      const langUrl = `${baseDomain}${langPath}${cleanPath}`;
      tags.push({ lang, url: langUrl });
    }
    
    // Add x-default pointing to default language (pt-BR)
    const defaultPath = finalConfig.langPaths[finalConfig.defaultLang] || '';
    tags.push({ 
      lang: 'x-default', 
      url: `${baseDomain}${defaultPath}${cleanPath}` 
    });
    
    console.log(`🌐 [SEO] Generated ${tags.length} hreflang tags for ${canonicalUrl}`);
  } catch (error) {
    console.error('❌ [SEO] Erro ao gerar hreflang tags:', error);
    // Fallback: retorna apenas pt-BR e x-default apontando para URL original
    tags.push({ lang: 'pt-BR', url: canonicalUrl });
    tags.push({ lang: 'x-default', url: canonicalUrl });
  }
  
  return tags;
}

/**
 * Gera HTML das tags hreflang para injeção no <head>
 * @param canonicalUrl URL canônica da página
 * @param config Configuração opcional de idiomas
 * @returns String HTML com as tags <link rel="alternate">
 */
export function generateHreflangHTML(
  canonicalUrl: string,
  config?: Partial<HreflangConfig>
): string {
  const tags = generateHreflangTags(canonicalUrl, config);
  
  if (tags.length === 0) {
    return '';
  }
  
  return tags
    .map(tag => `<link rel="alternate" hreflang="${tag.lang}" href="${tag.url}">`)
    .join('\n  ');
}
