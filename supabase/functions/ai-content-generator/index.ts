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
      .select('*')
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

    // Build strategic context
    const strategicContext = buildStrategicContext(request, allProducts);
    
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
        throw new Error(`Unsupported content type: ${request.type}`);
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
  const pageTitle = request.seoTitle || 'Título da página';
  const pageSubtitle = request.seoDescription || 'Subtítulo da página';
  const primaryKeyword = request.primaryKeyword || '';
  const targetAudience = request.targetAudience || 'público geral';
  
  // Extract solutions from content data
  const solutions = extractSolutions(request.contentData);
  
  // Extract keywords from products
  const productKeywords = products.flatMap(p => p.keywords || []);
  const productBenefits = products.flatMap(p => p.benefits || []);
  const productFeatures = products.flatMap(p => p.features || []);
  
  // Build product context (sem vídeos individuais pois agora são da empresa)
  const productContext = products.map(p => {
    let productInfo = `• ${p.name}${p.price ? ` (R$ ${p.price})` : ''}: ${p.description || 'Produto de qualidade'}`;
    return productInfo;
  }).join('\n');

  return `
# CONTEXTO ESTRATÉGICO PARA GERAÇÃO DE CONTEÚDO

## Informações da Página:
- **Título**: ${pageTitle}
- **Subtítulo**: ${pageSubtitle}
- **Palavra-chave Principal**: ${primaryKeyword}
- **Público-alvo**: ${targetAudience}

${companyProfile ? `## Perfil da Empresa:
- **Nome**: ${companyProfile.company_name}
- **Descrição**: ${companyProfile.company_description || 'Não informado'}
- **Metodologia**: ${companyProfile.working_methodology || 'Não informado'}
- **Diferenciais**: ${companyProfile.differentiators || 'Não informado'}

` : ''}## Soluções Oferecidas:
${solutions}

## Repositório de Produtos (${products.filter(p => p.use_in_ai_generation !== false).length} produtos selecionados):
${productContext}

## Keywords Inteligentes (de FAQ e produtos):
${[...new Set([...productKeywords, primaryKeyword].filter(Boolean))].join(', ')}

## Benefícios Identificados:
${[...new Set(productBenefits)].join(', ')}

## Características dos Produtos:
${[...new Set(productFeatures)].join(', ')}

---

Você é um redator de marketing digital especialista em nossos produtos e soluções.
Sua função é criar textos persuasivos, claros e com alta taxa de conversão.

Utilize contextualmente todas as informações acima para:
1. Criar conteúdo altamente relevante e específico
2. Mencionar produtos quando apropriado
3. Usar palavras-chave de forma natural
4. Focar nos benefícios para o público-alvo
5. Manter consistência com nossa marca e soluções
`;
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