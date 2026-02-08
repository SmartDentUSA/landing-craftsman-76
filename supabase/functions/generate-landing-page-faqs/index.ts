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

    const SYSTEM_PROMPT = `Você é um especialista técnico no segmento do documento fornecido.
Sua missão é criar FAQs de alta qualidade, técnicas e otimizadas para SEO e IA Search.

REGRAS OBRIGATÓRIAS:

1. Use EXCLUSIVAMENTE informações presentes no texto fornecido
2. NÃO invente dados, números, certificações ou informações que não estão no documento
3. Se uma informação não existe no texto, NÃO crie uma FAQ sobre ela

4. ESTRUTURA de cada FAQ:
   - Pergunta clara, objetiva, escrita como um profissional real perguntaria
   - Resposta técnica, confiável e fácil de entender
   - Respostas entre 40 e 80 palavras
   - As respostas devem ser em HTML com tags como <p>, <strong>, <ul>, <li>

5. COBERTURA TEMÁTICA OBRIGATÓRIA (quando o documento permitir):
   - Diferenças de performance entre os itens/modelos comparados
   - Qual item é mais indicado para iniciantes ou uso básico
   - Qual oferece melhor custo-benefício
   - Diferenças entre modelos/versões similares
   - Destaques do modelo/item de alta performance
   - Diferenciais em workflows avançados ou funcionalidades especiais
   - Importância de recursos tecnológicos (IA, automação) na prática
   - Impacto de especificações técnicas (velocidade, precisão) no uso real
   - Custos de manutenção e consumíveis
   - Qual escolher para casos/aplicações específicas

6. LINGUAGEM:
   - Técnica, profissional e neutra
   - Sem termos promocionais ou adjetivos exagerados ("revolucionário", "incrível", "o melhor")
   - Clareza máxima para humanos e motores de busca por IA

7. SEO / IA SEARCH:
   - Inclua naturalmente os nomes completos dos itens/produtos/modelos mencionados
   - Não repita frases iguais entre FAQs
   - Evite linguagem ambígua
   - Use termos de busca que um profissional usaria

8. Gere exatamente 10 FAQs
9. Ordene da pergunta mais provável à menos provável`;

    const USER_PROMPT = `Analise o conteúdo abaixo sobre "${landing_page_name}" e gere 10 FAQs especializadas usando a função fornecida.

IMPORTANTE:
- Identifique o segmento/nicho do documento e adapte a linguagem técnica
- Se houver tabelas comparativas, crie FAQs que explorem as diferenças entre os itens comparados
- Cada resposta deve ter entre 40 e 80 palavras, em HTML
- NÃO invente informações que não estão no documento

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
              description: 'Gera 10 FAQs técnicas e especializadas baseadas no conteúdo do documento',
              parameters: {
                type: 'object',
                properties: {
                  faqs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string', description: 'Pergunta técnica e natural que um profissional faria' },
                        answer: { type: 'string', description: 'Resposta em HTML (40-80 palavras) com formatação rica (<p>, <strong>, <ul>, <li>)' }
                      },
                      required: ['question', 'answer'],
                      additionalProperties: false
                    },
                    description: 'Array de exatamente 10 FAQs técnicas e especializadas'
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
