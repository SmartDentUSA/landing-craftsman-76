import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoGenerationRequest {
  action: 'analyze' | 'generate_missing' | 'quality_check';
  landingPageId?: string;
  productIds?: string[];
}

interface DataQualityScore {
  landingPageId: string;
  overallScore: number;
  details: {
    hasTitle: boolean;
    hasSubtitle: boolean;
    hasProducts: boolean;
    hasFAQ: boolean;
    hasKeywords: boolean;
    productQuality: number;
  };
  recommendations: string[];
  canAutoGenerate: boolean;
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
    
    const request = await req.json() as AutoGenerationRequest;
    console.log('🤖 Auto-generation request:', request);

    switch (request.action) {
      case 'analyze':
        const analysis = await analyzeDataQuality(supabase, request.landingPageId);
        return new Response(JSON.stringify({ success: true, analysis }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'generate_missing':
        const generated = await generateMissingContent(supabase, deepSeekKey, request.landingPageId);
        return new Response(JSON.stringify({ success: true, generated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'quality_check':
        const qualityCheck = await performQualityCheck(supabase, request.productIds);
        return new Response(JSON.stringify({ success: true, qualityCheck }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unsupported action: ${request.action}`);
    }

  } catch (error) {
    console.error('❌ Error in auto-generation:', error);
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

async function analyzeDataQuality(supabase: any, landingPageId?: string): Promise<DataQualityScore[]> {
  // Get all approved landing pages or specific one
  const query = supabase
    .from('landing_pages')
    .select('*')
    .eq('status', 'approved');
    
  if (landingPageId) {
    query.eq('id', landingPageId);
  }
  
  const { data: landingPages, error } = await query;
  if (error) throw error;

  const scores: DataQualityScore[] = [];

  for (const lp of landingPages || []) {
    // Get products for this landing page
    const { data: products } = await supabase
      .from('products_repository')
      .select('*')
      .eq('source_landing_page_id', lp.id);

    const score = calculateQualityScore(lp, products || []);
    scores.push(score);
  }

  return scores;
}

function calculateQualityScore(landingPage: any, products: any[]): DataQualityScore {
  const details = {
    hasTitle: !!(landingPage.title && landingPage.title.length > 10),
    hasSubtitle: !!(landingPage.subtitle && landingPage.subtitle.length > 20),
    hasProducts: products.length > 0,
    hasFAQ: !!(landingPage.faq && landingPage.faq.length > 0),
    hasKeywords: !!(landingPage.seo?.keywords && landingPage.seo.keywords.length > 0),
    productQuality: calculateProductQuality(products),
  };

  // Calculate overall score (0-100)
  let score = 0;
  if (details.hasTitle) score += 20;
  if (details.hasSubtitle) score += 15;
  if (details.hasProducts) score += 25;
  if (details.hasFAQ) score += 20;
  if (details.hasKeywords) score += 10;
  score += details.productQuality * 10; // 0-10 points from product quality

  const recommendations: string[] = [];
  if (!details.hasTitle) recommendations.push('Adicionar ou melhorar o título (mín. 10 caracteres)');
  if (!details.hasSubtitle) recommendations.push('Adicionar subtítulo descritivo (mín. 20 caracteres)');
  if (!details.hasProducts) recommendations.push('Adicionar produtos ao repositório');
  if (!details.hasFAQ) recommendations.push('Adicionar perguntas frequentes');
  if (!details.hasKeywords) recommendations.push('Definir palavras-chave SEO');
  if (details.productQuality < 0.5) recommendations.push('Melhorar qualidade dos dados dos produtos');

  return {
    landingPageId: landingPage.id,
    overallScore: Math.round(score),
    details,
    recommendations,
    canAutoGenerate: score >= 60, // Can auto-generate if score is 60% or higher
  };
}

function calculateProductQuality(products: any[]): number {
  if (products.length === 0) return 0;

  let totalQuality = 0;
  for (const product of products) {
    let productScore = 0;
    if (product.name && product.name.length > 5) productScore += 0.3;
    if (product.description && product.description.length > 20) productScore += 0.3;
    if (product.price) productScore += 0.2;
    if (product.image_url) productScore += 0.1;
    if (product.product_url) productScore += 0.1;
    
    totalQuality += productScore;
  }

  return totalQuality / products.length; // Average quality (0-1)
}

async function generateMissingContent(supabase: any, deepSeekKey: string, landingPageId?: string) {
  console.log('🔄 Generating missing AI content...');
  
  // Get landing pages that need content generation
  const query = supabase
    .from('landing_pages')
    .select('*')
    .eq('status', 'approved');
    
  if (landingPageId) {
    query.eq('id', landingPageId);
  }
  
  const { data: landingPages, error } = await query;
  if (error) throw error;

  const results = [];

  for (const lp of landingPages || []) {
    // Check what's missing and generate
    const generated = await generateMissingForLandingPage(supabase, deepSeekKey, lp);
    results.push({
      landingPageId: lp.id,
      name: lp.name,
      generated
    });
  }

  return results;
}

async function generateMissingForLandingPage(supabase: any, deepSeekKey: string, landingPage: any) {
  const generated = {
    keywords: false,
    productFeatures: false,
    productBenefits: false,
    blogPreview: false
  };

  // Get products for this landing page
  const { data: products } = await supabase
    .from('products_repository')
    .select('*')
    .eq('source_landing_page_id', landingPage.id);

  // Generate SEO keywords if missing
  if (!landingPage.seo?.keywords || landingPage.seo.keywords.length === 0) {
    const keywords = await generateSEOKeywords(deepSeekKey, landingPage, products || []);
    if (keywords.length > 0) {
      await supabase
        .from('landing_pages')
        .update({ 
          seo: { 
            ...landingPage.seo, 
            keywords 
          }
        })
        .eq('id', landingPage.id);
      generated.keywords = true;
    }
  }

  // Generate missing product features/benefits
  for (const product of products || []) {
    let needsUpdate = false;
    const updates: any = {};

    if (!product.ai_features || product.ai_features.length === 0) {
      const features = await generateProductFeatures(deepSeekKey, product);
      updates.ai_features = features;
      needsUpdate = true;
      generated.productFeatures = true;
    }

    if (!product.ai_benefits || product.ai_benefits.length === 0) {
      const benefits = await generateProductBenefits(deepSeekKey, product);
      updates.ai_benefits = benefits;
      needsUpdate = true;
      generated.productBenefits = true;
    }

    if (needsUpdate) {
      await supabase
        .from('products_repository')
        .update(updates)
        .eq('id', product.id);
    }
  }

  // Check if landing page needs blog preview
  const { data: existingBlog } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('landing_page_id', landingPage.id)
    .eq('status', 'published')
    .single();

  if (!existingBlog && !landingPage.blogGenerated) {
    // Generate blog preview
    try {
      const { data: blogData } = await supabase.functions.invoke('generate-blog-content', {
        body: {
          type: 'preview_blog',
          landingPageId: landingPage.id,
          landingPageData: landingPage
        }
      });

      if (blogData.success) {
        generated.blogPreview = true;
      }
    } catch (error) {
      console.error('Error generating blog preview:', error);
    }
  }

  return generated;
}

async function generateSEOKeywords(deepSeekKey: string, landingPage: any, products: any[]): Promise<string[]> {
  const prompt = `
Gere 8-10 palavras-chave SEO relevantes para esta página de odontologia:

Título: ${landingPage.title || 'Odontologia Digital'}
Subtítulo: ${landingPage.subtitle || ''}
Produtos: ${products.map(p => p.name).join(', ')}

Retorne apenas as palavras-chave separadas por vírgula, sem numeração.
Foque em termos que dentistas pesquisariam no Google.
`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepSeekKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um especialista em SEO odontológico.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.5
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return content.split(',').map((kw: string) => kw.trim()).filter((kw: string) => kw.length > 0);
  } catch (error) {
    console.error('Error generating SEO keywords:', error);
    return [];
  }
}

async function generateProductFeatures(deepSeekKey: string, product: any): Promise<string[]> {
  const prompt = `
Liste 5-7 características técnicas principais do produto:

Produto: ${product.name}
Descrição: ${product.description || 'Produto odontológico'}

Retorne apenas as características separadas por vírgula, sem numeração.
Foque em aspectos técnicos e funcionais.
`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepSeekKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um especialista em produtos odontológicos.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.6
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return content.split(',').map((feature: string) => feature.trim()).filter((feature: string) => feature.length > 0);
  } catch (error) {
    console.error('Error generating product features:', error);
    return [];
  }
}

async function generateProductBenefits(deepSeekKey: string, product: any): Promise<string[]> {
  const prompt = `
Liste 5-7 benefícios principais que este produto oferece aos dentistas:

Produto: ${product.name}
Descrição: ${product.description || 'Produto odontológico'}

Retorne apenas os benefícios separados por vírgula, sem numeração.
Foque em vantagens práticas e resultados.
`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepSeekKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você é um consultor de vendas odontológico.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.6
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return content.split(',').map((benefit: string) => benefit.trim()).filter((benefit: string) => benefit.length > 0);
  } catch (error) {
    console.error('Error generating product benefits:', error);
    return [];
  }
}

async function performQualityCheck(supabase: any, productIds?: string[]) {
  console.log('🔍 Performing quality check...');
  
  const query = supabase
    .from('products_repository')
    .select('*')
    .eq('approved', true);
    
  if (productIds && productIds.length > 0) {
    query.in('id', productIds);
  }
  
  const { data: products, error } = await query;
  if (error) throw error;

  const results = [];
  
  for (const product of products || []) {
    const quality = calculateProductQuality([product]);
    const issues = [];
    
    if (!product.name || product.name.length < 5) issues.push('Nome muito curto');
    if (!product.description || product.description.length < 20) issues.push('Descrição insuficiente');
    if (!product.ai_features || product.ai_features.length === 0) issues.push('Características não geradas');
    if (!product.ai_benefits || product.ai_benefits.length === 0) issues.push('Benefícios não gerados');
    if (!product.image_url) issues.push('Imagem ausente');
    
    results.push({
      id: product.id,
      name: product.name,
      qualityScore: Math.round(quality * 100),
      issues,
      needsAI: issues.some(issue => issue.includes('não geradas') || issue.includes('não gerados'))
    });
  }

  return results;
}