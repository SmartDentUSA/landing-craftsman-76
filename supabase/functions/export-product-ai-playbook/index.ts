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

function generateAIPlaybookJSON(product: ProductData & {
  cs_messages?: any[]; 
  aftersales_messages?: any[];
  google_ads_campaigns?: any[];
  landing_page_context?: any;
  related_landing_pages?: any[];
  product_blogs?: any;
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
      whatsapp_messages: product.whatsapp_messages || {},
      whatsapp_sequences: product.whatsapp_sequences || {},
      youtube_descriptions: product.youtube_descriptions || {},
      instagram_copies: product.instagram_copies || {},
      tiktok_content: product.tiktok_content || {}
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
      google_ads_campaigns: (product.google_ads_campaigns || []).map((campaign: any) => ({
        id: campaign.id,
        type: campaign.campaign_type,
        config: campaign.config,
        campaign_history: campaign.campaign_history,
        last_exported: campaign.last_exported
      }))
    },
    landing_page_context: product.landing_page_context || null,
    product_blogs: {
      commercial_blog: {
        content: product.product_blogs?.commercial || null,
        preview: product.product_blogs?.commercial?.substring(0, 200) || null,
        has_content: !!product.product_blogs?.commercial
      },
      technical_blog: {
        content: product.product_blogs?.technical || null,
        preview: product.product_blogs?.technical?.substring(0, 200) || null,
        has_content: !!product.product_blogs?.technical
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

function generatePlaybookTXT(product: ProductData & { 
  cs_messages?: any[]; 
  aftersales_messages?: any[];
  google_ads_campaigns?: any[];
  landing_page_context?: any;
  related_landing_pages?: any[];
  product_blogs?: any;
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

### Blog Content:
${product.individual_blog_content?.commercial ? '✅ Blog Comercial Disponível' : '❌ Blog Comercial Pendente'}
${product.individual_blog_content?.technical ? '✅ Blog Técnico Disponível' : '❌ Blog Técnico Pendente'}
${product.individual_blog_content?.generated_at ? `📅 Gerado em: ${new Date(product.individual_blog_content.generated_at).toLocaleString('pt-BR')}` : ''}

### WhatsApp Messages:
${product.whatsapp_messages?.messages?.length ? `✅ ${product.whatsapp_messages.messages.length} mensagens geradas` : '❌ Mensagens pendentes'}
${product.whatsapp_messages?.last_generated ? `📅 Última geração: ${new Date(product.whatsapp_messages.last_generated).toLocaleString('pt-BR')}` : ''}

### WhatsApp Sequences (Sequências):
${product.whatsapp_sequences?.sequences?.length ? `✅ ${product.whatsapp_sequences.sequences.length} sequências geradas` : '❌ Sequências pendentes'}
${product.whatsapp_sequences?.sequences?.map((seq: any, idx: number) => 
  `  Sequência ${idx + 1}: ${seq.messages?.length || 0} mensagens`
).join('\n') || ''}
${product.whatsapp_sequences?.last_generated ? `📅 Última geração: ${new Date(product.whatsapp_sequences.last_generated).toLocaleString('pt-BR')}` : ''}

### YouTube Descriptions:
${product.youtube_descriptions?.descriptions?.length ? `✅ ${product.youtube_descriptions.descriptions.length} descrições geradas` : '❌ Descrições pendentes'}
${product.youtube_descriptions?.last_generated ? `📅 Última geração: ${new Date(product.youtube_descriptions.last_generated).toLocaleString('pt-BR')}` : ''}

### Instagram Copies:
${product.instagram_copies?.copies?.length ? `✅ ${product.instagram_copies.copies.length} copies gerados` : '❌ Copies pendentes'}
${product.instagram_copies?.last_generated ? `📅 Última geração: ${new Date(product.instagram_copies.last_generated).toLocaleString('pt-BR')}` : ''}

### TikTok Content:
${product.tiktok_content?.copies?.length ? `✅ ${product.tiktok_content.copies.length} conteúdos gerados` : '❌ Conteúdo pendente'}
${product.tiktok_content?.last_generated ? `📅 Última geração: ${new Date(product.tiktok_content.last_generated).toLocaleString('pt-BR')}` : ''}

## 📝 BLOGS INDIVIDUAIS DO PRODUTO

### Blog Comercial:
${product.product_blogs?.commercial ? `
✅ Disponível
Conteúdo (Preview):
${product.product_blogs.commercial.substring(0, 500)}...

[Conteúdo completo disponível no JSON]
` : '❌ Blog comercial não gerado'}

### Blog Técnico:
${product.product_blogs?.technical ? `
✅ Disponível
Conteúdo (Preview):
${product.product_blogs.technical.substring(0, 500)}...

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
  ${i+1}. ${v.description.substring(0, 80)}...
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
  - ${videoId}: ${captions?.text?.substring(0, 100) || 'Sem texto'}...
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

## 📊 CAMPANHAS GOOGLE ADS
${(product.google_ads_campaigns && product.google_ads_campaigns.length > 0) ?
  product.google_ads_campaigns.map((campaign: any, idx: number) => `
${idx + 1}. Campanha ${campaign.campaign_type || 'N/A'}
   - ID: ${campaign.id}
   - Última exportação: ${campaign.last_exported || 'Nunca'}
   - Total de histórico: ${campaign.campaign_history?.campaigns?.length || 0} versões
   - Configuração: ${JSON.stringify(campaign.config || {}, null, 2).substring(0, 200)}...
  `).join('\n') : '📭 Nenhuma campanha Google Ads configurada'}

## 🌐 CONTEXTO DA LANDING PAGE
${product.landing_page_context ? `
Landing Page: ${product.landing_page_context.landing_page_name || product.landing_page_context.landing_page_id}

### SEO Inteligente:
${product.landing_page_context.seo_intelligent ? `
- Habilitado: ${product.landing_page_context.seo_intelligent.enabled ? '✅ Sim' : '❌ Não'}
- Gerado em: ${product.landing_page_context.seo_intelligent.generated_at || 'N/A'}
- AI Keywords: ${product.landing_page_context.seo_intelligent.ai_keywords?.length || 0} termos
- Resolved Keywords: ${product.landing_page_context.seo_intelligent.resolved_keywords?.length || 0} termos
- Base Text: ${product.landing_page_context.seo_intelligent.base_text_markdown?.substring(0, 150) || 'N/A'}...
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

### Depoimentos em Vídeo:
Total: ${product.landing_page_context.video_testimonials?.length || 0} depoimentos aprovados
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
        console.log(`📹 Vídeos da landing page: ${landingPageVideos.length}`);

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

    // Buscar vídeos da empresa
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('company_videos')
      .limit(1)
      .single();

    const companyVideos = companyProfile?.company_videos || null;
    console.log(`📹 Vídeos da empresa disponíveis: ${companyVideos ? 'SIM' : 'NÃO'}`);

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
      consolidatedVideos
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