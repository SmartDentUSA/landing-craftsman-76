import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { trackAIUsage, extractUsageFromResponse } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message_id } = await req.json();

    if (!message_id) {
      throw new Error('message_id is required');
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Load the message
    const { data: message, error: msgErr } = await supabase
      .from('lia_messages')
      .select('id, role, content, chunks_used, conversation_id')
      .eq('id', message_id)
      .single();

    if (msgErr || !message) {
      console.warn(`Message ${message_id} not found`);
      return new Response(JSON.stringify({ success: false, error: 'Message not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (message.role !== 'assistant') {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Not an assistant message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Build evaluation prompt
    const chunksContext = message.chunks_used
      ? JSON.stringify(message.chunks_used, null, 2)
      : 'Nenhum chunk de referência disponível.';

    const evaluationPrompt = `Você é um auditor de qualidade para um sistema RAG de vendas de equipamentos odontológicos (Smart Dent).

Sua tarefa é avaliar a FIDELIDADE da resposta do assistente em relação aos chunks de referência fornecidos.

## CHUNKS DE REFERÊNCIA (fonte de verdade):
${chunksContext}

## RESPOSTA DO ASSISTENTE PARA AVALIAR:
${message.content}

## INSTRUÇÕES DE AVALIAÇÃO:

1. **Fidelidade (0.0 a 1.0):** A resposta contém APENAS informações presentes nos chunks? 
   - 1.0 = Perfeitamente fiel aos chunks
   - 0.7-0.9 = Majoritariamente fiel com pequenas inferências aceitáveis
   - 0.4-0.6 = Mistura de informações corretas e não verificáveis
   - 0.0-0.3 = Contém informações inventadas ou incorretas

2. **Alucinação:** A resposta contém alguma informação factual (especificação técnica, preço, característica de produto) que NÃO está nos chunks?

Responda usando a function tool fornecida.`;

    // 3. Call LLM-as-Judge with tool calling
    const response = await fetch(`${AI_GATEWAY}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: evaluationPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_evaluation',
              description: 'Submit the quality evaluation result',
              parameters: {
                type: 'object',
                properties: {
                  quality_score: {
                    type: 'number',
                    description: 'Fidelity score from 0.0 to 1.0',
                  },
                  hallucination_detected: {
                    type: 'boolean',
                    description: 'Whether hallucination was detected',
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation of the evaluation',
                  },
                },
                required: ['quality_score', 'hallucination_detected', 'reasoning'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'submit_evaluation' } },
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM Judge error: ${error}`);
    }

    const llmData = await response.json();

    // Extract tool call result
    const toolCall = llmData.choices?.[0]?.message?.tool_calls?.[0];
    let qualityScore = 0.5;
    let hallucinationFlag = false;
    let reasoning = '';

    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        qualityScore = Math.max(0, Math.min(1, args.quality_score || 0.5));
        hallucinationFlag = args.hallucination_detected || false;
        reasoning = args.reasoning || '';
      } catch {
        console.warn('Failed to parse tool call arguments');
      }
    }

    // 4. Update the message with evaluation results
    const { error: updateErr } = await supabase
      .from('lia_messages')
      .update({
        quality_score: qualityScore,
        hallucination_flag: hallucinationFlag,
      })
      .eq('id', message_id);

    if (updateErr) {
      console.error('Failed to update message:', updateErr);
    }

    // 5. If hallucination detected, register event
    if (hallucinationFlag) {
      // Get lead_id from conversation
      const { data: conv } = await supabase
        .from('lia_conversations')
        .select('lead_id')
        .eq('id', message.conversation_id)
        .single();

      if (conv) {
        await supabase.from('lia_lead_events').insert({
          lead_id: conv.lead_id,
          event_type: 'hallucination_detected',
          event_data: {
            message_id,
            quality_score: qualityScore,
            reasoning,
          },
          source: 'evaluate-interaction',
        });
      }
    }

    // Track usage
    const usage = extractUsageFromResponse(llmData);
    trackAIUsage({
      edgeFunctionId: 'evaluate-interaction',
      actionName: 'llm_judge',
      model: usage.model || 'google/gemini-2.5-flash',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    }).catch(() => {});

    console.log(`✅ Evaluated message ${message_id}: score=${qualityScore}, hallucination=${hallucinationFlag}`);

    return new Response(
      JSON.stringify({
        success: true,
        message_id,
        quality_score: qualityScore,
        hallucination_flag: hallucinationFlag,
        reasoning,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Evaluate interaction error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
