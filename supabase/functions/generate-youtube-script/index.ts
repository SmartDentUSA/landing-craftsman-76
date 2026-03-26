import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { buildMasterPrompt, validateContext } from '../_shared/master-system-prompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeScriptRequest {
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

    const { productId, customPrompt, use_clinical_brain = false }: YouTubeScriptRequest = await req.json();

    console.log(`🎬 Generating YouTube scripts for product ${productId}`);

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

    console.log('🧠 ClinicalBrain Validation - generate-youtube-script', {
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
        .eq('edge_function_id', 'generate-youtube-script')
        .eq('prompt_name', 'Roteiro YouTube')
        .single();

      if (promptConfig?.custom_prompt) {
        finalPrompt = promptConfig.custom_prompt;
      } else {
        finalPrompt = getDefaultYouTubeScriptPrompt();
      }
    }

    // Processar variáveis no prompt
    const processedPrompt = processPromptVariables(finalPrompt, product, company);

    // Adicionar instruções anti-alucinação
    const finalPromptWithProtection = `${processedPrompt}

⚠️ **INSTRUÇÕES ANTI-ALUCINAÇÃO:**
- Use APENAS informações do produto fornecidas
- NÃO invente dados técnicos ou benefícios
- NÃO faça promessas clínicas ou regulatórias
- Scripts devem ser baseados exclusivamente nos dados reais do produto
- Evite claims não fundamentados nos dados`;

    // Gerar conteúdo com Dual-AI Competition
    const { compareAndSelectBest } = await import('../_shared/dual-ai-competition.ts');
    
    const baseSystemPrompt = `Você é um especialista sênior em roteiros audiovisuais técnicos para YouTube.

REGRA ABSOLUTA - ZERO ALUCINAÇÃO:
- Use EXCLUSIVAMENTE as informações do produto fornecidas no prompt
- JAMAIS invente dados técnicos, especificações, certificações ou números
- JAMAIS faça promessas clínicas, regulatórias ou de resultados não documentados
- JAMAIS mencione produtos, marcas ou materiais que não estejam explicitamente nos dados
- Se uma informação não foi fornecida, NÃO a mencione no roteiro
- Prefira ser genérico a inventar: "material de alta qualidade" em vez de inventar uma especificação
- Todo claim técnico DEVE estar presente nos dados do produto

Sempre retorne APENAS JSON válido, sem markdown ou explicações adicionais.`;
    
    let finalSystemPrompt: string;
    let finalUserPrompt: string;

    if (shouldUseClinicalBrain) {
      console.log('🧠 Clinical Brain ATIVO para YouTube Script');
      finalSystemPrompt = await buildMasterPrompt(finalPromptWithProtection, productContext);
      finalUserPrompt = 'Gerar roteiros de vídeo para YouTube respeitando 100% o contexto técnico fornecido. Retorne APENAS JSON válido no formato especificado.';
    } else {
      console.log('📋 Usando prompt padrão (Clinical Brain desativado ou inválido)');
      finalSystemPrompt = baseSystemPrompt;
      finalUserPrompt = finalPromptWithProtection;
    }
    
    console.log('🏁 Dual-AI: Generating YouTube scripts...');
    const result = await compareAndSelectBest(finalSystemPrompt, finalUserPrompt, {
      contentType: 'product',
      minLength: 500,
      maxLength: 3000,
      requiredKeywords: Array.isArray(product.keywords) ? product.keywords.slice(0, 5) : []
    }, { edgeFunctionId: 'generate-youtube-script', actionName: 'Roteiro YouTube', productName: product.name });
    
    console.log(`✅ YouTube Script winner: ${result.winner} (score: ${result.score.toFixed(1)})`);
    
    let generatedContent;
    try {
      const cleanedContent = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      generatedContent = JSON.parse(cleanedContent);
      
      // Validar estrutura esperada
      if (!generatedContent.institutional && !generatedContent.technical && !generatedContent.educational && !generatedContent.step_by_step) {
        throw new Error('Estrutura JSON inválida: formatos obrigatórios ausentes');
      }
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      // Fallback manual
      generatedContent = createFallbackContent(product);
    }

    // Salvar no banco
    const currentData = product.youtube_scripts || { scripts: [], last_generated: null };
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
      .update({ youtube_scripts: currentData })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Erro ao salvar: ${updateError.message}`);
    }

    console.log('🎬 YouTube scripts generated and saved successfully');

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
    console.error('Error in generate-youtube-script function:', error);
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

function getDefaultYouTubeScriptPrompt(): string {
  return `Você é um especialista sênior em roteiro audiovisual técnico para YouTube, com foco em educação, autoridade e compliance.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Benefícios: {product.benefits}
- Características: {product.features}
- Aplicações: {product.applications}
- Público-alvo: {product.target_audience}
- Especificações Técnicas: {product.technical_specifications}

Informações da Empresa:
- Nome: {company.company_name}
- Valores da marca: {company.brand_values}

REGRAS OBRIGATÓRIAS:
- NÃO usar linguagem viral ou clickbait
- NÃO fazer promessas clínicas ou regulatórias
- NÃO inventar dados técnicos
- Manter tom profissional e educativo
- Focar em informação precisa e valor real

GERAR ROTEIROS EM 4 FORMATOS:

1. INSTITUCIONAL (3-5 minutos)
   - Apresentação da marca e produto
   - Foco em credibilidade e autoridade
   - Adequado para: CEO, Diretor, Especialista

2. TÉCNICO (5-10 minutos)
   - Detalhamento de especificações e features
   - Comparativos técnicos quando relevante
   - Adequado para: Especialista técnico

3. EDUCACIONAL (5-8 minutos)
   - Tutorial de como usar/aplicar
   - Passo a passo didático
   - Adequado para: Instrutor, Especialista

4. PASSO A PASSO (3-5 minutos)
   - Demonstração prática
   - Foco em usabilidade
   - Adequado para: Demonstrador

PARA CADA FORMATO, ENTREGAR:
- objective: Objetivo do vídeo (1 frase)
- speaker: Quem deve apresentar (perfil)
- estimated_duration: Duração estimada
- scenes: Array de cenas com:
  - scene: Número da cena
  - visual: Descrição do que mostrar
  - dialogue: Falas completas do apresentador

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

Formato JSON obrigatório:
{
  "institutional": {
    "objective": "Apresentar o produto X como solução de referência",
    "speaker": "CEO ou Diretor Comercial",
    "estimated_duration": "3-4 minutos",
    "scenes": [
      {
        "scene": 1,
        "visual": "Plano aberto do ambiente de trabalho",
        "dialogue": "Olá, eu sou [Nome], e hoje vou apresentar..."
      }
    ]
  },
  "technical": {
    "objective": "",
    "speaker": "",
    "estimated_duration": "",
    "scenes": []
  },
  "educational": {
    "objective": "",
    "speaker": "",
    "estimated_duration": "",
    "scenes": []
  },
  "step_by_step": {
    "objective": "",
    "speaker": "",
    "estimated_duration": "",
    "scenes": []
  }
}`;
}

function createFallbackContent(product: any) {
  return {
    institutional: {
      objective: `Apresentar ${product.name} como solução de referência no mercado`,
      speaker: "CEO ou Diretor Comercial",
      estimated_duration: "3-4 minutos",
      scenes: [
        {
          scene: 1,
          visual: "Plano aberto do ambiente profissional",
          dialogue: `Olá! Hoje vou apresentar o ${product.name}, uma solução desenvolvida para atender às necessidades mais exigentes do mercado.`
        },
        {
          scene: 2,
          visual: "Close no produto",
          dialogue: `O ${product.name} foi projetado com foco em qualidade e eficiência, oferecendo resultados consistentes.`
        },
        {
          scene: 3,
          visual: "Demonstração visual do produto",
          dialogue: "Conheça mais sobre como podemos ajudar sua operação. Entre em contato conosco!"
        }
      ]
    },
    technical: {
      objective: `Detalhar especificações técnicas do ${product.name}`,
      speaker: "Especialista Técnico",
      estimated_duration: "5-7 minutos",
      scenes: [
        {
          scene: 1,
          visual: "Apresentador com produto",
          dialogue: `Vamos analisar em detalhes as especificações técnicas do ${product.name}.`
        }
      ]
    },
    educational: {
      objective: `Ensinar como utilizar o ${product.name} corretamente`,
      speaker: "Instrutor ou Especialista",
      estimated_duration: "5-8 minutos",
      scenes: [
        {
          scene: 1,
          visual: "Ambiente de treinamento",
          dialogue: `Neste tutorial, você vai aprender a utilizar o ${product.name} de forma eficiente.`
        }
      ]
    },
    step_by_step: {
      objective: `Demonstração prática do ${product.name}`,
      speaker: "Demonstrador",
      estimated_duration: "3-5 minutos",
      scenes: [
        {
          scene: 1,
          visual: "Close nas mãos demonstrando",
          dialogue: `Veja como é simples utilizar o ${product.name} no dia a dia.`
        }
      ]
    }
  };
}

function processPromptVariables(prompt: string, product: any, company: any): string {
  let processedPrompt = prompt;

  // Variáveis do produto
  processedPrompt = processedPrompt.replace(/{product\.name}/g, product.name || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.description}/g, product.description || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.category}/g, product.category || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.applications}/g, product.applications || 'Não informado');
  
  // Processar arrays
  const benefitsArray = Array.isArray(product.benefits) ? product.benefits : [];
  processedPrompt = processedPrompt.replace(/{product\.benefits}/g, benefitsArray.join(', ') || 'Não informados');

  const keywordsArray = Array.isArray(product.keywords) ? product.keywords : [];
  processedPrompt = processedPrompt.replace(/{product\.keywords}/g, keywordsArray.join(', ') || 'Não informadas');

  const targetAudienceArray = Array.isArray(product.target_audience) ? product.target_audience : [];
  processedPrompt = processedPrompt.replace(/{product\.target_audience}/g, targetAudienceArray.join(', ') || 'Não informado');

  const featuresArray = Array.isArray(product.features) ? product.features : [];
  processedPrompt = processedPrompt.replace(/{product\.features}/g, featuresArray.join(', ') || 'Não informadas');

  // Especificações técnicas
  const techSpecsArray = Array.isArray(product.technical_specifications) ? product.technical_specifications : [];
  const techSpecsText = techSpecsArray.map((spec: any) => `${spec.label}: ${spec.value}`).join('; ') || 'Não informadas';
  processedPrompt = processedPrompt.replace(/{product\.technical_specifications}/g, techSpecsText);

  // Variáveis da empresa
  if (company) {
    processedPrompt = processedPrompt.replace(/{company\.company_name}/g, company.company_name || 'Não informado');
    processedPrompt = processedPrompt.replace(/{company\.brand_values}/g, company.brand_values || 'Não informados');
  } else {
    processedPrompt = processedPrompt.replace(/{company\.company_name}/g, 'Não informado');
    processedPrompt = processedPrompt.replace(/{company\.brand_values}/g, 'Não informados');
  }

  return processedPrompt;
}
