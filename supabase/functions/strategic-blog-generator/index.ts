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
    
    // Gerar blog estratégico com sistema dual-domain dual-AI
    const dualBlogResult = await generateStrategicBlog(supabase, landingPageId, strategicContext, customPrompts);
    
    console.log(`✅ Dual blogs generated and saved:`);
    console.log(`   - Dentala: ${dualBlogResult.dentala.contentLength} chars (${dualBlogResult.dentala.selectedAPI})`);
    console.log(`   - Eodonto: ${dualBlogResult.eodonto.contentLength} chars (${dualBlogResult.eodonto.selectedAPI})`);

    return new Response(JSON.stringify({
      success: true,
      landingPageId,
      dentala: dualBlogResult.dentala,
      eodonto: dualBlogResult.eodonto,
      metrics: dualBlogResult.metrics,
      generatedAt: new Date().toISOString()
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

  // Company Profile with SEO Hidden fields
  if (selectedSources.includes('company_profile')) {
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select(`
        *,
        seo_context_keywords,
        seo_market_positioning,
        seo_competitive_advantages,
        seo_technical_expertise,
        seo_service_areas
      `)
      .limit(1)
      .single();
    
    context.companyProfile = companyProfile;
    
    // Extract SEO Hidden fields for enhanced context
    if (companyProfile) {
      context.seoContext = {
        contextKeywords: companyProfile.seo_context_keywords || [],
        marketPositioning: companyProfile.seo_market_positioning || '',
        competitiveAdvantages: companyProfile.seo_competitive_advantages || '',
        technicalExpertise: companyProfile.seo_technical_expertise || '',
        serviceAreas: companyProfile.seo_service_areas || ''
      };
    }
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

// ✅ PATCH 0.1: Sanitização de Título (10-60 chars)
function sanitizeTitle(rawTitle: string, fallback: string = "Blog Estratégico"): string {
  const clean = (rawTitle || '').trim();
  
  // Caso 1: Título muito curto (< 10 chars) → usar fallback
  if (clean.length < 10) {
    console.warn(`⚠️ Título muito curto (${clean.length} chars): "${clean}" → usando fallback`);
    return fallback.substring(0, 60);
  }
  
  // Caso 2: Título muito longo (> 60 chars) → truncar inteligentemente
  if (clean.length > 60) {
    console.warn(`⚠️ Título muito longo (${clean.length} chars) → truncando para 60`);
    // Truncar no último espaço antes de 60 chars (evita cortar palavras)
    const truncated = clean.substring(0, 60);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 40 ? truncated.substring(0, lastSpace).trim() : truncated.trim();
  }
  
  // Caso 3: Título OK (10-60 chars)
  return clean;
}

function extractBlogMetadata(markdown: string) {
  const lines = markdown.split('\n').filter(line => line.trim());
  const rawTitle = lines[0]?.replace(/^#+\s*/, '') || "Blog Estratégico";
  
  // ✅ Sanitizar título ANTES de retornar
  const title = sanitizeTitle(rawTitle);
  
  // Extrair primeira seção como meta description
  const firstParagraph = lines.find(line => 
    !line.startsWith('#') && 
    !line.startsWith('**') && 
    line.length > 50
  );
  const metaDescription = firstParagraph 
    ? firstParagraph.substring(0, 155).trim() + '...'
    : '';
  
  // Extrair keywords (palavras em negrito ou títulos H2/H3)
  const keywords: string[] = [];
  const keywordMatches = markdown.match(/\*\*([^*]+)\*\*/g);
  if (keywordMatches) {
    keywords.push(
      ...keywordMatches
        .slice(0, 10)
        .map(k => k.replace(/\*\*/g, '').trim())
        .filter(k => k.length > 3)
    );
  }
  
  return { title, metaDescription, keywords };
}

function buildDentalaPrompt(context: any, customPrompts: any): string {
  const basePrompt = customPrompts['Artigo Estratégico Contextual'] || '';
  
  return `${basePrompt}

# CONTEXTO ESPECÍFICO: Dentala.com.br
PÚBLICO-ALVO: Dentistas, clínicas odontológicas, profissionais da área
FOCO EDITORIAL: Educação profissional, aplicações clínicas, evidências científicas

## DIRETRIZES DENTALA:
- **Tom:** Técnico-profissional, baseado em evidências e estudos de caso
- **Linguagem:** Precisa, utilizando terminologia odontológica adequada
- **Estrutura:** Introdução técnica → Aplicações clínicas → Evidências científicas → Resultados esperados
- **CTAs:** "Saiba mais", "Consulte nossos especialistas", "Agende uma demonstração"
- **Keywords:** Termos técnicos + aplicações clínicas + nomenclatura científica
- **SEO:** Otimizar para buscas de profissionais (ex: "melhor scanner intraoral para clínica")

${context.seoContext ? `
CONTEXTO SEO PROFISSIONAL:
- Palavras-chave técnicas: ${context.seoContext.contextKeywords?.join(', ') || 'N/A'}
- Posicionamento: ${context.seoContext.marketPositioning || 'N/A'}
- Expertise: ${context.seoContext.technicalExpertise || 'N/A'}
` : ''}

GERE UM ARTIGO EM PORTUGUÊS BRASILEIRO que demonstre autoridade técnica e seja útil para profissionais da odontologia.
`;
}

function buildEodontoPrompt(context: any, customPrompts: any): string {
  const basePrompt = customPrompts['Artigo Estratégico Contextual'] || '';
  
  return `${basePrompt}

# CONTEXTO ESPECÍFICO: Eodonto.com.br  
PÚBLICO-ALVO: Consumidores finais, pacientes, compradores de produtos odontológicos
FOCO EDITORIAL: Benefícios práticos, facilidade de uso, custo-benefício, guias de compra

## DIRETRIZES EODONTO:
- **Tom:** Acessível, didático, orientado a benefícios e resultados
- **Linguagem:** Simples e clara, evitando jargão técnico excessivo
- **Estrutura:** Problema do consumidor → Solução prática → Benefícios → Como comprar
- **CTAs:** "Compre agora", "Confira ofertas", "Veja preços", "Adicione ao carrinho"
- **Keywords:** Termos de busca comerciais + intenção de compra (ex: "comprar", "preço", "onde encontrar")
- **SEO:** Otimizar para buscas transacionais (ex: "comprar scanner intraoral barato")

${context.seoContext ? `
CONTEXTO SEO COMERCIAL:
- Palavras-chave de compra: ${context.seoContext.contextKeywords?.filter((k: string) => k.includes('comprar') || k.includes('preço')).join(', ') || 'N/A'}
- Diferenciação comercial: ${context.seoContext.competitiveAdvantages || 'N/A'}
` : ''}

GERE UM ARTIGO EM PORTUGUÊS BRASILEIRO que seja persuasivo e ajude o consumidor a tomar uma decisão de compra informada.
`;
}

async function generateStrategicBlog(supabase: any, landingPageId: string, context: any, customPrompts: any): Promise<any> {
  console.log('🤖 Iniciating dual-domain dual-AI generation system (4 API calls)');

  // Build prompts específicos
  const dentalaPrompt = buildDentalaPrompt(context, customPrompts);
  const eodontoPrompt = buildEodontoPrompt(context, customPrompts);

  // === DENTALA: Dual-AI Comparison ===
  console.log('🔵 Generating DENTALA version...');
  const [dentalaLovableResult, dentalaDeepSeekResult] = await Promise.allSettled([
    generateWithLovableAI(dentalaPrompt),
    generateWithDeepSeek(dentalaPrompt)
  ]);

  const dentalaComparison = await compareAndSelectBestResponse(
    dentalaLovableResult, 
    dentalaDeepSeekResult
  );
  
  const dentalaMetadata = extractBlogMetadata(dentalaComparison.selectedContent);
  
  console.log(`✅ DENTALA: ${dentalaComparison.selectedAPI} selected (score: ${dentalaComparison.score})`);

  // === EODONTO: Dual-AI Comparison ===
  console.log('🟢 Generating EODONTO version...');
  const [eodontoLovableResult, eodontoDeepSeekResult] = await Promise.allSettled([
    generateWithLovableAI(eodontoPrompt),
    generateWithDeepSeek(eodontoPrompt)
  ]);

  const eodontoComparison = await compareAndSelectBestResponse(
    eodontoLovableResult, 
    eodontoDeepSeekResult
  );
  
  const eodontoMetadata = extractBlogMetadata(eodontoComparison.selectedContent);
  
  console.log(`✅ EODONTO: ${eodontoComparison.selectedAPI} selected (score: ${eodontoComparison.score})`);

  // === SALVAR NO BANCO (Dentala) ===
  const dentalaVersion = {
    id: crypto.randomUUID(),
    title: dentalaMetadata.title,
    content: dentalaComparison.selectedContent,
    meta_description: dentalaMetadata.metaDescription,
    keywords: dentalaMetadata.keywords,
    generated_at: new Date().toISOString(),
    ai_source: dentalaComparison.selectedAPI,
    domain: "dentala.com.br"
  };

  const { data: existingDentala } = await supabase
    .from('blog_posts')
    .select('id, version_history')
    .eq('landing_page_id', landingPageId)
    .contains('published_domains', ['dentala.com.br'])
    .maybeSingle();

  const dentalaHistory = existingDentala?.version_history?.versions || [];
  const updatedDentalaHistory = {
    versions: [dentalaVersion, ...dentalaHistory].slice(0, 10)
  };

  console.log('🟡 Tentando salvar blog DENTALA...');
  
  const dentalaPayload: any = {
    landing_page_id: landingPageId,
    title: dentalaVersion.title,
    content: dentalaVersion.content,
    meta_description: dentalaVersion.meta_description,
    keywords: dentalaVersion.keywords,
    published_domains: ['dentala.com.br'],
    version_history: updatedDentalaHistory,
    status: 'draft',
    updated_at: new Date().toISOString(),
  };
  
  if (existingDentala?.id) dentalaPayload.id = existingDentala.id;

  const { data: dentalaSaved, error: dentalaError } = await supabase
    .from('blog_posts')
    .upsert(dentalaPayload)
    .select()
    .single();

  if (dentalaError) {
    console.error('❌ DENTALA upsert error:', dentalaError);
    throw new Error(`Failed to save Dentala blog: ${dentalaError.message}`);
  }

  console.log(`✅ DENTALA saved successfully!`);
  console.log(`   📦 Database ID: ${dentalaSaved.id}`);
  console.log(`   📚 Version history: ${updatedDentalaHistory.versions.length} versions`);

  // === SALVAR NO BANCO (Eodonto) ===
  const eodontoVersion = {
    id: crypto.randomUUID(),
    title: eodontoMetadata.title,
    content: eodontoComparison.selectedContent,
    meta_description: eodontoMetadata.metaDescription,
    keywords: eodontoMetadata.keywords,
    generated_at: new Date().toISOString(),
    ai_source: eodontoComparison.selectedAPI,
    domain: "eodonto.com.br"
  };

  const { data: existingEodonto } = await supabase
    .from('blog_posts')
    .select('id, version_history')
    .eq('landing_page_id', landingPageId)
    .contains('published_domains', ['eodonto.com.br'])
    .maybeSingle();

  const eodontoHistory = existingEodonto?.version_history?.versions || [];
  const updatedEodontoHistory = {
    versions: [eodontoVersion, ...eodontoHistory].slice(0, 10)
  };

  console.log('🟡 Tentando salvar blog EODONTO...');
  
  const eodontoPayload: any = {
    landing_page_id: landingPageId,
    title: eodontoVersion.title,
    content: eodontoVersion.content,
    meta_description: eodontoVersion.meta_description,
    keywords: eodontoVersion.keywords,
    published_domains: ['eodonto.com.br'],
    version_history: updatedEodontoHistory,
    status: 'draft',
    updated_at: new Date().toISOString(),
  };
  
  if (existingEodonto?.id) eodontoPayload.id = existingEodonto.id;

  const { data: eodontoSaved, error: eodontoError } = await supabase
    .from('blog_posts')
    .upsert(eodontoPayload)
    .select()
    .single();

  if (eodontoError) {
    console.error('❌ EODONTO upsert error:', eodontoError);
    throw new Error(`Failed to save Eodonto blog: ${eodontoError.message}`);
  }

  console.log(`✅ EODONTO saved successfully!`);
  console.log(`   📦 Database ID: ${eodontoSaved.id}`);
  console.log(`   📚 Version history: ${updatedEodontoHistory.versions.length} versions`);

  // === RETORNAR ESTRUTURA COMPLETA ===
  return {
    dentala: {
      id: dentalaVersion.id,
      title: dentalaVersion.title,
      content: dentalaVersion.content,
      meta_description: dentalaVersion.meta_description,
      keywords: dentalaVersion.keywords,
      contentLength: dentalaVersion.content.length,
      selectedAPI: dentalaComparison.selectedAPI,
      score: dentalaComparison.score,
      domain: "dentala.com.br"
    },
    eodonto: {
      id: eodontoVersion.id,
      title: eodontoVersion.title,
      content: eodontoVersion.content,
      meta_description: eodontoVersion.meta_description,
      keywords: eodontoVersion.keywords,
      contentLength: eodontoVersion.content.length,
      selectedAPI: eodontoComparison.selectedAPI,
      score: eodontoComparison.score,
      domain: "eodonto.com.br"
    },
    metrics: {
      dentala: dentalaComparison.metrics,
      eodonto: eodontoComparison.metrics
    }
  };
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