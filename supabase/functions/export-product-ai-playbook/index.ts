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
  currency?: string;
  
  // Product Details
  sales_pitch?: string;
  benefits?: string[];
  features?: string[];
  keywords?: string[];
  target_audience?: string[];
  search_intent_keywords?: string[];
  market_keywords?: string[];
  tags?: string[];
  
  // Technical Info
  technical_specifications?: any[];
  faq?: any[];
  color?: string;
  size?: string;
  material?: string;
  condition?: string;
  availability?: string;
  
  // SEO Data
  seo_title_override?: string;
  seo_description_override?: string;
  canonical_url?: string;
  google_product_category?: string;
  
  // Media & Links
  image_url?: string;
  product_url?: string;
  youtube_videos?: any[];
  instagram_videos?: any[];
  technical_videos?: any[];
  testimonial_videos?: any[];
  tiktok_videos?: any[];
  
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
  
  // Flags
  approved?: boolean;
  use_in_ai_generation?: boolean;
  seo_enhanced?: boolean;
  ai_generated_keywords?: boolean;
  ai_generated_benefits?: boolean;
  ai_generated_category?: boolean;
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
      currency: product.currency || 'BRL',
      availability: product.availability || 'in stock',
      condition: product.condition || 'new'
    },
    marketing_data: {
      sales_pitch: product.sales_pitch,
      benefits: product.benefits || [],
      features: product.features || [],
      target_audience: product.target_audience || [],
      unique_selling_points: product.benefits?.slice(0, 3) || []
    },
    seo_data: {
      primary_keywords: product.keywords || [],
      search_intent_keywords: product.search_intent_keywords || [],
      market_keywords: product.market_keywords || [],
      tags: product.tags || [],
      seo_title: product.seo_title_override,
      seo_description: product.seo_description_override,
      canonical_url: product.canonical_url,
      google_product_category: product.google_product_category
    },
    technical_specs: product.technical_specifications || [],
    faq_knowledge: product.faq || [],
    media_library: {
      product_image: product.image_url,
      product_url: product.product_url,
      youtube_videos: product.youtube_videos || [],
      instagram_videos: product.instagram_videos || [],
      technical_videos: product.technical_videos || [],
      testimonial_videos: product.testimonial_videos || [],
      tiktok_videos: product.tiktok_videos || []
    },
    ai_content_history: {
      blog_content: product.individual_blog_content || {},
      whatsapp_messages: product.whatsapp_messages || {},
      youtube_descriptions: product.youtube_descriptions || {},
      instagram_copies: product.instagram_copies || {},
      tiktok_content: product.tiktok_content || {}
    },
    customer_service_prompts: [
      `Produto: ${product.name}`,
      `Categoria: ${product.category}${product.subcategory ? ` > ${product.subcategory}` : ''}`,
      `Preço: ${product.price ? `R$ ${product.price}` : 'Consulte'}`,
      `Principais benefícios: ${product.benefits?.join(', ') || 'N/A'}`,
      `Características: ${product.features?.join(', ') || 'N/A'}`,
      `Público-alvo: ${product.target_audience?.join(', ') || 'N/A'}`,
      `Palavras-chave para IA: ${product.keywords?.join(', ') || 'N/A'}`
    ],
    quality_flags: {
      approved: product.approved,
      use_in_ai_generation: product.use_in_ai_generation,
      seo_enhanced: product.seo_enhanced,
      has_ai_content: !!(product.individual_blog_content?.commercial || product.individual_blog_content?.technical),
      content_completeness: calculateCompleteness(product)
    },
    generated_at: new Date().toISOString(),
    export_version: "1.0"
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
- Preço: ${product.price ? `R$ ${product.price}` : 'Consulte'}
- Disponibilidade: ${product.availability || 'Em estoque'}
- Condição: ${product.condition || 'Novo'}

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

## 🤖 SCRIPTS PARA ATENDIMENTO IA
${json.customer_service_prompts.join('\n')}

## 📱 CONTEÚDO IA GERADO
### Blog Content:
${product.individual_blog_content?.commercial ? '✅ Blog Comercial Disponível' : '❌ Blog Comercial Pendente'}
${product.individual_blog_content?.technical ? '✅ Blog Técnico Disponível' : '❌ Blog Técnico Pendente'}

### WhatsApp Messages:
${product.whatsapp_messages?.messages?.length ? `✅ ${product.whatsapp_messages.messages.length} mensagens geradas` : '❌ Mensagens pendentes'}

### YouTube Descriptions:
${product.youtube_descriptions?.descriptions?.length ? `✅ ${product.youtube_descriptions.descriptions.length} descrições geradas` : '❌ Descrições pendentes'}

### Instagram Copies:
${product.instagram_copies?.copies?.length ? `✅ ${product.instagram_copies.copies.length} copies gerados` : '❌ Copies pendentes'}

### TikTok Content:
${product.tiktok_content?.copies?.length ? `✅ ${product.tiktok_content.copies.length} conteúdos gerados` : '❌ Conteúdo pendente'}

## 🔗 LINKS E MÍDIA
- URL do Produto: ${product.product_url || 'N/A'}
- Imagem Principal: ${product.image_url || 'N/A'}
- Vídeos YouTube: ${product.youtube_videos?.length || 0}
- Vídeos Instagram: ${product.instagram_videos?.length || 0}
- Vídeos Técnicos: ${product.technical_videos?.length || 0}
- Vídeos Depoimentos: ${product.testimonial_videos?.length || 0}
- Vídeos TikTok: ${product.tiktok_videos?.length || 0}

## 📈 STATUS DE QUALIDADE
- Aprovado: ${product.approved ? '✅ Sim' : '❌ Não'}
- Usar em IA: ${product.use_in_ai_generation ? '✅ Sim' : '❌ Não'}
- SEO Otimizado: ${product.seo_enhanced ? '✅ Sim' : '❌ Não'}
- Completude: ${calculateCompleteness(product)}%

==================================================
Gerado em: ${new Date().toLocaleString('pt-BR')}
Versão do Export: 1.0
==================================================`;
}

function calculateCompleteness(product: ProductData): number {
  const fields = [
    product.name,
    product.description,
    product.category,
    product.price,
    product.benefits?.length,
    product.features?.length,
    product.keywords?.length,
    product.target_audience?.length,
    product.image_url,
    product.sales_pitch
  ];
  
  const filledFields = fields.filter(field => field && (typeof field === 'string' ? field.trim() : field)).length;
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