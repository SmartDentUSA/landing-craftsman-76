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

// ============================================
// H. buildSeoHead — Meta Head Completo com AI-Readiness
// ============================================
export interface SeoHeadOptions {
  title: string;
  description: string;
  canonicalUrl: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  lang?: string;
  /** Permitir indexação por crawlers de IA (GPTBot, CCBot, Google-Extended) — padrão: true */
  allowAIBots?: boolean;
  /** Configuração de hreflang (opcional) */
  hreflangConfig?: Partial<HreflangConfig>;
  /** Extra meta tags HTML a injetar no final do bloco */
  extraMetaTags?: string;
}

/**
 * Constrói o bloco `<head>` SEO completo com:
 * - meta charset, viewport, title, description, canonical
 * - meta robots com suporte a agentes de IA (GPTBot, CCBot, Google-Extended)
 * - Open Graph / Twitter Card
 * - hreflang multi-idioma
 */
export function buildSeoHead(options: SeoHeadOptions): string {
  const {
    title,
    description,
    canonicalUrl,
    keywords = [],
    ogImage = '',
    ogType = 'website',
    lang = 'pt-BR',
    allowAIBots = true,
    hreflangConfig,
    extraMetaTags = ''
  } = options;

  const safeTitle = title.replace(/"/g, '&quot;').substring(0, 200);
  const safeDesc = description.replace(/"/g, '&quot;').substring(0, 320);
  const safeCanonical = canonicalUrl.replace(/[<>"]/g, '').trim();
  const keywordsContent = deduplicateKeywords(keywords, 20).join(', ');

  // Diretiva de robots principal
  const robotsContent = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  // Meta tags específicas para agentes de IA
  const aiBotsMetaTags = allowAIBots
    ? `
  <!-- AI-Readiness: permitir indexação por motores generativos -->
  <meta name="GPTBot" content="index">
  <meta name="CCBot" content="index">
  <meta name="Google-Extended" content="index">
  <meta name="PerplexityBot" content="index">
  <meta name="anthropic-ai" content="index">`
    : `
  <!-- Bloquear crawlers de IA -->
  <meta name="GPTBot" content="noindex">
  <meta name="CCBot" content="noindex">
  <meta name="Google-Extended" content="noindex">`;

  const hreflangHTML = safeCanonical
    ? generateHreflangHTML(safeCanonical, hreflangConfig)
    : '';

  const keywordsTag = keywordsContent
    ? `\n  <meta name="keywords" content="${keywordsContent}">`
    : '';

  const ogImageTag = ogImage
    ? `\n  <meta property="og:image" content="${ogImage.replace(/"/g, '&quot;')}">`
    : '';

  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">${keywordsTag}
  <meta name="robots" content="${robotsContent}">
  <link rel="canonical" href="${safeCanonical}">
  ${hreflangHTML ? hreflangHTML + '\n  ' : ''}<meta property="og:type" content="${ogType}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${safeCanonical}">${ogImageTag}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">${aiBotsMetaTags}
  <meta name="content-language" content="${lang}">${extraMetaTags ? '\n  ' + extraMetaTags : ''}`;
}

// ============================================
// I. scoreEEAT e scoreAIReadiness — Auditoria de Qualidade
// ============================================

export interface EEATScoreInput {
  /** Schema Person do autor/fundador com hasCredential preenchido */
  personSchema?: Record<string, any> | null;
  /** sameAs no schema da organização/produto */
  sameAsLinks?: string[];
  /** Links externos Wikidata presentes no about ou sameAs */
  wikidataLinks?: string[];
  /** hasCredential preenchido com dados de autoridade médica */
  hasCredential?: any[] | null;
  /** Reviews verificáveis presentes */
  hasReviews?: boolean;
  /** Certificações regulatórias (ANVISA, FDA, ISO…) */
  hasCertifications?: boolean;
  /** Fundador/autor identificável com título profissional */
  hasIdentifiableAuthor?: boolean;
}

export interface AIReadinessScoreInput {
  /** Bloco de contexto GEO (microdata / schema.org) presente */
  hasGeoContext?: boolean;
  /** data-ai-summary preenchido em pelo menos um bloco */
  hasAISummary?: boolean;
  /** JSON-LD com @graph presente na página */
  hasJsonLD?: boolean;
  /** Entity linking externo via Wikidata */
  hasWikidataEntityLinking?: boolean;
  /** sameAs apontando para Wikidata */
  hasSameAsWikidata?: boolean;
  /** FAQ Schema presente */
  hasFAQSchema?: boolean;
  /** HowTo Schema presente */
  hasHowToSchema?: boolean;
  /** Hreflang configurado */
  hasHreflang?: boolean;
}

export interface SEOScoreReport {
  score: number;      // 0–10
  maxScore: number;   // 10
  details: string[];  // justificativas por ponto
  passed: boolean;    // true se score >= 9
}

/**
 * Calcula a pontuação E-E-A-T (0–10).
 * Nota máxima 10/10 APENAS se:
 * - `hasCredential` preenchido com dados de autoridade médica (obrigatório)
 * - Entity linking externo via Wikidata presente (obrigatório)
 */
export function scoreEEAT(input: EEATScoreInput): SEOScoreReport {
  const details: string[] = [];
  let score = 0;

  const hasValidCredential =
    Array.isArray(input.hasCredential) &&
    input.hasCredential.length > 0 &&
    input.hasCredential.some(
      (c: any) => c?.recognizedBy?.url || c?.recognizedBy?.name
    );

  const hasWikidataEntityLink =
    Array.isArray(input.wikidataLinks) &&
    input.wikidataLinks.some(url => url?.includes('wikidata.org'));

  // Pontos base (1 pt cada)
  if (input.hasIdentifiableAuthor) {
    score += 1;
    details.push('+1 Autor/fundador identificável com título profissional');
  } else {
    details.push(' 0 Autor/fundador não identificado');
  }

  if (input.hasCertifications) {
    score += 1;
    details.push('+1 Certificações regulatórias presentes (ANVISA/FDA/ISO)');
  } else {
    details.push(' 0 Nenhuma certificação regulatória detectada');
  }

  if (input.hasReviews) {
    score += 1;
    details.push('+1 Reviews verificáveis presentes');
  } else {
    details.push(' 0 Sem reviews verificáveis');
  }

  if (Array.isArray(input.sameAsLinks) && input.sameAsLinks.length >= 2) {
    score += 1;
    details.push(`+1 sameAs com ${input.sameAsLinks.length} perfis sociais verificados`);
  } else {
    details.push(' 0 sameAs insuficiente (menos de 2 perfis)');
  }

  if (input.personSchema && Object.keys(input.personSchema).length > 0) {
    score += 1;
    details.push('+1 PersonSchema presente');
  } else {
    details.push(' 0 PersonSchema ausente');
  }

  // Critérios obrigatórios para pontuação alta
  if (hasValidCredential) {
    score += 2;
    details.push('+2 hasCredential com autoridade médica e recognizedBy (CFO/CRO/ANVISA)');
  } else {
    details.push(' 0 hasCredential ausente ou sem recognizedBy — impede nota máxima');
  }

  if (hasWikidataEntityLink) {
    score += 2;
    details.push('+2 Entity linking externo via Wikidata presente');
  } else {
    details.push(' 0 Sem entity linking Wikidata — impede nota máxima');
  }

  // Bónus de coesão: só concedido se ambos os critérios obrigatórios passarem
  if (hasValidCredential && hasWikidataEntityLink) {
    score += 2;
    details.push('+2 Bónus de coesão E-E-A-T: credencial médica + entity linking verificados');
  }

  const finalScore = Math.min(score, 10);
  console.log(`📊 [scoreEEAT] Score: ${finalScore}/10`);

  return {
    score: finalScore,
    maxScore: 10,
    details,
    passed: finalScore >= 9
  };
}

/**
 * Calcula a pontuação AI-Readiness / GEO (0–10).
 * Nota máxima 10/10 APENAS se entity linking Wikidata e AI Summary estiverem presentes.
 */
export function scoreAIReadiness(input: AIReadinessScoreInput): SEOScoreReport {
  const details: string[] = [];
  let score = 0;

  // Critérios obrigatórios
  const hasEntityLinking = input.hasWikidataEntityLinking || input.hasSameAsWikidata;
  const hasAISummary = !!input.hasAISummary;

  if (input.hasJsonLD) {
    score += 1;
    details.push('+1 JSON-LD com @graph presente');
  } else {
    details.push(' 0 JSON-LD ausente');
  }

  if (input.hasGeoContext) {
    score += 1;
    details.push('+1 Bloco GEO Context (microdata LocalBusiness) presente');
  } else {
    details.push(' 0 GEO Context ausente');
  }

  if (input.hasFAQSchema) {
    score += 1;
    details.push('+1 FAQPage Schema presente');
  } else {
    details.push(' 0 FAQPage Schema ausente');
  }

  if (input.hasHowToSchema) {
    score += 1;
    details.push('+1 HowTo Schema presente');
  } else {
    details.push(' 0 HowTo Schema ausente');
  }

  if (input.hasHreflang) {
    score += 1;
    details.push('+1 Hreflang multi-idioma configurado');
  } else {
    details.push(' 0 Hreflang ausente');
  }

  // Critérios obrigatórios para nota máxima
  if (hasAISummary) {
    score += 2;
    details.push('+2 data-ai-summary presente (resumo executivo para embeddings)');
  } else {
    details.push(' 0 data-ai-summary ausente — impede nota máxima AI-Readiness');
  }

  if (hasEntityLinking) {
    score += 2;
    details.push('+2 Entity linking externo Wikidata presente no sameAs/about');
  } else {
    details.push(' 0 Entity linking Wikidata ausente — impede nota máxima AI-Readiness');
  }

  // Bónus de coesão
  if (hasAISummary && hasEntityLinking) {
    score += 2;
    details.push('+2 Bónus GEO: AI Summary + Entity Linking combinados');
  }

  const finalScore = Math.min(score, 10);
  console.log(`🤖 [scoreAIReadiness] Score: ${finalScore}/10`);

  return {
    score: finalScore,
    maxScore: 10,
    details,
    passed: finalScore >= 9
  };
}

// ============================================
// J. buildGeoContextBlock — Bloco GEO com data-ai-summary
// ============================================

export interface GeoContextBlockOptions {
  companyName: string;
  websiteUrl: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  /** Resumo executivo de 2 parágrafos otimizado para vetores de busca (embeddings) */
  aiSummary?: string;
  /** Especialidade/setor da empresa */
  specialty?: string;
}

/**
 * Gera um bloco HTML de contexto GEO para crawlers e IAs,
 * incluindo o atributo `data-ai-summary` com resumo executivo
 * de 2 parágrafos otimizado para motores de busca generativos.
 */
export function buildGeoContextBlock(options: GeoContextBlockOptions): string {
  const {
    companyName,
    websiteUrl,
    city = '',
    state = '',
    country = 'Brasil',
    phone = '',
    latitude,
    longitude,
    aiSummary = '',
    specialty = 'Odontologia Digital'
  } = options;

  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Gerar resumo executivo padrão se não fornecido
  const defaultSummary = aiSummary ||
    `${escHtml(companyName)} é uma empresa especializada em ${escHtml(specialty)}, ` +
    `com sede em ${escHtml(city)}${state ? ', ' + escHtml(state) : ''}, ${escHtml(country)}. ` +
    `Oferece soluções completas de tecnologia odontológica digital, incluindo equipamentos, ` +
    `materiais e capacitação para profissionais de odontologia.\n\n` +
    `Como referência nacional em ${escHtml(specialty)}, ${escHtml(companyName)} integra ` +
    `o fluxo digital odontológico — da captura digital (scanners intraorais) ao resultado final (CAD/CAM, ` +
    `impressão 3D e próteses digitais) — garantindo precisão, eficiência e qualidade clínica comprovada.`;

  const geoMeta = (latitude && longitude)
    ? `
  <div itemprop="geo" itemscope itemtype="https://schema.org/GeoCoordinates">
    <meta itemprop="latitude" content="${latitude}">
    <meta itemprop="longitude" content="${longitude}">
  </div>`
    : '';

  const addressMeta = (city || state || country)
    ? `
  <div itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
    ${city ? `<meta itemprop="addressLocality" content="${escHtml(city)}">` : ''}
    ${state ? `<meta itemprop="addressRegion" content="${escHtml(state)}">` : ''}
    ${country ? `<meta itemprop="addressCountry" content="${escHtml(country)}">` : ''}
  </div>`
    : '';

  const phoneMeta = phone
    ? `\n  <meta itemprop="telephone" content="${escHtml(phone)}">`
    : '';

  return `<!-- GEO Context Block — AI-Readiness / GEO SEO -->
<aside
  class="geo-context visually-hidden"
  itemscope
  itemtype="https://schema.org/LocalBusiness"
  data-ai-summary="${escHtml(defaultSummary).replace(/\n/g, ' ')}"
  style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);"
>
  <meta itemprop="name" content="${escHtml(companyName)}">
  <meta itemprop="url" content="${escHtml(websiteUrl)}">
  <meta itemprop="knowsAbout" content="${escHtml(specialty)}">${phoneMeta}${addressMeta}${geoMeta}
</aside>`
}
