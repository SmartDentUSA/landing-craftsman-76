import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json();

    // Extract user_id from JWT token
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (e) {
        console.error('Could not extract user from token:', e);
      }
    }

    if (!userId) {
      throw new Error('User not authenticated');
    }

    console.log('🔍 Looking for NPS data for user:', userId);

    // Get NPS metrics from company profile by user_id
    const { data: companyProfile, error: profileError } = await supabase
      .from('company_profile')
      .select('nps_metrics')
      .eq('user_id', userId)
      .single();

    console.log('📊 Company profile found:', !!companyProfile);
    console.log('📊 NPS metrics exists:', !!companyProfile?.nps_metrics);

    if (profileError || !companyProfile?.nps_metrics) {
      throw new Error('NPS metrics not found. Please process NPS data first.');
    }

    const npsMetrics = companyProfile.nps_metrics as any;

    let prompt = '';
    let systemPrompt = 'Você é um especialista em marketing digital e SEO para odontologia.';

    switch (action) {
      case 'suggest-landing-pages':
        prompt = `Baseado nos temas mais demandados pelos clientes:
${Object.entries(npsMetrics.interest_themes)
  .sort((a: any, b: any) => b[1].count - a[1].count)
  .slice(0, 8)
  .map(([theme, data]: [string, any]) => `- ${theme}: ${data.count} interessados (${data.percentage}%)`)
  .join('\n')}

Sugira 5 landing pages que deveríamos criar. Para cada uma, retorne um JSON com:
{
  "title": "Título da Landing Page (60 chars, otimizado SEO)",
  "slug": "url-amigavel",
  "target_theme": "TEMA_PRINCIPAL",
  "priority": "high|medium|low",
  "seo_keywords": ["keyword1", "keyword2"],
  "description": "Breve descrição do conteúdo (150 chars)"
}

Retorne um array de 5 objetos JSON, sem markdown.`;
        break;

      case 'generate-blog-topics':
        prompt = `Baseado nos interesses validados pelos clientes e keywords:
${npsMetrics.insights.top_keywords.slice(0, 12).map((k: string) => `- ${k}`).join('\n')}

Gere 10 títulos de blog posts otimizados para SEO. Para cada um, retorne um JSON com:
{
  "title": "Título do Blog (55-60 chars, com keyword)",
  "slug": "url-amigavel",
  "target_keyword": "keyword principal",
  "meta_description": "Meta description 150-160 chars com CTA",
  "content_outline": ["Tópico 1", "Tópico 2", "Tópico 3"]
}

Retorne um array de 10 objetos JSON, sem markdown.`;
        break;

      case 'map-products-to-interests':
        // Get products from repository
        const { data: products } = await supabase
          .from('products_repository')
          .select('id, name, category, keywords')
          .eq('approved', true)
          .limit(50);

        prompt = `Correlacione os produtos existentes com os temas de interesse dos clientes:

PRODUTOS:
${products?.slice(0, 20).map(p => `- ${p.name} (${p.category})`).join('\n') || 'Nenhum produto encontrado'}

TEMAS DEMANDADOS:
${Object.entries(npsMetrics.interest_themes)
  .sort((a: any, b: any) => b[1].count - a[1].count)
  .slice(0, 8)
  .map(([theme, data]: [string, any]) => `- ${theme}: ${data.percentage}% dos clientes`)
  .join('\n')}

Para cada tema de alta demanda (>30%), sugira:
1. Produtos existentes que atendem
2. Produtos que deveríamos criar
3. Como melhorar o marketing dos produtos existentes

Retorne um JSON com estrutura:
{
  "theme": "NOME_DO_TEMA",
  "demand_percentage": 43,
  "matching_products": ["Produto 1", "Produto 2"],
  "missing_products": ["Sugestão 1", "Sugestão 2"],
  "marketing_suggestions": ["Sugestão 1", "Sugestão 2"]
}

Retorne um array de objetos JSON, sem markdown.`;
        break;

      case 'generate-faq-from-interests':
        prompt = `Baseado nos temas mais demandados e comentários dos clientes:

TEMAS:
${Object.entries(npsMetrics.interest_themes)
  .sort((a: any, b: any) => b[1].count - a[1].count)
  .slice(0, 5)
  .map(([theme]: [string, any]) => `- ${theme}`)
  .join('\n')}

INSIGHTS:
${npsMetrics.insights.common_themes.join('\n')}

Crie 15 perguntas e respostas (FAQ) que abordem as dúvidas mais comuns sobre estes temas.
Cada resposta deve ter 80-120 palavras e incluir keywords naturalmente.

Retorne um JSON array com estrutura:
{
  "question": "Pergunta completa?",
  "answer": "Resposta detalhada...",
  "related_theme": "TEMA",
  "keywords": ["keyword1", "keyword2"]
}

Retorne APENAS o array JSON, sem markdown.`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    // Parse JSON response
    let result;
    try {
      result = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('✅ Content generated successfully');

    // Map action to valid action_type
    const actionTypeMap: Record<string, string> = {
      'suggest-landing-pages': 'landing-pages',
      'generate-blog-topics': 'blog-topics',
      'map-products-to-interests': 'product-mapping',
      'generate-faq-from-interests': 'faqs',
    };

    const validActionType = actionTypeMap[action] || action;

    // Save to nps_generated_content table for history
    const { error: saveError } = await supabase
      .from('nps_generated_content')
      .insert({
        user_id: userId,
        action_type: validActionType,
        generated_data: result,
      });

    if (saveError) {
      console.error('⚠️ Error saving to history:', saveError);
      // Don't fail the request, just log the error
    } else {
      console.log('💾 Saved to history');
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating content from interests:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
