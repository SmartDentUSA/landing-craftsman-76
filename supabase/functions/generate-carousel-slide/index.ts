import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trackFromResponse } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SLIDE_PROMPTS: Record<string, { system: string; outputDescription: string }> = {
  cientificidade: {
    system: `Você é um especialista em copywriting científico para Instagram. Gere conteúdo para o slide de CIENTIFICIDADE de um carrossel odontológico.

REGRAS:
- Use APENAS dados técnicos fornecidos, NUNCA invente números ou claims
- Linguagem técnica acessível para dentistas e TPDs
- PROIBIDO citar preços ou condições comerciais
- Foco em evidências, dados técnicos e diferenciais comprovados
- Textos curtos e escaneáveis

Retorne APENAS JSON válido sem markdown.`,
    outputDescription: 'title (título curto do slide), headline (frase principal de impacto), body (frase secundária), bullet1, bullet2, bullet3, bullet4 (4 pontos técnicos curtos)',
  },
  experiencia: {
    system: `Você é um especialista em copywriting experiencial para Instagram. Gere conteúdo para o slide de EXPERIÊNCIA/FLUXO de um carrossel odontológico.

REGRAS:
- Descreva como o produto facilita o dia a dia do profissional
- Tom: fluência clínica, praticidade, conveniência
- PROIBIDO citar preços ou condições comerciais
- Use APENAS informações fornecidas
- Textos curtos e diretos

Retorne APENAS JSON válido sem markdown.`,
    outputDescription: 'keyword (palavra-chave ou frase curta de destaque, max 4 palavras), benefit (benefício principal em 1-2 frases curtas)',
  },
  seguranca: {
    system: `Você é um especialista em copywriting de autoridade/confiança para Instagram. Gere conteúdo para o slide de SEGURANÇA/AUTORIDADE de um carrossel odontológico Smart Dent.

REGRAS:
- Reforce credibilidade, tecnologia Smart Dent e categoria do produto
- Foque em certificações, garantias, exclusividade e confiança
- PROIBIDO citar preços ou condições comerciais
- Use APENAS informações fornecidas
- Badges curtos (max 6 palavras cada)

Retorne APENAS JSON válido sem markdown.`,
    outputDescription: 'title (título do slide, ex: "Tecnologia Smart Dent"), badge1, badge2, badge3 (3 badges curtos de autoridade/confiança)',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, salesPitch, benefits, features, slideType } = await req.json();

    if (!productName || !slideType || !SLIDE_PROMPTS[slideType]) {
      return new Response(
        JSON.stringify({ error: 'productName e slideType (cientificidade|experiencia|seguranca) são obrigatórios' }),
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

    const benefitsList = Array.isArray(benefits) ? benefits.slice(0, 5).join('; ') : (benefits || '');
    const featuresList = Array.isArray(features) ? features.slice(0, 5).join('; ') : (features || '');
    const config = SLIDE_PROMPTS[slideType];

    const randomSeed = Math.floor(Math.random() * 99999);

    const userPrompt = `PRODUTO: ${productName}
${salesPitch ? `SALES PITCH: ${salesPitch}` : ''}
${benefitsList ? `BENEFÍCIOS: ${benefitsList}` : ''}
${featuresList ? `DIFERENCIAIS: ${featuresList}` : ''}

VARIAÇÃO #${randomSeed}

Gere o conteúdo para o slide. Retorne APENAS este JSON:
Campos esperados: ${config.outputDescription}`;

    const MODELS = ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'openai/gpt-5-mini'];
    let aiData: any = null;

    for (let attempt = 0; attempt < MODELS.length; attempt++) {
      const model = MODELS[attempt];
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`⏳ Retry ${attempt} with ${model}, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: config.system },
            { role: 'user', content: userPrompt },
          ],
          temperature: 1.0,
        }),
      });

      if (response.ok) {
        aiData = await response.json();
        await trackFromResponse(aiData, 'generate-carousel-slide', 'Slide Carrossel');
        console.log(`✅ AI OK on attempt ${attempt} (${model})`);
        break;
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 429) {
        console.warn(`⚠️ Rate limit on attempt ${attempt} (${model})`);
        continue;
      }

      const errText = await response.text();
      console.error(`AI error attempt ${attempt}:`, response.status, errText);
    }

    if (!aiData) {
      return new Response(
        JSON.stringify({ error: 'Rate limits exceeded after retries. Try again shortly.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from AI');

    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
    else if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
    cleanContent = cleanContent.trim();

    const parsed = JSON.parse(cleanContent);

    return new Response(
      JSON.stringify({ slideType, ...parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating slide:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
