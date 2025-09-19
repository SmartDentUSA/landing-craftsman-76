import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentRequest {
  type: 'google_ads' | 'blog_content' | 'seo_meta';
  landingPageId: string;
  seoTitle?: string;
  seoDescription?: string;
  primaryKeyword?: string;
  targetAudience?: string;
  contentData?: any; // Additional context from the landing page
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

    // Fetch products from repository related to this landing page
    const { data: products, error: productsError } = await supabase
      .from('products_repository')
      .select('name, description, keywords, benefits, features, category, subcategory, target_audience, youtube_videos, testimonial_videos, technical_videos, use_in_ai_generation')
      .eq('source_landing_page_id', request.landingPageId)
      .eq('approved', true)
      .order('display_order', { ascending: true });

    if (productsError) {
      console.error('Error fetching products:', productsError);
    }

    // Fetch all approved products if no specific ones found
    let allProducts = products || [];
    if (!allProducts.length) {
      const { data: fallbackProducts } = await supabase
        .from('products_repository')
        .select('*')
        .eq('approved', true)
        .limit(10);
      
      allProducts = fallbackProducts || [];
    }

    // Fetch company profile for additional context
    const { data: companyProfiles } = await supabase
      .from('company_profile')
      .select('company_name, company_description, working_methodology, differentiators')
      .limit(1);
    
    const companyProfile = companyProfiles?.[0] || null;

    // Build strategic context with progressive data
    const strategicContext = buildStrategicContext(request, allProducts, companyProfile);
    
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
      default:
        console.error(`❌ Unsupported content type: ${request.type}. Supported types: google_ads, blog_content, seo_meta`);
        throw new Error(`Unsupported content type: ${request.type}. Supported types: google_ads, blog_content, seo_meta`);
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

function buildStrategicContext(request: ContentRequest, products: any[], companyProfile?: any): string {
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
  
  // FASE 2: Improve Primary Keyword detection with intelligent fallback
  const primaryKeyword = determinePrimaryKeyword(request.primaryKeyword, faqKeywords, productKeywords, pageTitle);
  
  // FASE 3: Debug logging for context generation
  console.log(`🔍 DEBUG - Progressive Context Generation:`);
  console.log(`  Page Title: "${pageTitle}"`);
  console.log(`  Page Subtitle: "${pageSubtitle}"`);
  console.log(`  Company Profile: ${companyProfile ? 'Available' : 'Not available'}`);
  console.log(`  FAQ Keywords: ${faqKeywords.length} - [${faqKeywords.slice(0, 3).join(', ')}...]`);
  console.log(`  Product Keywords: ${productKeywords.length} - [${productKeywords.slice(0, 3).join(', ')}...]`);
  console.log(`  Primary Keyword escolhida: "${primaryKeyword}"`);
  console.log(`  Products: ${products.length} available`);
  
  // Build product context - even if empty, provide fallback
  const productContext = products.length > 0 
    ? products.map(p => {
        let productInfo = `• ${p.name}${p.price ? ` (R$ ${p.price})` : ''}: ${p.description || 'Produto de qualidade'}`;
        return productInfo;
      }).join('\n')
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

## Repositório de Produtos/Serviços (${products.filter(p => p.use_in_ai_generation !== false).length} disponíveis):
${productContext}

## Keywords Inteligentes:
${[...new Set([...faqKeywords, ...productKeywords, primaryKeyword].filter(Boolean))].join(', ') || 'soluções, qualidade, atendimento'}

## FAQ - Perguntas e Respostas:
${extractFAQSection(request.contentData)}

## Benefícios Identificados:
${[...new Set(productBenefits)].length > 0 ? [...new Set(productBenefits)].join(', ') : 'qualidade garantida, atendimento especializado, resultados comprovados'}

## Características dos Produtos/Serviços:
${[...new Set(productFeatures)].length > 0 ? [...new Set(productFeatures)].join(', ') : 'alta qualidade, tecnologia avançada, fácil utilização'}

---

INSTRUÇÕES PARA GERAÇÃO PROGRESSIVA:
Você é um redator de marketing digital especialista. Mesmo com informações limitadas, sempre gere conteúdo de qualidade:

1. Use TODOS os dados disponíveis, mesmo que sejam poucos
2. Crie conteúdo persuasivo baseado no que está disponível
3. Use palavras-chave de forma natural
4. Foque nos benefícios para o público-alvo
5. Seja criativo para preencher lacunas com conteúdo genérico mas relevante
6. SEMPRE gere algo útil, mesmo com dados mínimos

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
      solutions.push(...contentData.solutions.map((s: any, i: number) => `• Solução ${i + 1}: ${s.title || s.name || s}`));
    } else if (typeof contentData.solutions === 'object') {
      Object.values(contentData.solutions).forEach((s: any, i) => {
        solutions.push(`• Solução ${i + 1}: ${s.title || s.name || s}`);
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

## TAREFA: Criar anúncios Google Ads

Crie 8 variações de anúncios Google Ads com:
- **Títulos**: máximo 30 caracteres cada
- **Descrições**: máximo 90 caracteres cada  
- **Paths**: máximo 15 caracteres, apenas letras e números

Retorne APENAS um JSON válido no formato:
{
  "headlines": ["título1", "título2", ...],
  "descriptions": ["desc1", "desc2", ...],
  "paths": ["path1", "path2"]
}

Foque em conversão, use palavras-chave naturalmente e respeite os limites de caracteres.`;

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

async function generateBlogContent(apiKey: string, context: string): Promise<BlogContent> {
  const prompt = `${context}

## TAREFA: Criar artigo de blog SEO-otimizado

Crie um artigo completo (mínimo 800 palavras) com:
- Título otimizado para SEO (máx. 60 caracteres)
- Estrutura com H2 e H3
- Incorporação natural das palavras-chave
- Menção aos produtos quando relevante
- CTA forte no final
- Meta description (máx. 160 caracteres)

Retorne APENAS um JSON válido:
{
  "title": "título do artigo",
  "content": "artigo completo com markdown",
  "metaDescription": "meta description",
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
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', content);
    throw new Error('Failed to generate valid blog content');
  }
}

async function generateSEOMeta(apiKey: string, context: string): Promise<SEOMeta> {
  const prompt = `${context}

## TAREFA: Criar meta dados SEO

Crie meta dados otimizados:
- Title tag (máx. 60 caracteres)
- Meta description (máx. 160 caracteres)
- Keywords relevantes

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