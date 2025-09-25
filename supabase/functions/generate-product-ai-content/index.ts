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
  forceRegenerate?: boolean;
  complementOnly?: boolean;
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
        console.log(`Processing AI content for product: ${product.name}`);
        
        const updates: any = {};
        let needsUpdate = false;

        // Smart merge for benefits
        const shouldGenerateBenefits = request.forceRegenerate || 
          !product.ai_generated_benefits || 
          (product.benefits && product.benefits.length === 0);
          
        if (shouldGenerateBenefits) {
          const existingBenefits = product.benefits || [];
          const newBenefits = await generateProductBenefits(deepSeekApiKey, product, existingBenefits, request.complementOnly);
          
          if (newBenefits && newBenefits.length > 0) {
            updates.benefits = request.complementOnly ? [...existingBenefits, ...newBenefits] : newBenefits;
            updates.ai_generated_benefits = true;
            needsUpdate = true;
          }
        }

        // Smart merge for keywords
        const shouldGenerateKeywords = request.forceRegenerate || 
          !product.ai_generated_keywords || 
          (product.keywords && product.keywords.length === 0);
          
        if (shouldGenerateKeywords) {
          const existingKeywords = product.keywords || [];
          const newKeywords = await generateProductKeywords(deepSeekApiKey, product, existingKeywords, request.complementOnly);
          
          if (newKeywords && newKeywords.length > 0) {
            updates.keywords = request.complementOnly ? [...existingKeywords, ...newKeywords] : newKeywords;
            updates.ai_generated_keywords = true;
            needsUpdate = true;
          }
        }

        // Smart merge for features
        const shouldGenerateFeatures = request.forceRegenerate || 
          !product.features || 
          product.features.length === 0;
          
        if (shouldGenerateFeatures) {
          const existingFeatures = product.features || [];
          const newFeatures = await generateProductFeatures(deepSeekApiKey, product, existingFeatures, request.complementOnly);
          
          if (newFeatures && newFeatures.length > 0) {
            updates.features = request.complementOnly ? [...existingFeatures, ...newFeatures] : newFeatures;
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
          error: (productError as Error).message
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
      error: (error as Error).message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateProductBenefits(apiKey: string, product: any, existingBenefits: string[] = [], complementOnly: boolean = false): Promise<string[]> {
  const existingContext = existingBenefits.length > 0 ? 
    `\n\nDADOS MANUAIS EXISTENTES (NÃO DUPLICAR): ${existingBenefits.join(', ')}` : '';
  
  const instruction = complementOnly && existingBenefits.length > 0 ? 
    'Gere APENAS 3 benefícios complementares que NÃO duplicem os existentes e preencham lacunas identificadas:' :
    'Gere APENAS um array JSON com 3-5 benefícios específicos, objetivos e focados no valor para o cliente:';
  
  const prompt = `Analise o seguinte produto e gere uma lista de benefícios específicos PRIORIZANDO CATEGORIA/SUBCATEGORIA:${existingContext}

Produto: ${product.name}
Descrição: ${product.description || 'Não informada'}
Categoria: ${product.category || 'Não informada'}
Subcategoria: ${product.subcategory || 'Não informada'}
Preço: ${product.price ? `${product.currency || 'BRL'} ${product.price}` : 'Não informado'}

${instruction}

["benefício 1", "benefício 2", "benefício 3"]

INSTRUÇÕES CRÍTICAS PARA CATEGORIAS:
1. **Destaque benefícios específicos da categoria/subcategoria**
2. **Conecte benefícios com a taxonomia do produto**
3. **Use categoria como contexto principal dos benefícios**

Foque em:
- Resultados práticos específicos da categoria/subcategoria
- Soluções para problemas da categoria
- Vantagens competitivas dentro da categoria
- Economia de tempo/dinheiro específica da categoria
- Qualidade e confiabilidade da categoria`;

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

async function generateProductKeywords(apiKey: string, product: any, existingKeywords: string[] = [], complementOnly: boolean = false): Promise<string[]> {
  const existingContext = existingKeywords.length > 0 ? 
    `\n\nPALAVRAS-CHAVE MANUAIS EXISTENTES (NÃO DUPLICAR): ${existingKeywords.join(', ')}` : '';
  
  const instruction = complementOnly && existingKeywords.length > 0 ? 
    'Gere APENAS 3 palavras-chave complementares que NÃO duplicem as existentes:' :
    'Gere APENAS um array JSON com 8-12 palavras-chave relevantes:';
  
  const prompt = `Analise o seguinte produto e gere palavras-chave para SEO e marketing PRIORIZANDO CATEGORIA/SUBCATEGORIA:${existingContext}

Produto: ${product.name}
Descrição: ${product.description || 'Não informada'}
Categoria: ${product.category || 'Não informada'}
Subcategoria: ${product.subcategory || 'Não informada'}
Público-alvo: ${product.target_audience || 'Não informado'}

${instruction}

["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"]

INSTRUÇÕES CRÍTICAS PARA CATEGORIAS:
1. **PRIORIZE categoria e subcategoria como palavras-chave primárias**
2. **Gere variações da categoria (plural, singular, sinônimos)**
3. **Combine categoria + subcategoria + nome do produto**

Inclua NESTA ORDEM DE PRIORIDADE:
1. Categoria e subcategoria (primárias)
2. Variações e sinônimos das categorias
3. Categoria + subcategoria + benefícios
4. Palavras-chave long-tail com categorias
5. Termos técnicos da categoria
6. Categoria + público-alvo`;

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

async function generateProductFeatures(apiKey: string, product: any, existingFeatures: string[] = [], complementOnly: boolean = false): Promise<string[]> {
  const existingContext = existingFeatures.length > 0 ? 
    `\n\nCARACTERÍSTICAS MANUAIS EXISTENTES (NÃO DUPLICAR): ${existingFeatures.join(', ')}` : '';
  
  const instruction = complementOnly && existingFeatures.length > 0 ? 
    'Gere APENAS 3 características complementares que NÃO duplicem as existentes:' :
    'Gere APENAS um array JSON com 4-6 características específicas:';
  
  const prompt = `Analise o seguinte produto e gere características técnicas e funcionais CONTEXTUALIZADAS PELA CATEGORIA:${existingContext}

Produto: ${product.name}
Descrição: ${product.description || 'Não informada'}
Categoria: ${product.category || 'Não informada'}
Subcategoria: ${product.subcategory || 'Não informada'}

${instruction}

["característica 1", "característica 2", "característica 3"]

INSTRUÇÕES PARA CATEGORIAS:
1. **Mencione características relevantes da categoria**
2. **Contextualize recursos dentro da subcategoria**

Foque em:
- Especificações técnicas da categoria
- Funcionalidades específicas da subcategoria
- Materiais e componentes típicos da categoria
- Dimensões ou capacidades padrão da categoria
- Compatibilidades dentro da categoria
- Certificações ou padrões da categoria/subcategoria`;

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