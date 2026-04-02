import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { buildMasterPrompt, validateContext } from '../_shared/master-system-prompt.ts';
import { buildFullPrompt, mapProductToContext } from '../_shared/clinical-brain-guard.ts';
import { PROMPTS } from '../_shared/prompt-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramReelsScriptRequest {
  productId: string;
  customPrompt?: string;
  use_clinical_brain?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { productId, customPrompt, use_clinical_brain = false }: InstagramReelsScriptRequest = await req.json();

    console.log(`📸 Generating Instagram Reels scripts for product ${productId}`);

    // Buscar dados do produto
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error(`Produto não encontrado: ${productError?.message}`);
    }

    // Buscar dados da empresa
    const { data: company, error: companyError } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (companyError) {
      console.warn('Dados da empresa não encontrados:', companyError.message);
    }

    // Clinical Brain validation
    const productContext = {
      ...product,
      company_profile: company ?? null,
    };

    const validation = validateContext(productContext);

    console.log('🧠 ClinicalBrain Validation - generate-instagram-reels-script', {
      product_id: product.id,
      product_name: product.name,
      valid: validation.valid,
      violations: validation.violations,
      warnings: validation.warnings,
      requested: use_clinical_brain
    });

    const shouldUseClinicalBrain = use_clinical_brain === true && validation.valid === true;

    // Buscar configuração de prompt personalizado
    let finalPrompt: string = customPrompt || '';
    if (!finalPrompt) {
      const { data: promptConfig } = await supabase
        .from('prompts_configuration')
        .select('custom_prompt')
        .eq('edge_function_id', 'generate-instagram-reels-script')
        .eq('prompt_name', 'Roteiro Reels')
        .single();

      if (promptConfig?.custom_prompt) {
        finalPrompt = promptConfig.custom_prompt;
      } else {
        finalPrompt = getDefaultReelsScriptPrompt();
      }
    }

    // Processar variáveis no prompt
    const processedPrompt = processPromptVariables(finalPrompt, product, company);

    // Adicionar instruções anti-alucinação
    const finalPromptWithProtection = `${processedPrompt}

⚠️ **INSTRUÇÕES ANTI-ALUCINAÇÃO:**
- Use APENAS informações do produto fornecidas
- NÃO invente benefícios ou características
- NÃO faça promessas exageradas ou clickbait extremo
- Scripts devem ser baseados nos dados reais do produto
- Mantenha linguagem objetiva e clara`;

    // Gerar conteúdo com Dual-AI Competition
    const { compareAndSelectBest } = await import('../_shared/dual-ai-competition.ts');
    
    const baseSystemPrompt = 'Você é um especialista em roteiros curtos para Instagram Reels. Sempre retorne apenas JSON válido, sem markdown ou explicações adicionais.';
    
    let finalSystemPrompt: string;
    let finalUserPrompt: string;

    if (shouldUseClinicalBrain) {
      console.log('🧠 Clinical Brain ATIVO para Instagram Reels Script');
      finalSystemPrompt = buildMasterPrompt(finalPromptWithProtection, productContext);
      finalUserPrompt = 'Gerar roteiros de Reels respeitando 100% o contexto fornecido. Retorne APENAS JSON válido no formato especificado.';
    } else {
      console.log('📋 Usando prompt padrão (Clinical Brain desativado ou inválido)');
      finalSystemPrompt = baseSystemPrompt;
      finalUserPrompt = finalPromptWithProtection;
    }
    
    console.log('🏁 Dual-AI: Generating Instagram Reels scripts...');
    const result = await compareAndSelectBest(finalSystemPrompt, finalUserPrompt, {
      contentType: 'social',
      minLength: 300,
      maxLength: 1500,
      requiredKeywords: Array.isArray(product.bot_trigger_words) ? product.bot_trigger_words : []
    }, { edgeFunctionId: 'generate-instagram-reels-script', actionName: 'Roteiro Reels', productName: product.name });
    
    console.log(`✅ Reels Script winner: ${result.winner} (score: ${result.score.toFixed(1)})`);
    
    let generatedContent;
    try {
      const cleanedContent = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      generatedContent = JSON.parse(cleanedContent);
      
      // Validar estrutura esperada
      if (!generatedContent.reels_scripts || !Array.isArray(generatedContent.reels_scripts)) {
        throw new Error('Estrutura JSON inválida: reels_scripts ausente ou inválido');
      }
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      // Fallback manual
      generatedContent = createFallbackContent(product);
    }

    // Salvar no banco
    const currentData = product.instagram_reels_scripts || { scripts: [], last_generated: null };
    currentData.scripts = currentData.scripts || [];
    
    // Adicionar novo conteúdo no início do array
    currentData.scripts.unshift({
      id: crypto.randomUUID(),
      ...generatedContent,
      generated_at: new Date().toISOString(),
      editable: true
    });
    
    // Manter apenas os últimos 10
    currentData.scripts = currentData.scripts.slice(0, 10);
    currentData.last_generated = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('products_repository')
      .update({ instagram_reels_scripts: currentData })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Erro ao salvar: ${updateError.message}`);
    }

    console.log('📸 Instagram Reels scripts generated and saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: generatedContent,
        clinical_brain: {
          enabled: use_clinical_brain,
          active: shouldUseClinicalBrain,
          validation: {
            valid: validation.valid,
            violations_count: validation.violations.length,
            warnings_count: validation.warnings.length
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-instagram-reels-script function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getDefaultReelsScriptPrompt(): string {
  return `Você é um especialista em roteiros curtos para Instagram Reels.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Benefícios: {product.benefits}
- Características: {product.features}
- Público-alvo: {product.target_audience}

Informações da Empresa:
- Nome: {company.company_name}

PALAVRAS GATILHO BOT: {product.bot_trigger_words}

REGRAS OBRIGATÓRIAS:
- Linguagem clara e objetiva
- Sem promessas exageradas ou clickbait extremo
- Sem claims clínicos ou regulatórios
- Não repetir estruturas entre variações
- CTA pode usar palavras gatilho do bot se disponíveis

GERAR 4 VARIAÇÕES INDEPENDENTES:

1. EDUCATIVO
   - Foco: Ensinar algo útil sobre o produto
   - Tom: Didático e informativo

2. TRENDING
   - Foco: Formato viral/popular do momento
   - Tom: Atual e engajante

3. BASTIDORES
   - Foco: Behind the scenes, autenticidade
   - Tom: Próximo e transparente

4. DEMONSTRAÇÃO
   - Foco: Produto em ação
   - Tom: Prático e visual

PARA CADA VARIAÇÃO, ENTREGAR:
- variation: Número da variação (1-4)
- approach: Tipo (educational, trending, behind_scenes, demonstration)
- hook: Frase inicial impactante (até 2 linhas)
- scenes: Array de cenas com:
  - visual: Descrição do que mostrar
  - dialogue: Falas/texto sugerido
- cta: Call-to-action final (pode usar palavra gatilho)
- estimated_duration: Duração estimada (15-60 segundos)

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

Formato JSON obrigatório:
{
  "reels_scripts": [
    {
      "variation": 1,
      "approach": "educational",
      "hook": "Você sabia que...",
      "scenes": [
        { "visual": "Close no produto", "dialogue": "Olha só isso..." }
      ],
      "cta": "Comenta 'QUERO' para saber mais!",
      "estimated_duration": "30 segundos"
    },
    {
      "variation": 2,
      "approach": "trending",
      "hook": "",
      "scenes": [],
      "cta": "",
      "estimated_duration": ""
    },
    {
      "variation": 3,
      "approach": "behind_scenes",
      "hook": "",
      "scenes": [],
      "cta": "",
      "estimated_duration": ""
    },
    {
      "variation": 4,
      "approach": "demonstration",
      "hook": "",
      "scenes": [],
      "cta": "",
      "estimated_duration": ""
    }
  ]
}`;
}

function createFallbackContent(product: any) {
  const triggerWord = Array.isArray(product.bot_trigger_words) && product.bot_trigger_words.length > 0 
    ? product.bot_trigger_words[0] 
    : 'QUERO';

  return {
    reels_scripts: [
      {
        variation: 1,
        approach: "educational",
        hook: `Você conhece o ${product.name}? 👀`,
        scenes: [
          { visual: "Apresentador com produto", dialogue: `Hoje vou te mostrar algo incrível sobre ${product.name}` },
          { visual: "Close no produto", dialogue: "Olha só essa qualidade..." },
          { visual: "Demonstração rápida", dialogue: "Super simples de usar!" }
        ],
        cta: `Comenta '${triggerWord}' que te mando mais info!`,
        estimated_duration: "30 segundos"
      },
      {
        variation: 2,
        approach: "trending",
        hook: `POV: Você acabou de descobrir ${product.name} 🔥`,
        scenes: [
          { visual: "Transição rápida", dialogue: "Quando você encontra o produto perfeito..." },
          { visual: "Reação autêntica", dialogue: "É isso mesmo que você está vendo!" }
        ],
        cta: `Salva pra não esquecer + comenta '${triggerWord}'`,
        estimated_duration: "15-20 segundos"
      },
      {
        variation: 3,
        approach: "behind_scenes",
        hook: "Vem ver como chegou aqui no escritório 📦",
        scenes: [
          { visual: "Unboxing", dialogue: `Chegou o ${product.name}!` },
          { visual: "Detalhes do produto", dialogue: "Olha essa qualidade..." },
          { visual: "Teste rápido", dialogue: "Aprovado!" }
        ],
        cta: "Quer conhecer também? Comenta aqui!",
        estimated_duration: "30-45 segundos"
      },
      {
        variation: 4,
        approach: "demonstration",
        hook: `Olha o ${product.name} em ação! 🎯`,
        scenes: [
          { visual: "Preparação", dialogue: "Vou te mostrar como funciona..." },
          { visual: "Demonstração passo a passo", dialogue: "Primeiro você faz isso..." },
          { visual: "Resultado final", dialogue: "Pronto! Simples assim!" }
        ],
        cta: `Comenta '${triggerWord}' se ficou interessado!`,
        estimated_duration: "45-60 segundos"
      }
    ]
  };
}

function processPromptVariables(prompt: string, product: any, company: any): string {
  let processedPrompt = prompt;

  // Variáveis do produto
  processedPrompt = processedPrompt.replace(/{product\.name}/g, product.name || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.description}/g, product.description || 'Não informada');
  
  // Processar arrays
  const benefitsArray = Array.isArray(product.benefits) ? product.benefits : [];
  processedPrompt = processedPrompt.replace(/{product\.benefits}/g, benefitsArray.join(', ') || 'Não informados');

  const targetAudienceArray = Array.isArray(product.target_audience) ? product.target_audience : [];
  processedPrompt = processedPrompt.replace(/{product\.target_audience}/g, targetAudienceArray.join(', ') || 'Não informado');

  const featuresArray = Array.isArray(product.features) ? product.features : [];
  processedPrompt = processedPrompt.replace(/{product\.features}/g, featuresArray.join(', ') || 'Não informadas');

  // Processar palavras gatilho BOT
  const triggerWordsArray = Array.isArray(product.bot_trigger_words) ? product.bot_trigger_words : [];
  processedPrompt = processedPrompt.replace(/{product\.bot_trigger_words}/g, triggerWordsArray.join(', ') || 'Não configuradas');

  // Variáveis da empresa
  if (company) {
    processedPrompt = processedPrompt.replace(/{company\.company_name}/g, company.company_name || 'Não informado');
  } else {
    processedPrompt = processedPrompt.replace(/{company\.company_name}/g, 'Não informado');
  }

  return processedPrompt;
}
