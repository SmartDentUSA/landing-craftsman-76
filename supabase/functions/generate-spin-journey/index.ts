import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFromResponse } from '../_shared/track-ai-usage.ts';
import { SPIN_SYSTEM_PROMPT } from "../_shared/spin-system-prompt.ts";
import {
  validateSpinJourney,
  applyFallback,
  DEFAULT_FALLBACKS
} from "../_shared/content-validators.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solutionId } = await req.json();
    console.log('🗺️ Generating SPIN Journey for solution:', solutionId);

    if (!solutionId) {
      throw new Error('solutionId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar solução SPIN
    const { data: solution, error: solutionError } = await supabase
      .from('spin_selling_solutions')
      .select('*')
      .eq('id', solutionId)
      .single();

    if (solutionError || !solution) {
      throw new Error('Solução SPIN não encontrada');
    }

    // 2. Validar dependências
    if (!solution.sales_pitch || solution.sales_pitch.trim().length < 100) {
      throw new Error('Sales Pitch não foi gerado ou está incompleto. Gere o Sales Pitch primeiro.');
    }

    const successCases = solution.success_cases || [];
    if (successCases.length === 0) {
      throw new Error('Adicione pelo menos 1 caso de sucesso antes de gerar a Jornada SPIN.');
    }

    // 3. Construir prompt específico
    const specificPrompt = `
═══════════════════════════════════════════════════════════
📋 PITCH ORIGINAL (BASE OBRIGATÓRIA)
═══════════════════════════════════════════════════════════
${solution.sales_pitch}

═══════════════════════════════════════════════════════════
🎖️ CASOS DE SUCESSO DOCUMENTADOS
═══════════════════════════════════════════════════════════

${successCases.map((sc: any, i: number) => `
${i + 1}. ${sc.client_name} — ${sc.specialty} (${sc.city}/${sc.state})
Área de Atuação: ${sc.area}
Resultados: ${sc.results_achieved}
${sc.instagram ? `Instagram: @${sc.instagram}` : ''}
`).join('\n')}

═══════════════════════════════════════════════════════════
📝 TAREFA — GERAR A JORNADA (DESEJO → DOR → RESULTADO)
═══════════════════════════════════════════════════════════

1. DESEJO (50–80 palavras)
   - Começar com "Imagine…" ou "Visualize…"
   - Criar cenário aspiracional
   - Incorporar elementos reais dos casos de sucesso

2. DOR (80–120 palavras)
   - Basear-se no pitch (obrigatório)
   - Explorar:
       • Dor Operacional  
       • Dor Financeira  
       • Dor Emocional  
   - Conexão direta com o pain_type e com o pitch

3. RESULTADO (60–100 palavras)
   ⚠️ REGRA CRÍTICA DE VALIDAÇÃO CRUZADA DOR-RESULTADO:
   - A seção RESULTADO DEVE demonstrar EXPLICITAMENTE como os 
     "results_achieved" dos casos de sucesso ANULARAM ou SOLUCIONARAM 
     o "pain_type" e as Implicações descritas no Sales Pitch
   - ESTRUTURA OBRIGATÓRIA:
     • Conectar dor específica → resultado específico do case
     • Citar métrica REAL do caso de sucesso (se disponível)
     • Reforçar que a dor foi ELIMINADA (não apenas "melhorada")
     • Mencionar nomes REAIS dos clientes
   - EXEMPLO: "Dr. João Silva tinha o mesmo desafio de retrabalho. 
     Hoje eliminou 100% dessas perdas e reduziu tempo de lab de 5h para 45min."
   - Resultados REAIS dos casos de sucesso
   - Foco na transformação final

═══════════════════════════════════════════════════════════
⚠️ REGRAS CRÍTICAS
═══════════════════════════════════════════════════════════

✅ Usar informações REAIS (pitch + casos)  
✅ Tom empático, consultivo e direto  
✅ Linguagem emocional porém autêntica  

❌ Proibido inventar resultados  
❌ Proibido adicionar clientes inexistentes  
❌ Proibido números não mencionados  
❌ Proibido generalizações vazias  

═══════════════════════════════════════════════════════════
📤 SAÍDA (JSON puro)
═══════════════════════════════════════════════════════════

{
  "desire": "Texto da etapa Desejo",
  "pain": "Texto da etapa Dor",
  "result": "Texto da etapa Resultado"
}

═══════════════════════════════════════════════════════════
📋 EXEMPLO DE OUTPUT IDEAL (PARA REFERÊNCIA DE TOM)
═══════════════════════════════════════════════════════════

{
  "desire": "Imagine ter autonomia total para produzir próteses de alta precisão em sua própria clínica, impressionar seus pacientes com entregas no mesmo dia e conquistar reconhecimento como referência tecnológica na região. Visualize o controle completo sobre prazos, custos e qualidade.",
  "pain": "Mas hoje, muitas clínicas ainda dependem de laboratórios externos, aguardando dias por trabalhos que poderiam ser feitos internamente. Isso significa perder pacientes para concorrentes mais ágeis, aceitar margens apertadas e conviver com retrabalhos frustrantes. Enquanto outros profissionais já dominam o fluxo digital completo, você ainda está preso a processos tradicionais, sentindo que sua clínica está ficando para trás no mercado.",
  "result": "Dr. João Silva, de Curitiba, tinha esse mesmo desafio. Hoje, com a solução implementada, reduziu de 7 para 2 dias o prazo de entrega e aumentou 40% na captação de pacientes premium. Dra. Maria Santos, de São Paulo, conquistou independência total e hoje é referência em casos complexos na capital."
}
`;

    // 4️⃣ GERAR SPIN JOURNEY COM VALIDAÇÃO (FASE 4)
    console.log('[Journey] 🤖 Gerando SPIN Journey com validação automática...');

    let spinJourney: any = null;
    let attempts = 0;
    const maxAttempts = 3;
    const minQualityScore = 70;

    // Função de geração
    const generateJourney = async (): Promise<any> => {
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
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices[0].message.content;
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response as JSON');
      }
      
      return JSON.parse(jsonMatch[0]);
    };

    // Loop de validação + regeneração
    while (attempts < maxAttempts) {
      attempts++;

      try {
        spinJourney = await generateJourney();
        
        // Validar journey
        const validation = validateSpinJourney(
          spinJourney,
          successCases
        );

        console.log(`[Journey Validator] Tentativa ${attempts}/${maxAttempts}:`, {
          score: validation.score,
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          metadata: validation.metadata
        });

        // Se passou na validação, usar
        if (validation.isValid && validation.score >= minQualityScore) {
          console.log(`[Journey] ✅ SPIN Journey validado (tentativa ${attempts}):`, {
            journey: spinJourney,
            qualityScore: validation.score,
            timestamp: new Date().toISOString()
          });
          break;
        }

        // Se não passou e ainda tem tentativas, continuar loop
        if (attempts < maxAttempts) {
          console.warn(`[Journey] Score ${validation.score} < ${minQualityScore}. Regenerando...`);
        }

      } catch (error) {
        console.error(`[Journey Validator] Erro na tentativa ${attempts}:`, error);
        
        // Se última tentativa, usar fallback
        if (attempts >= maxAttempts) {
          spinJourney = DEFAULT_FALLBACKS.spinJourney;
        }
      }
    }

    // Se falhou todas as tentativas, usar fallback completo
    if (!spinJourney) {
      console.error('[Journey] ⚠️ Todas as tentativas falharam. Usando fallback.');
      spinJourney = DEFAULT_FALLBACKS.spinJourney;
    }

    // 5. Criar artifact_chain e metadata
    const artifactChain = {
      source_data_ids: [solutionId],
      pitch_version: '2.0.0',
      generated_by: 'generate-spin-journey',
      timestamp: new Date().toISOString(),
      model_used: 'google/gemini-2.5-flash',
      pain_type: solution.pain_type,
      success_cases_count: successCases.length,
      validation_attempts: attempts
    };

    // Buscar metadata existente
    const { data: existingSolution } = await supabase
      .from('spin_selling_solutions')
      .select('metadata')
      .eq('id', solutionId)
      .single();

    const existingMetadata = existingSolution?.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      artifact_chain: {
        ...(existingMetadata.artifact_chain || {}),
        journey_version: '2.0.0',
        journey_generated_by: 'generate-spin-journey',
        journey_timestamp: new Date().toISOString()
      },
      quality_metrics: {
        ...(existingMetadata.quality_metrics || {}),
        journey_validation_attempts: attempts,
        journey_success_cases_count: successCases.length
      }
    };

    // 6. Salvar no banco com metadata atualizado
    await supabase
      .from('spin_selling_solutions')
      .update({ 
        spin_journey: spinJourney,
        journey_generated_at: new Date().toISOString(),
        metadata: updatedMetadata
      })
      .eq('id', solutionId);

    return new Response(
      JSON.stringify({
        ...spinJourney,
        artifact_chain: artifactChain
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ generate-spin-journey error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
