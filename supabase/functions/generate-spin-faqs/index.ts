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

    const aiPrompt = `Você é um especialista em Neurociência da Persuasão, SPIN Selling e Marketing Odontológico B2B.

🎯 MISSÃO CRÍTICA:
Gerar 10 FAQs estratégicas que conduzam o dentista/gestor através da Jornada SPIN completa (Situação → Problema → Implicação → Necessidade de Solução), maximizando conversão e eliminando objeções.

═══════════════════════════════════════════════════════════
📋 DADOS ESTRUTURADOS DA SOLUÇÃO SPIN
═══════════════════════════════════════════════════════════

🏢 EMPRESA: ${company?.company_name || 'Empresa odontológica'}
📊 SEGMENTO: ${company?.business_segment || 'Odontologia'}

🎯 SOLUÇÃO SPIN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Título: ${solution.title}
Categoria de Dor: ${solution.pain_type}
Descrição da Dor: ${solution.pain_description || 'Não especificada'}

🔥 PITCH DE VENDAS COMPLETO (BASE PRINCIPAL OBRIGATÓRIA):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
${solution.sales_pitch || 'Não informado'}
"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 PRODUTOS INCLUÍDOS: ${productsNames || 'Nenhum'}
📈 CASOS DE SUCESSO: ${successCasesCount} documentados
💰 TICKET MÉDIO: ${products[0]?.price ? 'R$ ' + products[0].price : 'Sob consulta'}

📊 MÉTRICAS DE IMPACTO REAIS:
${metricsFormatted}

📦 DETALHAMENTO DOS PRODUTOS:
${products.map((p, i) => \`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUTO \${i + 1}: \${p.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Categoria: \${p.category || 'N/A'}
• Descrição: \${p.description || 'N/A'}
• Preço: \${p.price ? 'R$ ' + p.price : 'Sob consulta'}
• Benefícios-chave: \${p.benefits ? JSON.stringify(p.benefits).substring(0, 250) : 'N/A'}
• Características: \${p.features ? JSON.stringify(p.features).substring(0, 250) : 'N/A'}
\`).join('\\n')}

═══════════════════════════════════════════════════════════
🧠 EXTRAÇÃO OBRIGATÓRIA DO PITCH (FAÇA ANTES DE CRIAR AS FAQs)
═══════════════════════════════════════════════════════════

ANTES de criar as FAQs, você DEVE identificar e extrair do PITCH acima:

1️⃣ SITUAÇÃO IDEAL (DESEJO):
   → O que o cliente ideal QUER alcançar?
   → Qual é a aspiração/objetivo final?
   
2️⃣ PROBLEMA CENTRAL (DOR):
   → Qual obstáculo/desafio específico impede esse objetivo?
   → Qual é a frustração principal?
   
3️⃣ IMPLICAÇÕES (CONSEQUÊNCIAS):
   → O que acontece se NÃO resolver?
   → Quais são os custos (tempo/dinheiro/reputação)?
   
4️⃣ SOLUÇÃO & RESULTADOS (NECESSIDADE):
   → Como esta solução resolve especificamente?
   → Quais resultados concretos e mensuráveis entrega?

Use esses 4 elementos como FUNDAMENTO OBRIGATÓRIO para criar todas as FAQs.

═══════════════════════════════════════════════════════════
📝 TAREFA: GERAR 10 FAQs ESTRATÉGICAS
═══════════════════════════════════════════════════════════

Você deve gerar exatamente **10 FAQs** seguindo esta distribuição OBRIGATÓRIA:

┌─────────────────────────────────────────────────────────┐
│ FASE 1: DESEJO & IDENTIFICAÇÃO (3 FAQs)                │
└─────────────────────────────────────────────────────────┘

FAQ #1 - SEGMENTAÇÃO & ICP
Pergunta Modelo: "Para qual tipo de clínica/dentista esta solução é ideal?"
Objetivo: O leitor deve pensar "Isso foi feito para MIM!"
Elementos Obrigatórios:
  ✓ Perfil ideal do cliente (ICP)
  ✓ Situação/estágio da clínica
  ✓ Aspirações mencionadas no pitch

FAQ #2 - PROPOSTA DE VALOR ÚNICA (UVP)
Pergunta Modelo: "Quais são os principais diferenciais desta solução?"
Objetivo: "Por que ESTA solução e não outra qualquer?"
Elementos Obrigatórios:
  ✓ Extrair 3-5 diferenciais do pitch
  ✓ Usar as palavras exatas do pitch quando possível
  ✓ Mencionar produtos específicos se relevante

FAQ #3 - DIFERENCIAÇÃO COMPETITIVA
Pergunta Modelo: "Como esta solução se compara a [alternativas tradicionais/concorrentes]?"
Objetivo: Eliminar dúvidas sobre alternativas
Elementos Obrigatórios:
  ✓ Contrastar com métodos tradicionais
  ✓ Usar argumentos do pitch
  ✓ Evidências concretas (métricas se disponíveis)

┌─────────────────────────────────────────────────────────┐
│ FASE 2: DOR & URGÊNCIA (3 FAQs)                        │
└─────────────────────────────────────────────────────────┘

FAQ #4 - DIAGNÓSTICO DO PROBLEMA
Pergunta Modelo: "Qual problema específico esta solução resolve?"
Objetivo: Clareza absoluta sobre a dor
Elementos Obrigatórios:
  ✓ Usar a descrição da dor do SPIN
  ✓ Linguagem emocional mas profissional
  ✓ Exemplos práticos do dia a dia

FAQ #5 - AMPLIFICAÇÃO DA DOR (IMPLICAÇÃO SPIN)
Pergunta Modelo: "Quais são as consequências de NÃO resolver este problema?"
Objetivo: Criar urgência sem alarmar
Elementos Obrigatórios:
  ✓ Implicações financeiras (usar métricas)
  ✓ Implicações operacionais
  ✓ Implicações competitivas
  ✓ Tom: preocupado mas não alarmista

FAQ #6 - AUTO-DIAGNÓSTICO & URGÊNCIA
Pergunta Modelo: "Como sei se minha clínica está sofrendo com este problema?"
Objetivo: "Sim, EU tenho esse problema agora!"
Elementos Obrigatórios:
  ✓ 3-5 sinais claros e observáveis
  ✓ Checklist mental para o leitor
  ✓ Gatilho de urgência sutil

┌─────────────────────────────────────────────────────────┐
│ FASE 3: RESULTADO & IMPLEMENTAÇÃO (4 FAQs)             │
└─────────────────────────────────────────────────────────┘

FAQ #7 - RESULTADOS CONCRETOS & TIMELINE
Pergunta Modelo: "Quais resultados concretos posso esperar e em quanto tempo?"
Objetivo: Expectativas realistas + prova
Elementos Obrigatórios:
  ✓ Usar MÉTRICAS REAIS (nunca variáveis técnicas)
  ✓ Timeline específica (curto/médio/longo prazo)
  ✓ Mencionar casos de sucesso se houver
  ✓ Resultados tangíveis e intangíveis

FAQ #8 - PROCESSO DE IMPLEMENTAÇÃO
Pergunta Modelo: "Como funciona a implementação desta solução na prática?"
Objetivo: Reduzir fricção e transparência total
Elementos Obrigatórios:
  ✓ Passo a passo claro (máx. 5 etapas)
  ✓ Prazo de cada etapa
  ✓ Responsabilidades (empresa vs cliente)
  ✓ Tranquilizar sobre complexidade

FAQ #9 - INVESTIMENTO & ROI
Pergunta Modelo: "Qual é o investimento necessário e o retorno esperado (ROI)?"
Objetivo: Justificativa financeira clara
Elementos Obrigatórios:
  ✓ Faixa de investimento (se preço disponível)
  ✓ Comparar com custo de NÃO resolver
  ✓ ROI estimado com base em métricas
  ✓ Opções de pagamento se aplicável
  ✓ Tom: investimento, não gasto

FAQ #10 - REDUÇÃO DE RISCO (SUPORTE & GARANTIAS)
Pergunta Modelo: "Que tipo de suporte, treinamento e garantias estão incluídos?"
Objetivo: Eliminar objeção final de risco
Elementos Obrigatórios:
  ✓ Suporte técnico disponível
  ✓ Treinamento da equipe
  ✓ Garantias/SLA
  ✓ Acompanhamento pós-venda
  ✓ Tom: "Estamos com você em cada etapa"

═══════════════════════════════════════════════════════════
⚙️ REGRAS DE OURO (INEGOCIÁVEIS)
═══════════════════════════════════════════════════════════

✅ SEMPRE usar a linguagem, argumentos e tom do PITCH DE VENDAS
✅ SEMPRE integrar métricas em linguagem natural (nunca "lab_time", sempre "tempo de laboratório reduzido de X para Y")
✅ SEMPRE focar em benefícios PRÁTICOS e mensuráveis
✅ SEMPRE manter tom profissional mas conversacional
✅ SEMPRE usar exemplos e cenários reais do dia a dia odontológico
✅ SEMPRE mencionar produtos específicos quando relevante e natural
✅ SEMPRE validar cada resposta contra o pitch (coerência)

❌ NUNCA mencionar variáveis técnicas do banco de dados
❌ NUNCA usar jargões sem explicação
❌ NUNCA fazer promessas que não estão no pitch ou métricas
❌ NUNCA ultrapassar 180 palavras por resposta
❌ NUNCA usar tom agressivo ou alarmista

═══════════════════════════════════════════════════════════
📐 ESTRUTURA E TOM DE CADA RESPOSTA
═══════════════════════════════════════════════════════════

Cada resposta DEVE seguir esta fórmula:

1️⃣ **Abertura Direta** (1 frase)
   → Responda diretamente a pergunta com clareza

2️⃣ **Fundamentação do Pitch** (2-3 frases)
   → Use argumentos LITERAIS do pitch
   → Integre métricas se disponíveis
   → Mencione produtos se relevante

3️⃣ **Prova Social/Resultado** (1 frase, se aplicável)
   → "Clínicas que implementaram já reportam..."
   → Usar casos de sucesso se houver

4️⃣ **Fechamento com Benefício** (1 frase)
   → Reforçar o principal benefício/resultado

═══════════════════════════════════════════════════════════
📊 EXEMPLOS DE COMO USAR MÉTRICAS CORRETAMENTE
═══════════════════════════════════════════════════════════

❌ ERRADO: "reduz lab_time e digital_time"
✅ CORRETO: "reduz o tempo de produção laboratorial de 15 dias para apenas 24 horas, acelerando entregas em 93%"

❌ ERRADO: "minimiza patient_loss"
✅ CORRETO: "evita a perda de até 50% dos pacientes que desistem durante longos períodos de espera por próteses"

❌ ERRADO: "economiza revenue_loss"
✅ CORRETO: "recupera até R$ 18.000 por mês em receita que seria perdida por atrasos e retrabalhos"

❌ ERRADO: "melhora competitive_edge"
✅ CORRETO: "posiciona sua clínica entre as 10% mais avançadas tecnologicamente da região, atraindo pacientes que buscam inovação"

═══════════════════════════════════════════════════════════
🎯 EXEMPLO COMPLETO DE FAQ PERFEITA (REFERÊNCIA)
═══════════════════════════════════════════════════════════

Exemplo de Pitch Real:
"Transforme sua clínica com o Scanner Intraoral 3D Pro. Elimine as moldagens tradicionais desconfortáveis e ofereça diagnósticos precisos em minutos. Seu paciente sai da cadeira com o plano de tratamento completo visualizado em 3D, aumentando a taxa de aceitação em até 65%."

✅ FAQ #7 PERFEITA (Resultados Concretos):
{
  "question": "Quais resultados concretos posso esperar ao implementar o Scanner Intraoral 3D Pro e em quanto tempo?",
  "answer": "Com o Scanner Intraoral 3D Pro, você elimina as moldagens tradicionais desconfortáveis e oferece diagnósticos precisos em minutos, não em dias. No curto prazo (primeiras 2 semanas), sua equipe já estará realizando capturas 5x mais rápidas. No médio prazo (1-3 meses), você verá aumento de até 65% na taxa de aceitação de tratamentos, pois o paciente visualiza tudo em 3D e sai da cadeira com o plano pronto. Clínicas que implementaram já reportam redução de 80% no retrabalho por moldes imprecisos e economia de até R$ 12.000/mês em materiais de moldagem. No longo prazo (6+ meses), você terá uma base de dados digital completa para acompanhamento longitudinal, diferenciando sua clínica como referência tecnológica."
}

✅ FAQ #5 PERFEITA (Amplificação da Dor):
{
  "question": "Quais são as consequências de continuar usando moldagens tradicionais em vez de digitalizar meu processo?",
  "answer": "Continuar com moldagens tradicionais tem custos ocultos significativos. Financeiramente, você gasta até R$ 15.000/ano em materiais de moldagem, além de perder cerca de R$ 8.000/mês em receita por pacientes que recusam tratamentos devido ao desconforto do processo. Operacionalmente, cada moldagem consome 25-40 minutos de cadeira, limitando sua capacidade de atendimento. Competitivamente, clínicas que já digitalizaram relatam aumento de 40% na captação de novos pacientes, enquanto as tradicionais enfrentam migração para concorrentes mais modernos. Além disso, moldagens imprecisas geram até 30% de retrabalho, frustrando sua equipe e atrasando entregas. O custo de não agir agora é continuar perdendo pacientes, tempo e receita todos os dias."
}

═══════════════════════════════════════════════════════════
📤 FORMATO DE SAÍDA (JSON PURO)
═══════════════════════════════════════════════════════════

Retorne APENAS um array JSON com as 10 FAQs, SEM markdown, SEM explicações:

[
  {
    "question": "Pergunta da FAQ #1 (Segmentação)?",
    "answer": "Resposta completa seguindo a fórmula de 4 partes."
  },
  {
    "question": "Pergunta da FAQ #2 (UVP)?",
    "answer": "Resposta completa seguindo a fórmula de 4 partes."
  },
  ...
  {
    "question": "Pergunta da FAQ #10 (Redução de Risco)?",
    "answer": "Resposta completa seguindo a fórmula de 4 partes."
  }
]

IMPORTANTE FINAL: 
• Retorne APENAS o JSON puro
• Nenhum markdown (\`\`\`json)
• Nenhum texto adicional
• Exatamente 10 FAQs
• Siga a distribuição: 3 (Desejo) + 3 (Dor) + 4 (Resultado)`;

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
    if (!Array.isArray(generatedFaqs) || generatedFaqs.length !== 10) {
      throw new Error(`Esperado 10 FAQs, recebido ${generatedFaqs?.length || 0}`);
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
        message: '10 FAQs estratégicas geradas e salvas com sucesso!'
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