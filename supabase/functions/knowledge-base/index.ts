import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
};

interface KnowledgeBaseParams {
  format?: 'json' | 'ai_training' | 'system_b';
  include_company?: boolean;
  include_categories?: boolean;
  include_links?: boolean;
  include_products?: boolean;
  approved_only?: boolean;
  category?: string;
  limit?: number;
  offset?: number;
}

function formatAsJSON(data: any): any {
  return {
    api_version: "1.0.0",
    timestamp: new Date().toISOString(),
    total_fields: getTotalFields(data),
    data
  };
}

function formatForAITraining(data: any): string {
  let text = `# BASE DE CONHECIMENTO COMPLETA - ${new Date().toISOString()}\n\n`;
  
  // Company Profile
  if (data.company_profile) {
    const cp = data.company_profile;
    text += `## PERFIL DA EMPRESA\n\n`;
    text += `**Nome:** ${cp.company_name}\n`;
    text += `**Descrição:** ${cp.company_description || 'N/A'}\n`;
    text += `**Setor:** ${cp.business_sector || 'N/A'}\n`;
    text += `**Missão:** ${cp.mission_statement || 'N/A'}\n`;
    text += `**Visão:** ${cp.vision_statement || 'N/A'}\n`;
    text += `**Valores:** ${cp.brand_values || 'N/A'}\n`;
    text += `**Público-alvo:** ${cp.target_audience || 'N/A'}\n`;
    text += `**Diferenciais:** ${cp.differentiators || 'N/A'}\n`;
    text += `**Website:** ${cp.website_url || 'N/A'}\n`;
    text += `**Localização:** ${cp.location || 'N/A'}\n\n`;
    
    if (cp.social_media_links && Array.isArray(cp.social_media_links)) {
      text += `**Redes Sociais:**\n`;
      cp.social_media_links.forEach((link: any) => {
        text += `- ${link.platform || 'Link'}: ${link.url}\n`;
      });
      text += `\n`;
    }
    
    if (cp.institutional_links && Array.isArray(cp.institutional_links)) {
      text += `**Links Institucionais:**\n`;
      cp.institutional_links.forEach((link: any) => {
        text += `- ${link.label}: ${link.url}\n`;
      });
      text += `\n`;
    }
  }
  
  // Categories
  if (data.categories_config && Array.isArray(data.categories_config)) {
    text += `## CATEGORIAS E SUBCATEGORIAS\n\n`;
    data.categories_config.forEach((cat: any) => {
      text += `### ${cat.category}`;
      if (cat.subcategory) text += ` > ${cat.subcategory}`;
      text += `\n`;
      
      if (cat.target_audience && Array.isArray(cat.target_audience)) {
        text += `**Público-alvo:** ${cat.target_audience.join(', ')}\n`;
      }
      
      if (cat.keywords && Array.isArray(cat.keywords)) {
        text += `**Keywords:** ${cat.keywords.join(', ')}\n`;
      }
      
      if (cat.market_keywords && Array.isArray(cat.market_keywords)) {
        text += `**Keywords de Mercado:** ${cat.market_keywords.join(', ')}\n`;
      }
      
      text += `\n`;
    });
  }
  
  // External Links
  if (data.external_links && Array.isArray(data.external_links)) {
    text += `## LINKS E KEYWORDS ESTRATÉGICOS\n\n`;
    data.external_links.forEach((link: any) => {
      text += `### ${link.name}\n`;
      text += `**URL:** ${link.url}\n`;
      if (link.description) text += `**Descrição:** ${link.description}\n`;
      text += `**Categoria:** ${link.category}`;
      if (link.subcategory) text += ` > ${link.subcategory}`;
      text += `\n`;
      if (link.keyword_type) text += `**Tipo:** ${link.keyword_type}\n`;
      if (link.search_intent) text += `**Intenção de Busca:** ${link.search_intent}\n`;
      if (link.monthly_searches) text += `**Buscas Mensais:** ${link.monthly_searches}\n`;
      if (link.cpc_estimate) text += `**CPC Estimado:** R$ ${link.cpc_estimate}\n`;
      text += `\n`;
    });
  }
  
  // Products
  if (data.products && Array.isArray(data.products)) {
    text += `## PRODUTOS (${data.products.length})\n\n`;
    data.products.forEach((item: any) => {
      const p = item.product;
      text += `### ${p.name}\n`;
      text += `**Descrição:** ${p.description || 'N/A'}\n`;
      if (p.price) text += `**Preço:** R$ ${p.price}\n`;
      if (p.promo_price) text += `**Preço Promocional:** R$ ${p.promo_price}\n`;
      if (p.category) text += `**Categoria:** ${p.category}${p.subcategory ? ` > ${p.subcategory}` : ''}\n`;
      if (p.brand) text += `**Marca:** ${p.brand}\n`;
      
      if (p.benefits && Array.isArray(p.benefits) && p.benefits.length > 0) {
        text += `**Benefícios:**\n`;
        p.benefits.forEach((b: string) => text += `- ${b}\n`);
      }
      
      if (p.features && Array.isArray(p.features) && p.features.length > 0) {
        text += `**Características:**\n`;
        p.features.forEach((f: string) => text += `- ${f}\n`);
      }
      
      if (p.keywords && Array.isArray(p.keywords) && p.keywords.length > 0) {
        text += `**Keywords:** ${p.keywords.join(', ')}\n`;
      }
      
      if (p.target_audience && Array.isArray(p.target_audience) && p.target_audience.length > 0) {
        text += `**Público-alvo:** ${p.target_audience.join(', ')}\n`;
      }
      
      if (p.technical_specifications && Array.isArray(p.technical_specifications) && p.technical_specifications.length > 0) {
        text += `**Especificações Técnicas:**\n`;
        p.technical_specifications.forEach((spec: any) => {
          text += `- ${spec.label}: ${spec.value}\n`;
        });
      }
      
      if (p.faq && Array.isArray(p.faq) && p.faq.length > 0) {
        text += `**FAQ:**\n`;
        p.faq.forEach((faq: any) => {
          text += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
        });
      }
      
      text += `\n---\n\n`;
    });
  }
  
  return text;
}

function formatForSystemB(data: any): any {
  return {
    company: data.company_profile,
    categories: data.categories_config,
    links: data.external_links,
    products: data.products?.map((item: any) => ({
      ...item.product,
      cs_messages: item.cs_messages,
      aftersales_messages: item.aftersales_messages,
      coupons: item.coupons,
      google_ads: item.google_ads,
      completion_score: item.completion_score
    }))
  };
}

function getTotalFields(data: any): number {
  let count = 0;
  
  function countFields(obj: any): void {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach(item => countFields(item));
      } else {
        Object.keys(obj).forEach(key => {
          count++;
          countFields(obj[key]);
        });
      }
    }
  }
  
  countFields(data);
  return count;
}

serve(async (req) => {
  // Log incoming request
  console.log('📥 Knowledge Base API request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { 
      status: 204, // No Content (best practice for OPTIONS)
      headers: corsHeaders 
    });
  }

  // Log GET requests specifically
  if (req.method === 'GET') {
    console.log('🎯 GET request received - processing...');
  }

  try {
    console.log('🌐 Public API - No authentication required');

    // Parse query parameters
    const url = new URL(req.url);
    const params: KnowledgeBaseParams = {
      format: (url.searchParams.get('format') as any) || 'json',
      include_company: url.searchParams.get('include_company') !== 'false',
      include_categories: url.searchParams.get('include_categories') !== 'false',
      include_links: url.searchParams.get('include_links') !== 'false',
      include_products: url.searchParams.get('include_products') !== 'false',
      approved_only: url.searchParams.get('approved_only') !== 'false',
      category: url.searchParams.get('category') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    };

    console.log('Knowledge Base API called with params:', params);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Chamar SQL function
    const { data, error } = await supabase.rpc('get_complete_knowledge_base', {
      p_include_company: params.include_company,
      p_include_categories: params.include_categories,
      p_include_links: params.include_links,
      p_include_products: params.include_products,
      p_approved_only: params.approved_only,
      p_category: params.category,
      p_limit: params.limit,
      p_offset: params.offset
    });

    if (error) {
      console.error('Error fetching knowledge base:', error);
      throw error;
    }

    console.log('Knowledge base data fetched successfully');

    // Formatar resposta baseado no formato solicitado
    let response: any;
    let contentType = 'application/json';
    
    switch (params.format) {
      case 'ai_training':
        response = formatForAITraining(data);
        contentType = 'text/plain';
        break;
      case 'system_b':
        response = formatForSystemB(data);
        break;
      case 'json':
      default:
        response = formatAsJSON(data);
        break;
    }

    return new Response(
      typeof response === 'string' ? response : JSON.stringify(response, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType
        }
      }
    );

  } catch (error) {
    console.error('Error in knowledge-base function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
