import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('❓ [Generate LP FAQs] Recebendo requisição...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const { transcribed_text, landing_page_name } = await req.json();

    if (!transcribed_text) {
      return new Response(
        JSON.stringify({ success: false, error: 'Texto transcrito é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Texto recebido (tamanho):', transcribed_text.length);
    console.log('🎯 Landing Page:', landing_page_name);

    const MAX_CHARS = 60000;
    const clippedText = transcribed_text.length > MAX_CHARS
      ? transcribed_text.slice(0, MAX_CHARS) + '\n\n[Texto truncado]'
      : transcribed_text;

    const SYSTEM_PROMPT = `Você é um especialista em criar FAQs (Perguntas Frequentes) para landing pages.

REGRAS OBRIGATÓRIAS:
1. Use EXCLUSIVAMENTE informações presentes no texto fornecido
2. NÃO invente dados, números, certificações ou informações que não estão no documento
3. Se uma informação não existe no texto, NÃO crie uma FAQ sobre ela
4. As respostas devem ser em HTML com tags como <p>, <strong>, <ul>, <li>
5. Crie entre 8 e 12 FAQs relevantes e úteis
6. As perguntas devem ser naturais, como um cliente real perguntaria
7. As respostas devem ser completas mas concisas
8. Ordene da pergunta mais provável à menos provável`;

    const USER_PROMPT = `Com base EXCLUSIVAMENTE no conteúdo abaixo sobre "${landing_page_name}", gere FAQs usando a função fornecida.

CONTEÚDO DO DOCUMENTO:
${clippedText}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_faqs',
              description: 'Gera FAQs estruturadas baseadas no conteúdo do documento',
              parameters: {
                type: 'object',
                properties: {
                  faqs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string', description: 'Pergunta natural que um cliente faria' },
                        answer: { type: 'string', description: 'Resposta em HTML com formatação rica (<p>, <strong>, <ul>, <li>)' }
                      },
                      required: ['question', 'answer'],
                      additionalProperties: false
                    },
                    description: 'Array de 8-12 FAQs'
                  }
                },
                required: ['faqs'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_faqs' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('❌ AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('AI não retornou dados estruturados');
    }

    const { faqs } = JSON.parse(toolCall.function.arguments);
    console.log('✅ FAQs geradas:', faqs?.length || 0);

    return new Response(
      JSON.stringify({ success: true, faqs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
