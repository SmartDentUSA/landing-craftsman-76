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

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateTrackingScripts(pixels: TrackingPixels | null): { headScripts: string; bodyScripts: string } {
  let headScripts = '';
  let bodyScripts = '';

  if (!pixels) return { headScripts, bodyScripts };

  if (pixels.google_tag_manager?.enabled && pixels.google_tag_manager.container_id) {
    const gtmId = pixels.google_tag_manager.container_id;
    headScripts += `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>`;
    bodyScripts += `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
  }

  if (pixels.meta_pixel?.enabled && pixels.meta_pixel.pixel_id) {
    const pixelId = pixels.meta_pixel.pixel_id;
    headScripts += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');</script>`;
  }

  if (pixels.google_analytics?.enabled && pixels.google_analytics.measurement_id && !pixels.google_tag_manager?.enabled) {
    const measurementId = pixels.google_analytics.measurement_id;
    headScripts += `<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');</script>`;
  }

  if (pixels.tiktok_pixel?.enabled && pixels.tiktok_pixel.pixel_id) {
    const tiktokId = pixels.tiktok_pixel.pixel_id;
    headScripts += `<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktokId}');ttq.page();}(window,document,'ttq');</script>`;
  }

  return { headScripts, bodyScripts };
}

function generateFAQSection(faqs: BlogFAQ[], productName: string): string {
  if (!faqs || faqs.length === 0) return '';

  const faqItems = faqs.map((faq) => `
    <details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <summary itemprop="name"><i class="fas fa-chart-line"></i> ${escapeHtml(faq.question)}</summary>
      <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">${escapeHtml(faq.answer)}</p>
      </div>
    </details>
  `).join('');

  return `
    <section class="faq" itemscope itemtype="https://schema.org/FAQPage">
      <h3>Perguntas Frequentes sobre ${escapeHtml(productName)}</h3>
      ${faqItems}
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
  pagePath: string;
  companyProfile: any;
  trackingPixels: TrackingPixels | null;
}): string {
  const { product, blogType, content, faqs, domain, pagePath, companyProfile, trackingPixels } = options;
  
  const companyName = companyProfile?.company_name || 'Smart Dent';
  const canonicalUrl = `https://${domain}${pagePath}`;
  
  const title = blogType === 'commercial' 
    ? `${product.name} - Guia Completo | ${companyName}`
    : `${product.name} - Especificações Técnicas | ${companyName}`;
  
  const description = product.seo_description_override || 
    `Conheça tudo sobre ${product.name}. ${blogType === 'commercial' ? 'Benefícios, aplicações e como usar.' : 'Especificações técnicas detalhadas e informações profissionais.'}`;
  
  const keywordsArray = Array.isArray(product.keywords) ? product.keywords : [];
  const keywords = keywordsArray.length > 0 ? keywordsArray.join(', ') : product.name;

  const htmlContent = marked.parse(content);
  const faqSection = generateFAQSection(faqs, product.name);
  const faqSchema = generateFAQSchema(faqs);

  const { headScripts, bodyScripts } = generateTrackingScripts(trackingPixels);

  // Navigation and Footer config
  const navConfig = companyProfile?.navigation_footer_config;
  const footerConfig = navConfig?.footer;
  const institutionalLinks = Array.isArray(companyProfile?.institutional_links) ? companyProfile.institutional_links : [];
  const socialMediaLinks = Array.isArray(companyProfile?.social_media_links) ? companyProfile.social_media_links : [];

  // Build header nav links
  const headerLinks = navConfig?.navigation_menu?.length > 0 
    ? navConfig.navigation_menu.map((link: any) => 
        `<a href="${escapeHtml(link.href)}" ${link.openInNewTab ? 'target="_blank"' : ''}>${escapeHtml(link.label)}</a>`
      ).join('')
    : `
      <a href="${escapeHtml(companyProfile?.website_url || '#')}">Loja</a>
      <a href="#">Blog</a>
      <a href="https://api.whatsapp.com/send/?phone=${escapeHtml((companyProfile?.contact_phone || '').replace(/\D/g, ''))}&text=Ol%C3%A1">Fale conosco</a>
    `;

  // Build footer HTML
  const footerHTML = (() => {
    const hasCustomFooter = footerConfig && (footerConfig.locations?.length > 0 || footerConfig.links?.length > 0 || footerConfig.social_links?.length > 0);
    
    if (hasCustomFooter) {
      return `
        <div class="footer-columns">
          ${footerConfig.locations && footerConfig.locations.length > 0 ? footerConfig.locations.map((loc: any) => `
            <div>
              <strong>${escapeHtml(loc.label || companyName)}</strong>
              ${loc.phone ? `<p><i class="fas fa-phone"></i> ${escapeHtml(loc.phone)}</p>` : ''}
              ${loc.email ? `<p><i class="fas fa-envelope"></i> ${escapeHtml(loc.email)}</p>` : ''}
              ${loc.address ? `<p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(loc.address)}</p>` : ''}
            </div>
          `).join('') : `
            <div>
              <strong>${escapeHtml(companyName)} - Brasil</strong>
              <p><i class="fas fa-phone"></i> Atendimento: ${escapeHtml(companyProfile?.contact_phone || '')}</p>
              <p><i class="fas fa-envelope"></i> Comercial: ${escapeHtml(companyProfile?.contact_email || '')}</p>
              <p>${escapeHtml(companyProfile?.street_address || '')}, ${escapeHtml(companyProfile?.address_number || '')}</p>
              <p>${escapeHtml(companyProfile?.city || '')} - ${escapeHtml(companyProfile?.state || '')}, ${escapeHtml(companyProfile?.postal_code || '')}</p>
            </div>
          `}
          
          ${footerConfig.links && footerConfig.links.length > 0 ? `
            <div>
              <strong>Links Úteis</strong>
              ${footerConfig.links.map((link: any) => `
                <a href="${escapeHtml(link.href)}" target="${link.openInNewTab ? '_blank' : '_self'}" rel="noopener">${escapeHtml(link.label)}</a>
              `).join('')}
            </div>
          ` : institutionalLinks.length > 0 ? `
            <div>
              <strong>Links Úteis</strong>
              ${institutionalLinks.slice(0, 5).map((link: any) => `
                <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>
              `).join('')}
            </div>
          ` : ''}
          
          ${footerConfig.social_links && footerConfig.social_links.length > 0 ? `
            <div>
              <strong>Redes Sociais</strong>
              <div class="footer-social-links">
                ${footerConfig.social_links.map((social: any) => `
                  <a href="${escapeHtml(social.href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(social.icon_alt || social.platform || '')}">
                    <i class="fab fa-${escapeHtml(social.platform || 'link')}"></i>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : socialMediaLinks.length > 0 ? `
            <div>
              <strong>Redes Sociais</strong>
              <div class="footer-social-links">
                ${socialMediaLinks.map((social: any) => `
                  <a href="${escapeHtml(social.url || social.href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(social.platform || '')}">
                    <i class="fab fa-${escapeHtml(social.platform || 'link')}"></i>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      // Footer padrão (fallback)
      return `
        <div class="footer-columns">
          <div>
            <strong>${escapeHtml(companyName)} - Brasil</strong>
            <p><i class="fas fa-phone"></i> Atendimento: ${escapeHtml(companyProfile?.contact_phone || '')}</p>
            <p><i class="fas fa-envelope"></i> Comercial: ${escapeHtml(companyProfile?.contact_email || '')}</p>
            <p>${escapeHtml(companyProfile?.street_address || '')}, ${escapeHtml(companyProfile?.address_number || '')}</p>
            <p>${escapeHtml(companyProfile?.city || '')} - ${escapeHtml(companyProfile?.state || '')}, ${escapeHtml(companyProfile?.postal_code || '')}</p>
          </div>
          ${institutionalLinks.length > 0 ? `
          <div>
            <strong>Links Úteis</strong>
            ${institutionalLinks.slice(0, 5).map((link: any) => `
              <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>
            `).join('')}
          </div>
          ` : ''}
        </div>
      `;
    }
  })();

  // Schema.org JSON-LD
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "author": {
        "@type": "Organization",
        "name": companyName,
        "url": companyProfile?.website_url
      },
      "publisher": {
        "@type": "Organization",
        "name": companyName,
        "logo": {
          "@type": "ImageObject",
          "url": companyProfile?.company_logo_url
        }
      },
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
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
        "name": product.brand || companyName
      },
      "offers": product.price ? {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "BRL",
        "availability": "https://schema.org/InStock",
        "url": product.product_url
      } : undefined
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": companyProfile?.website_url || `https://${domain}` },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": `https://${domain}/blog` },
        { "@type": "ListItem", "position": 3, "name": product.name, "item": canonicalUrl }
      ]
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
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(product.image_url || '')}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${escapeHtml(companyName)}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(product.image_url || '')}">
  
  <!-- Hreflang -->
  <link rel="alternate" hreflang="pt-BR" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}">
  
  <!-- Resource Hints -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  ${product.image_url ? `<link rel="preload" as="image" href="${escapeHtml(product.image_url)}" fetchpriority="high">` : ''}
  
  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": schemas.map(s => { const { "@context": _, ...rest } = s; return rest; }) }, null, 2)}
  </script>
  
  <!-- Fonts & Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  
  <!-- Tracking Pixels -->
  ${headScripts}
  
  <style>
    /* ===== DESIGN SYSTEM LP CLONE ===== */
    :root {
      --primary-dark: #3E4B5E;
      --primary-gradient-dark: #1e293b;
      --cta-bg-color: #3E4B5E;
      --accent-tech: #EE7A3E;
      --accent-glow: #FF9B67;
      --text-color: #333333;
      --muted: #64748b;
      --card-bg: #ffffff;
      --background-color: #f8fafc;
      --section-light-bg: #fdfdfd;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--background-color);
      color: var(--text-color);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      scroll-behavior: smooth;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    h1, h2, h3 {
      color: var(--primary-dark);
      font-weight: 800;
      letter-spacing: -0.8px;
    }

    /* ===== HEADER COM MENU (LP CLONE) ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 0;
      position: relative;
      z-index: 10;
    }

    .banner {
      width: 180px;
      height: auto;
    }

    .main-nav a {
      color: var(--primary-dark);
      text-decoration: none;
      font-weight: 600;
      font-size: 11px;
      margin-left: 1.5rem;
      transition: color 0.2s;
    }

    .main-nav a:hover {
      color: var(--accent-tech);
    }

    /* ===== BREADCRUMBS ===== */
    .breadcrumbs {
      padding: 1rem 0;
      font-size: 0.875rem;
      color: var(--muted);
    }

    .breadcrumbs a {
      color: var(--primary-dark);
      text-decoration: none;
    }

    .breadcrumbs a:hover {
      color: var(--accent-tech);
    }

    .breadcrumbs span {
      margin: 0 0.5rem;
    }

    /* ===== BLOG HEADER ===== */
    .blog-header {
      text-align: center;
      padding: 2rem 0 3rem;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 2rem;
    }

    .blog-header h1 {
      font-size: 2.5rem;
      line-height: 1.2;
      margin-bottom: 1rem;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }

    .blog-header .meta {
      color: var(--muted);
      font-size: 0.875rem;
    }

    /* ===== PRODUCT HERO ===== */
    .product-hero {
      display: flex;
      gap: 2rem;
      padding: 2rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 16px;
      margin-bottom: 3rem;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
      border: 1px solid #e0e0e0;
    }

    .product-hero img {
      width: 280px;
      height: 280px;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
    }

    .product-hero-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .product-hero-info h2 {
      font-size: 1.75rem;
      margin-bottom: 0.75rem;
    }

    .product-hero-info .brand {
      color: var(--accent-tech);
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .product-hero-info p {
      color: var(--muted);
      margin-bottom: 1.5rem;
      line-height: 1.7;
    }

    .product-hero-info .cta {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, var(--accent-tech) 0%, var(--accent-glow) 100%);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 700;
      font-size: 0.875rem;
      transition: all 0.3s;
      box-shadow: 0 5px 20px rgba(238, 122, 62, 0.4);
    }

    .product-hero-info .cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(238, 122, 62, 0.5);
    }

    /* ===== BLOG CONTENT ===== */
    .blog-content {
      max-width: 800px;
      margin: 0 auto;
      font-size: 1.1rem;
      line-height: 1.8;
    }

    .blog-content h2 {
      font-size: 1.75rem;
      margin: 2.5rem 0 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .blog-content h3 {
      font-size: 1.35rem;
      margin: 2rem 0 0.75rem;
    }

    .blog-content p {
      margin-bottom: 1.25rem;
    }

    .blog-content ul, .blog-content ol {
      margin: 1rem 0 1.5rem 1.5rem;
    }

    .blog-content li {
      margin-bottom: 0.5rem;
    }

    .blog-content strong {
      color: var(--primary-dark);
    }

    /* ===== FAQ SECTION (LP CLONE STYLE) ===== */
    .faq {
      max-width: 800px;
      margin: 3rem auto;
      padding-top: 2rem;
      border-top: 2px solid var(--primary-dark);
    }

    .faq h3 {
      font-size: 1.75rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .faq details {
      margin-bottom: 0.75rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: var(--card-bg);
      transition: all 0.3s;
    }

    .faq details:hover {
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
    }

    .faq summary {
      padding: 1.25rem;
      cursor: pointer;
      font-weight: 600;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      list-style: none;
      background: #f8f9fa;
      transition: background 0.2s;
    }

    .faq summary::-webkit-details-marker {
      display: none;
    }

    .faq summary:hover {
      background: #f0f0f0;
    }

    .faq summary i {
      color: var(--accent-tech);
    }

    .faq-answer {
      padding: 1.25rem;
      background: var(--card-bg);
      border-top: 1px solid #e0e0e0;
    }

    .faq-answer p {
      margin: 0;
      line-height: 1.7;
    }

    /* ===== CTA SECTION ===== */
    .cta-section {
      text-align: center;
      padding: 3rem 2rem;
      margin: 3rem 0;
      background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-gradient-dark) 100%);
      border-radius: 16px;
      color: white;
    }

    .cta-section p {
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
      opacity: 0.9;
    }

    .cta-section button {
      padding: 1rem 2.5rem;
      font-size: 1rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-tech) 0%, var(--accent-glow) 100%);
      color: white;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 5px 20px rgba(238, 122, 62, 0.4);
    }

    .cta-section button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(238, 122, 62, 0.5);
    }

    /* ===== FOOTER (LP CLONE) ===== */
    footer {
      background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-gradient-dark) 100%);
      color: white;
      padding: 3rem 0 2rem;
      margin-top: 4rem;
    }

    .footer-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }

    .footer-columns > div {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .footer-columns strong {
      font-size: 1rem;
      margin-bottom: 0.5rem;
      color: white;
    }

    .footer-columns p {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.8);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .footer-columns p i {
      width: 16px;
      color: var(--accent-tech);
    }

    .footer-columns a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.2s;
    }

    .footer-columns a:hover {
      color: var(--accent-tech);
    }

    .footer-social-links {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .footer-social-links a {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      font-size: 1.1rem;
      transition: all 0.3s;
    }

    .footer-social-links a:hover {
      background: var(--accent-tech);
      color: white;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        gap: 1rem;
      }

      .main-nav a {
        margin-left: 0.75rem;
        margin-right: 0.75rem;
      }

      .blog-header h1 {
        font-size: 1.75rem;
      }

      .product-hero {
        flex-direction: column;
        text-align: center;
      }

      .product-hero img {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
      }

      .blog-content {
        font-size: 1rem;
      }

      .footer-columns {
        grid-template-columns: 1fr;
        text-align: center;
      }

      .footer-social-links {
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  ${bodyScripts}
  
  <!-- HEADER (LP CLONE) -->
  <div class="container">
    <div class="header">
      ${companyProfile?.company_logo_url 
        ? `<img src="${escapeHtml(companyProfile.company_logo_url)}" alt="Logo ${escapeHtml(companyName)}" class="banner" width="180" height="60" loading="eager">`
        : `<strong style="font-size: 1.5rem; color: var(--primary-dark);">${escapeHtml(companyName)}</strong>`
      }
      <nav class="main-nav">
        ${headerLinks}
      </nav>
    </div>
  </div>
  
  <!-- BREADCRUMBS -->
  <div class="container">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${escapeHtml(companyProfile?.website_url || `https://${domain}`)}">Home</a>
      <span>›</span>
      <a href="https://${escapeHtml(domain)}/blog">Blog</a>
      <span>›</span>
      <span>${escapeHtml(product.name)}</span>
    </nav>
  </div>
  
  <!-- BLOG CONTENT -->
  <main class="container">
    <header class="blog-header">
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">Publicado por ${escapeHtml(companyName)} • ${new Date().toLocaleDateString('pt-BR')}</p>
    </header>
    
    ${product.image_url ? `
    <section class="product-hero">
      <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="eager">
      <div class="product-hero-info">
        <h2>${escapeHtml(product.name)}</h2>
        ${product.brand ? `<span class="brand">${escapeHtml(product.brand)}</span>` : ''}
        ${product.description ? `<p>${escapeHtml(product.description.substring(0, 200))}${product.description.length > 200 ? '...' : ''}</p>` : ''}
        ${product.product_url ? `<a href="${escapeHtml(product.product_url)}" class="cta"><i class="fas fa-shopping-cart"></i> Ver Produto</a>` : ''}
      </div>
    </section>
    ` : ''}
    
    <article class="blog-content">
      ${htmlContent}
    </article>
    
    ${faqSection}
    
    <section class="cta-section">
      <p>Quer saber mais sobre ${escapeHtml(product.name)}?</p>
      <button onclick="window.location.href='${escapeHtml(product.product_url || companyProfile?.website_url || '#')}'">
        <i class="fas fa-comment-alt"></i> Fale Conosco
      </button>
    </section>
  </main>

  <!-- FOOTER (LP CLONE) -->
  <footer>
    <div class="container">
      ${footerHTML}
    </div>
  </footer>

  <!-- GEO Context (Hidden for LLMs) -->
  <div class="geo-context" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;pointer-events:none;">
    <p>
      ${escapeHtml(companyName)} é especialista em ${escapeHtml(product.category || 'produtos odontológicos')}.
      Produto: ${escapeHtml(product.name)}.
      ${product.brand ? `Marca: ${escapeHtml(product.brand)}.` : ''}
      Localização: ${escapeHtml(companyProfile?.city || 'Brasil')}, ${escapeHtml(companyProfile?.state || 'BR')}.
    </p>
  </div>
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

    // 2. Get company profile with ALL fields for header/footer
    const { data: companyProfile, error: companyError } = await supabase
      .from('company_profile')
      .select('*')
      .single();

    if (companyError) {
      console.warn('[publish-product-blog] Company profile not found, using defaults');
    }

    // 3. Get domain config for tracking pixels
    const seoDomains = companyProfile?.seo_domains || [];
    const domainConfig = seoDomains.find((d: any) => d.domain === domain);
    const cloudflareProjectName = domainConfig?.cloudflare_project_name;
    const trackingPixels = domainConfig?.tracking_pixels || companyProfile?.tracking_pixels || null;

    if (!cloudflareProjectName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Domínio ${domain} não tem cloudflare_project_name configurado em seo_domains` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 4. Create or update publication record
    const finalPagePath = pagePath || `/blog/${product.slug || product.id}`;
    
    const { data: existingPub } = await supabase
      .from('product_blog_publications')
      .select('id')
      .eq('product_id', productId)
      .eq('blog_type', blogType)
      .eq('target_domain', domain)
      .maybeSingle();

    const publicationData = {
      product_id: productId,
      blog_type: blogType,
      target_domain: domain,
      page_path: finalPagePath,
      publish_status: 'publishing',
      updated_at: new Date().toISOString()
    };

    let publicationId: string;

    if (existingPub) {
      const { error: updateError } = await supabase
        .from('product_blog_publications')
        .update(publicationData)
        .eq('id', existingPub.id);

      if (updateError) throw updateError;
      publicationId = existingPub.id;
    } else {
      const { data: newPub, error: insertError } = await supabase
        .from('product_blog_publications')
        .insert(publicationData)
        .select('id')
        .single();

      if (insertError) throw insertError;
      publicationId = newPub.id;
    }

    // 5. Generate HTML with LP Clone header/footer
    const html = generateProductBlogHTML({
      product,
      blogType,
      content,
      faqs: faqs || [],
      domain,
      pagePath: finalPagePath,
      companyProfile,
      trackingPixels
    });

    console.log(`[publish-product-blog] HTML generated: ${html.length} bytes`);

    // 6. Upload to Cloudflare Pages
    const manifest: Record<string, string> = {};
    const htmlHash = await calculateBlake3Hash(html);
    manifest[finalPagePath === '/' ? '/index.html' : `${finalPagePath}.html`] = htmlHash;

    const formData = new FormData();
    formData.append('manifest', JSON.stringify(manifest));
    
    const htmlBlob = new Blob([html], { type: 'text/html' });
    formData.append(htmlHash, htmlBlob, `${htmlHash}.html`);

    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${cloudflareProjectName}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
        body: formData
      }
    );

    const uploadResult = await uploadResponse.json();
    console.log(`[publish-product-blog] Cloudflare response:`, uploadResult.success);

    if (!uploadResult.success) {
      await supabase
        .from('product_blog_publications')
        .update({
          publish_status: 'error',
          publish_error_message: uploadResult.errors?.[0]?.message || 'Erro desconhecido no Cloudflare'
        })
        .eq('id', publicationId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: uploadResult.errors?.[0]?.message || 'Erro no upload para Cloudflare' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 7. Update publication with success
    const publishedUrl = `https://${domain}${finalPagePath}`;
    
    await supabase
      .from('product_blog_publications')
      .update({
        publish_status: 'published',
        published_url: publishedUrl,
        cloudflare_deployment_id: uploadResult.result?.id,
        published_at: new Date().toISOString(),
        html_content: html,
        publish_error_message: null
      })
      .eq('id', publicationId);

    console.log(`[publish-product-blog] Success! Published to: ${publishedUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        publishedUrl,
        deploymentId: uploadResult.result?.id,
        publicationId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[publish-product-blog] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
