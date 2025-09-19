import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductAIRequest {
  productId?: string;
  generateAll?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    if (!deepSeekApiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: ProductAIRequest = await req.json();

    let productsToProcess = [];

    if (request.generateAll) {
      // Process all products that don't have AI-generated content
      const { data: products, error: queryError } = await supabase
        .from('products_repository')
        .select('*')
        .or('ai_generated_benefits.eq.false,ai_generated_keywords.eq.false');

      if (queryError) throw queryError;
      productsToProcess = products || [];
    } else if (request.productId) {
      // Process specific product
      const { data: product, error: queryError } = await supabase
        .from('products_repository')
        .select('*')
        .eq('id', request.productId)
        .single();

      if (queryError) throw queryError;
      if (product) productsToProcess = [product];
    } else {
      throw new Error('Either productId or generateAll must be specified');
    }

    const results = [];

    for (const product of productsToProcess) {
      try {
        console.log(`Generating AI content for product: ${product.name}`);
        
        const updates: any = {};
        let needsUpdate = false;

        // Generate benefits if not already AI-generated
        if (!product.ai_generated_benefits || (product.benefits && product.benefits.length === 0)) {
          const benefits = await generateProductBenefits(deepSeekApiKey, product);
          if (benefits && benefits.length > 0) {
            updates.benefits = benefits;
            updates.ai_generated_benefits = true;
            needsUpdate = true;
          }
        }

        // Generate keywords if not already AI-generated
        if (!product.ai_generated_keywords || (product.keywords && product.keywords.length === 0)) {
          const keywords = await generateProductKeywords(deepSeekApiKey, product);
          if (keywords && keywords.length > 0) {
            updates.keywords = keywords;
            updates.ai_generated_keywords = true;
            needsUpdate = true;
          }
        }

        // Generate features if empty
        if (!product.features || product.features.length === 0) {
          const features = await generateProductFeatures(deepSeekApiKey, product);
          if (features && features.length > 0) {
            updates.features = features;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          updates.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('products_repository')
            .update(updates)
            .eq('id', product.id);

          if (updateError) {
            throw updateError;
          }

          results.push({
            productId: product.id,
            productName: product.name,
            success: true,
            generated: {
              benefits: updates.benefits?.length || 0,
              keywords: updates.keywords?.length || 0,
              features: updates.features?.length || 0
            }
          });

          console.log(`Successfully generated AI content for: ${product.name}`);
        } else {
          results.push({
            productId: product.id,
            productName: product.name,
            success: true,
            message: 'Already has AI-generated content'
          });
        }

      } catch (productError) {
        console.error(`Failed to process product ${product.id}:`, productError);
        results.push({
          productId: product.id,
          productName: product.name,
          success: false,
          error: productError.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `AI content generation completed`,
      totalProcessed: productsToProcess.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-product-ai-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateProductBenefits(apiKey: string, product: any): Promise<string[]> {
  const prompt = `Analise o seguinte produto e gere uma lista de benefícios específicos:

Produto: ${product.name}
Descrição: ${product.description || 'Não informada'}
Categoria: ${product.category || 'Não informada'}
Preço: ${product.price ? `${product.currency || 'BRL'} ${product.price}` : 'Não informado'}

Gere APENAS um array JSON com 3-5 benefícios específicos, objetivos e focados no valor para o cliente:

["benefício 1", "benefício 2", "benefício 3"]

Foque em:
- Resultados práticos que o cliente obtém
- Soluções para problemas específicos
- Vantagens competitivas do produto
- Economia de tempo/dinheiro
- Qualidade e confiabilidade`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  return await parseAIArrayResponse(response, 'benefits');
}

async function generateProductKeywords(apiKey: string, product: any): Promise<string[]> {
  const prompt = `Analise o seguinte produto e gere palavras-chave para SEO e marketing:

Produto: ${product.name}
Descrição: ${product.description || 'Não informada'}
Categoria: ${product.category || 'Não informada'}
Público-alvo: ${product.target_audience || 'Não informado'}

Gere APENAS um array JSON com 8-12 palavras-chave relevantes:

["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"]

Inclua:
- Palavras-chave principais do produto
- Termos de busca relacionados
- Variações e sinônimos
- Palavras de cauda longa
- Termos técnicos relevantes
- Palavras relacionadas à categoria`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 400,
    }),
  });

  return await parseAIArrayResponse(response, 'keywords');
}

async function generateProductFeatures(apiKey: string, product: any): Promise<string[]> {
  const prompt = `Analise o seguinte produto e gere características técnicas e funcionais:

Produto: ${product.name}
Descrição: ${product.description || 'Não informada'}
Categoria: ${product.category || 'Não informada'}

Gere APENAS um array JSON com 4-6 características específicas:

["característica 1", "característica 2", "característica 3"]

Foque em:
- Especificações técnicas
- Funcionalidades principais
- Materiais e componentes
- Dimensões ou capacidades
- Compatibilidades
- Certificações ou padrões`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 400,
    }),
  });

  return await parseAIArrayResponse(response, 'features');
}

async function parseAIArrayResponse(response: Response, type: string): Promise<string[]> {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${data.error?.message || 'Unknown error'}`);
  }

  const content = data.choices[0].message.content;
  
  try {
    let cleanContent = content.trim();
    
    // Remove markdown code blocks if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(cleanContent);
    
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
    } else {
      console.error(`Invalid AI response for ${type}:`, content);
      return [];
    }
  } catch (error) {
    console.error(`Failed to parse AI ${type}:`, content);
    return [];
  }
}