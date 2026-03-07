import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchAggregateRating, type AggregateRatingData } from "../_shared/aggregate-rating-helper.ts";
import { fetchLocalBusinessData, generateLocalBusinessSchema, type LocalBusinessData } from "../_shared/local-business-helper.ts";
import { generateHowToSchema, fetchProductsWithWorkflow, type ProductWithWorkflow } from "../_shared/howto-schema-helper.ts";
// ✅ FASE 9: BreadcrumbList Schema Helper centralizado
import { generateLandingPageBreadcrumbs, slugify as breadcrumbSlugify } from "../_shared/breadcrumb-schema-helper.ts";
// ✅ FASE 3: Person Schema Helper (E-E-A-T)
import { generatePersonSchema, fetchAllApprovedKOLs, type PersonSchemaData } from "../_shared/person-schema-helper.ts";
// ✅ FASE 6: FAQPage Schema Helper
import { generateFAQPageSchema, type FAQItem } from "../_shared/faq-schema-helper.ts";
// ✅ FASE 7: ItemList Schema Helper
import { generateProductItemListSchema, generateGenericItemListSchema, type ItemListProduct } from "../_shared/itemlist-schema-helper.ts";
// ✅ FASE 8: VideoObject Schema Helper
import { generateVideoObjectSchema, extractYouTubeId, getYouTubeThumbnail, getYouTubeEmbedUrl, type VideoSchemaData } from "../_shared/video-schema-helper.ts";
// ✅ TRACKING: GTM, GA4, Meta Pixel, TikTok Pixel
import { injectTrackingIntoHTML, getTrackingSummary, type TrackingPixels } from "../_shared/tracking-injector.ts";
// ✅ FASE 10: Authority Data Helper (E-E-A-T, Trust Signals, GEO SEO) - VERSÃO COMPLETA
import { 
  fetchAuthorityData,
  fetchVideoTestimonials,
  generateAuthorityContextHTML, 
  generateAuthorityMetaTags,
  enrichOrganizationSchema,
  enrichProductSchema,
  generateSameAsSchema,
  generateCompanyVideoSchemas,
  generateVideoTestimonialSchemas,
  generateVideoGallerySchema,
  type AuthorityData,
  type VideoTestimonial
} from "../_shared/authority-data-helper.ts";
// ✅ SEO Fine-Tuning 10/10 - Shared Module
import { 
  expandFounderSameAs,
  generateServiceSchemas,
  generateHasCredential,
  deduplicateKeywords,
  aggregateFAQsFromProducts as seoAggregateFAQs,
  generateHreflangHTML
} from "../_shared/seo-fine-tuning.ts";

// 🤖 AI Readiness Helpers
import { enrichGraphWithAIReadiness, generateLandingPageAISummary, generateEntityIndexHTML, generateDefinedTermSetSchema } from "../_shared/ai-readiness-helpers.ts";

// ✅ FASE 9: Wrapper para manter compatibilidade
function generateLandingPageBreadcrumbsForClone(
  data: { name: string; brand?: string; canonicalUrl?: string },
  options: { websiteUrl: string; websiteName?: string }
): Record<string, any> {
  return generateLandingPageBreadcrumbs(data, options);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================
// ESCAPE HTML - Prevent XSS in dynamic content
// ============================================
function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================
// NORMALIZE HTML ENCODING (FIX DOUBLE-ENCODED UTF-8)
// ============================================
function normalizeHTMLEncoding(html: string): string {
  // Mapeamento de caracteres double-encoded UTF-8 para corretos
  const fixes: [RegExp, string][] = [
    // Emojis comuns malformados
    [/ðŸš€/g, '🚀'],
    [/âž¡ï¸/g, '➡️'],
    [/ðŸ"¥/g, '🔥'],
    [/ðŸ'‰/g, '👉'],
    [/âœ…/g, '✅'],
    [/âŒ/g, '❌'],
    [/ðŸ'¡/g, '💡'],
    [/ðŸŽ¯/g, '🎯'],
    [/ðŸ'¬/g, '💬'],
    [/ðŸ"/g, '📌'],
    [/ðŸ"‹/g, '📋'],
    [/ðŸ'€/g, '👀'],
    [/ðŸ'ª/g, '💪'],
    [/ðŸ†/g, '🏆'],
    [/ðŸ"ˆ/g, '📈'],
    [/ðŸ'¥/g, '👥'],
    [/ðŸ"/g, '🔍'],
    [/ðŸŒŸ/g, '🌟'],
    [/âœ¨/g, '✨'],
    [/ðŸ'°/g, '💰'],
    [/ðŸ"§/g, '🔧'],
    [/ðŸ"±/g, '📱'],
    [/ðŸ'»/g, '💻'],
    [/ðŸŽ/g, '🎁'],
    [/ðŸ"¢/g, '📢'],
    [/ðŸ"Œ/g, '📌'],
    
    // Travessões e aspas especiais
    [/Ã¢â‚¬â€/g, '—'],
    [/Ã¢â‚¬â„¢/g, "'"],
    [/Ã¢â‚¬Â¦/g, '…'],
    [/Ã¢â‚¬Å"/g, '"'],
    [/Ã¢â‚¬Â/g, '"'],
    [/â€"/g, '–'],
    [/â€"/g, '—'],
    [/â€™/g, "'"],
    [/â€œ/g, '"'],
    [/â€/g, '"'],
    
    // Caracteres portugueses double-encoded (ISO-8859-1 interpretado como UTF-8)
    [/Ã¡/g, 'á'], [/Ã /g, 'à'], [/Ã¢/g, 'â'], [/Ã£/g, 'ã'], [/Ã¤/g, 'ä'],
    [/Ã©/g, 'é'], [/Ã¨/g, 'è'], [/Ãª/g, 'ê'], [/Ã«/g, 'ë'],
    [/Ã­/g, 'í'], [/Ã¬/g, 'ì'], [/Ã®/g, 'î'], [/Ã¯/g, 'ï'],
    [/Ã³/g, 'ó'], [/Ã²/g, 'ò'], [/Ã´/g, 'ô'], [/Ãµ/g, 'õ'], [/Ã¶/g, 'ö'],
    [/Ãº/g, 'ú'], [/Ã¹/g, 'ù'], [/Ã»/g, 'û'], [/Ã¼/g, 'ü'],
    [/Ã§/g, 'ç'], [/Ã±/g, 'ñ'],
    
    // Maiúsculas double-encoded
    [/Ã€/g, 'À'], [/Ã/g, 'Á'], [/Ã‚/g, 'Â'], [/Ãƒ/g, 'Ã'],
    [/Ã‰/g, 'É'], [/Ãˆ/g, 'È'], [/ÃŠ/g, 'Ê'],
    [/Ã/g, 'Í'], [/ÃŒ/g, 'Ì'], [/ÃŽ/g, 'Î'],
    [/Ã"/g, 'Ó'], [/Ã'/g, 'Ò'], [/Ã"/g, 'Ô'], [/Ã•/g, 'Õ'],
    [/Ãš/g, 'Ú'], [/Ã™/g, 'Ù'], [/Ã›/g, 'Û'], [/Ãœ/g, 'Ü'],
    [/Ã‡/g, 'Ç'], [/Ã'/g, 'Ñ'],
    
    // Símbolos especiais
    [/Âº/g, 'º'], [/Âª/g, 'ª'],
    [/Â®/g, '®'], [/Â©/g, '©'], [/â„¢/g, '™'],
    [/Â°/g, '°'],
    
    // Espaço não-quebrável malformado
    [/Â /g, ' '],
  ];
  
  let fixed = html;
  let changesCount = 0;
  
  for (const [pattern, replacement] of fixes) {
    const before = fixed;
    fixed = fixed.replace(pattern, replacement);
    if (before !== fixed) changesCount++;
  }
  
  if (changesCount > 0) {
    console.log(`🔠 [Encoding] Fixed ${changesCount} encoding pattern(s) in HTML`);
  }
  
  return fixed;
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
    // Remove event handlers
    .replace(/\s(onclick|onerror|onload|onmouseover|onfocus|onblur)="[^"]*"/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    
    // Remove tracking scripts
    .replace(/<script[^>]*gtm[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<iframe[^>]*gtm[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<script[^>]*google-analytics[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*ga\s*\([^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*cookie[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<img[^>]*facebook[^>]*>/gi, '')
    .replace(/<img[^>]*pixel[^>]*>/gi, '')
    
    // ✅ Remove WordPress AJAX and admin URLs (prevents indexing issues)
    .replace(/(?:action|src|href)=["'][^"']*\/wp-admin\/admin-ajax\.php[^"']*["']/gi, '')
    .replace(/(?:action|src|href)=["'][^"']*\/wp-admin\/[^"']*["']/gi, '')
    
    // ✅ Remove wp-json REST API references
    .replace(/(?:src|href|data-[^=]*)=["'][^"']*\/wp-json\/[^"']*["']/gi, '')
    
    // ✅ Clean Elementor data-settings containing WordPress URLs
    .replace(/data-settings=["'][^"']*admin-ajax[^"']*["']/gi, 'data-settings="{}"')
    .replace(/data-settings=["'][^"']*wp-admin[^"']*["']/gi, 'data-settings="{}"')
    
    // ✅ Remove ONLY specific script tags - use safer, more targeted approach
    // REMOVIDO: regexes com múltiplos [\s\S]*? que consumiam todo o HTML
    // Agora apenas remove atributos problemáticos, não scripts inteiros
    ;
  
  return sanitized;
}

// ============================================
// ENSURE COMPLETE HTML STRUCTURE (DOCTYPE, html, head, body)
// ============================================
function ensureCompleteHTMLStructure(html: string): string {
  const trimmedHtml = html.trim();
  
  // Verificar se já tem estrutura completa
  const hasDoctype = trimmedHtml.toLowerCase().startsWith('<!doctype');
  const hasHtmlTag = /<html[^>]*>/i.test(trimmedHtml);
  const hasHeadTag = /<head[^>]*>/i.test(trimmedHtml);
  const hasBodyTag = /<body[^>]*>/i.test(trimmedHtml);
  
  // Se já tem tudo, retornar como está
  if (hasDoctype && hasHtmlTag && hasHeadTag && hasBodyTag) {
    console.log('✅ [HTML Structure] Estrutura HTML já está completa');
    return html;
  }
  
  console.log(`⚠️ [HTML Structure] HTML incompleto: doctype=${hasDoctype}, html=${hasHtmlTag}, head=${hasHeadTag}, body=${hasBodyTag}`);
  console.log('🔧 [HTML Structure] Criando estrutura HTML completa...');
  
  let content = trimmedHtml;
  let extractedStyles = '';
  let extractedScripts = '';
  
  // Extrair <style> tags do início
  const styleRegex = /^(\s*<style[^>]*>[\s\S]*?<\/style>\s*)+/i;
  const styleMatch = content.match(styleRegex);
  if (styleMatch) {
    extractedStyles = styleMatch[0];
    content = content.replace(styleMatch[0], '').trim();
    console.log(`📝 [HTML Structure] Extraído ${extractedStyles.length} chars de CSS para <head>`);
  }
  
  // Extrair <script> tags do início (se houver)
  const scriptRegex = /^(\s*<script[^>]*>[\s\S]*?<\/script>\s*)+/i;
  const scriptMatch = content.match(scriptRegex);
  if (scriptMatch) {
    extractedScripts = scriptMatch[0];
    content = content.replace(scriptMatch[0], '').trim();
    console.log(`📝 [HTML Structure] Extraído ${extractedScripts.length} chars de JS para <head>`);
  }
  
  // Construir estrutura HTML completa
  const completeHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${extractedStyles}
  ${extractedScripts}
</head>
<body>
${content}
</body>
</html>`;
  
  console.log(`✅ [HTML Structure] Estrutura HTML completa criada (${completeHTML.length} chars)`);
  return completeHTML;
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
// NORMALIZE YOUTUBE VIDEOS (FIX PLAYBACK)
// ============================================
function normalizeYouTubeVideos(html: string): { html: string; videosFixed: number } {
  let videosFixed = 0;
  let result = html;
  
  // Extract video ID from any YouTube URL format
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };
  
  // Find all iframes with YouTube URLs and normalize them
  const iframeRegex = /<iframe([^>]*?)src=["']([^"']*(?:youtube|youtu\.be)[^"']*)["']([^>]*)>/gi;
  
  result = result.replace(iframeRegex, (match, before, url, after) => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return match;
    
    // Build normalized embed URL with privacy-enhanced mode
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
    
    // Check and add required attributes
    let combinedAttrs = (before || '') + (after || '');
    
    // Required attributes for YouTube playback
    const requiredAttrs: Record<string, string> = {
      'allow': 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      'allowfullscreen': '',
      'frameborder': '0',
      'loading': 'lazy',
    };
    
    let attrsToAdd = '';
    for (const [attr, value] of Object.entries(requiredAttrs)) {
      if (!combinedAttrs.toLowerCase().includes(attr.toLowerCase())) {
        attrsToAdd += value ? ` ${attr}="${value}"` : ` ${attr}`;
      }
    }
    
    videosFixed++;
    console.log(`🎬 YouTube video normalized: ${videoId}`);
    
    return `<iframe${before}src="${embedUrl}"${after}${attrsToAdd}>`;
  });
  
  return { html: result, videosFixed };
}

// ============================================
// CONVERT ELEMENTOR VIDEO WIDGETS TO REAL IFRAMES
// (Conservador: injeta iframes SEM substituir HTML original)
// ============================================
function convertElementorVideosToIframes(html: string): { html: string; videosConverted: number } {
  let videosConverted = 0;
  let result = html;
  const videoIds: string[] = [];
  
  // DEBUG: Log inicial
  console.log(`🔍 [Elementor] Searching for videos in HTML (${html.length} chars)`);
  console.log(`🔍 [Elementor] Contains 'youtube_url': ${html.includes('youtube_url')}`);
  console.log(`🔍 [Elementor] Contains 'youtu.be': ${html.includes('youtu.be')}`);
  console.log(`🔍 [Elementor] Contains 'youtube.com': ${html.includes('youtube.com')}`);
  
  // REGEX SIMPLIFICADA: buscar diretamente youtube_url seguido do video ID
  // Captura IDs diretamente de padrões como:
  // youtube_url&quot;:&quot;https:\/\/youtu.be\/VIDEOID
  // youtube_url":"https://youtu.be/VIDEOID
  // youtube_url&quot;:&quot;https:\\\/\\\/youtu.be\\\/VIDEOID
  const youtubePatterns = [
    // youtu.be format (most common in Elementor)
    /youtube_url[^a-zA-Z0-9]*https?[^a-zA-Z0-9]+youtu\.be[^a-zA-Z0-9]+([a-zA-Z0-9_-]{11})/gi,
    // youtube.com/watch?v= format
    /youtube_url[^a-zA-Z0-9]*https?[^a-zA-Z0-9]+(?:www\.)?youtube\.com[^a-zA-Z0-9]+watch[^a-zA-Z0-9]+v[^a-zA-Z0-9]+([a-zA-Z0-9_-]{11})/gi,
    // youtube.com/embed/ format
    /youtube_url[^a-zA-Z0-9]*https?[^a-zA-Z0-9]+(?:www\.)?youtube\.com[^a-zA-Z0-9]+embed[^a-zA-Z0-9]+([a-zA-Z0-9_-]{11})/gi,
  ];
  
  for (const pattern of youtubePatterns) {
    let match;
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    while ((match = pattern.exec(html)) !== null) {
      const videoId = match[1];
      if (videoId && videoId.length === 11 && !videoIds.includes(videoId)) {
        videoIds.push(videoId);
        console.log(`🎬 [Elementor] Found video ID: ${videoId}`);
      }
    }
  }
  
  console.log(`📊 [Elementor] Total videos found: ${videoIds.length}`);
  
  if (videoIds.length === 0) {
    console.log(`⚠️ [Elementor] No videos found, returning original HTML`);
    return { html: result, videosConverted: 0 };
  }
  
  // CSS para esconder placeholders do Elementor que não funcionam sem JS
  const cssHide = `
<style>
  /* Esconde placeholders do Elementor que não funcionam sem JS */
  .elementor-widget-video .elementor-custom-embed-image-overlay,
  .elementor-widget-video .elementor-custom-embed-play,
  .elementor-widget-video .elementor-video { display: none !important; }
  /* Estilo para container de vídeo injetado */
  .video-injected-by-clone {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
    background: #000;
  }
  .video-injected-by-clone iframe {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    border: 0;
  }
</style>`;
  
  // Injetar iframes DENTRO dos containers Elementor existentes (ADICIONAR, não substituir)
  for (const videoId of videoIds) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
    
    const iframe = `<div class="video-injected-by-clone"><iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" title="YouTube Video"></iframe></div>`;
    
    // Escapar caracteres especiais do videoId para regex
    const escapedId = videoId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    // Procurar container elementor-widget-video com esse videoId no data-settings
    const containerRegex = new RegExp(
      `(<div[^>]*class="[^"]*elementor-widget-video[^"]*"[^>]*data-settings="[^"]*${escapedId}[^"]*"[^>]*>)`,
      'i'
    );
    
    // Se encontrou, ADICIONAR iframe logo após a tag de abertura (preserva conteúdo original)
    if (containerRegex.test(result)) {
      result = result.replace(containerRegex, `$1${iframe}`);
      videosConverted++;
      console.log(`✅ [Elementor] Iframe injected for video: ${videoId}`);
    } else {
      // Fallback: procurar qualquer div com esse videoId no data-settings
      const fallbackRegex = new RegExp(
        `(<div[^>]*data-settings="[^"]*${escapedId}[^"]*"[^>]*>)`,
        'i'
      );
      if (fallbackRegex.test(result)) {
        result = result.replace(fallbackRegex, `$1${iframe}`);
        videosConverted++;
        console.log(`✅ [Elementor] Iframe injected (fallback) for video: ${videoId}`);
      } else {
        console.log(`⚠️ [Elementor] Container not found for video: ${videoId}, will use body fallback`);
      }
    }
  }
  
  // Se não conseguiu injetar em containers específicos, adicionar antes do </body>
  if (videosConverted === 0 && videoIds.length > 0) {
    const fallbackIframes = videoIds.map(id => {
      const url = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
      return `<div class="video-injected-by-clone" style="margin:20px auto;max-width:800px;"><iframe src="${url}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" title="YouTube Video"></iframe></div>`;
    }).join('\n');
    
    result = result.replace('</body>', `${fallbackIframes}</body>`);
    videosConverted = videoIds.length;
    console.log(`✅ [Elementor] ${videoIds.length} iframes added as fallback before </body>`);
  }
  
  // Injetar CSS no head
  result = result.replace('</head>', `${cssHide}</head>`);
  
  console.log(`🎉 [Elementor] Conversion complete: ${videosConverted} videos converted`);
  return { html: result, videosConverted };
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
// REWRITE CTAs (v4.0 - TODOS os botões exceto header/footer)
// ============================================
function rewriteCTAs(html: string, ctaUrl: string): { html: string; count: number } {
  let count = 0;
  let result = html;
  
  // Helper to check if URL should be skipped
  const shouldSkipUrl = (url: string): boolean => {
    if (!url || url === ctaUrl) return true;
    if (url.startsWith('#')) return true;
    if (url.startsWith('mailto:') || url.startsWith('tel:')) return true;
    if (/\.(jpg|jpeg|png|gif|svg|webp|avif|css|js|ico|pdf|doc|docx|xls|xlsx)$/i.test(url)) return true;
    // Skip social media links
    if (/facebook\.com|twitter\.com|linkedin\.com|instagram\.com|youtube\.com\/(?:channel|user|@)/i.test(url)) return true;
    return false;
  };
  
  // Navigation links to skip (header/footer navigation)
  const navigationTexts = /^\s*(Home|Início|Sobre|About|Blog|Produtos|Products|Serviços|Services|FAQ|Privacidade|Termos|Privacy|Terms|Política|Policy|Contato|Contact|Menu|Loja|Shop|Categorias|Categories)\s*$/i;
  
  // Keywords para CTAs (português e inglês) - EXPANDED
  const ctaKeywordsRegex = 'Comprar|Saiba\\s+mais|Fale\\s+conosco|Contato|Orçamento|WhatsApp|Solicitar|Agendar|Conhecer|Ver\\s+mais|Demonstração|Demo|Experimentar|Testar|Cadastrar|Inscreva|Começar|Iniciar|Assinar|Pedir|Quero|Reserve|Agende|Solicite|Garantir|Aproveitar|Adquirir|Baixar|Download|Buy|Contact|Get|Request|Trial|Start|Sign\\s+up|Subscribe|Order|Book|Schedule|Try|Free|Demo|Learn\\s+more';
  
  // Track URLs already rewritten to avoid double-counting
  const rewrittenUrls = new Set<string>();
  
  // ===== FASE 1: Reescrever TODOS os links com classe de botão =====
  const buttonClassPatterns = [
    /(<a[^>]*class="[^"]*(?:btn|button|cta|submit|action|primary|hero|main|elementor-button|wp-block-button|vc_btn|et_pb_button|fusion-button|product-btn|buy-btn|shop-btn|order-btn|demo-btn)[^"]*"[^>]*href=")([^"]+)(")/gi,
    // Role="button" 
    /(<a[^>]*role="button"[^>]*href=")([^"]+)(")/gi,
    // Links dentro de elementos com classe btn/button
    /(<[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>[^<]*<a[^>]*href=")([^"]+)(")/gi,
  ];
  
  for (const pattern of buttonClassPatterns) {
    result = result.replace(pattern, (match, before, url, after) => {
      if (shouldSkipUrl(url)) return match;
      if (!rewrittenUrls.has(url)) {
        rewrittenUrls.add(url);
        count++;
      }
      return `${before}${ctaUrl}${after}`;
    });
  }
  
  // ===== FASE 2: Reescrever links com texto de CTA =====
  const ctaTextPatterns = [
    // Texto CTA direto
    new RegExp(`(<a[^>]*href=")([^"]+)("[^>]*>\\s*(?:${ctaKeywordsRegex})[^<]*<\\/a>)`, 'gi'),
    // Texto CTA com spans aninhados
    new RegExp(`(<a[^>]*href=")([^"]+)("[^>]*>[\\s\\S]*?(?:${ctaKeywordsRegex})[\\s\\S]*?<\\/a>)`, 'gi'),
    // Textos com urgência
    /(<a[^>]*href=")([^"]+)("[^>]*>[^<]{0,100}(?:agora|grátis|aqui|hoje|now|free|here|today)[^<]*<\/a>)/gi,
  ];
  
  for (const pattern of ctaTextPatterns) {
    result = result.replace(pattern, (match, before, url, after) => {
      if (shouldSkipUrl(url)) return match;
      if (!rewrittenUrls.has(url)) {
        rewrittenUrls.add(url);
        count++;
      }
      return `${before}${ctaUrl}${after}`;
    });
  }
  
  // ===== FASE 3: URLs específicas (WhatsApp, formulários) =====
  const specificUrlPatterns = [
    // URLs do WhatsApp
    /(<a[^>]*href=")(https?:\/\/(?:api\.)?whatsapp\.com[^"]+)(")/gi,
    /(<a[^>]*href=")(https?:\/\/wa\.me[^"]+)(")/gi,
    // URLs com paths de contato/demo/trial
    /(<a[^>]*href=")(https?:\/\/[^"]+(?:contato|contact|form|lead|demo|trial|register|signup|cadastro|orcamento|quote|request|inquiry)[^"]+)(")/gi,
  ];
  
  for (const pattern of specificUrlPatterns) {
    result = result.replace(pattern, (match, before, url, after) => {
      if (shouldSkipUrl(url)) return match;
      if (!rewrittenUrls.has(url)) {
        rewrittenUrls.add(url);
        count++;
      }
      return `${before}${ctaUrl}${after}`;
    });
  }
  
  // ===== FASE 4: Buttons HTML =====
  // Buttons com onclick para redirecionamento
  result = result.replace(
    /(<button[^>]*onclick=["'][^"']*(?:location\.href|window\.location|location\s*=)\s*[='"]*\s*["']?)([^"']+)(["'])/gi,
    (match, before, url, after) => {
      if (shouldSkipUrl(url)) return match;
      if (!rewrittenUrls.has(url)) {
        rewrittenUrls.add(url);
        count++;
      }
      return `${before}${ctaUrl}${after}`;
    }
  );
  
  // Converter buttons sem ação para links com CTA
  result = result.replace(
    /<button([^>]*class="[^"]*(?:btn|button|cta|primary|submit|action)[^"]*"[^>]*)>([^<]*(?:Solicitar|Comprar|Agendar|Demo|Contato|Orçamento|WhatsApp|Saiba|Conhecer)[^<]*)<\/button>/gi,
    (match, attrs, text) => {
      count++;
      return `<a href="${ctaUrl}"${attrs} style="display:inline-block;text-decoration:none;">${text}</a>`;
    }
  );
  
  // ===== FASE 5: Elementos com data attributes =====
  result = result.replace(
    /(<[^>]+data-(?:href|url|link|action)=")([^"]+)(")/gi,
    (match, before, url, after) => {
      if (shouldSkipUrl(url)) return match;
      if (!rewrittenUrls.has(url)) {
        rewrittenUrls.add(url);
        count++;
      }
      return `${before}${ctaUrl}${after}`;
    }
  );
  
  // ===== FASE 6: Links restantes que parecem CTAs (catch-all) =====
  // Links com estilos inline de botão
  result = result.replace(
    /(<a[^>]*style="[^"]*(?:background|border-radius|padding)[^"]*"[^>]*href=")([^"]+)(")/gi,
    (match, before, url, after) => {
      if (shouldSkipUrl(url)) return match;
      if (!rewrittenUrls.has(url)) {
        rewrittenUrls.add(url);
        count++;
      }
      return `${before}${ctaUrl}${after}`;
    }
  );
  
  console.log(`✅ ${count} CTAs rewritten to: ${ctaUrl}`);
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
// LAZY LOADING automático para imagens (Core Web Vitals)
// ============================================
function addLazyLoadingToImages(html: string): string {
  let imgIndex = 0;
  return html.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
    if (attrs.includes('loading=')) return match; // já tem
    imgIndex++;
    if (imgIndex === 1) {
      // Primeira imagem (hero/LCP) recebe eager + fetchpriority
      return `<img${attrs} loading="eager" fetchpriority="high">`;
    }
    return `<img${attrs} loading="lazy" decoding="async">`;
  });
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
    <!-- FONTS & ICONS -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    
    <style>
      /* ===== DESIGN SYSTEM GEMINI V4.5 (IGUAL LP SPIN) ===== */
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

      /* ===== PREVENT HORIZONTAL SCROLL ===== */
      html, body {
        overflow-x: hidden !important;
        max-width: 100vw !important;
      }

      body {
        padding-top: 80px !important; /* Compensar header fixo */
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      /* ===== HEADER FIXO NO TOPO (FIXED) ===== */
      .site-header {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        z-index: 99999 !important;
        background: #fff !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: none !important;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
      }

      .banner {
        width: 180px;
        height: auto;
      }

      .main-nav {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      .main-nav a {
        color: var(--primary-dark);
        text-decoration: none;
        font-weight: 600;
        font-size: 11px;
        padding: 0.5rem 0.75rem;
        transition: color 0.2s;
        white-space: nowrap;
      }

      .main-nav a:hover {
        color: var(--accent-tech);
      }

      /* ===== FOOTER - SMART DENT PREMIUM (CORES #3E4B5E e #EE7A3E) ===== */
      .sd-premium-footer {
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Barra de acento no topo - Laranja Smart Dent */
      .footer-accent-bar {
        height: 8px;
        background: linear-gradient(90deg, #EE7A3E, #FF9B67) !important;
        width: 100%;
      }

      /* Seção principal - Azul Smart Dent */
      .footer-main-section {
        background: linear-gradient(to bottom, #3E4B5E, #2d3a4a) !important;
        padding: 2.5rem 0;
        color: #fff;
      }

      /* ===== CSS RESET PARA EVITAR CONFLITOS ===== */
      .sd-premium-footer,
      .sd-premium-footer * {
        box-sizing: border-box !important;
        margin: 0;
        padding: 0;
      }
      
      .sd-premium-footer div,
      .sd-premium-footer article,
      .sd-premium-footer p,
      .sd-premium-footer strong {
        display: block !important;
      }

      /* Layout 2 áreas: Locations (esq) + Links/Sociais (dir) */
      .footer-columns {
        display: grid !important;
        grid-template-columns: 2fr 1fr !important;
        gap: 2rem !important;
        max-width: 1200px !important;
        margin: 0 auto !important;
        padding: 0 2rem !important;
      }

      .footer-locations-grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 1.5rem !important;
      }

      .footer-right-column {
        display: flex !important;
        flex-direction: column !important;
        gap: 1.5rem !important;
      }

      @media (max-width: 992px) {
        .footer-columns {
          grid-template-columns: 1fr 1fr !important;
        }
        .footer-locations-grid {
          grid-template-columns: 1fr !important;
        }
      }

      @media (max-width: 768px) {
        .footer-columns {
          grid-template-columns: 1fr !important;
        }
      }

      .footer-location-card {
        display: block !important;
        margin-bottom: 0.5rem !important;
      }

      .footer-location-card strong {
        display: block !important;
        color: #fff !important;
        font-weight: 700 !important;
        font-size: 15px !important;
        margin-bottom: 0.5rem !important;
      }

      .footer-location-card p {
        display: block !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
        margin: 0.3rem 0 !important;
        color: rgba(255,255,255,0.85) !important;
      }

      .footer-location-card p i {
        color: #FF9B67 !important;
        margin-right: 6px !important;
      }

      .footer-links-column {
        display: block !important;
      }

      .footer-links-column strong {
        color: #fff !important;
        font-weight: 700 !important;
        font-size: 15px !important;
        display: block !important;
        margin-bottom: 0.75rem !important;
      }

      .footer-links-column a {
        color: #FF9B67 !important;
        text-decoration: none !important;
        font-size: 14px !important;
        display: block !important;
        margin: 0.4rem 0 !important;
        transition: opacity 0.2s !important;
      }

      .footer-links-column a:hover {
        opacity: 0.8 !important;
        text-decoration: underline !important;
      }

      /* ===== SOCIAL INLINE (dentro da coluna direita) ===== */
      .footer-social-inline {
        display: block !important;
      }
      
      .footer-social-inline strong {
        color: #EE7A3E !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        display: block !important;
        margin-bottom: 0.75rem !important;
      }

      /* ===== ÍCONES SOCIAIS - FORÇAR HORIZONTAL ===== */
      .footer-social-links {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: wrap !important;
        gap: 10px !important;
        max-width: 280px !important;
      }

      .footer-social-links a {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 36px !important;
        height: 36px !important;
        background: rgba(255, 255, 255, 0.15) !important;
        border: 1px solid rgba(255,255,255,0.3) !important;
        border-radius: 50% !important;
        transition: all 0.3s ease !important;
      }

      .footer-social-links a:hover {
        background: #EE7A3E !important;
        border-color: #EE7A3E !important;
        transform: translateY(-2px) !important;
      }

      .footer-social-links a i {
        font-size: 16px !important;
        color: #fff !important;
      }

      /* ===== SEÇÃO CROSS-LINKS (Navegue pelo Site) ===== */
      .footer-cross-links {
        background: #2d3a4a !important;
        padding: 1.5rem 2rem;
        max-width: 1200px;
        margin: 0 auto;
        border-top: 1px solid rgba(255,255,255,0.15);
      }

      .footer-cross-links strong {
        color: #EE7A3E;
        font-weight: 600;
        font-size: 14px;
        display: block;
        margin-bottom: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .cross-links-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 1.5rem;
        column-count: 4;
      }

      .cross-links-grid a {
        color: rgba(255,255,255,0.8);
        font-size: 12px;
        text-decoration: none;
        display: inline-block;
        transition: opacity 0.2s;
        text-transform: capitalize;
      }

      .cross-links-grid a:hover {
        opacity: 0.7;
        text-decoration: underline;
      }

      @media (max-width: 768px) {
        .cross-links-grid {
          gap: 0.3rem 1rem;
        }
      }

      /* ===== COPYRIGHT (Azul Smart Dent escuro) ===== */
      .footer-copyright-section {
        background: #1e293b !important;
        padding: 1rem 0;
      }

      .footer-copyright {
        text-align: center;
        font-size: 12px;
        color: rgba(255,255,255,0.7);
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      /* ===== VIDEO RESPONSIVO ===== */
      .video-container,
      .wp-block-embed,
      .wp-block-video,
      .video-wrapper {
        position: relative;
        width: 100%;
        max-width: 100%;
        margin: 1rem 0;
      }
      
      .video-container iframe,
      iframe[src*="youtube"],
      iframe[src*="vimeo"],
      iframe[src*="youtu.be"] {
        width: 100% !important;
        max-width: 100%;
        aspect-ratio: 16/9;
        border: none;
        border-radius: 8px;
      }
      
      video {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
      }

      /* ===== STICKY CTA MOBILE ===== */
      .sticky-cta {
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
      
      .sticky-cta button {
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
      
      .sticky-cta button:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 20px rgba(37, 211, 102, 0.5);
      }

      /* ===== GEO CONTEXT (INVISÍVEL PARA USUÁRIOS) ===== */
      .geo-context {
        position: absolute;
        left: -9999px;
        opacity: 0;
        pointer-events: none;
      }

      /* ===== RESPONSIVO MOBILE ===== */
      @media screen and (max-width: 768px) {
        .main-nav {
          display: none;
        }
        .header {
          justify-content: center;
        }
        
        .sticky-cta {
          display: block;
        }
        
        .footer-columns {
          flex-direction: column;
          gap: 2rem;
        }
        
        body {
          padding-bottom: 80px;
        }
      }
    </style>
  `;
}

// ============================================
// EXTRACT YOUTUBE VIDEO IDS FROM HTML (FASE 8)
// ============================================
function extractVideoIdsFromHtml(html: string): string[] {
  const videoIds: string[] = [];
  
  // Padrões para encontrar IDs de vídeo
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
    /youtube_url[^a-zA-Z0-9]*https?[^a-zA-Z0-9]+youtu\.be[^a-zA-Z0-9]+([a-zA-Z0-9_-]{11})/gi,
    /youtube_url[^a-zA-Z0-9]*https?[^a-zA-Z0-9]+(?:www\.)?youtube\.com[^a-zA-Z0-9]+watch[^a-zA-Z0-9]+v[^a-zA-Z0-9]+([a-zA-Z0-9_-]{11})/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(html)) !== null) {
      const videoId = match[1];
      if (videoId && videoId.length === 11 && !videoIds.includes(videoId)) {
        videoIds.push(videoId);
      }
    }
  }
  
  console.log(`🎥 [FASE 8] ${videoIds.length} vídeos YouTube extraídos do HTML`);
  return videoIds;
}

// ============================================
// GENERATE VIDEO SCHEMAS FROM IDS (FASE 8)
// ============================================
function generateVideoSchemasFromIds(
  videoIds: string[],
  productName: string,
  brandName: string,
  companyName: string,
  companyUrl: string
): Record<string, any>[] {
  if (!videoIds || videoIds.length === 0) return [];
  
  return videoIds.slice(0, 5).map((videoId, index) => {
    const videoData: VideoSchemaData = {
      name: `Vídeo ${index + 1}: ${productName} ${brandName}`,
      description: `Apresentação do ${productName} da ${brandName} por ${companyName}`,
      thumbnailUrl: getYouTubeThumbnail(videoId, 'maxres'),
      uploadDate: new Date().toISOString(),
      contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: getYouTubeEmbedUrl(videoId),
      aboutProduct: {
        name: `${productName} ${brandName}`,
      },
      creator: {
        name: companyName,
        url: companyUrl
      }
    };
    
    return generateVideoObjectSchema(videoData, {
      includeTranscript: false,
      includeAboutProduct: true,
      includeCreator: true,
      creatorName: companyName,
      creatorUrl: companyUrl
    });
  });
}

// ============================================
// GENERATE IMAGE ITEMLIST SCHEMA (FASE 7)
// ============================================
function generateImageGallerySchema(
  images: CapturedImage[],
  productName: string,
  brandName: string
): Record<string, any> | null {
  const successfulImages = images.filter(img => img.status === 'success' && img.newUrl);
  
  if (successfulImages.length < 2) return null;
  
  const items = successfulImages.slice(0, 10).map(img => ({
    name: img.isHeroImage ? `${productName} ${brandName} - Imagem Principal` : `${productName} ${brandName}`,
    url: img.newUrl,
    image: img.newUrl
  }));
  
  const schema = generateGenericItemListSchema(items, 'ImageObject', {
    listName: `Galeria de Imagens: ${productName} ${brandName}`,
    listOrder: 'ascending'
  });
  
  if (schema) {
    console.log(`📷 [FASE 7] ItemList de imagens gerado com ${items.length} itens`);
  }
  
  return schema;
}

// ============================================
// GENERATE DEFAULT PERSON SCHEMA (FASE 3)
// ============================================
function generateDefaultPersonSchema(
  companyName: string,
  companyUrl: string
): Record<string, any> {
  return {
    "@type": "Person",
    "@id": `${companyUrl}/#expert`,
    "name": "Especialista em Odontologia Digital",
    "jobTitle": "Consultor Técnico",
    "description": `Especialista certificado em soluções de odontologia digital da ${companyName}`,
    "affiliation": {
      "@type": "Organization",
      "name": companyName,
      "url": companyUrl
    }
  };
}

// ============================================
// INJECT SEO WITH COMPLETE SCHEMA + GEO + HREFLANG
// ============================================
interface InjectSEOOptions {
  capturedImages?: CapturedImage[];
  videoIds?: string[];
  productFaqs?: FAQItem[];
  relatedProducts?: any[];
  kols?: PersonSchemaData[];
  productWorkflow?: any;
  authorityData?: AuthorityData | null;
  videoTestimonials?: VideoTestimonial[];
}

function injectSEO(
  html: string, 
  seoConfig: SEOConfig, 
  companyData: any, 
  brand: string, 
  product: string,
  ogImageUrl: string,
  aggregateRating: AggregateRatingData,
  options: InjectSEOOptions = {}
): string {
  let result = html;
  
  const { 
    capturedImages = [], 
    videoIds = [], 
    productFaqs = [], 
    relatedProducts = [],
    kols = [],
    productWorkflow,
    authorityData,
    videoTestimonials = []
  } = options;
  
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
  
  // ✅ FASE 5: Coletar múltiplas imagens para og:image
  const additionalOgImages = capturedImages
    .filter(img => img.status === 'success' && img.newUrl && img.newUrl !== finalOgImage)
    .slice(0, 3)
    .map(img => img.newUrl);
  
  // ✅ FASE 8: Gerar VideoObject Schemas
  const videoSchemas = generateVideoSchemasFromIds(videoIds, product, brand, company, websiteUrl);
  
  // ✅ FASE 6: Gerar FAQPage Schema
  const faqSchema = productFaqs.length > 0 ? generateFAQPageSchema(productFaqs, { minFaqCount: 2 }) : null;
  
  // ✅ FASE 7: Gerar ItemList Schema (galeria de imagens)
  const imageListSchema = generateImageGallerySchema(capturedImages, product, brand);
  
  // ✅ FASE 3: Gerar Person Schema (usar KOL se disponível, senão default)
  let personSchema: Record<string, any> | null = null;
  if (kols && kols.length > 0) {
    personSchema = generatePersonSchema(kols[0]);
    console.log(`👤 [FASE 3] Person Schema gerado para KOL: ${kols[0].full_name}`);
  } else {
    personSchema = generateDefaultPersonSchema(company, websiteUrl);
    console.log(`👤 [FASE 3] Person Schema gerado (especialista padrão)`);
  }
  
  // ✅ FASE 4: Gerar HowTo Schema (se houver workflow do produto)
  let howToSchema: Record<string, any> | null = null;
  if (productWorkflow && productWorkflow.workflow_stages) {
    howToSchema = generateHowToSchema(productWorkflow, {
      includeSupplies: false,
      includeTips: true,
      companyName: company,
      websiteUrl: websiteUrl
    });
    if (howToSchema) {
      console.log(`📋 [FASE 4] HowTo Schema gerado para produto com workflow`);
    }
  }
  
  // Complete Schema.org with @graph + SpeakableSpecification + All Phases
  const schemaGraph: Record<string, any> = {
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
        // ✅ SEO 10/10: sameAs EXPANDIDO via módulo compartilhado
        "sameAs": expandFounderSameAs(companyData || {})
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
        // ✅ AI-READINESS: mainEntity, about, mentions
        "mainEntity": {
          "@type": "Product",
          "@id": `${canonical}/#product`
        },
        "about": [
          { "@type": "Thing", "name": companyData?.business_sector || "Odontologia Digital" },
          ...(companyData?.seo_technical_expertise ? [{ "@type": "Thing", "name": companyData.seo_technical_expertise }] : []),
          { "@type": "Thing", "name": `${product} ${brand}` }
        ],
        "mentions": [
          { "@type": "Product", "name": `${product} ${brand}`, "@id": `${canonical}/#product` },
          { "@type": "Organization", "name": company, "@id": `${websiteUrl}/#organization` }
        ],
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
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": aggregateRating.ratingValue,
          "reviewCount": aggregateRating.reviewCount,
          "bestRating": aggregateRating.bestRating,
          "worstRating": aggregateRating.worstRating
        }
      },
      // ✅ FASE 9: BreadcrumbList via Helper Centralizado
      generateLandingPageBreadcrumbsForClone(
        { name: product, brand, canonicalUrl: canonical },
        { websiteUrl, websiteName: 'Home' }
      ),
      // ✅ FASE 2: LocalBusiness Schema com GeoCoordinates
      {
        "@type": "LocalBusiness",
        "@id": `${websiteUrl}/#localbusiness`,
        "name": company,
        "url": websiteUrl,
        "telephone": phone,
        "email": email,
        "priceRange": "$$$$",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": streetAddress,
          "addressLocality": city,
          "addressRegion": state,
          "postalCode": postalCode,
          "addressCountry": country
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": -23.5505,
          "longitude": -46.6333
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "opens": "09:00",
            "closes": "18:00"
          }
        ],
        // ✅ SEO 10/10: sameAs EXPANDIDO via módulo compartilhado
        "sameAs": expandFounderSameAs(companyData || {}),
        // ✅ FASE 10: Dados de Autoridade (E-E-A-T)
        ...(authorityData ? {
          "memberOf": authorityData.partnerships.slice(0, 10).map(p => ({
            "@type": p.partnership_type === 'certification' ? 'GovernmentOrganization' : 'Organization',
            "name": p.label,
            "url": p.url
          })),
          "areaServed": authorityData.areasServed.slice(0, 15).map(a => ({
            "@type": a.type === 'Country' ? 'Country' : 'Place',
            "name": a.name
          })),
          ...(authorityData.founder ? {
            "founder": {
              "@type": "Person",
              "name": authorityData.founder.name,
              ...(authorityData.founder.title && { "jobTitle": authorityData.founder.title }),
              ...(authorityData.founder.linkedin && { "sameAs": authorityData.founder.linkedin })
            }
          } : {}),
          "knowsAbout": ["Odontologia Digital", "Scanner Intraoral", "Impressora 3D Odontológica", "CAD/CAM Dental"]
        } : {})
      }
    ]
  };
  
  // ✅ FASE 10: Enriquecer Product Schema com Reviews individuais
  if (authorityData && authorityData.reviews.length > 0) {
    const productSchemaIndex = schemaGraph["@graph"].findIndex((s: any) => s["@type"] === "Product");
    if (productSchemaIndex >= 0) {
      const reviewsSchema = authorityData.reviews
        .filter(r => r.rating >= 4 && r.review_text)
        .slice(0, 5)
        .map(r => ({
          "@type": "Review",
          "author": { "@type": "Person", "name": r.author_name },
          "reviewRating": { "@type": "Rating", "ratingValue": r.rating, "bestRating": 5 },
          "reviewBody": r.review_text?.substring(0, 300)
        }));
      if (reviewsSchema.length > 0) {
        schemaGraph["@graph"][productSchemaIndex]["review"] = reviewsSchema;
      }
    }
  }
  
  // ✅ FASE 3: Adicionar Person Schema
  if (personSchema) {
    schemaGraph["@graph"].push(personSchema);
  }
  
  // ✅ FASE 4: Adicionar HowTo Schema
  if (howToSchema) {
    schemaGraph["@graph"].push(howToSchema);
  }
  
  // ✅ FASE 6: Adicionar FAQPage Schema
  if (faqSchema) {
    schemaGraph["@graph"].push(faqSchema);
    console.log(`❓ [FASE 6] FAQPage Schema adicionado ao @graph`);
  }
  
  // ✅ FASE 7: Adicionar ItemList Schema
  if (imageListSchema) {
    schemaGraph["@graph"].push(imageListSchema);
  }
  
  // ✅ FASE 8: Adicionar VideoObject Schemas
  if (videoSchemas.length > 0) {
    schemaGraph["@graph"].push(...videoSchemas);
    console.log(`🎥 [FASE 8] ${videoSchemas.length} VideoObject Schemas adicionados ao @graph`);
  }
  
  // ✅ SEO 10/10: Service Schemas para serviços de consultoria
  const serviceSchemas = generateServiceSchemas(
    companyData?.main_products_services,
    companyData,
    { websiteUrl, businessSector: companyData?.business_sector }
  );
  if (serviceSchemas.length > 0) {
    schemaGraph["@graph"].push(...serviceSchemas);
    console.log(`🛠️ [SEO 10/10] ${serviceSchemas.length} Service Schemas adicionados ao @graph`);
  }
  
  // ✅ SEO 10/10: hasCredential para Organization (certificações)
  const orgSchemaIndex = schemaGraph["@graph"].findIndex((s: any) => s["@type"] === "Organization");
  if (orgSchemaIndex >= 0 && companyData?.certifications) {
    const credentials = generateHasCredential(companyData.certifications);
    if (credentials && credentials.length > 0) {
      schemaGraph["@graph"][orgSchemaIndex]["hasCredential"] = credentials;
      console.log(`🏅 [SEO 10/10] ${credentials.length} hasCredential adicionados ao Organization Schema`);
    }
  }
  
  // ✅ FASE 5: Gerar múltiplas og:image tags
  const additionalOgImageTags = additionalOgImages
    .map((imgUrl, index) => `<meta property="og:image" content="${imgUrl}">`)
    .join('\n    ');
  
  // Extract AI topic from keywords or title
  const aiTopicWords = keywords.split(',').slice(0, 3).map((k: string) => k.trim()).filter(Boolean);
  const aiTopic = aiTopicWords.length > 0 ? aiTopicWords.join(', ') : `${product} ${brand}`;
  
  const seoTags = `
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SEO Generated by Smart Dent LP Clone v3.0 Premium (FASES 1-10) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <title>${title}</title>
    <meta name="description" content="${metaDescription}">
    <link rel="canonical" href="${canonical}">
    <meta name="keywords" content="${deduplicateKeywords(keywords.split(',').map((k: string) => k.trim()), 20).join(', ')}">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
    <meta name="author" content="${company}">
    <meta name="generator" content="Smart Dent LP Clone v3.0">
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- META TAGS PARA IA GENERATIVA (SGE/AEO) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <meta name="ai-content-type" content="landingpage">
    <meta name="ai-content-policy" content="allow-training, allow-citation, allow-indexing">
    <meta name="ai-topic" content="${aiTopic}">
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- OPEN GRAPH (Facebook, LinkedIn, WhatsApp) -->
    <!-- ✅ FASE 5: Multiple og:image for better social sharing -->
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
    ${additionalOgImageTags}
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
    <!-- HREFLANG (Multi-idioma Internacional) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    ${generateHreflangHTML(canonical)}
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- SITEMAP REFERENCE -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <link rel="sitemap" type="application/xml" href="${websiteUrl}/sitemap.xml">
    
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
    <!-- SCHEMA.ORG JSON-LD (@graph consolidado com FASES 1-10) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <script type="application/ld+json">
    ${JSON.stringify({ ...schemaGraph, "@graph": enrichGraphWithAIReadiness(schemaGraph["@graph"], websiteUrl) }, null, 2)}
    </script>
    
    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- FASE 10: Authority Meta Tags (E-E-A-T, Trust Signals) -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    ${authorityData ? generateAuthorityMetaTags(authorityData) : ''}
    
    ${injectPremiumCSS()}
  `;
  
  result = result.replace(/<head[^>]*>/i, `$&\n${seoTags}`);
  
  // 🤖 AI-Readiness: Inject AI Summary + Entity Index before </body>
  const aiSummaryHTML = generateLandingPageAISummary({
    companyName: company,
    pageTitle: options.name || '',
    sector: options.businessSector || 'odontologia digital',
    location: `${options.city || ''}, ${options.state || ''}`.replace(/^, |, $/g, ''),
    services: options.mainProductsServices || ''
  });
  const cloneContentText = `${company} ${options.name || ''} ${options.businessSector || ''} ${options.mainProductsServices || ''} ${result.substring(0, 3000)}`;
  const entityIndexHTML = generateEntityIndexHTML(cloneContentText);
  
  if (aiSummaryHTML || entityIndexHTML) {
    result = result.replace('</body>', `${aiSummaryHTML}${entityIndexHTML}\n</body>`);
    console.log('🤖 [AI-Readiness] AI Summary + Entity Index injected in clone-LP');
  }
  
  // 🤖 DefinedTermSet in schema @graph
  const definedTermSetClone = generateDefinedTermSetSchema(cloneContentText, `Termos: ${company}`);
  if (definedTermSetClone) {
    schemaGraph["@graph"].push(definedTermSetClone);
  }
  
  // ✅ FASE 10: Injetar Authority Context HTML COMPLETO (invisível para usuários, visível para crawlers)
  if (authorityData) {
    // Gerar HTML de contexto com video testimonials
    const videoTestimonialsForContext = options.videoTestimonials || [];
    const authorityContextHTML = generateAuthorityContextHTML(authorityData, videoTestimonialsForContext);
    if (authorityContextHTML) {
      result = result.replace('</body>', `${authorityContextHTML}\n</body>`);
      console.log(`✅ [FASE 10] Authority context HTML COMPLETO injected (${videoTestimonialsForContext.length} video testimonials)`);
    }
    
    // ✅ NOVO: Gerar VideoObject schemas dos vídeos da empresa e depoimentos
    const companyVideoSchemas = generateCompanyVideoSchemas(
      authorityData.companyVideos,
      company,
      websiteUrl,
      10
    );
    const testimonialVideoSchemas = generateVideoTestimonialSchemas(
      videoTestimonialsForContext,
      company,
      websiteUrl,
      10
    );
    
    // Adicionar video schemas ao @graph
    if (companyVideoSchemas.length > 0) {
      schemaGraph["@graph"].push(...companyVideoSchemas);
      console.log(`✅ [FASE 10] ${companyVideoSchemas.length} Company VideoObject Schemas adicionados`);
    }
    if (testimonialVideoSchemas.length > 0) {
      schemaGraph["@graph"].push(...testimonialVideoSchemas);
      console.log(`✅ [FASE 10] ${testimonialVideoSchemas.length} Testimonial VideoObject Schemas adicionados`);
    }
    
    // ✅ NOVO: Gerar ItemList de vídeos (Video Carousel)
    const videoGallerySchema = generateVideoGallerySchema(
      authorityData.companyVideos,
      videoTestimonialsForContext,
      company
    );
    if (videoGallerySchema) {
      schemaGraph["@graph"].push(videoGallerySchema);
      console.log(`✅ [FASE 10] VideoGallery ItemList Schema adicionado`);
    }
  }
  
  console.log(`📝 SEO Premium v3.0 injected (FASES 1-10): ${title}`);
  
  return result;
}

// ============================================
// FETCH PUBLISHED PAGES FOR CROSS-LINKING (NOVO!)
// ============================================
interface PublishedPageLink {
  name: string;
  url: string;
  product?: string;
  brand?: string;
}

async function fetchPublishedPagesForCrossLinks(supabase: any): Promise<PublishedPageLink[]> {
  try {
    // Buscar páginas clonadas publicadas
    const { data: clonedPages, error: clonedError } = await supabase
      .from('cloned_landing_pages')
      .select('name, published_url, product, brand, target_domain')
      .eq('publish_status', 'published')
      .not('published_url', 'is', null)
      .order('published_at', { ascending: false })
      .limit(20);
    
    // Buscar blogs de produtos publicados
    const { data: productBlogs, error: blogError } = await supabase
      .from('product_blog_publications')
      .select('page_path, published_url, target_domain, blog_type, product_id')
      .eq('publish_status', 'published')
      .not('published_url', 'is', null)
      .order('published_at', { ascending: false })
      .limit(20);
    
    const links: PublishedPageLink[] = [];
    
    // Adicionar páginas clonadas
    if (clonedPages && !clonedError) {
      for (const page of clonedPages) {
        if (page.published_url) {
          links.push({
            name: page.name || page.product || 'Página',
            url: page.published_url,
            product: page.product,
            brand: page.brand
          });
        }
      }
    }
    
    // Adicionar blogs de produtos
    if (productBlogs && !blogError) {
      for (const blog of productBlogs) {
        if (blog.published_url) {
          links.push({
            name: blog.page_path?.replace(/^\/|\/$/g, '').replace(/-/g, ' ') || 'Blog',
            url: blog.published_url,
          });
        }
      }
    }
    
    console.log(`✅ [Cross-Links] ${links.length} páginas publicadas encontradas para cross-linking`);
    return links;
  } catch (err) {
    console.error('⚠️ [Cross-Links] Erro ao buscar páginas publicadas:', err);
    return [];
  }
}

// ============================================
// INSERT PREMIUM HEADER & FOOTER (v3.0 - IGUAL LP SPIN)
// ============================================
function insertSmartDentHeaderFooter(
  html: string, 
  companyData: any, 
  ctaUrl: string,
  publishedPages: PublishedPageLink[] = []
): string {
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
  
  // ✅ HEADER STICKY COM MENU COMPLETO DO PERFIL DA EMPRESA
  const PREMIUM_HEADER = `
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- HEADER STICKY COM MENU DO PERFIL DA EMPRESA -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <header class="site-header">
    <div class="container">
      <div class="header">
        <a href="${websiteUrl}" title="${company} - Site Principal">
          ${logoUrl 
            ? `<img src="${logoUrl}" alt="${company}" class="banner" width="180" height="60" loading="eager">` 
            : `<span style="color: var(--primary-dark); font-size: 20px; font-weight: 800; font-family: 'Inter', sans-serif;">${company}</span>`
          }
        </a>
        <nav class="main-nav">
          ${menuHtml}
        </nav>
      </div>
    </div>
  </header>
  `;
  
  // ✅ FOOTER DINÂMICO - LAYOUT IGUAL À IMAGEM DE REFERÊNCIA
  let locationsHtml = '';
  let linksHtml = '';
  let socialHtml = '';
  
  if (hasCustomFooter) {
    // Localizações em grid 2x2 - usando article para associação forte título-endereço
    const locationsItems = footerConfig.locations && footerConfig.locations.length > 0 
      ? footerConfig.locations.map((loc: any) => `
          <article class="footer-location-card" style="display: block !important;">
            <strong style="display: block !important; margin-bottom: 8px !important;">${escapeHtml(loc.title || loc.label || company)}</strong>
            ${loc.address ? `<p style="display: block !important; margin: 4px 0 !important;"><i class="fas fa-map-marker-alt" style="color: #FF9B67; margin-right: 6px;"></i>${escapeHtml(loc.address)}</p>` : ''}
            ${loc.phone ? `<p style="display: block !important; margin: 4px 0 !important;"><i class="fas fa-phone" style="color: #FF9B67; margin-right: 6px;"></i>${escapeHtml(loc.phone)}</p>` : ''}
            ${loc.email ? `<p style="display: block !important; margin: 4px 0 !important;"><i class="fas fa-envelope" style="color: #FF9B67; margin-right: 6px;"></i>${escapeHtml(loc.email)}</p>` : ''}
          </article>
        `).join('') 
      : `
          <article class="footer-location-card" style="display: block !important;">
            <strong style="display: block !important; margin-bottom: 8px !important;">${escapeHtml(company)}</strong>
            ${streetAddress ? `<p style="display: block !important; margin: 4px 0 !important;"><i class="fas fa-map-marker-alt" style="color: #FF9B67; margin-right: 6px;"></i>${escapeHtml(streetAddress)}${addressNumber ? `, ${escapeHtml(addressNumber)}` : ''}, ${escapeHtml(city)} - ${escapeHtml(state)}</p>` : ''}
            ${phone ? `<p style="display: block !important; margin: 4px 0 !important;"><i class="fas fa-phone" style="color: #FF9B67; margin-right: 6px;"></i>${escapeHtml(phone)}</p>` : ''}
            ${email ? `<p style="display: block !important; margin: 4px 0 !important;"><i class="fas fa-envelope" style="color: #FF9B67; margin-right: 6px;"></i>${escapeHtml(email)}</p>` : ''}
          </article>
        `;
    
    locationsHtml = `<div class="footer-locations-grid" style="display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 1.5rem !important;">${locationsItems}</div>`;
    
    // Links Úteis
    const linksItems = footerConfig.links && footerConfig.links.length > 0 
      ? footerConfig.links.map((link: any) => `
          <a href="${escapeHtml(link.href)}" target="${link.openInNewTab ? '_blank' : '_self'}" rel="noopener" style="display: block !important; color: #FF9B67 !important; margin: 0.4rem 0 !important;">${escapeHtml(link.label)}</a>
        `).join('')
      : '';
    
    // Deduplificar redes sociais por platform usando Set e limitar a 6
    const seenPlatforms = new Set<string>();
    const uniqueSocials: any[] = [];
    if (footerConfig.social_links && footerConfig.social_links.length > 0) {
      for (const s of footerConfig.social_links) {
        if (s.platform && !seenPlatforms.has(s.platform) && uniqueSocials.length < 6) {
          seenPlatforms.add(s.platform);
          uniqueSocials.push(s);
        }
      }
    }
    
    const socialItems = uniqueSocials.length > 0
      ? uniqueSocials.map((social: any) => `
          <a href="${escapeHtml(social.href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(social.icon_alt || social.platform || '')}" style="display: inline-flex !important; width: 36px !important; height: 36px !important;">
            <i class="fab fa-${escapeHtml(social.platform || 'link')}" style="font-size: 16px !important; color: #fff !important;"></i>
          </a>
        `).join('')
      : '';
    
    // Combinar Links + Sociais na coluna direita
    linksHtml = `
      <div class="footer-right-column" style="display: flex !important; flex-direction: column !important; gap: 1.5rem !important;">
        ${linksItems ? `
          <div class="footer-links-column" style="display: block !important;">
            <strong style="display: block !important; color: #fff !important; margin-bottom: 0.75rem !important;">Links Úteis</strong>
            ${linksItems}
          </div>
        ` : ''}
        ${socialItems ? `
          <div class="footer-social-inline" style="display: block !important;">
            <strong style="display: block !important; color: #EE7A3E !important; margin-bottom: 0.75rem !important;">Redes Sociais</strong>
            <div class="footer-social-links" style="display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 10px !important;">
              ${socialItems}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    // Social section vazio pois já está na coluna direita
    socialHtml = '';
  } else {
    // Fallback padrão
    locationsHtml = `
      <div class="footer-locations-grid">
        <div class="footer-location">
          <strong>${escapeHtml(company)}</strong>
          ${streetAddress ? `<p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(streetAddress)}${addressNumber ? `, ${escapeHtml(addressNumber)}` : ''}, ${escapeHtml(city)} - ${escapeHtml(state)}</p>` : ''}
          ${phone ? `<p><i class="fas fa-phone"></i> ${escapeHtml(phone)}</p>` : ''}
          ${email ? `<p><i class="fas fa-envelope"></i> ${escapeHtml(email)}</p>` : ''}
        </div>
      </div>
    `;
    
    linksHtml = `
      <div class="footer-right-column">
        <div class="footer-links-column">
          <strong>Links Úteis</strong>
          <a href="${websiteUrl}/politica-privacidade" rel="noopener">Política de Privacidade</a>
          <a href="${websiteUrl}/termos" rel="noopener">Termos de Uso</a>
          <a href="${websiteUrl}" rel="noopener">Site Principal</a>
          <a href="https://loja.smartdent.com.br/" rel="noopener" target="_blank">Loja Online</a>
        </div>
        <div class="footer-social-inline">
          <strong>Redes Sociais</strong>
          <div class="footer-social-links">
            ${instagram ? `<a href="${instagram}" target="_blank" rel="noopener noreferrer" title="Instagram ${escapeHtml(company)}"><i class="fab fa-instagram"></i></a>` : ''}
            ${youtube ? `<a href="${youtube}" target="_blank" rel="noopener noreferrer" title="YouTube ${escapeHtml(company)}"><i class="fab fa-youtube"></i></a>` : ''}
            <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" title="WhatsApp ${escapeHtml(company)}"><i class="fab fa-whatsapp"></i></a>
          </div>
        </div>
      </div>
    `;
    
    socialHtml = '';
  }
  
  // ✅ CROSS-LINKS - Links para outras páginas publicadas
  const crossLinksHtml = publishedPages.length > 0 ? `
    <div class="footer-cross-links">
      <strong>Navegue pelo Site</strong>
      <div class="cross-links-grid">
        ${publishedPages.slice(0, 12).map(page => `
          <a href="${page.url}" title="${page.name}" rel="noopener">${page.name}</a>
        `).join('')}
      </div>
    </div>
  ` : '';
  
  // ✅ FOOTER - ESTRUTURA IGUAL À IMAGEM SD PREMIUM
  const PREMIUM_FOOTER = `
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- FOOTER SD PREMIUM - LAYOUT IGUAL À IMAGEM DE REFERÊNCIA -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <footer class="sd-premium-footer">
    <!-- Barra de acento (pêssego) -->
    <div class="footer-accent-bar"></div>
    
    <!-- Seção principal (azul/teal) -->
    <div class="footer-main-section">
      <!-- Localizações + Links Úteis -->
      <div class="footer-columns">
        ${locationsHtml}
        ${linksHtml}
      </div>
      
      <!-- Redes Sociais -->
      ${socialHtml}
      
      <!-- Cross-Links para outras páginas publicadas -->
      ${crossLinksHtml}
    </div>
    
    <!-- Copyright (verde escuro) -->
    <div class="footer-copyright-section">
      <div class="footer-copyright">
        © ${new Date().getFullYear()} ${company}. Todos os direitos reservados.${taxId ? ` | CNPJ: ${taxId}` : ''}
      </div>
    </div>
  </footer>
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- STICKY CTA MOBILE -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="sticky-cta">
    <button onclick="window.location.href='${ctaUrl}'">
      <i class="fab fa-whatsapp"></i> FALE COM ESPECIALISTA
    </button>
  </div>
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- GEO CONTEXT (Invisível para usuários, visível para IAs/Crawlers) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
   <aside class="geo-context visually-hidden" aria-hidden="true" itemscope itemtype="https://schema.org/Organization">
    <meta itemprop="@type" content="Organization">
    <h1 itemprop="name">${company}</h1>
    <p itemprop="description">${company} é especialista em odontologia digital.</p>
    <div class="entity-details">
      <p><strong>Setor:</strong> <span itemprop="industry">Odontologia Digital</span></p>
      ${seoTechnicalExpertise ? `<p><strong>Especialidades:</strong> ${seoTechnicalExpertise}</p>` : ''}
      ${companyData?.target_audience ? `<p><strong>Público-alvo:</strong> ${companyData.target_audience}</p>` : ''}
      <p><strong>Região de atuação:</strong> <span itemprop="areaServed">${city || 'Brasil'}, ${state || 'BR'}</span></p>
      ${seoServiceAreas ? `<p><strong>Áreas de serviço:</strong> ${seoServiceAreas}</p>` : ''}
      ${seoMarketPositioning ? `<p><strong>Posicionamento:</strong> ${seoMarketPositioning}</p>` : ''}
      ${seoCompetitiveAdvantages ? `<p><strong>Diferenciais/Certificações:</strong> ${seoCompetitiveAdvantages}</p>` : ''}
      ${companyData?.founded_year ? `<p><strong>Fundada em:</strong> <span itemprop="foundingDate">${companyData.founded_year}</span></p>` : ''}
      ${companyData?.website_url ? `<link itemprop="url" href="${companyData.website_url}">` : ''}
      ${companyData?.contact_phone ? `<meta itemprop="telephone" content="${companyData.contact_phone}">` : ''}
      ${companyData?.contact_email ? `<meta itemprop="email" content="${companyData.contact_email}">` : ''}
    </div>
    <p class="entity-summary">
      ${company} é uma empresa especializada em Odontologia Digital, atuando em ${city || 'Brasil'}, ${state || 'BR'}.
      ${seoTechnicalExpertise ? `Expertise em: ${seoTechnicalExpertise}.` : ''}
      ${companyData?.target_audience ? `Atendendo: ${companyData.target_audience}.` : ''}
    </p>
  </aside>
  `;
  
  // Insert after <body>
  result = result.replace(/<body[^>]*>/i, `$&\n${PREMIUM_HEADER}`);
  
  // ✅ REMOVER footer existente ANTES de injetar o novo (evita duplicação)
  result = result.replace(/<footer[^>]*class="[^"]*footer[^"]*"[^>]*>[\s\S]*?<\/footer>/gi, '<!-- ORIGINAL FOOTER REMOVED -->');
  result = result.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '<!-- FOOTER REMOVED -->');
  
  // Insert premium footer before </body>
  result = result.replace(/<\/body>/i, `${PREMIUM_FOOTER}\n</body>`);
  
  console.log(`✅ Header/Footer SPIN inserted (dynamic: ${hasCustomFooter ? 'yes' : 'fallback'}, duplicated footers removed)`);
  
  return result;
}

// ============================================
// FETCH PRODUCT DATA FOR SEO ENRICHMENT (FASE 4, 6)
// ============================================
async function fetchProductDataForSEO(
  supabase: any,
  brand: string,
  product: string
): Promise<{ faqs: FAQItem[]; workflow: any; relatedProducts: any[] }> {
  try {
    // Buscar produto por nome/marca aproximado
    const searchTerm = `%${product}%`;
    const { data: products, error } = await supabase
      .from('products_repository')
      .select('faq, workflow_stages, name, brand, description, image_url, product_url, price')
      .or(`name.ilike.${searchTerm},brand.ilike.%${brand}%`)
      .eq('approved', true)
      .limit(5);
    
    if (error || !products || products.length === 0) {
      console.log(`⚠️ [SEO Enrich] Nenhum produto encontrado para ${brand} ${product}`);
      return { faqs: [], workflow: null, relatedProducts: [] };
    }
    
    // Pegar FAQs do primeiro produto encontrado
    const primaryProduct = products[0];
    const faqs: FAQItem[] = Array.isArray(primaryProduct.faq) ? primaryProduct.faq : [];
    const workflow = primaryProduct.workflow_stages ? { 
      name: primaryProduct.name, 
      workflow_stages: primaryProduct.workflow_stages 
    } : null;
    
    console.log(`✅ [SEO Enrich] Produto encontrado: ${primaryProduct.name} (${faqs.length} FAQs, workflow: ${workflow ? 'sim' : 'não'})`);
    
    return {
      faqs,
      workflow,
      relatedProducts: products.slice(1) // Outros produtos como relacionados
    };
  } catch (err) {
    console.error('❌ [SEO Enrich] Erro ao buscar dados do produto:', err);
    return { faqs: [], workflow: null, relatedProducts: [] };
  }
}

// ============================================
// FETCH KOLS FOR PERSON SCHEMA (FASE 3)
// ============================================
async function fetchKOLsForPersonSchema(supabase: any): Promise<PersonSchemaData[]> {
  try {
    const kols = await fetchAllApprovedKOLs(supabase);
    console.log(`✅ [FASE 3] ${kols.length} KOLs carregados para Person Schema`);
    return kols;
  } catch (err) {
    console.error('⚠️ [FASE 3] Erro ao buscar KOLs:', err);
    return [];
  }
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
  companyData: any,
  aggregateRating: AggregateRatingData,
  preserveOriginal: boolean = false,
  publishedPages: PublishedPageLink[] = []
): Promise<TransformResult> {
  const companyName = companyData?.company_name || SMART_DENT_DATA.company_name;
  const companyUrl = companyData?.website_url || SMART_DENT_DATA.website_url;
  const logoUrl = companyData?.company_logo_url || SMART_DENT_DATA.company_logo_url;
  
  console.log(`🚀 Starting LP Clone v3.0 (FASES 1-9) for ${brand} ${product}`);
  console.log(`📏 HTML entrada para processamento: ${html.length} chars`);
  
  // Step 1: Sanitize
  let processedHTML = sanitizeHTML(html);
  console.log(`✅ HTML sanitized (${processedHTML.length} chars, diff: ${html.length - processedHTML.length})`);
  
  // Step 1.5: Garantir estrutura HTML completa (DOCTYPE, html, head, body)
  processedHTML = ensureCompleteHTMLStructure(processedHTML);
  
  // Step 2: Remove manufacturer elements (preserving videos) - CONDITIONAL
  let headerRemoved = false;
  let footerRemoved = false;
  let videosPreserved = countVideos(processedHTML);
  
  if (!preserveOriginal) {
    const result = removeManufacturerElements(processedHTML);
    processedHTML = result.html;
    headerRemoved = result.headerRemoved;
    footerRemoved = result.footerRemoved;
    videosPreserved = result.videosPreserved;
    console.log(`✅ Manufacturer elements removed (header: ${headerRemoved}, footer: ${footerRemoved}, videos preserved: ${videosPreserved})`);
  } else {
    console.log(`⏭️ Header/Footer preservation ENABLED - skipping removal (preserveOriginal=true)`);
  }
  
  // ✅ FASE 8: Extrair IDs de vídeo YouTube do HTML original
  const videoIds = extractVideoIdsFromHtml(html);
  
  // Step 2.5: Normalize YouTube videos (fix playback)
  const { html: videoNormalizedHTML, videosFixed } = normalizeYouTubeVideos(processedHTML);
  processedHTML = videoNormalizedHTML;
  console.log(`✅ ${videosFixed} YouTube iframes normalized for playback`);
  
  // Step 2.6: Convert Elementor video widgets to real iframes
  const { html: elementorVideoHTML, videosConverted } = convertElementorVideosToIframes(processedHTML);
  processedHTML = elementorVideoHTML;
  console.log(`✅ ${videosConverted} Elementor videos converted to iframes`);
  
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
  
  // Step 4.6: LAZY LOADING automático para imagens (Core Web Vitals)
  processedHTML = addLazyLoadingToImages(processedHTML);
  
  // ✅ FASE 3, 4, 6, 10: Buscar dados do produto, KOLs, Authority Data e Video Testimonials
  const [productData, kols, authorityData, videoTestimonials] = await Promise.all([
    fetchProductDataForSEO(supabase, brand, product),
    fetchKOLsForPersonSchema(supabase),
    fetchAuthorityData(supabase),
    fetchVideoTestimonials(supabase, 20)
  ]);
  
  // Log de authority data expandida
  if (authorityData) {
    const totalCompanyVideos = authorityData.companyVideos.youtube.length + 
                               authorityData.companyVideos.technical.length +
                               authorityData.companyVideos.testimonial.length;
    console.log(`✅ [FASE 10] Authority data COMPLETA: ${authorityData.partnerships.length} parceiros, ${authorityData.areasServed.length} áreas, ${authorityData.reviews.length} reviews, ${totalCompanyVideos} vídeos empresa, ${videoTestimonials.length} video testimonials`);
  } else {
    console.log(`⚠️ [FASE 10] Authority data não disponível`);
  }
  
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
  
  // Step 6: Inject SEO with complete Schema (FASES 1-10)
  processedHTML = injectSEO(
    processedHTML, 
    finalSEO, 
    companyData, 
    brand, 
    product, 
    finalOgImage, 
    aggregateRating,
    {
      capturedImages: images,
      videoIds,
      productFaqs: productData.faqs,
      relatedProducts: productData.relatedProducts,
      kols,
      productWorkflow: productData.workflow,
      authorityData,
      videoTestimonials
    }
  );
  console.log('✅ SEO v3.0 and Schema.org FASES 1-10 COMPLETO injected');
  
  // Step 7: Insert Smart Dent header/footer with cross-links
  processedHTML = insertSmartDentHeaderFooter(processedHTML, companyData, ctaUrl, publishedPages);
  console.log(`✅ Smart Dent header/footer inserted (${publishedPages.length} cross-links)`);
  
  // Step 8: Inject Tracking Pixels (GTM, GA4, Meta Pixel, TikTok)
  const trackingPixels = companyData?.tracking_pixels as TrackingPixels;
  if (trackingPixels) {
    processedHTML = injectTrackingIntoHTML(processedHTML, trackingPixels, { preview: false });
    const trackingSummary = getTrackingSummary(trackingPixels);
    if (trackingSummary.length > 0) {
      console.log(`✅ Tracking pixels injected: ${trackingSummary.join(', ')}`);
    } else {
      console.log('⚠️ No tracking pixels configured in company_profile');
    }
  }
  
  const stats = {
    imagesProcessed: images.filter(i => i.status === 'success').length,
    imagesFailed: images.filter(i => i.status === 'failed').length,
    ctasRewritten,
    cssPreserved: true,
    headerRemoved,
    footerRemoved,
    videosPreserved,
    videosFixed,
    videosConverted,
    videoSchemas: videoIds.length,
    faqSchemaItems: productData.faqs.length,
    kolsLoaded: kols.length,
    hasWorkflow: !!productData.workflow,
  };
  
  const score = calculateScore(stats, finalSEO, finalOgImage);
  console.log(`🎉 LP Clone v3.0 complete! Score: ${score}/10 | Schemas: Video=${videoIds.length}, FAQ=${productData.faqs.length}, KOL=${kols.length > 0 ? 'Yes' : 'No'}`);
  
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
    
    // DEBUG: Log request details
    const contentLength = req.headers.get('content-length');
    console.log(`📥 Request Content-Length header: ${contentLength}`);
    
    const body = await req.json();
    const { html, ctaUrl, seoConfig = {}, brand, product, preserveOriginal = false } = body;
    
    // DEBUG: Log received HTML size
    console.log(`📄 HTML recebido: ${html?.length || 0} caracteres`);
    console.log(`📄 Has <body>: ${html?.includes('<body') || false}`);
    console.log(`📄 Has </body>: ${html?.includes('</body>') || false}`);
    console.log(`📄 First 300 chars: ${html?.substring(0, 300) || 'VAZIO'}`);
    
    // ✅ NORMALIZAR ENCODING UTF-8 (fix double-encoded characters)
    const normalizedHTML = normalizeHTMLEncoding(html);
    console.log(`🔠 HTML after encoding normalization: ${normalizedHTML.length} chars`);
    
    if (!normalizedHTML || !ctaUrl) {
      throw new Error('HTML e URL do CTA são obrigatórios');
    }
    
    // Validar tamanho mínimo do HTML
    if (normalizedHTML.length < 500) {
      console.error(`❌ HTML muito pequeno: ${normalizedHTML.length} chars`);
      throw new Error(`HTML muito pequeno (${normalizedHTML.length} chars). Esperado: >1000 chars para uma LP. Verifique se o HTML está sendo enviado corretamente.`);
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
    
    console.log(`📋 Request: brand=${brand}, product=${product}, ctaUrl=${ctaUrl}, htmlSize=${normalizedHTML.length}`);
    
    // Fetch company data - buscar registro com dados completos (não o vazio)
    const { data: companyData } = await supabase
      .from('company_profile')
      .select('*')
      .not('contact_phone', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Use SMART_DENT_DATA as fallback
    const finalCompanyData = companyData || SMART_DENT_DATA;
    
    // ✅ FASE 1: Buscar AggregateRating dinâmico com fallback seguro
    let aggregateRating: AggregateRatingData;
    try {
      aggregateRating = await fetchAggregateRating(supabase);
      console.log(`✅ [Clone LP] AggregateRating dinâmico: ${aggregateRating.ratingValue} (${aggregateRating.reviewCount} reviews)`);
    } catch (error) {
      console.error('⚠️ [Clone LP] Erro ao buscar AggregateRating, usando fallback:', error);
      aggregateRating = {
        ratingValue: "4.8",
        reviewCount: 30,
        bestRating: 5,
        worstRating: 1
      };
    }

    // ✅ FASE 2: Buscar LocalBusiness data para GEO Local SEO
    let localBusinessData: LocalBusinessData;
    try {
      localBusinessData = await fetchLocalBusinessData(supabase);
      console.log(`✅ [Clone LP] LocalBusiness: ${localBusinessData.company_name} (${localBusinessData.city}/${localBusinessData.state})`);
    } catch (error) {
      console.error('⚠️ [Clone LP] Erro ao buscar LocalBusiness, usando fallback:', error);
      localBusinessData = {
        company_name: "Smart Dent",
        website_url: "https://smartdent.com.br",
        latitude: -23.5505,
        longitude: -46.6333
      };
    }
    
    // ✅ NOVO: Buscar páginas publicadas para cross-linking no footer
    const publishedPages = await fetchPublishedPagesForCrossLinks(supabase);
    
    const result = await processLandingPage(
      normalizedHTML,
      ctaUrl,
      seoConfig,
      brand,
      product,
      supabase,
      finalCompanyData,
      aggregateRating,
      preserveOriginal,
      publishedPages
    );
    
    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
});
