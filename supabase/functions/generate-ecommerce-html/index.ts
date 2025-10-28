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

  // ✅ USAR 100% DOS BENEFÍCIOS EXISTENTES SE JÁ CADASTRADOS
  if (product.benefits && Array.isArray(product.benefits) && product.benefits.length > 0) {
    console.log(`✅ Usando ${product.benefits.length} benefícios cadastrados (100%)`);
    return product.benefits;
  }

  // ❌ Se não houver benefícios, gerar com IA
  const prompt = `Analise o seguinte produto e gere EXATAMENTE 5 benefícios objetivos para descrição de e-commerce:

Produto: ${product.name}
Descrição: ${product.description || 'N/A'}
Categoria: ${product.category || 'N/A'}
${product.applications ? `Aplicações: ${product.applications}` : ''}
${product.sales_pitch ? `Pitch de Vendas: ${product.sales_pitch}` : ''}
${product.target_audience && product.target_audience.length > 0 ? `Público-Alvo: ${product.target_audience.join(', ')}` : ''}

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

function isURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildPackagingInfo(product: any): string {
  const dimensions = [];
  
  // Coletar dimensões existentes
  if (product.height) dimensions.push(`<strong>Altura:</strong> ${product.height} cm`);
  if (product.width) dimensions.push(`<strong>Largura:</strong> ${product.width} cm`);
  if (product.depth) dimensions.push(`<strong>Profundidade:</strong> ${product.depth} cm`);
  
  // Montar HTML com dimensões e package_size
  let html = '<p style="margin: 0 0 10px 0; line-height: 1.5;">';
  
  if (dimensions.length > 0) {
    html += `<span style="display: block; margin-bottom: 8px;">${dimensions.join(' × ')}</span>`;
  }
  
  // Adicionar package_size (se existir) abaixo das dimensões
  if (product.package_size) {
    html += `<span style="display: block; color: #666;">${product.package_size}</span>`;
  } else if (dimensions.length === 0) {
    // Fallback apenas se não houver nem dimensões nem package_size
    html += '<span style="color: #999;">Informações de embalagem não disponíveis</span>';
  }
  
  html += '</p>';
  return html;
}

function buildEcommerceHTML(product: any, benefits: string[], options: any): string {
  // ✅ ENRIQUECER DESCRIÇÃO COM KEYWORDS E TARGET AUDIENCE (SEM DUPLICAÇÕES)
  let enrichedDescription = product.description || '';
  
  // Adicionar keywords de mercado contextualmente (primeiras 5)
  if (product.market_keywords && Array.isArray(product.market_keywords) && product.market_keywords.length > 0) {
    const keywordsText = product.market_keywords.slice(0, 5).join(', ');
    enrichedDescription += `\n\nPalavras-chave: ${keywordsText}`;
  }
  
  // Adicionar público-alvo contextualmente
  if (product.target_audience && Array.isArray(product.target_audience) && product.target_audience.length > 0) {
    const audienceText = product.target_audience.join(', ');
    enrichedDescription += `\n\nIdeal para: ${audienceText}`;
  }

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
  
  // ✅ Iniciar com <section> (SEM DOCTYPE/HTML/HEAD/BODY)
  let html = `<section style="font-family: 'Roboto', Arial, sans-serif; color: #333; line-height: 1.6;">
<h1 style="color: #2c3e50; font-size: 2em; font-weight: 700; text-align: center; margin-bottom: 20px;">${product.name}</h1>
<div style="font-size: 1.05em; text-align: justify; margin-bottom: 25px; color: #555; white-space: pre-wrap;">${enrichedDescription}</div>`;

  // ✅ Benefícios IA (inline styles)
  if (options.includeBenefits && benefits.length > 0) {
    html += `
<div style="background-color: #f8f9fb; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
  <h2 style="color: #2c3e50; font-size: 1.4em; margin-bottom: 10px; margin-top: 0;">💡 Principais Benefícios</h2>
  <ul style="list-style: none; padding: 0; margin: 0;">
    ${benefits.map(b => `<li style="padding: 8px 0 8px 24px; position: relative;"><span style="color: #27ae60; font-weight: bold; position: absolute; left: 0;">✓</span>${b}</li>`).join('\n    ')}
  </ul>
</div>`;
  }

  // ✅ Especificações Técnicas (tabela 100% width inline)
  if (technicalSpecs.length > 0) {
    html += `
<h2 style="color: #2c3e50; font-size: 1.4em; margin-bottom: 10px;">🔧 Especificações Técnicas</h2>
<table style="width: 100%; border-collapse: collapse; font-size: 0.95em; margin-bottom: 25px;">
  <thead>
    <tr style="background-color: #34495e; color: white;">
      <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Especificação</th>
      <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Valor</th>
    </tr>
  </thead>
  <tbody>
    ${technicalSpecs.map(spec => {
      const valueCell = isURL(spec.value)
        ? `<a href="${spec.value}" target="_blank" rel="noopener" style="display:inline-block; text-decoration:none;">
             <span style="background:#ffffff; color:#3498db; border:1px solid #3498db; padding:6px 10px; border-radius:6px; font-weight:600;">📥 Download</span>
           </a>`
        : spec.value;
      return `<tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${spec.label}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${valueCell}</td>
      </tr>`;
    }).join('\n    ')}
  </tbody>
</table>`;
  }

  // ✅ Cards Empilhados (sem CSS Grid, inline styles)
  html += `
<h2 style="color: #2c3e50; font-size: 1.4em; margin-bottom: 10px;">📦 Recursos e Informações</h2>
<div style="margin: 20px 0;">
  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #fff; margin-bottom: 15px;">
    <h3 style="margin-top: 0; color: #2c3e50; font-size: 1.2em;">📋 Aplicações</h3>
    <p style="margin: 0; line-height: 1.5; white-space: pre-wrap;">${product.applications || '<em style="color: #999;">Nenhuma informação de aplicação cadastrada. Preencha o campo "Aplicações do Produto" no editor para exibir aqui.</em>'}</p>
  </div>
  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #fff; margin-bottom: 15px;">
    <h3 style="margin-top: 0; color: #2c3e50; font-size: 1.2em;">📦 Embalagem</h3>
    ${buildPackagingInfo(product)}
  </div>`;
  
  html += `
</div>`;

  // ✅ FAQ (details/summary inline)
  if (faq.length > 0) {
    html += `
<h2 style="color: #2c3e50; font-size: 1.4em; margin-bottom: 10px;">❓ Perguntas Frequentes</h2>`;
    faq.forEach(item => {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold;">${item.question}</summary>
  <p style="padding: 10px 12px; margin: 0; line-height: 1.6;">${item.answer}</p>
</details>`;
    });
  }

  // ✅ Coleções de Vídeos (details/summary inline)
  if (hasVideos) {
    html += `
<h2 style="color: #2c3e50; font-size: 1.4em; margin-bottom: 10px;">🎥 Recursos de Vídeo</h2>`;
    
    if (videoCollections.youtube.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold;">
    Vídeos YouTube<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.youtube.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.youtube.map((v, i) => `<div style="margin: 8px 0;">• <a href="${v.url}" target="_blank" rel="noopener" style="color: #3498db; text-decoration: none;">Vídeo ${i + 1}</a></div>`).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.instagram.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold;">
    Vídeos Instagram<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.instagram.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.instagram.map((v, i) => `<div style="margin: 8px 0;">• <a href="${v.url}" target="_blank" rel="noopener" style="color: #3498db; text-decoration: none;">Vídeo ${i + 1}</a></div>`).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.testimonials.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold;">
    Depoimentos em Vídeo<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.testimonials.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.testimonials.map((v, i) => `<div style="margin: 8px 0;">• <a href="${v.url}" target="_blank" rel="noopener" style="color: #3498db; text-decoration: none;">Depoimento ${i + 1}</a></div>`).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.technical.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold;">
    Explicações Técnicas<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.technical.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.technical.map((v, i) => `<div style="margin: 8px 0;">• <a href="${v.url}" target="_blank" rel="noopener" style="color: #3498db; text-decoration: none;">Explicação ${i + 1}</a></div>`).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.tiktok.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold;">
    Vídeos TikTok<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.tiktok.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.tiktok.map((v, i) => `<div style="margin: 8px 0;">• <a href="${v.url}" target="_blank" rel="noopener" style="color: #3498db; text-decoration: none;">Vídeo ${i + 1}</a></div>`).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.tutorials.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold;">
    Tutoriais do Produto<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.tutorials.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.tutorials.map((t, i) => `<div style="margin: 8px 0;">• <a href="${t.course_url}" target="_blank" rel="noopener" style="color: #3498db; text-decoration: none;">Tutorial ${i + 1}</a></div>`).join('\n    ')}
  </div>
</details>`;
    }
  }

  // ✅ CTA Final (gradiente inline)
  html += `
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
  <h2 style="color: white; margin-top: 0; font-size: 1.5em;">Parametrize a sua impressora</h2>
  <p style="margin: 15px 0; line-height: 1.6;">Utilize nosso seletor de parâmetros, parâmetros e indicações para que sua impressão seja perfeita</p>
  <a href="https://parametros.smartdent.com.br/" target="_blank" rel="noopener noreferrer" style="background: white; color: #667eea; padding: 15px 40px; border-radius: 50px; text-decoration: none; display: inline-block; font-weight: bold; margin-top: 10px;">Parametrize sua Impressora</a>
</div>

</section>`;

  return html;
}
