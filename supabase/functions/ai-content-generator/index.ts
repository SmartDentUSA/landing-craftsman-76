import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentRequest {
  type: 'google_ads' | 'blog_content' | 'seo_meta' | 'dual_blog_versions';
  landingPageId: string;
  seoTitle?: string;
  seoDescription?: string;
  primaryKeyword?: string;
  targetAudience?: string;
  contentData?: any; // Additional context from the landing page
  selectedProductIds?: string[]; // Specific product IDs to use
  landingPage?: any;
  include_offers?: boolean;
}

interface AdCopies {
  headlines: string[];
  descriptions: string[];
  paths: string[];
}

interface BlogContent {
  title: string;
  content: string;
  metaDescription: string;
  keywords: string[];
}

interface SEOMeta {
  title: string;
  description: string;
  keywords: string[];
}

interface DualBlogVersions {
  dentala: BlogContent;
  eodonto: BlogContent;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasDeepSeekKey: !!deepSeekApiKey
    });
    
    if (!deepSeekApiKey) {
      console.error('❌ DEEPSEEK_API_KEY not configured');
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: ContentRequest = await req.json();
    
    console.log('📥 Request received:', {
      type: request.type,
      landingPageId: request.landingPageId,
      hasSelectedProductIds: !!request.selectedProductIds?.length
    });

    console.log(`Generating ${request.type} content for landing page: ${request.landingPageId}`);

    // Fetch products from repository - prioritize selected products
    let products: any[] = [];
    let productsError = null;

    if (request.selectedProductIds && request.selectedProductIds.length > 0) {
      console.log(`🎯 Using ${request.selectedProductIds.length} selected products:`, request.selectedProductIds);
      
      // Fetch specifically selected products with ALL FIELDS 
      const { data: selectedProducts, error: selectedError } = await supabase
        .from('products_repository')
        .select('id, name, description, sales_pitch, keywords, benefits, features, category, subcategory, target_audience, market_keywords, search_intent_keywords, youtube_videos, testimonial_videos, technical_videos, instagram_videos, use_in_ai_generation, price, currency, tags, video_captions, offer_discount_cta, resource_cta1, resource_cta2, resource_cta3, image_url, product_url')
        .in('id', request.selectedProductIds)
        .eq('approved', true);
      
      products = selectedProducts || [];
      productsError = selectedError;
    } else {
      // Fallback: Fetch products from repository related to this landing page with ALL FIELDS
      const { data: landingPageProducts, error: landingError } = await supabase
        .from('products_repository')
        .select('id, name, description, sales_pitch, keywords, benefits, features, category, subcategory, target_audience, market_keywords, search_intent_keywords, youtube_videos, testimonial_videos, technical_videos, instagram_videos, use_in_ai_generation, price, currency, tags, video_captions, offer_discount_cta, resource_cta1, resource_cta2, resource_cta3, image_url, product_url')
        .eq('source_landing_page_id', request.landingPageId)
        .eq('approved', true)
        .order('display_order', { ascending: true });
      
      products = landingPageProducts || [];
      productsError = landingError;
    }

    if (productsError) {
      console.error('Error fetching products:', productsError);
    }

    // Use only the selected/landing page products - no fallback products
    let allProducts = products || [];

    // Fetch company profile for additional context - TODOS OS CAMPOS INCLUDING SEO HIDDEN
    const { data: companyProfiles } = await supabase
      .from('company_profile')
      .select('company_name, company_description, working_methodology, differentiators, business_sector, brand_values, mission_statement, vision_statement, target_audience, main_products_services, company_videos, social_media_links, seo_context_keywords, seo_market_positioning, seo_competitive_advantages, seo_technical_expertise, seo_service_areas, location, contact_phone, contact_email, website_url')
      .limit(1);
    
    const companyProfile = companyProfiles?.[0] || null;

    // Fetch categories_config for keyword enrichment - CRITICAL ADDITION
    const { data: categoriesConfig } = await supabase
      .from('categories_config')
      .select('category, subcategory, keywords, market_keywords, search_intent_keywords, target_audience')
      .limit(100);

    // Fetch landing page data for context enrichment - NEW
    const { data: landingPageData } = await supabase
      .from('landing_pages')
      .select('name, data, template')
      .eq('id', request.landingPageId)
      .single();
    
    const landingPage = landingPageData || null;

    // Fetch manual reviews for SEO enrichment
    const { data: manualReviews } = await supabase
      .from('manual_reviews')
      .select('*')
      .eq('landing_page_id', request.landingPageId || '')
      .eq('approved', true)
      .order('rating', { ascending: false });

    // Fetch video testimonials for SEO enrichment
    const { data: videoTestimonials } = await supabase
      .from('video_testimonials')
      .select('*')
      .eq('landing_page_id', request.landingPageId || '')
      .eq('approved', true)
      .order('sentiment_score', { ascending: false });

    // Build strategic context with progressive data - ENHANCED WITH CATEGORIES
    const strategicContext = buildStrategicContext(
      request, 
      allProducts, 
      companyProfile, 
      manualReviews || [], 
      videoTestimonials || [], 
      categoriesConfig || [],
      landingPage
    );
    
    // Generate content based on type
    let result: any;
    
    switch (request.type) {
      case 'google_ads':
        result = await generateGoogleAds(deepSeekApiKey, strategicContext);
        break;
      case 'blog_content':
        result = await generateBlogContent(deepSeekApiKey, strategicContext, allProducts);
        break;
      case 'seo_meta':
        result = await generateSEOMeta(deepSeekApiKey, strategicContext);
        break;
      case 'dual_blog_versions':
        result = await generateDualBlogVersions(deepSeekApiKey, strategicContext, allProducts);
        break;
      default:
        console.error(`❌ Unsupported content type: ${request.type}. Supported types: google_ads, blog_content, seo_meta, dual_blog_versions`);
        throw new Error(`Unsupported content type: ${request.type}. Supported types: google_ads, blog_content, seo_meta, dual_blog_versions`);
    }

    console.log(`Successfully generated ${request.type} content`);

    return new Response(JSON.stringify({
      success: true,
      type: request.type,
      content: result,
      productsUsed: allProducts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-content-generator function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildStrategicContext(
  request: ContentRequest, 
  products: any[], 
  companyProfile?: any, 
  manualReviews: any[] = [], 
  videoTestimonials: any[] = [], 
  categoriesConfig: any[] = [],
  landingPage?: any
): string {
  // CORREÇÃO: Use contentData ou landingPage como fonte primária de dados
  const contentData = request.contentData || request.landingPage || landingPage?.data || {};
  
  // PROGRESSIVE GENERATION: Always use available data, even if partial
  const pageTitle = request.seoTitle || 
                   contentData?.banner?.title || 
                   contentData?.brand?.name || 
                   landingPage?.name || 
                   request.primaryKeyword || 
                   'Nossos Serviços';
  
  const pageSubtitle = request.seoDescription || 
                      contentData?.banner?.subtitle || 
                      contentData?.seo?.meta_description || 
                      'Soluções de qualidade para você';
  
  const targetAudience = request.targetAudience || 
                        contentData?.banner?.subtitle || 
                        'público geral';
  
  // Extract solutions from content data - always try to extract something useful
  const solutions = extractSolutions(contentData);
  
  // FASE 1: Extract keywords from FAQ using KeywordCollector logic
  const faqKeywords = extractFAQKeywords(contentData);
  
  // Extract keywords from products - ENHANCED WITH MARKET & SEARCH INTENT
  const productKeywords = products.flatMap(p => [
    ...(p.keywords || []),
    ...(p.market_keywords || []),
    ...(p.search_intent_keywords || [])
  ]);
  const productBenefits = products.flatMap(p => p.benefits || []);
  const productFeatures = products.flatMap(p => p.features || []);
  
  // Extract categories and subcategories as keywords (CRITICAL for SEO/ADS)
  const categoryKeywords = products.flatMap(p => [p.category, p.subcategory].filter(Boolean));
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const uniqueSubcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))];
  
  // CRITICAL: Extract keywords from categories_config for matching products
  const categoryConfigKeywords = categoriesConfig.filter(config => 
    uniqueCategories.includes(config.category) || uniqueSubcategories.includes(config.subcategory)
  ).flatMap(config => [
    ...(config.keywords || []),
    ...(config.market_keywords || []),
    ...(config.search_intent_keywords || [])
  ]);
  
  // Enhanced target audience from products + categories config
  const allTargetAudiences = [
    ...products.flatMap(p => p.target_audience || []),
    ...categoriesConfig.flatMap(config => config.target_audience || [])
  ];
  const mergedTargetAudience = [...new Set(allTargetAudiences)].join(', ') || targetAudience;
  
  // FASE 2: Improve Primary Keyword detection with intelligent fallback + CATEGORIES
  const primaryKeyword = determinePrimaryKeyword(
    request.primaryKeyword, 
    faqKeywords, 
    [...productKeywords, ...categoryConfigKeywords], 
    pageTitle
  );
  
  // FASE 3: Debug logging for context generation
  console.log(`🔍 DEBUG - Progressive Context Generation:`);
  console.log(`  Page Title: "${pageTitle}"`);
  console.log(`  Page Subtitle: "${pageSubtitle}"`);
  console.log(`  Company Profile: ${companyProfile ? 'Available' : 'Not available'}`);
  console.log(`  Products: ${products.length} available`);
  console.log(`  Primary Keyword escolhida: "${primaryKeyword}"`);
  console.log(`  FAQ Keywords: ${faqKeywords.length} - [${faqKeywords.slice(0, 2).join(', ')}...]`);
  console.log(`  Product Keywords: ${productKeywords.length} - [${productKeywords.slice(0, 3).join(', ')}...]`);
  
  // Log selected products for debugging e análise de qualidade dos dados
  if (products.length > 0) {
    console.log(`📦 Products being used in AI generation:`);
    products.forEach((p, i) => {
      const dataQuality = calculateProductDataQuality(p);
      console.log(`  ${i + 1}. ${p.name}${p.sales_pitch ? ' (com discurso comercial)' : ''} - Qualidade: ${dataQuality}%`);
      
      if (dataQuality < 50) {
        console.warn(`    ⚠️ DADOS INSUFICIENTES para ${p.name} - risco de alucinação`);
      }
    });
  } else {
    console.warn('🚨 NENHUM PRODUTO DISPONÍVEL - usando fallback genérico');
  }
  
        // Build complete product context with STRICT data validation
        const productContext = products.length > 0 
          ? products.map(p => {
              let productInfo = `• **${p.name}**${p.price ? ` (${p.currency || 'BRL'} ${p.price})` : ''}`;
              
              if (p.description) {
                productInfo += `\n  📋 DESCRIÇÃO DISPONÍVEL: ${p.description}`;
              } else {
                productInfo += `\n  📋 DESCRIÇÃO: Não fornecida`;
              }
              
              if (p.sales_pitch) {
                productInfo += `\n  💰 DISCURSO COMERCIAL DISPONÍVEL: ${p.sales_pitch}`;
              } else {
                productInfo += `\n  💰 DISCURSO COMERCIAL: Não fornecido`;
              }
              
              if (p.category) {
                productInfo += `\n  🏷️ CATEGORIA DISPONÍVEL: ${p.category}${p.subcategory ? ` > ${p.subcategory}` : ''}`;
              } else {
                productInfo += `\n  🏷️ CATEGORIA: Não especificada`;
              }
              
              if (p.benefits && Array.isArray(p.benefits) && p.benefits.length > 0) {
                productInfo += `\n  ✅ BENEFÍCIOS DISPONÍVEIS: ${p.benefits.join(', ')}`;
              } else {
                productInfo += `\n  ✅ BENEFÍCIOS: Não especificados - NÃO INVENTE`;
              }
              
              if (p.features && Array.isArray(p.features) && p.features.length > 0) {
                productInfo += `\n  🔧 CARACTERÍSTICAS DISPONÍVEIS: ${p.features.join(', ')}`;
              } else {
                productInfo += `\n  🔧 CARACTERÍSTICAS: Não especificadas - NÃO INVENTE`;
              }
              
              if (p.keywords && Array.isArray(p.keywords) && p.keywords.length > 0) {
                productInfo += `\n  🔍 PALAVRAS-CHAVE DISPONÍVEIS: ${p.keywords.join(', ')}`;
              } else {
                productInfo += `\n  🔍 PALAVRAS-CHAVE: Não especificadas`;
              }
              
              if (p.target_audience && Array.isArray(p.target_audience) && p.target_audience.length > 0) {
                productInfo += `\n  👥 PÚBLICO-ALVO DISPONÍVEL: ${p.target_audience.join(', ')}`;
              } else {
                productInfo += `\n  👥 PÚBLICO-ALVO: Não especificado`;
              }

              // ✨ NOVOS CAMPOS EXPANDIDOS
              if (p.tags && Array.isArray(p.tags) && p.tags.length > 0) {
                productInfo += `\n  🏷️ TAGS DISPONÍVEIS: ${p.tags.join(', ')}`;
              }

              if (p.market_keywords && Array.isArray(p.market_keywords) && p.market_keywords.length > 0) {
                productInfo += `\n  📊 KEYWORDS DE MERCADO: ${p.market_keywords.join(', ')}`;
              }

              if (p.search_intent_keywords && Array.isArray(p.search_intent_keywords) && p.search_intent_keywords.length > 0) {
                productInfo += `\n  🎯 KEYWORDS DE INTENÇÃO: ${p.search_intent_keywords.join(', ')}`;
              }

              if (p.video_captions && typeof p.video_captions === 'object') {
                const captionText = Object.values(p.video_captions).join(' ').substring(0, 200);
                if (captionText) {
                  productInfo += `\n  📹 CONTEÚDO DE VÍDEOS: ${captionText}...`;
                }
              }

              if (p.offer_discount_cta && typeof p.offer_discount_cta === 'object') {
                const cta = p.offer_discount_cta as any;
                if (cta.label) {
                  productInfo += `\n  💳 OFERTA ESPECIAL: ${cta.label}`;
                }
              }

              if (p.instagram_videos && Array.isArray(p.instagram_videos) && p.instagram_videos.length > 0) {
                productInfo += `\n  📱 VÍDEOS INSTAGRAM: ${p.instagram_videos.length} disponíveis`;
              }
              
              return productInfo;
            }).join('\n\n')
          : '• DADOS INSUFICIENTES - Use apenas informações genéricas sobre soluções de qualidade';

  // Always provide meaningful context, even with minimal data
  return `
# CONTEXTO ESTRATÉGICO PARA GERAÇÃO DE CONTEÚDO (GERAÇÃO PROGRESSIVA)

## Informações da Página:
- **Título**: ${pageTitle}
- **Subtítulo**: ${pageSubtitle}
- **Palavra-chave Principal**: ${primaryKeyword}
- **Público-alvo**: ${mergedTargetAudience}
- **Template**: ${landingPage?.template || 'Não especificado'}
- **Landing Page**: ${landingPage?.name || 'Não especificada'}

${companyProfile ? `## Perfil da Empresa:
- **Nome**: ${companyProfile.company_name || 'Nossa Empresa'}
- **Descrição**: ${companyProfile.company_description || 'Empresa especializada em soluções de qualidade'}
- **Metodologia**: ${companyProfile.working_methodology || 'Atendimento personalizado e resultados comprovados'}
- **Diferenciais**: ${companyProfile.differentiators || 'Qualidade, confiabilidade e excelência no atendimento'}

` : `## Informações da Empresa:
- **Nome**: ${pageTitle.split(' ')[0] || 'Nossa Empresa'}
- **Especialidade**: Soluções personalizadas e atendimento de qualidade

`}## Soluções Oferecidas:
${solutions}

## Categorias de Produtos/Serviços (ESSENCIAL para SEO/ADS):
${uniqueCategories.length > 0 ? `**Categorias**: ${uniqueCategories.join(', ')}` : '**Categorias**: Não especificadas'}
${uniqueSubcategories.length > 0 ? `**Subcategorias**: ${uniqueSubcategories.join(', ')}` : ''}
${categoryKeywords.length > 0 ? `**Keywords por Categoria**: ${categoryKeywords.join(', ')}` : ''}

## Repositório de Produtos/Serviços (${products.filter(p => p.use_in_ai_generation !== false).length} disponíveis):
${productContext}

## Keywords Inteligentes EXPANDIDAS (FAQ + Produtos + Categorias Config):
${[...new Set([...faqKeywords, ...productKeywords, ...categoryKeywords, ...categoryConfigKeywords, primaryKeyword].filter(Boolean))].join(', ') || 'soluções, qualidade, atendimento'}

## Keywords por Categoria (de categories_config):
${categoriesConfig.length > 0 ? categoriesConfig.map(config => 
  `**${config.category}${config.subcategory ? ' > ' + config.subcategory : ''}**: ${[...(config.keywords || []), ...(config.market_keywords || []), ...(config.search_intent_keywords || [])].join(', ')}`
).join('\n') : 'Nenhuma configuração de categoria disponível'}

## FAQ - Perguntas e Respostas:
${extractFAQSection(contentData)}

## Benefícios Identificados:
${[...new Set(productBenefits)].length > 0 ? [...new Set(productBenefits)].join(', ') : 'qualidade garantida, atendimento especializado, resultados comprovados'}

## Características dos Produtos/Serviços:
${[...new Set(productFeatures)].length > 0 ? [...new Set(productFeatures)].join(', ') : 'alta qualidade, tecnologia avançada, fácil utilização'}

## Discursos Comerciais (Sales Pitch):
${products.filter(p => p.sales_pitch).length > 0 ? products.filter(p => p.sales_pitch).map(p => `• ${p.name}: ${p.sales_pitch}`).join('\n') : '• Foque na qualidade e diferenciais competitivos'}

## Reviews Manuais para SEO (${manualReviews.length} aprovados):
${manualReviews.length > 0 ? manualReviews.slice(0, 10).map((review, index) => 
  `**Review ${index + 1}:** ${review.author_name} (${review.rating}⭐)\n"${review.review_text || 'Review positivo'}"\n`
).join('\n') : '• Nenhum review manual disponível'}

## Depoimentos em Vídeo para SEO (${videoTestimonials.length} aprovados):
${videoTestimonials.length > 0 ? videoTestimonials.slice(0, 10).map((testimonial, index) => {
  let text = `**Depoimento ${index + 1}:** ${testimonial.client_name}`;
  if (testimonial.profession) text += ` - ${testimonial.profession}`;
  if (testimonial.location) text += ` (${testimonial.location})`;
  text += `\n"${testimonial.testimonial_text}"\n`;
  if (testimonial.ai_extracted_benefits && Array.isArray(testimonial.ai_extracted_benefits) && testimonial.ai_extracted_benefits.length > 0) {
    text += `Benefícios extraídos: ${testimonial.ai_extracted_benefits.join(', ')}\n`;
  }
  return text;
}).join('\n') : '• Nenhum depoimento em vídeo disponível'}

---

⚠️ **INSTRUÇÕES RIGOROSAS ANTI-ALUCINAÇÃO** ⚠️

**REGRAS FUNDAMENTAIS:**
1. **USE SOMENTE DADOS FORNECIDOS**: Se um campo está marcado como "Não especificado" ou "Não fornecido", NÃO invente conteúdo para ele
2. **VALIDAÇÃO OBRIGATÓRIA**: Antes de mencionar qualquer característica ou benefício, confirme que está explicitamente listado nos dados
3. **FALLBACK GENÉRICO**: Quando dados insuficientes, use linguagem genérica mas NÃO invente especificações
4. **NOMES EXATOS**: Use os nomes dos produtos EXATAMENTE como fornecidos
5. **DISCURSOS COMERCIAIS**: Use sales pitch quando disponível, caso contrário seja genérico
6. **CATEGORIAS REAIS**: Use apenas categorias/subcategorias explicitamente fornecidas
7. **PÚBLICO-ALVO REAL**: Use APENAS públicos-alvo listados nos dados, NÃO invente
8. **BENEFÍCIOS REAIS**: Mencione APENAS benefícios que estão na seção "BENEFÍCIOS DISPONÍVEIS"
9. **CARACTERÍSTICAS REAIS**: Mencione APENAS características que estão na seção "CARACTERÍSTICAS DISPONÍVEIS"
10. **KEYWORDS REAIS**: Use APENAS palavras-chave que estão na seção "PALAVRAS-CHAVE DISPONÍVEIS"

**LISTA NEGRA DE INVENÇÕES PROIBIDAS:**
❌ "biocompatível", "precisão milimétrica", "alta resistência", "acabamento superior"
❌ "scanner intraoral", "material avançado", "tecnologia de ponta"
❌ Qualquer especificação técnica não listada explicitamente
❌ Qualquer benefício não listado explicitamente
❌ Qualquer característica não listada explicitamente

**EM CASO DE DADOS LIMITADOS:**
✅ Use: "soluções de qualidade", "atendimento especializado", "produtos profissionais"
✅ Seja genérico mas preciso com os dados disponíveis
✅ Foque no que está disponível, não no que falta

**VALIDAÇÃO FINAL:**
Antes de enviar resposta, confirme que CADA característica, benefício e especificação mencionada está explicitamente listada nos dados fornecidos.

NUNCA retorne erro por falta de dados - sempre adapte usando APENAS informações disponíveis!
`;
}

// FASE 1: Extract FAQ Keywords using KeywordCollector logic
function extractFAQKeywords(contentData: any): string[] {
  if (!contentData?.faq || !Array.isArray(contentData.faq)) {
    return [];
  }
  
  // Use the same logic as KeywordCollector.collectFromFAQ
  return contentData.faq
    .map((item: any) => extractLongTailFromQuestion(item.question || ''))
    .flat()
    .filter((keyword: string) => keyword.length > 0);
}

function extractLongTailFromQuestion(question: string): string[] {
  // Extract meaningful phrases from FAQ questions (same logic as KeywordCollector)
  const cleaned = question
    .toLowerCase()
    .replace(/[?!.,]/g, '')
    .replace(/^(como|qual|onde|quando|por que|o que|quais)/, '');
  
  // Split into phrases and filter meaningful ones
  const phrases = cleaned
    .split(' ')
    .filter(word => word.length > 3)
    .join(' ')
    .trim();
  
  if (phrases.length > 10) {
    return [phrases];
  }
  
  return [];
}

// FASE 2: Improve Primary Keyword detection with progressive fallbacks
function determinePrimaryKeyword(providedKeyword: string | undefined, faqKeywords: string[], productKeywords: string[], pageTitle: string): string {
  // 1. Use provided keyword if available and valid
  if (providedKeyword && providedKeyword.trim() && providedKeyword.trim().length > 2) {
    console.log(`🎯 Using provided keyword as primary: "${providedKeyword.trim()}"`);
    return providedKeyword.trim();
  }
  
  // 2. Use first FAQ keyword as fallback (intelligent source)
  if (faqKeywords.length > 0 && faqKeywords[0].length > 2) {
    console.log(`🎯 Using FAQ keyword as primary: "${faqKeywords[0]}"`);
    return faqKeywords[0];
  }
  
  // 3. Use first product keyword as fallback (product-specific)
  if (productKeywords.length > 0 && productKeywords[0].length > 2) {
    console.log(`🎯 Using Product keyword as primary: "${productKeywords[0]}"`);
    return productKeywords[0];
  }
  
  // 4. Extract meaningful words from page title
  const titleWords = pageTitle.toLowerCase().split(' ').filter(word => 
    word.length > 3 && !['para', 'com', 'uma', 'dos', 'das', 'seu', 'sua'].includes(word)
  );
  
  if (titleWords.length > 0) {
    console.log(`🎯 Using title-based keyword as primary: "${titleWords[0]}"`);
    return titleWords[0];
  }
  
  // 5. Ultimate fallback - ensure we always have something
  const fallbackKeyword = 'soluções especializadas';
  console.log(`🎯 Using ultimate fallback keyword: "${fallbackKeyword}"`);
  return fallbackKeyword;
}

// Função para calcular qualidade dos dados do produto (para detectar risco de alucinação)
function calculateProductDataQuality(product: any): number {
  let score = 0;
  let maxScore = 0;
  
  // Nome do produto (obrigatório)
  if (product.name && product.name.trim()) {
    score += 20;
  }
  maxScore += 20;
  
  // Descrição
  if (product.description && product.description.trim().length > 10) {
    score += 15;
  }
  maxScore += 15;
  
  // Benefícios
  if (product.benefits && Array.isArray(product.benefits) && product.benefits.length > 0) {
    score += 20;
  }
  maxScore += 20;
  
  // Características/Features
  if (product.features && Array.isArray(product.features) && product.features.length > 0) {
    score += 20;
  }
  maxScore += 20;
  
  // Keywords
  if (product.keywords && Array.isArray(product.keywords) && product.keywords.length > 0) {
    score += 10;
  }
  maxScore += 10;
  
  // Sales pitch
  if (product.sales_pitch && product.sales_pitch.trim()) {
    score += 10;
  }
  maxScore += 10;
  
  // Categoria
  if (product.category && product.category.trim()) {
    score += 5;
  }
  maxScore += 5;
  
  return Math.round((score / maxScore) * 100);
}

// FASE 1: Extract FAQ Section for context
function extractFAQSection(contentData: any): string {
  if (!contentData?.faq || !Array.isArray(contentData.faq)) {
    return '• Nenhuma pergunta frequente disponível';
  }
  
  return contentData.faq
    .slice(0, 5) // Limit to 5 FAQs to avoid huge context
    .map((item: any, i: number) => 
      `• **P${i + 1}**: ${item.question}\n  **R**: ${item.answer || 'Resposta não disponível'}`
    )
    .join('\n\n');
}

function extractSolutions(contentData: any): string {
  if (!contentData) return '• Soluções personalizadas para suas necessidades';
  
  // Try to extract solutions from various possible structures
  const solutions: string[] = [];
  
  if (contentData.solutions) {
    if (Array.isArray(contentData.solutions)) {
      solutions.push(...contentData.solutions.map((s: any, i: number) => {
        let solution = `• Solução ${i + 1}: ${s.title || s.name || s}`;
        if (s.image?.src) {
          solution += `\n  🖼️ Imagem da Solução ${i + 1}: ${s.image.src}`;
        }
        return solution;
      }));
    } else if (typeof contentData.solutions === 'object') {
      Object.values(contentData.solutions).forEach((s: any, i) => {
        let solution = `• Solução ${i + 1}: ${s.title || s.name || s}`;
        if (s.image?.src) {
          solution += `\n  🖼️ Imagem da Solução ${i + 1}: ${s.image.src}`;
        }
        solutions.push(solution);
      });
    }
  }
  
  if (contentData.features) {
    if (Array.isArray(contentData.features)) {
      solutions.push(...contentData.features.map((f: any, i: number) => `• Recurso ${i + 1}: ${f.title || f.name || f}`));
    }
  }
  
  return solutions.length > 0 ? solutions.join('\n') : '• Soluções inovadoras e eficazes\n• Atendimento personalizado\n• Qualidade garantida';
}

async function generateGoogleAds(apiKey: string, context: string): Promise<AdCopies> {
  const prompt = `${context}

## TAREFA: Criar anúncios Google Ads PRIORIZANDO CATEGORIAS/SUBCATEGORIAS

Crie 8 variações de anúncios Google Ads com:
- **Títulos**: máximo 30 caracteres cada
- **Descrições**: máximo 90 caracteres cada  
- **Paths**: máximo 15 caracteres, apenas letras e números

INSTRUÇÕES CRÍTICAS PARA CATEGORIAS:
1. **PRIORIZE categorias e subcategorias dos produtos como palavras-chave principais nos títulos**
2. **Use categorias para criar paths relevantes (ex: categoria/subcategoria)**
3. **Incorpore hierarquia de categorias nas descrições**
4. **Crie ad groups temáticos baseados nas categorias identificadas**
5. **Integre categorias naturalmente para SEO e segmentação**

Retorne APENAS um JSON válido no formato:
{
  "headlines": ["título1", "título2", ...],
  "descriptions": ["desc1", "desc2", ...],
  "paths": ["path1", "path2"]
}

Foque em conversão, use categorias como palavras-chave principais e respeite os limites de caracteres.`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${data.error?.message || 'Unknown error'}`);
  }

  const content = data.choices[0].message.content;
  
  try {
    // Clean content to remove markdown formatting
    let cleanContent = content.trim();
    
    // Remove markdown code blocks if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(cleanContent);
    return validateAndCleanAdCopies(parsed);
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', content);
    console.error('Parse error:', error);
    return getFallbackAdCopies();
  }
}

// Função de validação de conteúdo
function validateBlogContent(content: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validar título
  if (!content.title || content.title.length < 10 || content.title.length > 60) {
    errors.push('Título deve ter entre 10 e 60 caracteres');
  }
  
  // Validar conteúdo
  if (!content.content || content.content.length < 500) {
    errors.push('Conteúdo deve ter pelo menos 500 caracteres');
  }
  
  // Validar meta description
  if (!content.meta_description || content.meta_description.length < 50 || content.meta_description.length > 160) {
    errors.push('Meta description deve ter entre 50 e 160 caracteres');
  }
  
  // Validar keywords
  if (!content.keywords || !Array.isArray(content.keywords) || content.keywords.length < 3) {
    errors.push('Deve ter pelo menos 3 keywords');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Função anti-alucinação para validar conteúdo contra dados reais dos produtos
function validateContentAgainstProducts(content: string, products: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const contentLower = content.toLowerCase();
  
  // Lista negra de termos que indicam alucinação comum
  const hallucinationTerms = [
    'biocompatível', 'biocompatibilidade',
    'precisão milimétrica', 'precisão micrométrica',
    'scanner intraoral', 'scanner digital',
    'alta resistência', 'resistência superior',
    'acabamento superior', 'acabamento premium',
    'material avançado', 'tecnologia avançada',
    'resistência mecânica', 'durabilidade excepcional',
    'propriedades físicas', 'características físicas',
    'resinas 3d', 'material fotopolimerizável'
  ];
  
  // Verificar se conteúdo contém termos de alucinação
  for (const term of hallucinationTerms) {
    if (contentLower.includes(term.toLowerCase())) {
      // Verificar se o termo está nos dados reais dos produtos
      const termFoundInData = products.some(p => {
        const productData = [
          p.description || '',
          ...(Array.isArray(p.benefits) ? p.benefits : []),
          ...(Array.isArray(p.features) ? p.features : []),
          ...(Array.isArray(p.keywords) ? p.keywords : []),
          p.sales_pitch || ''
        ].join(' ').toLowerCase();
        
        return productData.includes(term.toLowerCase());
      });
      
      if (!termFoundInData) {
        errors.push(`ALUCINAÇÃO DETECTADA: "${term}" não está nos dados dos produtos`);
      }
    }
  }
  
  // Verificar nomes de produtos inventados
  const commonInventedProducts = [
    'scanner', 'impressora 3d', 'equipamento digital',
    'sistema avançado', 'tecnologia de ponta'
  ];
  
  for (const inventedProduct of commonInventedProducts) {
    if (contentLower.includes(inventedProduct.toLowerCase())) {
      const productFound = products.some(p => 
        p.name.toLowerCase().includes(inventedProduct.toLowerCase())
      );
      
      if (!productFound && !contentLower.includes('como') && !contentLower.includes('para')) {
        errors.push(`PRODUTO INVENTADO: "${inventedProduct}" não existe nos dados`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Função de fallback para blog válido
function getFallbackBlogContent(context: string): BlogContent {
  const fallbackTitle = "Soluções Profissionais - Qualidade e Inovação";
  const fallbackContent = `
# ${fallbackTitle}

## Nossa Expertise

Oferecemos soluções profissionais de alta qualidade para atender suas necessidades específicas. Nossa experiência no mercado nos permite entregar resultados excepcionais.

## Diferenciais

- Atendimento personalizado
- Qualidade garantida
- Tecnologia avançada
- Suporte especializado

## Nossos Serviços

Desenvolvemos soluções customizadas que agregam valor ao seu negócio, com foco em eficiência e resultados.

## Entre em Contato

Nossa equipe está pronta para atender você com excelência e profissionalismo.
`.trim();
  
  return {
    title: fallbackTitle,
    content: fallbackContent,
    metaDescription: "Soluções profissionais de alta qualidade com atendimento personalizado e tecnologia avançada para seu negócio.",
    keywords: ["soluções profissionais", "qualidade", "atendimento personalizado", "tecnologia avançada", "resultados"]
  };
}

async function generateBlogContent(apiKey: string, context: string, products: any[] = []): Promise<BlogContent> {
  console.log('🎯 Iniciando geração de blog');
  
  const prompt = `${context}

## TAREFA: Criar artigo de blog baseado EXCLUSIVAMENTE nos dados fornecidos

⚠️ **REGRAS RIGOROSAS ANTI-ALUCINAÇÃO** ⚠️

**PROIBIÇÕES ABSOLUTAS:**
❌ JAMAIS invente características que não estão listadas
❌ JAMAIS invente benefícios que não estão explicitamente mencionados
❌ JAMAIS invente especificações técnicas (biocompatibilidade, precisão milimétrica, etc.)
❌ JAMAIS invente produtos adicionais (scanners, equipamentos, etc.)
❌ JAMAIS invente materiais ou propriedades não listadas nos dados

**OBRIGATÓRIO:**
✅ Use SOMENTE nomes de produtos EXATOS conforme listados
✅ Use SOMENTE benefícios EXATOS da seção "Benefícios:" de cada produto
✅ Use SOMENTE características EXATAS da seção "Características:" de cada produto
✅ Se um produto não tem benefícios/características listados, use apenas o nome e descrição geral
✅ Quando não há dados suficientes, seja genérico mas NÃO invente

**VALIDAÇÃO OBRIGATÓRIA:**
- Se você mencionar alguma característica específica, ela DEVE estar na seção "Características:" do produto
- Se você mencionar algum benefício específico, ele DEVE estar na seção "Benefícios:" do produto
- Todos os nomes de produtos devem ser IDÊNTICOS aos listados no contexto

**ESTRUTURA DO BLOG:**
- Título otimizado para SEO (10-60 caracteres)
- Artigo mínimo 800 palavras usando APENAS dados fornecidos
- Estrutura com H2 e H3
- Use discurso comercial quando fornecido
- Incorpore reviews e depoimentos quando disponíveis
- SE HÁ PRODUTOS SELECIONADOS: inclua seção "## Produtos em Destaque" ou "## Nossas Soluções"
- CTA forte no final
- Meta description (50-160 caracteres)

**EXEMPLO DO QUE NÃO FAZER:**
- "Resinas 3D com material biocompatível" (se biocompatibilidade não está listada)
- "Scanner intraoral com precisão milimétrica" (se scanner não está nos produtos)
- "Alta resistência e acabamento superior" (se não está nas características)

Retorne APENAS um JSON válido:
{
  "title": "título do artigo",
  "content": "artigo completo com markdown",
  "metaDescription": "meta description",
  "keywords": ["palavra1", "palavra2", ...]
}`;

  let attempt = 0;
  const maxAttempts = 3;
  
  while (attempt < maxAttempts) {
    attempt++;
    console.log(`🔄 Tentativa ${attempt}/${maxAttempts} de geração de blog`);
    
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
          max_tokens: 4000,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${data.error?.message || 'Unknown error'}`);
      }

      const content = data.choices[0].message.content;
      
      try {
        // Clean content to remove markdown formatting
        let cleanContent = content.trim();
        
        // Remove markdown code blocks if present
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log('📝 Cleaned blog content for parsing:', cleanContent.substring(0, 200) + '...');
        
        const parsed = JSON.parse(cleanContent);
        
        // Validate required fields
        if (!parsed.title || !parsed.content || !parsed.metaDescription || !parsed.keywords) {
          throw new Error('Missing required fields in blog content response');
        }
        
        // Validar qualidade do conteúdo
        const validation = validateBlogContent({
          title: parsed.title,
          content: parsed.content,
          meta_description: parsed.metaDescription,
          keywords: parsed.keywords
        });
        
        // Validação anti-alucinação
        const hallucinationCheck = validateContentAgainstProducts(parsed.content, products);
        
        if (validation.isValid && hallucinationCheck.isValid) {
          console.log('✅ Conteúdo de blog válido na tentativa', attempt);
          return parsed;
        } else {
          const allErrors = [...validation.errors, ...hallucinationCheck.errors];
          console.warn(`⚠️ Conteúdo de blog inválido na tentativa ${attempt}:`, allErrors);
          if (attempt === maxAttempts) {
            console.log('🔄 Usando fallback de blog após esgotar tentativas');
            const fallback = getFallbackBlogContent(context);
            return {
              title: fallback.title,
              content: fallback.content,
              metaDescription: fallback.metaDescription,
              keywords: fallback.keywords
            };
          }
          continue; // Tentar novamente
        }
        
      } catch (parseError) {
        console.error(`❌ Erro parsing JSON de blog na tentativa ${attempt}:`, parseError);
        if (attempt === maxAttempts) {
          console.log('🔄 Usando fallback de blog após esgotar tentativas de parsing');
          const fallback = getFallbackBlogContent(context);
          return {
            title: fallback.title,
            content: fallback.content,
            metaDescription: fallback.metaDescription,
            keywords: fallback.keywords
          };
        }
        continue; // Tentar novamente
      }
      
    } catch (apiError) {
      console.error(`❌ Erro API de blog na tentativa ${attempt}:`, apiError);
      if (attempt === maxAttempts) {
        console.log('🔄 Usando fallback de blog após esgotar tentativas de API');
        const fallback = getFallbackBlogContent(context);
        return {
          title: fallback.title,
          content: fallback.content,
          metaDescription: fallback.metaDescription,
          keywords: fallback.keywords
        };
      }
      continue; // Tentar novamente
    }
  }
  
  // Fallback final (nunca deveria chegar aqui)
  console.log('🔄 Fallback final de blog - retornando conteúdo padrão');
  const fallback = getFallbackBlogContent(context);
  return {
    title: fallback.title,
    content: fallback.content,
    metaDescription: fallback.metaDescription,
    keywords: fallback.keywords
  };
}

async function generateSEOMeta(apiKey: string, context: string): Promise<SEOMeta> {
  const prompt = `${context}

## TAREFA: Criar meta dados SEO PRIORIZANDO CATEGORIAS/SUBCATEGORIAS

Crie meta dados otimizados:
- Title tag (máx. 60 caracteres)
- Meta description (máx. 160 caracteres)
- Keywords relevantes

**INSTRUÇÕES CRÍTICAS PARA CATEGORIAS:**
1. **Title tag deve incluir categoria principal dos produtos selecionados**
2. **Meta description deve mencionar categorias naturalmente**
3. **Keywords array deve priorizar categorias/subcategorias como termos de maior peso**
4. **Use taxonomia de categorias para estruturar as meta tags**
5. **Integre categorias de forma natural e SEO-friendly**

Retorne APENAS um JSON válido:
{
  "title": "title tag",
  "description": "meta description",
  "keywords": ["palavra1", "palavra2", ...]
}`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${data.error?.message || 'Unknown error'}`);
  }

  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', content);
    throw new Error('Failed to generate valid SEO meta data');
  }
}

function validateAndCleanAdCopies(copies: any): AdCopies {
  const cleaned: AdCopies = {
    headlines: [],
    descriptions: [],
    paths: []
  };

  // Clean and validate headlines
  if (Array.isArray(copies.headlines)) {
    cleaned.headlines = copies.headlines
      .filter((h: any) => typeof h === 'string' && h.trim().length > 0)
      .map((h: string) => h.trim().substring(0, 30))
      .slice(0, 8);
  }

  // Clean and validate descriptions
  if (Array.isArray(copies.descriptions)) {
    cleaned.descriptions = copies.descriptions
      .filter((d: any) => typeof d === 'string' && d.trim().length > 0)
      .map((d: string) => d.trim().substring(0, 90))
      .slice(0, 8);
  }

  // Clean and validate paths
  if (Array.isArray(copies.paths)) {
    cleaned.paths = copies.paths
      .filter((p: any) => typeof p === 'string' && p.trim().length > 0)
      .map((p: string) => p.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15))
      .slice(0, 2);
  }

  // Ensure minimum requirements
  if (cleaned.headlines.length < 3) {
    cleaned.headlines.push(...getFallbackAdCopies().headlines.slice(0, 3 - cleaned.headlines.length));
  }

  if (cleaned.descriptions.length < 2) {
    cleaned.descriptions.push(...getFallbackAdCopies().descriptions.slice(0, 2 - cleaned.descriptions.length));
  }

  if (cleaned.paths.length < 2) {
    cleaned.paths.push(...getFallbackAdCopies().paths.slice(0, 2 - cleaned.paths.length));
  }

  return cleaned;
}

function getFallbackAdCopies(): AdCopies {
  return {
    headlines: [
      "Soluções Eficazes",
      "Qualidade Garantida", 
      "Atendimento Premium",
      "Resultados Comprovados"
    ],
    descriptions: [
      "Encontre as melhores soluções para suas necessidades. Qualidade e eficiência.",
      "Produtos e serviços de alta qualidade. Atendimento personalizado e resultado.",
    ],
    paths: ["solucoes", "qualidade"]
  };
}

async function generateDualBlogVersions(apiKey: string, context: string, products: any[] = []): Promise<DualBlogVersions> {
  console.log('🎯 Generating dual blog versions (Dentala + Eodonto)');
  
  const prompt = `${context}

⚠️ **REGRAS RIGOROSAS ANTI-ALUCINAÇÃO PARA BLOGS DUPLOS** ⚠️

**PROIBIÇÕES ABSOLUTAS:**
❌ JAMAIS invente características que não estão listadas nos dados dos produtos
❌ JAMAIS invente benefícios que não estão explicitamente mencionados
❌ JAMAIS invente especificações técnicas (biocompatibilidade, precisão, resistência, etc.)
❌ JAMAIS invente produtos adicionais (scanners, equipamentos, materiais não listados)
❌ JAMAIS invente propriedades ou funcionalidades não documentadas

**VALIDAÇÃO OBRIGATÓRIA ANTES DE ESCREVER:**
✅ Cada característica mencionada DEVE estar na seção "Características:" do produto específico
✅ Cada benefício mencionado DEVE estar na seção "Benefícios:" do produto específico
✅ Nomes de produtos devem ser IDÊNTICOS aos listados no contexto
✅ Se dados insuficientes, seja genérico mas NÃO invente detalhes

**VERSÃO 1 - DENTALA.COM (Foco Técnico para Dentistas):**
- Tom: Técnico, mas baseado SOMENTE nos dados fornecidos
- Público: Cirurgiões-dentistas, especialistas
- Use SOMENTE características técnicas LISTADAS nos produtos
- Se não há características técnicas específicas, use apenas informações gerais disponíveis
- CTA: "Agende uma demonstração técnica"

**VERSÃO 2 - EODONTO.COM (Foco Comercial para Laboratórios):**
- Tom: Comercial, prático
- Público: Laboratórios de prótese, empresários  
- Use SOMENTE benefícios LISTADOS nos produtos
- Se não há benefícios específicos, use apenas informações comerciais disponíveis
- CTA: "Solicite orçamento personalizado"

**EXEMPLO DO QUE NÃO FAZER:**
- "Material biocompatível" (se não listado nas características)
- "Precisão milimétrica" (se não listado nas especificações)
- "Scanner intraoral" (se não existe nos produtos listados)
- "Alta resistência" (se não está nas características)

**FORMATO DE RESPOSTA JSON:**
{
  "dentala": {
    "title": "Título técnico para dentistas",
    "content": "Conteúdo HTML técnico SOMENTE com dados fornecidos",
    "metaDescription": "Meta description técnica",
    "keywords": ["keyword1", "keyword2"]
  },
  "eodonto": {
    "title": "Título comercial para laboratórios", 
    "content": "Conteúdo HTML comercial SOMENTE com dados fornecidos",
    "metaDescription": "Meta description comercial",
    "keywords": ["keyword1", "keyword2"]
  }
}`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 8000,
    }),
  });

  return parseAIDualResponse(response, products);
}

async function parseAIDualResponse(response: Response, products: any[] = []): Promise<DualBlogVersions> {
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content returned from AI');
  }

  // Clean content - remove markdown code blocks
  content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  console.log('📝 Cleaned dual blog content for parsing:', content.substring(0, 200) + '...');
  
  try {
    const parsed = JSON.parse(content);
    
    if (!parsed.dentala || !parsed.eodonto) {
      throw new Error('Missing required versions in response');
    }
    
    // Validação anti-alucinação para ambas as versões
    const dentalaHallucinationCheck = validateContentAgainstProducts(parsed.dentala.content || '', products);
    const eodontoHallucinationCheck = validateContentAgainstProducts(parsed.eodonto.content || '', products);
    
    if (!dentalaHallucinationCheck.isValid) {
      console.warn('🚨 ALUCINAÇÃO DETECTADA na versão Dentala:', dentalaHallucinationCheck.errors);
    }
    
    if (!eodontoHallucinationCheck.isValid) {
      console.warn('🚨 ALUCINAÇÃO DETECTADA na versão Eodonto:', eodontoHallucinationCheck.errors);
    }
    
    return {
      dentala: {
        title: parsed.dentala.title || 'Blog Técnico - Dentala',
        content: parsed.dentala.content || 'Conteúdo técnico em desenvolvimento...',
        metaDescription: parsed.dentala.metaDescription || '',
        keywords: parsed.dentala.keywords || []
      },
      eodonto: {
        title: parsed.eodonto.title || 'Blog Comercial - Eodonto', 
        content: parsed.eodonto.content || 'Conteúdo comercial em desenvolvimento...',
        metaDescription: parsed.eodonto.metaDescription || '',
        keywords: parsed.eodonto.keywords || []
      }
    };
  } catch (e) {
    console.error('❌ Error parsing dual blog response:', e);
    throw new Error('Failed to parse dual blog content from AI response');
  }
}