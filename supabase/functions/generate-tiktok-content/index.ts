import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { buildMasterPrompt, validateContext } from '../_shared/master-system-prompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TikTokContentRequest {
  productId: string;
  customPrompt?: string;
  use_clinical_brain?: boolean; // Clinical Brain v1.0 - default false (MODO A)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { productId, customPrompt, use_clinical_brain = false }: TikTokContentRequest = await req.json();

    console.log(`Generating TikTok content for product ${productId}`);

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
      .single();

    if (companyError) {
      console.warn('Dados da empresa não encontrados:', companyError.message);
    }

    // ========== CLINICAL BRAIN v1.0 (MODO A - NÃO BLOQUEANTE) ==========
    const productContext = {
      ...product,
      company_profile: company ?? null,
    };

    const validation = validateContext(productContext);

    console.log('🧠 ClinicalBrain Validation - generate-tiktok-content', {
      product_id: product.id,
      product_name: product.name,
      valid: validation.valid,
      violations: validation.violations,
      warnings: validation.warnings,
      requested: use_clinical_brain
    });

    // MODO A: Só ativa se pedido E válido
    const shouldUseClinicalBrain = use_clinical_brain === true && validation.valid === true;

    if (!validation.valid && use_clinical_brain) {
      console.warn('⚠️ ClinicalBrain Violations (fallback para modo padrão)', {
        function: 'generate-tiktok-content',
        product_id: product.id,
        violations: validation.violations,
      });
    }
    // ========== FIM CLINICAL BRAIN ==========

    // Buscar configuração de prompt personalizado
    let finalPrompt: string = customPrompt || '';
    if (!finalPrompt) {
      const { data: promptConfig } = await supabase
        .from('prompts_configuration')
        .select('custom_prompt')
        .eq('edge_function_id', 'generate-tiktok-content')
        .eq('prompt_name', 'Script TikTok')
        .single();

      if (promptConfig?.custom_prompt) {
        finalPrompt = promptConfig.custom_prompt;
      } else {
        finalPrompt = getDefaultTikTokPrompt();
      }
    }

    // Processar variáveis no prompt
    const processedPrompt = processPromptVariables(finalPrompt, product, company);

    // Adicionar instruções anti-alucinação
    const finalPromptWithProtection = `${processedPrompt}

⚠️ **INSTRUÇÕES ANTI-ALUCINAÇÃO:**
- Use APENAS informações do produto fornecidas
- NÃO invente benefícios ou características
- Scripts devem ser baseados nos dados reais do produto
- Evite promessas ou claims não fundamentados nos dados`;

    // Gerar conteúdo com Dual-AI Competition
    const { compareAndSelectBest } = await import('../_shared/dual-ai-competition.ts');
    
    // Prompt base atual (comportamento original)
    const baseSystemPrompt = 'Você é um especialista em criação de conteúdo viral para TikTok. Sempre retorne apenas JSON válido, sem markdown ou explicações adicionais.';
    
    // ========== CLINICAL BRAIN: Decisão de Ativação (MODO A) ==========
    let finalSystemPrompt: string;
    let finalUserPrompt: string;

    if (shouldUseClinicalBrain) {
      console.log('🧠 Clinical Brain ATIVO para TikTok');
      finalSystemPrompt = buildMasterPrompt(finalPromptWithProtection, productContext);
      finalUserPrompt = 'Gerar roteiros de TikTok respeitando 100% o contexto clínico fornecido. Retorne APENAS JSON válido no formato especificado.';
    } else {
      console.log('📋 Usando prompt padrão (Clinical Brain desativado ou inválido)');
      finalSystemPrompt = baseSystemPrompt;
      finalUserPrompt = finalPromptWithProtection;
    }
    // ========== FIM CLINICAL BRAIN ==========
    
    console.log('🏁 Dual-AI: Generating TikTok content...');
    const result = await compareAndSelectBest(finalSystemPrompt, finalUserPrompt, {
      contentType: 'tiktok',
      minLength: 150,
      maxLength: 500,
      requiredKeywords: Array.isArray(product.bot_trigger_words) ? product.bot_trigger_words : []
    }, { edgeFunctionId: 'generate-tiktok-content', actionName: 'Script TikTok', productName: product.name });
    
    console.log(`✅ TikTok winner: ${result.winner} (score: ${result.score.toFixed(1)})`);
    
    let generatedContent;
    try {
      const cleanedContent = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      generatedContent = JSON.parse(cleanedContent);
      
      // Validar estrutura esperada
      if (!generatedContent.hook || !generatedContent.video_script || !generatedContent.call_to_action) {
        throw new Error('Estrutura JSON inválida: campos obrigatórios ausentes');
      }
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      // Fallback manual
      generatedContent = {
        hook: `🔥 Descubra o segredo de ${product.name}!`,
        video_script: `POV: Você finalmente encontrou ${product.name} que vai revolucionar sua vida!\n\n✨ Olha só isso...\n\n[Mostrar produto]\n\nEu não acreditava até testar!\n\n[Demonstração]\n\nE o resultado? INCRÍVEL! 🤯`,
        call_to_action: `💬 Comenta 'QUERO' que te mando o link!`,
        hashtags: ["#viral", "#fyp", "#trending"],
        trending_references: ["produto revolucionário", "antes e depois", "teste real"],
        estimated_duration: "30-45 segundos"
      };
    }

    // Salvar no banco
    const currentData = product.tiktok_content || { copies: [], last_generated: null };
    currentData.copies = currentData.copies || [];
    
    // Adicionar novo conteúdo no início do array
    currentData.copies.unshift({
      id: crypto.randomUUID(),
      ...generatedContent,
      generated_at: new Date().toISOString(),
      editable: true
    });
    
    // Manter apenas os últimos 10
    currentData.copies = currentData.copies.slice(0, 10);
    currentData.last_generated = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('products_repository')
      .update({ tiktok_content: currentData })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Erro ao salvar: ${updateError.message}`);
    }

    console.log('TikTok content generated and saved successfully');

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
    console.error('Error in generate-tiktok-content function:', error);
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

function getDefaultTikTokPrompt(): string {
  return `Você é um especialista em criação de conteúdo viral para TikTok. Crie um script completo e estratégico para um vídeo TikTok que gere engajamento máximo.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Preço: {product.price}
- Keywords: {product.keywords}
- Público-alvo: {product.target_audience}
- Benefícios: {product.benefits}
- Características: {product.features}
- Pitch de Vendas: {product.sales_pitch}
- Aplicações: {product.applications}

Informações da Empresa:
- Nome: {company.company_name}
- Valores da marca: {company.brand_values}

PALAVRAS GATILHO BOT: {product.bot_trigger_words}

INSTRUÇÕES ESPECÍFICAS PARA TIKTOK:

1. HOOK (3 primeiros segundos): CRÍTICO para capturar atenção
   - Deve ser extremamente impactante e visual
   - Use padrões virais: "POV:", "Quando você...", "Ninguém te conta que..."
   - Crie curiosidade imediata
   - Máximo 15 palavras

2. SCRIPT DO VÍDEO (15-60 segundos):
   - Linguagem casual e autêntica da geração Z/Millennial
   - Timing perfeito para cada cena
   - Use trends atuais quando possível
   - Inclua momentos de pausa para impact
   - Máximo 150 palavras para facilitar memorização

3. CALL-TO-ACTION FINAL:
   - OBRIGATÓRIO: Deve usar uma palavra gatilho do bot se disponível
   - Incentive comentários, shares e saves
   - Crie senso de urgência ou FOMO

TEMPLATES OBRIGATÓRIOS PARA CTA (escolha 1):
- "💬 Comenta '{random_trigger_word}' que te mando o link!"
- "💬 Salva o vídeo + comenta '{random_trigger_word}' para mais info!"
- "💬 Marca 3 amigos + comenta '{random_trigger_word}' nos comentários!"

Se não houver palavras gatilho configuradas, use: "💬 Comenta 'QUERO' que te mando mais informações!"

4. ELEMENTOS VIRAIS A INCLUIR:
   - Transições rápidas
   - Música/som trending
   - Texto na tela em momentos-chave
   - Gestos expressivos
   - Revelações ou plot twists

CRÍTICO: Retorne APENAS um JSON válido, sem blocos de código markdown.

Formato JSON obrigatório:
{
  "hook": "Hook viral de 3 segundos (máximo 15 palavras)",
  "video_script": "Script completo do vídeo com timing perfeito \\n\\nIncluir quebras de linha para diferentes cenas",
  "call_to_action": "CTA final OBRIGATORIAMENTE usando palavra gatilho",
  "hashtags": ["#viral", "#fyp", "#trending", "#categoria"],
  "trending_references": ["trend1", "trend2", "trend3"],
  "estimated_duration": "30-45 segundos"
}`;
}

function processPromptVariables(prompt: string, product: any, company: any): string {
  let processedPrompt = prompt;

  // Variáveis do produto
  processedPrompt = processedPrompt.replace(/{product\.name}/g, product.name || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.description}/g, product.description || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.category}/g, product.category || 'Não informada');
  processedPrompt = processedPrompt.replace(/{product\.applications}/g, product.applications || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.sales_pitch}/g, product.sales_pitch || 'Não informado');
  processedPrompt = processedPrompt.replace(/{product\.price}/g, product.price ? `${product.currency || 'BRL'} ${product.price}` : 'Não informado');
  
  // Processar arrays
  const benefitsArray = Array.isArray(product.benefits) ? product.benefits : [];
  const benefitsText = benefitsArray.join(', ') || 'Não informados';
  processedPrompt = processedPrompt.replace(/{product\.benefits}/g, benefitsText);

  const keywordsArray = Array.isArray(product.keywords) ? product.keywords : [];
  const keywordsText = keywordsArray.join(', ') || 'Não informadas';
  processedPrompt = processedPrompt.replace(/{product\.keywords}/g, keywordsText);

  const targetAudienceArray = Array.isArray(product.target_audience) ? product.target_audience : [];
  const targetAudienceText = targetAudienceArray.join(', ') || 'Não informado';
  processedPrompt = processedPrompt.replace(/{product\.target_audience}/g, targetAudienceText);

  const featuresArray = Array.isArray(product.features) ? product.features : [];
  const featuresText = featuresArray.join(', ') || 'Não informadas';
  processedPrompt = processedPrompt.replace(/{product\.features}/g, featuresText);

  // Processar palavras gatilho BOT
  const triggerWordsArray = Array.isArray(product.bot_trigger_words) ? product.bot_trigger_words : [];
  const triggerWordsText = triggerWordsArray.join(', ') || 'Não configuradas';
  processedPrompt = processedPrompt.replace(/{product\.bot_trigger_words}/g, triggerWordsText);

  // Palavra gatilho aleatória
  const randomTriggerWord = triggerWordsArray.length > 0 
    ? triggerWordsArray[Math.floor(Math.random() * triggerWordsArray.length)]
    : 'QUERO';
  processedPrompt = processedPrompt.replace(/{random_trigger_word}/g, randomTriggerWord);

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

async function generateWithDeepSeek(apiKey: string, prompt: string, product: any) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em criação de conteúdo viral para TikTok. Sempre retorne apenas JSON válido, sem markdown ou explicações adicionais.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 1000,
      temperature: 0.8
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro na API DeepSeek:', errorText);
    throw new Error(`Erro na API DeepSeek: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Resposta vazia da API DeepSeek');
  }

  console.log('Raw API response:', content);

  try {
    // Limpar possíveis blocos de código markdown
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsedContent = JSON.parse(cleanedContent);
    
    // Validar estrutura esperada
    if (!parsedContent.hook || !parsedContent.video_script || !parsedContent.call_to_action) {
      throw new Error('Estrutura JSON inválida: campos obrigatórios ausentes');
    }

    return parsedContent;
  } catch (parseError) {
    console.error('Erro ao parsear JSON da DeepSeek:', parseError);
    console.error('Conteúdo recebido:', content);
    
    // Fallback manual
    return {
      hook: `🔥 Descubra o segredo de ${product.name}!`,
      video_script: `POV: Você finalmente encontrou ${product.name} que vai revolucionar sua vida!\n\n✨ Olha só isso...\n\n[Mostrar produto]\n\nEu não acreditava até testar!\n\n[Demonstração]\n\nE o resultado? INCRÍVEL! 🤯`,
      call_to_action: `💬 Comenta 'QUERO' que te mando o link!`,
      hashtags: ["#viral", "#fyp", "#trending"],
      trending_references: ["produto revolucionário", "antes e depois", "teste real"],
      estimated_duration: "30-45 segundos"
    };
  }
}
