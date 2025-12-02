import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SEOConfig {
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string;
}

interface CapturedImage {
  originalUrl: string;
  newUrl: string;
  supabasePath: string;
  status: 'success' | 'failed';
  error?: string;
}

interface TransformResult {
  html: string;
  capturedImages: CapturedImage[];
  stats: {
    imagesProcessed: number;
    imagesFailed: number;
    ctasRewritten: number;
    cssPreserved: boolean;
    headerRemoved: boolean;
    footerRemoved: boolean;
  };
}

// Sanitiza HTML removendo scripts perigosos mas preservando CSS
function sanitizeHTML(html: string): string {
  // Remove scripts maliciosos mas preserva estrutura
  let sanitized = html
    // Remove onclick, onerror, onload handlers
    .replace(/\s(onclick|onerror|onload|onmouseover|onfocus|onblur)="[^"]*"/gi, '')
    // Remove javascript: URLs
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    // Remove Google Tag Manager
    .replace(/<script[^>]*gtm[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<iframe[^>]*gtm[^>]*>[\s\S]*?<\/noscript>/gi, '')
    // Remove Google Analytics
    .replace(/<script[^>]*google-analytics[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*ga\s*\([^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove cookies/GDPR scripts
    .replace(/<script[^>]*cookie[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove tracking pixels
    .replace(/<img[^>]*facebook[^>]*>/gi, '')
    .replace(/<img[^>]*pixel[^>]*>/gi, '');
  
  return sanitized;
}

// Remove header e footer do fabricante
function removeManufacturerElements(html: string): { html: string; headerRemoved: boolean; footerRemoved: boolean } {
  let result = html;
  let headerRemoved = false;
  let footerRemoved = false;
  
  // Padrões comuns de header
  const headerPatterns = [
    /<header[^>]*>[\s\S]*?<\/header>/gi,
    /<div[^>]*class="[^"]*site-header[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class="[^"]*navbar[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<nav[^>]*class="[^"]*main-nav[^"]*"[^>]*>[\s\S]*?<\/nav>/gi,
    /<div[^>]*id="masthead"[^>]*>[\s\S]*?<\/div>/gi,
  ];
  
  // Padrões comuns de footer
  const footerPatterns = [
    /<footer[^>]*>[\s\S]*?<\/footer>/gi,
    /<div[^>]*class="[^"]*site-footer[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*id="colophon"[^>]*>[\s\S]*?<\/div>/gi,
  ];
  
  for (const pattern of headerPatterns) {
    if (pattern.test(result)) {
      result = result.replace(pattern, '<!-- HEADER REMOVED -->');
      headerRemoved = true;
    }
  }
  
  for (const pattern of footerPatterns) {
    if (pattern.test(result)) {
      result = result.replace(pattern, '<!-- FOOTER REMOVED -->');
      footerRemoved = true;
    }
  }
  
  return { html: result, headerRemoved, footerRemoved };
}

// Reescreve todos os CTAs para o URL da Smart Dent
function rewriteCTAs(html: string, ctaUrl: string): { html: string; count: number } {
  let count = 0;
  let result = html;
  
  // Padrões de botões e links de conversão
  const ctaPatterns = [
    // Botões com classe específica
    /(<a[^>]*class="[^"]*(?:btn|button|cta|elementor-button|wp-block-button)[^"]*"[^>]*href=")([^"]+)(")/gi,
    // Links com texto de CTA comum
    /(<a[^>]*href=")([^"]+)("[^>]*>(?:Comprar|Saiba mais|Fale conosco|Contato|Orçamento|WhatsApp|Solicitar|Agendar|Conhecer|Ver mais)[^<]*<\/a>)/gi,
    // Botões de WhatsApp
    /(<a[^>]*href=")(https?:\/\/(?:api\.)?whatsapp\.com[^"]+)(")/gi,
    // Links externos de conversão
    /(<a[^>]*href=")(https?:\/\/[^"]+(?:contato|contact|form|lead)[^"]+)(")/gi,
  ];
  
  for (const pattern of ctaPatterns) {
    result = result.replace(pattern, (match, before, url, after) => {
      // Não reescreve se já é o URL desejado
      if (url === ctaUrl) return match;
      // Não reescreve links internos de âncora
      if (url.startsWith('#')) return match;
      count++;
      return `${before}${ctaUrl}${after}`;
    });
  }
  
  return { html: result, count };
}

// Captura e faz upload de imagens para Supabase
async function captureAndUploadImages(
  html: string,
  supabase: any,
  brand: string,
  product: string
): Promise<{ html: string; images: CapturedImage[] }> {
  const captured: CapturedImage[] = [];
  let processedHTML = html;
  
  // Extrair todas as URLs de imagens
  const imageUrls = new Set<string>();
  
  // <img src="...">
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const match of imgMatches) {
    if (match[1]) imageUrls.add(match[1]);
  }
  
  // <source srcset="...">
  const srcsetMatches = html.matchAll(/srcset=["']([^"']+)["']/gi);
  for (const match of srcsetMatches) {
    if (match[1]) {
      // srcset pode ter múltiplas URLs
      const urls = match[1].split(',').map(s => s.trim().split(' ')[0]);
      urls.forEach(url => imageUrls.add(url));
    }
  }
  
  // CSS url(...)
  const cssUrlMatches = html.matchAll(/url\(["']?([^"')]+)["']?\)/gi);
  for (const match of cssUrlMatches) {
    if (match[1] && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(match[1])) {
      imageUrls.add(match[1]);
    }
  }
  
  // og:image content
  const ogMatches = html.matchAll(/property=["']og:image["'][^>]+content=["']([^"']+)["']/gi);
  for (const match of ogMatches) {
    if (match[1]) imageUrls.add(match[1]);
  }
  
  // Processar cada URL
  for (const originalUrl of imageUrls) {
    // Ignorar data URIs
    if (originalUrl.startsWith('data:')) continue;
    // Ignorar URLs já do Supabase
    if (originalUrl.includes('supabase.co')) continue;
    // Ignorar URLs relativas sem protocolo (podem ser locais)
    if (!originalUrl.startsWith('http') && !originalUrl.startsWith('//')) continue;
    
    try {
      // Normalizar URL
      let fetchUrl = originalUrl;
      if (fetchUrl.startsWith('//')) {
        fetchUrl = 'https:' + fetchUrl;
      }
      
      console.log(`Downloading image: ${fetchUrl}`);
      
      // Download da imagem
      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const imageBuffer = await response.arrayBuffer();
      
      // Gerar nome de arquivo
      const urlPath = new URL(fetchUrl).pathname;
      let filename = urlPath.split('/').pop() || 'image';
      // Limpar nome do arquivo
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      // Garantir extensão
      if (!/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(filename)) {
        const ext = contentType.split('/')[1] || 'jpg';
        filename = `${filename}.${ext}`;
      }
      
      // Caminho no Supabase
      const brandSlug = (brand || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const productSlug = (product || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const timestamp = Date.now();
      const supabasePath = `${brandSlug}/${productSlug}/${timestamp}_${filename}`;
      
      // Upload para Supabase
      const { data, error } = await supabase.storage
        .from('lp-clone-assets')
        .upload(supabasePath, imageBuffer, {
          contentType,
          cacheControl: '31536000',
          upsert: true,
        });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Obter URL pública
      const { data: publicData } = supabase.storage
        .from('lp-clone-assets')
        .getPublicUrl(supabasePath);
      
      const newUrl = publicData.publicUrl;
      
      // Substituir no HTML (escape especial para regex)
      const escapedOriginal = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedHTML = processedHTML.replace(new RegExp(escapedOriginal, 'g'), newUrl);
      
      captured.push({
        originalUrl,
        newUrl,
        supabasePath,
        status: 'success',
      });
      
      console.log(`✅ Uploaded: ${originalUrl} -> ${newUrl}`);
      
    } catch (error) {
      console.error(`❌ Failed to capture ${originalUrl}:`, error);
      captured.push({
        originalUrl,
        newUrl: originalUrl, // Mantém original em caso de falha
        supabasePath: '',
        status: 'failed',
        error: (error as Error).message,
      });
    }
  }
  
  return { html: processedHTML, images: captured };
}

// Injeta SEO e metadados
function injectSEO(html: string, seoConfig: SEOConfig, companyData: any): string {
  let result = html;
  
  // Remove meta tags existentes
  result = result
    .replace(/<title>[^<]*<\/title>/gi, '')
    .replace(/<meta[^>]*name=["']description["'][^>]*>/gi, '')
    .replace(/<meta[^>]*property=["']og:[^"']*["'][^>]*>/gi, '')
    .replace(/<meta[^>]*name=["']twitter:[^"']*["'][^>]*>/gi, '')
    .replace(/<link[^>]*rel=["']canonical["'][^>]*>/gi, '');
  
  // Monta novas meta tags
  const companyName = companyData?.company_name || 'Smart Dent';
  const title = seoConfig.title || `Landing Page | ${companyName}`;
  const description = seoConfig.description || companyData?.company_description || '';
  const canonical = seoConfig.canonical || '';
  const keywords = seoConfig.keywords || '';
  const logoUrl = companyData?.company_logo_url || '';
  
  const seoTags = `
    <title>${title}</title>
    <meta name="description" content="${description}">
    ${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
    ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    ${canonical ? `<meta property="og:url" content="${canonical}">` : ''}
    ${logoUrl ? `<meta property="og:image" content="${logoUrl}">` : ''}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    
    <!-- GEO -->
    ${companyData?.city ? `<meta name="geo.placename" content="${companyData.city}, ${companyData.state || 'Brasil'}">` : ''}
    ${companyData?.country ? `<meta name="geo.region" content="${companyData.country}">` : ''}
    
    <!-- Schema.org Organization -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "${companyName}",
      "url": "${companyData?.website_url || ''}",
      ${logoUrl ? `"logo": "${logoUrl}",` : ''}
      ${companyData?.contact_email ? `"email": "${companyData.contact_email}",` : ''}
      ${companyData?.contact_phone ? `"telephone": "${companyData.contact_phone}",` : ''}
      "address": {
        "@type": "PostalAddress",
        ${companyData?.street_address ? `"streetAddress": "${companyData.street_address}",` : ''}
        ${companyData?.city ? `"addressLocality": "${companyData.city}",` : ''}
        ${companyData?.state ? `"addressRegion": "${companyData.state}",` : ''}
        ${companyData?.postal_code ? `"postalCode": "${companyData.postal_code}",` : ''}
        ${companyData?.country ? `"addressCountry": "${companyData.country}"` : ''}
      }
    }
    </script>
  `;
  
  // Injeta após <head>
  result = result.replace(/<head[^>]*>/i, `$&\n${seoTags}`);
  
  return result;
}

// Insere Header e Footer Smart Dent
function insertSmartDentHeaderFooter(html: string, companyData: any, ctaUrl: string): string {
  let result = html;
  
  const companyName = companyData?.company_name || 'Smart Dent';
  const logoUrl = companyData?.company_logo_url || '';
  const websiteUrl = companyData?.website_url || '#';
  const phone = companyData?.contact_phone || '';
  const instagram = companyData?.social_media_links?.instagram || companyData?.instagram_profile || '';
  const youtube = companyData?.youtube_channel || '';
  
  const SMART_DENT_HEADER = `
  <!-- Smart Dent Header -->
  <header class="sd-cloned-header" style="
    position: sticky;
    top: 0;
    z-index: 9999;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  ">
    <a href="${websiteUrl}" style="display: flex; align-items: center; text-decoration: none;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="height: 40px; width: auto;">` : `<span style="color: #fff; font-size: 20px; font-weight: bold;">${companyName}</span>`}
    </a>
    <nav style="display: flex; gap: 24px; align-items: center;">
      <a href="${websiteUrl}/produtos" style="color: #e0e0e0; text-decoration: none; font-size: 14px;">Produtos</a>
      <a href="${websiteUrl}/solucoes" style="color: #e0e0e0; text-decoration: none; font-size: 14px;">Soluções</a>
      <a href="${ctaUrl}" style="
        background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
        color: #fff;
        padding: 10px 20px;
        border-radius: 25px;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Falar com Especialista
      </a>
    </nav>
  </header>
  `;
  
  const SMART_DENT_FOOTER = `
  <!-- Smart Dent Footer -->
  <footer class="sd-cloned-footer" style="
    background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
    color: #e0e0e0;
    padding: 48px 24px 24px;
    margin-top: 48px;
  ">
    <div style="max-width: 1200px; margin: 0 auto;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 32px; margin-bottom: 32px;">
        <div>
          ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="height: 48px; width: auto; margin-bottom: 16px;">` : `<h3 style="color: #fff; margin-bottom: 16px;">${companyName}</h3>`}
          <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0;">
            ${companyData?.company_description?.substring(0, 150) || 'Odontologia Digital Simples, Eficiente e Lucrativa'}...
          </p>
        </div>
        <div>
          <h4 style="color: #fff; margin-bottom: 16px; font-size: 16px;">Contato</h4>
          ${phone ? `<p style="font-size: 14px; color: #a0a0a0; margin-bottom: 8px;">📞 ${phone}</p>` : ''}
          ${companyData?.contact_email ? `<p style="font-size: 14px; color: #a0a0a0; margin-bottom: 8px;">✉️ ${companyData.contact_email}</p>` : ''}
          ${companyData?.city ? `<p style="font-size: 14px; color: #a0a0a0;">📍 ${companyData.city}${companyData.state ? `, ${companyData.state}` : ''}</p>` : ''}
        </div>
        <div>
          <h4 style="color: #fff; margin-bottom: 16px; font-size: 16px;">Links</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a href="${websiteUrl}/politica-privacidade" style="color: #a0a0a0; text-decoration: none; font-size: 14px;">Política de Privacidade</a>
            <a href="${websiteUrl}/termos" style="color: #a0a0a0; text-decoration: none; font-size: 14px;">Termos de Uso</a>
            <a href="${websiteUrl}" style="color: #a0a0a0; text-decoration: none; font-size: 14px;">Site Principal</a>
          </div>
        </div>
        <div>
          <h4 style="color: #fff; margin-bottom: 16px; font-size: 16px;">Redes Sociais</h4>
          <div style="display: flex; gap: 16px;">
            ${instagram ? `<a href="${instagram}" target="_blank" style="color: #a0a0a0; font-size: 24px;">📸</a>` : ''}
            ${youtube ? `<a href="${youtube}" target="_blank" style="color: #a0a0a0; font-size: 24px;">▶️</a>` : ''}
          </div>
        </div>
      </div>
      <div style="border-top: 1px solid #333; padding-top: 24px; text-align: center;">
        <p style="font-size: 12px; color: #666;">
          © ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados.
          ${companyData?.tax_id ? ` | CNPJ: ${companyData.tax_id}` : ''}
        </p>
      </div>
    </div>
  </footer>
  `;
  
  // Insere header após <body>
  result = result.replace(/<body[^>]*>/i, `$&\n${SMART_DENT_HEADER}`);
  
  // Insere footer antes de </body>
  result = result.replace(/<\/body>/i, `${SMART_DENT_FOOTER}\n$&`);
  
  return result;
}

// Função principal de processamento
async function processLandingPage(
  html: string,
  ctaUrl: string,
  seoConfig: SEOConfig,
  brand: string,
  product: string,
  supabase: any,
  companyData: any
): Promise<TransformResult> {
  console.log('🚀 Starting LP transformation...');
  
  // 1. Sanitizar HTML (preserva CSS)
  let processed = sanitizeHTML(html);
  console.log('✅ HTML sanitized');
  
  // 2. Remover header/footer do fabricante
  const { html: withoutManufacturer, headerRemoved, footerRemoved } = removeManufacturerElements(processed);
  processed = withoutManufacturer;
  console.log(`✅ Manufacturer elements removed (header: ${headerRemoved}, footer: ${footerRemoved})`);
  
  // 3. Reescrever CTAs
  const { html: withCTAs, count: ctaCount } = rewriteCTAs(processed, ctaUrl);
  processed = withCTAs;
  console.log(`✅ ${ctaCount} CTAs rewritten`);
  
  // 4. Capturar e fazer upload de imagens
  const { html: withImages, images } = await captureAndUploadImages(processed, supabase, brand, product);
  processed = withImages;
  const successImages = images.filter(i => i.status === 'success').length;
  const failedImages = images.filter(i => i.status === 'failed').length;
  console.log(`✅ Images processed: ${successImages} success, ${failedImages} failed`);
  
  // 5. Injetar SEO
  processed = injectSEO(processed, seoConfig, companyData);
  console.log('✅ SEO injected');
  
  // 6. Inserir Header/Footer Smart Dent
  processed = insertSmartDentHeaderFooter(processed, companyData, ctaUrl);
  console.log('✅ Smart Dent header/footer inserted');
  
  return {
    html: processed,
    capturedImages: images,
    stats: {
      imagesProcessed: successImages,
      imagesFailed: failedImages,
      ctasRewritten: ctaCount,
      cssPreserved: true,
      headerRemoved,
      footerRemoved,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { html, ctaUrl, seoConfig, brand, product } = await req.json();
    
    if (!html || !ctaUrl) {
      return new Response(
        JSON.stringify({ error: 'HTML e URL do CTA são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Buscar dados da empresa
    const { data: companyData } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();
    
    console.log('Company data loaded:', companyData?.company_name);
    
    // Processar landing page
    const result = await processLandingPage(
      html,
      ctaUrl,
      seoConfig || {},
      brand || 'unknown',
      product || 'unknown',
      supabase,
      companyData
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in clone-landing-page:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar landing page',
        details: (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
