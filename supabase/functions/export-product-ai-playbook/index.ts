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

function generateAIPlaybookJSON(product: ProductData): any {
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
      source_landing_page: product.source_landing_page_id
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
      youtube_videos: product.youtube_videos || [],
      instagram_videos: product.instagram_videos || [],
      technical_videos: product.technical_videos || [],
      testimonial_videos: product.testimonial_videos || [],
      tiktok_videos: product.tiktok_videos || [],
      video_captions: product.video_captions || {}
    },
    ai_content_history: {
      blog_content: product.individual_blog_content || {},
      whatsapp_messages: product.whatsapp_messages || {},
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

function generatePlaybookTXT(product: ProductData): string {
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
${product.faq?.map(item => `Q: ${item.question}\nR: ${item.answer}\n`).join('\n') || 'FAQ não disponível'}

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

### YouTube Descriptions:
${product.youtube_descriptions?.descriptions?.length ? `✅ ${product.youtube_descriptions.descriptions.length} descrições geradas` : '❌ Descrições pendentes'}
${product.youtube_descriptions?.last_generated ? `📅 Última geração: ${new Date(product.youtube_descriptions.last_generated).toLocaleString('pt-BR')}` : ''}

### Instagram Copies:
${product.instagram_copies?.copies?.length ? `✅ ${product.instagram_copies.copies.length} copies gerados` : '❌ Copies pendentes'}
${product.instagram_copies?.last_generated ? `📅 Última geração: ${new Date(product.instagram_copies.last_generated).toLocaleString('pt-BR')}` : ''}

### TikTok Content:
${product.tiktok_content?.copies?.length ? `✅ ${product.tiktok_content.copies.length} conteúdos gerados` : '❌ Conteúdo pendente'}
${product.tiktok_content?.last_generated ? `📅 Última geração: ${new Date(product.tiktok_content.last_generated).toLocaleString('pt-BR')}` : ''}

## 🔗 LINKS E MÍDIA

### URLs:
- URL do Produto: ${product.product_url || 'N/A'}
- URL Canônica (SEO): ${product.canonical_url || 'N/A'}

### Imagens:
- Imagem Principal: ${product.image_url || 'N/A'}
- Galeria de Imagens: ${product.images_gallery?.length ? `${product.images_gallery.length} imagens` : 'Sem galeria'}

### Vídeos:
- Vídeos YouTube: ${product.youtube_videos?.length || 0}
- Vídeos Instagram: ${product.instagram_videos?.length || 0}
- Vídeos Técnicos: ${product.technical_videos?.length || 0}
- Vídeos Depoimentos: ${product.testimonial_videos?.length || 0}
- Vídeos TikTok: ${product.tiktok_videos?.length || 0}
${Object.keys(product.video_captions || {}).length > 0 ? `- Legendas Extraídas: ${Object.keys(product.video_captions).length} vídeos` : ''}

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

    // Generate content based on format
    let result: any = {};

    if (format === 'json' || format === 'both') {
      result.json = generateAIPlaybookJSON(product);
    }

    if (format === 'txt' || format === 'both') {
      result.txt = generatePlaybookTXT(product);
    }

    // Add metadata
    result.metadata = {
      product_name: product.name,
      export_date: new Date().toISOString(),
      filename_base: `produto-${product.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-ia-playbook-${new Date().toISOString().split('T')[0]}`
    };

    console.log(`✅ Product AI playbook generated successfully for: ${product.name}`);

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