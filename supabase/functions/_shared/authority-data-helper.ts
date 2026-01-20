// ═══════════════════════════════════════════════════════════
// AUTHORITY DATA HELPER - E-E-A-T, Trust Signals & GEO SEO
// Dados de autoridade invisíveis para usuários, visíveis para crawlers/IAs
// VERSÃO COMPLETA: Company Videos, Video Testimonials, SEO Context, Corporate Identity
// ═══════════════════════════════════════════════════════════

import { 
  generateVideoObjectSchema, 
  extractYouTubeId, 
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  formatDuration,
  type VideoSchemaData 
} from './video-schema-helper.ts';

// ═══════════════════════════════════════════════════════════
// INTERFACES EXPANDIDAS
// ═══════════════════════════════════════════════════════════

export interface AuthorityData {
  // Dados básicos
  companyName: string;
  websiteUrl: string;
  
  // Parcerias e Certificações
  partnerships: Partnership[];
  areasServed: AreaServed[];
  
  // Reviews e NPS
  reviews: ReviewData[];
  npsMetrics: NPSMetrics | null;
  
  // Liderança
  founder: FounderData | null;
  
  // Social Tags
  socialTags: SocialTags;
  
  // ✅ NOVOS - Perfis Sociais Completos
  socialProfiles: SocialProfiles;
  
  // ✅ NOVOS - Vídeos da Empresa
  companyVideos: CompanyVideos;
  
  // ✅ NOVOS - Identidade Corporativa
  corporateIdentity: CorporateIdentity;
  
  // ✅ NOVOS - Contexto SEO Estratégico
  seoContext: SEOContext;
}

export interface Partnership {
  label: string;
  url: string;
  description?: string;
  country?: string;
  category?: string;
  partnership_type?: string;
  since_year?: number;
  relevance?: number;
}

export interface AreaServed {
  name: string;
  type: 'Country' | 'State' | 'City' | 'Region';
}

export interface ReviewData {
  author_name: string;
  rating: number;
  review_text?: string;
  review_date?: string;
  author_photo?: string;
  source?: string;
}

export interface NPSMetrics {
  nps_score?: number;
  satisfaction_score?: number;
  total_responses?: number;
  promoters_count?: number;
  detractors_count?: number;
  last_updated?: string;
}

export interface FounderData {
  name: string;
  title?: string;
  linkedin?: string;
}

export interface SocialTags {
  hashtags: string[];
  handles: string[];
  youtubeTags: string[];
}

// ✅ NOVO - Perfis Sociais Completos
export interface SocialProfiles {
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  website: string;
  socialLinks: SocialLink[];
}

export interface SocialLink {
  platform: string;
  url: string;
  icon_alt?: string;
}

// ✅ NOVO - Vídeos da Empresa
export interface CompanyVideos {
  youtube: CompanyVideo[];
  instagram: CompanyVideo[];
  technical: CompanyVideo[];
  testimonial: CompanyVideo[];
}

export interface CompanyVideo {
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
}

// ✅ NOVO - Identidade Corporativa
export interface CorporateIdentity {
  brandValues?: string;
  missionStatement?: string;
  visionStatement?: string;
  differentiators?: string;
  workingMethodology?: string;
  companyCulture?: string;
  companyDescription?: string;
}

// ✅ NOVO - Contexto SEO Estratégico
export interface SEOContext {
  keywords: string[];
  serviceAreas?: string;
  technicalExpertise?: string;
  competitiveAdvantages?: string;
  marketPositioning?: string;
}

// ✅ NOVO - Video Testimonial
export interface VideoTestimonial {
  id: string;
  client_name: string;
  youtube_url?: string;
  testimonial_text?: string;
  created_at?: string;
  profession?: string;
  city?: string;
  rating?: number;
}

// ═══════════════════════════════════════════════════════════
// FETCH AUTHORITY DATA - VERSÃO COMPLETA
// ═══════════════════════════════════════════════════════════

export async function fetchAuthorityData(supabase: any): Promise<AuthorityData | null> {
  try {
    const { data: companyProfile, error } = await supabase
      .from('company_profile')
      .select(`
        company_name, website_url, company_description,
        institutional_links, areas_served, company_reviews, nps_metrics,
        founder_name, founder_title, founder_linkedin,
        social_media_hashtags, social_media_handles, youtube_tags,
        instagram_profile, youtube_channel, social_media_links,
        company_videos,
        brand_values, mission_statement, vision_statement,
        differentiators, working_methodology, company_culture,
        seo_context_keywords, seo_service_areas, seo_technical_expertise,
        seo_competitive_advantages, seo_market_positioning
      `)
      .limit(1)
      .single();
    
    if (error || !companyProfile) {
      console.warn('⚠️ [Authority] Não foi possível carregar company_profile:', error?.message);
      return null;
    }

    // Processar parcerias internacionais
    const partnerships: Partnership[] = [];
    if (Array.isArray(companyProfile.institutional_links)) {
      companyProfile.institutional_links.forEach((link: any) => {
        if (link.category === 'international_partnership' || 
            link.category === 'certification' ||
            link.category === 'partner') {
          partnerships.push({
            label: link.label || link.name,
            url: link.url,
            description: link.description,
            country: link.country,
            category: link.category,
            partnership_type: link.partnership_type || link.type,
            since_year: link.since_year,
            relevance: link.relevance || 50
          });
        }
      });
    }

    // Processar áreas de atuação
    const areasServed: AreaServed[] = [];
    if (Array.isArray(companyProfile.areas_served)) {
      companyProfile.areas_served.forEach((area: any) => {
        areasServed.push({
          name: typeof area === 'string' ? area : (area.name || area.label),
          type: area.type || 'Country'
        });
      });
    }

    // Processar reviews
    const reviews: ReviewData[] = [];
    const companyReviews = companyProfile.company_reviews;
    if (companyReviews) {
      if (Array.isArray(companyReviews.manual_reviews)) {
        companyReviews.manual_reviews.forEach((r: any) => {
          if (r.approved !== false) {
            reviews.push({
              author_name: r.author_name || r.name,
              rating: r.rating || 5,
              review_text: r.review_text || r.text,
              review_date: r.created_at || r.date,
              author_photo: r.photo_url || r.author_photo,
              source: 'manual'
            });
          }
        });
      }
      if (Array.isArray(companyReviews.google_reviews)) {
        companyReviews.google_reviews.forEach((r: any) => {
          reviews.push({
            author_name: r.author_name || r.name,
            rating: r.rating || 5,
            review_text: r.text || r.review_text,
            review_date: r.time || r.date,
            author_photo: r.profile_photo_url,
            source: 'google'
          });
        });
      }
    }

    // NPS Metrics
    const npsMetrics: NPSMetrics | null = companyProfile.nps_metrics ? {
      nps_score: companyProfile.nps_metrics.nps_score,
      satisfaction_score: companyProfile.nps_metrics.satisfaction_score,
      total_responses: companyProfile.nps_metrics.total_responses,
      promoters_count: companyProfile.nps_metrics.promoters_count,
      detractors_count: companyProfile.nps_metrics.detractors_count,
      last_updated: companyProfile.nps_metrics.last_updated
    } : null;

    // Founder data
    const founder: FounderData | null = companyProfile.founder_name ? {
      name: companyProfile.founder_name,
      title: companyProfile.founder_title,
      linkedin: companyProfile.founder_linkedin
    } : null;

    // Social tags
    const socialTags: SocialTags = {
      hashtags: Array.isArray(companyProfile.social_media_hashtags) ? companyProfile.social_media_hashtags : [],
      handles: Array.isArray(companyProfile.social_media_handles) ? companyProfile.social_media_handles : [],
      youtubeTags: Array.isArray(companyProfile.youtube_tags) ? companyProfile.youtube_tags : []
    };

    // ✅ NOVO - Perfis Sociais Completos
    const socialLinks: SocialLink[] = [];
    if (Array.isArray(companyProfile.social_media_links)) {
      companyProfile.social_media_links.forEach((link: any) => {
        if (link.url || link.href) {
          socialLinks.push({
            platform: link.platform || link.name || 'link',
            url: link.url || link.href,
            icon_alt: link.icon_alt || link.label
          });
        }
      });
    }

    const socialProfiles: SocialProfiles = {
      instagram: companyProfile.instagram_profile || undefined,
      youtube: companyProfile.youtube_channel || undefined,
      linkedin: companyProfile.founder_linkedin || undefined,
      website: companyProfile.website_url || '',
      socialLinks
    };

    // ✅ NOVO - Vídeos da Empresa
    const companyVideosRaw = companyProfile.company_videos || {};
    const companyVideos: CompanyVideos = {
      youtube: Array.isArray(companyVideosRaw.youtube_videos) ? companyVideosRaw.youtube_videos.map((v: any) => ({
        url: v.url || v.embed_url,
        title: v.title || v.name,
        description: v.description,
        thumbnail: v.thumbnail,
        duration: v.duration || v.duration_seconds
      })) : [],
      instagram: Array.isArray(companyVideosRaw.instagram_videos) ? companyVideosRaw.instagram_videos.map((v: any) => ({
        url: v.url || v.embed_url,
        title: v.title || v.caption,
        description: v.description || v.caption,
        thumbnail: v.thumbnail
      })) : [],
      technical: Array.isArray(companyVideosRaw.technical_videos) ? companyVideosRaw.technical_videos.map((v: any) => ({
        url: v.url || v.embed_url,
        title: v.title || v.name,
        description: v.description,
        thumbnail: v.thumbnail,
        duration: v.duration || v.duration_seconds
      })) : [],
      testimonial: Array.isArray(companyVideosRaw.testimonial_videos) ? companyVideosRaw.testimonial_videos.map((v: any) => ({
        url: v.url || v.embed_url,
        title: v.title || v.client_name,
        description: v.description || v.testimonial_text,
        thumbnail: v.thumbnail
      })) : []
    };

    // ✅ NOVO - Identidade Corporativa
    const corporateIdentity: CorporateIdentity = {
      brandValues: companyProfile.brand_values || undefined,
      missionStatement: companyProfile.mission_statement || undefined,
      visionStatement: companyProfile.vision_statement || undefined,
      differentiators: companyProfile.differentiators || undefined,
      workingMethodology: companyProfile.working_methodology || undefined,
      companyCulture: companyProfile.company_culture || undefined,
      companyDescription: companyProfile.company_description || undefined
    };

    // ✅ NOVO - Contexto SEO Estratégico
    const seoKeywords = Array.isArray(companyProfile.seo_context_keywords) 
      ? companyProfile.seo_context_keywords 
      : [];
    
    const seoContext: SEOContext = {
      keywords: seoKeywords,
      serviceAreas: companyProfile.seo_service_areas || undefined,
      technicalExpertise: companyProfile.seo_technical_expertise || undefined,
      competitiveAdvantages: companyProfile.seo_competitive_advantages || undefined,
      marketPositioning: companyProfile.seo_market_positioning || undefined
    };

    const totalVideos = companyVideos.youtube.length + companyVideos.instagram.length + 
                        companyVideos.technical.length + companyVideos.testimonial.length;
    
    console.log(`✅ [Authority] Dados COMPLETOS carregados: ${partnerships.length} parceiros, ${areasServed.length} áreas, ${reviews.length} reviews, ${totalVideos} vídeos`);

    return {
      partnerships,
      areasServed,
      reviews,
      npsMetrics,
      founder,
      socialTags,
      socialProfiles,
      companyVideos,
      corporateIdentity,
      seoContext,
      companyName: companyProfile.company_name,
      websiteUrl: companyProfile.website_url
    };
  } catch (err) {
    console.error('❌ [Authority] Erro ao buscar dados:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// FETCH VIDEO TESTIMONIALS
// ═══════════════════════════════════════════════════════════

export async function fetchVideoTestimonials(supabase: any, limit: number = 20): Promise<VideoTestimonial[]> {
  try {
    const { data, error } = await supabase
      .from('video_testimonials')
      .select('id, client_name, youtube_url, testimonial_text, created_at, profession, city, rating')
      .eq('approved', true)
      .not('youtube_url', 'is', null)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) {
      console.warn('⚠️ [Authority] Erro ao buscar video_testimonials:', error?.message);
      return [];
    }
    
    console.log(`✅ [Authority] ${data.length} video testimonials carregados`);
    return data;
  } catch (err) {
    console.error('❌ [Authority] Erro ao buscar video testimonials:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// SCHEMA.ORG GENERATORS
// ═══════════════════════════════════════════════════════════

export function generateMemberOfSchema(partnerships: Partnership[]): any[] {
  return partnerships
    .filter(p => p.category === 'international_partnership' || p.category === 'certification')
    .slice(0, 10)
    .map(p => ({
      "@type": p.partnership_type === 'certification' ? 'GovernmentOrganization' : 'Organization',
      "name": p.label,
      "url": p.url,
      ...(p.description && { "description": p.description.substring(0, 200) }),
      ...(p.country && { "address": { "@type": "PostalAddress", "addressCountry": p.country } })
    }));
}

export function generateFounderSchema(founder: FounderData | null): any | null {
  if (!founder) return null;
  return {
    "@type": "Person",
    "name": founder.name,
    ...(founder.title && { "jobTitle": founder.title }),
    ...(founder.linkedin && { "sameAs": founder.linkedin })
  };
}

export function generateAreaServedSchema(areas: AreaServed[]): any[] {
  return areas.slice(0, 20).map(area => ({
    "@type": area.type === 'Country' ? 'Country' : 'Place',
    "name": area.name
  }));
}

export function generateReviewsSchema(reviews: ReviewData[], maxReviews: number = 5): any[] {
  return reviews
    .filter(r => r.rating >= 4 && r.review_text)
    .slice(0, maxReviews)
    .map(r => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": r.author_name,
        ...(r.author_photo && { "image": r.author_photo })
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating,
        "bestRating": 5
      },
      "reviewBody": r.review_text?.substring(0, 300),
      ...(r.review_date && { "datePublished": r.review_date })
    }));
}

// ✅ NOVO - Gerar sameAs para Schema.org
export function generateSameAsSchema(authority: AuthorityData): string[] {
  const sameAs: string[] = [];
  const { socialProfiles, founder } = authority;
  
  if (socialProfiles.instagram) sameAs.push(socialProfiles.instagram);
  if (socialProfiles.youtube) sameAs.push(socialProfiles.youtube);
  if (socialProfiles.facebook) sameAs.push(socialProfiles.facebook);
  if (socialProfiles.twitter) sameAs.push(socialProfiles.twitter);
  if (socialProfiles.tiktok) sameAs.push(socialProfiles.tiktok);
  if (founder?.linkedin) sameAs.push(founder.linkedin);
  
  // Adicionar links sociais adicionais
  socialProfiles.socialLinks.forEach(link => {
    if (link.url && !sameAs.includes(link.url)) {
      sameAs.push(link.url);
    }
  });
  
  return sameAs;
}

// ✅ NOVO - Gerar VideoObject Schemas dos vídeos da empresa
export function generateCompanyVideoSchemas(
  companyVideos: CompanyVideos,
  companyName: string,
  websiteUrl: string,
  maxVideos: number = 15
): any[] {
  const schemas: any[] = [];
  
  // ✅ Defensive: Ensure arrays exist before spreading
  const youtubeVideos = Array.isArray(companyVideos?.youtube) ? companyVideos.youtube : [];
  const technicalVideos = Array.isArray(companyVideos?.technical) ? companyVideos.technical : [];
  const testimonialVideos = Array.isArray(companyVideos?.testimonial) ? companyVideos.testimonial : [];
  const instagramVideos = Array.isArray(companyVideos?.instagram) ? companyVideos.instagram : [];
  
  const allVideos: CompanyVideo[] = [
    ...youtubeVideos,
    ...technicalVideos,
    ...testimonialVideos,
    ...instagramVideos
  ].slice(0, maxVideos);
  
  for (const video of allVideos) {
    if (!video.url) continue;
    
    const videoId = extractYouTubeId(video.url);
    if (!videoId) continue;
    
    const videoData: VideoSchemaData = {
      name: video.title || `Vídeo ${companyName}`,
      description: video.description || video.title || companyName,
      thumbnailUrl: video.thumbnail || getYouTubeThumbnail(videoId),
      uploadDate: new Date().toISOString(),
      duration: video.duration,
      contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: getYouTubeEmbedUrl(videoId)
    };
    
    schemas.push(generateVideoObjectSchema(videoData, {
      includeCreator: true,
      creatorName: companyName,
      creatorUrl: websiteUrl
    }));
  }
  
  return schemas;
}

// ✅ NOVO - Gerar VideoObject Schemas dos video testimonials
export function generateVideoTestimonialSchemas(
  testimonials: VideoTestimonial[],
  companyName: string,
  websiteUrl: string,
  maxVideos: number = 20
): any[] {
  const schemas: any[] = [];
  
  for (const testimonial of testimonials.slice(0, maxVideos)) {
    if (!testimonial.youtube_url) continue;
    
    const videoId = extractYouTubeId(testimonial.youtube_url);
    if (!videoId) continue;
    
    const videoData: VideoSchemaData = {
      name: `Depoimento: ${testimonial.client_name}${testimonial.profession ? ` - ${testimonial.profession}` : ''}`,
      description: testimonial.testimonial_text?.substring(0, 200) || `Depoimento de ${testimonial.client_name} sobre ${companyName}`,
      thumbnailUrl: getYouTubeThumbnail(videoId),
      uploadDate: testimonial.created_at || new Date().toISOString(),
      contentUrl: testimonial.youtube_url,
      embedUrl: getYouTubeEmbedUrl(videoId)
    };
    
    schemas.push(generateVideoObjectSchema(videoData, {
      includeCreator: true,
      creatorName: companyName,
      creatorUrl: websiteUrl
    }));
  }
  
  return schemas;
}

// ✅ NOVO - Gerar ItemList de vídeos para Video Carousel
// Aceita AuthorityData OU CompanyVideos como primeiro parâmetro
export function generateVideoGallerySchema(
  authorityOrVideos: AuthorityData | CompanyVideos | null | undefined,
  testimonials: VideoTestimonial[] = [],
  options?: { galleryName?: string; maxVideos?: number } | string  // string for backwards compatibility (companyName)
): any | null {
  const items: any[] = [];
  let position = 1;
  
  // Determinar companyName e limites
  let companyName = 'Empresa';
  let maxPerType = 5;
  
  if (typeof options === 'string') {
    // Backwards compatibility: options é companyName
    companyName = options;
  } else if (options) {
    companyName = options.galleryName?.replace('Video Library - ', '') || 'Empresa';
    maxPerType = Math.floor((options.maxVideos || 25) / 4); // Dividir entre 4 tipos
  }
  
  // ✅ DEFENSIVE: Extrair companyVideos de AuthorityData ou usar diretamente
  let companyVideos: CompanyVideos | null = null;
  
  if (!authorityOrVideos) {
    // Se nulo/undefined, retornar null (sem vídeos)
    console.warn('⚠️ [VideoGallerySchema] authorityOrVideos é undefined');
    companyVideos = null;
  } else if ('companyVideos' in authorityOrVideos && authorityOrVideos.companyVideos) {
    // É AuthorityData
    companyVideos = authorityOrVideos.companyVideos;
    companyName = (authorityOrVideos as AuthorityData).companyName || companyName;
  } else if ('youtube' in authorityOrVideos || 'technical' in authorityOrVideos) {
    // É CompanyVideos diretamente
    companyVideos = authorityOrVideos as CompanyVideos;
  }
  
  // ✅ DEFENSIVE: Garantir arrays existem
  const youtubeVideos = Array.isArray(companyVideos?.youtube) ? companyVideos.youtube : [];
  const technicalVideos = Array.isArray(companyVideos?.technical) ? companyVideos.technical : [];
  const testimonialVideosCompany = Array.isArray(companyVideos?.testimonial) ? companyVideos.testimonial : [];
  const instagramVideos = Array.isArray(companyVideos?.instagram) ? companyVideos.instagram : [];
  
  // Adicionar vídeos do YouTube da empresa
  for (const video of youtubeVideos.slice(0, maxPerType)) {
    if (!video.url) continue;
    const videoId = extractYouTubeId(video.url);
    if (!videoId) continue;
    
    items.push({
      "@type": "ListItem",
      "position": position++,
      "item": {
        "@type": "VideoObject",
        "name": video.title || `Vídeo ${companyName}`,
        "thumbnailUrl": video.thumbnail || getYouTubeThumbnail(videoId),
        "contentUrl": video.url
      }
    });
  }
  
  // Adicionar vídeos técnicos
  for (const video of technicalVideos.slice(0, maxPerType)) {
    if (!video.url) continue;
    const videoId = extractYouTubeId(video.url);
    if (!videoId) continue;
    
    items.push({
      "@type": "ListItem",
      "position": position++,
      "item": {
        "@type": "VideoObject",
        "name": video.title || `Tutorial ${companyName}`,
        "thumbnailUrl": video.thumbnail || getYouTubeThumbnail(videoId),
        "contentUrl": video.url
      }
    });
  }
  
  // Adicionar depoimentos em vídeo (do parâmetro testimonials)
  const safeTestimonials = Array.isArray(testimonials) ? testimonials : [];
  for (const testimonial of safeTestimonials.slice(0, maxPerType)) {
    if (!testimonial.youtube_url) continue;
    const videoId = extractYouTubeId(testimonial.youtube_url);
    if (!videoId) continue;
    
    items.push({
      "@type": "ListItem",
      "position": position++,
      "item": {
        "@type": "VideoObject",
        "name": `Depoimento: ${testimonial.client_name}`,
        "thumbnailUrl": getYouTubeThumbnail(videoId),
        "contentUrl": testimonial.youtube_url
      }
    });
  }
  
  if (items.length === 0) return null;
  
  return {
    "@type": "ItemList",
    "name": `Videoteca ${companyName}`,
    "description": `Coleção de vídeos oficiais e depoimentos de clientes ${companyName}`,
    "numberOfItems": items.length,
    "itemListElement": items
  };
}

// ═══════════════════════════════════════════════════════════
// HTML CONTEXT GENERATOR - VERSÃO COMPLETA
// ═══════════════════════════════════════════════════════════

export function generateAuthorityContextHTML(
  authority: AuthorityData,
  videoTestimonials: VideoTestimonial[] = []
): string {
  const { 
    partnerships, areasServed, reviews, npsMetrics, founder, socialTags, 
    socialProfiles, companyVideos, corporateIdentity, seoContext, companyName 
  } = authority;

  // ✅ escapeHtml: para TEXTOS (escapa &, <, >, ")
  const escapeHtml = (text: string | null | undefined): string => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  // ✅ sanitizeUrl: para URLs em href (NÃO escapa & para evitar double encoding)
  const sanitizeUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    return String(url)
      .replace(/[<>"]/g, '')        // Remove apenas caracteres perigosos em atributos
      .replace(/javascript:/gi, '') // Remove javascript: protocol (XSS)
      .trim();
  };

  // ═══════════════════════════════════════════════════════════
  // SEÇÃO 1: Parcerias Internacionais
  // ═══════════════════════════════════════════════════════════
  const partnershipsHtml = partnerships.length > 0 ? `
    <section itemscope itemtype="https://schema.org/Organization">
      <h4>Parcerias Internacionais e Certificações</h4>
      <p>${escapeHtml(companyName)} mantém parcerias estratégicas com líderes globais em tecnologia odontológica:</p>
      <ul>
        ${partnerships.slice(0, 10).map(p => `
          <li itemprop="member" itemscope itemtype="https://schema.org/Organization">
            <a itemprop="url" href="${sanitizeUrl(p.url)}" rel="noopener">
              <span itemprop="name">${escapeHtml(p.label)}</span>
            </a>
            ${p.description ? `<span itemprop="description">${escapeHtml(p.description.substring(0, 100))}</span>` : ''}
            ${p.country ? `<meta itemprop="address" content="${escapeHtml(p.country)}">` : ''}
          </li>
        `).join('')}
      </ul>
    </section>
  ` : '';

  // ═══════════════════════════════════════════════════════════
  // SEÇÃO 2: Cobertura Geográfica
  // ═══════════════════════════════════════════════════════════
  const areasHtml = areasServed.length > 0 ? `
    <section>
      <h4>Cobertura Geográfica Global</h4>
      <p>${escapeHtml(companyName)} atende clientes em ${areasServed.length} regiões:</p>
      <p>${areasServed.map(a => escapeHtml(a.name)).join(', ')}</p>
    </section>
  ` : '';

  // ═══════════════════════════════════════════════════════════
  // SEÇÃO 3: Métricas NPS
  // ═══════════════════════════════════════════════════════════
  const npsHtml = npsMetrics ? `
    <section class="trust-metrics" itemscope itemtype="https://schema.org/Rating">
      <h4>Métricas de Satisfação do Cliente</h4>
      ${npsMetrics.nps_score !== undefined ? `<p>Net Promoter Score (NPS): <span itemprop="ratingValue">${npsMetrics.nps_score}</span></p>` : ''}
      ${npsMetrics.satisfaction_score !== undefined ? `<p>Taxa de Satisfação: ${npsMetrics.satisfaction_score}%</p>` : ''}
      ${npsMetrics.total_responses !== undefined ? `<p>Base de Pesquisa: ${npsMetrics.total_responses} clientes avaliaram</p>` : ''}
      ${npsMetrics.promoters_count !== undefined ? `<p>Promotores: ${npsMetrics.promoters_count} clientes recomendam ativamente</p>` : ''}
    </section>
  ` : '';

  // ═══════════════════════════════════════════════════════════
  // SEÇÃO 4: Reviews
  // ═══════════════════════════════════════════════════════════
  const reviewsHtml = reviews.length > 0 ? `
    <section itemscope itemtype="https://schema.org/Organization">
      <h4>Avaliações de Clientes Verificados</h4>
      ${reviews.slice(0, 5).map(r => `
        <article itemprop="review" itemscope itemtype="https://schema.org/Review">
          <blockquote itemprop="reviewBody">"${escapeHtml(r.review_text?.substring(0, 150))}"</blockquote>
          <cite itemprop="author" itemscope itemtype="https://schema.org/Person">
            — <span itemprop="name">${escapeHtml(r.author_name)}</span>
          </cite>
          <meta itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating" content="${r.rating}">
          ${r.source === 'google' ? '<meta itemprop="publisher" content="Google Reviews">' : ''}
        </article>
      `).join('')}
    </section>
  ` : '';

  // ═══════════════════════════════════════════════════════════
  // SEÇÃO 5: Liderança / Founder
  // ═══════════════════════════════════════════════════════════
  const founderHtml = founder ? `
    <section itemscope itemtype="https://schema.org/Person">
      <h4>Liderança</h4>
      <p>Fundador: <span itemprop="name">${escapeHtml(founder.name)}</span></p>
      ${founder.title ? `<p itemprop="jobTitle">${escapeHtml(founder.title)}</p>` : ''}
      ${founder.linkedin ? `<a itemprop="sameAs" href="${sanitizeUrl(founder.linkedin)}" rel="noopener me">LinkedIn</a>` : ''}
    </section>
  ` : '';

  // ═══════════════════════════════════════════════════════════
  // ✅ NOVO - SEÇÃO 6: Identidade Corporativa
  // ═══════════════════════════════════════════════════════════
  const hasIdentity = corporateIdentity.brandValues || corporateIdentity.missionStatement || 
                      corporateIdentity.visionStatement || corporateIdentity.differentiators;
  
  const identityHtml = hasIdentity ? `
    <section itemscope itemtype="https://schema.org/Organization">
      <h4>Identidade Corporativa ${escapeHtml(companyName)}</h4>
      ${corporateIdentity.brandValues ? `
        <div>
          <h5>Valores da Marca</h5>
          <p itemprop="ethicsPolicy">${escapeHtml(corporateIdentity.brandValues)}</p>
        </div>
      ` : ''}
      ${corporateIdentity.missionStatement ? `
        <div>
          <h5>Missão</h5>
          <p itemprop="foundingPrinciples">${escapeHtml(corporateIdentity.missionStatement)}</p>
        </div>
      ` : ''}
      ${corporateIdentity.visionStatement ? `
        <div>
          <h5>Visão</h5>
          <p>${escapeHtml(corporateIdentity.visionStatement)}</p>
        </div>
      ` : ''}
      ${corporateIdentity.differentiators ? `
        <div>
          <h5>Diferenciais</h5>
          <p>${escapeHtml(corporateIdentity.differentiators)}</p>
        </div>
      ` : ''}
      ${corporateIdentity.workingMethodology ? `
        <div>
          <h5>Metodologia de Trabalho</h5>
          <p>${escapeHtml(corporateIdentity.workingMethodology)}</p>
        </div>
      ` : ''}
    </section>
  ` : '';

  // ═══════════════════════════════════════════════════════════
  // ✅ NOVO - SEÇÃO 7: Expertise SEO
  // ═══════════════════════════════════════════════════════════
  const hasSeoContext = seoContext.technicalExpertise || seoContext.competitiveAdvantages || 
                        seoContext.marketPositioning || seoContext.serviceAreas;
  
  const seoContextHtml = hasSeoContext ? `
    <section>
      <h4>Expertise e Posicionamento ${escapeHtml(companyName)}</h4>
      ${seoContext.technicalExpertise ? `
        <div itemprop="knowsAbout">
          <h5>Expertise Técnica</h5>
          <p>${escapeHtml(seoContext.technicalExpertise)}</p>
        </div>
      ` : ''}
      ${seoContext.competitiveAdvantages ? `
        <div>
          <h5>Vantagens Competitivas</h5>
          <p>${escapeHtml(seoContext.competitiveAdvantages)}</p>
        </div>
      ` : ''}
      ${seoContext.marketPositioning ? `
        <div itemprop="makesOffer">
          <h5>Posicionamento de Mercado</h5>
          <p>${escapeHtml(seoContext.marketPositioning)}</p>
        </div>
      ` : ''}
      ${seoContext.serviceAreas ? `
        <div>
          <h5>Áreas de Serviço</h5>
          <p>${escapeHtml(seoContext.serviceAreas)}</p>
        </div>
      ` : ''}
      ${seoContext.keywords.length > 0 ? `
        <div>
          <h5>Palavras-chave de Contexto</h5>
          <p>${seoContext.keywords.map(k => escapeHtml(k)).join(', ')}</p>
        </div>
      ` : ''}
    </section>
  ` : '';

  // ═══════════════════════════════════════════════════════════
  // ✅ NOVO - SEÇÃO 8: Videoteca da Empresa
  // ═══════════════════════════════════════════════════════════
  const allCompanyVideos = [
    ...companyVideos.youtube,
    ...companyVideos.technical,
    ...companyVideos.testimonial
  ].filter(v => v.url);
  
  const videosHtml = allCompanyVideos.length > 0 ? `
    <section itemscope itemtype="https://schema.org/VideoGallery">
      <h4>Videoteca Oficial ${escapeHtml(companyName)}</h4>
      <p>${allCompanyVideos.length} vídeos oficiais disponíveis:</p>
      <ul>
        ${allCompanyVideos.slice(0, 15).map(v => `
          <li>
            <a href="${sanitizeUrl(v.url)}" rel="noopener" itemprop="video">${escapeHtml(v.title || 'Vídeo')}</a>
            ${v.description ? `<span>${escapeHtml(v.description.substring(0, 80))}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    </section>
  ` : '';

  // ═══════════════════════════════════════════════════════════
  // ✅ NOVO - SEÇÃO 9: Depoimentos em Vídeo
  // ═══════════════════════════════════════════════════════════
  const testimonialsHtml = videoTestimonials.length > 0 ? `
    <section>
      <h4>${videoTestimonials.length} Depoimentos em Vídeo de Clientes</h4>
      <p>Clientes reais compartilham suas experiências com ${escapeHtml(companyName)}:</p>
      <ul>
        ${videoTestimonials.slice(0, 20).map(t => `
          <li itemscope itemtype="https://schema.org/Review">
            <a href="${sanitizeUrl(t.youtube_url)}" rel="noopener" itemprop="video">
              <span itemprop="author">${escapeHtml(t.client_name)}</span>
              ${t.profession ? `- ${escapeHtml(t.profession)}` : ''}
              ${t.city ? `(${escapeHtml(t.city)})` : ''}
            </a>
            ${t.testimonial_text ? `<blockquote itemprop="reviewBody">${escapeHtml(t.testimonial_text.substring(0, 100))}...</blockquote>` : ''}
          </li>
        `).join('')}
      </ul>
    </section>
  ` : '';

  // ═══════════════════════════════════════════════════════════
  // ✅ NOVO - SEÇÃO 10: Redes Sociais Oficiais
  // ═══════════════════════════════════════════════════════════
  const hasSocialProfiles = socialProfiles.instagram || socialProfiles.youtube || 
                            socialProfiles.linkedin || socialProfiles.socialLinks.length > 0;
  
  const socialHtml = hasSocialProfiles ? `
    <section>
      <h4>Canais Oficiais ${escapeHtml(companyName)}</h4>
      <ul>
        ${socialProfiles.youtube ? `<li><a href="${sanitizeUrl(socialProfiles.youtube)}" rel="me noopener" title="YouTube Oficial">YouTube Oficial</a></li>` : ''}
        ${socialProfiles.instagram ? `<li><a href="${sanitizeUrl(socialProfiles.instagram)}" rel="me noopener" title="Instagram Oficial">Instagram Oficial</a></li>` : ''}
        ${socialProfiles.linkedin ? `<li><a href="${sanitizeUrl(socialProfiles.linkedin)}" rel="me noopener" title="LinkedIn">LinkedIn</a></li>` : ''}
        ${socialProfiles.facebook ? `<li><a href="${sanitizeUrl(socialProfiles.facebook)}" rel="me noopener" title="Facebook">Facebook</a></li>` : ''}
        ${socialProfiles.socialLinks.map(link => `
          <li><a href="${sanitizeUrl(link.url)}" rel="me noopener" title="${escapeHtml(link.icon_alt || link.platform)}">${escapeHtml(link.platform)}</a></li>
        `).join('')}
      </ul>
      ${socialTags.handles.length > 0 ? `<p>Handles: ${socialTags.handles.map(h => escapeHtml(h)).join(' ')}</p>` : ''}
      ${socialTags.hashtags.length > 0 ? `<p>Hashtags Oficiais: ${socialTags.hashtags.map(h => escapeHtml(h)).join(' ')}</p>` : ''}
    </section>
  ` : '';

  // Combinar tudo
  const hasContent = partnershipsHtml || areasHtml || npsHtml || reviewsHtml || 
                     founderHtml || identityHtml || seoContextHtml || videosHtml || 
                     testimonialsHtml || socialHtml;
  
  if (!hasContent) return '';

  return `
<!-- ═══════════════════════════════════════════════════════════ -->
<!-- AUTHORITY CONTEXT - E-E-A-T Signals (Hidden from Users) -->
<!-- Visible to Search Engine Crawlers and Generative AI -->
<!-- Version: COMPLETE with Videos, Identity, SEO Context -->
<!-- ═══════════════════════════════════════════════════════════ -->
<aside class="authority-context" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
  <header>
    <h3>Sobre ${escapeHtml(companyName)} - Autoridade em Odontologia Digital</h3>
  </header>
  ${identityHtml}
  ${seoContextHtml}
  ${partnershipsHtml}
  ${areasHtml}
  ${npsHtml}
  ${reviewsHtml}
  ${founderHtml}
  ${videosHtml}
  ${testimonialsHtml}
  ${socialHtml}
</aside>
`;
}

// ═══════════════════════════════════════════════════════════
// META TAGS GENERATOR - VERSÃO COMPLETA
// ═══════════════════════════════════════════════════════════

export function generateAuthorityMetaTags(authority: AuthorityData): string {
  const { partnerships, areasServed, socialTags, founder, socialProfiles, seoContext, corporateIdentity } = authority;
  
  const tags: string[] = [];

  // Cobertura geográfica
  if (areasServed.length > 0) {
    tags.push(`<meta name="geo.coverage" content="${areasServed.map(a => a.name).join(', ')}">`);
  }

  // Parcerias
  if (partnerships.length > 0) {
    tags.push(`<meta name="organization.partnerships" content="${partnerships.slice(0, 10).map(p => p.label).join(', ')}">`);
  }

  // Social hashtags
  if (socialTags.hashtags.length > 0) {
    tags.push(`<meta name="social.hashtags" content="${socialTags.hashtags.join(' ')}">`);
  }

  // Founder
  if (founder) {
    tags.push(`<meta name="organization.founder" content="${founder.name}">`);
  }

  // ✅ NOVO - Twitter/X tags
  if (socialTags.handles.length > 0) {
    const twitterHandle = socialTags.handles.find(h => h.startsWith('@')) || socialTags.handles[0];
    if (twitterHandle) {
      tags.push(`<meta name="twitter:site" content="${twitterHandle}">`);
      tags.push(`<meta name="twitter:creator" content="${twitterHandle}">`);
    }
  }

  // ✅ NOVO - Facebook/Instagram publisher
  if (socialProfiles.instagram) {
    tags.push(`<meta property="article:publisher" content="${socialProfiles.instagram}">`);
  }

  // ✅ NOVO - SEO Context meta tags
  if (seoContext.technicalExpertise) {
    tags.push(`<meta name="expertise" content="${seoContext.technicalExpertise.substring(0, 200)}">`);
  }
  if (seoContext.competitiveAdvantages) {
    tags.push(`<meta name="competitive-advantages" content="${seoContext.competitiveAdvantages.substring(0, 200)}">`);
  }
  if (seoContext.keywords.length > 0) {
    tags.push(`<meta name="context-keywords" content="${seoContext.keywords.slice(0, 20).join(', ')}">`);
  }

  // ✅ NOVO - Brand identity
  if (corporateIdentity.brandValues) {
    tags.push(`<meta name="brand-values" content="${corporateIdentity.brandValues.substring(0, 200)}">`);
  }

  return tags.join('\n    ');
}

// ═══════════════════════════════════════════════════════════
// ENRICH ORGANIZATION SCHEMA - VERSÃO COMPLETA
// ═══════════════════════════════════════════════════════════

export function enrichOrganizationSchema(
  baseSchema: any,
  authority: AuthorityData
): any {
  const enriched = { ...baseSchema };

  // memberOf - Parcerias internacionais
  const memberOf = generateMemberOfSchema(authority.partnerships);
  if (memberOf.length > 0) {
    enriched.memberOf = memberOf;
  }

  // founder
  const founderSchema = generateFounderSchema(authority.founder);
  if (founderSchema) {
    enriched.founder = founderSchema;
  }

  // areaServed
  const areaServed = generateAreaServedSchema(authority.areasServed);
  if (areaServed.length > 0) {
    enriched.areaServed = areaServed;
  }

  // ✅ NOVO - sameAs (redes sociais)
  const sameAs = generateSameAsSchema(authority);
  if (sameAs.length > 0) {
    enriched.sameAs = sameAs;
  }

  // ✅ NOVO - knowsAbout (expertise)
  const knowsAbout: string[] = [];
  if (authority.seoContext.technicalExpertise) {
    knowsAbout.push(authority.seoContext.technicalExpertise);
  }
  authority.seoContext.keywords.slice(0, 10).forEach(k => knowsAbout.push(k));
  if (knowsAbout.length === 0) {
    knowsAbout.push(
      "Odontologia Digital",
      "Scanner Intraoral",
      "Impressora 3D Odontológica", 
      "CAD/CAM Dental",
      "Prótese Digital",
      "Fluxo Digital Odontológico"
    );
  }
  enriched.knowsAbout = knowsAbout;

  // ✅ NOVO - ethicsPolicy (brand values)
  if (authority.corporateIdentity.brandValues) {
    enriched.ethicsPolicy = authority.corporateIdentity.brandValues;
  }

  // ✅ NOVO - foundingPrinciples (mission)
  if (authority.corporateIdentity.missionStatement) {
    enriched.foundingPrinciples = authority.corporateIdentity.missionStatement;
  }

  // ✅ NOVO - slogan (diferenciadores resumidos)
  if (authority.corporateIdentity.differentiators) {
    enriched.slogan = authority.corporateIdentity.differentiators.substring(0, 100);
  }

  return enriched;
}

// ═══════════════════════════════════════════════════════════
// ENRICH PRODUCT SCHEMA
// ═══════════════════════════════════════════════════════════

export function enrichProductSchema(
  baseSchema: any,
  authority: AuthorityData
): any {
  const enriched = { ...baseSchema };

  // Adicionar reviews individuais
  const reviews = generateReviewsSchema(authority.reviews, 5);
  if (reviews.length > 0) {
    enriched.review = reviews;
  }

  return enriched;
}
