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
    const successCasesCount = solution.success_stories?.length || 0;
    const metricsKeys = solution.pain_metrics ? Object.keys(solution.pain_metrics) : [];
    const productsNames = products.map(p => p.name).join(', ');

    const aiPrompt = `Você é um especialista em marketing odontológico e vendas B2B no Brasil.

CONTEXTO DA SOLUÇÃO SPIN:
- Empresa: ${company?.company_name || 'Clínica odontológica'}
- Título da Solução: ${solution.title}
- Tipo de Dor SPIN: ${solution.pain_type}
- Descrição da Dor: ${solution.pain_description || 'Não informada'}
- Pitch de Vendas: ${solution.sales_pitch || 'Não informado'}
- Produtos Incluídos: ${productsNames || 'Nenhum produto selecionado'}
- Casos de Sucesso Documentados: ${successCasesCount}
- Métricas Disponíveis: ${metricsKeys.join(', ') || 'Nenhuma métrica'}

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
6. Usar dados das métricas quando disponíveis
7. Referenciar os casos de sucesso se aplicável

TIPOS DE PERGUNTAS RECOMENDADAS:
- Como funciona a implementação desta solução?
- Qual o retorno sobre investimento esperado?
- Quais clínicas/profissionais se beneficiam mais?
- Quanto tempo leva para ver resultados?
- Qual suporte/treinamento é oferecido?

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

    const aiResponse = await fetch('https://api.lovable.app/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp',
        messages: [
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro na API Lovable:', errorText);
      throw new Error(`Erro ao chamar Lovable AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let aiContent = aiData.choices?.[0]?.message?.content || '';

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