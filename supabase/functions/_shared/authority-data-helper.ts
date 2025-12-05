// ═══════════════════════════════════════════════════════════
// AUTHORITY DATA HELPER - E-E-A-T, Trust Signals & GEO SEO
// Dados de autoridade invisíveis para usuários, visíveis para crawlers/IAs
// ═══════════════════════════════════════════════════════════

export interface AuthorityData {
  partnerships: Partnership[];
  areasServed: AreaServed[];
  reviews: ReviewData[];
  npsMetrics: NPSMetrics | null;
  founder: FounderData | null;
  socialTags: SocialTags;
  companyName: string;
  websiteUrl: string;
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

/**
 * Busca todos os dados de autoridade do company_profile
 */
export async function fetchAuthorityData(supabase: any): Promise<AuthorityData | null> {
  try {
    const { data: companyProfile, error } = await supabase
      .from('company_profile')
      .select(`
        company_name, website_url,
        institutional_links, areas_served, company_reviews, nps_metrics,
        founder_name, founder_title, founder_linkedin,
        social_media_hashtags, social_media_handles, youtube_tags
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
      // Reviews manuais
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
      // Reviews do Google importados
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

    console.log(`✅ [Authority] Dados carregados: ${partnerships.length} parceiros, ${areasServed.length} áreas, ${reviews.length} reviews`);

    return {
      partnerships,
      areasServed,
      reviews,
      npsMetrics,
      founder,
      socialTags,
      companyName: companyProfile.company_name,
      websiteUrl: companyProfile.website_url
    };
  } catch (err) {
    console.error('❌ [Authority] Erro ao buscar dados:', err);
    return null;
  }
}

/**
 * Gera Schema.org memberOf para parcerias internacionais
 */
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

/**
 * Gera Schema.org founder
 */
export function generateFounderSchema(founder: FounderData | null): any | null {
  if (!founder) return null;
  return {
    "@type": "Person",
    "name": founder.name,
    ...(founder.title && { "jobTitle": founder.title }),
    ...(founder.linkedin && { "sameAs": founder.linkedin })
  };
}

/**
 * Gera Schema.org areaServed
 */
export function generateAreaServedSchema(areas: AreaServed[]): any[] {
  return areas.slice(0, 20).map(area => ({
    "@type": area.type === 'Country' ? 'Country' : 'Place',
    "name": area.name
  }));
}

/**
 * Gera Schema.org Review array para Product/LocalBusiness
 */
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

/**
 * Gera HTML de contexto de autoridade (invisível para usuários)
 * Visível para crawlers e IAs generativas
 */
export function generateAuthorityContextHTML(authority: AuthorityData): string {
  const { partnerships, areasServed, reviews, npsMetrics, founder, socialTags, companyName } = authority;

  // Escape HTML helper
  const escapeHtml = (text: string | null | undefined): string => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const partnershipsHtml = partnerships.length > 0 ? `
    <section itemscope itemtype="https://schema.org/Organization">
      <h4>Parcerias Internacionais e Certificações</h4>
      <p>${escapeHtml(companyName)} mantém parcerias estratégicas com líderes globais em tecnologia odontológica:</p>
      <ul>
        ${partnerships.slice(0, 10).map(p => `
          <li itemprop="member" itemscope itemtype="https://schema.org/Organization">
            <a itemprop="url" href="${escapeHtml(p.url)}" rel="noopener">
              <span itemprop="name">${escapeHtml(p.label)}</span>
            </a>
            ${p.description ? `<span itemprop="description">${escapeHtml(p.description.substring(0, 100))}</span>` : ''}
            ${p.country ? `<meta itemprop="address" content="${escapeHtml(p.country)}">` : ''}
            ${p.since_year ? `<meta itemprop="foundingDate" content="${p.since_year}">` : ''}
          </li>
        `).join('')}
      </ul>
    </section>
  ` : '';

  const areasHtml = areasServed.length > 0 ? `
    <section>
      <h4>Cobertura Geográfica Global</h4>
      <p>${escapeHtml(companyName)} atende clientes em ${areasServed.length} regiões:</p>
      <p>${areasServed.map(a => escapeHtml(a.name)).join(', ')}</p>
    </section>
  ` : '';

  const npsHtml = npsMetrics ? `
    <section class="trust-metrics" itemscope itemtype="https://schema.org/Rating">
      <h4>Métricas de Satisfação do Cliente</h4>
      ${npsMetrics.nps_score !== undefined ? `<p>Net Promoter Score (NPS): <span itemprop="ratingValue">${npsMetrics.nps_score}</span></p>` : ''}
      ${npsMetrics.satisfaction_score !== undefined ? `<p>Taxa de Satisfação: ${npsMetrics.satisfaction_score}%</p>` : ''}
      ${npsMetrics.total_responses !== undefined ? `<p>Base de Pesquisa: ${npsMetrics.total_responses} clientes avaliaram</p>` : ''}
      ${npsMetrics.promoters_count !== undefined ? `<p>Promotores: ${npsMetrics.promoters_count} clientes recomendam ativamente</p>` : ''}
    </section>
  ` : '';

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

  const founderHtml = founder ? `
    <section itemscope itemtype="https://schema.org/Person">
      <h4>Liderança</h4>
      <p>Fundador: <span itemprop="name">${escapeHtml(founder.name)}</span></p>
      ${founder.title ? `<p itemprop="jobTitle">${escapeHtml(founder.title)}</p>` : ''}
      ${founder.linkedin ? `<a itemprop="sameAs" href="${escapeHtml(founder.linkedin)}" rel="noopener">LinkedIn</a>` : ''}
    </section>
  ` : '';

  const socialHtml = (socialTags.hashtags.length > 0 || socialTags.handles.length > 0) ? `
    <section>
      <h4>Presença Digital</h4>
      ${socialTags.handles.length > 0 ? `<p>Redes Sociais: ${socialTags.handles.map(h => escapeHtml(h)).join(' ')}</p>` : ''}
      ${socialTags.hashtags.length > 0 ? `<p>Hashtags Oficiais: ${socialTags.hashtags.map(h => escapeHtml(h)).join(' ')}</p>` : ''}
    </section>
  ` : '';

  // Combinar tudo em um aside invisível
  const hasContent = partnershipsHtml || areasHtml || npsHtml || reviewsHtml || founderHtml || socialHtml;
  
  if (!hasContent) return '';

  return `
<!-- ═══════════════════════════════════════════════════════════ -->
<!-- AUTHORITY CONTEXT - E-E-A-T Signals (Hidden from Users) -->
<!-- Visible to Search Engine Crawlers and Generative AI -->
<!-- ═══════════════════════════════════════════════════════════ -->
<aside class="authority-context" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
  <header>
    <h3>Sobre ${escapeHtml(companyName)} - Autoridade em Odontologia Digital</h3>
  </header>
  ${partnershipsHtml}
  ${areasHtml}
  ${npsHtml}
  ${reviewsHtml}
  ${founderHtml}
  ${socialHtml}
</aside>
`;
}

/**
 * Gera meta tags adicionais de autoridade
 */
export function generateAuthorityMetaTags(authority: AuthorityData): string {
  const { partnerships, areasServed, socialTags, founder } = authority;
  
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

  return tags.join('\n    ');
}

/**
 * Enriquece o Organization schema com dados de autoridade
 */
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

  // knowsAbout - baseado em expertise
  enriched.knowsAbout = [
    "Odontologia Digital",
    "Scanner Intraoral",
    "Impressora 3D Odontológica", 
    "CAD/CAM Dental",
    "Prótese Digital",
    "Fluxo Digital Odontológico"
  ];

  return enriched;
}

/**
 * Enriquece o Product schema com reviews individuais
 */
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
