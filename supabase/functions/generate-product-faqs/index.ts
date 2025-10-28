import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('[generate-product-faqs] Iniciando geração de FAQs para:', product.name);

    // 🔍 Validação
    if (!product.name || !product.description) {
      throw new Error('Nome e descrição são obrigatórios para gerar FAQs');
    }

    // Validar quantidade mínima de dados
    const hasMinimumData = (
      product.description?.length > 20 ||
      (product.benefits && product.benefits.length > 0) ||
      (product.features && product.features.length > 0) ||
      (product.keywords && product.keywords.length > 0)
    );

    if (!hasMinimumData) {
      throw new Error('Dados insuficientes para gerar FAQs. Adicione mais informações ao produto (descrição, benefícios, recursos ou keywords).');
    }

    console.log('[generate-product-faqs] Dados disponíveis:', {
      description: product.description ? 'SIM' : 'NÃO',
      benefits: product.benefits?.length || 0,
      features: product.features?.length || 0,
      keywords: product.keywords?.length || 0,
      sales_pitch: product.sales_pitch ? 'SIM' : 'NÃO'
    });

    // 🤖 Prompt para IA com anti-alucinação e hyperlinks
    const prompt = `Você é um especialista em produtos e FAQ. Gere EXATAMENTE 10 perguntas frequentes (FAQs) sobre o produto abaixo.

**PRODUTO:**
- Nome: ${product.name}
- URL da Loja: ${product.product_url || 'N/A'}
- Descrição: ${product.description}
- Pitch de Vendas: ${product.sales_pitch || 'N/A'}
- Keywords: ${product.keywords?.join(', ') || 'N/A'}
- Benefícios: ${product.benefits?.join(', ') || 'N/A'}
- Recursos: ${product.features?.join(', ') || 'N/A'}

**ATENÇÃO - RESTRIÇÃO DE DADOS:**
Os dados acima são TUDO que você tem. Se algum campo mostra "N/A", significa que essa informação NÃO EXISTE.
- Se Benefits está vazio → NÃO crie perguntas sobre benefícios
- Se Features está vazio → NÃO crie perguntas sobre recursos
- Se Technical Specs não foi fornecido → NÃO mencione especificações
- Gere APENAS FAQs baseados nos campos preenchidos acima

Se houver poucos dados, é MELHOR gerar menos FAQs (5-7) com informações reais do que 10 FAQs com dados inventados.

**INSTRUÇÕES CRÍTICAS - ANTI-ALUCINAÇÃO:**
1. Use APENAS as informações fornecidas acima - NÃO invente dados externos
2. NÃO mencione características ou especificações que não estejam nos campos acima
3. Se uma informação não estiver disponível (N/A), NÃO a mencione na resposta
4. Base suas respostas EXCLUSIVAMENTE nos dados fornecidos

**EXEMPLOS DE VIOLAÇÕES (NÃO FAÇA ISSO):**
❌ "O produto possui garantia de 2 anos" → Se garantia não está nos dados
❌ "Feito com materiais de alta qualidade" → Se materiais não estão listados
❌ "Compatível com todos os dispositivos" → Se compatibilidade não foi informada
❌ "Recomendado por dentistas" → Se não há essa informação nos dados
❌ "Produto certificado pela ANVISA" → Se certificação não consta nos dados

**EXEMPLOS CORRETOS (BASEADOS NOS DADOS):**
✅ Se Benefits = ["Reduz dor"], então: "Como o produto ajuda com a dor?" → Responder sobre redução de dor
✅ Se Features = ["LED azul"], então: "O que é o LED azul?" → Explicar o LED
✅ Se Keywords = ["ortodontia"], então: Usar "ortodontia" nas respostas quando relevante

**INSTRUÇÕES DE FORMATAÇÃO:**
1. Gere EXATAMENTE 10 FAQs práticos e relevantes
2. Perguntas devem começar com: "Como", "Qual", "Quais", "O que", "Por que", "Quando"
3. Respostas devem ter entre 40-80 palavras
4. Incorpore keywords naturalmente nas respostas para SEO
5. Use HTML básico nas respostas: <strong>, <em>, <ul>, <li>, <p>
6. Respostas devem ser informativas e persuasivas
7. Evite repetir informações entre FAQs

**REGRA OBRIGATÓRIA - HYPERLINKS:**
${product.product_url !== 'N/A' ? `SEMPRE que mencionar o nome do produto "${product.name}" nas respostas, use este formato exato:
<a href="${product.product_url}" target="_blank">${product.name}</a>

Exemplo correto:
"O <a href="${product.product_url}" target="_blank">${product.name}</a> oferece diversos benefícios..."` : 'Mencione o produto pelo nome sem hyperlinks.'}

**FORMATO DE SAÍDA (JSON VÁLIDO):**
[
  {
    "question": "Como funciona o produto?",
    "answer": "<p>Resposta com <strong>destaque</strong> e lista: <ul><li>Item 1</li><li>Item 2</li></ul></p>"
  }
]

IMPORTANTE: Retorne APENAS o JSON válido, sem texto adicional antes ou depois.`;

    // 📡 Chamada Lovable AI
    console.log('[generate-product-faqs] Chamando Lovable AI...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `REGRAS ABSOLUTAS - VIOLAÇÃO RESULTA EM REJEIÇÃO TOTAL:

1. PROIBIDO criar informações não presentes nos dados do produto
2. PROIBIDO mencionar especificações técnicas não fornecidas
3. PROIBIDO assumir características ou funcionalidades
4. PROIBIDO adicionar claims de benefícios não listados
5. Se um campo está vazio (N/A), IGNORE completamente esse aspecto

PERMITIDO:
- Reformular informações existentes nos dados fornecidos
- Criar perguntas sobre dados explicitamente listados
- Usar sinônimos das keywords fornecidas

OBRIGATÓRIO:
- Toda afirmação DEVE ter origem rastreável nos dados do produto
- Retornar JSON válido sem texto adicional
- Incluir hyperlinks ao mencionar o produto quando URL fornecida` 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-product-faqs] Erro na API:', response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    let generatedText = data.choices[0].message.content;
    console.log('[generate-product-faqs] Resposta bruta da IA:', generatedText.substring(0, 200) + '...');

    // 🧹 Limpar JSON (remover markdown)
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let faqs;
    try {
      faqs = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('[generate-product-faqs] Erro ao parsear JSON:', parseError);
      console.error('[generate-product-faqs] Texto recebido:', generatedText);
      throw new Error('IA retornou JSON inválido. Tente novamente.');
    }

    // ✅ Validação final
    if (!Array.isArray(faqs)) {
      throw new Error('IA não retornou um array de FAQs');
    }

    if (faqs.length !== 10) {
      console.warn(`[generate-product-faqs] IA retornou ${faqs.length} FAQs ao invés de 10`);
    }

    // Validar estrutura de cada FAQ
    const validFaqs = faqs.filter(faq => faq.question && faq.answer);
    if (validFaqs.length === 0) {
      throw new Error('Nenhum FAQ válido foi gerado');
    }

    // Validar que FAQs não contêm termos proibidos (alucinação comum)
    const forbiddenTerms = [
      'certificado', 'aprovado pela', 'testado clinicamente',
      'garantia', 'anos de garantia', 'recomendado por',
      'prêmio', 'reconhecido internacionalmente'
    ];

    const checkForHallucinations = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      return forbiddenTerms.some(term => 
        lowerText.includes(term) && 
        !product.description?.toLowerCase().includes(term) &&
        !product.sales_pitch?.toLowerCase().includes(term)
      );
    };

    // Filtrar FAQs suspeitos
    const cleanedFaqs = validFaqs.filter(faq => {
      const hasHallucination = 
        checkForHallucinations(faq.question) || 
        checkForHallucinations(faq.answer);
      
      if (hasHallucination) {
        console.warn('[generate-product-faqs] FAQ suspeito removido:', faq.question);
      }
      
      return !hasHallucination;
    });

    if (cleanedFaqs.length === 0) {
      throw new Error('Todos os FAQs gerados continham informações não verificáveis. Adicione mais dados ao produto.');
    }

    console.log(`[generate-product-faqs] FAQs validados: ${cleanedFaqs.length}/${validFaqs.length}`);

    return new Response(JSON.stringify({ faqs: cleanedFaqs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-product-faqs] Erro:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro desconhecido ao gerar FAQs' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
