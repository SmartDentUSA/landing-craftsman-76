import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { trackFromResponse } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ForbiddenProduct {
  product_name: string;
  reason: string;
}

interface RequiredProduct {
  product_name: string;
  context: string;
}

interface AntiHallucinationRules {
  never_claim: string[];
  never_mix_with: string[];
  never_use_in_stages: string[];
  always_require: string[];
  always_explain: string[];
}

interface WorkflowStage {
  applicable: boolean;
  role: 'principal' | 'acessorio' | 'consumivel' | null;
  description: string;
  pain_points_addressed: string[];
  competitive_advantages: string[];
}

interface ClinicalBrainOutput {
  product_type: string;
  workflow_stages: Record<string, WorkflowStage>;
  forbidden_products: ForbiddenProduct[];
  required_products: RequiredProduct[];
  anti_hallucination_rules: AntiHallucinationRules;
  confidence_score: number;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, forceRegenerate = false } = await req.json();

    if (!productId) {
      throw new Error('productId é obrigatório');
    }

    console.log(`🧠 [Clinical Brain] Iniciando geração para produto: ${productId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar produto
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error(`Produto não encontrado: ${productId}`);
    }

    // Verificar se já foi gerado e não forçar regeneração
    if (product.clinical_brain_status === 'validated' && !forceRegenerate) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Clinical Brain já validado. Use forceRegenerate=true para regenerar.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Buscar regras da categoria
    let categoryRules: AntiHallucinationRules | null = null;
    if (product.category) {
      const { data: categoryConfig } = await supabase
        .from('categories_config')
        .select('anti_hallucination_rules, clinical_tone, criticality_percent')
        .eq('category', product.category)
        .maybeSingle();
      
      if (categoryConfig?.anti_hallucination_rules) {
        categoryRules = categoryConfig.anti_hallucination_rules as AntiHallucinationRules;
      }
    }

    // 3. Buscar todos os produtos para análise de compatibilidade
    const { data: allProducts } = await supabase
      .from('products_repository')
      .select('id, name, category, subcategory, product_type')
      .eq('approved', true)
      .neq('id', productId)
      .limit(100);

    const productsList = (allProducts || [])
      .map(p => `- ${p.name} (${p.category || 'Sem categoria'} > ${p.subcategory || 'N/A'})`)
      .join('\n');

    // 4. Montar prompt para IA
    const systemPrompt = `Você é um especialista em odontologia digital CAD/CAM com profundo conhecimento em equipamentos, materiais e fluxos de trabalho.

TAREFA: Analisar o produto fornecido e gerar configurações do "Clinical Brain" para garantir que sistemas de IA nunca gerem informações incorretas sobre ele.

WORKFLOW DE ODONTOLOGIA DIGITAL:
- scan: Scanear (captura digital intraoral ou de modelos)
- design: Desenhar (planejamento CAD, design de próteses)
- print: Imprimir (fabricação por impressão 3D)
- process: Processar (lavagem, cura UV, pós-processamento)
- finish: Finalizar (acabamento, polimento, caracterização)
- install: Instalar (cimentação, ajuste oclusal, entrega)

REGRAS DE ANÁLISE:
1. Identifique em quais etapas do workflow o produto é usado
2. Determine se há produtos que NUNCA devem ser usados junto (incompatibilidades químicas/técnicas)
3. Determine se há produtos que SEMPRE devem ser usados junto (dependências)
4. Liste afirmações que NUNCA devem ser feitas sobre o produto
5. Liste o que SEMPRE deve ser explicado ao mencionar o produto

FORMATO DE RESPOSTA (JSON ESTRITO):
{
  "product_type": "CATEGORIA > SUBCATEGORIA",
  "workflow_stages": {
    "scan": { "applicable": boolean, "role": "principal|acessorio|consumivel|null", "description": "...", "pain_points_addressed": [], "competitive_advantages": [] },
    "design": { "applicable": boolean, "role": "principal|acessorio|consumivel|null", "description": "...", "pain_points_addressed": [], "competitive_advantages": [] },
    "print": { "applicable": boolean, "role": "principal|acessorio|consumivel|null", "description": "...", "pain_points_addressed": [], "competitive_advantages": [] },
    "process": { "applicable": boolean, "role": "principal|acessorio|consumivel|null", "description": "...", "pain_points_addressed": [], "competitive_advantages": [] },
    "finish": { "applicable": boolean, "role": "principal|acessorio|consumivel|null", "description": "...", "pain_points_addressed": [], "competitive_advantages": [] },
    "install": { "applicable": boolean, "role": "principal|acessorio|consumivel|null", "description": "...", "pain_points_addressed": [], "competitive_advantages": [] }
  },
  "forbidden_products": [
    { "product_name": "Nome exato do produto incompatível", "reason": "Motivo técnico da incompatibilidade" }
  ],
  "required_products": [
    { "product_name": "Nome exato do produto obrigatório", "context": "Contexto de uso obrigatório" }
  ],
  "anti_hallucination_rules": {
    "never_claim": ["Afirmação que NUNCA deve ser feita sobre este produto"],
    "never_mix_with": ["Produto/substância que NUNCA deve ser misturado"],
    "never_use_in_stages": ["Etapa do workflow onde NÃO deve ser usado"],
    "always_require": ["Pré-requisito obrigatório para usar este produto"],
    "always_explain": ["Informação que SEMPRE deve ser explicada"]
  },
  "confidence_score": 0.85,
  "reasoning": "Explicação do raciocínio usado na análise"
}

IMPORTANTE:
- Só inclua produtos em forbidden_products se houver incompatibilidade REAL documentada
- Só inclua produtos em required_products se houver dependência REAL
- Seja conservador e preciso nas regras anti-alucinação
- confidence_score entre 0.0 e 1.0 indica sua confiança na análise`;

    const userPrompt = `PRODUTO PARA ANÁLISE:
Nome: ${product.name}
Categoria: ${product.category || 'Não definida'} > ${product.subcategory || 'N/A'}
Descrição: ${product.description || 'Sem descrição'}
Aplicações: ${product.applications || 'N/A'}
Especificações Técnicas: ${JSON.stringify(product.technical_specifications || [], null, 2)}
Benefícios: ${JSON.stringify(product.benefits || [], null, 2)}
Features: ${JSON.stringify(product.features || [], null, 2)}

${categoryRules ? `REGRAS HERDADAS DA CATEGORIA (usar como base):
${JSON.stringify(categoryRules, null, 2)}` : ''}

PRODUTOS EXISTENTES NO CATÁLOGO (para análise de compatibilidade):
${productsList || 'Nenhum outro produto cadastrado'}

Analise o produto e retorne o JSON conforme especificado.`;

    // 5. Chamar IA (Lovable AI Gateway)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('🤖 [Clinical Brain] Chamando IA...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ [Clinical Brain] Erro na IA:', errorText);
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    await trackFromResponse(aiData, 'generate-clinical-brain', 'Cérebro Clínico');
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('📝 [Clinical Brain] Resposta da IA recebida');

    // 6. Parsear JSON da resposta
    let clinicalBrain: ClinicalBrainOutput;
    try {
      // Extrair JSON da resposta (pode vir com markdown)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta');
      }
      clinicalBrain = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ [Clinical Brain] Erro ao parsear JSON:', parseError);
      console.log('📄 Conteúdo recebido:', aiContent);
      throw new Error('Falha ao parsear resposta da IA');
    }

    // 7. Mesclar regras da categoria (se existirem)
    if (categoryRules) {
      clinicalBrain.anti_hallucination_rules = {
        never_claim: [
          ...(categoryRules.never_claim || []),
          ...(clinicalBrain.anti_hallucination_rules?.never_claim || [])
        ].filter((v, i, a) => a.indexOf(v) === i),
        never_mix_with: [
          ...(categoryRules.never_mix_with || []),
          ...(clinicalBrain.anti_hallucination_rules?.never_mix_with || [])
        ].filter((v, i, a) => a.indexOf(v) === i),
        never_use_in_stages: [
          ...(categoryRules.never_use_in_stages || []),
          ...(clinicalBrain.anti_hallucination_rules?.never_use_in_stages || [])
        ].filter((v, i, a) => a.indexOf(v) === i),
        always_require: [
          ...(categoryRules.always_require || []),
          ...(clinicalBrain.anti_hallucination_rules?.always_require || [])
        ].filter((v, i, a) => a.indexOf(v) === i),
        always_explain: [
          ...(categoryRules.always_explain || []),
          ...(clinicalBrain.anti_hallucination_rules?.always_explain || [])
        ].filter((v, i, a) => a.indexOf(v) === i),
      };
    }

    // 8. Salvar no banco de dados
    const { error: updateError } = await supabase
      .from('products_repository')
      .update({
        product_type: clinicalBrain.product_type,
        workflow_stages: clinicalBrain.workflow_stages,
        forbidden_products: clinicalBrain.forbidden_products,
        required_products: clinicalBrain.required_products,
        anti_hallucination_rules: clinicalBrain.anti_hallucination_rules,
        clinical_brain_status: 'ai_generated',
        clinical_brain_generated_at: new Date().toISOString(),
        clinical_brain_validated_at: null,
        clinical_brain_validator_name: null,
        clinical_brain_validation_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (updateError) {
      console.error('❌ [Clinical Brain] Erro ao salvar:', updateError);
      throw new Error(`Erro ao salvar: ${updateError.message}`);
    }

    console.log(`✅ [Clinical Brain] Gerado com sucesso para: ${product.name}`);

    return new Response(JSON.stringify({
      success: true,
      productId,
      productName: product.name,
      generated: {
        product_type: clinicalBrain.product_type,
        workflow_stages: clinicalBrain.workflow_stages,
        forbidden_products: clinicalBrain.forbidden_products,
        required_products: clinicalBrain.required_products,
        anti_hallucination_rules: clinicalBrain.anti_hallucination_rules,
      },
      inherited_from_category: categoryRules,
      confidence_score: clinicalBrain.confidence_score,
      reasoning: clinicalBrain.reasoning,
      status: 'ai_generated',
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [Clinical Brain] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
