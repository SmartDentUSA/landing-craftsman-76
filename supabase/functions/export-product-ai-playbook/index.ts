import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductData {
  // Basic Info
  id: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  price?: number;
  promo_price?: number;
  currency?: string;
  package_size?: string;
  store_category?: string;
  
  // Product Details
  sales_pitch?: string;
  benefits?: string[];
  features?: string[];
  keywords?: string[];
  target_audience?: string[];
  search_intent_keywords?: string[];
  market_keywords?: string[];
  tags?: string[];
  all_categories?: string[];
  
  // Product Variations
  variations?: any[];
  
  // Technical Info
  technical_specifications?: any[];
  faq?: any[];
  color?: string;
  size?: string;
  material?: string;
  condition?: string;
  availability?: string;
  age_group?: string;
  gender?: string;
  
  // Product Codes
  gtin?: string;
  ean?: string;
  mpn?: string;
  
  // Physical Dimensions
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  
  // SEO Data
  seo_title_override?: string;
  seo_description_override?: string;
  canonical_url?: string;
  google_product_category?: string;
  
  // Media & Links
  image_url?: string;
  images_gallery?: string[];
  product_url?: string;
  youtube_videos?: any[];
  instagram_videos?: any[];
  technical_videos?: any[];
  testimonial_videos?: any[];
  tiktok_videos?: any[];
  video_captions?: any;
  tutorial_resources?: {
    tutorials?: Array<{
      id: string;
      courseName: string;
      courseUrl: string;
    }>;
  };
  
  // AI Generated Content
  individual_blog_content?: {
    commercial?: string;
    technical?: string;
    generated_at?: string;
  };
  whatsapp_messages?: {
    messages?: any[];
    last_generated?: string;
  };
  youtube_descriptions?: {
    descriptions?: any[];
    last_generated?: string;
  };
  instagram_copies?: {
    copies?: any[];
    last_generated?: string;
  };
  tiktok_content?: {
    copies?: any[];
    last_generated?: string;
  };
  whatsapp_sequences?: {
    sequences?: any[];
    last_generated?: string;
  };
  
  // Promotional Data
  coupons?: {
    id: string;
    coupon_code: string;
    discount_percentage: number;
    allow_promotions: boolean;
    created_at: string;
    updated_at: string;
  }[];
  
  // AI Automation
  bot_trigger_words?: string[];
  
  // Landing Page Configuration
  show_in_resources?: boolean;
  selected?: boolean;
  resource_cta1?: {
    url?: string;
    label?: string;
    visible?: boolean;
  };
  resource_cta2?: {
    url?: string;
    label?: string;
    visible?: boolean;
  };
  resource_cta3?: {
    url?: string;
    label?: string;
    visible?: boolean;
  };
  offer_discount_cta?: {
    url?: string;
    label?: string;
    visible?: boolean;
  };
  resource_descriptions?: {
    cta1?: string;
    cta2?: string;
    cta3?: string;
  };
  source_landing_page_id?: string;
  
  // Flags
  approved?: boolean;
  use_in_ai_generation?: boolean;
  seo_enhanced?: boolean;
  ai_generated_keywords?: boolean;
  ai_generated_benefits?: boolean;
  ai_generated_category?: boolean;
  ai_generated_features?: boolean;
  source_type?: string;
}

/**
 * Remove HTML tags e decodifica entidades HTML
 */
function stripHTML(html: string): string {
  if (!html) return '';
  
  let text = html.replace(/<[^>]*>/g, '');
  
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Normaliza URL removendo parâmetros UTM
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('utm_campaign');
    parsed.searchParams.delete('utm_content');
    parsed.searchParams.delete('utm_term');
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Detecta plataforma pela URL
 */
function detectPlatform(url: string): 'youtube' | 'instagram' | 'tiktok' | 'other' {
  if (!url) return 'other';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  return 'other';
}

/**
 * Interface para vídeo normalizado
 */
interface NormalizedVideo {
  url: string;
  description: string;
  title?: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'other';
  source: 'product' | 'landing_page' | 'company';
  category: 'tutorial' | 'technical' | 'testimonial' | 'promotional';
}

/**
 * Consolida e normaliza vídeos de múltiplas fontes
 */
function normalizeAndConsolidateVideos(
  product: any,
  landingPageVideos?: any[],
  companyVideos?: any
): {
  by_platform: {
    youtube: NormalizedVideo[];
    instagram: NormalizedVideo[];
    tiktok: NormalizedVideo[];
  };
  by_category: {
    tutorials: NormalizedVideo[];
    technical: NormalizedVideo[];
    testimonials: NormalizedVideo[];
    promotional: NormalizedVideo[];
  };
  all_videos: NormalizedVideo[];
  sources_summary: {
    youtube: { product: number; landing_page: number; company: number };
    instagram: { product: number; landing_page: number; company: number };
    tiktok: { product: number; landing_page: number; company: number };
    total: number;
  };
} {
  const allVideos: NormalizedVideo[] = [];
  const seenUrls = new Set<string>();
  
  const addVideo = (
    url: string,
    description: string,
    category: 'tutorial' | 'technical' | 'testimonial' | 'promotional',
    source: 'product' | 'landing_page' | 'company'
  ) => {
    if (!url) return;
    const normalizedUrl = normalizeUrl(url);
    if (seenUrls.has(normalizedUrl)) return;
    
    seenUrls.add(normalizedUrl);
    allVideos.push({
      url,
      description: description || 'Vídeo sem descrição',
      platform: detectPlatform(url),
      source,
      category
    });
  };
  
  // 1. PRIORIDADE: Vídeos do produto
  (product.youtube_videos || []).forEach((v: any) => 
    addVideo(v.url, v.description, 'promotional', 'product')
  );
  
  (product.instagram_videos || []).forEach((v: any) => 
    addVideo(v.url, v.description, 'promotional', 'product')
  );
  
  (product.tiktok_videos || []).forEach((v: any) => 
    addVideo(v.url, v.description, 'promotional', 'product')
  );
  
  (product.technical_videos || []).forEach((v: any) => 
    addVideo(v.url, v.description, 'technical', 'product')
  );
  
  (product.testimonial_videos || []).forEach((v: any) => 
    addVideo(v.url, v.description, 'testimonial', 'product')
  );
  
  (product.tutorial_resources?.tutorials || []).forEach((t: any) => 
    addVideo(t.courseUrl, t.courseName, 'tutorial', 'product')
  );
  
  // 2. FALLBACK: Vídeos da landing page (até 5)
  if (landingPageVideos && allVideos.length < 10) {
    landingPageVideos.slice(0, 5).forEach((v: any) => 
      addVideo(v.youtube_url || v.instagram_url, v.testimonial_text || v.client_name, 'testimonial', 'landing_page')
    );
  }
  
  // 3. FALLBACK: Vídeos da empresa (até 3 por tipo)
  if (companyVideos && allVideos.length < 10) {
    (companyVideos.youtube_videos || []).slice(0, 3).forEach((v: any) => 
      addVideo(v.url, v.description, 'promotional', 'company')
    );
    
    (companyVideos.instagram_videos || []).slice(0, 3).forEach((v: any) => 
      addVideo(v.url, v.description, 'promotional', 'company')
    );
  }
  
  // Agrupar por plataforma
  const byPlatform = {
    youtube: allVideos.filter(v => v.platform === 'youtube'),
    instagram: allVideos.filter(v => v.platform === 'instagram'),
    tiktok: allVideos.filter(v => v.platform === 'tiktok')
  };
  
  // Agrupar por categoria
  const byCategory = {
    tutorials: allVideos.filter(v => v.category === 'tutorial'),
    technical: allVideos.filter(v => v.category === 'technical'),
    testimonials: allVideos.filter(v => v.category === 'testimonial'),
    promotional: allVideos.filter(v => v.category === 'promotional')
  };
  
  // Resumo de fontes
  const sourcesSummary = {
    youtube: {
      product: byPlatform.youtube.filter(v => v.source === 'product').length,
      landing_page: byPlatform.youtube.filter(v => v.source === 'landing_page').length,
      company: byPlatform.youtube.filter(v => v.source === 'company').length
    },
    instagram: {
      product: byPlatform.instagram.filter(v => v.source === 'product').length,
      landing_page: byPlatform.instagram.filter(v => v.source === 'landing_page').length,
      company: byPlatform.instagram.filter(v => v.source === 'company').length
    },
    tiktok: {
      product: byPlatform.tiktok.filter(v => v.source === 'product').length,
      landing_page: byPlatform.tiktok.filter(v => v.source === 'landing_page').length,
      company: byPlatform.tiktok.filter(v => v.source === 'company').length
    },
    total: allVideos.length
  };
  
  return { by_platform: byPlatform, by_category: byCategory, all_videos: allVideos, sources_summary: sourcesSummary };
}

/**
 * Agrupa links por categoria
 */
function groupLinksByCategory(links: any[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  links.forEach(link => {
    const category = link.category || 'sem-categoria';
    grouped[category] = (grouped[category] || 0) + 1;
  });
  return grouped;
}

/**
 * Agrupa links por tipo de keyword
 */
function groupLinksByType(links: any[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  links.forEach(link => {
    const type = link.keyword_type || 'indefinido';
    grouped[type] = (grouped[type] || 0) + 1;
  });
  return grouped;
}

function generateAIPlaybookJSON(product: ProductData & {
  cs_messages?: any[]; 
  aftersales_messages?: any[];
  google_ads_campaigns?: any[];
  landing_page_context?: any;
  related_landing_pages?: any[];
  product_blogs?: any;
  intelligent_links_repository?: any[];
  company_profile?: any;
}): any {
  return {
    product_id: product.id,
    basic_info: {
      name: product.name,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      price: product.price,
      promo_price: product.promo_price,
      currency: product.currency || 'BRL',
      availability: product.availability || 'in stock',
      condition: product.condition || 'new',
      package_size: product.package_size,
      store_category: product.store_category,
      source_type: product.source_type,
      source_landing_page: product.source_landing_page_id,
      coupons: product.coupons?.map(coupon => ({
        code: coupon.coupon_code,
        discount: coupon.discount_percentage,
        allow_promotions: coupon.allow_promotions
      })) || []
    },
    product_variations: product.variations || [],
    marketing_data: {
      sales_pitch: product.sales_pitch,
      benefits: product.benefits || [],
      features: product.features || [],
      target_audience: product.target_audience || [],
      unique_selling_points: product.benefits?.slice(0, 3) || []
    },
    product_attributes: {
      color: product.color,
      size: product.size,
      material: product.material,
      age_group: product.age_group,
      gender: product.gender
    },
    physical_specifications: {
      weight: product.weight,
      height: product.height,
      width: product.width,
      depth: product.depth,
      unit: 'cm/kg'
    },
    product_codes: {
      gtin: product.gtin,
      ean: product.ean,
      mpn: product.mpn
    },
    seo_data: {
      primary_keywords: product.keywords || [],
      search_intent_keywords: product.search_intent_keywords || [],
      market_keywords: product.market_keywords || [],
      tags: product.tags || [],
      all_categories: product.all_categories || [],
      seo_title: product.seo_title_override,
      seo_description: product.seo_description_override,
      canonical_url: product.canonical_url,
      google_product_category: product.google_product_category
    },
    technical_specs: product.technical_specifications || [],
    faq_knowledge: product.faq || [],
    media_library: {
      product_image: product.image_url,
      images_gallery: product.images_gallery || [],
      product_url: product.product_url,
      
      // VÍDEOS CONSOLIDADOS E NORMALIZADOS
      videos_consolidated: (product as any).consolidatedVideos?.by_platform || {
        youtube: product.youtube_videos || [],
        instagram: product.instagram_videos || [],
        tiktok: product.tiktok_videos || []
      },
      videos_by_category: (product as any).consolidatedVideos?.by_category || {
        tutorials: [],
        technical: product.technical_videos || [],
        testimonials: product.testimonial_videos || [],
        promotional: []
      },
      all_videos: (product as any).consolidatedVideos?.all_videos || [],
      video_sources_summary: (product as any).consolidatedVideos?.sources_summary || {
        youtube: { product: 0, landing_page: 0, company: 0 },
        instagram: { product: 0, landing_page: 0, company: 0 },
        tiktok: { product: 0, landing_page: 0, company: 0 },
        total: 0
      },
      total_videos: (product as any).consolidatedVideos?.sources_summary?.total || 0,
      
      // Arrays originais (compatibilidade)
      youtube_videos: (product as any).consolidatedVideos?.by_platform?.youtube || product.youtube_videos || [],
      instagram_videos: (product as any).consolidatedVideos?.by_platform?.instagram || product.instagram_videos || [],
      tiktok_videos: (product as any).consolidatedVideos?.by_platform?.tiktok || product.tiktok_videos || [],
      technical_videos: (product as any).consolidatedVideos?.by_category?.technical || product.technical_videos || [],
      testimonial_videos: (product as any).consolidatedVideos?.by_category?.testimonials || product.testimonial_videos || [],
      tutorial_videos: (product as any).consolidatedVideos?.by_category?.tutorials || [],
      
      video_captions: product.video_captions || {},
      tutorial_resources: product.tutorial_resources || { tutorials: [] }
    },
    ai_content_history: {
      blog_content: product.individual_blog_content || {},
      whatsapp_messages: {
        messages: (product.whatsapp_messages?.messages || []).map((msg: any) => ({
          content: msg.content || msg.message,
          type: msg.type || 'promotional',
          variation: msg.variation,
          promo_data: msg.promo_data ? {
            has_coupon: !!msg.promo_data.coupon_code,
            coupon_code: msg.promo_data.coupon_code,
            discount_percentage: msg.promo_data.discount_percentage,
            original_price: msg.promo_data.original_price,
            promo_price: msg.promo_data.promo_price,
            savings: msg.promo_data.savings
          } : null
        })),
        total_messages: product.whatsapp_messages?.messages?.length || 0,
        last_generated: product.whatsapp_messages?.last_generated
      },
      whatsapp_sequences: {
        sequences: (product.whatsapp_sequences?.sequences || []).map((seq: any) => ({
          name: seq.name,
          approach: seq.approach || 'educational',
          total_messages: seq.messages?.length || 0,
          messages: (seq.messages || []).map((msg: any) => ({
            day: msg.day,
            message: msg.message,
            content_html: msg.content_html || null,
            has_media: !!msg.media_url,
            media_url: msg.media_url
          }))
        })),
        total_sequences: product.whatsapp_sequences?.sequences?.length || 0,
        last_generated: product.whatsapp_sequences?.last_generated
      },
      youtube_descriptions: {
        descriptions: (product.youtube_descriptions?.descriptions || []).map((desc: any) => ({
          description: desc.description,
          suggested_title: desc.suggested_title || desc.title || null,
          suggested_tags: desc.suggested_tags || desc.tags || [],
          variation: desc.variation,
          video_type: desc.video_type || 'promotional',
          company_footer_template: desc.company_footer_template || desc.footer || null,
          total_length: desc.description?.length || 0
        })),
        total_descriptions: product.youtube_descriptions?.descriptions?.length || 0,
        last_generated: product.youtube_descriptions?.last_generated
      },
      instagram_copies: {
        copies: (product.instagram_copies?.copies || []).map((copy: any) => ({
          copy: copy.copy,
          type: copy.type || 'carousel',
          hashtags: copy.hashtags || [],
          call_to_action: copy.call_to_action || copy.cta || null,
          external_link: copy.external_link || copy.link || null,
          variation: copy.variation,
          total_hashtags: (copy.hashtags || []).length,
          total_length: copy.copy?.length || 0
        })),
        total_copies: product.instagram_copies?.copies?.length || 0,
        last_generated: product.instagram_copies?.last_generated,
        template_config: product.instagram_copies?.template_config || {}
      },
      tiktok_content: {
        copies: (product.tiktok_content?.copies || []).map((copy: any) => ({
          copy: copy.copy,
          hook_3_seconds: copy.hook_3_seconds || copy.hook || null,
          video_script: copy.video_script || copy.script || null,
          call_to_action: copy.call_to_action || copy.cta || null,
          trending_references: copy.trending_references || copy.trends || [],
          hashtags: copy.hashtags || [],
          variation: copy.variation,
          total_length: copy.copy?.length || 0
        })),
        total_copies: product.tiktok_content?.copies?.length || 0,
        last_generated: product.tiktok_content?.last_generated
      }
    },
    ai_automation: {
      bot_trigger_words: product.bot_trigger_words || [],
      use_in_ai_generation: product.use_in_ai_generation
    },
    landing_page_config: {
      show_in_resources: product.show_in_resources,
      selected: product.selected,
      cta_buttons: {
        cta1: product.resource_cta1 || {},
        cta2: product.resource_cta2 || {},
        cta3: product.resource_cta3 || {},
        offer_discount: product.offer_discount_cta || {}
      },
      cta_descriptions: product.resource_descriptions || {}
    },
    customer_success: {
      cs_messages: (product.cs_messages || []).map((msg: any) => ({
        order: msg.message_order,
        content: msg.message_content,
        active: msg.is_active
      })),
      aftersales_messages: (product.aftersales_messages || []).map((msg: any) => ({
        order: msg.message_order,
        content: msg.message_content,
        active: msg.is_active
      }))
    },
    ads: {
      google_ads_campaigns: (product.google_ads_campaigns || []).map((campaign: any) => {
        const config = campaign.config || {};
        const history = campaign.campaign_history?.campaigns || [];
        
        return {
          id: campaign.id,
          campaign_type: campaign.campaign_type || 'landing_page',
          last_exported: campaign.last_exported,
          
          configuration: {
            enabled: config.enabled || false,
            type: config.type || 'search',
            objective: config.objective || 'leads',
            daily_budget_brl: config.daily_budget_brl || 0,
            locations: config.locations || [],
            languages: config.languages || ['pt'],
            
            bidding: {
              strategy: config.bidding?.strategy || 'MAX_CONV',
              target: config.bidding?.target || null
            },
            
            keywords: {
              include_ai_keywords: config.include_ai_keywords !== false,
              include_faq_longtail: config.include_faq_longtail !== false,
              extra_keywords: config.extra_keywords || [],
              negatives: config.negatives || []
            },
            
            sitelinks: {
              ecommerce_links: config.ecommerce_links || [],
              include_brand_policies: config.include_brand_policies !== false,
              custom_institutional_links: config.custom_institutional_links || []
            },
            
            youtube_videos: config.youtube_videos || [],
            
            utm_parameters: config.utm || {},
            
            schedule: config.schedule || null
          },
          
          campaign_history: {
            total_versions: history.length,
            last_generated: campaign.campaign_history?.last_generated || null,
            versions: history.map((h: any) => ({
              generated_at: h.generated_at,
              campaign_name: h.campaign_name,
              ad_groups_count: h.ad_groups?.length || 0,
              keywords_count: h.keywords?.length || 0,
              sitelinks_count: h.sitelinks?.length || 0,
              videos_count: h.videos?.length || 0,
              ad_copies: h.ad_copies ? {
                headlines: h.ad_copies.headlines || [],
                descriptions: h.ad_copies.descriptions || [],
                paths: h.ad_copies.paths || [],
                total_headlines: h.ad_copies.headlines?.length || 0,
                total_descriptions: h.ad_copies.descriptions?.length || 0,
                total_paths: h.ad_copies.paths?.length || 0
              } : null,
              warnings: h.warnings || []
            }))
          }
        };
      })
    },
    landing_page_context: product.landing_page_context || null,
    
    // Video Testimonials Detailed (NOVO)
    video_testimonials_detailed: product.landing_page_context?.video_testimonials?.map((t: any) => ({
      id: t.id,
      client_info: {
        name: t.client_name,
        profession: t.profession,
        location: t.location,
        state: t.state,
        specialty: t.specialty
      },
      content: {
        testimonial_text: t.testimonial_text,
        youtube_url: t.youtube_url,
        instagram_url: t.instagram_url
      },
      ai_analysis: {
        keywords: t.ai_keywords || [],
        extracted_benefits: t.ai_extracted_benefits || [],
        sentiment_score: t.sentiment_score
      },
      transcription: t.caption_data || {},
      metadata: {
        approved: t.approved,
        display_order: t.display_order,
        created_at: t.created_at,
        updated_at: t.updated_at
      }
    })) || [],
    
    // Company Context (NOVO)
    company_context: product.company_profile ? {
      basic_info: {
        company_name: product.company_profile.company_name,
        company_description: product.company_profile.company_description,
        business_sector: product.company_profile.business_sector,
        founded_year: product.company_profile.founded_year,
        team_size: product.company_profile.team_size,
        location: product.company_profile.location
      },
      positioning: {
        mission_statement: product.company_profile.mission_statement,
        vision_statement: product.company_profile.vision_statement,
        brand_values: product.company_profile.brand_values,
        target_audience: product.company_profile.target_audience,
        main_products_services: product.company_profile.main_products_services,
        differentiators: product.company_profile.differentiators,
        working_methodology: product.company_profile.working_methodology,
        delivery_approach: product.company_profile.delivery_approach,
        company_culture: product.company_profile.company_culture
      },
      contact: {
        website_url: product.company_profile.website_url,
        contact_email: product.company_profile.contact_email,
        contact_phone: product.company_profile.contact_phone,
        company_logo_url: product.company_profile.company_logo_url
      },
      social_media: product.company_profile.social_media_links || [],
      seo: {
        market_positioning: product.company_profile.seo_market_positioning,
        competitive_advantages: product.company_profile.seo_competitive_advantages,
        technical_expertise: product.company_profile.seo_technical_expertise,
        service_areas: product.company_profile.seo_service_areas,
        context_keywords: product.company_profile.seo_context_keywords || [],
        domains: product.company_profile.seo_domains || [],
        youtube_footer: product.company_profile.youtube_company_footer
      },
      institutional_links: product.company_profile.institutional_links || [],
      tracking: product.company_profile.tracking_pixels || {},
      reviews: {
        manual_reviews: product.company_profile.company_reviews?.manual_reviews || [],
        google_place_id: product.company_profile.company_reviews?.google_place_id,
        google_reviews_imported: product.company_profile.company_reviews?.google_reviews_imported
      },
      social_channels: {
        youtube_channel: product.company_profile.youtube_channel,
        instagram_profile: product.company_profile.instagram_profile
      },
      company_videos: product.company_profile.company_videos || []
    } : null,
    
    product_blogs: {
      commercial_blog: {
        content: product.product_blogs?.commercial || null,
        preview: product.product_blogs?.commercial ? (product.product_blogs.commercial.substring(0, 200) + '...') : 'N/A',
        has_content: !!product.product_blogs?.commercial,
        intelligent_links: extractIntelligentLinks(product.product_blogs?.commercial || ''),
        ctas: extractCTAs(product.product_blogs?.commercial || '')
      },
      technical_blog: {
        content: product.product_blogs?.technical || null,
        preview: product.product_blogs?.technical ? (product.product_blogs.technical.substring(0, 200) + '...') : 'N/A',
        has_content: !!product.product_blogs?.technical,
        intelligent_links: extractIntelligentLinks(product.product_blogs?.technical || ''),
        ctas: extractCTAs(product.product_blogs?.technical || '')
      },
      generated_at: product.product_blogs?.generated_at || null
    },
    related_landing_pages: {
      count: product.related_landing_pages?.length || 0,
      landing_pages: product.related_landing_pages?.map((lp: any) => ({
        id: lp.id,
        name: lp.name,
        status: lp.status,
        seo_title: lp.data?.seo?.seo_title || null,
        canonical_url: lp.data?.seo?.canonical_url || null,
        has_embed: !!lp.embed
      })) || []
    },
    intelligent_links_repository: {
      total_links: (product.intelligent_links_repository || []).length,
      by_category: groupLinksByCategory(product.intelligent_links_repository || []),
      by_keyword_type: groupLinksByType(product.intelligent_links_repository || []),
      top_links: (product.intelligent_links_repository || [])
        .slice(0, 20)
        .map((link: any) => ({
          name: link.name,
          url: link.url,
          description: link.description,
          category: link.category,
          subcategory: link.subcategory,
          keyword_type: link.keyword_type,
          search_intent: link.search_intent,
          monthly_searches: link.monthly_searches,
          cpc_estimate: link.cpc_estimate,
          competition_level: link.competition_level,
          relevance_score: link.relevance_score,
          related_keywords: link.related_keywords || [],
          usage_stats: {
            usage_count: link.usage_count || 0,
            last_used_at: link.last_used_at
          },
          ai_generated: link.ai_generated || false,
          source_products: link.source_products || []
        })),
      all_links: (product.intelligent_links_repository || []).map((link: any) => ({
        id: link.id,
        name: link.name,
        url: link.url,
        category: link.category,
        keyword_type: link.keyword_type,
        search_intent: link.search_intent,
        relevance_score: link.relevance_score
      }))
    },
    customer_service_prompts: [
      `Produto: ${product.name}`,
      `Categoria: ${product.category}${product.subcategory ? ` > ${product.subcategory}` : ''}`,
      `Preço: ${product.price ? `R$ ${product.price}` : 'Consulte'}${product.promo_price ? ` | Promoção: R$ ${product.promo_price}` : ''}`,
      `Principais benefícios: ${product.benefits?.join(', ') || 'N/A'}`,
      `Características: ${product.features?.join(', ') || 'N/A'}`,
      `Público-alvo: ${product.target_audience?.join(', ') || 'N/A'}`,
      `Palavras-chave para IA: ${product.keywords?.join(', ') || 'N/A'}`,
      `Trigger words para chatbot: ${product.bot_trigger_words?.join(', ') || 'N/A'}`
    ],
    quality_flags: {
      approved: product.approved,
      use_in_ai_generation: product.use_in_ai_generation,
      seo_enhanced: product.seo_enhanced,
      ai_generated_keywords: product.ai_generated_keywords,
      ai_generated_benefits: product.ai_generated_benefits,
      ai_generated_category: product.ai_generated_category,
      ai_generated_features: product.ai_generated_features,
      has_ai_content: !!(product.individual_blog_content?.commercial || product.individual_blog_content?.technical),
      content_completeness: calculateCompleteness(product)
    },
    generated_at: new Date().toISOString(),
    export_version: "2.0"
  };
}

/**
 * Extrai links inteligentes de conteúdo de blog
 */
function extractIntelligentLinks(blogContent: string): Array<{url: string; anchor: string; position: number}> {
  if (!blogContent) return [];
  
  const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  const links: Array<{url: string; anchor: string; position: number}> = [];
  let match;
  
  while ((match = linkRegex.exec(blogContent)) !== null) {
    links.push({
      url: match[1],
      anchor: match[2],
      position: match.index
    });
  }
  
  return links;
}

/**
 * Extrai CTAs de conteúdo de blog
 */
function extractCTAs(blogContent: string): Array<{text: string; url?: string; type: string}> {
  if (!blogContent) return [];
  
  const ctas: Array<{text: string; url?: string; type: string}> = [];
  
  // CTAs com links
  const ctaLinkRegex = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*cta[^"]*"[^>]*>([^<]+)<\/a>/gi;
  let match;
  while ((match = ctaLinkRegex.exec(blogContent)) !== null) {
    ctas.push({ text: match[2], url: match[1], type: 'link' });
  }
  
  // Botões CTA
  const ctaButtonRegex = /<button[^>]*class="[^"]*cta[^"]*"[^>]*>([^<]+)<\/button>/gi;
  while ((match = ctaButtonRegex.exec(blogContent)) !== null) {
    ctas.push({ text: match[1], type: 'button' });
  }
  
  return ctas;
}

function generatePlaybookTXT(product: ProductData & {
  cs_messages?: any[]; 
  aftersales_messages?: any[];
  google_ads_campaigns?: any[];
  landing_page_context?: any;
  related_landing_pages?: any[];
  product_blogs?: any;
  company_profile?: any;
}): string {
  const json = generateAIPlaybookJSON(product);
  
  return `# PLAYBOOK DO PRODUTO: ${product.name}
==================================================

## 📋 INFORMAÇÕES BÁSICAS
- Nome: ${product.name}
- Categoria: ${product.category}${product.subcategory ? ` > ${product.subcategory}` : ''}
- Marca: ${product.brand || 'N/A'}
- Preço: ${product.price ? `R$ ${product.price}` : 'Consulte'}${product.promo_price ? ` | 🔥 PROMOÇÃO: R$ ${product.promo_price}` : ''}
- Disponibilidade: ${product.availability || 'Em estoque'}
- Condição: ${product.condition || 'Novo'}
- Origem: ${product.source_type || 'N/A'}${product.source_landing_page_id ? ` (Landing Page: ${product.source_landing_page_id})` : ''}
${product.package_size ? `- Tamanho da Embalagem: ${product.package_size}` : ''}
${product.store_category ? `- Categoria na Loja: ${product.store_category}` : ''}

## 🎟️ CUPONS DISPONÍVEIS
${product.coupons?.length ? product.coupons.map((coupon: any) => 
  `- 📌 ${coupon.coupon_code} → ${coupon.discount_percentage}% de desconto ${coupon.allow_promotions ? '(Válido em promoções)' : '(Não válido em promoções)'}`
).join('\n') : '- ❌ Nenhum cupom cadastrado'}

## 📦 VARIAÇÕES DO PRODUTO
${product.variations?.length ? product.variations.map((v: any) => 
  `- ${v.name || v.title}: R$ ${v.price || 'Consulte'}`
).join('\n') : '- Sem variações cadastradas'}

## 🏷️ CÓDIGOS DO PRODUTO (E-COMMERCE)
- GTIN: ${product.gtin || 'N/A'}
- EAN: ${product.ean || 'N/A'}
- MPN: ${product.mpn || 'N/A'}

## 📐 DIMENSÕES E PESO
- Peso: ${product.weight ? `${product.weight} kg` : 'N/A'}
- Altura: ${product.height ? `${product.height} cm` : 'N/A'}
- Largura: ${product.width ? `${product.width} cm` : 'N/A'}
- Profundidade: ${product.depth ? `${product.depth} cm` : 'N/A'}

## 🎨 ATRIBUTOS DO PRODUTO
- Cor: ${product.color || 'N/A'}
- Tamanho: ${product.size || 'N/A'}
- Material: ${product.material || 'N/A'}
- Faixa Etária: ${product.age_group || 'N/A'}
- Gênero: ${product.gender || 'N/A'}

## 🎯 DESCRIÇÃO DO PRODUTO
${product.description || 'Descrição não disponível'}

## 💡 PITCH DE VENDAS
${product.sales_pitch || 'Pitch não disponível'}

## ✨ PRINCIPAIS BENEFÍCIOS
${product.benefits?.map(benefit => `- ${benefit}`).join('\n') || '- Benefícios não definidos'}

## 🔧 CARACTERÍSTICAS PRINCIPAIS
${product.features?.map(feature => `- ${feature}`).join('\n') || '- Características não definidas'}

## 🎯 PÚBLICO-ALVO
${product.target_audience?.map(audience => `- ${audience}`).join('\n') || '- Público-alvo não definido'}

## 📊 ESPECIFICAÇÕES TÉCNICAS
${product.technical_specifications?.map(spec => `- ${spec.label}: ${spec.value}`).join('\n') || '- Especificações não disponíveis'}

## ❓ PERGUNTAS FREQUENTES (FAQ)

${product.faq?.length ? 
  product.faq.map((item: any, idx: number) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${idx + 1}. ❓ ${item.question}

✅ RESPOSTA:
${item.answer}

  `).join('\n') 
: '📭 FAQ não disponível'}

📌 Total de Perguntas: ${product.faq?.length || 0}

## 🔍 PALAVRAS-CHAVE PARA IA

### Keywords Principais:
${product.keywords?.join(', ') || 'N/A'}

### Keywords de Intenção de Busca:
${product.search_intent_keywords?.join(', ') || 'N/A'}

### Keywords de Mercado:
${product.market_keywords?.join(', ') || 'N/A'}

### Tags:
${product.tags?.join(', ') || 'N/A'}

### Todas as Categorias:
${product.all_categories?.join(' > ') || 'N/A'}

### Categoria Google Merchant:
${product.google_product_category || 'N/A'}

## 🤖 AUTOMAÇÃO IA - TRIGGER WORDS (CHATBOT)
${product.bot_trigger_words?.length ? product.bot_trigger_words.map(word => `- "${word}"`).join('\n') : '- Nenhuma trigger word configurada'}
- Status IA: ${product.use_in_ai_generation ? '✅ HABILITADO' : '❌ DESABILITADO'}

## 📱 CONTEÚDO IA GERADO
${'='.repeat(80)}

### 📝 Blog Content:
${product.individual_blog_content?.commercial ? '✅ Blog Comercial Disponível' : '❌ Blog Comercial Pendente'}
${product.individual_blog_content?.technical ? '✅ Blog Técnico Disponível' : '❌ Blog Técnico Pendente'}
${product.individual_blog_content?.generated_at ? `📅 Gerado em: ${new Date(product.individual_blog_content.generated_at).toLocaleString('pt-BR')}` : ''}

### 💬 WhatsApp Messages:
${product.whatsapp_messages?.messages?.length ? `
✅ ${product.whatsapp_messages.messages.length} mensagens geradas
${product.whatsapp_messages.messages.slice(0, 3).map((msg: any, idx: number) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mensagem ${idx + 1} (${msg.type || 'promotional'}):
${msg.content || msg.message}
${msg.promo_data ? `
💰 Dados Promocionais:
  • Cupom: ${msg.promo_data.coupon_code || 'N/A'}
  • Desconto: ${msg.promo_data.discount_percentage || 0}%
  • Preço Original: R$ ${msg.promo_data.original_price || 'N/A'}
  • Preço Promo: R$ ${msg.promo_data.promo_price || 'N/A'}
  • Economia: R$ ${msg.promo_data.savings || 'N/A'}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`).join('\n')}
${product.whatsapp_messages.messages.length > 3 ? `\n... e mais ${product.whatsapp_messages.messages.length - 3} mensagens` : ''}
` : '❌ Mensagens pendentes'}
${product.whatsapp_messages?.last_generated ? `📅 Última geração: ${new Date(product.whatsapp_messages.last_generated).toLocaleString('pt-BR')}` : ''}

### 🔄 WhatsApp Sequences (Sequências):
${product.whatsapp_sequences?.sequences?.length ? `
✅ ${product.whatsapp_sequences.sequences.length} sequências geradas
${product.whatsapp_sequences.sequences.map((seq: any, idx: number) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sequência ${idx + 1}: ${seq.name}
Abordagem: ${seq.approach || 'educational'}
Total de Mensagens: ${seq.messages?.length || 0}

${seq.messages?.slice(0, 2).map((msg: any) => `
  📅 Dia ${msg.day}:
  ${msg.message}
  ${msg.content_html ? '[HTML disponível]' : ''}
  ${msg.media_url ? `📎 Mídia: ${msg.media_url}` : ''}
`).join('\n')}
${seq.messages?.length > 2 ? `  ... e mais ${seq.messages.length - 2} mensagens` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`).join('\n')}
` : '❌ Sequências pendentes'}
${product.whatsapp_sequences?.last_generated ? `📅 Última geração: ${new Date(product.whatsapp_sequences.last_generated).toLocaleString('pt-BR')}` : ''}

### 📺 YouTube Descriptions:
${product.youtube_descriptions?.descriptions?.length ? `
✅ ${product.youtube_descriptions.descriptions.length} descrições geradas
${product.youtube_descriptions.descriptions.slice(0, 2).map((desc: any, idx: number) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Descrição ${idx + 1} (${desc.video_type || 'promotional'}):

📌 Título Sugerido: ${desc.suggested_title || desc.title || 'N/A'}

📝 Descrição:
${desc.description ? (desc.description.substring(0, 300) + '...') : 'N/A'}

🏷️ Tags Sugeridas:
${(desc.suggested_tags || desc.tags || []).slice(0, 10).join(', ')}${(desc.suggested_tags || desc.tags || []).length > 10 ? ` e mais ${(desc.suggested_tags || desc.tags).length - 10}` : ''}

${desc.company_footer_template || desc.footer ? `
📍 Rodapé da Empresa:
${desc.company_footer_template || desc.footer ? ((desc.company_footer_template || desc.footer).substring(0, 200) + '...') : 'N/A'}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`).join('\n')}
${product.youtube_descriptions.descriptions.length > 2 ? `\n... e mais ${product.youtube_descriptions.descriptions.length - 2} descrições` : ''}
` : '❌ Descrições pendentes'}
${product.youtube_descriptions?.last_generated ? `📅 Última geração: ${new Date(product.youtube_descriptions.last_generated).toLocaleString('pt-BR')}` : ''}

### 📸 Instagram Copies:
${product.instagram_copies?.copies?.length ? `
✅ ${product.instagram_copies.copies.length} copies gerados
${product.instagram_copies.copies.slice(0, 2).map((copy: any, idx: number) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Copy ${idx + 1} (${copy.type || 'carousel'}):

${copy.copy ? (copy.copy.substring(0, 200) + '...') : 'N/A'}

🏷️ Hashtags (${(copy.hashtags || []).length}):
${(copy.hashtags || []).slice(0, 10).join(' ')}${(copy.hashtags || []).length > 10 ? ` +${(copy.hashtags || []).length - 10}` : ''}

${copy.call_to_action || copy.cta ? `📢 CTA: ${copy.call_to_action || copy.cta}` : ''}
${copy.external_link || copy.link ? `🔗 Link: ${copy.external_link || copy.link}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`).join('\n')}
${product.instagram_copies.copies.length > 2 ? `\n... e mais ${product.instagram_copies.copies.length - 2} copies` : ''}
` : '❌ Copies pendentes'}
${product.instagram_copies?.last_generated ? `📅 Última geração: ${new Date(product.instagram_copies.last_generated).toLocaleString('pt-BR')}` : ''}

### 🎵 TikTok Content:
${product.tiktok_content?.copies?.length ? `
✅ ${product.tiktok_content.copies.length} conteúdos gerados
${product.tiktok_content.copies.slice(0, 2).map((copy: any, idx: number) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Conteúdo ${idx + 1}:

${copy.hook_3_seconds || copy.hook ? `🎣 Hook (3 seg): "${copy.hook_3_seconds || copy.hook}"` : ''}

${copy.video_script || copy.script ? `
🎬 Script do Vídeo:
${copy.video_script || copy.script ? ((copy.video_script || copy.script).substring(0, 200) + '...') : 'N/A'}
` : ''}

📝 Copy:
${copy.copy ? (copy.copy.substring(0, 200) + '...') : 'N/A'}

${copy.call_to_action || copy.cta ? `📢 CTA: ${copy.call_to_action || copy.cta}` : ''}

${(copy.trending_references || copy.trends || []).length > 0 ? `
🔥 Tendências Usadas:
${(copy.trending_references || copy.trends).slice(0, 3).map((t: any) => `  • ${t}`).join('\n')}
` : ''}

🏷️ Hashtags: ${(copy.hashtags || []).slice(0, 5).join(' ')}${(copy.hashtags || []).length > 5 ? ` +${(copy.hashtags || []).length - 5}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`).join('\n')}
${product.tiktok_content.copies.length > 2 ? `\n... e mais ${product.tiktok_content.copies.length - 2} conteúdos` : ''}
` : '❌ Conteúdo pendente'}
${product.tiktok_content?.last_generated ? `📅 Última geração: ${new Date(product.tiktok_content.last_generated).toLocaleString('pt-BR')}` : ''}

## 📝 BLOGS INDIVIDUAIS DO PRODUTO
${'='.repeat(80)}

### Blog Comercial:
${product.product_blogs?.commercial ? `
✅ Disponível

Conteúdo (Preview):
${product.product_blogs.commercial ? (product.product_blogs.commercial.substring(0, 500) + '...') : 'N/A'}

${(product as any).product_blogs?.commercial_intelligent_links?.length > 0 ? `
🔗 Links Inteligentes (${(product as any).product_blogs.commercial_intelligent_links.length}):
${(product as any).product_blogs.commercial_intelligent_links.slice(0, 3).map((link: any) => 
  `  • ${link.anchor} → ${link.url}`
).join('\n')}
${(product as any).product_blogs.commercial_intelligent_links.length > 3 ? `  ... e mais ${(product as any).product_blogs.commercial_intelligent_links.length - 3} links` : ''}
` : ''}

${(product as any).product_blogs?.commercial_ctas?.length > 0 ? `
📢 CTAs Detectados (${(product as any).product_blogs.commercial_ctas.length}):
${(product as any).product_blogs.commercial_ctas.map((cta: any) => 
  `  • [${cta.type}] ${cta.text}${cta.url ? ` → ${cta.url}` : ''}`
).join('\n')}
` : ''}

[Conteúdo completo disponível no JSON]
` : '❌ Blog comercial não gerado'}

### Blog Técnico:
${product.product_blogs?.technical ? `
✅ Disponível

Conteúdo (Preview):
${product.product_blogs.technical ? (product.product_blogs.technical.substring(0, 500) + '...') : 'N/A'}

${(product as any).product_blogs?.technical_intelligent_links?.length > 0 ? `
🔗 Links Inteligentes (${(product as any).product_blogs.technical_intelligent_links.length}):
${(product as any).product_blogs.technical_intelligent_links.slice(0, 3).map((link: any) => 
  `  • ${link.anchor} → ${link.url}`
).join('\n')}
${(product as any).product_blogs.technical_intelligent_links.length > 3 ? `  ... e mais ${(product as any).product_blogs.technical_intelligent_links.length - 3} links` : ''}
` : ''}

${(product as any).product_blogs?.technical_ctas?.length > 0 ? `
📢 CTAs Detectados (${(product as any).product_blogs.technical_ctas.length}):
${(product as any).product_blogs.technical_ctas.map((cta: any) => 
  `  • [${cta.type}] ${cta.text}${cta.url ? ` → ${cta.url}` : ''}`
).join('\n')}
` : ''}

[Conteúdo completo disponível no JSON]
` : '❌ Blog técnico não gerado'}

${product.product_blogs?.generated_at ? `📅 Gerado em: ${new Date(product.product_blogs.generated_at).toLocaleString('pt-BR')}` : ''}

## 🔗 LINKS E MÍDIA

### URLs:
- URL do Produto: ${product.product_url || 'N/A'}
- URL Canônica (SEO): ${product.canonical_url || 'N/A'}

### Imagens:
- Imagem Principal: ${product.image_url || 'N/A'}
- Galeria de Imagens: ${product.images_gallery?.length ? `${product.images_gallery.length} imagens` : 'Sem galeria'}

## 🎥 VÍDEOS E TUTORIAIS
${'='.repeat(80)}

Links de Vídeos: ${(product as any).consolidatedVideos?.sources_summary?.total || 0} vídeos cadastrados

${(product as any).consolidatedVideos?.by_category?.tutorials?.length > 0 ? `
📚 TUTORIAIS (${(product as any).consolidatedVideos.by_category.tutorials.length}):
${(product as any).consolidatedVideos.by_category.tutorials.map((v: any, i: number) => `
  ${i+1}. ${v.description}
     URL: ${v.url}
     Plataforma: ${v.platform} | Fonte: ${v.source}
`).join('')}
` : ''}

${(product as any).consolidatedVideos?.by_category?.technical?.length > 0 ? `
🔬 VÍDEOS TÉCNICOS (${(product as any).consolidatedVideos.by_category.technical.length}):
${(product as any).consolidatedVideos.by_category.technical.map((v: any, i: number) => `
  ${i+1}. ${v.description}
     URL: ${v.url}
     Plataforma: ${v.platform} | Fonte: ${v.source}
`).join('')}
` : ''}

${(product as any).consolidatedVideos?.by_category?.testimonials?.length > 0 ? `
🎥 DEPOIMENTOS (${(product as any).consolidatedVideos.by_category.testimonials.length}):
${(product as any).consolidatedVideos.by_category.testimonials.map((v: any, i: number) => `
  ${i+1}. ${v.description}
     URL: ${v.url}
     Plataforma: ${v.platform} | Fonte: ${v.source}
`).join('')}
` : ''}

${(product as any).consolidatedVideos?.by_category?.promotional?.length > 0 ? `
📢 VÍDEOS PROMOCIONAIS (${(product as any).consolidatedVideos.by_category.promotional.length}):
${(product as any).consolidatedVideos.by_category.promotional.map((v: any, i: number) => `
  ${i+1}. ${v.description ? (v.description.substring(0, 80) + '...') : 'N/A'}
     URL: ${v.url}
     Plataforma: ${v.platform} | Fonte: ${v.source}
`).join('')}
` : ''}

📊 RESUMO DE FONTES:
${(product as any).consolidatedVideos?.sources_summary ? `
  • YouTube: ${(product as any).consolidatedVideos.sources_summary.youtube.product + (product as any).consolidatedVideos.sources_summary.youtube.landing_page + (product as any).consolidatedVideos.sources_summary.youtube.company} vídeos (${(product as any).consolidatedVideos.sources_summary.youtube.product} produto + ${(product as any).consolidatedVideos.sources_summary.youtube.landing_page} LP + ${(product as any).consolidatedVideos.sources_summary.youtube.company} empresa)
  • Instagram: ${(product as any).consolidatedVideos.sources_summary.instagram.product + (product as any).consolidatedVideos.sources_summary.instagram.landing_page + (product as any).consolidatedVideos.sources_summary.instagram.company} vídeos (${(product as any).consolidatedVideos.sources_summary.instagram.product} produto + ${(product as any).consolidatedVideos.sources_summary.instagram.landing_page} LP + ${(product as any).consolidatedVideos.sources_summary.instagram.company} empresa)
  • TikTok: ${(product as any).consolidatedVideos.sources_summary.tiktok.product + (product as any).consolidatedVideos.sources_summary.tiktok.landing_page + (product as any).consolidatedVideos.sources_summary.tiktok.company} vídeos (${(product as any).consolidatedVideos.sources_summary.tiktok.product} produto + ${(product as any).consolidatedVideos.sources_summary.tiktok.landing_page} LP + ${(product as any).consolidatedVideos.sources_summary.tiktok.company} empresa)
  • TOTAL: ${(product as any).consolidatedVideos.sources_summary.total} vídeos únicos
` : 'Nenhum vídeo consolidado'}

${Object.keys(product.video_captions || {}).length > 0 ? `
#### 📝 LEGENDAS EXTRAÍDAS (${Object.keys(product.video_captions).length} vídeos):
${Object.entries(product.video_captions || {}).map(([videoId, captions]: [string, any]) => `
  - ${videoId}: ${captions?.text ? (captions.text.substring(0, 100) + '...') : 'Sem texto'}
`).join('\n')}
` : ''}

## 🎁 CONFIGURAÇÃO DE LANDING PAGE

### Status:
- Mostrar em Recursos: ${product.show_in_resources ? '✅ Sim' : '❌ Não'}
- Produto Selecionado: ${product.selected ? '✅ Sim' : '❌ Não'}

### CTAs Configurados:
${product.resource_cta1?.visible ? `1️⃣ ${product.resource_cta1.label || 'CTA 1'} → ${product.resource_cta1.url || 'URL não definida'}
   Descrição: ${product.resource_descriptions?.cta1 || 'Sem descrição'}` : '1️⃣ CTA 1: ❌ Não configurado'}

${product.resource_cta2?.visible ? `2️⃣ ${product.resource_cta2.label || 'CTA 2'} → ${product.resource_cta2.url || 'URL não definida'}
   Descrição: ${product.resource_descriptions?.cta2 || 'Sem descrição'}` : '2️⃣ CTA 2: ❌ Não configurado'}

${product.resource_cta3?.visible ? `3️⃣ ${product.resource_cta3.label || 'CTA 3'} → ${product.resource_cta3.url || 'URL não definida'}
   Descrição: ${product.resource_descriptions?.cta3 || 'Sem descrição'}` : '3️⃣ CTA 3: ❌ Não configurado'}

${product.offer_discount_cta?.visible ? `🔥 ${product.offer_discount_cta.label || 'Comprar com Desconto'} → ${product.offer_discount_cta.url || 'URL não definida'}` : '🔥 CTA Desconto: ❌ Não configurado'}

## 🔗 REPOSITÓRIO DE LINKS INTELIGENTES (${(product.intelligent_links_repository || []).length} links)

### 📊 Distribuição por Categoria:
${Object.entries(groupLinksByCategory(product.intelligent_links_repository || []))
  .map(([cat, count]) => `- ${cat}: ${count} links`)
  .join('\n') || '- Nenhuma categoria'}

### 🎯 Distribuição por Tipo de Keyword:
${Object.entries(groupLinksByType(product.intelligent_links_repository || []))
  .map(([type, count]) => `- ${type}: ${count} links`)
  .join('\n') || '- Nenhum tipo definido'}

### 🔝 TOP 20 LINKS MAIS RELEVANTES:

${(product.intelligent_links_repository || [])
  .slice(0, 20)
  .map((link: any, idx: number) => `
${idx + 1}. **${link.name}**
   🔗 URL: ${link.url}
   📂 Categoria: ${link.category}${link.subcategory ? ` > ${link.subcategory}` : ''}
   🎯 Tipo: ${link.keyword_type || 'N/A'} | Intenção: ${link.search_intent || 'N/A'}
   📊 Relevância: ${link.relevance_score || 0}/100
   📈 Buscas/mês: ${link.monthly_searches || 'N/A'} | CPC: R$ ${link.cpc_estimate || 'N/A'}
   🔥 Concorrência: ${link.competition_level || 'N/A'}
   📝 ${link.description || 'Sem descrição'}
   🤖 Gerado por IA: ${link.ai_generated ? 'SIM' : 'NÃO'}
   📊 Usado ${link.usage_count || 0} vezes${link.last_used_at ? ` | Última vez: ${new Date(link.last_used_at).toLocaleDateString('pt-BR')}` : ''}
   ${link.related_keywords?.length ? `🏷️ Keywords relacionadas: ${link.related_keywords.join(', ')}` : ''}
`).join('\n---\n') || '- Nenhum link disponível'}

### 📋 LISTA COMPLETA DE LINKS (${(product.intelligent_links_repository || []).length} total):
${(product.intelligent_links_repository || [])
  .map((link: any) => `- [${link.keyword_type || '?'}] ${link.name} → ${link.url} (Relevância: ${link.relevance_score || 0})`)
  .join('\n') || '- Nenhum link disponível'}

## 💬 MENSAGENS DE CS (CUSTOMER SUCCESS)
${(product.cs_messages && product.cs_messages.length > 0) ? 
  product.cs_messages.map((msg: any, idx: number) => 
    `${idx + 1}. [Ordem ${msg.message_order}] ${msg.message_content}${msg.is_active ? '' : ' (INATIVA)'}`
  ).join('\n') : '📭 Nenhuma mensagem de CS configurada'}

## 📦 MENSAGENS DE PÓS-VENDA
${(product.aftersales_messages && product.aftersales_messages.length > 0) ? 
  product.aftersales_messages.map((msg: any, idx: number) => 
    `${idx + 1}. [Ordem ${msg.message_order}] ${msg.message_content}${msg.is_active ? '' : ' (INATIVA)'}`
  ).join('\n') : '📭 Nenhuma mensagem de pós-venda configurada'}

${(product.google_ads_campaigns || []).length > 0 ? `

${'='.repeat(80)}
## 📢 GOOGLE ADS - CAMPANHAS CONFIGURADAS
${'='.repeat(80)}

Total de Campanhas: ${(product.google_ads_campaigns || []).length}

${(product.google_ads_campaigns || []).map((campaign: any, idx: number) => {
  const config = campaign.config || {};
  const history = campaign.campaign_history?.campaigns || [];
  
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPANHA ${idx + 1}: ${campaign.campaign_type?.toUpperCase() || 'LANDING PAGE'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONFIGURAÇÃO GERAL:
  • Status: ${config.enabled ? '🟢 HABILITADA' : '🔴 DESABILITADA'}
  • Tipo: ${config.type || 'search'}
  • Objetivo: ${config.objective || 'leads'}
  • Orçamento Diário: R$ ${config.daily_budget_brl || 0}
  • Localizações: ${(config.locations || []).join(', ') || 'N/A'}
  • Idiomas: ${(config.languages || ['pt']).join(', ')}
  • Última Exportação: ${campaign.last_exported ? new Date(campaign.last_exported).toLocaleString('pt-BR') : 'Nunca exportada'}

💰 ESTRATÉGIA DE LANCE:
  • Estratégia: ${config.bidding?.strategy || 'MAX_CONV'}
  ${config.bidding?.target ? `• Meta: R$ ${config.bidding.target}` : ''}

🔑 KEYWORDS:
  • Incluir Keywords IA: ${config.include_ai_keywords !== false ? '✅' : '❌'}
  • Incluir FAQ Long-tail: ${config.include_faq_longtail !== false ? '✅' : '❌'}
  • Keywords Extras: ${(config.extra_keywords || []).length} keywords
  • Negativas: ${(config.negatives || []).length} keywords

🔗 SITELINKS:
  • Links E-commerce: ${(config.ecommerce_links || []).length}
  • Incluir Políticas da Marca: ${config.include_brand_policies !== false ? '✅' : '❌'}
  • Links Institucionais Customizados: ${(config.custom_institutional_links || []).length}

🎥 VÍDEOS YOUTUBE:
  • Total de vídeos: ${(config.youtube_videos || []).length}

📊 UTM PARAMETERS:
  ${config.utm ? Object.entries(config.utm).map(([key, value]) => `• ${key}: ${value}`).join('\n  ') : '• Nenhum UTM configurado'}

📅 AGENDAMENTO:
  ${config.schedule ? `
  • Data Início: ${config.schedule.start || 'Não definida'}
  • Data Fim: ${config.schedule.end || 'Indefinida'}
  • Horários: ${(config.schedule.ad_schedules || []).join(', ') || 'Sempre ativo'}
  ` : '• Sem agendamento específico'}

${history.length > 0 ? `
📜 HISTÓRICO DE CAMPANHAS (${history.length} versões):

${history.slice(0, 3).map((h: any, hIdx: number) => `
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VERSÃO ${hIdx + 1} - ${new Date(h.generated_at).toLocaleDateString('pt-BR')}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  📌 Nome da Campanha: ${h.campaign_name}
  📊 Estatísticas:
    • Ad Groups: ${h.ad_groups?.length || 0}
    • Keywords: ${h.keywords?.length || 0}
    • Sitelinks: ${h.sitelinks?.length || 0}
    • Vídeos: ${h.videos?.length || 0}
  
  ${h.ad_copies ? `
  ✍️ AD COPIES GERADOS:
  
  📰 Headlines (${h.ad_copies.headlines?.length || 0}):
  ${(h.ad_copies.headlines || []).slice(0, 5).map((headline: string, i: number) => 
    `    ${i + 1}. ${headline}`
  ).join('\n  ')}
  ${(h.ad_copies.headlines || []).length > 5 ? `    ... e mais ${(h.ad_copies.headlines || []).length - 5} headlines` : ''}
  
  📝 Descriptions (${h.ad_copies.descriptions?.length || 0}):
  ${(h.ad_copies.descriptions || []).slice(0, 3).map((desc: string, i: number) => 
    `    ${i + 1}. ${desc}`
  ).join('\n  ')}
  ${(h.ad_copies.descriptions || []).length > 3 ? `    ... e mais ${(h.ad_copies.descriptions || []).length - 3} descriptions` : ''}
  
  🔗 Paths (${h.ad_copies.paths?.length || 0}):
  ${(h.ad_copies.paths || []).map((path: string) => `    • ${path}`).join('\n  ')}
  ` : '  ⚠️ Ad copies não disponíveis nesta versão'}
  
  ${(h.warnings || []).length > 0 ? `
  ⚠️ AVISOS:
  ${h.warnings.map((w: any) => `    • [${w.type?.toUpperCase()}] ${w.message}`).join('\n  ')}
  ` : ''}
`).join('\n')}

${history.length > 3 ? `\n  ... e mais ${history.length - 3} versões no histórico\n` : ''}
` : '📭 Nenhuma campanha gerada ainda'}

`;
}).join('\n')}

` : ''}

## 🏢 CONTEXTO DA EMPRESA
${product.company_profile ? `

### Informações Básicas:
- Nome da Empresa: ${product.company_profile.company_name || 'N/A'}
- Descrição: ${product.company_profile.company_description || 'N/A'}
- Setor: ${product.company_profile.business_sector || 'N/A'}
- Fundada em: ${product.company_profile.founded_year || 'N/A'}
- Tamanho da Equipe: ${product.company_profile.team_size || 'N/A'}
- Localização: ${product.company_profile.location || 'N/A'}

### Posicionamento de Mercado:
- Missão: ${product.company_profile.mission_statement || 'N/A'}
- Visão: ${product.company_profile.vision_statement || 'N/A'}
- Valores: ${product.company_profile.brand_values || 'N/A'}
- Público-Alvo: ${product.company_profile.target_audience || 'N/A'}
- Produtos/Serviços: ${product.company_profile.main_products_services || 'N/A'}
- Diferenciais: ${product.company_profile.differentiators || 'N/A'}

### Metodologia & Cultura:
- Metodologia de Trabalho: ${product.company_profile.working_methodology || 'N/A'}
- Abordagem de Entrega: ${product.company_profile.delivery_approach || 'N/A'}
- Cultura Empresarial: ${product.company_profile.company_culture || 'N/A'}

### Contato:
- Website: ${product.company_profile.website_url || 'N/A'}
- E-mail: ${product.company_profile.contact_email || 'N/A'}
- Telefone: ${product.company_profile.contact_phone || 'N/A'}
- Logo: ${product.company_profile.company_logo_url || 'N/A'}

### Redes Sociais:
${(product.company_profile.social_media_links || []).map((link: any) => 
  `- ${link.platform || 'Rede'}: ${link.url || 'N/A'}`
).join('\n') || '- Nenhuma rede social cadastrada'}

### Canais de Conteúdo:
- YouTube: ${product.company_profile.youtube_channel || 'N/A'}
- Instagram: ${product.company_profile.instagram_profile || 'N/A'}

### SEO & Posicionamento Digital:
- Posicionamento de Mercado: ${product.company_profile.seo_market_positioning || 'N/A'}
- Vantagens Competitivas: ${product.company_profile.seo_competitive_advantages || 'N/A'}
- Expertise Técnica: ${product.company_profile.seo_technical_expertise || 'N/A'}
- Áreas de Atuação: ${product.company_profile.seo_service_areas || 'N/A'}
- Keywords de Contexto: ${(product.company_profile.seo_context_keywords || []).join(', ') || 'N/A'}
- Domínios SEO: ${(product.company_profile.seo_domains || []).map((d: any) => d.domain).join(', ') || 'N/A'}

### Links Institucionais:
${(product.company_profile.institutional_links || []).map((link: any) => 
  `- ${link.label || 'Link'}: ${link.url || 'N/A'}`
).join('\n') || '- Nenhum link institucional cadastrado'}

### Tracking & Analytics:
- Google Tag Manager: ${product.company_profile.tracking_pixels?.google_tag_manager?.enabled ? `✅ ${product.company_profile.tracking_pixels.google_tag_manager.container_id}` : '❌ Não configurado'}
- Google Analytics: ${product.company_profile.tracking_pixels?.google_analytics?.enabled ? `✅ ${product.company_profile.tracking_pixels.google_analytics.measurement_id}` : '❌ Não configurado'}
- Meta Pixel: ${product.company_profile.tracking_pixels?.meta_pixel?.enabled ? `✅ ${product.company_profile.tracking_pixels.meta_pixel.pixel_id}` : '❌ Não configurado'}
- TikTok Pixel: ${product.company_profile.tracking_pixels?.tiktok_pixel?.enabled ? `✅ ${product.company_profile.tracking_pixels.tiktok_pixel.pixel_id}` : '❌ Não configurado'}

### Reviews da Empresa:
- Google Place ID: ${product.company_profile.company_reviews?.google_place_id || 'N/A'}
- Reviews Importados: ${product.company_profile.company_reviews?.google_reviews_imported ? '✅ Sim' : '❌ Não'}
- Reviews Manuais: ${(product.company_profile.company_reviews?.manual_reviews || []).length || 0}

### Rodapé YouTube Corporativo:
${product.company_profile.youtube_company_footer || 'N/A'}

### Vídeos da Empresa:
${product.company_profile.company_videos ? `
- YouTube: ${product.company_profile.company_videos.youtube_videos?.length || 0} vídeos
- Instagram: ${product.company_profile.company_videos.instagram_videos?.length || 0} vídeos
` : '❌ Nenhum vídeo cadastrado'}

` : '❌ Perfil da empresa não disponível'}

## 🌐 CONTEXTO DA LANDING PAGE
${product.landing_page_context ? `
Landing Page: ${product.landing_page_context.landing_page_name || product.landing_page_context.landing_page_id}

### SEO Inteligente:
${product.landing_page_context.seo_intelligent ? `
- Habilitado: ${product.landing_page_context.seo_intelligent.enabled ? '✅ Sim' : '❌ Não'}
- Gerado em: ${product.landing_page_context.seo_intelligent.generated_at || 'N/A'}
- AI Keywords: ${product.landing_page_context.seo_intelligent.ai_keywords?.length || 0} termos
- Resolved Keywords: ${product.landing_page_context.seo_intelligent.resolved_keywords?.length || 0} termos
- Base Text: ${product.landing_page_context.seo_intelligent.base_text_markdown ? (product.landing_page_context.seo_intelligent.base_text_markdown.substring(0, 150) + '...') : 'N/A'}
` : '❌ SEO Inteligente não configurado'}

### Bloco SEO:
${product.landing_page_context.seo ? `
- Título SEO: ${product.landing_page_context.seo.seo_title || 'N/A'}
- Descrição SEO: ${product.landing_page_context.seo.seo_description || 'N/A'}
- AI SEO Enabled: ${product.landing_page_context.seo.ai_seo_enabled ? '✅ Sim' : '❌ Não'}
- Gerado por IA: ${product.landing_page_context.seo.seo_generated_by_ai ? '✅ Sim' : '❌ Não'}
` : '❌ Bloco SEO não configurado'}

### Reviews Aprovados:
Total: ${product.landing_page_context.approved_reviews?.length || 0} reviews
${product.landing_page_context.approved_reviews?.slice(0, 3).map((review: any, idx: number) => 
  `${idx + 1}. ${review.contextual_seo_info || 'Sem contexto SEO'}`
).join('\n') || ''}

### Depoimentos em Vídeo (DETALHADO):
Total: ${product.landing_page_context.video_testimonials?.length || 0} depoimentos aprovados

${product.landing_page_context.video_testimonials?.map((testimonial: any, idx: number) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPOIMENTO ${idx + 1}: ${testimonial.client_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 DADOS DO CLIENTE:
  • Nome: ${testimonial.client_name}
  • Profissão: ${testimonial.profession || 'N/A'}
  • Localização: ${testimonial.location || 'N/A'}${testimonial.state ? `, ${testimonial.state}` : ''}
  • Especialidade: ${testimonial.specialty || 'N/A'}

📱 LINKS:
  • YouTube: ${testimonial.youtube_url || '❌ Não disponível'}
  • Instagram: ${testimonial.instagram_url || '❌ Não disponível'}

💬 DEPOIMENTO:
${testimonial.testimonial_text}

${testimonial.caption_data && Object.keys(testimonial.caption_data).length > 0 ? `
📝 TRANSCRIÇÃO (Caption Data):
${JSON.stringify(testimonial.caption_data, null, 2)}
` : ''}

${testimonial.ai_keywords?.length > 0 ? `
🏷️ AI KEYWORDS (${testimonial.ai_keywords.length}):
${testimonial.ai_keywords.join(', ')}
` : ''}

${testimonial.ai_extracted_benefits?.length > 0 ? `
✨ BENEFÍCIOS EXTRAÍDOS (${testimonial.ai_extracted_benefits.length}):
${testimonial.ai_extracted_benefits.map((b: string) => `  • ${b}`).join('\n')}
` : ''}

${testimonial.sentiment_score ? `
😊 SENTIMENT SCORE: ${testimonial.sentiment_score} (${testimonial.sentiment_score >= 0.7 ? 'Positivo' : testimonial.sentiment_score >= 0.4 ? 'Neutro' : 'Negativo'})
` : ''}

📊 METADADOS:
  • ID: ${testimonial.id}
  • Display Order: ${testimonial.display_order || 'N/A'}
  • Aprovado: ${testimonial.approved ? '✅ Sim' : '❌ Não'}
  • Criado em: ${new Date(testimonial.created_at).toLocaleString('pt-BR')}
  • Atualizado em: ${new Date(testimonial.updated_at).toLocaleString('pt-BR')}

`).join('\n') || '📭 Nenhum depoimento disponível'}
` : '❌ Produto não vinculado a uma Landing Page'}

## 🌐 LANDING PAGES APROVADAS RELACIONADAS

${(product.related_landing_pages && product.related_landing_pages.length > 0) ? 
  product.related_landing_pages.map((lp: any, idx: number) => `
${idx + 1}. 📄 ${lp.name}
   - ID: ${lp.id}
   - Status: ${lp.status}
   - Embed Ativo: ${lp.embed ? '✅ Sim' : '❌ Não'}
   - SEO Title: ${lp.data?.seo?.seo_title || 'N/A'}
   - Canonical URL: ${lp.data?.seo?.canonical_url || 'N/A'}
  `).join('\n') 
: '📭 Nenhuma landing page aprovada usa este produto'}

📌 Total de Landing Pages Aprovadas: ${product.related_landing_pages?.length || 0}

## 🤖 SCRIPTS PARA ATENDIMENTO IA
${json.customer_service_prompts.join('\n')}

## 📈 STATUS DE QUALIDADE E FLAGS IA
- Aprovado: ${product.approved ? '✅ Sim' : '❌ Não'}
- Usar em IA: ${product.use_in_ai_generation ? '✅ Sim' : '❌ Não'}
- SEO Otimizado: ${product.seo_enhanced ? '✅ Sim' : '❌ Não'}
- Keywords Geradas por IA: ${product.ai_generated_keywords ? '✅ Sim' : '❌ Não'}
- Benefícios Gerados por IA: ${product.ai_generated_benefits ? '✅ Sim' : '❌ Não'}
- Categoria Gerada por IA: ${product.ai_generated_category ? '✅ Sim' : '❌ Não'}
- Features Geradas por IA: ${product.ai_generated_features ? '✅ Sim' : '❌ Não'}
- Completude do Cadastro: ${calculateCompleteness(product)}%

==================================================
Gerado em: ${new Date().toLocaleString('pt-BR')}
Versão do Export: 2.0
==================================================`;
}

function calculateCompleteness(product: ProductData): number {
  const fields = [
    // Basic fields (weight: 2x)
    product.name,
    product.description,
    product.category,
    product.price,
    
    // Marketing content (weight: 2x)
    product.benefits?.length,
    product.features?.length,
    product.keywords?.length,
    product.target_audience?.length,
    product.sales_pitch,
    
    // Media (weight: 1x)
    product.image_url,
    product.product_url,
    
    // E-commerce codes (weight: 1x each)
    product.gtin,
    product.ean,
    product.mpn,
    
    // Variations & pricing
    product.variations?.length,
    product.promo_price,
    
    // Physical specs
    product.weight,
    product.height,
    product.width,
    product.depth,
    
    // Technical content
    product.technical_specifications?.length,
    product.faq?.length,
    
    // SEO
    product.seo_title_override,
    product.seo_description_override,
    product.canonical_url,
    
    // AI Content
    product.individual_blog_content?.commercial,
    product.individual_blog_content?.technical,
    product.whatsapp_sequences?.sequences?.length,
    
    // Pricing & Promotions
    product.price,
    product.coupons?.length,
    
    // Video content
    product.youtube_videos?.length,
    product.instagram_videos?.length,
    
    // Images gallery
    product.images_gallery?.length,
    
    // Bot automation
    product.bot_trigger_words?.length,
    
    // Landing page config
    product.resource_cta1?.visible,
    product.offer_discount_cta?.visible
  ];
  
  const filledFields = fields.filter(field => {
    if (field === null || field === undefined) return false;
    if (typeof field === 'string') return field.trim().length > 0;
    if (typeof field === 'number') return field > 0;
    if (typeof field === 'boolean') return field === true;
    return !!field;
  }).length;
  
  return Math.round((filledFields / fields.length) * 100);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, format = 'both' } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch product data
    const { data: product, error } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !product) {
      console.error('Error fetching product:', error);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch product coupons
    const { data: coupons } = await supabase
      .from('product_coupons')
      .select('*')
      .eq('product_id', productId);

    // Fetch CS messages
    const { data: csMessages } = await supabase
      .from('cs_messages')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('message_order');

    // Fetch aftersales messages
    const { data: aftersalesMessages } = await supabase
      .from('aftersales_messages')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('message_order');

    // Fetch Google Ads campaigns
    const { data: googleAdsCampaigns } = await supabase
      .from('google_ads_campaigns')
      .select('*')
      .eq('product_id', productId);

    // Fetch intelligent links repository (external_links)
    const { data: intelligentLinksRepo, error: linksError } = await supabase
      .from('external_links')
      .select('*')
      .eq('approved', true)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .order('usage_count', { ascending: false })
      .limit(100); // Limitar aos 100 links mais relevantes

    if (linksError) {
      console.warn('⚠️ Erro ao buscar intelligent links:', linksError.message);
    }

    console.log(`🔗 Links inteligentes carregados: ${intelligentLinksRepo?.length || 0}`);

    // Fetch landing page context if product has source_landing_page_id
    let landingPageContext: any = null;
    let landingPageVideos: any[] = [];
    if (product.source_landing_page_id) {
      const { data: landingPage } = await supabase
        .from('landing_pages')
        .select('id, name, data')
        .eq('id', product.source_landing_page_id)
        .single();

      if (landingPage) {
        const { data: approvedReviews } = await supabase
          .from('approved_reviews')
          .select('*')
          .eq('landing_page_id', product.source_landing_page_id);

        const { data: videoTestimonials } = await supabase
          .from('video_testimonials')
          .select('*')
          .eq('landing_page_id', product.source_landing_page_id)
          .eq('approved', true);

        landingPageVideos = videoTestimonials || [];
        console.log(`📹 Video Testimonials carregados:`, {
          total: videoTestimonials?.length || 0,
          with_youtube: videoTestimonials?.filter((v: any) => v.youtube_url).length || 0,
          with_instagram: videoTestimonials?.filter((v: any) => v.instagram_url).length || 0,
          with_captions: videoTestimonials?.filter((v: any) => Object.keys(v.caption_data || {}).length > 0).length || 0,
          with_ai_keywords: videoTestimonials?.filter((v: any) => v.ai_keywords?.length > 0).length || 0
        });

        landingPageContext = {
          landing_page_id: landingPage.id,
          landing_page_name: landingPage.name,
          seo_intelligent: (landingPage.data as any)?.seo_intelligent || null,
          seo: (landingPage.data as any)?.seo || null,
          approved_reviews: approvedReviews || [],
          video_testimonials: videoTestimonials || []
        };
      }
    }

    // Buscar TODOS os campos do company_profile
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    const companyVideos = companyProfile?.company_videos || null;
    console.log(`🏢 Company Profile carregado:`, {
      found: !!companyProfile,
      company_name: companyProfile?.company_name || 'N/A',
      total_fields: companyProfile ? Object.keys(companyProfile).length : 0,
      has_videos: !!companyProfile?.company_videos,
      has_seo: !!companyProfile?.seo_market_positioning,
      has_social: !!companyProfile?.social_media_links?.length
    });

    // Consolidar vídeos
    const consolidatedVideos = normalizeAndConsolidateVideos(
      product,
      landingPageVideos,
      companyVideos
    );

    console.log('📊 Vídeos consolidados:', {
      total: consolidatedVideos.sources_summary.total,
      youtube: consolidatedVideos.by_platform.youtube.length,
      instagram: consolidatedVideos.by_platform.instagram.length,
      tiktok: consolidatedVideos.by_platform.tiktok.length
    });

    // Fetch ALL landing pages that use this product
    const { data: relatedLandingPages } = await supabase
      .from('landing_pages')
      .select('id, name, status, data, embed')
      .contains('selected_product_ids', [productId])
      .eq('status', 'approved')
      .order('name');

    // Extract individual blog content if exists
    let productBlogs: any = null;
    if (product.individual_blog_content) {
      productBlogs = {
        commercial: product.individual_blog_content.commercial || null,
        technical: product.individual_blog_content.technical || null,
        generated_at: product.individual_blog_content.generated_at || null
      };
    }

    // Attach all related data to product object
    const productWithAllData = {
      ...product,
      coupons: coupons || [],
      cs_messages: csMessages || [],
      aftersales_messages: aftersalesMessages || [],
      google_ads_campaigns: googleAdsCampaigns || [],
      landing_page_context: landingPageContext,
      related_landing_pages: relatedLandingPages || [],
      product_blogs: productBlogs,
      consolidatedVideos,
      intelligent_links_repository: intelligentLinksRepo || [],
      company_profile: companyProfile || null
    };

    // Generate content based on format
    let result: any = {};

    if (format === 'json' || format === 'both') {
      result.json = generateAIPlaybookJSON(productWithAllData);
    }

    if (format === 'txt' || format === 'both') {
      result.txt = generatePlaybookTXT(productWithAllData);
    }

    // Add metadata
    result.metadata = {
      product_name: productWithAllData.name,
      export_date: new Date().toISOString(),
      filename_base: `produto-${productWithAllData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-ia-playbook-${new Date().toISOString().split('T')[0]}`,
      has_cs_messages: (csMessages?.length || 0) > 0,
      has_aftersales_messages: (aftersalesMessages?.length || 0) > 0,
      has_google_ads: (googleAdsCampaigns?.length || 0) > 0,
      has_landing_page_context: !!landingPageContext
    };

    console.log(`✅ Product AI playbook generated successfully for: ${productWithAllData.name}`);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error in export-product-ai-playbook:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});