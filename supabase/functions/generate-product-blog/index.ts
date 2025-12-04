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
    console.log('🚀 Generate Product Blog - Starting request');
    
    const { productId, blogType, useIntelligentLinks = true } = await req.json();
    
    if (!productId || !blogType) {
      throw new Error('productId e blogType são obrigatórios');
    }

    if (!['commercial', 'technical'].includes(blogType)) {
      throw new Error('blogType deve ser "commercial" ou "technical"');
    }

    // Configurar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📦 Fetching product data for ID: ${productId}`);
    
    // Buscar dados do produto
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error(`Produto não encontrado: ${productError?.message}`);
    }

    console.log(`✅ Product found: ${product.name}`);

    // Buscar perfil da empresa para contexto adicional
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    // Gerar blog + FAQs com IA (prompt combinado)
    const blogResult = await generateProductBlog(deepSeekApiKey, product, companyProfile, blogType);
    
    let intelligentLinks = {};
    let finalBlogContent = blogResult.content;
    
    console.log(`✅ Blog generated with ${blogResult.faqs?.length || 0} FAQs`);
    
    // Aplicar links inteligentes apenas se habilitado
    if (useIntelligentLinks) {
      console.log('🔗 Generating intelligent links...');
      intelligentLinks = await generateIntelligentLinks(supabase, product, blogResult.content, blogType);
      finalBlogContent = await processContentWithIntelligentLinks(blogResult.content, intelligentLinks);
      console.log(`✅ Applied ${Object.keys(intelligentLinks).length} intelligent links`);
    } else {
      console.log('🚫 Intelligent links disabled by user');
    }
    
    // Carregar histórico existente
    const existingBlogContent = product.individual_blog_content || {};
    const commercialHistory = existingBlogContent.commercial_versions || [];
    const technicalHistory = existingBlogContent.technical_versions || [];

    // Criar nova versão com FAQs integradas
    const newVersion = {
      id: crypto.randomUUID(),
      content: finalBlogContent,
      faqs: blogResult.faqs || [], // ✅ FAQs geradas junto com o blog
      generated_at: new Date().toISOString(),
      ai_source: "deepseek-chat",
      intelligent_links: intelligentLinks,
      use_intelligent_links: useIntelligentLinks
    };

    // Atualizar histórico específico do tipo
    const updatedCommercialHistory = blogType === 'commercial' 
      ? [newVersion, ...commercialHistory].slice(0, 10)
      : commercialHistory;

    const updatedTechnicalHistory = blogType === 'technical'
      ? [newVersion, ...technicalHistory].slice(0, 10)
      : technicalHistory;

    // Estrutura completa com histórico + compatibilidade + FAQs
    const updatedBlogContent = {
      commercial_versions: updatedCommercialHistory,
      technical_versions: updatedTechnicalHistory,
      // Campos de compatibilidade (últimas versões)
      commercial: updatedCommercialHistory[0]?.content || existingBlogContent.commercial,
      technical: updatedTechnicalHistory[0]?.content || existingBlogContent.technical,
      commercial_faqs: updatedCommercialHistory[0]?.faqs || existingBlogContent.commercial_faqs || [], // ✅ FAQs comerciais
      technical_faqs: updatedTechnicalHistory[0]?.faqs || existingBlogContent.technical_faqs || [], // ✅ FAQs técnicas
      commercial_links: updatedCommercialHistory[0]?.intelligent_links || {},
      technical_links: updatedTechnicalHistory[0]?.intelligent_links || {},
      generated_at: new Date().toISOString(),
      use_intelligent_links: useIntelligentLinks
    };

    console.log(`✅ ${blogType} blog saved with version history: ${blogType === 'commercial' ? updatedCommercialHistory.length : updatedTechnicalHistory.length} versions`);

    const { error: updateError } = await supabase
      .from('products_repository')
      .update({ individual_blog_content: updatedBlogContent })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Erro ao salvar blog: ${updateError.message}`);
    }

    console.log(`✅ Blog ${blogType} generated and saved for product: ${product.name}`);

    return new Response(JSON.stringify({
      success: true,
      productId,
      blogType,
      contentLength: finalBlogContent.length,
      linksApplied: Object.keys(intelligentLinks).length,
      useIntelligentLinks,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in generate-product-blog:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ✅ INTERFACE: Resultado do blog com FAQs integradas
interface BlogFAQ {
  question: string;
  answer: string;
  sge_snippet: string;
  category: 'o-que-e' | 'como-funciona' | 'comparacao' | 'beneficios' | 'casos-de-uso';
}

interface BlogGenerationResult {
  content: string;
  faqs: BlogFAQ[];
}

// Função para sanitizar conteúdo do blog removendo CTAs genéricos
function sanitizeBlogContent(content: string): string {
  if (!content) return '';
  
  let sanitized = content;
  
  // Remove CTAs genéricos específicos
  sanitized = sanitized.replace(/\[Solicite uma Demonstração[^\]]*\]/gi, '');
  sanitized = sanitized.replace(/\[Fale com Nossos Especialistas\]/gi, '');
  sanitized = sanitized.replace(/\[Baixe o Catálogo Completo\]/gi, '');
  
  // Remove frases específicas sobre futuro da odontologia
  sanitized = sanitized.replace(/O futuro da odontologia digital é simples[^.]*\./gi, '');
  
  // Remove rodapé Smart Dent completo
  sanitized = sanitized.replace(/---\s*\*?Smart Dent[^]*$/gi, '');
  
  // Remove informações de contato genérico
  sanitized = sanitized.replace(/Telefone:\s*\(XX\)[^]*$/gi, '');
  sanitized = sanitized.replace(/WhatsApp:\s*\(XX\)[^]*$/gi, '');
  sanitized = sanitized.replace(/Horário de Atendimento:[^]*$/gi, '');
  
  // Remove seções de CTA com heading
  sanitized = sanitized.replace(/###?\s*\[Solicite[^\]]*\][^]*?(?=###?|$)/gi, '');
  sanitized = sanitized.replace(/###?\s*\[Fale com[^\]]*\][^]*?(?=###?|$)/gi, '');
  sanitized = sanitized.replace(/###?\s*\[Baixe[^\]]*\][^]*?(?=###?|$)/gi, '');
  
  // Remove linhas vazias excessivas
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  return sanitized.trim();
}

async function generateProductBlog(
  apiKey: string, 
  product: any, 
  companyProfile: any, 
  blogType: 'commercial' | 'technical'
): Promise<BlogGenerationResult> {
  
  // Carregar prompts customizados do banco de dados
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: promptConfig } = await supabase
    .from('prompts_configuration')
    .select('custom_prompt, selected_fields, selected_data_sources, tone, style_guidelines, use_intelligent_links')
    .eq('edge_function_id', 'generate-product-blog')
    .eq('prompt_name', blogType === 'commercial' ? 'Blog Comercial' : 'Blog Técnico')
    .single();

  const customPrompt = promptConfig?.custom_prompt;
  const tone = promptConfig?.tone || 'professional';
  const styleGuidelines = promptConfig?.style_guidelines || {};
  
  const prompts = {
    commercial: {
      role: "Você é um especialista em marketing digital e copywriting comercial para produtos odontológicos.",
      objective: "Criar um blog post comercial envolvente que comece com um gancho irresistível e mantenha o leitor interessado até o final.",
      structure: `
# ${product.name}: [Título Irresistível que Desperta Curiosidade]

[Comece com uma situação problema que o dentista enfrenta diariamente ou uma pergunta provocativa que faça o leitor querer continuar lendo]

## A Solução Que Você Estava Procurando
[Apresente o produto como a resposta para o problema mencionado]

## Por Que Este Produto é Diferente?
[Destaque os diferenciais únicos e benefícios exclusivos]

## Resultados Que Você Pode Esperar
[Casos de uso práticos e transformações reais no consultório]

## Especificações Que Realmente Importam
[Características técnicas relevantes explicadas de forma simples]

## Garantia Total da Sua Satisfação
[Informações sobre garantia, suporte e confiança na compra]

## Não Deixe Essa Oportunidade Passar
[Call-to-action urgente e persuasivo]

INSTRUÇÕES CRÍTICAS:
- O título H1 deve ser comercial e atrativo, NUNCA genérico como "Análise comercial"
- Use títulos que despertem desejo e interesse de compra
- Foque nos benefícios e resultados que o produto oferece
- Evite linguagem analítica ou técnica demais no título`
    },
    technical: {
      role: "Você é um especialista técnico em equipamentos odontológicos e engenharia biomédica.",
      objective: "Criar um blog post técnico que comece de forma envolvente, despertando curiosidade sobre os aspectos técnicos do produto.",
      structure: `
# ${product.name}: [Título Técnico Intrigante sobre Inovação ou Tecnologia - NUNCA use palavras como "Análise", "Estudo" ou "Avaliação"]

[Inicie com uma pergunta técnica interessante, uma descoberta recente, ou um problema técnico que este produto resolve de forma inovadora]

## A Tecnologia Por Trás da Inovação
[Explique a tecnologia de forma envolvente, começando pelo 'por que' antes do 'como']

## Especificações Técnicas Avançadas
[Características técnicas detalhadas e precisas]

## Como Funciona na Prática Clínica
[Funcionamento técnico aplicado a casos reais]

## Aplicações Profissionais Específicas
[Usos técnicos especializados na odontologia moderna]

## Vantagens Técnicas Comprovadas
[Comparativo técnico baseado em dados e performance]

## Requisitos de Instalação e Manutenção
[Aspectos técnicos de implementação e cuidados]

## O Futuro da Odontologia Está Aqui
[Conclusão técnica inspiradora sobre o impacto da tecnologia]

INSTRUÇÕES CRÍTICAS:
- O título H1 deve ser atrativo e específico, NUNCA genérico como "Análise técnica"
- Use títulos que despertem curiosidade e interesse
- Evite linguagem acadêmica ou analítica no título
- Foque nos benefícios e características únicas do produto`
    }
  };

  const currentPrompt = prompts[blogType];
  
  // 🎬 NOVO: Extrair contexto de video_captions
  const { extractVideoCaptionsForBlog, hasCaptions } = await import('../_shared/video-captions-processor.ts');
  const videoCaptionsContext = hasCaptions(product.video_captions)
    ? extractVideoCaptionsForBlog(product.video_captions, blogType)
    : '';
  
  // FASE 1: Preparar dados COMPLETOS do produto (95% dos campos estruturados)
  const productData = {
    // Identificação Básica
    name: product.name,
    brand: product.brand || 'N/A',
    category: product.category || '',
    subcategory: product.subcategory || '',
    gtin: product.gtin || 'N/A',
    mpn: product.mpn || 'N/A',
    
    // Descrição & Pitch
    description: product.description || '',
    salesPitch: product.sales_pitch || '',
    applications: product.applications || '',
    
    // Público & Mercado
    targetAudience: Array.isArray(product.target_audience) ? product.target_audience.join(', ') : '',
    keywords: Array.isArray(product.keywords) ? product.keywords.join(', ') : '',
    marketKeywords: Array.isArray(product.market_keywords) ? product.market_keywords.join(', ') : '',
    searchIntentKeywords: Array.isArray(product.search_intent_keywords) ? product.search_intent_keywords.join(', ') : '',
    
    // Benefícios & Características
    benefits: Array.isArray(product.benefits) ? product.benefits.join(', ') : '',
    features: Array.isArray(product.features) ? product.features.join(', ') : '',
    technicalSpecs: product.technical_specifications ? 
      (typeof product.technical_specifications === 'string' ? product.technical_specifications :
       Array.isArray(product.technical_specifications) ? product.technical_specifications.map((s: any) => 
         (typeof s === 'object' && s && 'name' in s && 'value' in s) ? `${s.name}: ${s.value}` : String(s)
       ).join(', ') : '') : 'N/A',
    
    // Informações Comerciais
    price: product.price ? `${product.currency || 'BRL'} ${product.price}` : '',
    warrantyInfo: product.warranty_info || 'N/A',
    shippingInfo: product.shipping_info || 'N/A',
    
    // FAQs Existentes (para contexto)
    faq: Array.isArray(product.faq) ? product.faq : [],
    
    // Imagem
    imageUrl: product.image_url || ''
  };

  // FASE 1: Preparar dados COMPLETOS da empresa (incluindo SEO Hidden fields)
  const companyData = companyProfile ? {
    name: companyProfile.company_name || '',
    description: companyProfile.company_description || '',
    mission: companyProfile.mission_statement || '',
    values: companyProfile.brand_values || '',
    // SEO Hidden Fields
    seoTechnicalExpertise: companyProfile.seo_technical_expertise || 'N/A',
    seoMarketPositioning: companyProfile.seo_market_positioning || 'N/A',
    seoCompetitiveAdvantages: companyProfile.seo_competitive_advantages || 'N/A',
    seoContextKeywords: Array.isArray(companyProfile.seo_context_keywords) ? 
      companyProfile.seo_context_keywords.join(', ') : 'N/A',
    seoServiceAreas: companyProfile.seo_service_areas || 'N/A'
  } : null;

  // Se há um prompt customizado, processa variáveis; senão usa o prompt padrão
  let systemPrompt;
  
  if (customPrompt && promptConfig) {
    // Usar prompt customizado com campos selecionados
    const { extractSelectedData, processPromptWithSelectedData, extractExistingContent } = await import('../_shared/prompt-processor.ts');
    const selectedData = extractSelectedData(product, companyProfile, {
      selectedFields: promptConfig.selected_fields || {},
      selectedDataSources: promptConfig.selected_data_sources || []
    });
    
    // Extrair conteúdo existente para anti-duplicação
    const existingContent = extractExistingContent(product, 'blog');
    
    systemPrompt = processPromptWithSelectedData(customPrompt, selectedData, existingContent);
    console.log('📝 Using custom prompt with selected fields and anti-duplication');
  } else {
    systemPrompt = `${currentPrompt.role}

IMPORTANTE: Você DEVE escrever TODO o conteúdo em PORTUGUÊS BRASILEIRO. Jamais use espanhol ou outros idiomas.

OBJETIVO: ${currentPrompt.objective}

═══════════════════════════════════════════════════════════
📦 DADOS COMPLETOS DO PRODUTO (USE TODOS - FASE 1 IMPLEMENTADA)
═══════════════════════════════════════════════════════════

🏷️ IDENTIFICAÇÃO BÁSICA:
- Nome: ${productData.name}
- Marca: ${productData.brand}
- Categoria: ${productData.category} > ${productData.subcategory}
- GTIN/EAN: ${productData.gtin}
- MPN: ${productData.mpn}

📝 DESCRIÇÃO & PITCH:
- Descrição: ${productData.description}
- Pitch de Vendas: ${productData.salesPitch}
- Aplicações: ${productData.applications}

🎯 PÚBLICO & MERCADO:
- Público-alvo: ${productData.targetAudience}
- Keywords Primárias: ${productData.keywords}
- Keywords de Mercado: ${productData.marketKeywords}
- Keywords de Intenção de Busca: ${productData.searchIntentKeywords}

💎 BENEFÍCIOS & CARACTERÍSTICAS:
- Benefícios: ${productData.benefits}
- Características: ${productData.features}
- Especificações Técnicas: ${productData.technicalSpecs}

💰 INFORMAÇÕES COMERCIAIS:
- Preço: ${productData.price}
- Garantia: ${productData.warrantyInfo}
- Envio: ${productData.shippingInfo}

❓ FAQs EXISTENTES DO PRODUTO (CONTEXTO - NÃO DUPLICAR):
${productData.faq.length > 0 ? productData.faq.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n') : 'Nenhum FAQ existente'}

🎬 INSIGHTS DE VÍDEOS (Legendas Processadas):
${videoCaptionsContext}

${companyData ? `🏢 CONTEXTO DA EMPRESA:
- Nome: ${companyData.name}
- Descrição: ${companyData.description}
- Missão: ${companyData.mission}
- Valores: ${companyData.values}
- Expertise Técnica: ${companyData.seoTechnicalExpertise}
- Posicionamento de Mercado: ${companyData.seoMarketPositioning}
- Vantagens Competitivas: ${companyData.seoCompetitiveAdvantages}
- Keywords Contextuais: ${companyData.seoContextKeywords}
- Áreas de Serviço: ${companyData.seoServiceAreas}` : ''}

ESTRUTURA OBRIGATÓRIA:
${currentPrompt.structure}

═══════════════════════════════════════════════════════════
🤖 INSTRUÇÕES PARA OTIMIZAÇÃO SGE/AEO/IA-READY (FASE 1)
═══════════════════════════════════════════════════════════

**REGRA DE OURO**: Cada parágrafo deve poder responder UMA pergunta específica que uma IA (ChatGPT, Perplexity, Google SGE) faria.

**ESTRUTURA OBRIGATÓRIA**:

1. **Primeiro Parágrafo** (Question Answering Snippet):
   - Primeira frase = resposta direta com dado numérico
   - Exemplo: "Tempo de escaneamento: 20-30 segundos por arcada completa"
   - Incluir GTIN/MPN se disponível: "O ${productData.name} (GTIN: ${productData.gtin}) oferece..."
   - Segunda frase = contexto técnico com especificações
   - Terceira frase = benefício prático com impacto mensurável

2. **Seção de Especificações** (Tabela Comparativa):
   - Criar tabela Markdown comparando com alternativas genéricas
   - Incluir: Resolução, Peso, Conectividade, Compatibilidade
   - Usar dados de Especificações Técnicas fornecidos acima
   - Formato:
   \`\`\`
   | Especificação | ${productData.name} | Alternativa Tradicional | Ganho |
   |---------------|---------------------|------------------------|-------|
   | Tempo         | [dado real]         | [estimativa genérica]  | X%    |
   \`\`\`

3. **Seção "Como Funciona"** (HowTo):
   - Lista numerada de 5-7 passos práticos
   - Cada passo: Ação + Tempo estimado + Resultado
   - Exemplo: "1. **Conecte via USB 3.0** (10 segundos) → LED verde confirma conexão"
   - Usar dados das Aplicações fornecidos

4. **Seção de Compatibilidade** (Checklist):
   - ✅ Sistemas operacionais compatíveis
   - ✅ Softwares CAD/CAM compatíveis (se relevante)
   - ✅ Requisitos de hardware mínimos
   - Extrair de Especificações Técnicas ou inferir da categoria

5. **Seção de Benefícios** (Bullets com Dados Numéricos):
   - Cada benefício = dado numérico + impacto prático
   - Exemplo: "❌ Moldagens tradicionais: 15 minutos + desconforto → ✅ ${productData.name}: 30 segundos + visualização imediata"
   - Usar TODOS os benefícios fornecidos em ${productData.benefits}

6. **Seção de FAQ Integrada** (Referência Cruzada):
   - NÃO duplicar os FAQs existentes mencionados acima
   - Se houver FAQs, mencionar: "Para mais detalhes técnicos, consulte as [X] FAQs ao final da página"
   - Criar LINK INTERNO para seção FAQ: [Ver FAQs](#faq)

7. **Seção de Casos de Uso** (Narrativa com Dados):
   - 2-3 cenários práticos do público-alvo
   - Formato: Situação → Problema → Solução com o produto → Resultado mensurável
   - Exemplo: "Clínica com 5 consultórios → Gargalo de moldagens (3h/dia) → ${productData.name} em cada sala → Economia de 2h40min/dia"

8. **Otimização de Keywords**:
   - Usar TODAS as keywords de: ${productData.keywords}, ${productData.marketKeywords}, ${productData.searchIntentKeywords}
   - Primeira menção de cada keyword: negrito (**${productData.name}**)
   - Variações naturais: "scanner intraoral", "escaneamento 3D odontológico"

9. **Links Internos Inteligentes** (será processado depois):
   - Mencionar produtos relacionados pelo nome
   - Mencionar categorias
   - Sistema de intelligent links vai adicionar URLs automaticamente

10. **Meta Information para Schema** (incluir no texto):
    - Incluir GTIN, MPN, Brand naturalmente no texto
    - Exemplo: "O ${productData.name} (GTIN: ${productData.gtin}, MPN: ${productData.mpn}) da marca ${productData.brand}..."
    - Mencionar garantia se disponível: "${productData.warrantyInfo}"

INSTRUÇÕES ESPECÍFICAS:
1. COMECE DE FORMA ENVOLVENTE: Nunca use frases formais como "Análise comercial" ou "Análise técnica" no início
2. DESPERTE CURIOSIDADE: O primeiro parágrafo deve fazer o leitor querer continuar lendo
3. Use APENAS as informações fornecidas sobre o produto
4. Mantenha um tom ${blogType === 'commercial' ? 'conversacional e persuasivo, como se estivesse falando com um amigo dentista' : 'técnico mas acessível, explicando complexidade de forma interessante'}
5. Inclua naturalmente as keywords do produto no texto
6. O blog deve ter entre 800-1200 palavras
7. Use subtítulos em markdown (##, ###) que sejam intrigantes, não apenas informativos
8. Inclua listas quando apropriado
9. ${blogType === 'commercial' ? 'Conte uma história sobre como o produto resolve problemas reais' : 'Explique a tecnologia como uma descoberta fascinante'}
10. NÃO invente informações que não estão nos dados fornecidos
11. Use formato markdown limpo e envolvente
12. EVITE linguagem corporativa ou muito formal no início - seja mais humano e direto

INSTRUÇÕES PARA IMAGEM:
${productData.imageUrl ? `- INCLUA a imagem do produto logo após o título principal (H1)
- Use o formato Markdown: ![${productData.name}](${productData.imageUrl} "${productData.name}")
- A imagem deve aparecer antes do primeiro parágrafo de texto` : '- Produto sem imagem disponível, prossiga sem incluir tag de imagem'}

IMPORTANTE - NÃO INCLUIR NO CONTEÚDO:
- CTAs genéricos como "Solicite uma Demonstração Personalizada", "Fale com Nossos Especialistas", "Baixe o Catálogo Completo"
- Rodapés com informações de contato (telefones, WhatsApp, horários)
- Frases como "O futuro da odontologia digital é simples, rápido e confiável"
- Assinaturas padronizadas da empresa como "Smart Dent - Soluções Inteligentes"
- Terminar o blog com informações de contato genéricas
- Informações de telefone no formato "(XX) XXXX-XXXX"

Gere o blog post completo agora:`;
  }

  console.log(`🤖 Generating ${blogType} blog for product: ${product.name}`);

  // Gerar com Dual-AI Competition
  const { compareAndSelectBest } = await import('../_shared/dual-ai-competition.ts');
  
  const userPrompt = `Gere um blog ${blogType} completo em PORTUGUÊS BRASILEIRO para o produto ${product.name}. IMPORTANTE: Use apenas português brasileiro, nunca espanhol.`;
  
  console.log('🏁 Dual-AI: Generating product blog...');
  const result = await compareAndSelectBest(systemPrompt, userPrompt, {
    contentType: 'blog',
    minLength: 1200,
    maxLength: 2500,
    requiredKeywords: Array.isArray(product.keywords) ? product.keywords : []
  });
  
  console.log(`✅ Product blog winner: ${result.winner} (score: ${result.score.toFixed(1)})`);
  
  const blogContent = result.content;

  if (!blogContent) {
    throw new Error('Resposta vazia da Dual-AI Competition');
  }

  console.log(`✅ Blog content generated: ${blogContent.length} characters`);
  
  // Sanitizar conteúdo antes de retornar
  const sanitizedContent = sanitizeBlogContent(blogContent);
  console.log(`🧼 Content sanitized, removed ${blogContent.length - sanitizedContent.length} characters`);
  
  // ✅ FASE 2: Gerar 10 FAQs otimizadas para SEO/IA/GEO
  console.log('🔮 Generating 10 AI-optimized FAQs...');
  const faqs = await generateBlogFAQs(apiKey, product, sanitizedContent, blogType);
  console.log(`✅ Generated ${faqs.length} FAQs`);
  
  return {
    content: sanitizedContent,
    faqs: faqs
  };
}

// ✅ NOVA FUNÇÃO: Gerar 10 FAQs otimizadas para SEO/IA/GEO
async function generateBlogFAQs(
  apiKey: string,
  product: any,
  blogContent: string,
  blogType: 'commercial' | 'technical'
): Promise<BlogFAQ[]> {
const faqPrompt = `Você é um especialista em SEO, SGE (Search Generative Experience) e GEO (Generative Engine Optimization).

TAREFA: Gerar EXATAMENTE 10 FAQs otimizadas para IAs generativas (ChatGPT, Perplexity, Google SGE) baseadas no conteúdo do blog e dados do produto.

═══════════════════════════════════════════════════════════
📦 DADOS DO PRODUTO (SEM PREÇO - NÃO MENCIONE VALORES MONETÁRIOS)
═══════════════════════════════════════════════════════════
Nome: ${product.name}
Marca: ${product.brand || 'N/A'}
Categoria: ${product.category || ''} > ${product.subcategory || ''}
Descrição: ${product.description?.substring(0, 500) || ''}
Benefícios: ${Array.isArray(product.benefits) ? product.benefits.slice(0, 5).join(', ') : 'N/A'}
Keywords: ${Array.isArray(product.keywords) ? product.keywords.slice(0, 10).join(', ') : ''}

═══════════════════════════════════════════════════════════
📝 CONTEÚDO DO BLOG GERADO (resumo)
═══════════════════════════════════════════════════════════
${blogContent.substring(0, 2000)}...

═══════════════════════════════════════════════════════════
📋 ESTRUTURA OBRIGATÓRIA DAS 10 FAQs
═══════════════════════════════════════════════════════════

CATEGORIAS (2 FAQs de cada):
1. "o-que-e" → Definições citáveis ("O que é...", "O que significa...")
2. "como-funciona" → Explicações técnicas ("Como funciona...", "Como usar...")
3. "comparacao" → Diferenciação ("Qual a diferença...", "Comparado a...")
4. "beneficios" → ROI e vantagens ("Por que usar...", "Quais os benefícios...")
5. "casos-de-uso" → Aplicações práticas ("Onde usar...", "Quando usar...", "Para quem...")

═══════════════════════════════════════════════════════════
🚫 REGRAS ANTI-REPETIÇÃO (CRÍTICAS)
═══════════════════════════════════════════════════════════
7. **NUNCA repita o mesmo dado** (dimensões, tempo, especificações) em mais de uma FAQ
8. **Cada FAQ deve cobrir um aspecto DIFERENTE** do produto - SEM redundância
9. **PROIBIDO mencionar valores monetários** (R$, preço, custo, valor) nas respostas
10. **Varie as informações**: se usou uma spec em uma FAQ, NÃO repita em outra

REGRAS CRÍTICAS PARA IA-READINESS:
1. **First Sentence Answer**: A primeira frase da resposta DEVE ser a resposta direta e citável
2. **Dados Numéricos**: Use dados numéricos do produto, mas CADA FAQ deve usar dados DIFERENTES
3. **SGE Snippet**: Campo separado com versão ultra-curta (max 30 palavras) para featured snippet
4. **Anti-Alucinação**: USE APENAS informações presentes nos dados acima - NUNCA invente
5. **Keywords Naturais**: Inclua as keywords do produto naturalmente nas perguntas
6. **Formato ${blogType === 'commercial' ? 'Comercial: tom persuasivo focado em benefícios' : 'Técnico: tom informativo focado em especificações'}

FORMATO DE SAÍDA (JSON):
\`\`\`json
{
  "faqs": [
    {
      "question": "O que é o ${product.name}?",
      "answer": "[Resposta direta na primeira frase]. [Contexto técnico]. [Benefício - SEM PREÇO].",
      "sge_snippet": "[Versão ultra-curta de 20-30 palavras citável por IAs]",
      "category": "o-que-e"
    }
  ]
}
\`\`\`

Gere EXATAMENTE 10 FAQs no formato JSON acima, garantindo que CADA FAQ cubra um aspecto ÚNICO do produto:`;

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
          { role: 'system', content: 'Você retorna APENAS JSON válido, sem markdown ou explicações.' },
          { role: 'user', content: faqPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      console.error('❌ FAQ generation failed:', response.status);
      return [];
    }

    const data = await response.json();
    const faqContent = data.choices?.[0]?.message?.content || '';
    
    // Extrair JSON da resposta
    const jsonMatch = faqContent.match(/\{[\s\S]*"faqs"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No valid JSON found in FAQ response');
      return [];
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const faqs = parsed.faqs || [];
    
    // Validar e filtrar FAQs válidas
    const validFaqs = faqs
      .filter((faq: any) => faq.question && faq.answer && faq.sge_snippet && faq.category)
      .slice(0, 10)
      .map((faq: any) => ({
        question: faq.question.trim(),
        answer: faq.answer.trim(),
        sge_snippet: faq.sge_snippet.trim(),
        category: faq.category
      }));
    
    console.log(`✅ FAQ validation: ${validFaqs.length}/10 valid FAQs`);
    return validFaqs;
    
  } catch (error) {
    console.error('❌ Error generating FAQs:', error);
    return [];
  }
}

// Função para processar variáveis no prompt customizado
function processPromptVariables(prompt: string, productData: any, companyData: any): string {
  let processedPrompt = prompt;
  
  // Formatar dados do produto para substituição
  const formattedProductData = `
Nome: ${productData.name}
Descrição: ${productData.description}
Categoria: ${productData.category}
Subcategoria: ${productData.subcategory}
Preço: ${productData.price}
Keywords: ${productData.keywords}
Benefícios: ${productData.benefits}
Características: ${productData.features}
Pitch de Vendas: ${productData.salesPitch}`.trim();

  // Formatar dados da empresa para substituição
  const formattedCompanyData = companyData ? `
Nome: ${companyData.name}
Descrição: ${companyData.description}
Missão: ${companyData.mission}
Valores: ${companyData.values}`.trim() : 'Dados da empresa não disponíveis';

  // Substituir variáveis no prompt
  processedPrompt = processedPrompt.replace(/{productData}/g, formattedProductData);
  processedPrompt = processedPrompt.replace(/{companyData}/g, formattedCompanyData);
  
  console.log('🔄 Variables processed in custom prompt');
  
  return processedPrompt;
}

// Função para gerar links inteligentes baseados no conteúdo do blog
async function generateIntelligentLinks(supabase: any, product: any, blogContent: string, blogType: string): Promise<Record<string, string>> {
  console.log(`🔗 Generating intelligent links for ${blogType} blog content`);
  
  const intelligentLinks: Record<string, string> = {};
  
  try {
    // 1. Carregar links salvos existentes (prioridade máxima)
    const linksKey = `${blogType}_links`;
    const existingLinks = product.individual_blog_content?.[linksKey] || {};
    if (Object.keys(existingLinks).length > 0) {
      Object.assign(intelligentLinks, existingLinks);
      console.log(`📎 Loaded ${Object.keys(existingLinks).length} existing custom links`);
    }

    // 2. Buscar links do repositório (external_links) - PRIORIDADE ALTA
    const { data: repositoryLinks } = await supabase
      .from('external_links')
      .select('name, url')
      .eq('approved', true);
    
    if (repositoryLinks && repositoryLinks.length > 0) {
      repositoryLinks.forEach((link: any) => {
        const keyword = link.name.toLowerCase();
        // Só adiciona se não existe link customizado para a mesma keyword
        if (!intelligentLinks[keyword] && isKeywordInContent(keyword, blogContent)) {
          intelligentLinks[keyword] = link.url;
        }
      });
      console.log(`🔗 Loaded ${repositoryLinks.length} repository links, applied ${Object.keys(intelligentLinks).length - Object.keys(existingLinks).length} new ones`);
    }
    
    // 3. Buscar landing page relacionada ao produto (prioridade média)
    if (product.source_landing_page_id) {
      const { data: landingPage } = await supabase
        .from('landing_pages')
        .select('data')
        .eq('id', product.source_landing_page_id)
        .single();
      
      if (landingPage?.data?.intelligent_links) {
        // Só adiciona se não existe link customizado para a mesma keyword
        Object.entries(landingPage.data.intelligent_links).forEach(([keyword, url]) => {
          if (!intelligentLinks[keyword] && typeof url === 'string') {
            intelligentLinks[keyword] = url;
          }
        });
      }
    }
    
    // 3. Mapear nome do produto para sua URL (prioridade alta)
    if (product.product_url && product.name) {
      const productNameKey = product.name.toLowerCase();
      if (!intelligentLinks[productNameKey] && isKeywordInContent(productNameKey, blogContent)) {
        intelligentLinks[productNameKey] = product.product_url;
        console.log(`🔗 Mapped product name "${product.name}" to product URL`);
      }
    }
    
    // 4. Buscar produtos relacionados para criar links internos (prioridade baixa)
    const { data: relatedProducts } = await supabase
      .from('products_repository')
      .select('name, product_url, category, subcategory')
      .neq('id', product.id)
      .eq('approved', true)
      .limit(10);
    
    if (relatedProducts) {
      relatedProducts.forEach((relatedProduct: any) => {
        if (relatedProduct.product_url && relatedProduct.name) {
          const keyword = relatedProduct.name.toLowerCase();
          if (!intelligentLinks[keyword] && isKeywordInContent(keyword, blogContent)) {
            intelligentLinks[keyword] = relatedProduct.product_url;
          }
        }
      });
    }
    
    // 5. Mapear keywords do produto para sua URL (se disponível) ou categoria (prioridade baixa)
    const productKeywords = [
      ...(Array.isArray(product.keywords) ? product.keywords : []),
      ...(Array.isArray(product.market_keywords) ? product.market_keywords : []),
      ...(Array.isArray(product.search_intent_keywords) ? product.search_intent_keywords : [])
    ];
    
    productKeywords.forEach(keyword => {
      if (typeof keyword === 'string' && keyword.length > 3) {
        const keywordLower = keyword.toLowerCase();
        if (!intelligentLinks[keywordLower] && isKeywordInContent(keywordLower, blogContent)) {
          // Priorizar URL do produto, senão usar categoria
          if (product.product_url) {
            intelligentLinks[keywordLower] = product.product_url;
          } else if (product.category) {
            intelligentLinks[keywordLower] = `#categoria-${product.category.toLowerCase().replace(/\s+/g, '-')}`;
          }
        }
      }
    });
    
    console.log(`✅ Generated ${Object.keys(intelligentLinks).length} intelligent links for ${blogType} blog`);
    console.log(`🔍 First 5 keywords detected: ${Object.keys(intelligentLinks).slice(0, 5).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error generating intelligent links:', error);
  }
  
  return intelligentLinks;
}

// Função auxiliar para verificar se keyword existe no conteúdo (Unicode-safe)
function isKeywordInContent(keyword: string, content: string): boolean {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?<![\p{L}\p{N}])${escapedKeyword}(?![\p{L}\p{N}])`, 'giu');
  return regex.test(content);
}

// Função para processar conteúdo com links inteligentes (simplificada)
async function processContentWithIntelligentLinks(content: string, intelligentLinks: Record<string, string> = {}): Promise<string> {
  let processedContent = content;
  const linksApplied: string[] = [];
  
  // Aplicar links de forma controlada (máximo 3 links por parágrafo)
  const paragraphs = content.split('\n\n');
  
  paragraphs.forEach((paragraph, index) => {
    let linksInParagraph = 0;
    let processedParagraph = paragraph;
    
    // Ordenar keywords por tamanho (maior primeiro) para evitar sobreposições
    const sortedKeywords = Object.keys(intelligentLinks).sort((a, b) => b.length - a.length);
    
    sortedKeywords.forEach(keyword => {
      if (linksInParagraph >= 2) return; // Máximo 2 links por parágrafo
      if (linksApplied.includes(keyword)) return; // Não repetir mesmo link
      
      const url = intelligentLinks[keyword];
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\p{L}\p{N}])${escapedKeyword}(?![\p{L}\p{N}])`, 'giu');
      
      if (regex.test(processedParagraph)) {
        processedParagraph = processedParagraph.replace(regex, (match) => {
          linksInParagraph++;
          linksApplied.push(keyword);
          return `[${match}](${url} "Saiba mais sobre ${match}")`;
        });
      }
    });
    
    paragraphs[index] = processedParagraph;
  });
  
  processedContent = paragraphs.join('\n\n');
  console.log(`🔗 Applied ${linksApplied.length} intelligent links to content`);
  
  return processedContent;
}