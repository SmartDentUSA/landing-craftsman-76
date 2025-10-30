import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpinFAQ {
  question: string;
  answer: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solutionId } = await req.json();
    console.log('📝 Generating FAQs for solution:', solutionId);

    if (!solutionId) {
      throw new Error('solutionId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar solução completa
    const { data: solution, error: solutionError } = await supabase
      .from('spin_selling_solutions')
      .select('*')
      .eq('id', solutionId)
      .single();

    if (solutionError || !solution) {
      throw new Error('Solução não encontrada');
    }

    // Buscar produtos associados
    const productIds = solution.selected_product_ids || [];
    let products: any[] = [];
    
    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products_repository')
        .select('id, name, description, category, price, benefits, features')
        .in('id', productIds);
      
      products = productsData || [];
    }

    // Buscar perfil da empresa
    const { data: company } = await supabase
      .from('company_profile')
      .select('company_name, business_segment')
      .limit(1)
      .single();

    // Montar contexto para IA
    const successCasesCount = solution.success_cases?.length || 0;
    const productsNames = products.map(p => p.name).join(', ');

    // Formatação correta das métricas (mostrar valores legíveis)
    const metricsFormatted = solution.pain_metrics 
      ? Object.entries(solution.pain_metrics)
          .map(([key, value]) => `  • ${value}`)
          .join('\n')
      : 'Nenhuma métrica específica';

    const aiPrompt = `Você é um especialista em marketing odontológico e vendas B2B no Brasil.

CONTEXTO DA SOLUÇÃO SPIN:
- Empresa: ${company?.company_name || 'Clínica odontológica'}
- Título da Solução: ${solution.title}
- Tipo de Dor SPIN: ${solution.pain_type}
- Descrição da Dor: ${solution.pain_description || 'Não informada'}
- Pitch de Vendas: ${solution.sales_pitch || 'Não informado'}
- Produtos Incluídos: ${productsNames || 'Nenhum produto selecionado'}
- Casos de Sucesso Documentados: ${successCasesCount}

MÉTRICAS DE IMPACTO DA SOLUÇÃO:
${metricsFormatted}

PRODUTOS DETALHADOS:
${products.map((p, i) => `
${i + 1}. ${p.name}
   - Categoria: ${p.category || 'N/A'}
   - Descrição: ${p.description || 'N/A'}
   - Preço: ${p.price ? `R$ ${p.price}` : 'N/A'}
   - Benefícios principais: ${p.benefits ? JSON.stringify(p.benefits).substring(0, 200) : 'N/A'}
`).join('\n')}

TAREFA:
Gere exatamente 5 perguntas frequentes (FAQs) altamente relevantes sobre esta solução SPIN para dentistas e gestores de clínicas odontológicas.

CRITÉRIOS OBRIGATÓRIOS:
1. Perguntas devem abordar dúvidas REAIS que dentistas teriam sobre esta solução específica
2. Respostas devem ser claras, objetivas (2-3 frases, máximo 150 palavras)
3. Integrar naturalmente os produtos mencionados quando relevante
4. Focar em benefícios práticos, ROI e resultados mensuráveis
5. Tom profissional mas acessível (evitar jargões excessivos)
6. Usar dados das métricas quando disponíveis de forma NATURAL e CONTEXTUALIZADA
7. Referenciar os casos de sucesso se aplicável
8. NUNCA mencionar variáveis técnicas (lab_time, digital_time, patient_loss, etc.)
9. SEMPRE usar os valores reais das métricas em linguagem natural

TIPOS DE PERGUNTAS RECOMENDADAS:
- Como funciona a implementação desta solução?
- Qual o retorno sobre investimento esperado?
- Quais clínicas/profissionais se beneficiam mais?
- Quanto tempo leva para ver resultados?
- Qual suporte/treinamento é oferecido?

EXEMPLOS DE COMO USAR AS MÉTRICAS:
❌ ERRADO: "reduz lab_time e digital_time"
✅ CORRETO: "reduz o tempo de produção de 15 dias para apenas 24 horas"

❌ ERRADO: "minimiza patient_loss"
✅ CORRETO: "evita a perda de 50% dos pacientes que desistem durante a espera"

❌ ERRADO: "economiza revenue_loss"
✅ CORRETO: "recupera até R$ 15.000 por mês em receita que seria perdida"

FORMATO DE SAÍDA (APENAS JSON, SEM TEXTO ADICIONAL):
[
  {
    "question": "Pergunta clara e direta?",
    "answer": "Resposta objetiva e profissional."
  }
]

IMPORTANTE: Retorne APENAS o array JSON, sem markdown, sem explicações adicionais.`;

    console.log('🤖 Chamando Lovable AI para gerar FAQs...');

    // Chamar Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro na API Lovable:', {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        body: errorText.substring(0, 500)
      });
      throw new Error(`Erro ao chamar Lovable AI: ${aiResponse.status} - ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    console.log('📥 Resposta completa da API:', JSON.stringify(aiData, null, 2).substring(0, 500));

    if (!aiData.choices || !Array.isArray(aiData.choices) || aiData.choices.length === 0) {
      console.error('❌ Resposta da API sem choices:', aiData);
      throw new Error('Resposta da API inválida: sem choices disponíveis');
    }

    let aiContent = aiData.choices[0]?.message?.content || '';
    if (!aiContent) {
      console.error('❌ Resposta da API sem content:', aiData.choices[0]);
      throw new Error('Resposta da API inválida: sem conteúdo gerado');
    }

    console.log('🤖 Resposta da IA:', aiContent.substring(0, 300));

    // Limpar markdown se presente
    aiContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    let generatedFaqs: SpinFAQ[];
    try {
      generatedFaqs = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', aiContent);
      throw new Error('IA retornou formato inválido');
    }

    // Validar estrutura
    if (!Array.isArray(generatedFaqs) || generatedFaqs.length !== 5) {
      throw new Error(`Esperado 5 FAQs, recebido ${generatedFaqs?.length || 0}`);
    }

    for (const faq of generatedFaqs) {
      if (!faq.question || !faq.answer) {
        throw new Error('FAQ inválida: faltam campos obrigatórios');
      }
      if (faq.question.length < 10) {
        throw new Error('Pergunta muito curta');
      }
      if (faq.answer.length < 20) {
        throw new Error('Resposta muito curta');
      }
    }

    console.log('✅ FAQs validadas:', generatedFaqs.length);

    // Salvar FAQs na solução
    const { error: updateError } = await supabase
      .from('spin_selling_solutions')
      .update({ faq: generatedFaqs })
      .eq('id', solutionId);

    if (updateError) {
      console.error('❌ Erro ao salvar FAQs:', updateError);
      throw new Error('Erro ao salvar FAQs no banco de dados');
    }

    console.log('✅ FAQs salvas com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        faqs: generatedFaqs,
        message: '5 FAQs geradas e salvas com sucesso!'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao gerar FAQs'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});