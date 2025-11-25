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
  spinNarrative: string; // Nova narrativa contextual SPIN
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
  company: any,
  customText: Record<string, string> = {} // ✅ Novo parâmetro para textos customizados
): Promise<AIGeneratedContent> {
  
  // Importar Super-Prompt
  const { SPIN_SYSTEM_PROMPT } = await import('../_shared/spin-system-prompt.ts');

  const productsNames = products.map(p => p.name).join(', ');
  
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
• Tom: aspiracional mas realista
• Complementar o título fixo de forma natural
• Focar em transformação e benefícios práticos, não em números
• Exemplo: "Com ${productsNames}, clínicas odontológicas transformam seu fluxo de trabalho, conquistam autonomia operacional e se tornam referência em tecnologia na região"

┌─────────────────────────────────────────────────────────┐
│ 2. SEÇÃO DE RESULTADOS (Título + Subtítulo Persuasivo) │
└─────────────────────────────────────────────────────────┘

🎯 OBJETIVO:
Gerar um TÍTULO curto (3-5 palavras) e um SUBTÍTULO EXPANDIDO de 80-120 palavras usando EXCLUSIVAMENTE a Jornada SPIN (Desejo → Dor → Resultado).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ESTRUTURA NARRATIVA OBRIGATÓRIA (JORNADA SPIN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**FASE 1: DESEJO (15-20 palavras)**
→ Iniciar com "Imagine..." pintando o cenário ideal
→ Focar no estado emocional desejado (controle, previsibilidade, reconhecimento)
→ Usar verbos sensoriais (sentir, visualizar, controlar)

Exemplo:
"Imagine dominar cada etapa do fluxo de trabalho, entregar soluções completas no mesmo dia e ver seus clientes impressionados com a velocidade e qualidade da sua operação."

**FASE 2: DOR EXPANDIDA (40-60 palavras) ⚠️ SEÇÃO CRÍTICA**
→ Dedicar 50-70% do subtítulo para explorar PROFUNDAMENTE as dores
→ Usar a técnica de "amplificação de dor" em 3 camadas:

**Camada 1 - Dor Operacional (o que acontece no dia a dia):**
- Mencionar OBRIGATORIAMENTE o "${solution.pain_type}"
- Descrever situações concretas e frustrantes
- Usar linguagem visceral ("ainda dependem", "sofrem com", "perdem o controle")

**Camada 2 - Dor Financeira (o que está perdendo):**
- Mencionar oportunidades desperdiçadas
- Citar pacientes perdidos ou insatisfeitos
- Falar de custos ocultos (retrabalho, tempo, estresse)

**Camada 3 - Dor Emocional (como isso faz sentir):**
- Frustração profissional
- Sensação de estar "ficando para trás"
- Ansiedade com concorrência tecnológica
- Medo de perder relevância no mercado

Estrutura sugerida:
"Mas a realidade de muitos profissionais ainda é [DOR OPERACIONAL específica relacionada a ${solution.pain_type}]. Isso significa [DOR FINANCEIRA: perda de pacientes/receita]. Pior ainda: [DOR EMOCIONAL: frustração/ansiedade]. Enquanto concorrentes já [CONTRASTE: o que outros já fazem], sua clínica [CONSEQUÊNCIA: fica vulnerável]."

Exemplo expandido:
"Mas a realidade de muitos profissionais ainda é [descrever solution.pain_type aqui], aguardar dias por tarefas que deveriam ser rápidas e lidar com retrabalhos que drenam tempo e recursos. Isso significa perder oportunidades enquanto concorrentes avançam, aceitar margens reduzidas impostas por terceiros e ver demandas urgentes escaparem. Pior ainda: sentir a frustração de não ter controle sobre prazos e qualidade, enquanto a concorrência tecnológica já oferece [vantagem competitiva] e domina o mercado premium."

**FASE 3: RESULTADO TRANSFORMADOR (20-30 palavras)**
→ Começar com "Com [produtos específicos]..."
→ Citar OBRIGATORIAMENTE: ${productsNames}
→ Focar em transformação QUALITATIVA (nunca números)
→ Usar linguagem de "antes vs. depois" implícita
→ Finalizar com status/reconhecimento alcançado

Exemplo:
"Com [Produto A] e [Produto B], profissionais que adotam essa solução eliminam [dor principal], recuperam controle total sobre [aspecto crítico] e se tornam referência regional em [área de especialização] de alto desempenho."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ REGRAS CRÍTICAS PARA O SUBTÍTULO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**TAMANHO**: 80-120 palavras (distribuição: 15-20 Desejo + 40-60 Dor + 20-30 Resultado)

**ELEMENTOS OBRIGATÓRIOS**:
✅ Mencionar explicitamente o tipo de dor: "${solution.pain_type}"
✅ Citar TODOS os produtos por nome: ${productsNames}
✅ Usar linguagem e frases do PITCH DE VENDAS
✅ Incluir pelo menos 3 camadas de dor (operacional + financeira + emocional)
✅ Criar contraste com concorrentes que já evoluíram
✅ Finalizar com status/reconhecimento alcançado

**ELEMENTOS PROIBIDOS**:
❌ Mencionar números, percentuais, minutos, valores monetários
❌ Usar a palavra "métricas"
❌ Ser genérico ("resultados incríveis", "melhorias significativas")
❌ Dores superficiais ("alguns desafios", "pequenos atrasos")
❌ Listar benefícios separados (criar narrativa fluida)

**TOM E ESTILO**:
• Usar "você", "sua clínica", "imagine"
• Tom empático mas direto (sem dramatizar excessivamente)
• Linguagem visceral para dores ("ainda dependem", "perdem o controle")
• Linguagem aspiracional para resultado ("eliminam", "se tornam referência")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ATENÇÃO CRÍTICA - NÃO COPIAR EXEMPLOS LITERALMENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Os exemplos abaixo são APENAS ilustrativos da **estrutura narrativa**.

❌ NÃO copie trechos literalmente
❌ NÃO use produtos mencionados nos exemplos se não estiverem em ${productsNames}
❌ NÃO use termos genéricos como "clínicas parceiras", "profissionais da área"

✅ ADAPTE ao contexto real dos produtos fornecidos
✅ USE os nomes reais dos produtos de ${productsNames}
✅ SUBSTITUA placeholders [entre colchetes] por dados reais
✅ MANTENHA a estrutura SPIN, mas com vocabulário específico da solução

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 EXEMPLO COMPLETO (MODELO EXATO A SEGUIR)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Subtítulo gerado (105 palavras):**

"Imagine dominar cada etapa do [processo crítico da solução], entregar [resultados esperados] no mesmo dia e ver seus clientes impressionados com a velocidade e qualidade do seu trabalho. Mas a realidade de muitos profissionais ainda é [descrever solution.pain_type aqui], aguardar dias por tarefas que deveriam ser rápidas e lidar com retrabalhos que drenam tempo e recursos. Isso significa perder oportunidades enquanto concorrentes avançam, aceitar margens reduzidas impostas por terceiros e sentir a frustração de não ter controle sobre prazos nem qualidade. Enquanto a concorrência já domina o mercado com [vantagem competitiva], sua operação fica vulnerável. Com [Produto A] e [Produto B], profissionais que adotam essa solução eliminam [dor principal], recuperam controle total sobre [aspecto crítico] e se tornam referência em [especialização] de alto desempenho."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TÍTULO DA SEÇÃO (3-5 palavras)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Focar em TRANSFORMAÇÃO EMOCIONAL, não em "métricas" ou "resultados"
• Usar linguagem de status/reconhecimento alcançado
• Exemplos aprovados:
  - "Transformação Real em Clínicas"
  - "De Dependente a Referência"
  - "Controle Total, Resultados Reais"
  - "Excelência sem Dependências"
  - "Autonomia que Transforma"

• Evitar: "Métricas de Sucesso", "Números Impressionantes", "Resultados Comprovados"

┌─────────────────────────────────────────────────────────┐
│ 3. NARRATIVA SPIN CONTEXTUAL (Antes dos Cards)         │
└─────────────────────────────────────────────────────────┘

📋 OBJETIVO: Criar um parágrafo narrativo de 150-200 palavras que conecta a jornada SPIN aos benefícios tangíveis da solução, posicionando-se ANTES dos cards numéricos.

📊 DADOS DISPONÍVEIS:
${solution.real_quotes?.length > 0 ? `
Depoimentos reais de clientes:
${solution.real_quotes.map((q: any, i: number) => `
Cliente ${i + 1}:
- Desejo inicial: "${q.desire}"
- Dor enfrentada: "${q.pain}"
- Resultado alcançado: "${q.expected_result}"
`).join('\n')}
` : 'Nenhum depoimento real disponível'}

🎯 ESTRUTURA OBRIGATÓRIA (em um único parágrafo fluido):

1️⃣ **DESEJO** (2-3 frases): Comece descrevendo o desejo comum dos profissionais, usando insights dos depoimentos reais. Fale sobre a transformação que buscam.

2️⃣ **DOR** (2-3 frases): Transição natural para as dores atuais, citando problemas específicos mencionados nos depoimentos. Use conectivos como "Porém", "Mas a realidade", "Contudo".

3️⃣ **RESULTADO** (3-4 frases): Apresente como os produtos resolvem essas dores, focando em benefícios tangíveis e transformação prática. Conecte a solução aos resultados esperados mencionados nos depoimentos.

⚠️ REGRAS CRÍTICAS:
- ✅ Foque em benefícios práticos e transformação
- ✅ Mencione os produtos: ${productsNames}
- ✅ Mantenha tom consultivo e baseado em evidências
- ✅ Use dados reais dos depoimentos quando disponíveis
- ❌ NÃO use bullet points ou listas
- ❌ NÃO repita o subtítulo do hero
- ❌ NÃO use chavões ("revolucionário", "inovador", "único no mercado")

📝 EXEMPLO DE ESTRUTURA (NÃO COPIAR LITERALMENTE):
"Profissionais que buscam [desejo dos depoimentos] frequentemente enfrentam [dor específica dos depoimentos], resultando em [consequência]. Com [Produto A] e [Produto B], clínicas conseguem [resultado tangível], eliminando [problema específico] e conquistando [benefício prático]. Isso significa [transformação alcançada]."

┌─────────────────────────────────────────────────────────┐
│ 4. CTA (Call-to-Action)                                 │
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

⚠️ IMPORTANTE: NÃO GERAR DEPOIMENTOS. Os depoimentos reais serão buscados do banco de dados.

═══════════════════════════════════════════════════════════
⚙️ REGRAS DE OURO
═══════════════════════════════════════════════════════════

✅ SEMPRE usar a linguagem do PITCH DE VENDAS
✅ SEMPRE focar em benefícios PRÁTICOS e transformação
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
  "spinNarrative": "Narrativa SPIN contextual de 150-200 palavras integrando depoimentos e métricas",
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
        { role: 'system', content: SPIN_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
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

  // Extrair JSON da resposta (robusto)
  let jsonText = content.trim();

  // 1. Tentar markdown code block
  if (content.includes('```json')) {
    const parts = content.split('```json');
    if (parts[1]) {
      jsonText = parts[1].split('```')[0].trim();
    }
  } else if (content.includes('```')) {
    const parts = content.split('```');
    if (parts[1]) {
      jsonText = parts[1].split('```')[0].trim();
    }
  }

  // 2. Fallback: procurar primeiro objeto JSON válido
  if (!jsonText.startsWith('{')) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      jsonText = match[0];
    }
  }

  console.log('🔍 JSON extraído:', jsonText.substring(0, 200));

  let generatedContent: AIGeneratedContent;
  try {
    generatedContent = JSON.parse(jsonText);
  } catch (parseError: any) {
    console.error('❌ Erro ao fazer parse do JSON:', parseError.message);
    console.error('📄 Conteúdo completo da IA:', content);
    throw new Error(`JSON inválido da IA: ${parseError.message}. Conteúdo: ${content.substring(0, 500)}`);
  }

  // Validação básica
  if (!generatedContent.hero || !generatedContent.metrics || !generatedContent.cta) {
    throw new Error('Conteúdo gerado incompleto');
  }

  // Validar spinNarrative
  if (!generatedContent.spinNarrative || generatedContent.spinNarrative.trim().length < 100) {
    console.warn('⚠️ spinNarrative muito curto ou ausente, gerando fallback');
    generatedContent.spinNarrative = `Profissionais que adotam ${productsNames} transformam ${solution.pain_type} em vantagem competitiva, alcançando resultados mensuráveis em tempo recorde.`;
  }

  console.log('🔄 [AI] Merge com customText:', Object.keys(customText));

  // ✅ MERGE INTELIGENTE: Priorizar textos customizados do usuário
  return {
    hero: {
      subtitle: customText.hero_subtitle || generatedContent.hero.subtitle
    },
    spinNarrative: customText.spin_narrative || generatedContent.spinNarrative,
    metrics: {
      title: customText.metrics_title || generatedContent.metrics.title,
      subtitle: customText.metrics_subtitle || generatedContent.metrics.subtitle
    },
    cta: {
      text: customText.cta_text || generatedContent.cta.text,
      buttonText: customText.cta_button_text || generatedContent.cta.buttonText
    },
    testimonials: [] // ✅ Testimonials não são mais gerados por IA, virão do banco
  };
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
    const { data: solutionRecord, error: solutionError } = await supabaseClient
      .from('spin_selling_solutions')
      .select(`
        *,
        selected_video_url,
        selected_video_title
      `)
      .eq('id', solutionId)
      .single();

    if (solutionError || !solutionRecord) {
      throw new Error('Solução SPIN não encontrada');
    }

    let solution = solutionRecord; // ✅ Agora pode reatribuir
    
    console.log('✅ Checkpoint 1: Solução carregada', { 
      title: solution.title, 
      hasFaq: !!solution.faq?.length,
      customTextKeys: Object.keys(solution.landing_page_custom_text || {})
    });

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

    // ✅ BUSCAR DEPOIMENTOS REAIS DO BANCO DE DADOS
    console.log('📋 Buscando depoimentos reais (video_testimonials)...');
    const { data: videoTestimonials } = await supabaseClient
      .from('video_testimonials')
      .select('*')
      .eq('approved', true)
      .order('display_order', { ascending: true });

    // Formatar depoimentos no formato esperado pelo HTML generator
    const realTestimonials = (videoTestimonials || []).map((testimonial: any) => ({
      quote: testimonial.testimonial_text,
      clientName: testimonial.client_name,
      clientPhoto: testimonial.photo_url || null,
      location: testimonial.location || null,
      profession: testimonial.profession || null,
      specialty: testimonial.specialty || null
    }));

    console.log('✅ Depoimentos reais encontrados:', realTestimonials.length);

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
          solution = updatedSolution; // ✅ Agora funciona com let!
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

    // ✅ GERAR TODOS OS TEXTOS COM IA (com merge de customText)
    const aiGeneratedContent = await generateAllLandingPageContent(
      LOVABLE_API_KEY,
      solution,
      products || [],
      company,
      solution.landing_page_custom_text || {} // ✅ Passar textos customizados
    );

    console.log('✅ Checkpoint 2: Textos gerados com sucesso:', {
      heroSubtitle: aiGeneratedContent.hero.subtitle.substring(0, 50) + '...',
      metricsTitle: aiGeneratedContent.metrics.title,
      ctaText: aiGeneratedContent.cta.text.substring(0, 50) + '...',
      realTestimonialsCount: realTestimonials.length
    });

    console.log('🔍 [AI] Campos customizados preservados:', 
      Object.keys(solution.landing_page_custom_text || {})
        .filter(key => solution.landing_page_custom_text[key])
    );

    // ✅ MERGE: Adicionar depoimentos reais ao aiContent
    const finalAiContent = {
      ...aiGeneratedContent,
      testimonials: realTestimonials
    };

    // ✅ MERGE CORRETO: Passar separadamente IA e customText
    // O template HTML faz a priorização interna (customText > aiContent > defaults)
    const html = generateLandingPageHTML(
      solution, 
      products || [], 
      company, 
      finalAiContent, // ✅ Passar AI + depoimentos reais
      false // ✅ preview = false (produção - com tracking)
    );

    console.log('✅ Checkpoint 4: HTML gerado:', html.length, 'caracteres');

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
