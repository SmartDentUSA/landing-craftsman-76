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

function extractBlogMetadata(rawMarkdown: string) {
  // ✅ STEP 1: Limpeza agressiva de code fences
  let cleanedMarkdown = rawMarkdown.trim();
  
  // Remover ```json ... ``` (case insensitive, multiline)
  cleanedMarkdown = cleanedMarkdown.replace(/^```json\s*/gi, '').replace(/```\s*$/gm, '').trim();
  
  // ✅ STEP 2: Tentar parsear como JSON e extrair campo "content"
  let contentToProcess = cleanedMarkdown;
  try {
    const parsed = JSON.parse(cleanedMarkdown);
    if (parsed.content) {
      console.log('🔄 JSON detectado - extraindo campo "content"');
      contentToProcess = parsed.content;
    }
    if (parsed.title) {
      console.log(`📝 Título extraído do JSON: "${parsed.title}"`);
    }
  } catch {
    // Não é JSON, continuar com raw content
    console.log('✅ Conteúdo não é JSON, processando como markdown');
  }
  
  // ✅ STEP 3: Validar que não há JSON residual
  if (contentToProcess.includes('```json') || contentToProcess.includes('"title":') || contentToProcess.includes('"content":')) {
    console.error('❌ ALERTA: Conteúdo ainda contém JSON wrapping!');
    console.log('Raw (primeiros 200 chars):', contentToProcess.substring(0, 200));
    // Tentar limpeza adicional agressiva
    contentToProcess = contentToProcess.replace(/```json\s*\{[^}]*"content":\s*"/g, '');
    contentToProcess = contentToProcess.replace(/"[^"]*\}\s*```/g, '');
    contentToProcess = contentToProcess.replace(/^\{.*?"content":\s*"/g, '');
    contentToProcess = contentToProcess.replace(/".*?\}$/g, '');
  }
  
  // Extrair título e metadata
  const lines = contentToProcess.split('\n').filter(line => line.trim());
  const rawTitle = lines[0]?.replace(/^#+\s*/, '') || "Blog Estratégico";
  const title = sanitizeTitle(rawTitle);
  
  // Extrair meta description
  const firstParagraph = lines.find(line => 
    !line.startsWith('#') && 
    !line.startsWith('**') && 
    line.length > 50
  );
  const metaDescription = firstParagraph 
    ? firstParagraph.substring(0, 155).trim() + '...'
    : '';
  
  // Extrair keywords
  const keywords: string[] = [];
  const keywordMatches = contentToProcess.match(/\*\*([^*]+)\*\*/g);
  if (keywordMatches) {
    keywords.push(
      ...keywordMatches
        .slice(0, 10)
        .map(k => k.replace(/\*\*/g, '').trim())
        .filter(k => k.length > 3)
    );
  }
  
  return { 
    title, 
    metaDescription, 
    keywords,
    cleanContent: contentToProcess
  };
}

/**
 * ✅ PATCH: Extrai target_audience dinamicamente com fallback inteligente
 * Prioridade:
 * 1. company_profile.target_audience
 * 2. products_repository (agregado de produtos selecionados)
 * 3. categories_config.target_audience
 * 4. FALLBACK INTELIGENTE: SEO Hidden fields
 * 5. FALLBACK GENÉRICO: "Profissionais e empresas do setor odontológico"
 */
function extractTargetAudience(context: any): string {
  console.log('🎯 Extracting target audience with priority fallback...');
  
  // 1ª PRIORIDADE: Company Profile
  if (context.companyProfile?.target_audience) {
    const audience = Array.isArray(context.companyProfile.target_audience)
      ? context.companyProfile.target_audience.join(', ')
      : context.companyProfile.target_audience;
    console.log(`✅ Target audience from company_profile: "${audience}"`);
    return audience;
  }
  
  // 2ª PRIORIDADE: Produtos selecionados (agregado)
  if (context.selectedProducts?.length > 0) {
    const audiences = new Set<string>();
    context.selectedProducts.forEach((p: any) => {
      if (Array.isArray(p.target_audience)) {
        p.target_audience.forEach((a: string) => {
          if (a && a.trim()) audiences.add(a.trim());
        });
      }
    });
    if (audiences.size > 0) {
      const result = Array.from(audiences).join(', ');
      console.log(`✅ Target audience from products (aggregated): "${result}"`);
      return result;
    }
  }
  
  // 3ª PRIORIDADE: Landing Page (se tiver configurado)
  if (context.landingPage?.data?.target_audience) {
    const audience = Array.isArray(context.landingPage.data.target_audience)
      ? context.landingPage.data.target_audience.join(', ')
      : context.landingPage.data.target_audience;
    console.log(`✅ Target audience from landing_page: "${audience}"`);
    return audience;
  }
  
  // 4ª PRIORIDADE: FALLBACK INTELIGENTE usando SEO Hidden fields
  if (context.seoContext) {
    const parts: string[] = [];
    
    if (context.seoContext.marketPositioning) {
      parts.push(context.seoContext.marketPositioning);
    }
    if (context.seoContext.technicalExpertise) {
      parts.push(`especialistas em ${context.seoContext.technicalExpertise}`);
    }
    if (context.seoContext.serviceAreas) {
      parts.push(`atuantes em ${context.seoContext.serviceAreas}`);
    }
    
    if (parts.length > 0) {
      const intelligentFallback = parts.join(' e ');
      console.warn(`⚠️ Using intelligent fallback from SEO Hidden: "${intelligentFallback}"`);
      return intelligentFallback;
    }
  }
  
  // 5ª PRIORIDADE: FALLBACK GENÉRICO FINAL
  const genericFallback = 'Profissionais e empresas do setor odontológico';
  console.warn(`⚠️⚠️ Using GENERIC fallback: "${genericFallback}"`);
  return genericFallback;
}

/**
 * ✅ Extrai keywords técnicas do contexto (Dentala)
 */
function extractKeywords(context: any): string[] {
  const keywords = new Set<string>();
  
  // De produtos selecionados
  context.selectedProducts?.forEach((p: any) => {
    if (Array.isArray(p.keywords)) {
      p.keywords.forEach((k: string) => {
        if (k && k.trim()) keywords.add(k.trim());
      });
    }
    if (Array.isArray(p.market_keywords)) {
      p.market_keywords.forEach((k: string) => {
        if (k && k.trim()) keywords.add(k.trim());
      });
    }
  });
  
  // De company profile SEO
  if (Array.isArray(context.seoContext?.contextKeywords)) {
    context.seoContext.contextKeywords.forEach((k: string) => {
      if (k && k.trim()) keywords.add(k.trim());
    });
  }
  
  const result = Array.from(keywords).slice(0, 10);
  console.log(`🔑 Extracted ${result.length} technical keywords`);
  return result;
}

/**
 * ✅ Extrai keywords comerciais (intenção de compra) (Eodonto)
 */
function extractCommercialKeywords(context: any): string[] {
  const allKeywords = extractKeywords(context);
  
  // Filtrar keywords com intenção comercial
  const commercialTerms = ['comprar', 'preço', 'oferta', 'desconto', 'promoção', 'onde encontrar', 'melhor', 'barato', 'custo'];
  const commercial = allKeywords.filter(k => 
    commercialTerms.some(term => k.toLowerCase().includes(term))
  );
  
  // Se não houver keywords comerciais explícitas, adicionar genéricas baseadas em produtos
  if (commercial.length === 0 && context.selectedProducts?.length > 0) {
    const productNames = context.selectedProducts.map((p: any) => p.name).filter(Boolean);
    const generated = productNames.flatMap((name: string) => [
      `comprar ${name}`,
      `${name} preço`,
      `${name} promoção`
    ]);
    console.log(`🛒 Generated ${generated.length} commercial keywords from products`);
    return generated.slice(0, 10);
  }
  
  console.log(`🛒 Extracted ${commercial.length} commercial keywords`);
  return commercial.slice(0, 10);
}

/**
 * ✅ Extrai benefícios/features dos produtos
 */
function extractBenefits(context: any): string[] {
  const benefits = new Set<string>();
  
  context.selectedProducts?.forEach((p: any) => {
    if (Array.isArray(p.benefits)) {
      p.benefits.forEach((b: string) => {
        if (b && b.trim()) benefits.add(b.trim());
      });
    }
    if (Array.isArray(p.features)) {
      p.features.forEach((f: string) => {
        if (f && f.trim()) benefits.add(f.trim());
      });
    }
  });
  
  const result = Array.from(benefits).slice(0, 8);
  console.log(`💡 Extracted ${result.length} benefits/features`);
  return result;
}

/**
 * ✅ Constrói contexto SEO dinâmico baseado nos campos selecionados
 */
function buildDynamicSEOContext(context: any): string {
  if (!context.seoContext) return '';
  
  const parts = [];
  
  if (Array.isArray(context.seoContext.contextKeywords) && context.seoContext.contextKeywords.length > 0) {
    parts.push(`- Palavras-chave contextuais: ${context.seoContext.contextKeywords.join(', ')}`);
  }
  
  if (context.seoContext.marketPositioning) {
    parts.push(`- Posicionamento de mercado: ${context.seoContext.marketPositioning}`);
  }
  
  if (context.seoContext.competitiveAdvantages) {
    parts.push(`- Vantagens competitivas: ${context.seoContext.competitiveAdvantages}`);
  }
  
  if (context.seoContext.technicalExpertise) {
    parts.push(`- Expertise técnica: ${context.seoContext.technicalExpertise}`);
  }
  
  if (context.seoContext.serviceAreas) {
    parts.push(`- Áreas de atuação: ${context.seoContext.serviceAreas}`);
  }
  
  return parts.length > 0 
    ? `\n## CONTEXTO SEO ESTRATÉGICO:\n${parts.join('\n')}\n`
    : '';
}

function buildDentalaPrompt(context: any, customPrompts: any): string {
  const basePrompt = customPrompts['Artigo Estratégico Contextual'] || '';
  
  // ✅ EXTRAIR DINAMICAMENTE
  const targetAudience = extractTargetAudience(context);
  const keywords = extractKeywords(context);
  const benefits = extractBenefits(context);
  
  return `${basePrompt}

# CONTEXTO ESPECÍFICO: Dentala.com.br
ABORDAGEM EDITORIAL: Técnica, baseada em dados e especificações
PÚBLICO-ALVO: ${targetAudience}

## DIRETRIZES DENTALA:
- **Tom:** Técnico-profissional, baseado em evidências
- **Foco:** Especificações técnicas, diferenciais tecnológicos, aplicações práticas
- **CTAs:** "Veja especificações completas", "Compare modelos", "Entenda a tecnologia"
- **Keywords Prioritárias:** ${keywords.length > 0 ? keywords.join(', ') : 'N/A'}
- **Benefícios a Destacar:** ${benefits.length > 0 ? benefits.join(', ') : 'N/A'}

${buildDynamicSEOContext(context)}

## ESTRUTURA HTML OBRIGATÓRIA:

1. Usar <section class="card"> para cada tópico principal
2. Incluir <h2> com texto descritivo (usado para TOC automático)
3. Usar <div class="grid-3"> para listas de benefícios (sempre 3 itens)
4. Cada benefício deve ter:
   - <div class="badge">Etiqueta Curta</div>
   - <h4>Título do Benefício</h4>
   - <p>Descrição de 2-3 linhas</p>
5. Usar <blockquote> para citações importantes

EXEMPLO DE SEÇÃO:

<section class="card">
  <h2>Como Funciona o Processo de Implante Dentário</h2>
  <p>O implante dentário é um procedimento avançado que restaura a função e estética...</p>
  
  <div class="grid-3">
    <div class="benefit">
      <div class="badge">Etapa 1</div>
      <h4>Avaliação Inicial</h4>
      <p>Análise completa da saúde bucal com tecnologia 3D.</p>
    </div>
    <div class="benefit">
      <div class="badge">Etapa 2</div>
      <h4>Cirurgia de Implante</h4>
      <p>Procedimento minimamente invasivo com recuperação rápida.</p>
    </div>
    <div class="benefit">
      <div class="badge">Etapa 3</div>
      <h4>Prótese Final</h4>
      <p>Instalação da coroa com aspecto natural.</p>
    </div>
  </div>
</section>

⚠️ **INSTRUÇÕES ANTI-ALUCINAÇÃO OBRIGATÓRIAS:**
- Use APENAS dados fornecidos no contexto acima
- NÃO invente especificações técnicas, benefícios ou características
- Se um dado não estiver disponível, seja genérico mas NÃO crie informações falsas
- PROIBIDO usar termos como "biocompatível", "precisão milimétrica" se não estiverem nos dados
- Base TUDO em evidências explícitas do contexto fornecido
- SEMPRE use a estrutura de cards e benefit grid acima

GERE UM ARTIGO EM PORTUGUÊS BRASILEIRO que demonstre autoridade técnica e seja útil para profissionais da odontologia.
`;
}

function buildEodontoPrompt(context: any, customPrompts: any): string {
  const basePrompt = customPrompts['Artigo Estratégico Contextual'] || '';
  
  // ✅ EXTRAIR DINAMICAMENTE
  const targetAudience = extractTargetAudience(context);
  const commercialKeywords = extractCommercialKeywords(context);
  const benefits = extractBenefits(context);
  
  return `${basePrompt}

# CONTEXTO ESPECÍFICO: Eodonto.com.br
ABORDAGEM EDITORIAL: Persuasiva, focada em soluções e benefícios práticos
PÚBLICO-ALVO: ${targetAudience}

## DIRETRIZES EODONTO:
- **Tom:** Persuasivo, orientado a resultados e benefícios
- **Foco:** Soluções práticas, facilidade de uso, impacto real no negócio
- **CTAs:** "Descubra a solução", "Transforme seu consultório", "Veja os resultados"
- **Keywords Comerciais:** ${commercialKeywords.length > 0 ? commercialKeywords.join(', ') : 'N/A'}
- **Benefícios Práticos:** ${benefits.length > 0 ? benefits.join(', ') : 'N/A'}

${buildDynamicSEOContext(context)}

## ESTRUTURA HTML OBRIGATÓRIA:

1. Usar <section class="card"> para cada tópico principal
2. Incluir <h2> com texto descritivo (usado para TOC automático)
3. Usar <div class="grid-3"> para listas de benefícios (sempre 3 itens)
4. Cada benefício deve ter:
   - <div class="badge">Vantagem</div>
   - <h4>Título do Benefício</h4>
   - <p>Descrição persuasiva de 2-3 linhas</p>
5. Usar <blockquote> para depoimentos e citações

EXEMPLO DE SEÇÃO:

<section class="card">
  <h2>Transforme Seu Consultório com Tecnologia Moderna</h2>
  <p>Descubra como a tecnologia pode revolucionar seu atendimento...</p>
  
  <div class="grid-3">
    <div class="benefit">
      <div class="badge">Economia</div>
      <h4>Reduza Custos</h4>
      <p>Economize até 40% com processos digitais eficientes.</p>
    </div>
    <div class="benefit">
      <div class="badge">Velocidade</div>
      <h4>Atenda Mais Rápido</h4>
      <p>Reduza o tempo de procedimentos em até 60%.</p>
    </div>
    <div class="benefit">
      <div class="badge">Qualidade</div>
      <h4>Melhore Resultados</h4>
      <p>Aumente a satisfação dos pacientes com precisão.</p>
    </div>
  </div>
</section>

⚠️ **INSTRUÇÕES ANTI-ALUCINAÇÃO OBRIGATÓRIAS:**
- Use APENAS dados fornecidos no contexto acima
- NÃO invente especificações, preços ou características de produtos
- Se um dado não estiver disponível, seja genérico mas NÃO crie informações falsas
- Foque em benefícios e soluções REAIS baseadas nos dados fornecidos
- PROIBIDO inventar diferenciais competitivos não mencionados
- SEMPRE use a estrutura de cards e benefit grid acima

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
    content: dentalaMetadata.cleanContent, // ✅ Usar conteúdo limpo
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
  
  // ✅ VALIDAÇÃO ANTES DE SALVAR
  if (dentalaMetadata.cleanContent.includes('```json') || 
      dentalaMetadata.cleanContent.includes('"title":') ||
      dentalaMetadata.cleanContent.includes('"content":')) {
    console.error('❌ DENTALA: Conteúdo malformado detectado!');
    console.log('Primeiros 300 chars:', dentalaMetadata.cleanContent.substring(0, 300));
    throw new Error('Conteúdo Dentala contém JSON wrapping residual');
  }
  
  const dentalaPayload: any = {
    landing_page_id: landingPageId,
    title: dentalaMetadata.title,
    content: dentalaMetadata.cleanContent,
    meta_description: dentalaMetadata.metaDescription,
    keywords: dentalaMetadata.keywords,
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
    content: eodontoMetadata.cleanContent, // ✅ Usar conteúdo limpo
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
  
  // ✅ VALIDAÇÃO ANTES DE SALVAR
  if (eodontoMetadata.cleanContent.includes('```json') || 
      eodontoMetadata.cleanContent.includes('"title":') ||
      eodontoMetadata.cleanContent.includes('"content":')) {
    console.error('❌ EODONTO: Conteúdo malformado detectado!');
    console.log('Primeiros 300 chars:', eodontoMetadata.cleanContent.substring(0, 300));
    throw new Error('Conteúdo Eodonto contém JSON wrapping residual');
  }
  
  const eodontoPayload: any = {
    landing_page_id: landingPageId,
    title: eodontoMetadata.title,
    content: eodontoMetadata.cleanContent,
    meta_description: eodontoMetadata.metaDescription,
    keywords: eodontoMetadata.keywords,
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

  // === ATUALIZAR FLAG blog_generated NA LANDING PAGE ===
  console.log(`🔄 Atualizando flag blog_generated para LP ${landingPageId}...`);
  const { error: updateLPError } = await supabase
    .from('landing_pages')
    .update({ 
      blog_generated: true,
      blog_generated_at: new Date().toISOString()
    })
    .eq('id', landingPageId);

  if (updateLPError) {
    console.warn('⚠️ Não foi possível atualizar blog_generated:', updateLPError);
  } else {
    console.log('✅ Flag blog_generated atualizada com sucesso!');
  }

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
        { 
          role: 'user', 
          content: `Gere um artigo estratégico completo em PORTUGUÊS BRASILEIRO baseado no contexto fornecido. 

IMPORTANTE: 
- Use apenas português brasileiro, nunca espanhol
- Retorne APENAS o conteúdo markdown do artigo
- NÃO retorne JSON, NÃO use code fences (\`\`\`json), NÃO envolva em objetos
- Comece diretamente com o título markdown (# Título)` 
        }
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
        { 
          role: 'user', 
          content: `Gere um artigo estratégico completo em PORTUGUÊS BRASILEIRO baseado no contexto fornecido. 

IMPORTANTE: 
- Use apenas português brasileiro, nunca espanhol
- Retorne APENAS o conteúdo markdown do artigo
- NÃO retorne JSON, NÃO use code fences (\`\`\`json), NÃO envolva em objetos
- Comece diretamente com o título markdown (# Título)` 
        }
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