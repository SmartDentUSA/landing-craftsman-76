import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { blake3 } from "https://esm.sh/hash-wasm@4.11.0";
import { marked } from "https://esm.sh/marked@12.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  productId: string;
  blogType: 'commercial' | 'technical';
  domain: string;
  pagePath: string;
}

interface BlogFAQ {
  question: string;
  answer: string;
  sge_snippet?: string;
  category?: string;
}

interface TrackingPixels {
  google_tag_manager?: { enabled: boolean; container_id: string | null };
  meta_pixel?: { enabled: boolean; pixel_id: string | null };
  tiktok_pixel?: { enabled: boolean; pixel_id: string | null };
  google_analytics?: { enabled: boolean; measurement_id: string | null };
}

async function calculateBlake3Hash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hash = await blake3(data);
  return hash.slice(0, 32);
}

function stringToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateTrackingScripts(pixels: TrackingPixels): { headScripts: string; bodyScripts: string } {
  let headScripts = '';
  let bodyScripts = '';

  if (pixels.google_tag_manager?.enabled && pixels.google_tag_manager.container_id) {
    const gtmId = pixels.google_tag_manager.container_id;
    headScripts += `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>`;
    bodyScripts += `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
  }

  if (pixels.meta_pixel?.enabled && pixels.meta_pixel.pixel_id) {
    const pixelId = pixels.meta_pixel.pixel_id;
    headScripts += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');</script>`;
  }

  if (pixels.google_analytics?.enabled && pixels.google_analytics.measurement_id) {
    const measurementId = pixels.google_analytics.measurement_id;
    headScripts += `<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');</script>`;
  }

  return { headScripts, bodyScripts };
}

function generateFAQSection(faqs: BlogFAQ[]): string {
  if (!faqs || faqs.length === 0) return '';

  const faqItems = faqs.map((faq, index) => `
    <details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <summary itemprop="name">${faq.question}</summary>
      <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <div itemprop="text">${faq.answer}</div>
      </div>
    </details>
  `).join('');

  return `
    <section class="blog-faq-section" itemscope itemtype="https://schema.org/FAQPage">
      <h2>Perguntas Frequentes</h2>
      <div class="faq-list">
        ${faqItems}
      </div>
    </section>
  `;
}

function generateFAQSchema(faqs: BlogFAQ[]): object | null {
  if (!faqs || faqs.length === 0) return null;

  return {
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

function generateProductBlogHTML(options: {
  product: any;
  blogType: string;
  content: string;
  faqs: BlogFAQ[];
  domain: string;
  companyProfile: any;
  trackingPixels: TrackingPixels;
}): string {
  const { product, blogType, content, faqs, domain, companyProfile, trackingPixels } = options;
  
  const title = blogType === 'commercial' 
    ? `${product.name} - Guia Completo | ${companyProfile.company_name}`
    : `${product.name} - Especificações Técnicas | ${companyProfile.company_name}`;
  
  const description = product.seo_description_override || 
    `Conheça tudo sobre ${product.name}. ${blogType === 'commercial' ? 'Benefícios, aplicações e como usar.' : 'Especificações técnicas detalhadas e informações profissionais.'}`;
  
  const keywords = Array.isArray(product.keywords) 
    ? product.keywords.join(', ') 
    : product.name;

  const htmlContent = marked.parse(content);
  const faqSection = generateFAQSection(faqs);
  const faqSchema = generateFAQSchema(faqs);

  const { headScripts, bodyScripts } = generateTrackingScripts(trackingPixels);

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "author": {
        "@type": "Organization",
        "name": companyProfile.company_name,
        "url": companyProfile.website_url
      },
      "publisher": {
        "@type": "Organization",
        "name": companyProfile.company_name,
        "logo": {
          "@type": "ImageObject",
          "url": companyProfile.company_logo_url
        }
      },
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://${domain}`
      },
      "image": product.image_url,
      "keywords": keywords
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.image_url,
      "brand": {
        "@type": "Brand",
        "name": product.brand || companyProfile.company_name
      },
      "offers": product.price ? {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "BRL",
        "availability": "https://schema.org/InStock",
        "url": product.product_url
      } : undefined
    }
  ];

  if (faqSchema) {
    schemas.push({ "@context": "https://schema.org", ...faqSchema } as any);
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${keywords}">
  <link rel="canonical" href="https://${domain}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${product.image_url || ''}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://${domain}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${product.image_url || ''}">
  
  <!-- Schema.org -->
  ${schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ')}
  
  ${headScripts}
  
  <style>
    :root {
      --primary: #2563eb;
      --primary-foreground: #ffffff;
      --background: #ffffff;
      --foreground: #1f2937;
      --muted: #f3f4f6;
      --muted-foreground: #6b7280;
      --border: #e5e7eb;
      --radius: 8px;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.7;
      color: var(--foreground);
      background: var(--background);
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    
    header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    
    header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: var(--foreground);
    }
    
    header .meta {
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
    
    .product-hero {
      display: flex;
      gap: 2rem;
      margin-bottom: 3rem;
      padding: 2rem;
      background: var(--muted);
      border-radius: var(--radius);
    }
    
    .product-hero img {
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: var(--radius);
    }
    
    .product-hero-info h2 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    
    .product-hero-info p {
      color: var(--muted-foreground);
      margin-bottom: 1rem;
    }
    
    .product-hero-info .cta {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: var(--primary);
      color: var(--primary-foreground);
      text-decoration: none;
      border-radius: var(--radius);
      font-weight: 500;
    }
    
    .content h2 {
      font-size: 1.75rem;
      margin: 2rem 0 1rem;
      color: var(--foreground);
    }
    
    .content h3 {
      font-size: 1.25rem;
      margin: 1.5rem 0 0.75rem;
    }
    
    .content p {
      margin-bottom: 1rem;
    }
    
    .content ul, .content ol {
      margin: 1rem 0;
      padding-left: 1.5rem;
    }
    
    .content li {
      margin-bottom: 0.5rem;
    }
    
    .blog-faq-section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
    }
    
    .blog-faq-section h2 {
      font-size: 1.75rem;
      margin-bottom: 1.5rem;
    }
    
    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .faq-item {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    
    .faq-item summary {
      padding: 1rem 1.25rem;
      cursor: pointer;
      font-weight: 500;
      background: var(--muted);
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .faq-item summary::-webkit-details-marker {
      display: none;
    }
    
    .faq-item summary::after {
      content: '+';
      font-size: 1.25rem;
      font-weight: 300;
    }
    
    .faq-item[open] summary::after {
      content: '−';
    }
    
    .faq-answer {
      padding: 1rem 1.25rem;
      background: var(--background);
    }
    
    footer {
      margin-top: 4rem;
      padding: 2rem;
      text-align: center;
      background: var(--muted);
      border-radius: var(--radius);
    }
    
    footer p {
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }
    
    footer a {
      color: var(--primary);
      text-decoration: none;
    }
    
    @media (max-width: 640px) {
      .product-hero {
        flex-direction: column;
        text-align: center;
      }
      
      .product-hero img {
        margin: 0 auto;
      }
      
      header h1 {
        font-size: 1.75rem;
      }
    }
  </style>
</head>
<body>
  ${bodyScripts}
  
  <main class="container">
    <header>
      <h1>${title}</h1>
      <p class="meta">Publicado por ${companyProfile.company_name} • ${new Date().toLocaleDateString('pt-BR')}</p>
    </header>
    
    ${product.image_url ? `
    <section class="product-hero">
      <img src="${product.image_url}" alt="${product.name}" loading="lazy">
      <div class="product-hero-info">
        <h2>${product.name}</h2>
        <p>${product.brand || ''}</p>
        ${product.product_url ? `<a href="${product.product_url}" class="cta">Ver Produto</a>` : ''}
      </div>
    </section>
    ` : ''}
    
    <article class="content">
      ${htmlContent}
    </article>
    
    ${faqSection}
    
    <footer>
      <p>© ${new Date().getFullYear()} ${companyProfile.company_name}. Todos os direitos reservados.</p>
      <p><a href="${companyProfile.website_url || '#'}">${companyProfile.website_url || ''}</a></p>
    </footer>
  </main>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, blogType, domain, pagePath } = await req.json() as PublishRequest;

    console.log(`[publish-product-blog] Starting:`, { productId, blogType, domain, pagePath });

    if (!productId || !blogType || !domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'productId, blogType e domain são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais Cloudflare não configuradas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Get product data
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ success: false, error: 'Produto não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const blogContent = product.individual_blog_content as any;
    const content = blogType === 'commercial' ? blogContent?.commercial : blogContent?.technical;
    const faqs = blogType === 'commercial' ? blogContent?.commercial_faqs : blogContent?.technical_faqs;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: `Blog ${blogType} não encontrado para este produto` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Get company profile and domain config
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    if (!companyProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Perfil da empresa não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const seoDomains = (companyProfile.seo_domains || []) as any[];
    const domainConfig = seoDomains.find((d: any) => d.domain === domain);

    if (!domainConfig?.cloudflare_enabled || !domainConfig?.cloudflare_project_name) {
      return new Response(
        JSON.stringify({ success: false, error: `Cloudflare não configurado para ${domain}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const projectName = domainConfig.cloudflare_project_name;
    const rawPixels = domainConfig.tracking_pixels || {};
    const trackingPixels: TrackingPixels = {
      google_tag_manager: rawPixels.google_tag_manager || rawPixels.gtm || null,
      google_analytics: rawPixels.google_analytics || rawPixels.ga4 || null,
      meta_pixel: rawPixels.meta_pixel || rawPixels.meta || null,
      tiktok_pixel: rawPixels.tiktok_pixel || rawPixels.tiktok || null,
    };

    // 3. Create/update publication record
    const { data: existingPub } = await supabase
      .from('product_blog_publications')
      .select('id')
      .eq('product_id', productId)
      .eq('blog_type', blogType)
      .eq('target_domain', domain)
      .single();

    const publicationData = {
      product_id: productId,
      blog_type: blogType,
      target_domain: domain,
      page_path: pagePath || `blog/${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      publish_status: 'pending',
      updated_at: new Date().toISOString()
    };

    let publicationId: string;
    
    if (existingPub) {
      await supabase
        .from('product_blog_publications')
        .update(publicationData)
        .eq('id', existingPub.id);
      publicationId = existingPub.id;
    } else {
      const { data: newPub } = await supabase
        .from('product_blog_publications')
        .insert(publicationData)
        .select('id')
        .single();
      publicationId = newPub!.id;
    }

    // 4. Generate HTML
    const htmlContent = generateProductBlogHTML({
      product,
      blogType,
      content,
      faqs: faqs || [],
      domain,
      companyProfile,
      trackingPixels
    });

    // 5. Upload to Cloudflare Pages
    const filePath = `/${pagePath.replace(/^\//, '')}/index.html`;
    const contentHash = await calculateBlake3Hash(htmlContent);

    console.log(`[publish-product-blog] Uploading to Cloudflare:`, { projectName, filePath, contentHash });

    // Get upload token
    const tokenResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/upload-token`,
      { headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` } }
    );

    const tokenData = await tokenResponse.json();
    if (!tokenData.success || !tokenData.result?.jwt) {
      throw new Error(tokenData.errors?.[0]?.message || 'Falha ao obter token');
    }

    const jwtToken = tokenData.result.jwt;

    // Upload file
    const uploadResponse = await fetch(
      'https://api.cloudflare.com/client/v4/pages/assets/upload',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          key: contentHash,
          value: stringToBase64(htmlContent),
          metadata: { contentType: 'text/html' },
          base64: true
        }])
      }
    );

    const uploadData = await uploadResponse.json();
    if (!uploadData.success) {
      throw new Error(uploadData.errors?.[0]?.message || 'Falha no upload');
    }

    // Upsert hashes
    await fetch(
      'https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hashes: [contentHash] })
      }
    );

    // Create deployment
    const formData = new FormData();
    formData.append('manifest', JSON.stringify({ [filePath]: contentHash }));

    const deployResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` },
        body: formData
      }
    );

    const deployData = await deployResponse.json();
    if (!deployData.success) {
      throw new Error(deployData.errors?.[0]?.message || 'Falha no deployment');
    }

    const publishedUrl = `https://${domain}${filePath.replace('/index.html', '')}`;

    // 6. Update publication record
    await supabase
      .from('product_blog_publications')
      .update({
        publish_status: 'published',
        published_url: publishedUrl,
        published_at: new Date().toISOString(),
        html_content: htmlContent,
        cloudflare_deployment_id: deployData.result?.id
      })
      .eq('id', publicationId);

    console.log(`[publish-product-blog] Success:`, { publishedUrl });

    return new Response(
      JSON.stringify({ 
        success: true, 
        publishedUrl,
        deploymentId: deployData.result?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[publish-product-blog] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
