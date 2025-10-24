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

    // 🤖 Prompt para IA
    const prompt = `Você é um especialista em produtos e FAQ. Gere EXATAMENTE 10 perguntas frequentes (FAQs) sobre o produto abaixo.

**PRODUTO:**
- Nome: ${product.name}
- Descrição: ${product.description}
- Pitch de Vendas: ${product.sales_pitch || 'N/A'}
- Keywords: ${product.keywords?.join(', ') || 'N/A'}
- Benefícios: ${product.benefits?.join(', ') || 'N/A'}
- Recursos: ${product.features?.join(', ') || 'N/A'}

**INSTRUÇÕES CRÍTICAS:**
1. Gere EXATAMENTE 10 FAQs práticos e relevantes
2. Perguntas devem começar com: "Como", "Qual", "Quais", "O que", "Por que", "Quando"
3. Respostas devem ter entre 40-80 palavras
4. Incorpore keywords naturalmente nas respostas para SEO
5. Foque em dúvidas reais de clientes potenciais
6. Use HTML básico nas respostas: <strong>, <em>, <ul>, <li>, <p>
7. Respostas devem ser informativas e persuasivas
8. Evite repetir informações entre FAQs

**FORMATO DE SAÍDA (JSON VÁLIDO):**
[
  {
    "question": "Como funciona o produto X?",
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
          { role: 'system', content: 'Você é um especialista em criar FAQs otimizados para SEO. Sempre retorne JSON válido sem texto adicional.' },
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

    console.log(`[generate-product-faqs] Sucesso! ${validFaqs.length} FAQs gerados`);

    return new Response(JSON.stringify({ faqs: validFaqs }), {
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
