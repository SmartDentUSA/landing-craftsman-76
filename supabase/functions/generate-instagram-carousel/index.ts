import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { trackFromResponse } from '../_shared/track-ai-usage.ts';

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

// Papéis fixos de cada slide — Metodologia Smart Dent (6 slides)
const SLIDE_ROLES: Record<number, { name: string; role: string }> = {
  1: { name: 'Gancho', role: 'Identifique a maior dor/problema que o produto resolve. Use a Descrição e Keywords para criar pergunta ou afirmação de impacto.' },
  2: { name: 'Solução', role: 'Apresente o produto como a solução ideal. Destaque a principal conveniência (ex: pincel aplicador, rapidez, exclusividade).' },
  3: { name: 'Diferencial Técnico', role: 'Use dados técnicos reais (ex: elimina chalk effect, substitui jateamento) para explicar por que o produto funciona. Foque no benefício técnico real.' },
  4: { name: 'Experiência / Fluxo', role: 'Descreva como a vida do técnico/dentista fica mais fácil com o produto no dia a dia. Tom: fluência clínica.' },
  5: { name: 'Autoridade Smart Dent', role: 'Reforce que é tecnologia Smart Dent e mencione a categoria do produto. Credibilidade de marca.' },
  6: { name: 'CTA', role: 'Chamada para ação clara (Link na Bio ou Comentário). NUNCA inclua valores monetários. Foco no próximo passo.' },
};

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

    // Buscar dados do produto — campos ampliados para a nova estrutura Smart Dent
    console.log('🔍 Buscando produto:', productId);
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('name, benefits, features, keywords, applications, target_audience, sales_pitch, category, technical_specifications, description, competitor_comparison')
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

    // Preparar contexto do produto
    const benefits = Array.isArray(product.benefits) ? product.benefits.join(', ') : (product.benefits || '');
    const features = Array.isArray(product.features) ? product.features.join(', ') : (product.features || '');
    const keywords = Array.isArray(product.keywords) ? product.keywords.join(', ') : (product.keywords || '');

    // Especificações técnicas: array de objetos {label, value} ou array de strings
    let technicalSpecs = '';
    if (Array.isArray(product.technical_specifications) && product.technical_specifications.length > 0) {
      technicalSpecs = product.technical_specifications
        .map((s: any) => typeof s === 'object' ? `${s.label || s.name || ''}: ${s.value || ''}` : String(s))
        .filter(Boolean)
        .join(' | ');
    }

    const systemPrompt = `Você é um Especialista em Copywriting para Instagram e Estrategista de Marketing Digital para a Smart Dent.
Sua especialidade é transformar especificações técnicas de produtos odontológicos em narrativas de vendas de alta conversão para carrosséis.

MISSÃO: Usar SOMENTE as informações fornecidas no contexto do produto. Nunca inventar dados, números, claims clínicos ou características não documentadas.

REGRAS DE ESTILO:
- Linguagem técnica, porém acessível para dentistas e TPDs
- Destaque termos específicos da área (ex: IPA, alta carga inorgânica, chalk effect, caracterização)
- Textos curtos e escaneáveis (máximo 3 tópicos por slide)
- PROIBIDO citar preços, condições comerciais ou valores monetários

ESTRUTURA OBRIGATÓRIA DOS 6 SLIDES:
Slide 1 — GANCHO: Identifique a maior dor ou problema que o produto resolve (use Descrição e Keywords) e crie pergunta ou afirmação de impacto.
Slide 2 — SOLUÇÃO: Apresente o produto como a solução ideal. Destaque a principal conveniência.
Slide 3 — DIFERENCIAL TÉCNICO: Use dados técnicos reais para explicar por que o produto funciona. Foco no benefício técnico real, não em promessas genéricas.
Slide 4 — EXPERIÊNCIA/FLUXO: Descreva como a vida do técnico/dentista fica mais fácil com o produto no dia a dia.
Slide 5 — AUTORIDADE SMART DENT: Reforce que é tecnologia Smart Dent e mencione a categoria do produto.
Slide 6 — CTA: Chamada para ação clara (Link na Bio ou Comentário). NUNCA inclua valores monetários. O campo cta_label deve ter no máximo 6 palavras e é o texto do botão (ex: 'Conheça no Link da Bio', 'Acesse pelo Link', 'Saiba Mais').

ANTI-ALUCINAÇÃO (OBRIGATÓRIO):
- Use APENAS dados presentes abaixo
- NÃO invente especificações, números ou resultados clínicos
- Se um dado não existir, escreva de forma neutra
- NUNCA mencione preços, promoções ou condições de pagamento

Retorne APENAS um JSON válido, sem markdown.`;

    const userPrompt = `PRODUTO: ${product.name}
CATEGORIA: ${product.category || 'Não informado'}
DESCRIÇÃO: ${product.description || 'Não informado'}
BENEFÍCIOS: ${benefits}
DIFERENCIAIS TÉCNICOS: ${features}
APLICAÇÕES: ${product.applications || ''}
PALAVRAS-CHAVE: ${keywords}
PÚBLICO-ALVO: ${Array.isArray(product.target_audience) ? product.target_audience.join(', ') : (product.target_audience || 'Profissionais da área')}
ESPECIFICAÇÕES TÉCNICAS: ${technicalSpecs || 'Não informado'}
SALES PITCH: ${product.sales_pitch || 'Não disponível'}

COPY DO FEED ORIGINAL (use como base para consistência de linguagem):
${feedCopy}

Gere um CARROSSEL de 6 slides para Instagram.

Retorne APENAS este JSON (sem markdown, sem explicações):
{
  "slides": [
    { "position": 1, "title": "Gancho", "text": "...", "image_suggestion": "..." },
    { "position": 2, "title": "Solução", "text": "...", "image_suggestion": "..." },
    { "position": 3, "title": "Diferencial Técnico", "text": "...", "image_suggestion": "..." },
    { "position": 4, "title": "Experiência / Fluxo", "text": "...", "image_suggestion": "..." },
    { "position": 5, "title": "Autoridade Smart Dent", "text": "...", "image_suggestion": "..." },
    { "position": 6, "title": "CTA", "text": "...", "cta_label": "...", "image_suggestion": "..." }
  ]
}`;

    // Retry with exponential backoff for rate limits
    const MODELS = ['google/gemini-flash-1.5', 'openai/gpt-4o-mini', 'anthropic/claude-haiku'];
    let aiData: any = null;
    let lastError = '';

    for (let attempt = 0; attempt <= 3; attempt++) {
      const model = attempt === 0 ? 'google/gemini-3-flash-preview' : MODELS[attempt - 1] || MODELS[MODELS.length - 1];
      
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`⏳ Retry attempt ${attempt} with model ${model}, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        aiData = await response.json();
        await trackFromResponse(aiData, 'generate-instagram-carousel', 'Carrossel Instagram');
        console.log(`✅ AI response received on attempt ${attempt} with model ${model}`);
        break;
      }

      const errorText = await response.text();
      lastError = errorText;

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 429) {
        console.warn(`⚠️ Rate limit on attempt ${attempt} (model: ${model}), retrying...`);
        continue;
      }

      console.error(`AI gateway error on attempt ${attempt}:`, response.status, errorText);
      if (attempt === 3) throw new Error(`AI gateway error: ${response.status}`);
    }

    if (!aiData) {
      return new Response(
        JSON.stringify({ error: 'Rate limits exceeded after multiple retries. Please try again in a few seconds.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse JSON response
    let slides: CarouselSlide[];
    try {
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

      // Validar: espera exatamente 6 slides (nova estrutura Smart Dent)
      if (!Array.isArray(slides) || slides.length !== 6) {
        throw new Error('Invalid slides array — expected 6 slides');
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
