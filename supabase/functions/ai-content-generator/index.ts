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
    
    if (!deepSeekApiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: ContentRequest = await req.json();

    console.log(`Generating ${request.type} content for landing page: ${request.landingPageId}`);

    // Fetch products from repository - prioritize selected products
    let products: any[] = [];
    let productsError = null;

    if (request.selectedProductIds && request.selectedProductIds.length > 0) {
      console.log(`🎯 Using ${request.selectedProductIds.length} selected products:`, request.selectedProductIds);
      
      // Fetch specifically selected products
      const { data: selectedProducts, error: selectedError } = await supabase
        .from('products_repository')
        .select('name, description, sales_pitch, keywords, benefits, features, category, subcategory, target_audience, youtube_videos, testimonial_videos, technical_videos, use_in_ai_generation')
        .in('id', request.selectedProductIds)
        .eq('approved', true);
      
      products = selectedProducts || [];
      productsError = selectedError;
    } else {
      // Fallback: Fetch products from repository related to this landing page
      const { data: landingPageProducts, error: landingError } = await supabase
        .from('products_repository')
        .select('name, description, sales_pitch, keywords, benefits, features, category, subcategory, target_audience, youtube_videos, testimonial_videos, technical_videos, use_in_ai_generation')
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

    // Fetch company profile for additional context
    const { data: companyProfiles } = await supabase
      .from('company_profile')
      .select('company_name, company_description, working_methodology, differentiators')
      .limit(1);
    
    const companyProfile = companyProfiles?.[0] || null;

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

    // Build strategic context with progressive data
    const strategicContext = buildStrategicContext(request, allProducts, companyProfile, manualReviews || [], videoTestimonials || []);
    
    // Generate content based on type
    let result: any;
    
    switch (request.type) {
      case 'google_ads':
        result = await generateGoogleAds(deepSeekApiKey, strategicContext);
        break;
      case 'blog_content':
        result = await generateBlogContent(deepSeekApiKey, strategicContext);
        break;
      case 'seo_meta':
        result = await generateSEOMeta(deepSeekApiKey, strategicContext);
        break;
      case 'dual_blog_versions':
        result = await generateDualBlogVersions(deepSeekApiKey, strategicContext);
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
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildStrategicContext(request: ContentRequest, products: any[], companyProfile?: any, manualReviews: any[] = [], videoTestimonials: any[] = []): string {
  // PROGRESSIVE GENERATION: Always use available data, even if partial
  const pageTitle = request.seoTitle || request.contentData?.banner?.title || request.contentData?.brand?.name || 'Nossos Serviços';
  const pageSubtitle = request.seoDescription || request.contentData?.banner?.subtitle || request.contentData?.seo?.meta_description || 'Soluções de qualidade para você';
  const targetAudience = request.targetAudience || request.contentData?.banner?.subtitle || 'público geral';
  
  // Extract solutions from content data - always try to extract something useful
  const solutions = extractSolutions(request.contentData);
  
  // FASE 1: Extract keywords from FAQ using KeywordCollector logic
  const faqKeywords = extractFAQKeywords(request.contentData);
  
  // Extract keywords from products
  const productKeywords = products.flatMap(p => p.keywords || []);
  const productBenefits = products.flatMap(p => p.benefits || []);
  const productFeatures = products.flatMap(p => p.features || []);
  
  // Extract categories and subcategories as keywords (CRITICAL for SEO/ADS)
  const categoryKeywords = products.flatMap(p => [p.category, p.subcategory].filter(Boolean));
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const uniqueSubcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))];
  
  // FASE 2: Improve Primary Keyword detection with intelligent fallback
  const primaryKeyword = determinePrimaryKeyword(request.primaryKeyword, faqKeywords, productKeywords, pageTitle);
  
  // FASE 3: Debug logging for context generation
  console.log(`🔍 DEBUG - Progressive Context Generation:`);
  console.log(`  Page Title: "${pageTitle}"`);
  console.log(`  Page Subtitle: "${pageSubtitle}"`);
  console.log(`  Company Profile: ${companyProfile ? 'Available' : 'Not available'}`);
  console.log(`  Products: ${products.length} available`);
  console.log(`  Primary Keyword escolhida: "${primaryKeyword}"`);
  console.log(`  FAQ Keywords: ${faqKeywords.length} - [${faqKeywords.slice(0, 2).join(', ')}...]`);
  console.log(`  Product Keywords: ${productKeywords.length} - [${productKeywords.slice(0, 3).join(', ')}...]`);
  
  // Log selected products for debugging
  if (products.length > 0) {
    console.log(`📦 Products being used in AI generation:`);
    products.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name}${p.sales_pitch ? ' (com discurso comercial)' : ''}`);
    });
  }
  
  // Build complete product context with ALL repository fields
  const productContext = products.length > 0 
    ? products.map(p => {
        let productInfo = `• **${p.name}**${p.price ? ` (${p.currency || 'BRL'} ${p.price})` : ''}`;
        
        if (p.description) {
          productInfo += `\n  📋 Descrição: ${p.description}`;
        }
        
        if (p.sales_pitch) {
          productInfo += `\n  💰 Discurso Comercial: ${p.sales_pitch}`;
        }
        
        if (p.category) {
          productInfo += `\n  🏷️ Categoria: ${p.category}${p.subcategory ? ` > ${p.subcategory}` : ''}`;
        }
        
        if (p.benefits && Array.isArray(p.benefits) && p.benefits.length > 0) {
          productInfo += `\n  ✅ Benefícios: ${p.benefits.join(', ')}`;
        }
        
        if (p.features && Array.isArray(p.features) && p.features.length > 0) {
          productInfo += `\n  🔧 Características: ${p.features.join(', ')}`;
        }
        
        if (p.keywords && Array.isArray(p.keywords) && p.keywords.length > 0) {
          productInfo += `\n  🔍 Palavras-chave: ${p.keywords.join(', ')}`;
        }
        
        if (p.target_audience) {
          productInfo += `\n  👥 Público-alvo: ${p.target_audience}`;
        }
        
        return productInfo;
      }).join('\n\n')
    : '• Soluções personalizadas de alta qualidade\n• Atendimento especializado\n• Garantia de resultados';

  // Always provide meaningful context, even with minimal data
  return `
# CONTEXTO ESTRATÉGICO PARA GERAÇÃO DE CONTEÚDO (GERAÇÃO PROGRESSIVA)

## Informações da Página:
- **Título**: ${pageTitle}
- **Subtítulo**: ${pageSubtitle}
- **Palavra-chave Principal**: ${primaryKeyword}
- **Público-alvo**: ${targetAudience}

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

## Keywords Inteligentes (incluindo categorias para SEO/ADS):
${[...new Set([...faqKeywords, ...productKeywords, ...categoryKeywords, primaryKeyword].filter(Boolean))].join(', ') || 'soluções, qualidade, atendimento'}

## FAQ - Perguntas e Respostas:
${extractFAQSection(request.contentData)}

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

INSTRUÇÕES PARA GERAÇÃO PROGRESSIVA:
Você é um redator de marketing digital especialista. Mesmo com informações limitadas, sempre gere conteúdo de qualidade:

1. **PRIORIZE OS DISCURSOS COMERCIAIS**: Use os sales pitch fornecidos para criar headlines e descrições mais persuasivas
2. **USE CATEGORIAS COMO KEYWORDS PRINCIPAIS**: Integre categorias e subcategorias nas palavras-chave para SEO e Google Ads
3. **SEGMENTAÇÃO POR CATEGORIA**: Use categorias para criar ad groups temáticos no Google Ads
4. Use TODOS os dados disponíveis, mesmo que sejam poucos
5. Crie conteúdo persuasivo baseado no que está disponível
6. Use palavras-chave de forma natural, priorizando categorias
7. Foque nos benefícios para o público-alvo
8. Integre os discursos comerciais de forma natural no texto
9. **TAXONOMIA SEO**: Inclua categorias em títulos H2/H3 e meta descriptions
10. Seja criativo para preencher lacunas com conteúdo genérico mas relevante
11. SEMPRE gere algo útil, mesmo com dados mínimos

NUNCA retorne erro por falta de dados - sempre adapte e gere conteúdo adequado!
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
    meta_description: "Soluções profissionais de alta qualidade com atendimento personalizado e tecnologia avançada para seu negócio.",
    keywords: ["soluções profissionais", "qualidade", "atendimento personalizado", "tecnologia avançada", "resultados"]
  };
}

async function generateBlogContent(apiKey: string, context: string): Promise<BlogContent> {
  console.log('🎯 Iniciando geração de blog com validação robusta');
  
  const prompt = `${context}

## TAREFA: Criar artigo de blog baseado EXCLUSIVAMENTE nos dados fornecidos

Crie um artigo completo (mínimo 800 palavras) usando APENAS as informações fornecidas no contexto acima:
- Título otimizado para SEO (máx. 60 caracteres)
- Estrutura com H2 e H3
- Use os nomes EXATOS dos produtos conforme listados
- Use os benefícios EXATOS listados para cada produto
- Use as características EXATAS listadas para cada produto
- Use o discurso comercial quando fornecido
- Incorpore reviews e depoimentos quando disponíveis
- CTA forte no final
- Meta description (máx. 160 caracteres)

**REGRA FUNDAMENTAL**: Use APENAS as informações fornecidas no contexto. Não invente características, especificações ou benefícios que não estejam explicitamente listados nos dados dos produtos.

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
        
        if (validation.isValid) {
          console.log('✅ Conteúdo de blog válido na tentativa', attempt);
          return parsed;
        } else {
          console.warn(`⚠️ Conteúdo de blog inválido na tentativa ${attempt}:`, validation.errors);
          if (attempt === maxAttempts) {
            console.log('🔄 Usando fallback de blog após esgotar tentativas');
            const fallback = getFallbackBlogContent(context);
            return {
              title: fallback.title,
              content: fallback.content,
              metaDescription: fallback.meta_description,
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
            metaDescription: fallback.meta_description,
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
          metaDescription: fallback.meta_description,
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
    metaDescription: fallback.meta_description,
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

async function generateDualBlogVersions(apiKey: string, context: string): Promise<DualBlogVersions> {
  console.log('🎯 Generating dual blog versions (Dentala + Eodonto)');
  
  const prompt = `${context}

**OBJETIVO: Gere 2 versões de blog usando EXCLUSIVAMENTE os dados fornecidos:**

**VERSÃO 1 - DENTALA.COM (Foco Técnico para Dentistas):**
- Tom: Técnico, baseado nos dados fornecidos
- Público: Cirurgiões-dentistas, especialistas
- Use as características técnicas EXATAS dos produtos listados
- CTA: "Agende uma demonstração técnica"

**VERSÃO 2 - EODONTO.COM (Foco Comercial para Laboratórios):**
- Tom: Comercial, prático
- Público: Laboratórios de prótese, empresários
- Use os benefícios EXATOS dos produtos listados
- CTA: "Solicite orçamento personalizado"

**REGRA FUNDAMENTAL**: Use APENAS as informações fornecidas no contexto. Não invente características, especificações ou benefícios que não estejam explicitamente listados.

**FORMATO DE RESPOSTA JSON:**
{
  "dentala": {
    "title": "Título técnico para dentistas",
    "content": "Conteúdo HTML técnico com foco científico",
    "metaDescription": "Meta description técnica",
    "keywords": ["keyword1", "keyword2"]
  },
  "eodonto": {
    "title": "Título comercial para laboratórios", 
    "content": "Conteúdo HTML comercial com foco em negócios",
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

  return parseAIDualResponse(response);
}

async function parseAIDualResponse(response: Response): Promise<DualBlogVersions> {
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