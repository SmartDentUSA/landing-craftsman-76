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

    // Gerar blog com IA
    const blogContent = await generateProductBlog(deepSeekApiKey, product, companyProfile, blogType);
    
    let intelligentLinks = {};
    let finalBlogContent = blogContent;
    
    // Aplicar links inteligentes apenas se habilitado
    if (useIntelligentLinks) {
      console.log('🔗 Generating intelligent links...');
      intelligentLinks = await generateIntelligentLinks(supabase, product, blogContent, blogType);
      finalBlogContent = await processContentWithIntelligentLinks(blogContent, intelligentLinks);
      console.log(`✅ Applied ${Object.keys(intelligentLinks).length} intelligent links`);
    } else {
      console.log('🚫 Intelligent links disabled by user');
    }
    
    // Atualizar produto com o novo blog e links
    const updatedBlogContent = {
      ...product.individual_blog_content,
      [blogType]: finalBlogContent,
      [`${blogType}_links`]: intelligentLinks,
      [`${blogType}_links_generated_at`]: new Date().toISOString(),
      generated_at: new Date().toISOString(),
      use_intelligent_links: useIntelligentLinks
    };

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
): Promise<string> {
  
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
  
  // Preparar dados do produto
  const productData = {
    name: product.name,
    description: product.description || '',
    category: product.category || '',
    subcategory: product.subcategory || '',
    price: product.price ? `${product.currency || 'BRL'} ${product.price}` : '',
    keywords: Array.isArray(product.keywords) ? product.keywords.join(', ') : '',
    benefits: Array.isArray(product.benefits) ? product.benefits.join(', ') : '',
    features: Array.isArray(product.features) ? product.features.join(', ') : '',
    salesPitch: product.sales_pitch || ''
  };

  const companyData = companyProfile ? {
    name: companyProfile.company_name || '',
    description: companyProfile.company_description || '',
    mission: companyProfile.mission_statement || '',
    values: companyProfile.brand_values || ''
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

DADOS DO PRODUTO:
- Nome: ${productData.name}
- Descrição: ${productData.description}
- Categoria: ${productData.category}
- Subcategoria: ${productData.subcategory}
- Preço: ${productData.price}
- Keywords: ${productData.keywords}
- Benefícios: ${productData.benefits}
- Características: ${productData.features}
- Pitch de Vendas: ${productData.salesPitch}

${companyData ? `DADOS DA EMPRESA:
- Nome: ${companyData.name}
- Descrição: ${companyData.description}
- Missão: ${companyData.mission}
- Valores: ${companyData.values}` : ''}

ESTRUTURA OBRIGATÓRIA:
${currentPrompt.structure}

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

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Gere um blog ${blogType} completo em PORTUGUÊS BRASILEIRO para o produto ${product.name}. IMPORTANTE: Use apenas português brasileiro, nunca espanhol.` }
      ],
      max_tokens: 2500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Erro na API DeepSeek: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const blogContent = data.choices[0]?.message?.content;

  if (!blogContent) {
    throw new Error('Resposta vazia da API DeepSeek');
  }

  console.log(`✅ Blog content generated: ${blogContent.length} characters`);
  
  // Sanitizar conteúdo antes de retornar
  const sanitizedContent = sanitizeBlogContent(blogContent);
  console.log(`🧼 Content sanitized, removed ${blogContent.length - sanitizedContent.length} characters`);
  
  return sanitizedContent;
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