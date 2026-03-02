import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackFromResponse } from '../_shared/track-ai-usage.ts';
import { SPIN_SYSTEM_PROMPT } from "../_shared/spin-system-prompt.ts";

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
    console.log('📊 Generating SPIN Metrics for solution:', solutionId);

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
      throw new Error('Sales Pitch não foi gerado. Gere o Sales Pitch primeiro.');
    }

    const successCases = solution.success_cases || [];
    if (successCases.length === 0) {
      throw new Error('Adicione pelo menos 1 caso de sucesso com resultados mensuráveis.');
    }

    // Validar se algum caso tem results_achieved
    const casesWithResults = successCases.filter((sc: any) => 
      sc.results_achieved && sc.results_achieved.trim().length > 10
    );

    if (casesWithResults.length === 0) {
      throw new Error('Nenhum caso de sucesso tem resultados documentados. Adicione métricas reais antes de gerar.');
    }

    // 3. Construir prompt específico
    const specificPrompt = `
═══════════════════════════════════════════════════════════
📋 PITCH DE VENDAS (BASE PRINCIPAL)
═══════════════════════════════════════════════════════════
${solution.sales_pitch}

═══════════════════════════════════════════════════════════
🎖️ RESULTADOS REAIS DOS CLIENTES (BASE EXCLUSIVA)
═══════════════════════════════════════════════════════════
${casesWithResults.map((sc: any, i: number) => `
${i + 1}. ${sc.client_name} (${sc.specialty} - ${sc.city}/${sc.state})
Resultados: ${sc.results_achieved}
`).join('\n')}

═══════════════════════════════════════════════════════════
📝 TAREFA — GERAR 3 MÉTRICAS QUANTIFICÁVEIS
═══════════════════════════════════════════════════════════

Cada métrica deve conter:

1. LABEL — 3 a 6 palavras (Ex: "Redução no Tempo de Entrega")
2. VALUE — Como "De X para Y" ou "%"
3. UNIT — dias, horas, %, casos/mês, R$/mês etc.
4. DESCRIPTION — 20–40 palavras, explicando o impacto

⚠️ Se não houver DADOS SUFICIENTES, NÃO invente a métrica.
Em vez disso, explique:  
"Não há dados suficientes nos casos de sucesso para gerar uma métrica confiável."

═══════════════════════════════════════════════════════════
⚠️ REGRAS CRÍTICAS
═══════════════════════════════════════════════════════════

✅ Somente métricas com base REAL  
✅ Priorizar tempo, custo e capacidade  
✅ Clareza absoluta  
✅ Nada genérico  

❌ Proibido números inventados  
❌ Proibido métricas vagas  
❌ Proibido duplicar métricas muito similares  

═══════════════════════════════════════════════════════════
📤 SAÍDA (JSON array)
═══════════════════════════════════════════════════════════

[
  {
    "label": "...",
    "value": "...",
    "unit": "...",
    "description": "..."
  }
]

═══════════════════════════════════════════════════════════
📋 EXEMPLO DE OUTPUT IDEAL (PARA REFERÊNCIA)
═══════════════════════════════════════════════════════════

[
  {
    "label": "Redução no Tempo de Entrega",
    "value": "De 7 para 2",
    "unit": "dias",
    "description": "Com impressão in-house, próteses que levavam 7 dias agora ficam prontas em 2 dias, permitindo agendar retornos mais rápidos."
  },
  {
    "label": "Aumento de Capacidade Produtiva",
    "value": "60%",
    "unit": "%",
    "description": "Eliminação de gargalos com laboratórios permite atender mais pacientes sem aumentar equipe."
  },
  {
    "label": "Redução de Custos Operacionais",
    "value": "R$ 4.500",
    "unit": "por mês",
    "description": "Economia com eliminação de terceirização de laboratórios externos."
  }
]
`;

    // 4. Chamar Lovable AI
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
    await trackFromResponse(aiData, 'generate-spin-metrics', 'Métricas SPIN');
    const content = aiData.choices[0].message.content;
    
    // Parse JSON array
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON array');
    }
    
    const metrics = JSON.parse(jsonMatch[0]);

    // 5. Validar que retornou array
    if (!Array.isArray(metrics)) {
      throw new Error('AI did not return an array of metrics');
    }

    // 6. Salvar no banco
    await supabase
      .from('spin_selling_solutions')
      .update({ 
        impact_metrics: metrics,
        metrics_generated_at: new Date().toISOString()
      })
      .eq('id', solutionId);

    return new Response(
      JSON.stringify(metrics),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ generate-spin-metrics error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
