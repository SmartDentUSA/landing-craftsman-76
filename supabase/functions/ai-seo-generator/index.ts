import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!DEEPSEEK_API_KEY) {
      console.error('❌ DEEPSEEK_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'DeepSeek API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, content, pageData, title, landingPageData, speed = 'detailed', contentType } = await req.json();

    if (!type || !content) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: type e content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🤖 Gerando SEO com IA - Tipo: ${type}, Modo: ${speed}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'meta_description':
        systemPrompt = 'Você é um especialista em SEO. Gere uma meta description otimizada, persuasiva e que incentive cliques. Máximo 160 caracteres.';
        userPrompt = `Baseado no conteúdo da página: "${content}"\n\nGere uma meta description atrativa que:\n1. Destaque o principal benefício\n2. Inclua palavras-chave relevantes\n3. Tenha call-to-action implícito\n4. Seja única e persuasiva\n\nResponda APENAS com a meta description, sem aspas ou explicações.`;
        break;

      case 'seo_title':
        systemPrompt = 'Você é um especialista em SEO. Gere títulos otimizados para CTR e posicionamento. Máximo 60 caracteres.';
        userPrompt = `Baseado no conteúdo: "${content}"\n\nGere um título SEO que:\n1. Seja clicável e persuasivo\n2. Inclua palavra-chave principal\n3. Transmita valor/benefício\n4. Seja único e relevante\n\nResponda APENAS com o título, sem aspas ou explicações.`;
        break;

      case 'keywords':
        systemPrompt = `Você é um especialista em SEO. Analise o conteúdo fornecido e gere palavras-chave relevantes organizadas em categorias.

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem explicações, sem markdown, sem \`\`\`json, sem texto adicional.

Formato EXATO:
{
  "primary": ["palavra1", "palavra2"],
  "secondary": ["palavra3", "palavra4"], 
  "lsi": ["palavra5", "palavra6"],
  "long_tail": ["frase longa 1", "frase longa 2"]
}`;
        userPrompt = `Analise este conteúdo e gere 3-5 palavras-chave primárias, 4-6 secundárias, 4-6 LSI (semanticamente relacionadas) e 3-5 long-tail (frases de 3+ palavras) para SEO: ${content}`;
        break;

      case 'hidden_content':
        systemPrompt = 'Você é um especialista em SEO técnico. Gere conteúdo contextual que ajude mecanismos de busca a entender melhor a página.';
        userPrompt = `Baseado no conteúdo: "${content}"\n\nGere um texto contextual (50-100 palavras) que:\n1. Descreva o nicho/categoria da página\n2. Inclua termos semânticos relacionados\n3. Forneça contexto sobre o produto/serviço\n4. Use linguagem natural e relevante\n\nEste texto será usado apenas para SEO (invisível ao usuário). Responda APENAS com o texto contextual.`;
        break;

      case 'blog_content':
        const isFastMode = speed === 'fast';
        systemPrompt = `Você é um especialista em criação de conteúdo para blogs. Crie artigos ${isFastMode ? 'concisos e diretos' : 'informativos e completos'}, envolventes e otimizados para SEO.`;
        userPrompt = `Crie um artigo ${isFastMode ? 'de 400-600 palavras' : 'completo (mínimo 800 palavras)'} sobre: ${content}${title ? ` com título: "${title}"` : ''}${landingPageData ? ` (contexto: ${JSON.stringify(landingPageData).substring(0, 300)})` : ''}. 
        O artigo deve incluir:
        - Introdução envolvente
        - ${isFastMode ? '3-4 seções principais' : 'Subtítulos (h2, h3) bem estruturados'}
        - Conteúdo informativo e útil
        - Conclusão${isFastMode ? '' : ' impactante'}
        - Call-to-action natural
        ${isFastMode ? 'Mantenha foco e objetividade.' : '- Otimização para palavras-chave relevantes'}
        Formato: HTML simples com tags h2, h3, p, ul, li, strong, em.`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Tipo inválido. Use: meta_description, seo_title, keywords, hidden_content, blog_content' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Define token limits based on type and speed
    let maxTokens = 200;
    if (type === 'blog_content') {
      maxTokens = speed === 'fast' ? 800 : 1100;
    } else if (type === 'keywords') {
      maxTokens = 500;
    }
    
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 segundos
    
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Erro na API DeepSeek:', errorData);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      let generatedContent = data.choices[0].message.content.trim();

    // Parse JSON para keywords com limpeza robusta
    if (type === 'keywords') {
      try {
        // Limpar possível markdown e extrair JSON
        let cleanContent = generatedContent.trim();
        
        // Remover cercas de markdown se existirem
        cleanContent = cleanContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
        
        // Extrair apenas o conteúdo entre o primeiro { e último }
        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
        }
        
        // Normalizar aspas se necessário
        cleanContent = cleanContent.replace(/[""]/g, '"').replace(/['']/g, "'");
        
        const parsedContent = JSON.parse(cleanContent);
        
        // Validar estrutura mínima
        generatedContent = {
          primary: Array.isArray(parsedContent.primary) ? parsedContent.primary : [],
          secondary: Array.isArray(parsedContent.secondary) ? parsedContent.secondary : [],
          lsi: Array.isArray(parsedContent.lsi) ? parsedContent.lsi : [],
          long_tail: Array.isArray(parsedContent.long_tail) ? parsedContent.long_tail : []
        };
        
      } catch (e) {
        console.error('❌ Erro ao parsear JSON de keywords:', e);
        console.error('Conteúdo bruto recebido:', generatedContent);
        
        // Retornar estrutura vazia com warning
        generatedContent = {
          primary: [],
          secondary: [],
          lsi: [],
          long_tail: [],
          warning: 'IA retornou formato inválido, tente novamente'
        };
      }
    }

      console.log(`✅ SEO gerado com sucesso - Tipo: ${type}, Modo: ${speed}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          type,
          content: generatedContent,
          generated_at: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
      
    } catch (timeoutError) {
      clearTimeout(timeoutId);
      if (timeoutError.name === 'AbortError') {
        console.error('Timeout na API DeepSeek');
        return new Response(
          JSON.stringify({ error: 'Request timeout - try fast mode' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw timeoutError;
    }

  } catch (error) {
    console.error('❌ Erro na função ai-seo-generator:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});