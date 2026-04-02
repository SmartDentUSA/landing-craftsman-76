import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { buildFullPrompt, mapProductToContext } from '../_shared/clinical-brain-guard.ts';
import { PROMPTS } from '../_shared/prompt-templates.ts';

// ====== FASE 2: PRODUCT MASTER CONTEXT INTEGRATION ======
interface ProductMasterContext {
  // Documentos técnicos (PRIORIDADE #1)
  document_transcriptions?: any[];
  has_technical_docs: boolean;
  technical_summary?: string;
  
  // Documentos oficiais
  technical_documents?: any[];
  
  // Especificações consolidadas
  technical_specifications?: any[];
  specs_consolidated: any;
  
  // Variações
  variations?: any[];
  has_variations: boolean;
  variations_summary?: string;
  
  // Tutoriais
  tutorial_resources?: any;
  has_tutorials: boolean;
  tutorials_count: number;
  
  // Contexto consolidado
  master_technical_context: string;
  data_quality_score: number;
  priority_sources_used: string[];
}

/**
 * FASE 2: Construir contexto técnico enriquecido do produto
 */
function buildEnrichedProductContext(product: any): ProductMasterContext {
  const docTranscriptions = product.document_transcriptions as any[] | null;
  const techDocs = product.technical_documents as any[] | null;
  const techSpecs = product.technical_specifications as any[] | null;
  const variations = product.variations as any[] | null;
  const tutorialResources = product.tutorial_resources as any;
  
  // Consolidar especificações técnicas com hierarquia de prioridade
  let specsConsolidated: any = {};
  let technicalSummary = '';
  const prioritySourcesUsed: string[] = [];
  
  // 1º PRIORIDADE: document_transcriptions (VERDADE ABSOLUTA)
  if (docTranscriptions && Array.isArray(docTranscriptions) && docTranscriptions.length > 0) {
    prioritySourcesUsed.push('document_transcriptions');
    const firstDoc = docTranscriptions[0];
    
    if (firstDoc?.extracted_data?.summary) {
      technicalSummary = firstDoc.extracted_data.summary;
    }
    
    if (firstDoc?.extracted_data?.specifications) {
      specsConsolidated = { ...specsConsolidated, ...firstDoc.extracted_data.specifications };
    }
  }
  
  // 2º PRIORIDADE: technical_documents
  if (techDocs && Array.isArray(techDocs) && techDocs.length > 0) {
    prioritySourcesUsed.push('technical_documents');
  }
  
  // 3º PRIORIDADE: technical_specifications
  if (techSpecs && Array.isArray(techSpecs) && techSpecs.length > 0) {
    prioritySourcesUsed.push('technical_specifications');
    techSpecs.forEach((spec: any) => {
      if (spec.label && spec.value) {
        specsConsolidated[spec.label] = spec.value;
      }
    });
  }
  
  // Variações
  const hasVariations = variations && Array.isArray(variations) && variations.length > 0;
  let variationsSummary = '';
  
  if (hasVariations && variations) {
    variationsSummary = `Disponível em ${variations.length} variações: ${variations
      .slice(0, 3)
      .map((v: any) => v.name || v.color || v.size)
      .filter(Boolean)
      .join(', ')}${variations.length > 3 ? '...' : ''}`;
  }
  
  // Tutoriais
  const tutorialsCount = tutorialResources?.tutorials?.length || 0;
  const hasTutorials = tutorialsCount > 0;
  
  // Construir contexto técnico mestre
  let masterTechnicalContext = '';
  
  if (technicalSummary) {
    masterTechnicalContext += `📄 FONTE OFICIAL (PDF TRANSCRITO - PRIORIDADE #1):\n${technicalSummary}\n\n`;
  }
  
  if (Object.keys(specsConsolidated).length > 0) {
    masterTechnicalContext += `🔧 ESPECIFICAÇÕES TÉCNICAS CONSOLIDADAS:\n`;
    Object.entries(specsConsolidated).slice(0, 10).forEach(([key, value]) => {
      masterTechnicalContext += `  • ${key}: ${value}\n`;
    });
    masterTechnicalContext += '\n';
  }
  
  if (hasVariations) {
    masterTechnicalContext += `🎨 VARIAÇÕES: ${variationsSummary}\n\n`;
  }
  
  if (hasTutorials && tutorialResources?.tutorials) {
    masterTechnicalContext += `📺 TUTORIAIS DISPONÍVEIS (${tutorialsCount}):\n`;
    tutorialResources.tutorials.slice(0, 3).forEach((t: any, idx: number) => {
      masterTechnicalContext += `  ${idx + 1}. ${t.title}: ${t.url}\n`;
    });
  }
  
  return {
    document_transcriptions: docTranscriptions || [],
    has_technical_docs: (docTranscriptions?.length || 0) > 0,
    technical_summary: technicalSummary,
    
    technical_documents: techDocs || [],
    
    technical_specifications: techSpecs || [],
    specs_consolidated: specsConsolidated,
    
    variations: variations || [],
    has_variations: hasVariations,
    variations_summary: variationsSummary,
    
    tutorial_resources: tutorialResources,
    has_tutorials: hasTutorials,
    tutorials_count: tutorialsCount,
    
    master_technical_context: masterTechnicalContext,
    data_quality_score: 0, // Calculado no frontend
    priority_sources_used: prioritySourcesUsed
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductAIRequest {
  productId?: string;
  generateAll?: boolean;
  forceRegenerate?: boolean;
  complementOnly?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    if (!deepSeekApiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: ProductAIRequest = await req.json();

    let productsToProcess = [];

    if (request.generateAll) {
      // Process all products that don't have AI-generated content
      const { data: products, error: queryError } = await supabase
        .from('products_repository')
        .select('*')
        .or('ai_generated_benefits.eq.false,ai_generated_keywords.eq.false');

      if (queryError) throw queryError;
      productsToProcess = products || [];
    } else if (request.productId) {
      // Process specific product
      const { data: product, error: queryError } = await supabase
        .from('products_repository')
        .select('*')
        .eq('id', request.productId)
        .single();

      if (queryError) throw queryError;
      if (product) productsToProcess = [product];
    } else {
      throw new Error('Either productId or generateAll must be specified');
    }

    const results = [];

    for (const product of productsToProcess) {
      try {
        console.log(`Processing AI content for product: ${product.name}`);
        
        const updates: any = {};
        let needsUpdate = false;

        // Smart merge for benefits
        const shouldGenerateBenefits = request.forceRegenerate || 
          !product.ai_generated_benefits || 
          (product.benefits && product.benefits.length === 0);
          
        if (shouldGenerateBenefits) {
          const existingBenefits = product.benefits || [];
          const newBenefits = await generateProductBenefits(deepSeekApiKey, product, existingBenefits, request.complementOnly);
          
          if (newBenefits && newBenefits.length > 0) {
            updates.benefits = request.complementOnly ? [...existingBenefits, ...newBenefits] : newBenefits;
            updates.ai_generated_benefits = true;
            needsUpdate = true;
          }
        }

        // Smart merge for keywords
        const shouldGenerateKeywords = request.forceRegenerate || 
          !product.ai_generated_keywords || 
          (product.keywords && product.keywords.length === 0);
          
        if (shouldGenerateKeywords) {
          const existingKeywords = product.keywords || [];
          const newKeywords = await generateProductKeywords(deepSeekApiKey, product, existingKeywords, request.complementOnly);
          
          if (newKeywords && newKeywords.length > 0) {
            updates.keywords = request.complementOnly ? [...existingKeywords, ...newKeywords] : newKeywords;
            updates.ai_generated_keywords = true;
            needsUpdate = true;
          }
        }

        // Smart merge for features
        const shouldGenerateFeatures = request.forceRegenerate || 
          !product.features || 
          product.features.length === 0;
          
        if (shouldGenerateFeatures) {
          const existingFeatures = product.features || [];
          const newFeatures = await generateProductFeatures(deepSeekApiKey, product, existingFeatures, request.complementOnly);
          
          if (newFeatures && newFeatures.length > 0) {
            updates.features = request.complementOnly ? [...existingFeatures, ...newFeatures] : newFeatures;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          updates.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('products_repository')
            .update(updates)
            .eq('id', product.id);

          if (updateError) {
            throw updateError;
          }

          results.push({
            productId: product.id,
            productName: product.name,
            success: true,
            generated: {
              benefits: updates.benefits?.length || 0,
              keywords: updates.keywords?.length || 0,
              features: updates.features?.length || 0
            }
          });

          console.log(`Successfully generated AI content for: ${product.name}`);
        } else {
          results.push({
            productId: product.id,
            productName: product.name,
            success: true,
            message: 'Already has AI-generated content'
          });
        }

      } catch (productError) {
        console.error(`Failed to process product ${product.id}:`, productError);
        results.push({
          productId: product.id,
          productName: product.name,
          success: false,
          error: (productError as Error).message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `AI content generation completed`,
      totalProcessed: productsToProcess.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-product-ai-content function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateProductBenefits(apiKey: string, product: any, existingBenefits: string[] = [], complementOnly: boolean = false): Promise<string[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { compareAndSelectBest } = await import('../_shared/dual-ai-competition.ts');
  
  // 🔥 FASE 2: CONSTRUIR CONTEXTO ENRIQUECIDO
  const enrichedContext = buildEnrichedProductContext(product);
  
  console.log('📊 Enriched Context for Benefits:', {
    has_technical_docs: enrichedContext.has_technical_docs,
    has_variations: enrichedContext.has_variations,
    has_tutorials: enrichedContext.has_tutorials,
    priority_sources: enrichedContext.priority_sources_used,
    master_context_length: enrichedContext.master_technical_context.length
  });
  
  // Buscar configuração de prompt customizado com selected_fields
  const { data: promptConfig } = await supabase
    .from('prompts_configuration')
    .select('custom_prompt, selected_fields, selected_data_sources')
    .eq('edge_function_id', 'generate-product-ai-content')
    .eq('prompt_name', 'Benefícios do Produto')
    .single();
  
  // Buscar dados da empresa para contexto adicional
  const { data: companyProfile } = await supabase
    .from('company_profile')
    .select('*')
    .limit(1)
    .maybeSingle();
  
  let prompt = '';
  
  if (promptConfig?.custom_prompt) {
    const { extractSelectedData, processPromptWithSelectedData } = await import('../_shared/prompt-processor.ts');
    const selectedData = extractSelectedData(product, companyProfile, {
      selectedFields: promptConfig.selected_fields || {},
      selectedDataSources: promptConfig.selected_data_sources || []
    });
    prompt = processPromptWithSelectedData(promptConfig.custom_prompt, selectedData, existingBenefits);
  } else {
    const existingContext = existingBenefits.length > 0 ? 
      `\n\nDADOS MANUAIS EXISTENTES (NÃO DUPLICAR): ${existingBenefits.join(', ')}` : '';
    
    // 🔥 FASE 2: ADICIONAR CONTEXTO TÉCNICO ENRIQUECIDO
    const technicalContext = enrichedContext.master_technical_context ? `

═══════════════════════════════════════════════════════════════
🔥 CONTEXTO TÉCNICO PRIORITÁRIO (FASE 2 - USAR SEMPRE)
═══════════════════════════════════════════════════════════════

${enrichedContext.master_technical_context}

⚠️ INSTRUÇÕES CRÍTICAS:
1. Se há FONTE OFICIAL (PDF), use SEMPRE essas informações como VERDADE ABSOLUTA
2. NÃO invente especificações - use apenas o que está documentado acima
3. Se há VARIAÇÕES, mencione que o produto tem múltiplas opções
4. Se há TUTORIAIS, mencione que há recursos de aprendizagem disponíveis

📌 FONTES UTILIZADAS NESTE CONTEXTO: ${enrichedContext.priority_sources_used.join(', ') || 'dados estruturados do banco'}

` : '';
    
    const instruction = complementOnly && existingBenefits.length > 0 ? 
      'Gere APENAS 3 benefícios complementares que NÃO duplicem os existentes e preencham lacunas identificadas:' :
      'Gere APENAS um array JSON com 3-5 benefícios específicos, objetivos e focados no valor para o cliente:';
    
    prompt = `Analise o seguinte produto e gere uma lista de benefícios específicos PRIORIZANDO CATEGORIA/SUBCATEGORIA:${existingContext}${technicalContext}

Produto: ${product.name}
Descrição: ${product.description || 'Não informada'}
Categoria: ${product.category || 'Não informada'}
Subcategoria: ${product.subcategory || 'Não informada'}
Preço: ${product.price ? `${product.currency || 'BRL'} ${product.price}` : 'Não informado'}
Pitch de Vendas: ${product.sales_pitch || 'Não informado'}
Aplicações: ${product.applications || 'Não informado'}

${instruction}

INSTRUÇÕES CRÍTICAS PARA CATEGORIAS:
1. **Destaque benefícios específicos da categoria/subcategoria**
2. **Conecte benefícios com a taxonomia do produto**
3. **Use categoria como contexto principal dos benefícios**
4. **Se há documentação técnica oficial (PDF), baseie-se NELA prioritariamente**

Foque em:
- Resultados práticos específicos da categoria/subcategoria
- Soluções para problemas da categoria
- Vantagens competitivas dentro da categoria
- Economia de tempo/dinheiro específica da categoria
- Qualidade e confiabilidade da categoria

FORMATO DE RESPOSTA OBRIGATÓRIO:
- Retorne APENAS o array JSON puro
- NÃO inclua explicações, saudações ou texto adicional
- NÃO use markdown (\`\`\`json)
- Exemplo CORRETO: ["benefício 1", "benefício 2", "benefício 3"]
- Exemplo INCORRETO: "Com certeza! Aqui estão os benefícios: ..."

RESPOSTA ESPERADA (copie este formato exato):
["benefício 1", "benefício 2", "benefício 3"]`;
  }

  const systemPrompt = 'Você é um assistente de extração de dados. SEMPRE retorne APENAS arrays JSON puros sem texto explicativo, markdown ou formatação. Exemplo correto: ["item1", "item2"]. NUNCA inclua explicações, saudações ou qualquer texto fora do JSON.';

  console.log('🏁 Dual-AI: Generating benefits...');
  const result = await compareAndSelectBest(systemPrompt, prompt, {
    contentType: 'product',
    minLength: 100,
    requiredKeywords: Array.isArray(product.keywords) ? product.keywords : []
  }, { edgeFunctionId: 'generate-product-ai-content', actionName: 'Benefícios do Produto', productName: product.name });

  console.log(`✅ Benefits winner: ${result.winner} (score: ${result.score.toFixed(1)})`);

  try {
    const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('❌ Failed to parse benefits JSON:', error);
    return [];
  }
}

async function generateProductKeywords(apiKey: string, product: any, existingKeywords: string[] = [], complementOnly: boolean = false): Promise<string[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { compareAndSelectBest } = await import('../_shared/dual-ai-competition.ts');
  
  // Buscar configuração de prompt customizado
  const { data: promptConfig } = await supabase
    .from('prompts_configuration')
    .select('custom_prompt, selected_fields, selected_data_sources')
    .eq('edge_function_id', 'generate-product-ai-content')
    .eq('prompt_name', 'Palavras-chave do Produto')
    .single();
  
  // Buscar dados da empresa
  const { data: companyProfile } = await supabase
    .from('company_profile')
    .select('*')
    .limit(1)
    .maybeSingle();
  
  // FASE 5: Extrair keywords de video_captions + OTIMIZAÇÃO
  const { extractKeywordsFromVideoCaptions, hasCaptions } = await import('../_shared/video-captions-processor.ts');
  const videoCaptionKeywords = hasCaptions(product.video_captions) 
    ? extractKeywordsFromVideoCaptions(product.video_captions)
    : [];
  
  console.log('🎬 Video Captions Debug:', {
    hasVideoCaptions: !!product.video_captions,
    captionTypes: product.video_captions ? Object.keys(product.video_captions) : [],
    extractedKeywords: videoCaptionKeywords,
    sampleCaption: product.video_captions?.youtube_videos?.[0]?.captions?.substring(0, 100)
  });
  
  let prompt = '';
  
  if (promptConfig?.custom_prompt) {
    const { extractSelectedData, processPromptWithSelectedData } = await import('../_shared/prompt-processor.ts');
    const selectedData = extractSelectedData(product, companyProfile, {
      selectedFields: promptConfig.selected_fields || {},
      selectedDataSources: promptConfig.selected_data_sources || []
    });
    prompt = processPromptWithSelectedData(promptConfig.custom_prompt, selectedData, existingKeywords);
  } else {
    const existingContext = existingKeywords.length > 0 ? 
      `\n\nPALAVRAS-CHAVE MANUAIS EXISTENTES (NÃO DUPLICAR): ${existingKeywords.join(', ')}` : '';
    
    // 🔥 FASE 2: CONSTRUIR CONTEXTO ENRIQUECIDO
    const enrichedContext = buildEnrichedProductContext(product);
    
    console.log('📊 Enriched Context for Keywords:', {
      has_technical_docs: enrichedContext.has_technical_docs,
      has_variations: enrichedContext.has_variations,
      has_tutorials: enrichedContext.has_tutorials,
      priority_sources: enrichedContext.priority_sources_used
    });
    
    // 🔥 FASE 2: ADICIONAR CONTEXTO TÉCNICO ENRIQUECIDO
    const technicalContext = enrichedContext.master_technical_context ? `

═══════════════════════════════════════════════════════════════
🔥 CONTEXTO TÉCNICO PRIORITÁRIO (FASE 2 - USAR SEMPRE)
═══════════════════════════════════════════════════════════════

${enrichedContext.master_technical_context}

⚠️ INSTRUÇÕES CRÍTICAS:
1. Se há ESPECIFICAÇÕES TÉCNICAS de PDFs, extrair keywords técnicas delas
2. Se há VARIAÇÕES, gerar keywords com as variações (ex: "produto [cor]", "produto [tamanho]")
3. Se há TUTORIAIS, incluir keywords como "tutorial [produto]", "como usar [produto]"
4. NÃO inventar especificações - usar apenas documentação oficial

📌 FONTES: ${enrichedContext.priority_sources_used.join(', ') || 'banco de dados'}

` : '';
    
    // FASE 5: ENRIQUECER COM VÍDEOS (PRIORIDADE MÁXIMA)
    const videoCaptionsContext = videoCaptionKeywords.length > 0 ? `

🎬 OTIMIZAÇÃO BASEADA EM VÍDEOS (PRIORIDADE MÁXIMA - FASE 5)
═══════════════════════════════════════════════════════════

**Keywords Identificadas em Vídeos** (USE ESTAS PRIMEIRO):
${videoCaptionKeywords.join(', ')}

**INSTRUÇÕES CRÍTICAS**:
1. Estas keywords vêm de demonstrações REAIS do produto em vídeos
2. PRIORIZE estas sobre keywords genéricas (elas têm mais valor de SEO)
3. Combine com categorias: "${product.category} + ${videoCaptionKeywords[0]}"
4. Exemplo: Se vídeo menciona "Exocad", gerar: "scanner compatível Exocad", "integração Exocad", "workflow Exocad"

**RACIOCÍNIO** - Por que keywords de vídeos são prioritárias:
Se alguém falou sobre "${videoCaptionKeywords[0] || 'Exocad'}" no vídeo, significa que:
- É uma característica IMPORTANTE do produto
- Usuários reais mencionam isso
- É um diferencial competitivo
- Deve virar keyword primária para SEO

Portanto, SEMPRE gere pelo menos 3-4 keywords combinando:
- Categoria + keyword de vídeo (ex: "scanner intraoral ${videoCaptionKeywords[0]}")
- Subcategoria + keyword de vídeo (ex: "${product.subcategory} compatível ${videoCaptionKeywords[0]}")
- Produto + aplicação mencionada no vídeo
` : '\n\nNenhum dado de vídeo disponível. Focar em categoria + especificações técnicas.';
    
    const instruction = complementOnly && existingKeywords.length > 0 ? 
      'Gere APENAS 3 palavras-chave complementares que NÃO duplicem as existentes:' :
      'Gere APENAS um array JSON com 8-12 palavras-chave relevantes:';
    
    prompt = `Analise o seguinte produto e gere palavras-chave para SEO e marketing PRIORIZANDO CATEGORIA/SUBCATEGORIA, DOCUMENTAÇÃO TÉCNICA E VÍDEOS:${existingContext}${technicalContext}${videoCaptionsContext}

Produto: ${product.name}
Descrição: ${product.description || 'Não informada'}
Categoria: ${product.category || 'Não informada'}
Subcategoria: ${product.subcategoria || 'Não informada'}
Público-alvo: ${product.target_audience || 'Não informado'}
Pitch de Vendas: ${product.sales_pitch || 'Não informado'}
Aplicações: ${product.applications || 'Não informado'}

${instruction}

INSTRUÇÕES CRÍTICAS PARA CATEGORIAS:
1. **PRIORIZE categoria e subcategoria como palavras-chave primárias**
2. **Gere variações da categoria (plural, singular, sinônimos)**
3. **Combine categoria + subcategoria + nome do produto**
4. **Use termos técnicos mencionados nos vídeos (se disponíveis)**

Inclua NESTA ORDEM DE PRIORIDADE (FASE 2 + FASE 5 OTIMIZADA):
1. **Especificações técnicas de PDFs** (se disponíveis) - VERDADE ABSOLUTA
2. **Keywords de vídeos** (se disponíveis) - PRIORIDADE MÁXIMA
3. **Keywords de variações** (ex: "produto pink", "produto ruby")
4. **Categoria + keywords de vídeos** (combinar ambos)
5. Categoria e subcategoria (primárias)
6. Variações e sinônimos das categorias
7. Categoria + subcategoria + benefícios
8. Palavras-chave long-tail com categorias (especialmente as mencionadas em vídeos)
9. Termos técnicos da categoria (priorizar os dos vídeos e PDFs)
10. Categoria + público-alvo

FORMATO DE RESPOSTA OBRIGATÓRIO:
- Retorne APENAS o array JSON puro
- NÃO inclua explicações, saudações ou texto adicional
- NÃO use markdown (\`\`\`json)
- Exemplo CORRETO: ["palavra-chave 1", "palavra-chave 2"]
- Exemplo INCORRETO: "Com certeza! Aqui estão as palavras-chave: ..."

RESPOSTA ESPERADA (copie este formato exato):
["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"]`;
  }

  const systemPrompt = 'Você é um assistente de extração de dados. SEMPRE retorne APENAS arrays JSON puros sem texto explicativo, markdown ou formatação. Exemplo correto: ["item1", "item2"]. NUNCA inclua explicações, saudações ou qualquer texto fora do JSON.';

  console.log('🏁 Dual-AI: Generating keywords...');
  const result = await compareAndSelectBest(systemPrompt, prompt, {
    contentType: 'product',
    minLength: 100,
    requiredKeywords: videoCaptionKeywords
  }, { edgeFunctionId: 'generate-product-ai-content', actionName: 'Keywords do Produto', productName: product.name });

  console.log(`✅ Keywords winner: ${result.winner} (score: ${result.score.toFixed(1)})`);

  try {
    const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('❌ Failed to parse keywords JSON:', error);
    return [];
  }
}

async function generateProductFeatures(apiKey: string, product: any, existingFeatures: string[] = [], complementOnly: boolean = false): Promise<string[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { compareAndSelectBest } = await import('../_shared/dual-ai-competition.ts');
  
  // 🔥 FASE 2: CONSTRUIR CONTEXTO ENRIQUECIDO
  const enrichedContext = buildEnrichedProductContext(product);
  
  console.log('📊 Enriched Context for Features:', {
    has_technical_docs: enrichedContext.has_technical_docs,
    has_variations: enrichedContext.has_variations,
    specs_count: Object.keys(enrichedContext.specs_consolidated).length,
    priority_sources: enrichedContext.priority_sources_used
  });
  
  // Buscar configuração de prompt customizado
  const { data: promptConfig } = await supabase
    .from('prompts_configuration')
    .select('custom_prompt, selected_fields, selected_data_sources')
    .eq('edge_function_id', 'generate-product-ai-content')
    .eq('prompt_name', 'Características do Produto')
    .single();
  
  // Buscar dados da empresa
  const { data: companyProfile } = await supabase
    .from('company_profile')
    .select('*')
    .limit(1)
    .maybeSingle();
  
  let prompt = '';
  
  if (promptConfig?.custom_prompt) {
    const { extractSelectedData, processPromptWithSelectedData } = await import('../_shared/prompt-processor.ts');
    const selectedData = extractSelectedData(product, companyProfile, {
      selectedFields: promptConfig.selected_fields || {},
      selectedDataSources: promptConfig.selected_data_sources || []
    });
    prompt = processPromptWithSelectedData(promptConfig.custom_prompt, selectedData, existingFeatures);
  } else {
    // Usar prompt padrão
    const existingContext = existingFeatures.length > 0 ? 
      `\n\nCARACTERÍSTICAS MANUAIS EXISTENTES (NÃO DUPLICAR): ${existingFeatures.join(', ')}` : '';
    
    // 🔥 FASE 2: ADICIONAR CONTEXTO TÉCNICO ENRIQUECIDO
    const technicalContext = enrichedContext.master_technical_context ? `

═══════════════════════════════════════════════════════════════
🔥 CONTEXTO TÉCNICO PRIORITÁRIO (FASE 2 - USAR SEMPRE)
═══════════════════════════════════════════════════════════════

${enrichedContext.master_technical_context}

⚠️ INSTRUÇÕES CRÍTICAS:
1. Se há ESPECIFICAÇÕES de PDFs, use-as como CARACTERÍSTICAS prioritárias
2. Se há VARIAÇÕES, mencione as opções disponíveis como características
3. NÃO invente características - base-se apenas na documentação oficial
4. Priorize características técnicas e mensuráveis

📌 FONTES: ${enrichedContext.priority_sources_used.join(', ') || 'banco de dados'}

` : '';
    
    const instruction = complementOnly && existingFeatures.length > 0 ? 
      'Gere APENAS 3 características complementares que NÃO duplicem as existentes:' :
      'Gere APENAS um array JSON com 4-6 características específicas:';
    
    prompt = `Analise o seguinte produto e gere características técnicas e funcionais CONTEXTUALIZADAS PELA CATEGORIA E DOCUMENTAÇÃO OFICIAL:${existingContext}${technicalContext}

Produto: ${product.name}
Descrição: ${product.description || 'Não informada'}
Categoria: ${product.category || 'Não informada'}
Subcategoria: ${product.subcategory || 'Não informada'}
Pitch de Vendas: ${product.sales_pitch || 'Não informado'}
Aplicações: ${product.applications || 'Não informado'}

${instruction}

INSTRUÇÕES PARA CATEGORIAS E DOCUMENTAÇÃO:
1. **Mencione características relevantes da categoria**
2. **Contextualize recursos dentro da subcategoria**
3. **Se há especificações de PDFs, USE-AS como características prioritárias**
4. **Se há variações, liste as opções disponíveis**

Foque em (PRIORIDADE FASE 2):
- Especificações técnicas de PDFs (PRIORIDADE #1)
- Especificações técnicas da categoria
- Funcionalidades específicas da subcategoria
- Variações disponíveis (cores, tamanhos, materiais)
- Materiais e componentes típicos da categoria
- Dimensões ou capacidades padrão da categoria
- Compatibilidades dentro da categoria
- Certificações ou padrões da categoria/subcategoria

FORMATO DE RESPOSTA OBRIGATÓRIO:
- Retorne APENAS o array JSON puro
- NÃO inclua explicações, saudações ou texto adicional
- NÃO use markdown (\`\`\`json)
- Exemplo CORRETO: ["característica 1", "característica 2"]
- Exemplo INCORRETO: "Com certeza! Aqui estão as características: ..."

RESPOSTA ESPERADA (copie este formato exato):
["característica 1", "característica 2", "característica 3"]`;
  }

  const systemPrompt = 'Você é um assistente de extração de dados. SEMPRE retorne APENAS arrays JSON puros sem texto explicativo, markdown ou formatação. Exemplo correto: ["item1", "item2"]. NUNCA inclua explicações, saudações ou qualquer texto fora do JSON.';

  console.log('🏁 Dual-AI: Generating features...');
  const result = await compareAndSelectBest(systemPrompt, prompt, {
    contentType: 'product',
    minLength: 100,
    requiredKeywords: []
  }, { edgeFunctionId: 'generate-product-ai-content', actionName: 'Características do Produto', productName: product.name });

  console.log(`✅ Features winner: ${result.winner} (score: ${result.score.toFixed(1)})`);

  try {
    const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('❌ Failed to parse features JSON:', error);
    return [];
  }
}

// Função para processar variáveis nos prompts customizados
function processPromptVariables(
  prompt: string, 
  product: any, 
  existingItems: string[] = [], 
  complementOnly: boolean = false
): string {
  let processedPrompt = prompt;
  
  // Substituir variáveis básicas do produto
  processedPrompt = processedPrompt.replace(/{product\.name}/g, product.name || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.description}/g, product.description || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.category}/g, product.category || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.subcategory}/g, product.subcategory || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.price}/g, product.price ? `${product.currency || 'BRL'} ${product.price}` : 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.target_audience}/g, product.target_audience || 'Não informado');
  
  // Contexto de itens existentes
  const existingContext = existingItems.length > 0 ? 
    `\n\nITENS MANUAIS EXISTENTES (NÃO DUPLICAR): ${existingItems.join(', ')}` : '';
  processedPrompt = processedPrompt.replace(/{existingContext}/g, existingContext);
  
  // Instrução baseada no modo
  const instruction = complementOnly && existingItems.length > 0 ? 
    'Gere APENAS 3 itens complementares que NÃO duplicem os existentes:' :
    'Gere APENAS um array JSON com os itens solicitados:';
  processedPrompt = processedPrompt.replace(/{instruction}/g, instruction);
  
  return processedPrompt;
}

async function parseAIArrayResponse(response: Response, type: string): Promise<string[]> {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${data.error?.message || 'Unknown error'}`);
  }

  let content = data.choices[0].message.content.trim();
  
  try {
    // 🔧 NOVO: Extrair primeiro array JSON do texto (remove conversação)
    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    // Remove markdown code blocks if present
    content = content
      .replace(/^```json\s*/gm, '')
      .replace(/^```\s*/gm, '')
      .replace(/\s*```$/gm, '')
      .trim();
    
    const parsed = JSON.parse(content);
    
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
    } else {
      console.error(`❌ Invalid AI response for ${type} (not an array):`, content);
      return [];
    }
  } catch (error) {
    console.error(`❌ Failed to parse AI ${type}:`, content);
    // 🔧 NOVO: Log completo da resposta raw para debugging
    console.error('Raw API response:', data.choices[0].message.content);
    return [];
  }
}