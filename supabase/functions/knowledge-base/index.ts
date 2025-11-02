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
  include_video_testimonials?: boolean;
  include_google_reviews?: boolean;
  include_kols?: boolean;
  include_spin_solutions?: boolean;
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
    
    // ✨ ENDEREÇO ESTRUTURADO (prioridade) ou location (fallback)
    if (cp.street_address || cp.city || cp.state) {
      text += `**Endereço Completo:**\n`;
      if (cp.street_address || cp.address_number) {
        text += `- Logradouro: ${cp.street_address || ''} ${cp.address_number || ''}\n`;
      }
      if (cp.city) text += `- Cidade: ${cp.city}\n`;
      if (cp.state) text += `- Estado: ${cp.state}\n`;
      if (cp.postal_code) text += `- CEP: ${cp.postal_code}\n`;
      if (cp.country && cp.country !== 'Brasil') text += `- País: ${cp.country}\n`;
      text += '\n';
    } else if (cp.location) {
      text += `**Localização:** ${cp.location}\n\n`;
    }
    
    if (cp.social_media_links && Array.isArray(cp.social_media_links)) {
      text += `**Redes Sociais:**\n`;
      cp.social_media_links.forEach((link: any) => {
        text += `- ${link.platform || 'Link'}: ${link.url}\n`;
      });
      text += `\n`;
    }
    
    if (cp.institutional_links && Array.isArray(cp.institutional_links)) {
      // Separar parcerias internacionais de outros links
      const partnerships = cp.institutional_links.filter(
        (link: any) => link.category === 'international_partnership'
      );
      const otherLinks = cp.institutional_links.filter(
        (link: any) => link.category !== 'international_partnership'
      );
      
      // Parcerias internacionais com destaque
      if (partnerships.length > 0) {
        text += `### PARCERIAS INTERNACIONAIS (${partnerships.length})\n\n`;
        
        // Ordenar por relevância
        partnerships
          .sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))
          .forEach((p: any) => {
            text += `**${p.label}**`;
            if (p.country) text += ` (${p.country})`;
            text += `\n`;
            text += `- URL: ${p.url}\n`;
            if (p.partnership_type) text += `- Tipo: ${p.partnership_type}\n`;
            if (p.description) text += `- Descrição: ${p.description}\n`;
            if (p.since_year) text += `- Desde: ${p.since_year}\n`;
            if (p.relevance_score) text += `- Relevância: ${p.relevance_score}/10\n`;
            text += `\n`;
          });
      }
      
      // Outros links institucionais (formato original)
      if (otherLinks.length > 0) {
        text += `**Links Institucionais:**\n`;
        otherLinks.forEach((link: any) => {
          text += `- ${link.label}: ${link.url}\n`;
        });
        text += `\n`;
      }
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
      
      // E-commerce HTML gerado
      if (p.ecommerce_html && p.ecommerce_html.html_content) {
        text += `**Descrição E-commerce (Gerada por IA):**\n`;
        
        // Preview do HTML (sem tags) - limitado a 500 caracteres
        const htmlPreview = p.ecommerce_html.html_content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        text += `${htmlPreview.substring(0, 500)}...\n\n`;
        
        // Benefícios E-commerce específicos
        if (p.ecommerce_html.generated_benefits && p.ecommerce_html.generated_benefits.length > 0) {
          text += `**Benefícios E-commerce (IA-Generated):**\n`;
          p.ecommerce_html.generated_benefits.forEach((benefit: string) => {
            text += `- ${benefit}\n`;
          });
          text += `\n`;
        }
        
        // Metadata
        text += `Última geração: ${p.ecommerce_html.generated_at || 'Nunca gerado'}\n`;
        if (p.ecommerce_html.last_edited_at) {
          text += `Última edição: ${p.ecommerce_html.last_edited_at}\n`;
        }
        text += `\n`;
      }
      
      text += `\n---\n\n`;
    });
  }
  
  // Video Testimonials
  if (data.video_testimonials && Array.isArray(data.video_testimonials)) {
    text += `## DEPOIMENTOS EM VÍDEO (${data.video_testimonials.length})\n\n`;
    data.video_testimonials.forEach((testimonial: any) => {
      text += `### ${testimonial.client_name}\n`;
      if (testimonial.profession) text += `**Profissão:** ${testimonial.profession}\n`;
      if (testimonial.location) text += `**Localização:** ${testimonial.location}${testimonial.state ? `, ${testimonial.state}` : ''}\n`;
      if (testimonial.specialty) text += `**Especialidade:** ${testimonial.specialty}\n`;
      text += `**Depoimento:**\n${testimonial.testimonial_text}\n`;
      if (testimonial.youtube_url) text += `**YouTube:** ${testimonial.youtube_url}\n`;
      if (testimonial.instagram_url) text += `**Instagram:** ${testimonial.instagram_url}\n`;
      if (testimonial.sentiment_score) text += `**Sentimento:** ${testimonial.sentiment_score}\n`;
      text += `\n`;
    });
  }
  
  // Google Reviews
  if (data.google_reviews && Array.isArray(data.google_reviews)) {
    text += `## AVALIAÇÕES DO GOOGLE (${data.google_reviews.length})\n\n`;
    data.google_reviews.forEach((review: any) => {
      const raw = review.raw_review;
      text += `### ${raw.author_name} - ${raw.rating}⭐\n`;
      text += `**Data:** ${raw.review_date}\n`;
      if (raw.review_text) text += `**Avaliação:** ${raw.review_text}\n`;
      if (raw.response_from_owner) text += `**Resposta:** ${raw.response_from_owner}\n`;
      text += `\n`;
    });
  }
  
  // Key Opinion Leaders
  if (data.key_opinion_leaders && Array.isArray(data.key_opinion_leaders)) {
    text += `## ESPECIALISTAS (KOLs) (${data.key_opinion_leaders.length})\n\n`;
    data.key_opinion_leaders.forEach((kol: any) => {
      text += `### ${kol.full_name}\n`;
      if (kol.specialty) text += `**Especialidade:** ${kol.specialty}\n`;
      if (kol.mini_cv) text += `**Mini CV:** ${kol.mini_cv}\n`;
      if (kol.lattes_url) text += `**Lattes:** ${kol.lattes_url}\n`;
      if (kol.website_url) text += `**Website:** ${kol.website_url}\n`;
      if (kol.instagram_url) text += `**Instagram:** ${kol.instagram_url}\n`;
      if (kol.youtube_url) text += `**YouTube:** ${kol.youtube_url}\n`;
      text += `\n`;
    });
  }
  
  // SPIN Selling Solutions
  if (data.spin_solutions && Array.isArray(data.spin_solutions)) {
    text += `## SOLUÇÕES SPIN SELLING (${data.spin_solutions.length})\n\n`;
    
    data.spin_solutions.forEach((solution: any) => {
      text += `### ${solution.title}\n`;
      text += `**Tipo de Dor:** ${solution.pain_type}\n`;
      text += `**Prioridade:** ${solution.priority}\n`;
      text += `**Frequência:** ${solution.frequency || 'N/A'}\n\n`;
      
      // PITCH DE VENDAS (campo mais importante)
      if (solution.sales_pitch) {
        text += `**Pitch de Vendas Completo:**\n`;
        text += `${solution.sales_pitch}\n\n`;
      }
      
      // CASOS DE SUCESSO
      if (solution.success_cases && solution.success_cases.length > 0) {
        text += `**Casos de Sucesso (${solution.success_cases.length}):**\n`;
        solution.success_cases.forEach((sc: any, index: number) => {
          text += `${index + 1}. ${sc.client_name} - ${sc.specialty}\n`;
          text += `   Local: ${sc.city}, ${sc.state}\n`;
          text += `   Resultados: ${sc.results_achieved}\n`;
          if (sc.usage_time) text += `   Tempo de uso: ${sc.usage_time}\n`;
          if (sc.instagram) text += `   Instagram: ${sc.instagram}\n`;
          text += `\n`;
        });
      }
      
      // CITAÇÕES REAIS DE CLIENTES (Jornada SPIN)
      if (solution.real_quotes && solution.real_quotes.length > 0) {
        text += `**Depoimentos SPIN (${solution.real_quotes.length}):**\n`;
        solution.real_quotes.forEach((quote: any, index: number) => {
          text += `${index + 1}. ${quote.client_name}\n`;
          text += `   Desejo: "${quote.desire}"\n`;
          text += `   Dor: "${quote.pain}"\n`;
          text += `   Resultado Esperado: "${quote.expected_result}"\n\n`;
        });
      }
      
      // TABELA DE COMPARAÇÃO COM CONCORRENTES
      if (solution.competitor_comparison?.enabled && solution.competitor_comparison.table_data?.length > 0) {
        text += `**Comparação com Concorrentes:**\n`;
        text += `${solution.competitor_comparison.title}\n`;
        if (solution.competitor_comparison.subtitle) {
          text += `${solution.competitor_comparison.subtitle}\n`;
        }
        text += `\n`;
        
        // Cabeçalhos da tabela
        const headers = solution.competitor_comparison.table_headers || [];
        text += `| ${headers.join(' | ')} |\n`;
        text += `|${headers.map(() => '---').join('|')}|\n`;
        
        // Dados da tabela
        const tableData = solution.competitor_comparison.table_data || [];
        tableData.forEach((row: any) => {
          const cells = headers.map(header => row[header] || '-');
          text += `| ${cells.join(' | ')} |\n`;
        });
        text += `\n`;
      }
      
      // MÉTRICAS DE DOR
      if (solution.pain_metrics && Object.keys(solution.pain_metrics).length > 0) {
        text += `**Métricas de Impacto:**\n`;
        Object.entries(solution.pain_metrics).forEach(([key, value]: [string, any]) => {
          if (typeof value === 'object' && value.label) {
            text += `- ${value.label}: ${value.value} ${value.unit}\n`;
          } else {
            text += `- ${key}: ${value}\n`;
          }
        });
        text += `\n`;
      }
      
      // FAQs DA SOLUÇÃO
      if (solution.faq && solution.faq.length > 0) {
        text += `**Perguntas Frequentes (${solution.faq.length}):**\n`;
        solution.faq.forEach((faq: any, index: number) => {
          text += `Q${index + 1}: ${faq.question}\n`;
          text += `A${index + 1}: ${faq.answer}\n\n`;
        });
      }
      
      // URL PERSONALIZADA
      if (solution.custom_url?.enabled) {
        text += `**Link Personalizado:** ${solution.custom_url.label} - ${solution.custom_url.url}\n`;
        if (solution.custom_url.type === 'landing_page' && solution.custom_url.landing_page_id) {
          text += `(Landing Page ID: ${solution.custom_url.landing_page_id})\n`;
        }
        text += `\n`;
      }
      
      // PRODUTOS RELACIONADOS
      if (solution.product_ids && solution.product_ids.length > 0) {
        text += `**Produtos Relacionados:** ${solution.product_ids.length} produto(s) vinculado(s)\n`;
        text += `IDs: ${solution.product_ids.join(', ')}\n\n`;
      }
      
      // CONTEÚDO GERADO PELA IA (se disponível)
      if (solution.landing_page_html) {
        text += `**Landing Page:** Gerada em ${solution.landing_page_generated_at || 'data desconhecida'}\n`;
      }
      if (solution.whatsapp_complete_message) {
        text += `**Mensagem WhatsApp:** Disponível (mensagem otimizada)\n`;
      }
      if (solution.google_ads_campaign) {
        text += `**Campanha Google Ads:** Gerada com ${solution.google_ads_campaign.keywords?.length || 0} keywords\n`;
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
    spin_solutions: data.spin_solutions,
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
      include_video_testimonials: url.searchParams.get('include_video_testimonials') !== 'false',
      include_google_reviews: url.searchParams.get('include_google_reviews') !== 'false',
      include_kols: url.searchParams.get('include_kols') === 'true',
      include_spin_solutions: url.searchParams.get('include_spin_solutions') !== 'false',
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
      p_include_video_testimonials: params.include_video_testimonials,
      p_include_google_reviews: params.include_google_reviews,
      p_include_kols: params.include_kols,
      p_include_spin_solutions: params.include_spin_solutions,
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
