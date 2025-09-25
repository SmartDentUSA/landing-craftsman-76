import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Generate Product Blog - Starting request');
    
    const { productId, blogType } = await req.json();
    
    if (!productId || !blogType) {
      throw new Error('productId e blogType são obrigatórios');
    }

    if (!['commercial', 'technical'].includes(blogType)) {
      throw new Error('blogType deve ser "commercial" ou "technical"');
    }

    // Configurar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📦 Fetching product data for ID: ${productId}`);
    
    // Buscar dados do produto
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error(`Produto não encontrado: ${productError?.message}`);
    }

    console.log(`✅ Product found: ${product.name}`);

    // Buscar perfil da empresa para contexto adicional
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    // Gerar blog com IA
    const blogContent = await generateProductBlog(deepSeekApiKey, product, companyProfile, blogType);
    
    // Atualizar produto com o novo blog
    const updatedBlogContent = {
      ...product.individual_blog_content,
      [blogType]: blogContent,
      generated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('products_repository')
      .update({ individual_blog_content: updatedBlogContent })
      .eq('id', productId);

    if (updateError) {
      throw new Error(`Erro ao salvar blog: ${updateError.message}`);
    }

    console.log(`✅ Blog ${blogType} generated and saved for product: ${product.name}`);

    return new Response(JSON.stringify({
      success: true,
      productId,
      blogType,
      contentLength: blogContent.length,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in generate-product-blog:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateProductBlog(
  apiKey: string, 
  product: any, 
  companyProfile: any, 
  blogType: 'commercial' | 'technical'
): Promise<string> {
  
  const prompts = {
    commercial: {
      role: "Você é um especialista em marketing digital e copywriting comercial para produtos odontológicos.",
      objective: "Criar um blog post comercial persuasivo que destaque os benefícios do produto e incentive a compra.",
      structure: `
# ${product.name}: [Título Comercial Atrativo]

## Por que Escolher o ${product.name}?
[Benefícios principais que resolvem problemas específicos]

## Principais Vantagens
[Lista dos benefícios mais importantes]

## Especificações Técnicas Relevantes
[Características técnicas que importam para o cliente]

## Como Este Produto Vai Transformar Seu Consultório
[Casos de uso práticos e resultados esperados]

## Garantia e Suporte
[Informações sobre garantia, suporte e pós-venda]

## Adquira Agora
[Call-to-action persuasivo]`
    },
    technical: {
      role: "Você é um especialista técnico em equipamentos odontológicos e engenharia biomédica.",
      objective: "Criar um blog post técnico detalhado sobre o funcionamento, especificações e aplicações profissionais do produto.",
      structure: `
# ${product.name}: Análise Técnica Completa

## Introdução Técnica
[Apresentação técnica do produto e sua função]

## Especificações Técnicas Detalhadas
[Características técnicas precisas e medições]

## Tecnologia e Funcionamento
[Como o produto funciona tecnicamente]

## Aplicações Clínicas
[Usos específicos na prática odontológica]

## Comparativo Técnico
[Vantagens técnicas em relação a outros produtos]

## Instalação e Manutenção
[Requisitos técnicos e cuidados necessários]

## Conclusão Técnica
[Avaliação técnica final do produto]`
    }
  };

  const currentPrompt = prompts[blogType];
  
  // Preparar dados do produto
  const productData = {
    name: product.name,
    description: product.description || '',
    category: product.category || '',
    subcategory: product.subcategory || '',
    price: product.price ? `${product.currency || 'BRL'} ${product.price}` : '',
    keywords: Array.isArray(product.keywords) ? product.keywords.join(', ') : '',
    benefits: Array.isArray(product.benefits) ? product.benefits.join(', ') : '',
    features: Array.isArray(product.features) ? product.features.join(', ') : '',
    salesPitch: product.sales_pitch || ''
  };

  const companyData = companyProfile ? {
    name: companyProfile.company_name || '',
    description: companyProfile.company_description || '',
    mission: companyProfile.mission_statement || '',
    values: companyProfile.brand_values || ''
  } : null;

  const systemPrompt = `${currentPrompt.role}

OBJETIVO: ${currentPrompt.objective}

DADOS DO PRODUTO:
- Nome: ${productData.name}
- Descrição: ${productData.description}
- Categoria: ${productData.category}
- Subcategoria: ${productData.subcategory}
- Preço: ${productData.price}
- Keywords: ${productData.keywords}
- Benefícios: ${productData.benefits}
- Características: ${productData.features}
- Pitch de Vendas: ${productData.salesPitch}

${companyData ? `DADOS DA EMPRESA:
- Nome: ${companyData.name}
- Descrição: ${companyData.description}
- Missão: ${companyData.mission}
- Valores: ${companyData.values}` : ''}

ESTRUTURA OBRIGATÓRIA:
${currentPrompt.structure}

INSTRUÇÕES ESPECÍFICAS:
1. Use APENAS as informações fornecidas sobre o produto
2. Mantenha um tom ${blogType === 'commercial' ? 'persuasivo e orientado a vendas' : 'técnico e informativo'}
3. Inclua naturalmente as keywords do produto no texto
4. O blog deve ter entre 800-1200 palavras
5. Use subtítulos em markdown (##, ###)
6. Inclua listas quando apropriado
7. ${blogType === 'commercial' ? 'Foque nos benefícios e resultados para o cliente' : 'Foque em especificações técnicas e funcionamento'}
8. NÃO invente informações que não estão nos dados fornecidos
9. Use formato markdown limpo e profissional

Gere o blog post completo agora:`;

  console.log(`🤖 Generating ${blogType} blog for product: ${product.name}`);

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Gere um blog ${blogType} completo para o produto ${product.name}` }
      ],
      max_tokens: 2500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Erro na API DeepSeek: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const blogContent = data.choices[0]?.message?.content;

  if (!blogContent) {
    throw new Error('Resposta vazia da API DeepSeek');
  }

  console.log(`✅ Blog content generated: ${blogContent.length} characters`);
  
  return blogContent.trim();
}