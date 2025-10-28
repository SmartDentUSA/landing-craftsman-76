import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateEcommerceRequest {
  productId: string;
  options: {
    includeBenefits: boolean;
    includeFAQ: boolean;
    includeVideoCollections: boolean;
    faqLimit: number;
    regenerateBenefits: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🛒 [E-commerce Generator] Iniciando geração de HTML...');

  try {
    const { productId, options } = await req.json() as GenerateEcommerceRequest;
    
    // VALIDAÇÃO DE ENTRADA
    if (!productId || typeof productId !== 'string') {
      console.error('❌ productId inválido ou ausente');
      throw new Error('productId é obrigatório e deve ser uma string');
    }
    
    if (!options || typeof options !== 'object') {
      console.error('❌ options inválido');
      throw new Error('options deve ser um objeto');
    }
    
    console.log(`📦 Product ID: ${productId}`);
    console.log(`⚙️ Options:`, JSON.stringify(options, null, 2));
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // 1. Buscar produto
    console.log('🔍 Buscando produto no banco...');
    const { data: product, error: fetchError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (fetchError) {
      console.error('❌ Erro ao buscar produto:', fetchError);
      throw fetchError;
    }
    
    if (!product) {
      console.error('❌ Produto não encontrado');
      throw new Error(`Produto com ID ${productId} não existe`);
    }
    
    console.log(`✅ Produto encontrado: ${product.name}`);
    console.log(`📊 Dados do produto:`, {
      id: product.id,
      name: product.name,
      category: product.category,
      hasTechnicalSpecs: !!product.technical_specifications,
      specsCount: Array.isArray(product.technical_specifications) ? product.technical_specifications.length : 0,
      hasFAQ: !!product.faq,
      faqCount: Array.isArray(product.faq) ? product.faq.length : 0,
      hasYouTubeVideos: !!product.youtube_videos?.length,
      hasInstagramVideos: !!product.instagram_videos?.length
    });
    
    // 2. Gerar benefícios via IA (se necessário)
    let generatedBenefits: string[] = [];
    try {
      if (options.regenerateBenefits || !product.ecommerce_html?.generated_benefits) {
        console.log('🤖 Gerando benefícios com IA...');
        generatedBenefits = await generateBenefitsWithAI(product);
        console.log(`✅ Benefícios gerados: ${generatedBenefits.length} itens`, generatedBenefits);
      } else {
        console.log('♻️ Usando benefícios existentes');
        generatedBenefits = product.ecommerce_html.generated_benefits;
      }
    } catch (aiError) {
      console.error('⚠️ Erro ao gerar benefícios com IA:', aiError);
      console.log('📝 Usando benefícios existentes como fallback');
      generatedBenefits = product.ecommerce_html?.generated_benefits || product.benefits || [];
    }
    
    // 3. Montar HTML
    console.log('🏗️ Construindo HTML com:', {
      productName: product.name,
      benefitsCount: generatedBenefits.length,
      technicalSpecsCount: Array.isArray(product.technical_specifications) ? product.technical_specifications.length : 0,
      faqCount: Array.isArray(product.faq) ? product.faq.length : 0,
      options
    });
    const htmlContent = buildEcommerceHTML(product, generatedBenefits, options);
    console.log(`✅ HTML gerado: ${htmlContent.length} caracteres`);
    
    // 4. Salvar no banco
    console.log('💾 Salvando no banco de dados...');
    const ecommerceData = {
      html_content: htmlContent,
      generated_at: new Date().toISOString(),
      generated_benefits: generatedBenefits,
      generation_options: options,
      ai_model_used: 'deepseek-chat',
      version: (product.ecommerce_html?.version || 0) + 1
    };
    
    const { error: updateError } = await supabase
      .from('products_repository')
      .update({ ecommerce_html: ecommerceData })
      .eq('id', productId);
    
    if (updateError) {
      console.error('❌ Erro ao salvar no banco:', updateError);
      throw updateError;
    }
    
    console.log('✅ HTML salvo com sucesso!');
    console.log(`📊 Versão: ${ecommerceData.version}`);
    
    // 5. Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        html_content: htmlContent,
        metadata: ecommerceData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ [ERRO CRÍTICO] Falha ao gerar e-commerce HTML:', error);
    console.error('Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateBenefitsWithAI(product: any): Promise<string[]> {
  const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!deepSeekApiKey) {
    console.warn('⚠️ DEEPSEEK_API_KEY não configurada, usando benefits existentes');
    return product.benefits || [];
  }

  const prompt = `Analise o seguinte produto e gere EXATAMENTE 5 benefícios objetivos para descrição de e-commerce:

Produto: ${product.name}
Descrição: ${product.description || 'N/A'}
Categoria: ${product.category || 'N/A'}

Retorne APENAS o array JSON puro sem markdown:
["benefício 1", "benefício 2", "benefício 3", "benefício 4", "benefício 5"]`;

  console.log('🔑 API Key presente, chamando Deepseek...');
  
  try {
    // Timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepSeekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Você extrai dados e retorna APENAS JSON puro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Deepseek API erro ${response.status}:`, errorText);
      throw new Error(`Deepseek API retornou status ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 Resposta da API recebida');
    
    const content = data.choices?.[0]?.message?.content || '[]';
    console.log('📝 Conteúdo bruto:', content.substring(0, 200));
    
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    if (!Array.isArray(parsed)) {
      console.warn('⚠️ Resposta não é um array, usando fallback');
      return product.benefits || [];
    }
    
    console.log(`✅ ${parsed.length} benefícios parseados com sucesso`);
    return parsed.slice(0, 5);
    
  } catch (error) {
    console.error('❌ Erro ao chamar Deepseek API:', error);
    console.log('♻️ Usando benefits existentes como fallback');
    return product.benefits || [];
  }
}

function buildEcommerceHTML(product: any, benefits: string[], options: any): string {
  const faq = options.includeFAQ && product.faq ? product.faq.slice(0, options.faqLimit) : [];
  const technicalSpecs = product.technical_specifications || [];
  
  // Coletar vídeos por categoria
  const videoCollections = {
    youtube: product.youtube_videos || [],
    instagram: product.instagram_videos || [],
    testimonials: product.testimonial_videos || [],
    technical: product.technical_videos || [],
    tiktok: product.tiktok_videos || [],
    tutorials: product.tutorial_resources?.tutorials || []
  };
  
  const hasVideos = options.includeVideoCollections && Object.values(videoCollections).some((v: any) => v.length > 0);
  
  // Construir HTML
  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${product.name}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 2em; color: #2c3e50; margin-bottom: 0.5em; }
    .short-description { font-size: 1.1em; color: #555; margin-bottom: 1.5em; }
    .benefits { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .benefits h2 { color: #2c3e50; margin-top: 0; }
    .benefits ul { list-style: none; padding: 0; }
    .benefits li { padding: 8px 0; padding-left: 24px; position: relative; }
    .benefits li:before { content: "✓"; color: #27ae60; font-weight: bold; position: absolute; left: 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #34495e; color: white; }
    .cards-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #fff; }
    .card h3 { margin-top: 0; color: #2c3e50; }
    .card a { color: #3498db; text-decoration: none; }
    .card a:hover { text-decoration: underline; }
    details { margin: 10px 0; }
    summary { cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold; }
    summary:hover { background: #d5dbdb; }
    .video-list { margin: 10px 0 10px 20px; }
    .video-item { margin: 8px 0; }
    .badge { background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px; }
    .final-cta { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; }
    .final-cta h2 { color: white; margin-top: 0; }
    .final-cta a { background: white; color: #667eea; padding: 15px 40px; border-radius: 50px; text-decoration: none; display: inline-block; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${product.name}</h1>
  <p class="short-description">${product.description || ''}</p>`;

  // Benefícios IA
  if (options.includeBenefits && benefits.length > 0) {
    html += `
  <div class="benefits">
    <h2>Principais Benefícios</h2>
    <ul>
      ${benefits.map(b => `<li>${b}</li>`).join('\n      ')}
    </ul>
  </div>`;
  }

  // Especificações Técnicas
  if (technicalSpecs.length > 0) {
    html += `
  <h2>Especificações Técnicas</h2>
  <table>
    <thead>
      <tr><th>Especificação</th><th>Valor</th></tr>
    </thead>
    <tbody>
      ${technicalSpecs.map(spec => `<tr><td>${spec.label}</td><td>${spec.value}</td></tr>`).join('\n      ')}
    </tbody>
  </table>`;
  }

  // Cards: Aplicações + Embalagem + Documentos
  html += `
  <h2>Recursos e Informações</h2>
  <div class="cards-container">
    <div class="card">
      <h3>📋 Aplicações</h3>
      <p>Este produto é ideal para ${product.category || 'diversas aplicações'}.</p>
    </div>
    <div class="card">
      <h3>📦 Embalagem</h3>
      <p>${product.package_size || 'Embalagem padrão'}</p>
    </div>`;
  
  if (product.resource_cta2?.visible || product.resource_cta3?.visible) {
    html += `
    <div class="card">
      <h3>📄 Documentos</h3>`;
    if (product.resource_cta2?.visible) {
      html += `<p><a href="${product.resource_cta2.url}" target="_blank" rel="noopener">${product.resource_cta2.label}</a></p>`;
    }
    if (product.resource_cta3?.visible) {
      html += `<p><a href="${product.resource_cta3.url}" target="_blank" rel="noopener">${product.resource_cta3.label}</a></p>`;
    }
    html += `
    </div>`;
  }
  
  html += `
  </div>`;

  // FAQ
  if (faq.length > 0) {
    html += `
  <h2>Perguntas Frequentes</h2>`;
    faq.forEach(item => {
      html += `
  <details>
    <summary>${item.question}</summary>
    <p>${item.answer}</p>
  </details>`;
    });
  }

  // Coleções de Vídeos
  if (hasVideos) {
    html += `
  <h2>Recursos de Vídeo</h2>`;
    
    if (videoCollections.youtube.length > 0) {
      html += `
  <details>
    <summary>Vídeos YouTube<span class="badge">${videoCollections.youtube.length}</span></summary>
    <div class="video-list">
      ${videoCollections.youtube.map(v => `<div class="video-item">• <a href="${v.url}" target="_blank" rel="noopener">${v.description}</a></div>`).join('\n      ')}
    </div>
  </details>`;
    }
    
    if (videoCollections.instagram.length > 0) {
      html += `
  <details>
    <summary>Vídeos Instagram<span class="badge">${videoCollections.instagram.length}</span></summary>
    <div class="video-list">
      ${videoCollections.instagram.map(v => `<div class="video-item">• <a href="${v.url}" target="_blank" rel="noopener">${v.description}</a></div>`).join('\n      ')}
    </div>
  </details>`;
    }
    
    if (videoCollections.testimonials.length > 0) {
      html += `
  <details>
    <summary>Depoimentos em Vídeo<span class="badge">${videoCollections.testimonials.length}</span></summary>
    <div class="video-list">
      ${videoCollections.testimonials.map(v => `<div class="video-item">• <a href="${v.url}" target="_blank" rel="noopener">${v.description}</a></div>`).join('\n      ')}
    </div>
  </details>`;
    }
    
    if (videoCollections.technical.length > 0) {
      html += `
  <details>
    <summary>Explicações Técnicas<span class="badge">${videoCollections.technical.length}</span></summary>
    <div class="video-list">
      ${videoCollections.technical.map(v => `<div class="video-item">• <a href="${v.url}" target="_blank" rel="noopener">${v.description}</a></div>`).join('\n      ')}
    </div>
  </details>`;
    }
    
    if (videoCollections.tiktok.length > 0) {
      html += `
  <details>
    <summary>Vídeos TikTok<span class="badge">${videoCollections.tiktok.length}</span></summary>
    <div class="video-list">
      ${videoCollections.tiktok.map(v => `<div class="video-item">• <a href="${v.url}" target="_blank" rel="noopener">${v.description}</a></div>`).join('\n      ')}
    </div>
  </details>`;
    }
    
    if (videoCollections.tutorials.length > 0) {
      html += `
  <details>
    <summary>Tutoriais do Produto<span class="badge">${videoCollections.tutorials.length}</span></summary>
    <div class="video-list">
      ${videoCollections.tutorials.map(t => `<div class="video-item">• <a href="${t.course_url}" target="_blank" rel="noopener">${t.course_name}</a></div>`).join('\n      ')}
    </div>
  </details>`;
    }
  }

  // CTA Final
  html += `
  <div class="final-cta">
    <h2>Parametrize a sua impressora</h2>
    <p>Utilize nosso seletor de parâmetros, parâmetros e indicações para que sua impressão seja perfeita</p>
    ${product.product_url ? `<a href="${product.product_url}" target="_blank" rel="noopener">Parametrize sua Impressora</a>` : '<p>Link de produto não configurado</p>'}
  </div>

</body>
</html>`;

  return html;
}
