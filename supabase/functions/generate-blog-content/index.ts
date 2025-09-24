import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlogGenerationRequest {
  type: 'simple_blog' | 'dual_blog' | 'preview_blog';
  landingPageId: string;
  landingPageData?: any;
  selectedProductIds?: string[];
  authorId?: string;
}

interface BlogVersion {
  title: string;
  content: string;
  metaDescription: string;
  keywords: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepSeekKey = Deno.env.get('DEEPSEEK_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const request = await req.json() as BlogGenerationRequest;
    console.log('🚀 Blog generation request:', { 
      type: request.type, 
      landingPageId: request.landingPageId 
    });

    // Fetch landing page data if not provided
    let landingPageData = request.landingPageData;
    if (!landingPageData) {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', request.landingPageId)
        .single();
      
      if (error) throw new Error(`Landing page not found: ${error.message}`);
      landingPageData = data;
    }

    // Get selected products data
    let productData = [];
    if (request.selectedProductIds && request.selectedProductIds.length > 0) {
      const { data: products } = await supabase
        .from('products_repository')
        .select('*')
        .in('id', request.selectedProductIds)
        .eq('approved', true);
      productData = products || [];
    }

    // Get author data if specified
    let authorData = null;
    if (request.authorId) {
      const { data: author } = await supabase
        .from('key_opinion_leaders')
        .select('*')
        .eq('id', request.authorId)
        .single();
      authorData = author;
    }

    // Generate content based on type
    switch (request.type) {
      case 'simple_blog':
        const simpleBlog = await generateSimpleBlog(landingPageData, productData, deepSeekKey);
        return new Response(JSON.stringify({ success: true, content: simpleBlog }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'dual_blog':
        const dualBlogs = await generateDualBlog(landingPageData, productData, deepSeekKey);
        return new Response(JSON.stringify({ success: true, content: dualBlogs }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'preview_blog':
        const preview = await generatePreviewBlog(landingPageData, productData, deepSeekKey);
        return new Response(JSON.stringify({ success: true, content: preview }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unsupported blog type: ${request.type}`);
    }

  } catch (error) {
    console.error('❌ Error generating blog:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateSimpleBlog(landingPageData: any, productData: any[], deepSeekKey: string): Promise<BlogVersion> {
  const prompt = buildBlogPrompt(landingPageData, productData, 'simple');
  
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepSeekKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Você é um especialista em marketing digital odontológico. Crie blogs SEO-otimizados, informativos e envolventes.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 3000,
      temperature: 0.7
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  return parseBlogContent(content);
}

async function generateDualBlog(landingPageData: any, productData: any[], deepSeekKey: string) {
  const dentalaPrompt = buildBlogPrompt(landingPageData, productData, 'dentala');
  const eodontoPrompt = buildBlogPrompt(landingPageData, productData, 'eodonto');
  
  // Generate both versions in parallel
  const [dentalaResponse, eodontoResponse] = await Promise.all([
    generateBlogVersion(dentalaPrompt, deepSeekKey),
    generateBlogVersion(eodontoPrompt, deepSeekKey)
  ]);

  return {
    dentala: dentalaResponse,
    eodonto: eodontoResponse
  };
}

async function generatePreviewBlog(landingPageData: any, productData: any[], deepSeekKey: string): Promise<BlogVersion> {
  // Generate a shorter, preview version
  const prompt = buildBlogPrompt(landingPageData, productData, 'preview');
  
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepSeekKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Crie um preview de blog conciso mas completo para avaliação inicial.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  return parseBlogContent(content);
}

async function generateBlogVersion(prompt: string, deepSeekKey: string): Promise<BlogVersion> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepSeekKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Você é um especialista em marketing digital odontológico. Crie blogs SEO-otimizados.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 3000,
      temperature: 0.7
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  return parseBlogContent(content);
}

function buildBlogPrompt(landingPageData: any, productData: any[], type: string): string {
  const title = landingPageData.title || 'Odontologia Digital';
  const subtitle = landingPageData.subtitle || '';
  const faqData = landingPageData.faq || [];
  
  let targetAudience = '';
  let tone = '';
  
  switch (type) {
    case 'dentala':
      targetAudience = 'dentistas e profissionais da odontologia com foco técnico';
      tone = 'profissional, técnico, baseado em evidências';
      break;
    case 'eodonto':
      targetAudience = 'proprietários de clínicas e gestores com foco comercial';
      tone = 'comercial, persuasivo, focado em resultados e ROI';
      break;
    case 'preview':
      targetAudience = 'profissionais da odontologia em geral';
      tone = 'informativo e acessível';
      break;
    default:
      targetAudience = 'profissionais da odontologia';
      tone = 'informativo e profissional';
  }

  const productInfo = productData.length > 0 
    ? `\nProdutos principais: ${productData.map(p => `${p.name}: ${p.description}`).join('; ')}`
    : '';

  const faqInfo = faqData.length > 0
    ? `\nPerguntas frequentes: ${faqData.map((f: any) => `Q: ${f.question} A: ${f.answer}`).join('; ')}`
    : '';

  return `
Crie um blog post completo em português brasileiro sobre "${title}".

DADOS DA PÁGINA:
- Título: ${title}
- Subtítulo: ${subtitle}${productInfo}${faqInfo}

INSTRUÇÕES:
- Público-alvo: ${targetAudience}
- Tom: ${tone}
- Tamanho: 800-1200 palavras
- Formato: HTML semântico (h1, h2, h3, p, ul, li)
- SEO: Otimizado para a palavra-chave principal extraída do título
- Estrutura: Introdução, desenvolvimento com subtópicos, conclusão

FORMATO DE RESPOSTA (JSON):
{
  "title": "Título otimizado para SEO (max 60 caracteres)",
  "metaDescription": "Meta description envolvente (150-160 caracteres)",
  "content": "Conteúdo HTML completo do blog",
  "keywords": ["palavra-chave-1", "palavra-chave-2", "palavra-chave-3", "palavra-chave-4", "palavra-chave-5"]
}

O conteúdo deve ser informativo, útil e engajante para ${targetAudience}.
`;
}

function parseBlogContent(content: string): BlogVersion {
  try {
    // Remove markdown code blocks if present
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    
    return {
      title: parsed.title || 'Blog Post',
      content: parsed.content || '<p>Conteúdo gerado automaticamente.</p>',
      metaDescription: parsed.metaDescription || parsed.meta_description || 'Descrição do blog post.',
      keywords: parsed.keywords || ['odontologia', 'digital', 'tecnologia']
    };
  } catch (error) {
    console.error('Error parsing blog content:', error);
    // Fallback response
    return {
      title: 'Blog Post Odontológico',
      content: '<p>Conteúdo será gerado automaticamente.</p>',
      metaDescription: 'Conteúdo odontológico profissional e atualizado.',
      keywords: ['odontologia', 'digital', 'tecnologia', 'inovação', 'profissional']
    };
  }
}