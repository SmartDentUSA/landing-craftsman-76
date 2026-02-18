import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CarouselSlide {
  position: number;
  title: string;
  text: string;
  image_suggestion: string;
}

const APPROACH_DESCRIPTIONS: Record<string, string> = {
  storytelling: 'Narrativa emocional que conecta o produto à jornada do cliente',
  benefits: 'Foco nos benefícios e vantagens práticas do produto',
  problem_solution: 'Estrutura problema→solução que mostra a transformação',
  urgency: 'Gatilhos de urgência e escassez para ação imediata'
};

const SLIDE_STRUCTURE = `
ESTRUTURA OBRIGATÓRIA DOS 7 SLIDES:
- Slide 1: CAPA (Gancho) - Pare o scroll, desperte curiosidade. Título impactante que faz a pessoa querer ver mais.
- Slide 2: A DOR (Identificação) - Mostre que você entende o problema do público. Crie identificação emocional.
- Slide 3: VIRADA DE CHAVE - O momento "aha!". A transição de problema para possibilidade de solução.
- Slide 4: DIFERENCIAL TÉCNICO - Credibilidade e especificações. O que torna este produto único.
- Slide 5: VANTAGENS PRÁTICAS - Benefícios tangíveis no dia-a-dia. Como melhora a vida do cliente.
- Slide 6: RESULTADO FINAL - Transformação/before-after. O resultado que o cliente terá.
- Slide 7: CTA - Chamada para ação clara e direta. O que o cliente deve fazer agora.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, feedCopy, approach } = await req.json();

    if (!productId || !feedCopy || !approach) {
      return new Response(
        JSON.stringify({ error: 'productId, feedCopy e approach são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do produto
    console.log('🔍 Buscando produto:', productId);
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('name, benefits, features, keywords, applications, target_audience, sales_pitch')
      .eq('id', productId)
      .maybeSingle();
    
    console.log('📦 Produto encontrado:', product ? product.name : 'null', 'Erro:', productError);

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Produto não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const approachDescription = APPROACH_DESCRIPTIONS[approach] || approach;
    
    // Preparar contexto do produto
    const benefits = Array.isArray(product.benefits) ? product.benefits.join(', ') : (product.benefits || '');
    const features = Array.isArray(product.features) ? product.features.join(', ') : (product.features || '');
    const keywords = Array.isArray(product.keywords) ? product.keywords.join(', ') : (product.keywords || '');

    const systemPrompt = `Você é um especialista em marketing digital para Instagram, especializado em criar carrosséis que convertem.

Seu objetivo é criar um carrossel de 7 slides que conta uma história coesa e leva o usuário do problema à ação.

REGRA ANTI-ALUCINAÇÃO (OBRIGATÓRIA):
- O texto do Slide 1 (gancho/capa) deve ser extraído EXCLUSIVAMENTE do campo "DISCURSO DE VENDAS" fornecido abaixo.
- Use apenas a primeira frase significativa do discurso de vendas como gancho do Slide 1.
- NÃO invente, NÃO parafraseie com palavras próprias, NÃO use termos que não estejam no discurso de vendas.
- Se não houver discurso de vendas disponível, use APENAS o nome do produto como gancho.

REGRAS CRÍTICAS:
1. Cada slide deve ter:
   - Título: máximo 30 caracteres, impactante
   - Texto: máximo 150 caracteres, direto e emocional
   - Sugestão de imagem: descrição detalhada de 50-100 palavras
2. Os slides devem fluir como uma narrativa contínua
3. Adapte o tom para a abordagem específica (${approachDescription})
4. Use linguagem que engaja e cria conexão emocional
5. A sugestão de imagem deve ser específica e realizável

${SLIDE_STRUCTURE}

Retorne APENAS um JSON válido no formato especificado.`;

    const userPrompt = `PRODUTO: ${product.name}
BENEFÍCIOS: ${benefits}
DIFERENCIAIS: ${features}
PALAVRAS-CHAVE: ${keywords}
PÚBLICO-ALVO: ${product.target_audience || 'Profissionais da área'}

DISCURSO DE VENDAS (USE EXCLUSIVAMENTE PARA O SLIDE 1 - GANCHO):
${(product as any).sales_pitch || 'Não disponível — use apenas o nome do produto como gancho'}

ABORDAGEM: ${approach.toUpperCase()} - ${approachDescription}

COPY DO FEED ORIGINAL (use como base para consistência):
${feedCopy}

---

Gere um CARROSSEL de 7 slides para Instagram.

Retorne APENAS este JSON (sem markdown, sem explicações):
{
  "slides": [
    {
      "position": 1,
      "title": "Capa (Gancho)",
      "text": "Texto impactante do slide 1...",
      "image_suggestion": "Descrição detalhada da imagem sugerida para o slide 1..."
    },
    {
      "position": 2,
      "title": "A Dor",
      "text": "Texto do slide 2...",
      "image_suggestion": "Descrição detalhada..."
    },
    {
      "position": 3,
      "title": "Virada de Chave",
      "text": "Texto do slide 3...",
      "image_suggestion": "Descrição detalhada..."
    },
    {
      "position": 4,
      "title": "Diferencial Técnico",
      "text": "Texto do slide 4...",
      "image_suggestion": "Descrição detalhada..."
    },
    {
      "position": 5,
      "title": "Vantagens Práticas",
      "text": "Texto do slide 5...",
      "image_suggestion": "Descrição detalhada..."
    },
    {
      "position": 6,
      "title": "Resultado Final",
      "text": "Texto do slide 6...",
      "image_suggestion": "Descrição detalhada..."
    },
    {
      "position": 7,
      "title": "CTA",
      "text": "Texto do slide 7...",
      "image_suggestion": "Descrição detalhada..."
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
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
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse JSON response
    let slides: CarouselSlide[];
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      const parsed = JSON.parse(cleanContent);
      slides = parsed.slides;

      if (!Array.isArray(slides) || slides.length !== 7) {
        throw new Error('Invalid slides array');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, content);
      throw new Error('Failed to parse carousel slides from AI response');
    }

    return new Response(
      JSON.stringify({ 
        slides,
        approach,
        productName: product.name,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating carousel:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
