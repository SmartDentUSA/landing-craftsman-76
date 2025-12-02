import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// SMART DENT DATA - HARDCODED FALLBACK
// ============================================
const SMART_DENT_DATA = {
  company_name: "Smart Dent",
  website_url: "https://smartdent.com.br",
  company_logo_url: "https://pgfgripuanuwwolmtknn.supabase.co/storage/v1/object/public/product-images/smartdent-logo.png",
  contact_phone: "(11) 4200-7008",
  contact_email: "contato@smartdent.com.br",
  city: "São Paulo",
  state: "SP",
  country: "Brasil",
  postal_code: "01310-100",
  street_address: "Av. Paulista, 1000",
  tax_id: "12.345.678/0001-90",
  instagram_profile: "https://instagram.com/smartdentoficial",
  youtube_channel: "https://youtube.com/@smartdentoficial",
  company_description: "Smart Dent - Odontologia Digital Simples, Eficiente e Lucrativa. Scanners intraorais, impressoras 3D e soluções CAD/CAM para dentistas.",
};

interface SEOConfig {
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string;
  ogImage?: string;
}

interface CapturedImage {
  originalUrl: string;
  newUrl: string;
  supabasePath: string;
  status: 'success' | 'failed';
  error?: string;
  isHeroImage?: boolean;
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
  generatedSEO: SEOConfig;
}

// ============================================
// AUTO SEO GENERATION
// ============================================
function generateAutoSEO(html: string, brand: string, product: string, companyData: any): SEOConfig {
  const company = companyData?.company_name || SMART_DENT_DATA.company_name;
  const websiteUrl = companyData?.website_url || SMART_DENT_DATA.website_url;
  
  // Extract original title from HTML
  const originalTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || 
                        html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() || 
                        `${brand} ${product}`;
  
  // Extract description from meta or first meaningful paragraph
  let originalDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
                     html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)?.[1] || '';
  
  if (!originalDesc) {
    // Try to find first meaningful paragraph
    const paragraphs = html.matchAll(/<p[^>]*>([^<]{50,300})<\/p>/gi);
    for (const match of paragraphs) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text.length >= 50 && !text.includes('cookie') && !text.includes('©')) {
        originalDesc = text;
        break;
      }
    }
  }
  
  // Clean extracted text
  const cleanText = (text: string) => text.replace(/\s+/g, ' ').replace(/["\n\r]/g, '').trim();
  
  // Generate optimized SEO
  const brandClean = brand || 'Produto';
  const productClean = product || 'Odontológico';
  
  const seoTitle = `${productClean} ${brandClean} | ${company} - Especialista em Odontologia Digital`;
  
  const baseDesc = originalDesc ? cleanText(originalDesc).substring(0, 100) : '';
  const seoDescription = `Adquira ${productClean} da ${brandClean} com a ${company}. ${baseDesc}. Entrega para todo Brasil com suporte técnico especializado. Fale com um especialista!`.substring(0, 160);
  
  // Generate slug-friendly canonical
  const slug = `${brandClean}-${productClean}`.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const canonical = `${websiteUrl}/${slug}`;
  
  // Generate keywords
  const keywords = [
    productClean,
    brandClean,
    `${productClean} ${brandClean}`,
    'odontologia digital',
    'scanner intraoral',
    'impressora 3D odontológica',
    'CAD/CAM dental',
    company,
    'comprar scanner dental',
    `${brandClean} Brasil`,
  ].join(', ');
  
  console.log(`🎯 Auto SEO generated: ${seoTitle}`);
  
  return {
    title: seoTitle,
    description: seoDescription,
    canonical,
    keywords,
  };
}

// ============================================
// SANITIZE HTML
// ============================================
function sanitizeHTML(html: string): string {
  let sanitized = html
    .replace(/\s(onclick|onerror|onload|onmouseover|onfocus|onblur)="[^"]*"/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .replace(/<script[^>]*gtm[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<iframe[^>]*gtm[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<script[^>]*google-analytics[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*ga\s*\([^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*cookie[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<img[^>]*facebook[^>]*>/gi, '')
    .replace(/<img[^>]*pixel[^>]*>/gi, '');
  
  return sanitized;
}

// ============================================
// REMOVE MANUFACTURER ELEMENTS
// ============================================
function removeManufacturerElements(html: string): { html: string; headerRemoved: boolean; footerRemoved: boolean } {
  let result = html;
  let headerRemoved = false;
  let footerRemoved = false;
  
  const headerPatterns = [
    /<header[^>]*>[\s\S]*?<\/header>/gi,
    /<div[^>]*class="[^"]*site-header[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class="[^"]*navbar[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    /<nav[^>]*class="[^"]*main-nav[^"]*"[^>]*>[\s\S]*?<\/nav>/gi,
    /<div[^>]*id="masthead"[^>]*>[\s\S]*?<\/div>/gi,
  ];
  
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

// ============================================
// REWRITE CTAs
// ============================================
function rewriteCTAs(html: string, ctaUrl: string): { html: string; count: number } {
  let count = 0;
  let result = html;
  
  const ctaPatterns = [
    /(<a[^>]*class="[^"]*(?:btn|button|cta|elementor-button|wp-block-button)[^"]*"[^>]*href=")([^"]+)(")/gi,
    /(<a[^>]*href=")([^"]+)("[^>]*>(?:Comprar|Saiba mais|Fale conosco|Contato|Orçamento|WhatsApp|Solicitar|Agendar|Conhecer|Ver mais|Buy|Contact|Get|Request)[^<]*<\/a>)/gi,
    /(<a[^>]*href=")(https?:\/\/(?:api\.)?whatsapp\.com[^"]+)(")/gi,
    /(<a[^>]*href=")(https?:\/\/[^"]+(?:contato|contact|form|lead)[^"]+)(")/gi,
  ];
  
  for (const pattern of ctaPatterns) {
    result = result.replace(pattern, (match, before, url, after) => {
      if (url === ctaUrl) return match;
      if (url.startsWith('#')) return match;
      count++;
      return `${before}${ctaUrl}${after}`;
    });
  }
  
  return { html: result, count };
}

// ============================================
// SLUGIFY HELPER
// ============================================
function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================
// SEO-FRIENDLY FILENAME GENERATOR
// ============================================
function generateSEOFilename(
  originalFilename: string, 
  index: number, 
  brandSlug: string, 
  productSlug: string, 
  isHeroImage: boolean,
  contentType: string
): string {
  // Determine extension
  let ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  if (!/^(jpg|jpeg|png|gif|webp|svg|avif)$/.test(ext)) {
    ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  }
  
  // Generate SEO-friendly name
  if (isHeroImage && index === 0) {
    return `${brandSlug}-${productSlug}-hero.${ext}`;
  }
  
  return `${brandSlug}-${productSlug}-${String(index + 1).padStart(3, '0')}.${ext}`;
}

// ============================================
// REWRITE IMAGE ALT/TITLE ATTRIBUTES
// ============================================
function rewriteImageAttributes(
  html: string, 
  images: CapturedImage[], 
  brand: string, 
  product: string,
  companyName: string
): string {
  let result = html;
  
  // Generate SEO-optimized alt and title texts
  const altText = `${product} ${brand} vendido pela ${companyName}`;
  const titleText = `${product} ${brand} | ${companyName}`;
  
  for (const image of images) {
    if (image.status !== 'success') continue;
    
    // Escape special regex characters in the new URL
    const escapedUrl = image.newUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Find all <img> tags with this URL and rewrite alt/title
    const imgRegex = new RegExp(
      `(<img[^>]*src=["']${escapedUrl}["'])([^>]*)>`,
      'gi'
    );
    
    result = result.replace(imgRegex, (match, srcPart, restPart) => {
      // Remove existing alt and title attributes
      let cleanedRest = restPart
        .replace(/\s*alt=["'][^"']*["']/gi, '')
        .replace(/\s*title=["'][^"']*["']/gi, '');
      
      // Add new SEO-optimized attributes
      return `${srcPart} alt="${altText}" title="${titleText}"${cleanedRest}>`;
    });
  }
  
  console.log(`✅ Rewritten alt/title for ${images.filter(i => i.status === 'success').length} images`);
  return result;
}

// ============================================
// CAPTURE AND UPLOAD IMAGES
// ============================================
async function captureAndUploadImages(
  html: string,
  supabase: any,
  brand: string,
  product: string
): Promise<{ html: string; images: CapturedImage[]; heroImageUrl: string }> {
  const captured: CapturedImage[] = [];
  let processedHTML = html;
  let heroImageUrl = '';
  
  // Robust validation with trim and minimum length
  const brandClean = (brand || '').trim();
  const productClean = (product || '').trim();
  
  if (!brandClean || brandClean.length < 2) {
    console.error('❌ Brand validation failed');
    throw new Error('Marca é obrigatória (mínimo 2 caracteres)');
  }
  
  if (!productClean || productClean.length < 2) {
    console.error('❌ Product validation failed');
    throw new Error('Produto é obrigatório (mínimo 2 caracteres)');
  }
  
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
  
  // og:image content (capture but will be replaced)
  const ogMatches = html.matchAll(/property=["']og:image["'][^>]+content=["']([^"']+)["']/gi);
  for (const match of ogMatches) {
    if (match[1]) imageUrls.add(match[1]);
  }
  
  // Generate clean slugs for folder structure
  const brandSlug = slugify(brandClean);
  const productSlug = slugify(productClean);
  
  console.log(`📁 Images will be saved to: lp-clone-assets/${brandSlug}/${productSlug}/`);
  
  let imageIndex = 0;
  let firstHeroCandidate: CapturedImage | null = null;
  
  for (const originalUrl of imageUrls) {
    if (originalUrl.startsWith('data:')) continue;
    if (originalUrl.includes('supabase.co')) continue;
    if (!originalUrl.startsWith('http') && !originalUrl.startsWith('//')) continue;
    
    try {
      let fetchUrl = originalUrl;
      if (fetchUrl.startsWith('//')) {
        fetchUrl = 'https:' + fetchUrl;
      }
      
      console.log(`📥 Downloading: ${fetchUrl}`);
      
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
      
      // Check if this is a hero/banner image
      const isHeroImage = /hero|banner|main|featured|og|header|slide/i.test(originalUrl) || 
                          imageBuffer.byteLength > 100000; // Large images likely hero
      
      // Generate SEO-friendly filename
      const urlPath = new URL(fetchUrl).pathname;
      const originalFilename = urlPath.split('/').pop() || 'image';
      const seoFilename = generateSEOFilename(
        originalFilename, 
        imageIndex, 
        brandSlug, 
        productSlug, 
        isHeroImage && imageIndex === 0,
        contentType
      );
      
      // SEO-friendly path structure: brand/product/seo-filename
      const supabasePath = `${brandSlug}/${productSlug}/${seoFilename}`;
      
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
      
      const { data: publicData } = supabase.storage
        .from('lp-clone-assets')
        .getPublicUrl(supabasePath);
      
      const newUrl = publicData.publicUrl;
      
      const capturedImage: CapturedImage = {
        originalUrl,
        newUrl,
        supabasePath,
        status: 'success',
        isHeroImage,
      };
      
      // Set first large/hero image as OG image
      if (!heroImageUrl && isHeroImage) {
        heroImageUrl = newUrl;
        console.log(`🖼️ Hero image identified: ${newUrl}`);
      }
      
      // Keep track of first successful image as fallback
      if (!firstHeroCandidate && capturedImage.status === 'success') {
        firstHeroCandidate = capturedImage;
      }
      
      const escapedOriginal = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedHTML = processedHTML.replace(new RegExp(escapedOriginal, 'g'), newUrl);
      
      captured.push(capturedImage);
      
      console.log(`✅ Uploaded: ${supabasePath} (${seoFilename})`);
      imageIndex++;
      
    } catch (error) {
      console.error(`❌ Failed: ${originalUrl}:`, error);
      captured.push({
        originalUrl,
        newUrl: originalUrl,
        supabasePath: '',
        status: 'failed',
        error: (error as Error).message,
      });
    }
  }
  
  // GUARANTEE: OG Image must be from Supabase (never external)
  if (!heroImageUrl) {
    // Use first successful image as fallback
    if (firstHeroCandidate) {
      heroImageUrl = firstHeroCandidate.newUrl;
      console.log(`🖼️ Hero image fallback (first successful): ${heroImageUrl}`);
    }
  }
  
  // Final validation: hero image MUST be from Supabase
  if (heroImageUrl && !heroImageUrl.includes('supabase.co')) {
    console.warn('⚠️ Hero image is not from Supabase, clearing to use logo fallback');
    heroImageUrl = '';
  }
  
  return { html: processedHTML, images: captured, heroImageUrl };
}

// ============================================
// INJECT SEO WITH COMPLETE SCHEMA
// ============================================
function injectSEO(
  html: string, 
  seoConfig: SEOConfig, 
  companyData: any, 
  brand: string, 
  product: string,
  ogImageUrl: string
): string {
  let result = html;
  
  // Remove existing meta tags
  result = result
    .replace(/<title>[^<]*<\/title>/gi, '')
    .replace(/<meta[^>]*name=["']description["'][^>]*>/gi, '')
    .replace(/<meta[^>]*property=["']og:[^"']*["'][^>]*>/gi, '')
    .replace(/<meta[^>]*name=["']twitter:[^"']*["'][^>]*>/gi, '')
    .replace(/<link[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta[^>]*name=["']keywords["'][^>]*>/gi, '')
    .replace(/<meta[^>]*name=["']geo\.[^"']*["'][^>]*>/gi, '')
    .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Use Smart Dent data as fallback
  const company = companyData?.company_name || SMART_DENT_DATA.company_name;
  const websiteUrl = companyData?.website_url || SMART_DENT_DATA.website_url;
  const logoUrl = companyData?.company_logo_url || SMART_DENT_DATA.company_logo_url;
  const phone = companyData?.contact_phone || SMART_DENT_DATA.contact_phone;
  const email = companyData?.contact_email || SMART_DENT_DATA.contact_email;
  const city = companyData?.city || SMART_DENT_DATA.city;
  const state = companyData?.state || SMART_DENT_DATA.state;
  const country = companyData?.country || SMART_DENT_DATA.country;
  const postalCode = companyData?.postal_code || SMART_DENT_DATA.postal_code;
  const streetAddress = companyData?.street_address || SMART_DENT_DATA.street_address;
  const taxId = companyData?.tax_id || SMART_DENT_DATA.tax_id;
  const instagram = companyData?.instagram_profile || SMART_DENT_DATA.instagram_profile;
  const youtube = companyData?.youtube_channel || SMART_DENT_DATA.youtube_channel;
  const description = companyData?.company_description || SMART_DENT_DATA.company_description;
  
  const title = seoConfig.title || `${product} ${brand} | ${company}`;
  const metaDescription = seoConfig.description || description;
  const canonical = seoConfig.canonical || websiteUrl;
  const keywords = seoConfig.keywords || '';
  const finalOgImage = ogImageUrl || logoUrl;
  
  // Complete Schema.org with @graph
  const schemaGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${websiteUrl}/#organization`,
        "name": company,
        "url": websiteUrl,
        "logo": {
          "@type": "ImageObject",
          "url": logoUrl,
          "width": 200,
          "height": 60
        },
        "email": email,
        "telephone": phone,
        "taxID": taxId,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": streetAddress,
          "addressLocality": city,
          "addressRegion": state,
          "postalCode": postalCode,
          "addressCountry": country
        },
        "sameAs": [
          instagram,
          youtube
        ].filter(Boolean)
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}/#webpage`,
        "url": canonical,
        "name": title,
        "description": metaDescription,
        "inLanguage": "pt-BR",
        "isPartOf": {
          "@id": `${websiteUrl}/#website`
        },
        "publisher": {
          "@id": `${websiteUrl}/#organization`
        },
        "potentialAction": {
          "@type": "ReadAction",
          "target": [canonical]
        }
      },
      {
        "@type": "WebSite",
        "@id": `${websiteUrl}/#website`,
        "url": websiteUrl,
        "name": company,
        "description": description,
        "publisher": {
          "@id": `${websiteUrl}/#organization`
        },
        "inLanguage": "pt-BR"
      },
      {
        "@type": "Product",
        "@id": `${canonical}/#product`,
        "name": `${product} ${brand}`,
        "description": metaDescription,
        "image": finalOgImage,
        "brand": {
          "@type": "Brand",
          "name": brand
        },
        "offers": {
          "@type": "Offer",
          "url": canonical,
          "priceCurrency": "BRL",
          "availability": "https://schema.org/InStock",
          "seller": {
            "@id": `${websiteUrl}/#organization`
          }
        }
      }
    ]
  };
  
  const seoTags = `
    <!-- SEO Generated by Smart Dent LP Clone v2.0 -->
    <title>${title}</title>
    <meta name="description" content="${metaDescription}">
    <link rel="canonical" href="${canonical}">
    <meta name="keywords" content="${keywords}">
    <meta name="robots" content="index, follow">
    <meta name="author" content="${company}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="${company}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${finalOgImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:locale" content="pt_BR">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${metaDescription}">
    <meta name="twitter:image" content="${finalOgImage}">
    
    <!-- GEO Tags -->
    <meta name="geo.placename" content="${city}, ${state}">
    <meta name="geo.region" content="BR-${state}">
    <meta name="geo.country" content="${country}">
    <meta name="ICBM" content="-23.5505, -46.6333">
    
    <!-- Additional SEO -->
    <meta name="distribution" content="global">
    <meta name="rating" content="general">
    <meta name="revisit-after" content="7 days">
    <meta name="language" content="Portuguese">
    
    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    ${JSON.stringify(schemaGraph, null, 2)}
    </script>
  `;
  
  result = result.replace(/<head[^>]*>/i, `$&\n${seoTags}`);
  
  console.log(`📝 SEO injected: ${title}`);
  
  return result;
}

// ============================================
// INSERT SMART DENT HEADER & FOOTER
// ============================================
function insertSmartDentHeaderFooter(html: string, companyData: any, ctaUrl: string): string {
  let result = html;
  
  const company = companyData?.company_name || SMART_DENT_DATA.company_name;
  const logoUrl = companyData?.company_logo_url || SMART_DENT_DATA.company_logo_url;
  const websiteUrl = companyData?.website_url || SMART_DENT_DATA.website_url;
  const phone = companyData?.contact_phone || SMART_DENT_DATA.contact_phone;
  const email = companyData?.contact_email || SMART_DENT_DATA.contact_email;
  const city = companyData?.city || SMART_DENT_DATA.city;
  const state = companyData?.state || SMART_DENT_DATA.state;
  const instagram = companyData?.instagram_profile || SMART_DENT_DATA.instagram_profile;
  const youtube = companyData?.youtube_channel || SMART_DENT_DATA.youtube_channel;
  const taxId = companyData?.tax_id || SMART_DENT_DATA.tax_id;
  const description = companyData?.company_description || SMART_DENT_DATA.company_description;
  
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
      ${logoUrl ? `<img src="${logoUrl}" alt="${company}" style="height: 40px; width: auto;">` : `<span style="color: #fff; font-size: 20px; font-weight: bold;">${company}</span>`}
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
      ">
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
          ${logoUrl ? `<img src="${logoUrl}" alt="${company}" style="height: 48px; width: auto; margin-bottom: 16px;">` : `<h3 style="color: #fff; margin-bottom: 16px;">${company}</h3>`}
          <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0;">
            ${description?.substring(0, 150) || 'Odontologia Digital Simples, Eficiente e Lucrativa'}...
          </p>
        </div>
        <div>
          <h4 style="color: #fff; margin-bottom: 16px; font-size: 16px;">Contato</h4>
          ${phone ? `<p style="font-size: 14px; color: #a0a0a0; margin-bottom: 8px;">📞 ${phone}</p>` : ''}
          ${email ? `<p style="font-size: 14px; color: #a0a0a0; margin-bottom: 8px;">✉️ ${email}</p>` : ''}
          ${city ? `<p style="font-size: 14px; color: #a0a0a0;">📍 ${city}${state ? `, ${state}` : ''}</p>` : ''}
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
          © ${new Date().getFullYear()} ${company}. Todos os direitos reservados.
          ${taxId ? ` | CNPJ: ${taxId}` : ''}
        </p>
      </div>
    </div>
  </footer>
  `;
  
  // Insert after <body>
  result = result.replace(/<body[^>]*>/i, `$&\n${SMART_DENT_HEADER}`);
  // Insert before </body>
  result = result.replace(/<\/body>/i, `${SMART_DENT_FOOTER}\n</body>`);
  
  return result;
}

// ============================================
// MAIN PROCESSING FUNCTION
// ============================================
async function processLandingPage(
  html: string,
  ctaUrl: string,
  seoConfig: SEOConfig,
  brand: string,
  product: string,
  supabase: any,
  companyData: any
): Promise<TransformResult> {
  const companyName = companyData?.company_name || SMART_DENT_DATA.company_name;
  const logoUrl = companyData?.company_logo_url || SMART_DENT_DATA.company_logo_url;
  
  console.log(`🚀 Starting LP Clone v2.1 for ${brand} ${product}`);
  
  // Step 1: Sanitize
  let processedHTML = sanitizeHTML(html);
  console.log('✅ HTML sanitized');
  
  // Step 2: Remove manufacturer elements
  const { html: cleanedHTML, headerRemoved, footerRemoved } = removeManufacturerElements(processedHTML);
  processedHTML = cleanedHTML;
  console.log(`✅ Manufacturer elements removed (header: ${headerRemoved}, footer: ${footerRemoved})`);
  
  // Step 3: Rewrite CTAs
  const { html: ctaHTML, count: ctasRewritten } = rewriteCTAs(processedHTML, ctaUrl);
  processedHTML = ctaHTML;
  console.log(`✅ ${ctasRewritten} CTAs rewritten`);
  
  // Step 4: Capture and upload images with proper folder structure
  const { html: imageHTML, images, heroImageUrl } = await captureAndUploadImages(processedHTML, supabase, brand, product);
  processedHTML = imageHTML;
  console.log(`✅ ${images.filter(i => i.status === 'success').length} images captured to /${slugify(brand)}/${slugify(product)}/`);
  
  // Step 4.5: REWRITE IMAGE ALT/TITLE ATTRIBUTES (NEW in v2.1)
  processedHTML = rewriteImageAttributes(processedHTML, images, brand, product, companyName);
  
  // Step 5: Generate auto SEO if not provided
  const autoSEO = generateAutoSEO(html, brand, product, companyData);
  
  // GUARANTEE: OG Image must be from Supabase or use company logo
  let finalOgImage = heroImageUrl;
  if (!finalOgImage || !finalOgImage.includes('supabase.co')) {
    finalOgImage = logoUrl;
    console.log(`🖼️ OG Image fallback to company logo: ${finalOgImage}`);
  }
  
  const finalSEO: SEOConfig = {
    title: seoConfig.title || autoSEO.title,
    description: seoConfig.description || autoSEO.description,
    canonical: seoConfig.canonical || autoSEO.canonical,
    keywords: seoConfig.keywords || autoSEO.keywords,
    ogImage: finalOgImage,
  };
  console.log(`✅ SEO configured: ${finalSEO.title}`);
  
  // Step 6: Inject SEO with complete Schema
  processedHTML = injectSEO(processedHTML, finalSEO, companyData, brand, product, finalOgImage);
  console.log('✅ SEO and Schema.org injected');
  
  // Step 7: Insert Smart Dent header/footer
  processedHTML = insertSmartDentHeaderFooter(processedHTML, companyData, ctaUrl);
  console.log('✅ Smart Dent header/footer inserted');
  
  const stats = {
    imagesProcessed: images.filter(i => i.status === 'success').length,
    imagesFailed: images.filter(i => i.status === 'failed').length,
    ctasRewritten,
    cssPreserved: true,
    headerRemoved,
    footerRemoved,
  };
  
  const score = calculateScore(stats, finalSEO, finalOgImage);
  console.log(`🎉 LP Clone v2.1 complete! Score: ${score}/10`);
  
  return {
    html: processedHTML,
    capturedImages: images,
    stats,
    generatedSEO: finalSEO,
  };
}

function calculateScore(stats: any, seo: SEOConfig, ogImage: string): number {
  let score = 5; // Base
  if (stats.imagesProcessed > 0) score += 1;
  if (stats.ctasRewritten > 0) score += 1;
  if (seo.title && !seo.title.includes('Nova Empresa') && !seo.title.includes('unknown')) score += 1;
  if (seo.description && seo.description.length > 50) score += 1;
  if (seo.canonical && seo.canonical.includes('smartdent')) score += 0.5;
  if (ogImage && ogImage.includes('supabase.co')) score += 0.5; // OG from own domain
  return Math.min(Math.round(score * 10) / 10, 10);
}

// ============================================
// SERVE FUNCTION
// ============================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { html, ctaUrl, seoConfig = {}, brand, product } = await req.json();
    
    if (!html || !ctaUrl) {
      throw new Error('HTML e URL do CTA são obrigatórios');
    }
    
    // Robust brand/product validation with trim and minimum length
    const brandClean = (brand || '').trim();
    const productClean = (product || '').trim();
    
    if (!brandClean || brandClean.length < 2) {
      throw new Error('Marca é obrigatória (mínimo 2 caracteres)');
    }
    
    if (!productClean || productClean.length < 2) {
      throw new Error('Produto é obrigatório (mínimo 2 caracteres)');
    }
    
    console.log(`📋 Request: brand=${brand}, product=${product}, ctaUrl=${ctaUrl}`);
    
    // Fetch company data
    const { data: companyData } = await supabase
      .from('company_profile')
      .select('*')
      .single();
    
    // Use SMART_DENT_DATA as fallback
    const finalCompanyData = companyData || SMART_DENT_DATA;
    
    const result = await processLandingPage(
      html,
      ctaUrl,
      seoConfig,
      brand,
      product,
      supabase,
      finalCompanyData
    );
    
    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
