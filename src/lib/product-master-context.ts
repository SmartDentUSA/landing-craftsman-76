/**
 * Product Master Context - Consolidação Absoluta de Fontes
 * 
 * Hierarquia de Priorização:
 * 1º → document_transcriptions (PDFs transcritos - VERDADE ABSOLUTA)
 * 2º → technical_documents (manuais oficiais)
 * 3º → technical_specifications (specs estruturadas)
 * 4º → video_captions (vídeos internos)
 * 5º → Vídeos externos (System B via Knowledge Base)
 * 6º → Dados estruturados do banco
 * 7º → Contexto da empresa
 */

import { supabase } from '@/integrations/supabase/client';

export interface ProductMasterContext {
  // ===== IDENTIFICAÇÃO BÁSICA =====
  id: string;
  name: string;
  description?: string;
  sales_pitch?: string;
  applications?: string;
  category?: string;
  subcategory?: string;
  
  // ===== PREÇOS E DISPONIBILIDADE =====
  price?: number;
  promo_price?: number;
  currency?: string;
  availability?: string;
  condition?: string;
  
  // ===== IMAGENS (CONSOLIDADAS) =====
  image_url?: string;
  images_gallery?: any[];
  images_count: number;
  primary_image: string;
  all_images: string[];
  
  // ===== DOCUMENTOS TÉCNICOS (PRIORIDADE #1) =====
  document_transcriptions?: any[];
  has_technical_docs: boolean;
  technical_summary?: string;
  technical_specifications_from_docs?: any;
  
  // ===== DOCUMENTOS OFICIAIS =====
  technical_documents?: any[];
  technical_documents_count: number;
  
  // ===== ESPECIFICAÇÕES TÉCNICAS =====
  technical_specifications?: any[];
  specs_consolidated: any;
  
  // ===== VARIAÇÕES =====
  variations?: any[];
  has_variations: boolean;
  variations_summary?: string;
  
  // ===== TUTORIAIS =====
  tutorial_resources?: any;
  has_tutorials: boolean;
  tutorials_count: number;
  
  // ===== VÍDEOS CONSOLIDADOS =====
  youtube_videos?: any[];
  instagram_videos?: any[];
  technical_videos?: any[];
  testimonial_videos?: any[];
  tiktok_videos?: any[];
  total_videos_count: number;
  has_video_content: boolean;
  
  // ===== VIDEO CAPTIONS =====
  video_captions?: any;
  has_captions: boolean;
  
  // ===== KEYWORDS E SEO =====
  keywords?: any[];
  search_intent_keywords?: any[];
  market_keywords?: any[];
  target_audience?: any[];
  tags?: any[];
  all_keywords_consolidated: string[];
  
  // ===== CONTEÚDO GERADO POR IA =====
  benefits?: any[];
  features?: any[];
  faq?: any[];
  whatsapp_messages?: any;
  whatsapp_sequences?: any;
  youtube_descriptions?: any;
  instagram_copies?: any;
  tiktok_content?: any;
  individual_blog_content?: any;
  ecommerce_html?: any;
  
  // ===== CTAs E RECURSOS =====
  resource_cta1?: any;
  resource_cta2?: any;
  resource_cta3?: any;
  offer_discount_cta?: any;
  resource_descriptions?: any;
  show_in_resources?: boolean;
  
  // ===== CONFIGURAÇÕES =====
  approved?: boolean;
  use_in_ai_generation?: boolean;
  selected?: boolean;
  active?: boolean;
  featured?: boolean;
  showcase?: boolean;
  promotion?: boolean;
  launch?: boolean;
  
  // ===== URLs E LINKS =====
  product_url?: string;
  canonical_url?: string;
  slug?: string;
  
  // ===== SHIPPING E ESTOQUE =====
  stock_quantity?: number;
  stock_managed?: boolean;
  free_shipping?: boolean;
  shipping_time?: string;
  shipping_type?: string;
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  
  // ===== IDENTIFICADORES =====
  ean?: string;
  gtin?: string;
  mpn?: string;
  brand?: string;
  ncm?: string;
  
  // ===== FISCAL =====
  fiscal_class?: string;
  fiscal_origin?: string;
  tax_situation?: string;
  
  // ===== GOOGLE MERCHANT =====
  google_product_category?: string;
  color?: string;
  size?: string;
  material?: string;
  age_group?: string;
  gender?: string;
  unit_measure?: string;
  package_size?: string;
  
  // ===== LIMITES DE PEDIDO =====
  min_order_quantity?: number;
  max_order_quantity?: number;
  multiple_order_quantity?: number;
  
  // ===== SEO OVERRIDES =====
  seo_title_override?: string;
  seo_description_override?: string;
  seo_enhanced?: boolean;
  
  // ===== CATEGORIAS COMPLETAS =====
  all_categories?: any[];
  store_category?: string;
  
  // ===== METADADOS =====
  created_at?: string;
  updated_at?: string;
  display_order?: number;
  source_type?: string;
  source_landing_page_id?: string;
  original_data?: any;
  
  // ===== FLAGS DE IA =====
  ai_generated_keywords?: boolean;
  ai_generated_benefits?: boolean;
  ai_generated_category?: boolean;
  
  // ===== PALAVRAS-CHAVE BOT =====
  bot_trigger_words?: any[];
  
  // ===== CONTEXTO CONSOLIDADO (COMPUTED) =====
  master_description: string;
  master_technical_context: string;
  master_seo_context: string;
  data_quality_score: number;
  priority_sources_used: string[];
}

/**
 * Constrói o contexto mestre consolidado do produto
 */
export async function buildProductMasterContext(
  productId: string,
  supabaseClient = supabase
): Promise<ProductMasterContext> {
  // Buscar produto completo
  const { data: product, error } = await supabaseClient
    .from('products_repository')
    .select('*')
    .eq('id', productId)
    .single();

  if (error || !product) {
    throw new Error(`Produto ${productId} não encontrado: ${error?.message}`);
  }

  // ===== CONSOLIDAR IMAGENS =====
  const allImages: string[] = [];
  if (product.image_url) allImages.push(product.image_url);
  if (product.images_gallery && Array.isArray(product.images_gallery)) {
    product.images_gallery.forEach((img: any) => {
      const url = typeof img === 'string' ? img : img?.url;
      if (url && !allImages.includes(url)) allImages.push(url);
    });
  }

  // ===== CONSOLIDAR ESPECIFICAÇÕES TÉCNICAS (HIERARQUIA) =====
  let specsConsolidated: any = {};
  let technicalSummary = '';
  let technicalSpecsFromDocs: any = null;
  const prioritySourcesUsed: string[] = [];

  // 1º PRIORIDADE: document_transcriptions (VERDADE ABSOLUTA)
  const docTranscriptions = product.document_transcriptions as any[] | null;
  if (docTranscriptions && Array.isArray(docTranscriptions) && docTranscriptions.length > 0) {
    prioritySourcesUsed.push('document_transcriptions');
    const firstDoc = docTranscriptions[0];
    
    if (firstDoc?.extracted_data?.summary) {
      technicalSummary = firstDoc.extracted_data.summary;
    }
    
    if (firstDoc?.extracted_data?.specifications) {
      technicalSpecsFromDocs = firstDoc.extracted_data.specifications;
      specsConsolidated = { ...specsConsolidated, ...firstDoc.extracted_data.specifications };
    }
  }

  // 2º PRIORIDADE: technical_documents
  const techDocs = product.technical_documents as any[] | null;
  if (techDocs && Array.isArray(techDocs) && techDocs.length > 0) {
    prioritySourcesUsed.push('technical_documents');
  }

  // 3º PRIORIDADE: technical_specifications
  const techSpecs = product.technical_specifications as any[] | null;
  if (techSpecs && Array.isArray(techSpecs) && techSpecs.length > 0) {
    prioritySourcesUsed.push('technical_specifications');
    techSpecs.forEach((spec: any) => {
      if (spec.label && spec.value) {
        specsConsolidated[spec.label] = spec.value;
      }
    });
  }

  // 4º PRIORIDADE: video_captions
  const videoCaptions = product.video_captions as any;
  if (videoCaptions && typeof videoCaptions === 'object' && Object.keys(videoCaptions).length > 0) {
    prioritySourcesUsed.push('video_captions');
  }

  // ===== CONSOLIDAR KEYWORDS =====
  const allKeywordsConsolidated: string[] = [];
  
  const keywords = product.keywords as any[] | null;
  if (keywords && Array.isArray(keywords)) {
    keywords.forEach((kw: any) => {
      const keyword = typeof kw === 'string' ? kw : kw?.keyword || kw?.name;
      if (keyword && !allKeywordsConsolidated.includes(keyword)) {
        allKeywordsConsolidated.push(keyword);
      }
    });
  }
  
  const searchIntentKeywords = product.search_intent_keywords as any[] | null;
  if (searchIntentKeywords && Array.isArray(searchIntentKeywords)) {
    searchIntentKeywords.forEach((kw: any) => {
      const keyword = typeof kw === 'string' ? kw : kw?.keyword || kw?.name;
      if (keyword && !allKeywordsConsolidated.includes(keyword)) {
        allKeywordsConsolidated.push(keyword);
      }
    });
  }
  
  const marketKeywords = product.market_keywords as any[] | null;
  if (marketKeywords && Array.isArray(marketKeywords)) {
    marketKeywords.forEach((kw: any) => {
      const keyword = typeof kw === 'string' ? kw : kw?.keyword || kw?.name;
      if (keyword && !allKeywordsConsolidated.includes(keyword)) {
        allKeywordsConsolidated.push(keyword);
      }
    });
  }

  // ===== CONSOLIDAR VÍDEOS =====
  const youtubeVideos = product.youtube_videos as any[] | null;
  const instagramVideos = product.instagram_videos as any[] | null;
  const technicalVideos = product.technical_videos as any[] | null;
  const testimonialVideos = product.testimonial_videos as any[] | null;
  const tiktokVideos = product.tiktok_videos as any[] | null;
  
  const totalVideosCount = 
    (youtubeVideos?.length || 0) +
    (instagramVideos?.length || 0) +
    (technicalVideos?.length || 0) +
    (testimonialVideos?.length || 0) +
    (tiktokVideos?.length || 0);

  // ===== CONSOLIDAR TUTORIAIS =====
  const tutorialResources = product.tutorial_resources as any;
  const tutorialsCount = tutorialResources?.tutorials?.length || 0;
  const hasTutorials = tutorialsCount > 0;

  // ===== CONSOLIDAR VARIAÇÕES =====
  const variations = product.variations as any[] | null;
  const hasVariations = variations && Array.isArray(variations) && variations.length > 0;
  let variationsSummary = '';
  
  if (hasVariations && variations) {
    variationsSummary = `Disponível em ${variations.length} variações: ${variations
      .slice(0, 3)
      .map((v: any) => v.name || v.color || v.size)
      .filter(Boolean)
      .join(', ')}${variations.length > 3 ? '...' : ''}`;
  }

  // ===== CONSTRUIR DESCRIÇÃO MESTRE (HIERARQUIA) =====
  let masterDescription = '';
  
  // Usar document_transcriptions como fonte primária
  if (technicalSummary) {
    masterDescription = technicalSummary;
  } else if (product.description) {
    masterDescription = product.description;
  }
  
  // Adicionar sales_pitch se disponível
  if (product.sales_pitch && !masterDescription.includes(product.sales_pitch)) {
    masterDescription += `\n\n${product.sales_pitch}`;
  }
  
  // Adicionar applications se disponível
  if (product.applications && !masterDescription.includes(product.applications)) {
    masterDescription += `\n\nAplicações: ${product.applications}`;
  }

  // ===== CONSTRUIR CONTEXTO TÉCNICO MESTRE =====
  let masterTechnicalContext = '';
  
  if (technicalSummary) {
    masterTechnicalContext += `📄 FONTE OFICIAL (PDF): ${technicalSummary}\n\n`;
  }
  
  if (Object.keys(specsConsolidated).length > 0) {
    masterTechnicalContext += `🔧 ESPECIFICAÇÕES TÉCNICAS:\n`;
    Object.entries(specsConsolidated).forEach(([key, value]) => {
      masterTechnicalContext += `  • ${key}: ${value}\n`;
    });
  }
  
  if (hasVariations) {
    masterTechnicalContext += `\n🎨 ${variationsSummary}`;
  }

  // ===== CONSTRUIR CONTEXTO SEO MESTRE =====
  let masterSeoContext = '';
  
  if (allKeywordsConsolidated.length > 0) {
    masterSeoContext += `🎯 KEYWORDS: ${allKeywordsConsolidated.slice(0, 10).join(', ')}`;
  }
  
  if (product.target_audience && Array.isArray(product.target_audience) && product.target_audience.length > 0) {
    masterSeoContext += `\n👥 PÚBLICO-ALVO: ${product.target_audience.slice(0, 5).join(', ')}`;
  }

  // ===== CALCULAR DATA QUALITY SCORE =====
  let dataQualityScore = 0;
  
  // Campos obrigatórios básicos (30 pontos)
  if (product.name) dataQualityScore += 5;
  if (masterDescription.length > 100) dataQualityScore += 10;
  if (product.category) dataQualityScore += 5;
  if (product.price) dataQualityScore += 5;
  if (allImages.length > 0) dataQualityScore += 5;
  
  // Campos técnicos (30 pontos)
  if (docTranscriptions && docTranscriptions.length > 0) dataQualityScore += 15;
  if (techSpecs && techSpecs.length > 0) dataQualityScore += 10;
  if (hasVariations) dataQualityScore += 5;
  
  // Conteúdo rico (25 pontos)
  if (hasTutorials) dataQualityScore += 10;
  if (totalVideosCount > 0) dataQualityScore += 10;
  const faq = product.faq as any[] | null;
  if (faq && faq.length > 0) dataQualityScore += 5;
  
  // SEO (15 pontos)
  if (allKeywordsConsolidated.length >= 5) dataQualityScore += 10;
  if (allImages.length > 3) dataQualityScore += 5;

  // ===== RETORNAR CONTEXTO CONSOLIDADO =====
  return {
    // Identificação
    id: product.id,
    name: product.name,
    description: product.description,
    sales_pitch: product.sales_pitch,
    applications: product.applications,
    category: product.category,
    subcategory: product.subcategory,
    
    // Preços
    price: product.price,
    promo_price: product.promo_price,
    currency: product.currency,
    availability: product.availability,
    condition: product.condition,
    
    // Imagens consolidadas
    image_url: product.image_url,
    images_gallery: (product.images_gallery as any[]) || [],
    images_count: allImages.length,
    primary_image: allImages[0] || product.image_url || '',
    all_images: allImages,
    
    // Documentos técnicos (PRIORIDADE #1)
    document_transcriptions: docTranscriptions || [],
    has_technical_docs: (docTranscriptions?.length || 0) > 0,
    technical_summary: technicalSummary,
    technical_specifications_from_docs: technicalSpecsFromDocs,
    
    // Documentos oficiais
    technical_documents: techDocs || [],
    technical_documents_count: techDocs?.length || 0,
    
    // Especificações técnicas
    technical_specifications: techSpecs || [],
    specs_consolidated: specsConsolidated,
    
    // Variações
    variations: variations || [],
    has_variations: hasVariations,
    variations_summary: variationsSummary,
    
    // Tutoriais
    tutorial_resources: tutorialResources,
    has_tutorials: hasTutorials,
    tutorials_count: tutorialsCount,
    
    // Vídeos
    youtube_videos: youtubeVideos || [],
    instagram_videos: instagramVideos || [],
    technical_videos: technicalVideos || [],
    testimonial_videos: testimonialVideos || [],
    tiktok_videos: tiktokVideos || [],
    total_videos_count: totalVideosCount,
    has_video_content: totalVideosCount > 0,
    
    // Video captions
    video_captions: videoCaptions,
    has_captions: videoCaptions && typeof videoCaptions === 'object' && Object.keys(videoCaptions).length > 0,
    
    // Keywords e SEO
    keywords: keywords || [],
    search_intent_keywords: searchIntentKeywords || [],
    market_keywords: marketKeywords || [],
    target_audience: (product.target_audience as any[]) || [],
    tags: (product.tags as any[]) || [],
    all_keywords_consolidated: allKeywordsConsolidated,
    
    // Conteúdo IA
    benefits: (product.benefits as any[]) || [],
    features: (product.features as any[]) || [],
    faq: faq || [],
    whatsapp_messages: product.whatsapp_messages,
    whatsapp_sequences: product.whatsapp_sequences,
    youtube_descriptions: product.youtube_descriptions,
    instagram_copies: product.instagram_copies,
    tiktok_content: product.tiktok_content,
    individual_blog_content: product.individual_blog_content,
    ecommerce_html: product.ecommerce_html,
    
    // CTAs
    resource_cta1: product.resource_cta1,
    resource_cta2: product.resource_cta2,
    resource_cta3: product.resource_cta3,
    offer_discount_cta: product.offer_discount_cta,
    resource_descriptions: product.resource_descriptions,
    show_in_resources: product.show_in_resources,
    
    // Configurações
    approved: product.approved,
    use_in_ai_generation: product.use_in_ai_generation,
    selected: product.selected,
    active: product.active,
    featured: product.featured,
    showcase: product.showcase,
    promotion: product.promotion,
    launch: product.launch,
    
    // URLs
    product_url: product.product_url,
    canonical_url: product.canonical_url,
    slug: product.slug,
    
    // Shipping
    stock_quantity: product.stock_quantity,
    stock_managed: product.stock_managed,
    free_shipping: product.free_shipping,
    shipping_time: product.shipping_time,
    shipping_type: product.shipping_type,
    weight: product.weight,
    height: product.height,
    width: product.width,
    depth: product.depth,
    
    // Identificadores
    ean: product.ean,
    gtin: product.gtin,
    mpn: product.mpn,
    brand: product.brand,
    ncm: product.ncm,
    
    // Fiscal
    fiscal_class: product.fiscal_class,
    fiscal_origin: product.fiscal_origin,
    tax_situation: product.tax_situation,
    
    // Google Merchant
    google_product_category: product.google_product_category,
    color: product.color,
    size: product.size,
    material: product.material,
    age_group: product.age_group,
    gender: product.gender,
    unit_measure: product.unit_measure,
    package_size: product.package_size,
    
    // Limites de pedido
    min_order_quantity: product.min_order_quantity,
    max_order_quantity: product.max_order_quantity,
    multiple_order_quantity: product.multiple_order_quantity,
    
    // SEO overrides
    seo_title_override: product.seo_title_override,
    seo_description_override: product.seo_description_override,
    seo_enhanced: product.seo_enhanced,
    
    // Categorias
    all_categories: (product.all_categories as any[]) || [],
    store_category: product.store_category,
    
    // Metadados
    created_at: product.created_at,
    updated_at: product.updated_at,
    display_order: product.display_order,
    source_type: product.source_type,
    source_landing_page_id: product.source_landing_page_id,
    original_data: product.original_data,
    
    // Flags IA
    ai_generated_keywords: product.ai_generated_keywords,
    ai_generated_benefits: product.ai_generated_benefits,
    ai_generated_category: product.ai_generated_category,
    
    // Bot
    bot_trigger_words: (product.bot_trigger_words as any[]) || [],
    
    // Contexto consolidado (computed)
    master_description: masterDescription,
    master_technical_context: masterTechnicalContext,
    master_seo_context: masterSeoContext,
    data_quality_score: dataQualityScore,
    priority_sources_used: prioritySourcesUsed
  };
}

/**
 * Valida se o contexto mestre tem informações suficientes
 */
export function validateMasterContext(context: ProductMasterContext): {
  valid: boolean;
  warnings: string[];
  critical_missing: string[];
} {
  const warnings: string[] = [];
  const criticalMissing: string[] = [];

  // Validações críticas
  if (!context.name) criticalMissing.push('name');
  if (!context.master_description || context.master_description.length < 50) {
    criticalMissing.push('master_description (mínimo 50 caracteres)');
  }
  if (context.all_images.length === 0) criticalMissing.push('images');

  // Avisos de campos importantes
  if (!context.has_technical_docs && (!context.technical_specifications || context.technical_specifications.length === 0)) {
    warnings.push('Nenhuma documentação técnica ou especificações disponíveis');
  }
  
  if (!context.has_variations && context.category !== 'serviço') {
    warnings.push('Produto sem variações cadastradas');
  }
  
  if (!context.has_tutorials && context.total_videos_count === 0) {
    warnings.push('Produto sem tutoriais ou vídeos');
  }
  
  if (context.all_keywords_consolidated.length < 5) {
    warnings.push('Produto com poucas keywords (mínimo recomendado: 5)');
  }

  if (context.data_quality_score < 50) {
    warnings.push(`Score de qualidade baixo: ${context.data_quality_score}/100`);
  }

  return {
    valid: criticalMissing.length === 0,
    warnings,
    critical_missing: criticalMissing
  };
}
