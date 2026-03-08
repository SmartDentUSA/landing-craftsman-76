// ═══════════════════════════════════════════════════════════
// 🧠 KNOWLEDGE GRAPH CENTRALIZADO
// Fonte única de dados para todos os geradores de HTML
// Busca paralela de todas as tabelas relevantes do sistema
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════

export interface KnowledgeGraph {
  company: CompanyNode | null;
  products: ProductNode[];
  reviews: ReviewNode[];
  videos: VideoNode[];
  experts: ExpertNode[];
  blogPosts: BlogPostNode[];
  externalLinks: ExternalLinkNode[];
  milestones: MilestoneNode[];
}

export interface CompanyNode {
  id: string;
  company_name: string;
  company_description: string | null;
  business_sector: string | null;
  target_audience: string | null;
  main_products_services: string | null;
  brand_values: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  youtube_channel: string | null;
  instagram_profile: string | null;
  company_logo_url: string | null;
  company_logo_supabase_path: string | null;
  // Endereço estruturado
  country: string | null;
  state: string | null;
  city: string | null;
  street_address: string | null;
  address_number: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  // Identidade corporativa
  mission_statement: string | null;
  vision_statement: string | null;
  company_culture: string | null;
  working_methodology: string | null;
  delivery_approach: string | null;
  differentiators: string | null;
  founded_year: number | null;
  team_size: string | null;
  // Founder
  founder_name: string | null;
  founder_title: string | null;
  founder_linkedin: string | null;
  // Legal
  legal_name: string | null;
  tax_id: string | null;
  duns_number: string | null;
  number_of_employees: string | null;
  price_range: string | null;
  // Operational
  opening_hours: any;
  areas_served: any;
  // Social
  social_media_links: any;
  social_media_hashtags: string[] | null;
  social_media_handles: string[] | null;
  youtube_verified: boolean | null;
  instagram_verified: boolean | null;
  youtube_company_footer: string | null;
  youtube_tags: string[] | null;
  // Content
  company_videos: any;
  company_reviews: any;
  google_aggregate_rating: any;
  nps_metrics: any;
  // SEO
  seo_context_keywords: any;
  seo_market_positioning: string | null;
  seo_competitive_advantages: string | null;
  seo_technical_expertise: string | null;
  seo_service_areas: string | null;
  seo_domains: any;
  // Integrations
  institutional_links: any;
  tracking_pixels: any;
  navigation_footer_config: any;
  // Raw passthrough for any new fields
  [key: string]: any;
}

export interface ProductNode {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price: number | null;
  promo_price: number | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  image_url: string | null;
  images_gallery: any;
  product_url: string | null;
  canonical_url: string | null;
  gtin: string | null;
  mpn: string | null;
  ean: string | null;
  availability: string | null;
  keywords: any;
  market_keywords: any;
  search_intent_keywords: any;
  target_audience: any;
  benefits: any;
  features: any;
  faq: any;
  technical_specifications: any;
  technical_documents: any;
  anti_hallucination_rules: any;
  required_products: any;
  forbidden_products: any;
  youtube_videos: any;
  instagram_videos: any;
  technical_videos: any;
  testimonial_videos: any;
  seo_title_override: string | null;
  seo_description_override: string | null;
  workflow_stages: any;
  sales_pitch: string | null;
  applications: string | null;
  [key: string]: any;
}

export interface ReviewNode {
  id: string;
  raw_review_id: string;
  landing_page_id: string;
  display_order: number | null;
  contextual_seo_info: string | null;
  ai_keywords: any;
  approved_at: string;
  // Dados do raw_review (join)
  author_name?: string;
  rating?: number;
  review_text?: string;
  source?: string;
  profile_photo_url?: string;
}

export interface VideoNode {
  id: string;
  client_name: string;
  profession: string | null;
  location: string | null;
  state: string | null;
  specialty: string | null;
  video_url: string;
  thumbnail_url: string | null;
  testimonial_text: string | null;
  rating: number | null;
  youtube_url: string | null;
  instagram_url: string | null;
  approved: boolean;
  display_order: number | null;
  [key: string]: any;
}

export interface ExpertNode {
  id: string;
  full_name: string;
  specialty: string | null;
  mini_cv: string | null;
  photo_url: string | null;
  lattes_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  approved: boolean;
  display_order: number | null;
}

export interface BlogPostNode {
  id: string;
  title: string;
  content: string;
  meta_description: string | null;
  keywords: string[] | null;
  keyword_ids: string[] | null;
  landing_page_id: string;
  author_kol_id: string | null;
  schema_json_ld: any;
  intelligent_links: any;
  youtube_video_url: string | null;
  published_at: string | null;
  published_domains: string[] | null;
}

export interface ExternalLinkNode {
  id: string;
  name: string;
  url: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  keyword_type: string | null;
  search_intent: string | null;
  monthly_searches: number | null;
  cpc_estimate: number | null;
  competition_level: string | null;
  related_keywords: string[] | null;
  relevance_score: number | null;
  source_products: string[] | null;
}

export interface MilestoneNode {
  id: string;
  title: string;
  description: string | null;
  year: number;
  month: number | null;
  day: number | null;
  slug: string;
  impact: string | null;
  legacy: string | null;
  strategic_decision: string | null;
  market_context: string | null;
  certifications: any;
  technologies: any;
  products_involved: any;
  key_people: any;
  location: any;
  image_url: string | null;
  video_url: string | null;
  display_order: number | null;
}

// ═══════════════════════════════════════════════════════════
// FETCH PRINCIPAL — Busca paralela de todas as tabelas
// ═══════════════════════════════════════════════════════════

export async function fetchKnowledgeGraph(
  supabase: any,
  options?: {
    productIds?: string[];
    landingPageId?: string;
    includeUnpublishedBlogs?: boolean;
    limit?: number;
  }
): Promise<KnowledgeGraph> {
  const limit = options?.limit || 500;

  console.log('🧠 [KnowledgeGraph] Iniciando busca paralela de dados...');
  const startTime = Date.now();

  // ═══════════════════════════════════════════════════════════
  // Promise.all — todas as queries em paralelo
  // ═══════════════════════════════════════════════════════════
  const [
    companyResult,
    productsResult,
    reviewsResult,
    videosResult,
    expertsResult,
    blogPostsResult,
    externalLinksResult,
    milestonesResult
  ] = await Promise.all([
    // 1. Company Profile
    supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single(),

    // 2. Products Repository
    (() => {
      let query = supabase
        .from('products_repository')
        .select('*')
        .eq('approved', true)
        .eq('active', true)
        .order('display_order', { ascending: true, nullsFirst: false });
      
      if (options?.productIds && options.productIds.length > 0) {
        query = query.in('id', options.productIds);
      }
      return query.limit(limit);
    })(),

    // 3. Approved Reviews (com dados do raw_review via join)
    supabase
      .from('approved_reviews')
      .select(`
        *,
        raw_review:raw_review_id (
          author_name,
          rating,
          review_text,
          source,
          profile_photo_url
        )
      `)
      .order('display_order', { ascending: true, nullsFirst: false })
      .limit(limit),

    // 4. Video Testimonials (tabela pode não existir — safe fetch)
    safeQuery(supabase, 'video_testimonials', {
      filter: { approved: true },
      order: { column: 'display_order', ascending: true },
      limit
    }),

    // 5. Key Opinion Leaders
    supabase
      .from('key_opinion_leaders')
      .select('*')
      .eq('approved', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .limit(limit),

    // 6. Blog Posts (published only por padrão)
    (() => {
      let query = supabase
        .from('blog_posts')
        .select('*');
      
      if (!options?.includeUnpublishedBlogs) {
        query = query.eq('status', 'published');
      }
      
      if (options?.landingPageId) {
        query = query.eq('landing_page_id', options.landingPageId);
      }
      
      return query
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);
    })(),

    // 7. External Links (approved only)
    supabase
      .from('external_links')
      .select('*')
      .eq('approved', true)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .limit(limit),

    // 8. Company Milestones (published only)
    supabase
      .from('company_milestones')
      .select('*')
      .eq('is_published', true)
      .order('year', { ascending: false })
      .order('display_order', { ascending: true, nullsFirst: false })
      .limit(limit)
  ]);

  // ═══════════════════════════════════════════════════════════
  // Processar resultados e logar erros sem interromper
  // ═══════════════════════════════════════════════════════════
  const logResult = (name: string, result: any) => {
    if (result.error) {
      console.warn(`⚠️ [KnowledgeGraph] Erro ao buscar ${name}:`, result.error.message);
      return [];
    }
    const data = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
    return data;
  };

  // Company é single, tratar diferente
  const company: CompanyNode | null = companyResult.error ? null : companyResult.data;
  if (companyResult.error) {
    console.warn('⚠️ [KnowledgeGraph] Erro ao buscar company_profile:', companyResult.error.message);
  }

  // Flatten approved_reviews com dados do raw_review
  const rawReviews = logResult('approved_reviews', reviewsResult);
  const reviews: ReviewNode[] = rawReviews.map((r: any) => ({
    id: r.id,
    raw_review_id: r.raw_review_id,
    landing_page_id: r.landing_page_id,
    display_order: r.display_order,
    contextual_seo_info: r.contextual_seo_info,
    ai_keywords: r.ai_keywords,
    approved_at: r.approved_at,
    // Flatten do join
    author_name: r.raw_review?.author_name,
    rating: r.raw_review?.rating,
    review_text: r.raw_review?.review_text,
    source: r.raw_review?.source,
    profile_photo_url: r.raw_review?.profile_photo_url,
  }));

  const products = logResult('products_repository', productsResult) as ProductNode[];
  const videos = logResult('video_testimonials', videosResult) as VideoNode[];
  const experts = logResult('key_opinion_leaders', expertsResult) as ExpertNode[];
  const blogPosts = logResult('blog_posts', blogPostsResult) as BlogPostNode[];
  const externalLinks = logResult('external_links', externalLinksResult) as ExternalLinkNode[];
  const milestones = logResult('company_milestones', milestonesResult) as MilestoneNode[];

  const elapsed = Date.now() - startTime;
  console.log(`✅ [KnowledgeGraph] Dados carregados em ${elapsed}ms:`, {
    company: company ? '✓' : '✗',
    products: products.length,
    reviews: reviews.length,
    videos: videos.length,
    experts: experts.length,
    blogPosts: blogPosts.length,
    externalLinks: externalLinks.length,
    milestones: milestones.length,
  });

  return {
    company,
    products,
    reviews,
    videos,
    experts,
    blogPosts,
    externalLinks,
    milestones,
  };
}

// ═══════════════════════════════════════════════════════════
// HELPERS DERIVADOS — Grafos focados por entidade
// ═══════════════════════════════════════════════════════════

/**
 * Monta o subgrafo de um produto específico:
 * product → reviews, videos, experts, blogPosts, externalLinks
 */
export function buildProductGraph(
  knowledgeGraph: KnowledgeGraph,
  productId: string
) {
  const product = knowledgeGraph.products.find(p => p.id === productId);
  if (!product) {
    console.warn(`⚠️ [KnowledgeGraph] Produto não encontrado: ${productId}`);
    return null;
  }

  const productName = product.name?.toLowerCase() || '';
  const productSlug = product.slug?.toLowerCase() || '';
  const productCategory = product.category?.toLowerCase() || '';

  // Reviews vinculadas ao produto (via landing_page_id ou keywords)
  const relatedReviews = knowledgeGraph.reviews.filter(r => {
    // Match por contextual_seo_info contendo nome do produto
    if (r.contextual_seo_info?.toLowerCase().includes(productName)) return true;
    // Match por ai_keywords
    if (Array.isArray(r.ai_keywords)) {
      return r.ai_keywords.some((k: any) => 
        typeof k === 'string' && productName.includes(k.toLowerCase())
      );
    }
    return false;
  });

  // Videos vinculados ao produto (por nome, specialty)
  const relatedVideos = knowledgeGraph.videos.filter(v => {
    if (v.testimonial_text?.toLowerCase().includes(productName)) return true;
    if (v.specialty?.toLowerCase().includes(productCategory)) return true;
    return false;
  });

  // Experts com specialty relevante à categoria do produto
  const relatedExperts = knowledgeGraph.experts.filter(e => {
    if (!e.specialty || !productCategory) return false;
    return e.specialty.toLowerCase().includes(productCategory) ||
           productCategory.includes(e.specialty.toLowerCase());
  });

  // Blog posts vinculados (por keywords ou landing_page_id)
  const relatedBlogPosts = knowledgeGraph.blogPosts.filter(bp => {
    // Match por keywords
    if (Array.isArray(bp.keywords)) {
      const hasMatch = bp.keywords.some(k => 
        productName.includes(k.toLowerCase()) || 
        k.toLowerCase().includes(productSlug)
      );
      if (hasMatch) return true;
    }
    // Match por título
    if (bp.title?.toLowerCase().includes(productName)) return true;
    return false;
  });

  // External links relevantes (por source_products ou category match)
  const relatedLinks = knowledgeGraph.externalLinks.filter(el => {
    // Match por source_products (array de product IDs)
    if (Array.isArray(el.source_products) && el.source_products.includes(productId)) {
      return true;
    }
    // Match por categoria
    if (el.subcategory?.toLowerCase().includes(productCategory)) return true;
    // Match por nome
    if (el.name?.toLowerCase().includes(productName)) return true;
    return false;
  });

  return {
    product,
    reviews: relatedReviews,
    videos: relatedVideos,
    experts: relatedExperts,
    blogPosts: relatedBlogPosts,
    externalLinks: relatedLinks,
    milestones: knowledgeGraph.milestones, // Milestones são globais
    company: knowledgeGraph.company,
  };
}

export type ProductGraph = NonNullable<ReturnType<typeof buildProductGraph>>;

/**
 * Monta o subgrafo de um blog post:
 * blog → author (expert), relatedProducts, externalLinks
 */
export function buildBlogGraph(
  knowledgeGraph: KnowledgeGraph,
  blogIdentifier: string // pode ser ID ou slug (landing_page_id)
) {
  const blogPost = knowledgeGraph.blogPosts.find(bp => 
    bp.id === blogIdentifier || bp.landing_page_id === blogIdentifier
  );
  
  if (!blogPost) {
    console.warn(`⚠️ [KnowledgeGraph] Blog post não encontrado: ${blogIdentifier}`);
    return null;
  }

  const blogTitle = blogPost.title?.toLowerCase() || '';
  const blogKeywords = (blogPost.keywords || []).map((k: string) => k.toLowerCase());

  // Autor (expert/KOL)
  const author = blogPost.author_kol_id 
    ? knowledgeGraph.experts.find(e => e.id === blogPost.author_kol_id) || null
    : null;

  // Produtos relacionados (por keywords)
  const relatedProducts = knowledgeGraph.products.filter(p => {
    const pName = p.name?.toLowerCase() || '';
    // Match por título do blog contendo nome do produto
    if (blogTitle.includes(pName)) return true;
    // Match por keywords do blog contendo nome/slug do produto
    if (blogKeywords.some(k => pName.includes(k) || k.includes(p.slug?.toLowerCase() || ''))) {
      return true;
    }
    return false;
  });

  // External links por keywords
  const relatedLinks = knowledgeGraph.externalLinks.filter(el => {
    const elName = el.name?.toLowerCase() || '';
    return blogKeywords.some(k => elName.includes(k) || k.includes(elName));
  });

  // Reviews para social proof no blog
  const relatedReviews = knowledgeGraph.reviews.filter(r => {
    if (r.contextual_seo_info?.toLowerCase().includes(blogTitle)) return true;
    return false;
  });

  return {
    blogPost,
    author,
    relatedProducts,
    externalLinks: relatedLinks,
    reviews: relatedReviews,
    videos: knowledgeGraph.videos, // Todos os vídeos disponíveis
    milestones: knowledgeGraph.milestones,
    company: knowledgeGraph.company,
  };
}

export type BlogGraph = NonNullable<ReturnType<typeof buildBlogGraph>>;

// ═══════════════════════════════════════════════════════════
// UTILIDADES INTERNAS
// ═══════════════════════════════════════════════════════════

/**
 * Query segura para tabelas que podem não existir
 * Retorna { data: [], error: null } se a tabela não existe
 */
async function safeQuery(
  supabase: any,
  table: string,
  opts: {
    filter?: Record<string, any>;
    order?: { column: string; ascending: boolean };
    limit?: number;
  }
): Promise<{ data: any[] | null; error: any }> {
  try {
    let query = supabase.from(table).select('*');
    
    if (opts.filter) {
      for (const [key, value] of Object.entries(opts.filter)) {
        query = query.eq(key, value);
      }
    }
    
    if (opts.order) {
      query = query.order(opts.order.column, { 
        ascending: opts.order.ascending, 
        nullsFirst: false 
      });
    }
    
    if (opts.limit) {
      query = query.limit(opts.limit);
    }
    
    return await query;
  } catch (err: any) {
    console.warn(`⚠️ [KnowledgeGraph] Tabela '${table}' indisponível:`, err.message);
    return { data: [], error: null };
  }
}

/**
 * Gera estatísticas resumidas do Knowledge Graph
 * Útil para logging e debugging
 */
export function getKnowledgeGraphStats(kg: KnowledgeGraph) {
  return {
    hasCompany: !!kg.company,
    productsCount: kg.products.length,
    reviewsCount: kg.reviews.length,
    videosCount: kg.videos.length,
    expertsCount: kg.experts.length,
    blogPostsCount: kg.blogPosts.length,
    externalLinksCount: kg.externalLinks.length,
    milestonesCount: kg.milestones.length,
    totalNodes: 
      (kg.company ? 1 : 0) +
      kg.products.length +
      kg.reviews.length +
      kg.videos.length +
      kg.experts.length +
      kg.blogPosts.length +
      kg.externalLinks.length +
      kg.milestones.length,
  };
}
