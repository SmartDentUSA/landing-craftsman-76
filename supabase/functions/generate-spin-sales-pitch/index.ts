import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFromResponse } from '../_shared/track-ai-usage.ts';
import { SPIN_SYSTEM_PROMPT } from "../_shared/spin-system-prompt.ts";
import { 
  calculateDataQuality, 
  prioritizeProducts, 
  processProductsForGeneration,
  extractVideoUrls
} from "../_shared/spin-content-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      solutionId, 
      solution_title, 
      pain_type, 
      product_ids: bodyProductIds,
      manual_context 
    } = await req.json();
    
    console.log('🎯 Generating Sales Pitch for solution:', solutionId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let solution: any;
    let productIds: string[] = [];

    // 1. Buscar solução SPIN (apenas se não for 'new')
    if (solutionId && solutionId !== 'new') {
      const { data: existingSolution, error: solutionError } = await supabase
        .from('spin_selling_solutions')
        .select('*')
        .eq('id', solutionId)
        .single();

      if (solutionError || !existingSolution) {
        throw new Error('Solução SPIN não encontrada');
      }

      solution = existingSolution;
      productIds = bodyProductIds?.length > 0 
        ? bodyProductIds 
        : (solution.selected_product_ids || solution.product_ids || []);
    } else {
      // Para novas soluções, usar dados do body
      if (!bodyProductIds || bodyProductIds.length === 0) {
        throw new Error('product_ids é obrigatório para novas soluções');
      }

      if (!pain_type) {
        throw new Error('pain_type é obrigatório para novas soluções');
      }

      solution = {
        title: solution_title || 'Nova Solução',
        pain_type: pain_type,
        pain_description: null,
        manual_context: manual_context || ''
      };
      productIds = bodyProductIds;
    }

    // 2. Validar produtos
    if (productIds.length === 0) {
      throw new Error('Nenhum produto associado à solução');
    }

    const { data: allProducts, error: productsError } = await supabase
      .from('products_repository')
      .select('*')
      .in('id', productIds);

    if (productsError || !allProducts || allProducts.length === 0) {
      throw new Error('Produtos não encontrados');
    }

    // 3. Validar qualidade de dados
    let dataQuality = calculateDataQuality(allProducts);
    console.log('📊 Data Quality inicial:', dataQuality);

    // ✅ FASE 1.2: PROACTIVE DATA FILL (Auto-enriquecimento)
    if (dataQuality.score < 60) {
      console.log('🔄 Data Quality < 60. Iniciando enriquecimento proativo...');
      
      // Identificar produtos com dados fracos (sem benefits ou features)
      const weakProducts = allProducts.filter(p => {
        const hasBenefits = Array.isArray(p.benefits) && p.benefits.length > 0;
        const hasFeatures = Array.isArray(p.features) && p.features.length > 0;
        return !hasBenefits || !hasFeatures;
      });
      
      if (weakProducts.length > 0) {
        console.log(`🔧 Enriquecendo ${weakProducts.length} produto(s) com dados fracos...`);
        
        // Chamar generate-product-ai-content para cada produto fraco
        for (const product of weakProducts) {
          try {
            console.log(`⏳ Enriquecendo: ${product.name}`);
            const { data: enriched, error: enrichError } = await supabase.functions.invoke(
              'generate-product-ai-content',
              {
                body: {
                  productId: product.id,
                  complementOnly: false // ✅ FORÇAR GERAÇÃO COMPLETA
                }
              }
            );
            
            if (enrichError) {
              console.error(`⚠️ Erro ao enriquecer ${product.name}:`, enrichError);
            } else {
              console.log(`✅ Produto ${product.name} enriquecido com sucesso`);
            }
          } catch (enrichError) {
            console.error(`⚠️ Exceção ao enriquecer ${product.name}:`, enrichError);
          }
        }
        
        // Re-buscar produtos atualizados do banco
        console.log('🔄 Recarregando produtos atualizados do banco...');
        const { data: refreshedProducts, error: refreshError } = await supabase
          .from('products_repository')
          .select('*')
          .in('id', productIds);
        
        if (!refreshError && refreshedProducts) {
          allProducts = refreshedProducts;
          dataQuality = calculateDataQuality(allProducts);
          console.log('📊 Nova Data Quality após enriquecimento:', dataQuality);
        }
      }
    }

    // Validação final com threshold 60
    if (dataQuality.score < 60) {
      return new Response(JSON.stringify({
        error: true,
        message: `Dados insuficientes. Score: ${dataQuality.score}/100 (mínimo 60)`,
        data_quality: dataQuality,
        recommendation: "Sistema tentou enriquecer dados automaticamente, mas ainda faltam informações críticas. Adicione manualmente: benefícios, características e descrições detalhadas."
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 4. Priorizar produtos (máx 5)
    const prioritizedProducts = prioritizeProducts(allProducts, solution.pain_type, 5);
    
    // 5. Processar produtos (truncar vídeos/documentos)
    const products = processProductsForGeneration(prioritizedProducts);

    // 6. Buscar company profile
    const { data: company } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .maybeSingle();

    // 7. Construir contexto adicional (manual_context)
    const manualContext = solution.manual_context || '';

    // 8. Construir prompt específico
    const specificPrompt = `
═══════════════════════════════════════════════════════════
📋 CONTEXTO DA SOLUÇÃO
═══════════════════════════════════════════════════════════

EMPRESA: ${company?.company_name || 'Empresa odontológica'}
SOLUÇÃO: ${solution.title}
TIPO DE DOR: ${solution.pain_type}
DESCRIÇÃO DA DOR: ${solution.pain_description || 'Não especificada'}
PRODUTOS ENVOLVIDOS: ${products.map(p => p.name).join(', ')}

${manualContext ? `CONTEXTUALIZAÇÃO ADICIONAL DO USUÁRIO:
${manualContext}` : ''}

═══════════════════════════════════════════════════════════
📦 DADOS COMPLETOS DOS PRODUTOS
═══════════════════════════════════════════════════════════

${products.map((p, i) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUTO ${i + 1}: ${p.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DESCRIÇÃO:
${p.description || 'Não informada'}

BENEFÍCIOS:
${Array.isArray(p.benefits) ? p.benefits.map((b: string) => `• ${b}`).join('\n') : 'Não informados'}

CARACTERÍSTICAS TÉCNICAS:
${Array.isArray(p.features) ? p.features.map((f: string) => `• ${f}`).join('\n') : 'Não informadas'}

APLICAÇÕES:
${p.applications || 'Não informadas'}

PÚBLICO-ALVO:
${Array.isArray(p.target_audience) ? p.target_audience.join(', ') : 'Não especificado'}

${p.video_captions ? `
INSIGHTS DE VÍDEOS (Resumidos):
${Object.values(p.video_captions).flat().map((v: any) => `• ${v.summary}`).join('\n')}
` : ''}

${Array.isArray(p.document_transcriptions) && p.document_transcriptions.length > 0 ? `
INSIGHTS DE DOCUMENTOS (Resumidos):
${p.document_transcriptions
  .map((d: any) => `• ${d.extracted_data?.summary || d.extracted_data?.description || ''}`)
  .filter(Boolean)
  .join('\n')}
` : ''}
`).join('\n')}

═══════════════════════════════════════════════════════════
📝 TAREFA — GERAR PITCH SPIN (300 a 500 palavras)
═══════════════════════════════════════════════════════════

Estruture obrigatoriamente em 4 fases:

1. SITUAÇÃO (20%)  
   - Descrever o cenário atual do mercado odontológico
   - Rotina comum dos profissionais
   - Como eles trabalham hoje (sem a solução)

2. PROBLEMA (30%)
   - Dores específicas relacionadas a "${solution.pain_type}"
   - Dificuldades operacionais, técnicas e emocionais
   - Use benefícios, características e aplicações REAIS dos produtos

3. IMPLICAÇÃO (30%)
   - Consequências de não resolver a dor
   - Impacto financeiro, reputacional, produtivo e competitivo
   - Profundidade emocional e racional

4. NECESSIDADE (20%)
   - Como ${products.map(p => p.name).join(' + ')} resolve cada dor
   - Benefícios tangíveis e transformação prática
   - Referenciar características reais (sem inventar nada)

═══════════════════════════════════════════════════════════
⚠️ REGRAS CRÍTICAS (ALTA PRIORIDADE)
═══════════════════════════════════════════════════════════

✅ Use apenas informações REAIS
✅ Cite cada produto pelo menos 2 vezes
✅ Linguagem consultiva, humana e natural
✅ Proibido copiar descrição dos produtos
✅ Proibido inventar números, métricas ou funcionalidades
✅ Proibido mencionar concorrentes
✅ Se faltar informação → escreva de forma neutra, sem preencher lacunas

❌ Não faça promessas irreais  
❌ Não gere texto genérico (toda frase deve ter conexão com os dados)  
❌ Não ultrapasse 500 palavras  

═══════════════════════════════════════════════════════════
📤 SAÍDA (JSON puro, sem markdown)
═══════════════════════════════════════════════════════════

{
  "sales_pitch": "Texto completo do pitch seguindo todas as regras",
  "key_benefits": ["Benefício 1", "Benefício 2", "Benefício 3"],
  "target_profile": "Perfil ideal baseado nos produtos e dor"
}

═══════════════════════════════════════════════════════════
📋 EXEMPLO DE OUTPUT IDEAL (PARA REFERÊNCIA DE TOM)
═══════════════════════════════════════════════════════════

{
  "sales_pitch": "No mercado odontológico atual, a busca por excelência clínica e eficiência operacional tornou-se fundamental para clínicas que desejam se destacar. Profissionais enfrentam diariamente desafios relacionados a ${solution.pain_type}, comprometendo tanto a qualidade do atendimento quanto a experiência do paciente. Com ${products[0]?.name}, é possível transformar completamente esse cenário...",
  "key_benefits": [
    "Autonomia operacional completa sem dependência de terceiros",
    "Redução significativa no tempo de entrega de trabalhos protéticos",
    "Qualidade superior e previsibilidade em procedimentos complexos"
  ],
  "target_profile": "Clínicas odontológicas de médio a grande porte que buscam se posicionar como referência tecnológica, dentistas especialistas em reabilitação oral que valorizam precisão, e profissionais que desejam conquistar independência operacional"
}
`;

    // 9. Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SPIN_SYSTEM_PROMPT },
          { role: 'user', content: specificPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    await trackFromResponse(aiData, 'generate-spin-sales-pitch', 'Pitch SPIN');
    const content = aiData.choices[0].message.content;
    
    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }
    
    const result = JSON.parse(jsonMatch[0]);

    // 10. Calcular confidence score
    const confidenceScore = Math.min(100, dataQuality.score + 15); // Boost por ter gerado

    // 11. Criar artifact_chain e metadata
    const artifactChain = {
      source_data_ids: productIds,
      pitch_version: '2.0.0',
      generated_by: 'generate-spin-sales-pitch',
      timestamp: new Date().toISOString(),
      data_quality_score: dataQuality.score,
      model_used: 'google/gemini-2.5-flash',
      pain_type: solution.pain_type
    };

    const metadata = {
      artifact_chain: artifactChain,
      quality_metrics: {
        data_quality_score: dataQuality.score,
        confidence_score: confidenceScore,
        validation_score: 100
      },
      generation_history: [
        {
          version: '2.0.0',
          generated_at: new Date().toISOString(),
          data_quality: dataQuality.score,
          confidence: confidenceScore
        }
      ]
    };

    // 12. Salvar no banco com metadata
    await supabase
      .from('spin_selling_solutions')
      .update({ 
        sales_pitch: result.sales_pitch,
        key_benefits: result.key_benefits,
        target_profile: result.target_profile,
        pitch_confidence_score: confidenceScore,
        pitch_generated_at: new Date().toISOString(),
        metadata: metadata
      })
      .eq('id', solutionId);

    return new Response(
      JSON.stringify({
        ...result,
        confidence_score: confidenceScore,
        data_quality: dataQuality,
        artifact_chain: artifactChain
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ generate-spin-sales-pitch error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
