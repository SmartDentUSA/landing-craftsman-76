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
// PRESERVE VIDEOS (NEW in v3.0)
// ============================================
function countVideos(html: string): number {
  const videoPatterns = [
    /<video[^>]*>/gi,
    /<iframe[^>]*(?:youtube|vimeo|youtu\.be)[^>]*>/gi,
    /<embed[^>]*>/gi,
  ];
  
  let count = 0;
  for (const pattern of videoPatterns) {
    const matches = html.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

// ============================================
// REMOVE MANUFACTURER ELEMENTS (preserving videos)
// ============================================
function removeManufacturerElements(html: string): { html: string; headerRemoved: boolean; footerRemoved: boolean; videosPreserved: number } {
  let result = html;
  let headerRemoved = false;
  let footerRemoved = false;
  
  // Count videos before processing
  const videosPreserved = countVideos(html);
  console.log(`🎥 Found ${videosPreserved} videos to preserve`);
  
  // Header patterns - be more careful not to remove video containers
  const headerPatterns = [
    /<header[^>]*>(?![\s\S]*<(?:video|iframe)[\s\S]*?<\/header>)[\s\S]*?<\/header>/gi,
    /<div[^>]*class="[^"]*site-header[^"]*"[^>]*>(?![\s\S]*<(?:video|iframe))[\s\S]*?<\/div>/gi,
    /<nav[^>]*class="[^"]*main-nav[^"]*"[^>]*>[\s\S]*?<\/nav>/gi,
    /<div[^>]*id="masthead"[^>]*>[\s\S]*?<\/div>/gi,
  ];
  
  const footerPatterns = [
    /<footer[^>]*>(?![\s\S]*<(?:video|iframe)[\s\S]*?<\/footer>)[\s\S]*?<\/footer>/gi,
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
  
  return { html: result, headerRemoved, footerRemoved, videosPreserved };
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
// INJECT PREMIUM CSS DESIGN SYSTEM
// ============================================
function injectPremiumCSS(): string {
  return `
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- PREMIUM CSS DESIGN SYSTEM (IGUAL LP SPIN) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    
    <style>
      /* ===== DESIGN SYSTEM GEMINI V4.5 ===== */
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

      /* ===== HEADER PREMIUM ===== */
      .sd-premium-header {
        position: sticky;
        top: 0;
        z-index: 9999;
        background: var(--card-bg);
        border-bottom: 1px solid #e0e0e0;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      }
      
      .sd-premium-header .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
      }
      
      .sd-premium-header .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
      }
      
      .sd-premium-header .banner {
        width: 160px;
        height: auto;
      }
      
      .sd-premium-header .main-nav {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .sd-premium-header .main-nav a {
        color: var(--primary-dark);
        text-decoration: none;
        font-weight: 600;
        font-size: 12px;
        padding: 8px 16px;
        border-radius: 6px;
        transition: all 0.2s;
        font-family: 'Inter', sans-serif;
      }
      
      .sd-premium-header .main-nav a:hover {
        color: var(--accent-tech);
        background: rgba(238, 122, 62, 0.08);
      }
      
      .sd-premium-header .cta-button {
        background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
        color: #fff !important;
        padding: 10px 20px !important;
        border-radius: 25px !important;
        font-weight: 600 !important;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
      }
      
      .sd-premium-header .cta-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
        background: linear-gradient(135deg, #128C7E 0%, #25D366 100%) !important;
      }

      /* ===== FOOTER PREMIUM (IGUAL LP SPIN) ===== */
      .sd-premium-footer {
        background: linear-gradient(to bottom, var(--primary-dark), var(--primary-gradient-dark));
        color: #e0e0e0;
        padding: 3rem 0 2rem;
        margin-top: 3rem;
        font-family: 'Inter', sans-serif;
      }
      
      .sd-premium-footer .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
      }
      
      .sd-premium-footer .footer-columns {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 2rem;
        margin-bottom: 2rem;
      }
      
      .sd-premium-footer .footer-columns > div {
        flex: 1;
        min-width: 200px;
      }
      
      .sd-premium-footer .footer-columns strong {
        color: var(--accent-glow);
        font-size: 16px;
        display: block;
        margin-bottom: 0.75rem;
        font-weight: 700;
      }
      
      .sd-premium-footer .footer-columns p {
        color: #ccc;
        font-size: 14px;
        line-height: 1.8;
        margin: 0.4rem 0;
      }
      
      .sd-premium-footer .footer-columns p i {
        width: 20px;
        margin-right: 8px;
        color: var(--accent-tech);
      }
      
      .sd-premium-footer .footer-columns a {
        color: #b0c4de;
        font-size: 14px;
        text-decoration: none;
        display: block;
        margin: 0.5rem 0;
        transition: color 0.2s;
      }
      
      .sd-premium-footer .footer-columns a:hover {
        color: var(--accent-glow);
      }
      
      .sd-premium-footer .footer-social-links {
        display: flex;
        gap: 12px;
        margin-top: 0.75rem;
      }
      
      .sd-premium-footer .footer-social-links a {
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.1);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 18px;
        transition: all 0.3s;
        margin: 0;
      }
      
      .sd-premium-footer .footer-social-links a:hover {
        background: var(--accent-tech);
        transform: translateY(-3px);
        box-shadow: 0 4px 15px rgba(238, 122, 62, 0.4);
      }
      
      .sd-premium-footer .footer-bottom {
        border-top: 1px solid rgba(255,255,255,0.1);
        padding-top: 1.5rem;
        text-align: center;
      }
      
      .sd-premium-footer .footer-bottom p {
        font-size: 12px;
        color: #888;
        margin: 0;
      }

      /* ===== STICKY CTA MOBILE ===== */
      .sd-sticky-cta {
        display: none;
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        padding: 12px 20px;
        background: linear-gradient(135deg, var(--primary-dark), var(--primary-gradient-dark));
        z-index: 9998;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
      }
      
      .sd-sticky-cta button {
        width: 100%;
        background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
        color: #fff;
        border: none;
        padding: 14px 24px;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-family: 'Inter', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: all 0.3s;
      }
      
      .sd-sticky-cta button:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 20px rgba(37, 211, 102, 0.5);
      }
      
      @media (max-width: 768px) {
        .sd-sticky-cta {
          display: block;
        }
        
        .sd-premium-header .main-nav a:not(.cta-button) {
          display: none;
        }
        
        .sd-premium-footer .footer-columns {
          flex-direction: column;
        }
        
        body {
          padding-bottom: 80px;
        }
      }

      /* ===== GEO CONTEXT (INVISÍVEL PARA USUÁRIOS) ===== */
      .geo-context {
        position: absolute;
        left: -9999px;
        opacity: 0;
        pointer-events: none;
      }
    </style>
  `;
}

// ============================================
// INJECT SEO WITH COMPLETE SCHEMA + GEO + HREFLANG
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
    .replace(/<meta[^>]*name=["']ICBM["'][^>]*>/gi, '')
    .replace(/<link[^>]*rel=["']alternate["'][^>]*hreflang[^>]*>/gi, '')
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
  
  // SEO fields for GEO enrichment
  const seoServiceAreas = companyData?.seo_service_areas || '';
  const seoMarketPositioning = companyData?.seo_market_positioning || '';
  const seoCompetitiveAdvantages = companyData?.seo_competitive_advantages || '';
  const seoTechnicalExpertise = companyData?.seo_technical_expertise || '';
  const foundedYear = companyData?.founded_year || '';
  const missionStatement = companyData?.mission_statement || '';
  
  const title = seoConfig.title || `${product} ${brand} | ${company}`;
  const metaDescription = seoConfig.description || description;
  const canonical = seoConfig.canonical || websiteUrl;
  const keywords = seoConfig.keywords || '';
  const finalOgImage = ogImageUrl || logoUrl;
  
  // Complete Schema.org with @graph + SpeakableSpecification
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
        ...(foundedYear && { "foundingDate": foundedYear.toString() }),
        ...(missionStatement && { "mission": missionStatement }),
        ...(seoTechnicalExpertise && { "knowsAbout": seoTechnicalExpertise.split(',').map((s: string) => s.trim()) }),
        "address": {
          "@type": "PostalAddress",
          "streetAddress": streetAddress,
          "addressLocality": city,
          "addressRegion": state,
          "postalCode": postalCode,
          "addressCountry": country
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": phone,
          "contactType": "customer service",
          "email": email,
          "areaServed": "BR",
          "availableLanguage": "pt-BR"
        },
        "sameAs": [instagram, youtube].filter(Boolean)
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}/#webpage`,
        "url": canonical,
        "name": title,
        "description": metaDescription,
        "inLanguage": "pt-BR",
        "isPartOf": { "@id": `${websiteUrl}/#website` },
        "publisher": { "@id": `${websiteUrl}/#organization` },
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": ["h1", "h2", ".hero-title", ".hero-subtitle", "p.lead"]
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
        "publisher": { "@id": `${websiteUrl}/#organization` },
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
          "seller": { "@id": `${websiteUrl}/#organization` }
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": websiteUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": brand,
            "item": `${websiteUrl}/marca/${slugify(brand)}`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": product,
            "item": canonical
          }
        ]
      }
    ]
  };
  
  const seoTags = `
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SEO Generated by Smart Dent LP Clone v2.1 Premium -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <title>${title}</title>
    <meta name="description" content="${metaDescription}">
    <link rel="canonical" href="${canonical}">
    <meta name="keywords" content="${keywords}">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
    <meta name="author" content="${company}">
    <meta name="generator" content="Smart Dent LP Clone v2.1">
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- OPEN GRAPH (Facebook, LinkedIn, WhatsApp) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="${company}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${finalOgImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${product} ${brand} - ${company}">
    <meta property="og:locale" content="pt_BR">
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- TWITTER CARDS -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${metaDescription}">
    <meta name="twitter:image" content="${finalOgImage}">
    <meta name="twitter:image:alt" content="${product} ${brand} - ${company}">
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- GEO TAGS (Localização para SEO Local) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <meta name="geo.placename" content="${city}, ${state}">
    <meta name="geo.region" content="BR-${state}">
    <meta name="geo.country" content="${country}">
    <meta name="geo.position" content="-23.5505;-46.6333">
    <meta name="ICBM" content="-23.5505, -46.6333">
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- HREFLANG (Multi-idioma/domínio) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <link rel="alternate" hreflang="pt-BR" href="${canonical}">
    <link rel="alternate" hreflang="x-default" href="${canonical}">
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- RESOURCE HINTS (Performance) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="dns-prefetch" href="https://fonts.googleapis.com">
    <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
    ${finalOgImage ? `<link rel="preload" as="image" href="${finalOgImage}" fetchpriority="high">` : ''}
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- ADDITIONAL SEO -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <meta name="distribution" content="global">
    <meta name="rating" content="general">
    <meta name="revisit-after" content="7 days">
    <meta name="language" content="Portuguese">
    <meta name="copyright" content="${company}">
    <meta name="theme-color" content="#3E4B5E">
    <meta name="msapplication-TileColor" content="#3E4B5E">
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SCHEMA.ORG JSON-LD (@graph consolidado com SpeakableSpecification) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <script type="application/ld+json">
    ${JSON.stringify(schemaGraph, null, 2)}
    </script>
    
    ${injectPremiumCSS()}
  `;
  
  result = result.replace(/<head[^>]*>/i, `$&\n${seoTags}`);
  
  console.log(`📝 SEO Premium injected: ${title}`);
  
  return result;
}

// ============================================
// INSERT PREMIUM HEADER & FOOTER (v3.0 - IGUAL LP SPIN)
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
  const streetAddress = companyData?.street_address || SMART_DENT_DATA.street_address;
  const addressNumber = companyData?.address_number || '';
  const postalCode = companyData?.postal_code || SMART_DENT_DATA.postal_code;
  const instagram = companyData?.instagram_profile || SMART_DENT_DATA.instagram_profile;
  const youtube = companyData?.youtube_channel || SMART_DENT_DATA.youtube_channel;
  const taxId = companyData?.tax_id || SMART_DENT_DATA.tax_id;
  
  // SEO fields for GEO context
  const seoServiceAreas = companyData?.seo_service_areas || '';
  const seoMarketPositioning = companyData?.seo_market_positioning || '';
  const seoCompetitiveAdvantages = companyData?.seo_competitive_advantages || '';
  const seoTechnicalExpertise = companyData?.seo_technical_expertise || '';
  
  // ✅ NEW: Use navigation_footer_config (igual SPIN)
  const navConfig = companyData?.navigation_footer_config;
  const navMenu = navConfig?.navigation_menu || [];
  const footerConfig = navConfig?.footer;
  const hasCustomFooter = footerConfig && (
    footerConfig.locations?.length > 0 || 
    footerConfig.links?.length > 0 || 
    footerConfig.social_links?.length > 0
  );
  
  // Institutional links as fallback
  const institutionalLinks = companyData?.institutional_links || [];
  
  // ✅ HEADER DINÂMICO COM NAVIGATION_MENU
  const menuHtml = navMenu.length > 0 
    ? navMenu.map((item: any) => `<a href="${item.href || '#'}" ${item.openInNewTab ? 'target="_blank"' : ''} title="${item.label}">${item.label}</a>`).join('')
    : `
      <a href="${websiteUrl}" title="Início">Início</a>
      <a href="https://loja.smartdent.com.br/" title="Loja">Loja</a>
      <a href="${websiteUrl}/blog" title="Blog">Blog</a>
    `;
  
  const PREMIUM_HEADER = `
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SMART DENT PREMIUM HEADER (v3.0 - DINÂMICO) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <header class="sd-premium-header">
    <div class="container">
      <div class="header">
        <a href="${websiteUrl}" title="${company} - Site Principal">
          ${logoUrl 
            ? `<img src="${logoUrl}" alt="${company}" class="banner" width="160" height="48" loading="eager">` 
            : `<span style="color: var(--primary-dark); font-size: 20px; font-weight: 800; font-family: 'Inter', sans-serif;">${company}</span>`
          }
        </a>
        <nav class="main-nav">
          ${menuHtml}
          <a href="${ctaUrl}" class="cta-button" title="Fale com um Especialista">
            <i class="fab fa-whatsapp"></i>
            Falar com Especialista
          </a>
        </nav>
      </div>
    </div>
  </header>
  `;
  
  // ✅ FOOTER DINÂMICO (IGUAL LP SPIN)
  let footerColumnsHtml = '';
  
  if (hasCustomFooter) {
    // Footer baseado em navigation_footer_config (igual SPIN)
    footerColumnsHtml = `
      ${footerConfig.locations && footerConfig.locations.length > 0 
        ? footerConfig.locations.map((loc: any) => `
          <div>
            <strong>${loc.label || company}</strong>
            ${loc.phone ? `<p><i class="fas fa-phone"></i> ${loc.phone}</p>` : ''}
            ${loc.email ? `<p><i class="fas fa-envelope"></i> ${loc.email}</p>` : ''}
            ${loc.address ? `<p><i class="fas fa-map-marker-alt"></i> ${loc.address}</p>` : ''}
          </div>
        `).join('') 
        : `
          <div>
            <strong>${company} - Brasil</strong>
            ${phone ? `<p><i class="fas fa-phone"></i> Atendimento: ${phone}</p>` : ''}
            ${email ? `<p><i class="fas fa-envelope"></i> Comercial: ${email}</p>` : ''}
            ${streetAddress ? `<p><i class="fas fa-map-marker-alt"></i> ${streetAddress}${addressNumber ? `, ${addressNumber}` : ''}</p>` : ''}
            ${city ? `<p>${city} - ${state}, ${postalCode}</p>` : ''}
          </div>
        `
      }
      
      ${footerConfig.links && footerConfig.links.length > 0 ? `
        <div>
          <strong>Links Úteis</strong>
          ${footerConfig.links.map((link: any) => `
            <a href="${link.href}" target="${link.openInNewTab ? '_blank' : '_self'}" rel="noopener">${link.label}</a>
          `).join('')}
        </div>
      ` : institutionalLinks.length > 0 ? `
        <div>
          <strong>Links Úteis</strong>
          ${institutionalLinks.slice(0, 5).map((link: any) => `
            <a href="${link.url || link.href}" target="_blank" rel="noopener">${link.label}</a>
          `).join('')}
        </div>
      ` : ''}
      
      ${footerConfig.social_links && footerConfig.social_links.length > 0 ? `
        <div>
          <strong>Redes Sociais</strong>
          <div class="footer-social-links">
            ${footerConfig.social_links.map((social: any) => `
              <a href="${social.href}" target="_blank" rel="noopener noreferrer" title="${social.icon_alt || social.platform || ''}">
                <i class="fab fa-${social.platform || 'link'}"></i>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  } else {
    // Footer padrão (fallback)
    footerColumnsHtml = `
      <div>
        <strong>${company} - Brasil</strong>
        ${phone ? `<p><i class="fas fa-phone"></i> Atendimento: ${phone}</p>` : ''}
        ${email ? `<p><i class="fas fa-envelope"></i> Comercial: ${email}</p>` : ''}
        ${streetAddress ? `<p><i class="fas fa-map-marker-alt"></i> ${streetAddress}${addressNumber ? `, ${addressNumber}` : ''}</p>` : ''}
        ${city ? `<p>${city} - ${state}, ${postalCode}</p>` : ''}
      </div>
      
      <div>
        <strong>Links Úteis</strong>
        <a href="${websiteUrl}/politica-privacidade" rel="noopener">Política de Privacidade</a>
        <a href="${websiteUrl}/termos" rel="noopener">Termos de Uso</a>
        <a href="${websiteUrl}" rel="noopener">Site Principal</a>
        <a href="https://loja.smartdent.com.br/" rel="noopener" target="_blank">Loja Online</a>
        ${institutionalLinks.slice(0, 3).map((link: any) => 
          `<a href="${link.url || link.href}" target="_blank" rel="noopener">${link.label}</a>`
        ).join('')}
      </div>
      
      <div>
        <strong>Redes Sociais</strong>
        <div class="footer-social-links">
          ${instagram ? `<a href="${instagram}" target="_blank" rel="noopener noreferrer" title="Instagram ${company}"><i class="fab fa-instagram"></i></a>` : ''}
          ${youtube ? `<a href="${youtube}" target="_blank" rel="noopener noreferrer" title="YouTube ${company}"><i class="fab fa-youtube"></i></a>` : ''}
          <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" title="WhatsApp ${company}"><i class="fab fa-whatsapp"></i></a>
        </div>
      </div>
    `;
  }
  
  const PREMIUM_FOOTER = `
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SMART DENT PREMIUM FOOTER (v3.0 - IGUAL LP SPIN) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <footer class="sd-premium-footer">
    <div class="container">
      <div class="footer-columns">
        ${footerColumnsHtml}
      </div>
      
      <div class="footer-bottom">
        <p>
          © ${new Date().getFullYear()} ${company}. Todos os direitos reservados.
          ${taxId ? ` | CNPJ: ${taxId}` : ''}
        </p>
      </div>
    </div>
  </footer>
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- STICKY CTA MOBILE -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="sd-sticky-cta">
    <button onclick="window.location.href='${ctaUrl}'">
      <i class="fab fa-whatsapp"></i> FALE COM ESPECIALISTA
    </button>
  </div>
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- GEO CONTEXT (Invisível para usuários, visível para IAs/Crawlers) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <aside class="geo-context" aria-hidden="true">
    <p itemscope itemtype="https://schema.org/Organization">
      <span itemprop="name">${company}</span> é especialista em odontologia digital.
      ${seoTechnicalExpertise ? `Expertise técnica: ${seoTechnicalExpertise}.` : ''}
      ${seoServiceAreas ? `Áreas de atendimento: ${seoServiceAreas}.` : ''}
      ${seoMarketPositioning ? `Posicionamento: ${seoMarketPositioning}.` : ''}
      ${seoCompetitiveAdvantages ? `Diferenciais: ${seoCompetitiveAdvantages}.` : ''}
      Localização: ${city || 'Brasil'}, ${state || 'BR'}.
    </p>
  </aside>
  `;
  
  // Insert after <body>
  result = result.replace(/<body[^>]*>/i, `$&\n${PREMIUM_HEADER}`);
  // Insert before </body>
  result = result.replace(/<\/body>/i, `${PREMIUM_FOOTER}\n</body>`);
  
  console.log(`✅ Premium Header/Footer v3.0 inserted (dynamic: ${hasCustomFooter ? 'yes' : 'fallback'})`);
  
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
  
  // Step 2: Remove manufacturer elements (preserving videos)
  const { html: cleanedHTML, headerRemoved, footerRemoved, videosPreserved } = removeManufacturerElements(processedHTML);
  processedHTML = cleanedHTML;
  console.log(`✅ Manufacturer elements removed (header: ${headerRemoved}, footer: ${footerRemoved}, videos preserved: ${videosPreserved})`);
  
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
    videosPreserved,
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
