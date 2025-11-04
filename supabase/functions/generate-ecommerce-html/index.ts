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
    forceSpinStyles?: boolean;
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
    
    // 1.5. Buscar perfil da empresa (FASE 2)
    console.log('🏢 Buscando perfil da empresa...');
    const { data: companyProfile, error: companyError } = await supabase
      .from('company_profile')
      .select(`
        company_name,
        company_description,
        company_logo_url,
        mission_statement,
        vision_statement,
        differentiators,
        founded_year,
        website_url,
        contact_phone,
        location,
        youtube_company_footer
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (companyError) {
      console.warn('⚠️ Erro ao buscar company_profile:', companyError);
    }

    if (companyProfile) {
      console.log(`✅ Perfil da empresa carregado: ${companyProfile.company_name}`);
    } else {
      console.warn('⚠️ Nenhum perfil de empresa cadastrado');
    }
    
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
    const htmlContent = buildEcommerceHTML(product, generatedBenefits, options, companyProfile);
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

/**
 * ✅ Detecta se HTML já está pré-formatado (validado anteriormente)
 * Previne duplicação de conteúdo ao re-empacotar HTML completo
 */
function isPreformattedHTML(html: string): boolean {
  if (!html) return false;
  return /<(section|html|body)\b/i.test(html);
}

/**
 * 🎨 SPIN Design System CSS - Injetado no fragmento HTML
 */
function getSpinStylesCSS(): string {
  return `<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  
  .spin-ecom {
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    color: #333333;
    line-height: 1.6;
  }
  
  .spin-ecom h1 {
    color: #3E4B5E;
    font-weight: 800;
    letter-spacing: -0.8px;
    margin-bottom: 1.5rem;
  }
  
  .spin-ecom h2 {
    color: #3E4B5E;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-top: 2rem;
    margin-bottom: 1rem;
  }
  
  .spin-ecom h3,
  .spin-ecom h4 {
    color: #3E4B5E;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  
  .spin-ecom a {
    color: #EE7A3E;
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s;
  }
  
  .spin-ecom a:hover {
    opacity: 0.8;
  }
  
  .spin-ecom .badge {
    background: #EE7A3E;
    color: white;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 0.85em;
    font-weight: 600;
  }
  
  .spin-ecom .panel {
    background: #f8fafc;
    border-radius: 10px;
    padding: 20px;
    margin: 1rem 0;
  }
  
  .spin-ecom table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .spin-ecom table th {
    background: linear-gradient(135deg, #3E4B5E 0%, #2d3748 100%);
    color: white;
    font-weight: 700;
    padding: 12px 16px;
    text-align: left;
    border: none;
    letter-spacing: -0.3px;
  }

  .spin-ecom table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
    background: white;
    transition: background 0.2s;
  }
  
  .spin-ecom table tbody tr:hover td {
    background: #f8fafc !important;
  }
  
  /* SPIN Landing Page Tech Table Styles */
  .spin-ecom .tech-table-wrapper {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    border: 1px solid #e0e0e0;
    margin: 0 auto 25px auto;
    max-width: 1100px;
  }
  
  .spin-ecom .tech-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .spin-ecom .tech-table thead {
    background: linear-gradient(135deg, #3E4B5E 0%, #2a3442 100%);
  }
  
  .spin-ecom .tech-table th {
    padding: 1.5rem 1rem;
    text-align: left;
    font-weight: 700;
    font-size: 16px;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 3px solid #EE7A3E;
  }
  
  .spin-ecom .tech-table td {
    padding: 1.25rem 1rem;
    text-align: left;
    font-size: 15px;
    color: #333;
    border-bottom: 1px solid #e8e8e8;
    transition: background 0.2s;
  }
  
  .spin-ecom .tech-table tbody tr:hover {
    background: #f8f9fa;
  }
  
  .spin-ecom .tech-table tbody tr:last-child td {
    border-bottom: none;
  }
  
  .spin-ecom .tech-table td:nth-child(2) {
    background: linear-gradient(135deg, rgba(238, 122, 62, 0.08) 0%, rgba(255, 155, 103, 0.05) 100%);
    font-weight: 600;
    color: #3E4B5E;
  }
  
  .spin-ecom .tech-table tbody tr:hover td:nth-child(2) {
    background: linear-gradient(135deg, rgba(238, 122, 62, 0.12) 0%, rgba(255, 155, 103, 0.08) 100%);
  }
  
  .spin-ecom .check {
    color: #EE7A3E;
    font-weight: 700;
  }
  
  .spin-ecom ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }
  
  .spin-ecom li {
    margin: 0.5rem 0;
  }
  
  .spin-ecom p {
    margin: 1rem 0;
    line-height: 1.6;
    white-space: normal;
  }
  
  .spin-ecom strong {
    color: #3E4B5E;
    font-weight: 600;
  }
</style>`;
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

/**
 * ✅ FASE 2: Header com branding da empresa (logo + missão)
 */
function buildCompanyHeader(company: any): string {
  if (!company) return '';
  
  return `
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 20px; margin-bottom: 25px; border-radius: 8px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
  ${company.company_logo_url ? `
    <img 
      src="${company.company_logo_url}" 
      alt="Logo ${company.company_name}" 
      style="max-height: 60px; width: auto; background: white; padding: 8px; border-radius: 6px;"
    />
  ` : ''}
  <div style="flex: 1; color: white;">
    <h3 style="margin: 0; font-size: 1.2em; font-weight: 600;">${company.company_name}</h3>
    ${company.mission_statement ? `
      <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.95; line-height: 1.4;">
        ${company.mission_statement}
      </p>
    ` : ''}
    ${company.founded_year ? `
      <p style="margin: 5px 0 0 0; font-size: 0.85em; opacity: 0.85;">
        🏆 Desde ${company.founded_year}
      </p>
    ` : ''}
  </div>
</div>`;
}

/**
 * Gera alt text semântico a partir do nome do arquivo ou URL
 * Utiliza sanitização para criar descrições SEO-friendly
 */
function generateImageAlt(imageUrl: string, productName: string, index: number = 0): string {
  if (!imageUrl) return productName;
  
  // Extrai nome do arquivo da URL
  const fileName = imageUrl.split('/').pop() || '';
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  // Sanitiza o nome do arquivo (remove _-, caracteres especiais, capitaliza)
  let alt = nameWithoutExt
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/[^a-zA-Z0-9\sÀ-ÿ]/g, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Se o alt gerado estiver vazio ou muito curto, usa o nome do produto
  if (!alt || alt.length < 3) {
    alt = index === 0 ? productName : `${productName} - Imagem ${index + 1}`;
  }
  
  // Valida comprimento (máximo 125 chars para Google)
  if (alt.length > 125) {
    alt = alt.substring(0, 122) + '...';
  }
  
  return alt;
}

/**
 * Constrói galeria de imagens com miniaturas 80x80px no final do HTML
 */
function buildImageGallery(product: any): string {
  const images: string[] = [];
  
  // Adiciona imagem principal se existir
  if (product.image_url) {
    images.push(product.image_url);
  }
  
  // Adiciona imagens da galeria
  if (product.images_gallery && Array.isArray(product.images_gallery)) {
    product.images_gallery.forEach((img: any) => {
      const url = typeof img === 'string' ? img : img.url;
      if (url && !images.includes(url)) {
        images.push(url);
      }
    });
  }
  
  if (images.length === 0) {
    return '';
  }
  
  // ✅ MINIATURAS COMPACTAS (80x80px)
  let galleryHTML = `
<div style="margin: 20px 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
  <h3 style="color: #666; font-size: 0.95em; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">📎 Imagens Adicionais</h3>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">`;
  
  images.forEach((imageUrl, index) => {
    const alt = generateImageAlt(imageUrl, product.name, index);
    
    galleryHTML += `
    <div style="border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; background: #f9f9f9; width: 80px; height: 80px;">
      <img 
        src="${imageUrl}" 
        alt="${alt}"
        loading="lazy"
        style="width: 100%; height: 100%; display: block; object-fit: cover;"
      />
    </div>`;
  });
  
  galleryHTML += `
  </div>
</div>`;
  
  return galleryHTML;
}

// Truncate text to a maximum number of words
function truncateToWords(text: string, maxWords: number): string {
  if (!text || text.trim() === '') return '';
  
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  
  return words.slice(0, maxWords).join(' ') + '...';
}

// Generate Product Schema.org JSON-LD
function generateProductSchema(product: any): string {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || '',
    "sku": product.id,
    "image": product.image_url || (product.images_gallery?.[0] || ''),
    "brand": {
      "@type": "Brand",
      "name": product.brand || "Smartdent"
    }
  };

  // Add GTIN if available
  if (product.gtin) {
    schema.gtin = product.gtin;
  }

  // Add MPN if available
  if (product.mpn) {
    schema.mpn = product.mpn;
  }

  // Add category if available
  if (product.category) {
    schema.category = product.category;
  }

  // Add offers with price
  if (product.price || product.promo_price) {
    schema.offers = {
      "@type": "Offer",
      "priceCurrency": product.currency || "BRL",
      "price": (product.promo_price || product.price || 0).toString(),
      "availability": "https://schema.org/InStock",
      "url": product.product_url || ''
    };
  }

  // ✅ FASE 2: Adicionar variações como hasVariant
  if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
    schema.hasVariant = product.variations.map((v: any) => ({
      "@type": "Product",
      "name": `${product.name} - ${v.name}`,
      "sku": v.sku || `${product.id}-${v.name.toLowerCase().replace(/\s+/g, '-')}`,
      ...(v.price && {
        "offers": {
          "@type": "Offer",
          "priceCurrency": product.currency || "BRL",
          "price": v.price.toString(),
          "availability": (v.stock && v.stock > 0) 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock"
        }
      })
    }));
  }

  return JSON.stringify(schema, null, 2);
}

// Build SEO Head section with meta tags
function buildSEOHead(product: any): string {
  const title = product.seo_title_override || `${product.name} | Smartdent`;
  
  // ✅ Meta Description Otimizada: Keywords nos primeiros 160 caracteres
  let description = '';
  if (product.seo_description_override) {
    description = product.seo_description_override;
  } else {
    const primaryKeyword = (product.keywords?.[0] || product.market_keywords?.[0] || product.name);
    const secondaryKeyword = (product.keywords?.[1] || product.market_keywords?.[1] || '');
    const keywordsPrefix = `${primaryKeyword}${secondaryKeyword ? ' | ' + secondaryKeyword : ''}`;
    const maxDescLength = 155 - keywordsPrefix.length - 2;
    const truncatedDesc = (product.description || product.short_description || '').substring(0, maxDescLength);
    description = `${keywordsPrefix}: ${truncatedDesc}...`;
  }
  const canonicalUrl = product.canonical_url || product.product_url || '';
  const imageUrl = product.image_url || (product.images_gallery?.[0] || '');
  
  // ✅ FASE 2: Expandir keywords com search_intent e bot_trigger_words
  const keywords = [
    ...(product.keywords || []),
    ...(product.market_keywords || []),
    ...(product.search_intent_keywords || []),
    ...(product.bot_trigger_words || [])
  ]
    .filter(Boolean)
    .slice(0, 15)
    .join(', ');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
  <meta name="robots" content="index, follow">
  ${canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}">` : ''}
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
  ${canonicalUrl ? `<meta property="og:url" content="${canonicalUrl}">` : ''}
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Smartdent">
  ${product.price || product.promo_price ? `<meta property="product:price:amount" content="${product.promo_price || product.price}">` : ''}
  ${product.currency ? `<meta property="product:price:currency" content="${product.currency}">` : '<meta property="product:price:currency" content="BRL">'}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}
  
  <!-- Google Fonts Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Product Schema JSON-LD -->
  <script type="application/ld+json">
  ${generateProductSchema(product)}
  </script>
</head>
<body>`;
}

/**
 * 🧹 Remove HTML do Google Docs (spans, atributos data-*, inline styles)
 */
function cleanGoogleDocsHTML(html: string): string {
  if (!html) return '';
  
  return html
    // Remove comentários HTML
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove tags style e script
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove todos os <span> mantendo apenas o conteúdo
    .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
    // Remove tabelas HTML completas (incluindo contêineres de editores)
    .replace(/<div[^>]*class="[^"]*(?:_tableContainer|_tableWrapper|tableContainer|tableWrapper)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<table[\s\S]*?<\/table>/gi, '')
    // Remove tags <p> e <h2> do Google Docs (parseRichDescription recria)
    .replace(/<\/?p[^>]*>/gi, '\n')
    .replace(/<\/?h[1-6][^>]*>/gi, '\n')
    // Remove <ul>, <li>, <strong> do Google Docs
    .replace(/<\/?ul[^>]*>/gi, '\n')
    .replace(/<\/?ol[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?strong[^>]*>/gi, '')
    .replace(/<\/?em[^>]*>/gi, '')
    // Remove quebras <br /> ou <br> múltiplas
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove <hr> e <div> soltos que possam restar
    .replace(/<\/?:?hr[^>]*>/gi, '\n')
    .replace(/<\/?:?div[^>]*>/gi, '\n')
    // Remove atributos data-*, class, style
    .replace(/\s*data-[^=]*="[^"]*"/gi, '')
    .replace(/\s*class="[^"]*"/gi, '')
    .replace(/\s*style="[^"]*"/gi, '')
    // Substituir entidades HTML
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    // Remover quaisquer tags HTML restantes
    .replace(/<[^>]+>/g, '')
    // Remove espaços múltiplos em branco (mas preserva quebras de linha)
    .replace(/ {2,}/g, ' ')
    // Limpa quebras de linha múltiplas (máximo 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 🔍 Parse inteligente do description com formatação estruturada
 */
function parseRichDescription(text: string): string {
  if (!text) return '';
  
  // ✅ DUPLA PROTEÇÃO: Remover tags HTML antes do split
  text = text.replace(/<[^>]+>/g, '');
  
  let html = '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let inList = false;
  let bulletBuffer: string[] = [];
  
  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      html += '<ul style="list-style: none; padding: 0; margin: 15px 0;">';
      bulletBuffer.forEach(content => {
        html += `<li style="padding: 8px 0 8px 30px; position: relative; line-height: 1.6;"><span style="color: #EE7A3E; font-weight: 700; position: absolute; left: 0; font-size: 1.1em;">✓</span>${content}</li>`;
      });
      html += '</ul>';
      bulletBuffer = [];
    }
  };
  
  for (const line of lines) {
    // Detectar bullets (• ou -)
    if (/^[•\-]\s+/.test(line)) {
      const content = line.replace(/^[•\-]\s+/, '');
      bulletBuffer.push(content);
      continue;
    }
    
    // Se não é bullet, esvaziar buffer
    flushBullets();
    
    // Detectar títulos em MAIÚSCULAS
    if (line === line.toUpperCase() && line.length > 5 && !/^[0-9️⃣⏱🦷]/.test(line)) {
      html += `<h3 style="color: #3E4B5E; font-size: 1.25em; font-weight: 700; margin: 20px 0 10px 0; letter-spacing: -0.3px;">${line}</h3>`;
      continue;
    }
    
    // Detectar listas numeradas com emojis
    if (/^[0-9️⃣🔟]+\s*[–—-]\s*/.test(line)) {
      if (!inList) {
        html += '<ul style="list-style: none; padding: 0; margin: 15px 0;">';
        inList = true;
      }
      const content = line.replace(/^[0-9️⃣🔟]+\s*[–—-]\s*/, '');
      html += `<li style="padding: 8px 0 8px 30px; position: relative; line-height: 1.6;"><span style="color: #EE7A3E; font-weight: 700; position: absolute; left: 0; font-size: 1.1em;">✓</span>${content}</li>`;
      continue;
    }
    
    // Fechar lista numerada se aberta
    if (inList) {
      html += '</ul>';
      inList = false;
    }
    
    // Detectar tempo de impressão
    if (/^⏱️🦷/.test(line)) {
      const content = line.replace(/^⏱️🦷\s*/, '');
      html += `<div style="background: linear-gradient(135deg, rgba(238,122,62,0.08) 0%, rgba(255,155,103,0.05) 100%); padding: 12px 16px; border-radius: 8px; margin: 8px 0; border-left: 3px solid #EE7A3E;"><strong style="color: #3E4B5E;">⏱️ ${content}</strong></div>`;
      continue;
    }
    
    // Parágrafos normais
    html += `<p style="margin: 12px 0; line-height: 1.7; color: #333;">${line}</p>`;
  }
  
  // Esvaziar buffer final
  flushBullets();
  
  if (inList) {
    html += '</ul>';
  }
  
  return html;
}

function buildEcommerceHTML(product: any, benefits: string[], options: any, company: any): string {
  const desc = product.description || '';
  
  // ✅ SEMPRE REGENERAR (remover bypass de pré-formatado)
  console.log('🔄 Regenerando HTML com SPIN Design System (bypass desabilitado)');
  
  if (options.forceSpinStyles) {
    console.log('⚡ Forçando layout SPIN (override de pré-formatado ativo)');
  }
  
  console.log('🎨 Aplicando SPIN Design System ao HTML E-commerce');
  
  // ✅ LIMPAR HTML DO GOOGLE DOCS + ENRIQUECER DESCRIÇÃO
  let enrichedDescription = cleanGoogleDocsHTML(desc)
    .replace(/\n{3,}/g, '\n\n')  // Máximo 2 quebras consecutivas
    .trim();
  
  // 🧹 Remover seção duplicada de "Características Técnicas" do description
  enrichedDescription = enrichedDescription.replace(
    /<hr[^>]*>\s*<h3[^>]*>\s*<strong[^>]*>Características Técnicas<\/strong>\s*<\/h3>[\s\S]*?(<hr[^>]*>|$)/gi,
    ''
  );
  
  // 🧹 Remover títulos órfãos de seções técnicas que vinham antes das tabelas coladas
  enrichedDescription = enrichedDescription
    .replace(/📏[^\n<]*Propriedades[^\n<]*(\n|$)/gi, '')
    .replace(/Testes de Segurança[^\n<]*(\n|$)/gi, '')
    .replace(/Certificação & Conformidade[^\n<]*(\n|$)/gi, '')
    .replace(/Graças à sua composição[^\n<]*(\n|$)/gi, '');
  
  console.log('🧹 Sanitizando seção "Características Técnicas" duplicada do description');
  
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
  // ✅ FASE 3: Normalizar vídeos e adicionar youtube_company_footer como fallback
  const normalizeVideos = (videos: any[] = [], defaultDescription: string = '') => {
    return videos.map(v => {
      if (typeof v === 'string') {
        return { url: v, description: defaultDescription };
      }
      return { 
        ...v, 
        description: v.description || defaultDescription 
      };
    });
  };
  
  const videoDefaultDescription = company?.youtube_company_footer || product.sales_pitch || product.description || '';
  
  const videoCollections = {
    youtube: normalizeVideos(product.youtube_videos, videoDefaultDescription),
    instagram: normalizeVideos(product.instagram_videos, videoDefaultDescription),
    testimonials: normalizeVideos(product.testimonial_videos, videoDefaultDescription),
    technical: normalizeVideos(product.technical_videos, videoDefaultDescription),
    tiktok: normalizeVideos(product.tiktok_videos, videoDefaultDescription),
    tutorials: normalizeVideos(product.tutorial_resources?.tutorials, videoDefaultDescription)
  };
  
  const hasVideos = options.includeVideoCollections && Object.values(videoCollections).some((v: any) => v.length > 0);
  
  // ✅ Iniciar com SPIN Design System CSS
  let html = getSpinStylesCSS();
  
  // ✅ Conteúdo principal em <section> com classe SPIN
  html += `
<section class="spin-ecom" style="max-width: 1200px; margin: 0 auto; padding: 20px; font-family: Inter, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #333333; line-height: 1.6;">`;

  // 🗑️ Banner roxo da empresa removido - conteúdo inicia direto no título do produto
  // html += buildCompanyHeader(company);

  html += `
<h1 style="color: #3E4B5E; font-size: 2em; font-weight: 800; letter-spacing: -0.8px; text-align: center; margin-bottom: 20px;">${product.name}</h1>`;

  html += `
<div style="font-size: 1.05em; margin-bottom: 25px;">${parseRichDescription(enrichedDescription)}</div>`;

  // ✅ Benefícios IA (inline styles)
  if (options.includeBenefits && benefits.length > 0) {
    html += `
<div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
  <h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px; margin-top: 0;">💡 Principais Benefícios</h2>
  <ul style="list-style: none; padding: 0; margin: 0;">
    ${benefits.map(b => `<li style="padding: 8px 0 8px 24px; position: relative;"><span style="color: #EE7A3E; font-weight: bold; position: absolute; left: 0;">✓</span>${b}</li>`).join('\n    ')}
  </ul>
</div>`;
  }

  // ✅ Especificações Técnicas (SPIN Landing Page Style)
  if (technicalSpecs.length > 0) {
    html += `
<h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;">🔧 Especificações Técnicas</h2>
<div style="background:#fff; border:1px solid #e0e0e0; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.1); margin:0 0 25px 0;">
  <table style="width:100%; border-collapse:separate; border-spacing:0;">
    <thead>
      <tr style="background: linear-gradient(135deg, #3E4B5E 0%, #2d3748 100%);">
        <th style="padding:16px; text-align:left; font-weight:700; font-size:16px; color:#fff; text-transform:uppercase; letter-spacing:0.5px; border-bottom:3px solid #EE7A3E;">Especificação</th>
        <th style="padding:16px; text-align:left; font-weight:700; font-size:16px; color:#fff; text-transform:uppercase; letter-spacing:0.5px; border-bottom:3px solid #EE7A3E;">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${technicalSpecs.map((spec, i) => {
        const zebraBackground = i % 2 === 0 ? '#FFFFFF' : '#FCFCFD';
        const valueCell = isURL(spec.value)
          ? `<a href="${spec.value}" target="_blank" rel="noopener" style="display:inline-block; text-decoration:none;">
               <span style="background:#EE7A3E; color:#fff; border:none; padding:8px 14px; border-radius:6px; font-weight:600; box-shadow:0 2px 6px rgba(238,122,62,0.3);">📥 Download</span>
             </a>`
          : spec.value;
        return `<tr>
          <td style="padding:14px 16px; border-bottom:1px solid #e8e8e8; background:${zebraBackground}; font-size:15px; color:#111; line-height:1.6; word-break:break-word; overflow-wrap:anywhere;">${spec.label}</td>
          <td style="padding:14px 16px; border-bottom:1px solid #e8e8e8; background:linear-gradient(135deg, rgba(238,122,62,0.08) 0%, rgba(255,155,103,0.05) 100%); font-size:15px; color:#2f3a4a; line-height:1.6; font-weight:600; word-break:break-word; overflow-wrap:anywhere;">${valueCell}</td>
        </tr>`;
      }).join('\n      ')}
    </tbody>
  </table>
</div>`;
  }

  // ✅ Cards Empilhados (sem CSS Grid, inline styles)
  html += `
<h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;">📦 Recursos e Informações</h2>
<div style="margin: 20px 0;">
  <!-- Card de Aplicações -->
  <div style="
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    background: #fff;
    margin-bottom: 15px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border-left: 3px solid #EE7A3E;
  ">
    <h3 style="margin-top: 0; color: #3E4B5E; font-size: 1.2em; font-weight: 700; letter-spacing: -0.3px;">📋 Aplicações</h3>
    <p style="margin: 0; line-height: 1.7; color: #333;">${
      product.applications 
        ? product.applications 
        : '<span style="background: linear-gradient(135deg, rgba(238,122,62,0.08) 0%, rgba(255,155,103,0.05) 100%); padding: 8px 12px; border-radius: 6px; display: inline-block; color: #3E4B5E; font-weight: 500;">ℹ️ Nenhuma informação de aplicação cadastrada. Preencha o campo "Aplicações do Produto" no editor.</span>'
    }</p>
  </div>
  
  <!-- Card de Embalagem -->
  <div style="
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    background: #fff;
    margin-bottom: 15px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border-left: 3px solid #EE7A3E;
  ">
    <h3 style="margin-top: 0; color: #3E4B5E; font-size: 1.2em; font-weight: 700; letter-spacing: -0.3px;">📦 Embalagem</h3>
    ${buildPackagingInfo(product)}
  </div>
</div>`;

  // ✅ FASE 2: Variações do Produto (cores, tamanhos, modelos)
  if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
    html += `
<div style="margin: 25px 0; padding: 20px; background: #f8fafc; border-left: 4px solid #EE7A3E; border-radius: 8px;">
  <h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-top: 0; margin-bottom: 15px;">
    🎨 Variações Disponíveis
  </h2>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">`;
    
    product.variations.forEach((variation: any) => {
      const hasPrice = variation.price && variation.price > 0;
      const hasStock = variation.stock !== undefined && variation.stock !== null;
      const isInStock = !hasStock || variation.stock > 0;
      
      html += `
    <div style="padding: 15px; background: white; border: 1px solid #e0e0e0; border-radius: 6px; ${!isInStock ? 'opacity: 0.6;' : ''}">
      <h4 style="margin: 0 0 8px 0; color: #3E4B5E; font-size: 1em; font-weight: 600;">
        ${variation.name || 'Variação sem nome'}
      </h4>
      ${hasPrice ? `
        <p style="margin: 4px 0; color: #EE7A3E; font-weight: 600; font-size: 1.1em;">
          R$ ${variation.price.toFixed(2)}
        </p>
      ` : ''}
      ${hasStock ? `
        <p style="margin: 4px 0; font-size: 0.9em; color: ${isInStock ? '#666' : '#e74c3c'};">
          ${isInStock ? `✅ ${variation.stock} em estoque` : '❌ Fora de estoque'}
        </p>
      ` : ''}
      ${variation.sku ? `
        <p style="margin: 4px 0; font-size: 0.85em; color: #999;">
          SKU: ${variation.sku}
        </p>
      ` : ''}
    </div>`;
    });
    
    html += `
  </div>
</div>`;
  }

  // ✅ FAQ (details/summary inline) com Keywords
  if (faq.length > 0) {
    // Filtrar keywords genéricas/placeholder indesejadas
    const blacklist = ['palavras-chave', 'produto', 'prompt', 'palavra-chave'];
    const topKeywords = [
      ...(product.keywords || []),
      ...(product.market_keywords || [])
    ]
      .filter(kw => !blacklist.includes(kw.toLowerCase().trim()))
      .slice(0, 3)
      .join(' | ');
    
    html += `
<h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;">❓ Perguntas Frequentes</h2>`;
    faq.forEach(item => {
      // Substituir placeholder "Produto sem nome" pelo nome real do produto
      const cleanQuestion = item.question.replace(/produto sem nome/gi, product.name);
      const cleanAnswer = item.answer.replace(/Produto sem nome/g, product.name);
      
      html += `
<details style="margin: 12px 0;">
  <summary style="
    cursor: pointer;
    padding: 14px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%);
    border-radius: 8px;
    border-left: 3px solid #EE7A3E;
    font-weight: 700;
    font-size: 1.05em;
    color: #3E4B5E;
    letter-spacing: -0.3px;
    transition: background 0.2s ease;
  " onmouseover="this.style.background='linear-gradient(135deg, rgba(238,122,62,0.08) 0%, rgba(255,155,103,0.05) 100%)'" onmouseout="this.style.background='linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%)'">
    ${cleanQuestion}
  </summary>
  <p style="
    padding: 14px 16px;
    margin: 0;
    line-height: 1.7;
    color: #333;
    background: #FCFCFD;
    border-radius: 0 0 8px 8px;
  ">${cleanAnswer}</p>
</details>`;
    });
  }

  // ✅ Coleções de Vídeos (details/summary inline) com Keywords
  if (hasVideos) {
    const topKeywords = [
      ...(product.keywords || []),
      ...(product.market_keywords || [])
    ].slice(0, 3).join(' | ');
    
    html += `
<h2 style="color: #3E4B5E; font-size: 1.4em; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px;">🎥 Recursos de Vídeo</h2>`;
    
    if (videoCollections.youtube.length > 0) {
      html += `
<details style="margin: 12px 0;">
  <summary style="
    cursor: pointer;
    padding: 14px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%);
    border-radius: 8px;
    border-left: 3px solid #EE7A3E;
    font-weight: 700;
    font-size: 1.05em;
    color: #3E4B5E;
    letter-spacing: -0.3px;
  ">
    Vídeos YouTube${topKeywords ? ` | ${topKeywords}` : ''}<span style="background: #EE7A3E; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; margin-left: 8px; font-weight: 600;">${videoCollections.youtube.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px; padding: 10px; background: #FCFCFD; border-radius: 0 0 8px 8px;">
    ${videoCollections.youtube.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="
        margin: 12px 0;
        padding: 12px;
        background: #fff;
        border-radius: 6px;
        border: 1px solid #e8e8e8;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      ">
        <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 6px; font-size: 1.05em;">📹 Vídeo ${i + 1}</a>
        ${description ? `<p style="margin: 4px 0 0 0; color: #333; font-size: 0.95em; line-height: 1.6;">${description}</p>` : ''}
      </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.instagram.length > 0) {
      html += `
<details style="margin: 12px 0;">
  <summary style="
    cursor: pointer;
    padding: 14px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%);
    border-radius: 8px;
    border-left: 3px solid #EE7A3E;
    font-weight: 700;
    font-size: 1.05em;
    color: #3E4B5E;
    letter-spacing: -0.3px;
  ">
    Vídeos Instagram<span style="background: #EE7A3E; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; margin-left: 8px; font-weight: 600;">${videoCollections.instagram.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px; padding: 10px; background: #FCFCFD; border-radius: 0 0 8px 8px;">
    ${videoCollections.instagram.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="
        margin: 12px 0;
        padding: 12px;
        background: #fff;
        border-radius: 6px;
        border: 1px solid #e8e8e8;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      ">
        <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 6px; font-size: 1.05em;">📹 Vídeo ${i + 1}</a>
        ${description ? `<p style="margin: 4px 0 0 0; color: #333; font-size: 0.95em; line-height: 1.6;">${description}</p>` : ''}
      </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.testimonials.length > 0) {
      html += `
<details style="margin: 12px 0;">
  <summary style="
    cursor: pointer;
    padding: 14px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f3f5 100%);
    border-radius: 8px;
    border-left: 3px solid #EE7A3E;
    font-weight: 700;
    font-size: 1.05em;
    color: #3E4B5E;
    letter-spacing: -0.3px;
  ">
    Depoimentos em Vídeo<span style="background: #EE7A3E; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; margin-left: 8px; font-weight: 600;">${videoCollections.testimonials.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px; padding: 10px; background: #FCFCFD; border-radius: 0 0 8px 8px;">
    ${videoCollections.testimonials.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="
        margin: 12px 0;
        padding: 12px;
        background: #fff;
        border-radius: 6px;
        border: 1px solid #e8e8e8;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      ">
        <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 6px; font-size: 1.05em;">📹 Depoimento ${i + 1}</a>
        ${description ? `<p style="margin: 4px 0 0 0; color: #333; font-size: 0.95em; line-height: 1.6;">${description}</p>` : ''}
      </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.technical.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #f8fafc; border-radius: 4px; font-weight: bold; color: #3E4B5E;">
    Explicações Técnicas${topKeywords ? ` | ${topKeywords}` : ''}<span style="background: #EE7A3E; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.technical.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.technical.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
      <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 4px;">📹 Explicação ${i + 1}</a>
      ${description ? `<p style="margin: 4px 0 0 0; color: #333333; font-size: 0.9em; line-height: 1.4;">${description}</p>` : ''}
    </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.tiktok.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #f8fafc; border-radius: 4px; font-weight: bold; color: #3E4B5E;">
    Vídeos TikTok${topKeywords ? ` | ${topKeywords}` : ''}<span style="background: #EE7A3E; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.tiktok.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.tiktok.map((v, i) => {
      const description = truncateToWords(v.description || '', 50);
      return `<div style="margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
      <a href="${v.url}" target="_blank" rel="noopener" style="color: #EE7A3E; text-decoration: none; font-weight: 600; display: block; margin-bottom: 4px;">📹 Vídeo ${i + 1}</a>
      ${description ? `<p style="margin: 4px 0 0 0; color: #666; font-size: 0.9em; line-height: 1.4;">${description}</p>` : ''}
    </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
    
    if (videoCollections.tutorials.length > 0) {
      html += `
<details style="margin: 10px 0;">
  <summary style="cursor: pointer; padding: 12px; background: #ecf0f1; border-radius: 4px; font-weight: bold;">
    Tutoriais${topKeywords ? ` | ${topKeywords}` : ''}<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-left: 8px;">${videoCollections.tutorials.length}</span>
  </summary>
  <div style="margin: 10px 0 10px 20px;">
    ${videoCollections.tutorials.map((t, i) => {
      const description = truncateToWords(t.description || '', 50);
      return `<div style="margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
      <a href="${t.course_url}" target="_blank" rel="noopener" style="color: #3498db; text-decoration: none; font-weight: 600; display: block; margin-bottom: 4px;">📹 Tutorial ${i + 1}</a>
      ${description ? `<p style="margin: 4px 0 0 0; color: #666; font-size: 0.9em; line-height: 1.4;">${description}</p>` : ''}
    </div>`;
    }).join('\n    ')}
  </div>
</details>`;
    }
  }

  // ✅ Galeria de Miniaturas 80x80px no Final (após vídeos)
  html += buildImageGallery(product);

  // ✅ CTA Natural Semântico com Keywords e URL de Desconto
  const primaryKeyword = (product.keywords?.[0] || product.market_keywords?.[0] || product.name);
  const secondaryKeyword = (product.keywords?.[1] || product.market_keywords?.[1] || '');
  const firstBenefit = product.benefits?.[0] || 'Qualidade garantida';
  
  // ✅ PRIORIZAR LABEL DE DESCONTO (mesmo se visible=false ou url vazia)
  const ctaLabel = (product.offer_discount_cta?.label && product.offer_discount_cta.label.trim() !== '')
    ? product.offer_discount_cta.label
    : 'Comprar com Desconto';

  // ✅ URL: usar offer_discount_cta.url se preenchida, senão product_url
  const ctaUrl = (product.offer_discount_cta?.url && product.offer_discount_cta.url.trim() !== '')
    ? product.offer_discount_cta.url
    : (product.product_url || '#');
  
  html += `
<div style="margin: 30px 0; padding: 25px; background: #f8fafc; border-left: 4px solid #EE7A3E; border-radius: 8px;">
  <h3 style="color: #3E4B5E; margin-top: 0; font-size: 1.3em; font-weight: 700;">
    🔍 Procurando <strong style="color: #3E4B5E;">${primaryKeyword}</strong>?
  </h3>
  <p style="color: #555; line-height: 1.7; margin: 15px 0;">
    ${secondaryKeyword ? `Explore nossas opções de <strong>${secondaryKeyword}</strong> e ` : ''}Descubra por que <a href="${ctaUrl}" style="color: #EE7A3E; text-decoration: underline; font-weight: 600;">${product.name}</a> é a escolha ideal para seu consultório. 
    <strong>${firstBenefit}</strong> com entrega rápida em todo Brasil.
  </p>
  <div style="margin-top: 20px;">
    <a href="${ctaUrl}" 
       style="display: inline-block; padding: 12px 30px; background: #EE7A3E; color: white; font-weight: bold; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 15px rgba(238, 122, 62, 0.3); transition: all 0.3s;">
      ${ctaLabel} →
    </a>
  </div>
</div>
`;

  // ✅ CTA Final (gradiente inline com cores SPIN)
  html += `
<div style="background: linear-gradient(135deg, #3E4B5E 0%, #EE7A3E 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
  <h2 style="color: white; margin-top: 0; font-size: 1.5em; font-weight: 700;">Parametrize a sua impressora</h2>
  <p style="margin: 15px 0; line-height: 1.6;">Utilize nosso seletor de parâmetros, parâmetros e indicações para que sua impressão seja perfeita</p>
  <a href="https://parametros.smartdent.com.br/" target="_blank" rel="noopener noreferrer" style="background: #EE7A3E; color: white; padding: 15px 40px; border-radius: 50px; text-decoration: none; display: inline-block; font-weight: bold; margin-top: 10px; box-shadow: 0 4px 15px rgba(238, 122, 62, 0.3);">Parametrize sua Impressora</a>
</div>

</section>`;

  console.log('✅ SPIN Design System aplicado ao HTML final');
  return html;
}
