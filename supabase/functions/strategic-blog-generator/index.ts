import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Strategic Blog Generator - Starting request');
    
    const { landingPageId, repositoryConfig } = await req.json();
    
    if (!landingPageId) {
      throw new Error('landingPageId é obrigatório');
    }

    // Configurar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📄 Building strategic context for landing page: ${landingPageId}`);
    
    // Construir contexto estratégico baseado na configuração
    const strategicContext = await buildStrategicContext(supabase, landingPageId, repositoryConfig);
    
    // Carregar prompts customizados
    const customPrompts = await loadCustomPrompts(supabase, 'strategic-blog-generator');
    
    // Gerar blog estratégico com sistema de redundância dual-AI
    const blogContent = await generateStrategicBlog(strategicContext, customPrompts);
    
    console.log(`✅ Strategic blog generated: ${blogContent.length} characters`);

    return new Response(JSON.stringify({
      success: true,
      landingPageId,
      contentLength: blogContent.length,
      generatedAt: new Date().toISOString(),
      blogContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in strategic-blog-generator:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function buildStrategicContext(supabase: any, landingPageId: string, repositoryConfig: any) {
  const context: any = {};
  const selectedSources = repositoryConfig?.selectedDataSources || [];
  const selectedFields = repositoryConfig?.selectedFields || {};

  console.log(`🔍 Building context for sources: ${selectedSources.join(', ')}`);

  // Landing Page Data
  if (selectedSources.includes('landing_pages') || selectedSources.some((s: string) => s.startsWith('landing_page_'))) {
    const { data: landingPage } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', landingPageId)
      .single();
    
    if (landingPage) {
      context.landingPage = landingPage;
      
      // Extrair campos granulares da landing page
      if (landingPage.data) {
        context.landingPageGranular = extractGranularLandingPageData(landingPage.data, selectedSources, selectedFields);
      }
    }
  }

  // Selected Products and Their Blogs
  if (selectedSources.includes('selected_product_blogs') || selectedSources.includes('products_repository')) {
    const productIds = context.landingPage?.selected_product_ids || [];
    
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products_repository')
        .select('*')
        .in('id', productIds)
        .eq('approved', true);
      
      if (products) {
        context.selectedProducts = products;
        context.productBlogs = products
          .filter((p: any) => p.individual_blog_content)
          .map((p: any) => ({
            productName: p.name,
            productCategory: p.category,
            commercialBlog: p.individual_blog_content?.commercial,
            technicalBlog: p.individual_blog_content?.technical
          }));
      }
    }
  }

  // Approved Reviews
  if (selectedSources.includes('approved_reviews')) {
    const { data: reviews } = await supabase
      .from('approved_reviews')
      .select('*')
      .eq('landing_page_id', landingPageId);
    
    context.approvedReviews = reviews || [];
  }

  // Key Opinion Leaders
  if (selectedSources.includes('key_opinion_leaders')) {
    const { data: kols } = await supabase
      .from('key_opinion_leaders')
      .select('*')
      .eq('approved', true);
    
    context.keyOpinionLeaders = kols || [];
  }

  // Company Profile
  if (selectedSources.includes('company_profile')) {
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();
    
    context.companyProfile = companyProfile;
  }

  return context;
}

function extractGranularLandingPageData(landingPageData: any, selectedSources: string[], selectedFields: any) {
  const granular: any = {};

  // Banner
  if (selectedSources.includes('landing_page_banner')) {
    granular.banner = extractFieldsFromData(landingPageData.banner, selectedFields.landing_page_banner);
  }

  // Solutions 1-5
  for (let i = 1; i <= 5; i++) {
    const sourceKey = `landing_page_solutions_${i}`;
    if (selectedSources.includes(sourceKey)) {
      granular[`solution${i}`] = extractFieldsFromData(landingPageData[`solution${i}`], selectedFields[sourceKey]);
    }
  }

  // Desktop Info
  if (selectedSources.includes('landing_page_desktop_info')) {
    granular.desktopInfo = extractFieldsFromData(landingPageData.desktopInfo, selectedFields.landing_page_desktop_info);
  }

  // Consulting
  if (selectedSources.includes('landing_page_consulting')) {
    granular.consulting = extractFieldsFromData(landingPageData.consulting, selectedFields.landing_page_consulting);
  }

  // FAQ
  if (selectedSources.includes('landing_page_faq')) {
    granular.faq = extractFieldsFromData(landingPageData.faq, selectedFields.landing_page_faq);
  }

  return granular;
}

function extractFieldsFromData(sourceData: any, selectedFields: string[] = []) {
  if (!sourceData || !selectedFields.length) return sourceData;
  
  const filtered: any = {};
  selectedFields.forEach(field => {
    if (sourceData[field] !== undefined) {
      filtered[field] = sourceData[field];
    }
  });
  
  return filtered;
}

async function loadCustomPrompts(supabase: any, edgeFunctionId: string) {
  const { data: prompts } = await supabase
    .from('prompts_configuration')
    .select('*')
    .eq('edge_function_id', edgeFunctionId);

  const customPrompts: any = {};
  prompts?.forEach((prompt: any) => {
    customPrompts[prompt.prompt_name] = prompt.custom_prompt;
  });

  return customPrompts;
}

async function generateStrategicBlog(context: any, customPrompts: any): Promise<string> {
  const defaultPrompt = `Você é um especialista em marketing de conteúdo estratégico e SEO.

IMPORTANTE: Você DEVE escrever TODO o conteúdo em PORTUGUÊS BRASILEIRO. Jamais use espanhol ou outros idiomas.

Crie um artigo de blog abrangente e estratégico que combine todos os elementos fornecidos de forma natural e persuasiva.

CONTEXTO DISPONÍVEL:
${JSON.stringify(context, null, 2)}

ESTRUTURA OBRIGATÓRIA:
1. **Título Principal** (H1) - Engajante e otimizado para SEO
2. **Introdução Estratégica** - Conecte o tema com as necessidades do público
3. **Desenvolvimento por Seções** (H2, H3) - Use dados reais do contexto
4. **Integração de Produtos** - Apresente naturalmente os produtos selecionados
5. **Depoimentos e Prova Social** - Use avaliações e KOLs quando disponível
6. **Soluções Específicas** - Detalhe as soluções da landing page
7. **Call-to-Action Estratégico** - Direcionamento claro

DIRETRIZES:
- Use APENAS as informações fornecidas no contexto
- Integre naturalmente produtos, depoimentos e soluções
- Mantenha tom profissional e autoritativo
- Otimize para SEO com palavras-chave naturais
- Entre 1200-1800 palavras
- Use markdown limpo e estruturado
- Conecte todos os elementos de forma coesa

Gere o artigo estratégico completo agora:`;

  const promptToUse = customPrompts['Artigo Estratégico Contextual'] || defaultPrompt;

  console.log('🤖 Iniciating dual-AI generation system');

  // Chamadas simultâneas para ambas as APIs
  const [lovableResult, deepSeekResult] = await Promise.allSettled([
    generateWithLovableAI(promptToUse),
    generateWithDeepSeek(promptToUse)
  ]);

  console.log('🔍 Comparing AI responses...');

  // Analisar e comparar as respostas
  const comparison = await compareAndSelectBestResponse(lovableResult, deepSeekResult);
  
  console.log(`✅ Selected ${comparison.selectedAPI} response (score: ${comparison.score})`);
  console.log(`📊 Metrics: Lovable=${comparison.metrics.lovable}, DeepSeek=${comparison.metrics.deepSeek}`);

  return comparison.selectedContent;
}

async function generateWithLovableAI(prompt: string): Promise<string> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY não configurado');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Gere um artigo estratégico completo em PORTUGUÊS BRASILEIRO baseado no contexto fornecido. IMPORTANTE: Use apenas português brasileiro, nunca espanhol.' }
      ],
      max_tokens: 3000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Erro Lovable AI: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Resposta vazia da Lovable AI');
  }

  return content.trim();
}

async function generateWithDeepSeek(prompt: string): Promise<string> {
  const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!deepSeekApiKey) {
    throw new Error('DEEPSEEK_API_KEY não configurado');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${deepSeekApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Gere um artigo estratégico completo em PORTUGUÊS BRASILEIRO baseado no contexto fornecido. IMPORTANTE: Use apenas português brasileiro, nunca espanhol.' }
      ],
      max_tokens: 3000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Erro DeepSeek: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Resposta vazia da DeepSeek');
  }

  return content.trim();
}

async function compareAndSelectBestResponse(
  lovableResult: PromiseSettledResult<string>, 
  deepSeekResult: PromiseSettledResult<string>
) {
  const metrics = { lovable: 0, deepSeek: 0 };
  let selectedContent = '';
  let selectedAPI = '';

  // Verificar se ambas falharam
  if (lovableResult.status === 'rejected' && deepSeekResult.status === 'rejected') {
    throw new Error(`Ambas APIs falharam: Lovable=${lovableResult.reason}, DeepSeek=${deepSeekResult.reason}`);
  }

  // Se apenas uma funcionou, usar ela
  if (lovableResult.status === 'rejected') {
    console.log(`⚠️ Lovable AI failed: ${lovableResult.reason}. Using DeepSeek.`);
    return {
      selectedContent: (deepSeekResult as PromiseFulfilledResult<string>).value,
      selectedAPI: 'DeepSeek (fallback)',
      score: 100,
      metrics: { lovable: 0, deepSeek: 100 }
    };
  }

  if (deepSeekResult.status === 'rejected') {
    console.log(`⚠️ DeepSeek failed: ${deepSeekResult.reason}. Using Lovable AI.`);
    return {
      selectedContent: (lovableResult as PromiseFulfilledResult<string>).value,
      selectedAPI: 'Lovable AI (fallback)',
      score: 100,
      metrics: { lovable: 100, deepSeek: 0 }
    };
  }

  // Ambas funcionaram - comparar qualidade
  const lovableContent = (lovableResult as PromiseFulfilledResult<string>).value;
  const deepSeekContent = (deepSeekResult as PromiseFulfilledResult<string>).value;

  // Critérios de avaliação
  const lovableScore = evaluateContent(lovableContent);
  const deepSeekScore = evaluateContent(deepSeekContent);

  metrics.lovable = lovableScore;
  metrics.deepSeek = deepSeekScore;

  // Selecionar a melhor
  if (lovableScore >= deepSeekScore) {
    selectedContent = lovableContent;
    selectedAPI = 'Lovable AI';
  } else {
    selectedContent = deepSeekContent;
    selectedAPI = 'DeepSeek';
  }

  return {
    selectedContent,
    selectedAPI,
    score: Math.max(lovableScore, deepSeekScore),
    metrics
  };
}

function evaluateContent(content: string): number {
  let score = 0;

  // Critério 1: Tamanho (20 pontos)
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 1200 && wordCount <= 1800) {
    score += 20;
  } else if (wordCount >= 800) {
    score += 10;
  }

  // Critério 2: Estrutura em markdown (20 pontos)
  const hasH1 = content.includes('# ');
  const hasH2 = content.includes('## ');
  const hasH3 = content.includes('### ');
  if (hasH1 && hasH2) score += 15;
  if (hasH3) score += 5;

  // Critério 3: Presença de elementos-chave (30 pontos)
  const keyElements = [
    /introdução|apresent|context/i,
    /soluç|produto|serviço/i,
    /conclusão|contato|saiba mais/i,
    /benefício|vantag|resultado/i
  ];
  
  keyElements.forEach(pattern => {
    if (pattern.test(content)) score += 7.5;
  });

  // Critério 4: Qualidade do texto (30 pontos)
  const sentences = content.split(/[.!?]+/).length;
  const avgWordsPerSentence = wordCount / sentences;
  
  if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 25) {
    score += 15;
  } else if (avgWordsPerSentence >= 10) {
    score += 10;
  }

  // Penalizar conteúdo muito repetitivo
  const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
  const repetitionRatio = uniqueWords / wordCount;
  if (repetitionRatio > 0.6) {
    score += 15;
  } else if (repetitionRatio > 0.4) {
    score += 10;
  }

  return Math.min(score, 100);
}