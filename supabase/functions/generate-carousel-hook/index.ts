import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trackFromResponse } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, salesPitch, benefits, features } = await req.json();

    if (!productName) {
      return new Response(
        JSON.stringify({ error: 'productName é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const benefitsList = Array.isArray(benefits) ? benefits.slice(0, 3).join('; ') : (benefits || '');
    const featuresList = Array.isArray(features) ? features.slice(0, 3).join('; ') : (features || '');

    const systemPrompt = `Você é um especialista em copywriting para Instagram e redes sociais, com profundo conhecimento em psicologia do consumidor e gatilhos mentais.

Sua tarefa: criar um GANCHO (hook) criativo e irresistível para o primeiro slide de um carrossel de Instagram sobre um produto odontológico/dental.

REGRAS OBRIGATÓRIAS:
1. O gancho deve ter entre 40 e 80 caracteres
2. Deve gerar curiosidade IMEDIATA e parar o scroll
3. Use linguagem para profissionais de odontologia (clínica, premium, técnica)
4. Pode usar gatilhos: pergunta retórica, afirmação surpreendente, dado numérico impactante, promessa de transformação
5. NUNCA copie literalmente do discurso de vendas - USE-O como INSPIRAÇÃO para criar algo CRIATIVO e ORIGINAL
6. Cada chamada deve gerar um hook DIFERENTE e ÚNICO — varie o estilo
7. Retorne APENAS o texto do gancho, sem aspas, sem explicações, sem markdown

EXEMPLOS de bons ganchos (para referência de estilo, NÃO copie):
- "E se 3 minutos mudassem o resultado final?"
- "O que separa um case ótimo de um mediocre"
- "Tecnologia que seus concorrentes ainda não conhecem"
- "Isso já causou um problema na sua clínica?"
- "A virada de chave que 9 em 10 dentistas ignoram"`;

    // Seed aleatório para evitar cache do modelo
    const randomSeed = Math.floor(Math.random() * 99999);
    const styles = ['pergunta retórica', 'afirmação surpreendente', 'dado numérico', 'provocação direta', 'promessa transformadora', 'curiosidade técnica'];
    const style = styles[randomSeed % styles.length];

    const userPrompt = `PRODUTO: ${productName}
${salesPitch ? `DISCURSO DE VENDAS (use como INSPIRAÇÃO): ${salesPitch}` : ''}
${benefitsList ? `BENEFÍCIOS PRINCIPAIS: ${benefitsList}` : ''}
${featuresList ? `DIFERENCIAIS: ${featuresList}` : ''}

VARIAÇÃO #${randomSeed} — Estilo obrigatório desta vez: ${style.toUpperCase()}

Crie um gancho único, criativo e DIFERENTE de qualquer exemplo dado.
Use obrigatoriamente o estilo "${style}" nesta geração.
Retorne APENAS o texto do gancho (40-80 caracteres):`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1.2,
        max_tokens: 120,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    await trackFromResponse(aiData, 'generate-carousel-hook', 'Hook Carrossel');
    const hook = aiData.choices?.[0]?.message?.content?.trim();

    if (!hook) {
      throw new Error('No content returned from AI');
    }

    // Limpar aspas extras se a IA as incluir
    const cleanHook = hook.replace(/^["']|["']$/g, '').trim();

    return new Response(
      JSON.stringify({ hook: cleanHook }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating hook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
