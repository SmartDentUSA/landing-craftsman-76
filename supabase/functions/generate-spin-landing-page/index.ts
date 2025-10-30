import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateLandingPageHTML } from "./generateHTML.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════
// 🤖 GERADOR DE CONTEÚDO AI PARA LANDING PAGE
// ═══════════════════════════════════════════════════════════

interface AIGeneratedContent {
  hero: {
    subtitle: string;
  };
  metrics: {
    title: string;
    subtitle: string;
  };
  cta: {
    text: string;
    buttonText: string;
  };
  testimonials: Array<{
    quote: string;
    clientName: string;
  }>;
}

async function generateAllLandingPageContent(
  lovableApiKey: string,
  solution: any,
  products: any[],
  company: any
): Promise<AIGeneratedContent> {
  
  const productsNames = products.map(p => p.name).join(', ');
  const metricsFormatted = Object.entries(solution.pain_metrics || {})
    .map(([key, value]) => `• ${key.replace(/_/g, ' ')}: ${value}`)
    .join('\n');
  
  const prompt = `Você é um copywriter especialista em neuromarketing e SPIN Selling para odontologia B2B.

🎯 MISSÃO: Gerar TODOS os textos da landing page seguindo a Jornada SPIN (Situação → Problema → Implicação → Necessidade).

═══════════════════════════════════════════════════════════
📋 DADOS DA SOLUÇÃO SPIN
═══════════════════════════════════════════════════════════

🏢 EMPRESA: ${company?.company_name || 'Empresa odontológica'}
🎯 SOLUÇÃO: ${solution.title}
📦 PRODUTOS: ${productsNames}
⚠️ TIPO DE DOR: ${solution.pain_type}
📝 DESCRIÇÃO DA DOR: ${solution.pain_description || 'Não especificada'}

🔥 PITCH DE VENDAS COMPLETO (BASE PRINCIPAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${solution.sales_pitch || 'Não informado'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 MÉTRICAS DE IMPACTO REAIS:
${metricsFormatted}

🎖️ CASOS DE SUCESSO: ${solution.success_cases?.length || 0} documentados

═══════════════════════════════════════════════════════════
📝 TAREFA: GERAR 4 SEÇÕES DE TEXTO
═══════════════════════════════════════════════════════════

Gere os textos para as 4 seções principais da landing page:

┌─────────────────────────────────────────────────────────┐
│ 1. HERO SECTION (Banner Principal)                      │
└─────────────────────────────────────────────────────────┘

⚠️ IMPORTANTE: O TÍTULO JÁ ESTÁ DEFINIDO e NÃO deve ser gerado.
Título fixo: "${solution.title}"

GERAR APENAS O SUBTÍTULO (20-30 palavras):
• Expandir o benefício principal do título
• Mencionar produtos específicos: ${productsNames}
• Adicionar prova social se houver métricas
• Tom: aspiracional mas realista
• Complementar o título fixo de forma natural
• Exemplo: "Com ${productsNames}, clínicas odontológicas reduzem 93% do tempo de produção e aumentam 65% na taxa de aceitação de tratamentos"

┌─────────────────────────────────────────────────────────┐
│ 2. MÉTRICAS SECTION                                     │
└─────────────────────────────────────────────────────────┘

TÍTULO (3-5 palavras):
• Focar em RESULTADOS, não métricas
• Exemplos: "Resultados que Comprovam", "Impacto Real Mensurável", "Transformação Documentada"

SUBTÍTULO (20-30 palavras):
• Contextualizar as métricas
• Mencionar clínicas brasileiras
• Focar em benefícios tangíveis (produtividade, lucratividade, atendimento)
• Exemplo: "Dados concretos de ${solution.success_cases?.length || 'dezenas de'} clínicas brasileiras que implementaram esta solução e revolucionaram sua eficiência operacional e retorno sobre investimento"

┌─────────────────────────────────────────────────────────┐
│ 3. CTA (Call-to-Action)                                 │
└─────────────────────────────────────────────────────────┘

TEXTO PRINCIPAL (15-25 palavras):
• Usar urgência sutil sem alarmar
• Focar no próximo passo (não na venda)
• Tom: convite, não pressão
• Exemplo: "Descubra como [Benefício Principal] pode transformar sua clínica em uma referência tecnológica na sua região"

TEXTO DO BOTÃO (3-6 palavras):
• Verbo de ação específico
• Benefício claro
• Redutor de fricção
• Exemplos: "Falar com Especialista Agora", "Agendar Demonstração Gratuita", "Solicitar Orçamento Personalizado"

┌─────────────────────────────────────────────────────────┐
│ 4. DEPOIMENTOS (Melhorar Success Cases)                │
└─────────────────────────────────────────────────────────┘

Para CADA caso de sucesso existente, REESCREVER em formato narrativo SPIN:
• Situação: Como era antes?
• Problema: Qual era a dor principal?
• Implicação: O que estava perdendo?
• Resultado: Métricas concretas pós-implementação

Formato:
"[Antes]: [Descrição da dor]. [Depois]: Com [Solução], [Resultados mensuráveis]. [Impacto final]."

Exemplo:
"Antes enfrentávamos atrasos de 15 dias na entrega de próteses, perdendo pacientes para concorrentes. Com o Scanner 3D Pro e Impressora Edge Mini, reduzimos para 24 horas e aumentamos 40% na captação de novos pacientes. Hoje somos referência em tecnologia na região."

═══════════════════════════════════════════════════════════
⚙️ REGRAS DE OURO
═══════════════════════════════════════════════════════════

✅ SEMPRE usar a linguagem do PITCH DE VENDAS
✅ SEMPRE integrar métricas em linguagem natural
✅ SEMPRE focar em benefícios PRÁTICOS
✅ SEMPRE manter tom profissional mas conversacional
✅ SEMPRE usar exemplos do dia a dia odontológico

❌ NUNCA usar jargões sem explicação
❌ NUNCA fazer promessas fora do pitch
❌ NUNCA usar variáveis técnicas (lab_time → "tempo de laboratório")
❌ NUNCA ser genérico ou vago

═══════════════════════════════════════════════════════════
📤 FORMATO DE SAÍDA (JSON PURO)
═══════════════════════════════════════════════════════════

Retorne APENAS JSON puro, sem markdown:

{
  "hero": {
    "subtitle": "Subtítulo do hero (20-30 palavras)"
  },
  "metrics": {
    "title": "Título da seção de métricas (3-5 palavras)",
    "subtitle": "Subtítulo da seção de métricas (20-30 palavras)"
  },
  "cta": {
    "text": "Texto principal do CTA (15-25 palavras)",
    "buttonText": "Texto do botão (3-6 palavras)"
  },
  "testimonials": [
    {
      "quote": "Depoimento reescrito em formato SPIN narrativo",
      "clientName": "Nome do cliente (manter original)"
    }
  ]
}`;

  console.log('📤 Enviando prompt para Lovable AI...');

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
          content: prompt
        }
      ],
      temperature: 0.7
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('❌ Erro da Lovable AI:', {
      status: aiResponse.status,
      body: errorText
    });
    throw new Error(`Lovable AI error: ${aiResponse.status} - ${errorText}`);
  }

  const aiData = await aiResponse.json();
  console.log('📥 Resposta completa da API:', JSON.stringify(aiData, null, 2));

  const content = aiData.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Resposta da IA vazia');
  }

  console.log('🤖 Resposta da IA:', content.substring(0, 500));

  // Extrair JSON da resposta (pode vir com markdown)
  let jsonText = content;
  if (content.includes('```json')) {
    jsonText = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonText = content.split('```')[1].split('```')[0].trim();
  }

  const generatedContent: AIGeneratedContent = JSON.parse(jsonText);

  // Validação básica
  if (!generatedContent.hero || !generatedContent.metrics || !generatedContent.cta) {
    throw new Error('Conteúdo gerado incompleto');
  }

  console.log('✅ Conteúdo validado com sucesso!');
  return generatedContent;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solutionId } = await req.json();

    console.log('🚀 generate-spin-landing-page invoked:', {
      timestamp: new Date().toISOString(),
      solutionId
    });

    if (!solutionId) {
      throw new Error('solutionId é obrigatório');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar solução SPIN completa
    const { data: solution, error: solutionError } = await supabaseClient
      .from('spin_selling_solutions')
      .select('*')
      .eq('id', solutionId)
      .single();

    if (solutionError || !solution) {
      throw new Error('Solução SPIN não encontrada');
    }

    // Buscar produtos associados
    const { data: products, error: productsError } = await supabaseClient
      .from('products_repository')
      .select('*')
      .in('id', solution.product_ids || []);

    if (productsError) {
      throw new Error('Erro ao buscar produtos');
    }

    // Buscar perfil da empresa
    const { data: company, error: companyError } = await supabaseClient
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    if (companyError) {
      console.warn('Empresa não encontrada, usando valores padrão');
    }

    // 🔥 Mudança 4 (OPCIONAL): Gerar FAQ por IA se estiver vazia
    if (!solution.faq || solution.faq.length === 0) {
      console.log('🤖 FAQ vazia, gerando automaticamente...');
      
      const { error: faqError } = await supabaseClient.functions.invoke(
        'generate-spin-faqs',
        { body: { solutionId } }
      );
      
      if (faqError) {
        console.warn('⚠️ Erro ao gerar FAQ, continuando sem ela:', faqError);
      } else {
        // Recarregar solução com FAQ gerada
        const { data: updatedSolution } = await supabaseClient
          .from('spin_selling_solutions')
          .select('*')
          .eq('id', solutionId)
          .single();
        
        if (updatedSolution) {
          solution = updatedSolution;
          console.log('✅ FAQ gerada com sucesso:', solution.faq?.length, 'perguntas');
        }
      }
    }

    // ✅ VALIDAÇÃO: LOVABLE_API_KEY
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('🤖 Gerando textos da landing page com IA...');

    // ✅ GERAR TODOS OS TEXTOS COM IA
    const aiGeneratedContent = await generateAllLandingPageContent(
      LOVABLE_API_KEY,
      solution,
      products || [],
      company
    );

    console.log('✅ Textos gerados com sucesso:', {
      heroSubtitle: aiGeneratedContent.hero.subtitle.substring(0, 50) + '...',
      metricsTitle: aiGeneratedContent.metrics.title,
      ctaText: aiGeneratedContent.cta.text.substring(0, 50) + '...',
      testimonialsCount: aiGeneratedContent.testimonials.length
    });

    // Mesclar com customText existente (customText tem prioridade)
    const finalContent = {
      ...aiGeneratedContent,
      ...solution.landing_page_custom_text // Override manual do usuário
    };

    // Gerar HTML com conteúdo IA
    const html = generateLandingPageHTML(solution, products || [], company, finalContent);

    // Salvar no banco
    const { error: updateError } = await supabaseClient
      .from('spin_selling_solutions')
      .update({
        landing_page_html: html,
        landing_page_generated_at: new Date().toISOString()
      })
      .eq('id', solutionId);

    if (updateError) {
      throw new Error('Erro ao salvar landing page');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Landing page gerada com sucesso',
        htmlLength: html.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error: any) {
    console.error('❌ generate-spin-landing-page error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
