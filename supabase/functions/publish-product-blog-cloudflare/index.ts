import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { blake3 } from "https://esm.sh/hash-wasm@4.11.0";
import { marked } from "https://esm.sh/marked@12.0.0";

// ✅ NEW: Mustache Template Engine - Enterprise SaaS Design System
import { 
  renderProductBlogTemplate,
  type TemplateData,
  type ProductTemplateData,
  type CompanyTemplateData,
  type AuthorTemplateData
} from '../_shared/mustache-template-engine.ts';

// Schema Helpers - Fase SEO Completa
import { 
  generateVideoObjectSchemas, 
  extractProductVideos,
  generateVideoItemListSchema,
  type VideoSchemaData 
} from '../_shared/video-schema-helper.ts';

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
  generateReviewsSchema,  // ✅ CORREÇÃO: Import para gerar reviews individuais
  type AuthorityData,
  type VideoTestimonial
} from '../_shared/authority-data-helper.ts';

import { 
  generateLocalBusinessSchema,
  generateGeoContextHTML,
  type LocalBusinessData 
} from '../_shared/local-business-helper.ts';

import { 
  generateHowToSchema,
  generateHowToMicrodataHTML 
} from '../_shared/howto-schema-helper.ts';

import { 
  generateProductItemListSchema,
  type ItemListProduct 
} from '../_shared/itemlist-schema-helper.ts';

// ✅ MELHORIA 5: Import AggregateRating dinâmico
import { fetchAggregateRating, type AggregateRatingData } from '../_shared/aggregate-rating-helper.ts';

// ✅ SEO Fine-Tuning 10/10 - Shared Module
import { 
  expandFounderSameAs,
  generateServiceSchemas,
  generateHasCredential,
  deduplicateKeywords
} from '../_shared/seo-fine-tuning.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Flag to enable V2 template
const USE_V2_TEMPLATE = true;

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

// Helper para extrair features do produto - APENAS DADOS REAIS, SEM FALLBACKS
function extractProductFeatures(product: any): string[] {
  const features: string[] = [];
  
  // APENAS dados reais do produto - SEM INVENTAR NADA
  
  // 1. De benefits array
  if (Array.isArray(product.benefits) && product.benefits.length > 0) {
    product.benefits.forEach((b: any) => {
      if (features.length < 4) {
        const text = typeof b === 'string' ? b : (b.text || b.title || b.name);
        if (text && text.trim()) {
          features.push(text.trim());
        }
      }
    });
  }
  
  // 2. De features array
  if (Array.isArray(product.features) && features.length < 4) {
    product.features.forEach((f: any) => {
      if (features.length < 4) {
        const text = typeof f === 'string' ? f : (f.name || f.title || f.text);
        if (text && text.trim() && !features.includes(text.trim())) {
          features.push(text.trim());
        }
      }
    });
  }
  
  // RETORNA APENAS O QUE EXISTE NO PRODUTO - pode ser array vazio
  return features.slice(0, 4);
}

// Helper para normalizar labels de especificações técnicas
function normalizeSpecLabel(label: string): string {
  if (!label) return '';
  return label
    .replace(/\s*:\s*$/, '')           // Remove : no final
    .replace(/^\s*label\s*:\s*/i, '')  // Remove "label:" no início
    .replace(/^\s*value\s*:\s*/i, '')  // Remove "value:" no início
    .replace(/\s*->\s*:.*$/, '')       // Remove "-> : valor" patterns
    .replace(/\s{2,}/g, ' ')           // Remove espaços duplos
    .trim();
}

// Helper para extrair métricas de confiança (Trust Bar) - APENAS DADOS REAIS, SEM FALLBACKS
function extractTrustMetrics(product: any): Array<{value: string; label: string}> {
  const metrics: Array<{value: string; label: string}> = [];
  
  // APENAS dados reais do produto - SEM INVENTAR NADA
  
  // 1. De technical_specifications (com normalização de labels)
  if (Array.isArray(product.technical_specifications)) {
    product.technical_specifications.forEach((spec: any) => {
      const rawKey = spec.key || spec.label || spec.name;
      const rawValue = spec.value;
      if (rawKey && rawValue && metrics.length < 4) {
        const normalizedLabel = normalizeSpecLabel(String(rawKey));
        if (normalizedLabel && !metrics.some(m => m.label === normalizedLabel)) {
          metrics.push({ value: String(rawValue), label: normalizedLabel });
        }
      }
    });
  }
  
  // 2. De features se for objeto com pares key/value
  if (product.features && typeof product.features === 'object' && !Array.isArray(product.features)) {
    Object.entries(product.features).forEach(([key, value]) => {
      if (value && metrics.length < 4) {
        metrics.push({ value: String(value), label: key });
      }
    });
  }
  
  // 3. Dados físicos reais do produto
  if (product.weight && metrics.length < 4) {
    metrics.push({ value: `${product.weight}kg`, label: 'Peso' });
  }
  if (product.package_size && metrics.length < 4) {
    metrics.push({ value: product.package_size, label: 'Dimensões' });
  }
  
  // RETORNA APENAS O QUE EXISTE NO PRODUTO - pode ser array vazio ou com menos de 4 itens
  return metrics;
}

// Helper para extrair specs técnicas - APENAS DADOS REAIS, SEM FALLBACKS
function extractTechnicalSpecs(product: any): Array<{key: string; value: string}> {
  // APENAS dados reais do produto - SEM INVENTAR NADA
  if (Array.isArray(product.technical_specifications) && product.technical_specifications.length > 0) {
    return product.technical_specifications.slice(0, 10).map((spec: any) => {
      // Normaliza o label para evitar "Especificação" repetido
      const rawKey = spec.key || spec.label || spec.name;
      const normalizedKey = normalizeSpecLabel(String(rawKey || ''));
      return {
        key: normalizedKey || 'Especificação',
        value: spec.value || '-'
      };
    });
  }
  
  // RETORNA ARRAY VAZIO se não houver dados - NÃO INVENTA
  return [];
}

// Helper para extrair documentos
function extractDocuments(product: any): Array<{name: string; url: string}> {
  const docs: Array<{name: string; url: string}> = [];
  
  if (Array.isArray(product.technical_documents)) {
    product.technical_documents.forEach((doc: any) => {
      if (doc.url && doc.name) {
        docs.push({ name: doc.name, url: doc.url });
      }
    });
  }
  
  return docs;
}

// Helper para cards E-E-A-T - APENAS DADOS REAIS DO PRODUTO, SEM HARDCODE
function getEEATCards(product: any, blogType: string): Array<{icon: string; title: string; description: string}> {
  const cards: Array<{icon: string; title: string; description: string}> = [];
  
  // ✅ USAR APENAS os benefits reais do produto
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const features = Array.isArray(product.features) ? product.features : [];
  
  // Mapear ícones baseados em palavras-chave encontradas no texto REAL
  const iconMapping: Record<string, string> = {
    'resistência': 'fa-shield-alt',
    'durabilidade': 'fa-medal',
    'conforto': 'fa-smile',
    'precisão': 'fa-crosshairs',
    'flexibilidade': 'fa-compress-arrows-alt',
    'biocompatib': 'fa-leaf',
    'segurança': 'fa-shield-alt',
    'eficiência': 'fa-bolt',
    'tempo': 'fa-clock',
    'qualidade': 'fa-award',
    'iso': 'fa-certificate',
    'certificação': 'fa-certificate',
    'digital': 'fa-laptop',
    'velocidade': 'fa-bolt',
    'integração': 'fa-plug',
    'compatível': 'fa-plug',
    'estética': 'fa-palette',
    'natural': 'fa-leaf',
    'tratamento': 'fa-medkit',
    'clínic': 'fa-clinic-medical',
    'profissional': 'fa-user-md',
    'resultado': 'fa-chart-line'
  };
  
  // Função para encontrar ícone apropriado baseado no texto REAL
  function findIcon(text: string): string {
    const lowerText = text.toLowerCase();
    for (const [keyword, icon] of Object.entries(iconMapping)) {
      if (lowerText.includes(keyword)) return icon;
    }
    return 'fa-check-circle';
  }
  
  // Função para extrair título curto do benefício REAL (max 35 chars)
  function extractTitle(text: string): string {
    const cleanText = text
      .replace(/^(oferece|garante|proporciona|facilita|reduz|assegura|permite|possui|apresenta|dispõe|promove|assegura)\s+/i, '')
      .replace(/<[^>]*>/g, '')
      .trim();
    
    const words = cleanText.split(' ');
    let title = '';
    for (const word of words) {
      if ((title + ' ' + word).length <= 35) {
        title = title ? title + ' ' + word : word;
      } else break;
    }
    return title || cleanText.substring(0, 35);
  }
  
  // ✅ EXTRAIR CARDS DOS BENEFÍCIOS REAIS
  for (let i = 0; i < Math.min(benefits.length, 3); i++) {
    const benefit = benefits[i];
    const text = typeof benefit === 'string' ? benefit : (benefit?.text || benefit?.title || benefit?.name || '');
    if (text && text.trim()) {
      const cleanDesc = text.replace(/<[^>]*>/g, '').trim();
      cards.push({
        icon: findIcon(text),
        title: extractTitle(text),
        description: cleanDesc.substring(0, 150) + (cleanDesc.length > 150 ? '...' : '')
      });
    }
  }
  
  // ✅ SE NÃO HOUVER 3 BENEFÍCIOS, TENTAR FEATURES
  if (cards.length < 3) {
    for (let i = 0; i < Math.min(features.length, 3 - cards.length); i++) {
      const feature = features[i];
      const text = typeof feature === 'string' ? feature : (feature?.text || feature?.title || feature?.name || '');
      if (text && text.trim() && !cards.some(c => c.description.includes(text.substring(0, 50)))) {
        const cleanDesc = text.replace(/<[^>]*>/g, '').trim();
        cards.push({
          icon: findIcon(text),
          title: extractTitle(text),
          description: cleanDesc.substring(0, 150)
        });
      }
    }
  }
  
  // ✅ SE AINDA NÃO HOUVER CARDS, USAR DESCRIPTION (último recurso)
  if (cards.length === 0 && product.description) {
    const cleanDesc = (product.description || '').replace(/<[^>]*>/g, '').substring(0, 150);
    if (cleanDesc.trim()) {
      cards.push({
        icon: 'fa-info-circle',
        title: 'Sobre o Produto',
        description: cleanDesc
      });
    }
  }
  
  // ✅ RETORNA APENAS DADOS REAIS - pode ser array vazio
  return cards;
}

// Helper para gerar slug a partir do nome
function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper para extrair vídeos do produto para o template V2
function extractProductVideosForTemplate(product: any): Array<{ url: string; title?: string; thumbnail?: string; duration?: string }> {
  const videos: Array<{ url: string; title?: string; thumbnail?: string; duration?: string }> = [];
  
  // YouTube videos
  if (Array.isArray(product.youtube_videos)) {
    product.youtube_videos.forEach((v: any) => {
      const url = typeof v === 'string' ? v : v.url;
      if (url) {
        videos.push({
          url,
          title: typeof v === 'object' ? v.title : undefined,
          thumbnail: typeof v === 'object' ? v.thumbnail : undefined,
          duration: typeof v === 'object' ? v.duration : undefined
        });
      }
    });
  }
  
  // Technical videos
  if (Array.isArray(product.technical_videos)) {
    product.technical_videos.forEach((v: any) => {
      const url = typeof v === 'string' ? v : v.url;
      if (url && !videos.some(existing => existing.url === url)) {
        videos.push({
          url,
          title: typeof v === 'object' ? v.title : undefined,
          thumbnail: typeof v === 'object' ? v.thumbnail : undefined,
          duration: typeof v === 'object' ? v.duration : undefined
        });
      }
    });
  }
  
  return videos.slice(0, 6);
}

// Helper para extrair perfis sociais da empresa
function extractSocialProfiles(companyProfile: any): string[] {
  const profiles: string[] = [];
  
  if (companyProfile?.instagram_profile) {
    profiles.push(companyProfile.instagram_profile.startsWith('http') 
      ? companyProfile.instagram_profile 
      : `https://instagram.com/${companyProfile.instagram_profile.replace('@', '')}`);
  }
  
  if (companyProfile?.youtube_channel) {
    profiles.push(companyProfile.youtube_channel.startsWith('http')
      ? companyProfile.youtube_channel
      : `https://youtube.com/${companyProfile.youtube_channel}`);
  }
  
  if (companyProfile?.social_media_links) {
    const links = companyProfile.social_media_links;
    if (links.facebook) profiles.push(links.facebook);
    if (links.linkedin) profiles.push(links.linkedin);
    if (links.twitter) profiles.push(links.twitter);
    if (links.tiktok) profiles.push(links.tiktok);
  }
  
  return profiles;
}

// Helper para formatar duração de vídeo
function formatVideoDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  relatedProducts?: any[];
  authorityData?: AuthorityData | null;
  videoTestimonials?: VideoTestimonial[];
}): string {
  const { product, blogType, content, faqs, domain, pagePath, companyProfile, trackingPixels, relatedProducts, authorityData, videoTestimonials = [] } = options;
  
  const companyName = companyProfile?.company_name || 'Smart Dent';
  const canonicalUrl = `https://${domain}${pagePath}`;
  const websiteUrl = companyProfile?.website_url || `https://${domain}`;
  
  const title = blogType === 'commercial' 
    ? `${product.name} - Guia Completo | ${companyName}`
    : `${product.name} - Especificações Técnicas | ${companyName}`;
  
  const description = product.seo_description_override || 
    `Conheça tudo sobre ${product.name}. ${blogType === 'commercial' ? 'Benefícios, aplicações e como usar.' : 'Especificações técnicas detalhadas e informações profissionais.'}`;
  
  const keywordsArray = Array.isArray(product.keywords) ? product.keywords : [];
  const keywords = keywordsArray.length > 0 ? keywordsArray.join(', ') : product.name;

  const htmlContent = marked.parse(content);
  const faqSchema = generateFAQSchema(faqs);
  const { headScripts, bodyScripts } = generateTrackingScripts(trackingPixels);

  // Extract data for enterprise template
  const features = extractProductFeatures(product);
  const trustMetrics = extractTrustMetrics(product);
  const technicalSpecs = extractTechnicalSpecs(product);
  const documents = extractDocuments(product);
  const eeatCards = getEEATCards(product, blogType);

  // ═══════════════════════════════════════════════════════════
  // 🎥 FASE 8: Video Schemas (Video Carousel, Rich Snippets)
  // ═══════════════════════════════════════════════════════════
  const productVideos = extractProductVideos(product, { maxVideos: 4 });
  const videoSchemas = generateVideoObjectSchemas(productVideos, {
    includeTranscript: true,
    includeAboutProduct: true,
    creatorName: companyName,
    creatorUrl: websiteUrl
  });
  const videoItemListSchema = productVideos.length > 1 
    ? generateVideoItemListSchema(productVideos, `Vídeos sobre ${product.name}`)
    : null;

  // ═══════════════════════════════════════════════════════════
  // 🏢 FASE 2: LocalBusiness Schema (GEO Local SEO)
  // ═══════════════════════════════════════════════════════════
  const localBusinessData: LocalBusinessData = {
    company_name: companyProfile?.company_name,
    legal_name: companyProfile?.legal_name,
    company_description: companyProfile?.company_description,
    website_url: companyProfile?.website_url,
    company_logo_url: companyProfile?.company_logo_url,
    contact_phone: companyProfile?.contact_phone,
    contact_email: companyProfile?.contact_email,
    street_address: companyProfile?.street_address,
    address_number: companyProfile?.address_number,
    city: companyProfile?.city,
    state: companyProfile?.state,
    postal_code: companyProfile?.postal_code,
    country: companyProfile?.country,
    latitude: companyProfile?.latitude,
    longitude: companyProfile?.longitude,
    opening_hours: companyProfile?.opening_hours,
    price_range: companyProfile?.price_range,
    areas_served: companyProfile?.areas_served,
    founder_name: companyProfile?.founder_name,
    founder_title: companyProfile?.founder_title,
    founder_linkedin: companyProfile?.founder_linkedin,
    tax_id: companyProfile?.tax_id,
    duns_number: companyProfile?.duns_number,
    number_of_employees: companyProfile?.number_of_employees,
    founded_year: companyProfile?.founded_year,
    instagram_profile: companyProfile?.instagram_profile,
    youtube_channel: companyProfile?.youtube_channel,
    seo_service_areas: companyProfile?.seo_service_areas,
    seo_technical_expertise: companyProfile?.seo_technical_expertise
  };
  const localBusinessSchema = generateLocalBusinessSchema(localBusinessData);
  const geoContextHTML = generateGeoContextHTML(localBusinessData);

  // ═══════════════════════════════════════════════════════════
  // 🔧 FASE 4: HowTo Schema (Workflow Tutorial)
  // ═══════════════════════════════════════════════════════════
  const howToSchema = product.workflow_stages 
    ? generateHowToSchema(product, {
        includeSupplies: true,
        includeTips: true,
        companyName,
        websiteUrl
      })
    : null;
  const howToMicrodataHTML = product.workflow_stages 
    ? generateHowToMicrodataHTML(product)
    : '';

  // ═══════════════════════════════════════════════════════════
  // 🛒 FASE 7: ItemList Schema (Related Products Carousel)
  // ═══════════════════════════════════════════════════════════
  const relatedProductsItemList = relatedProducts && relatedProducts.length > 1
    ? generateProductItemListSchema(
        relatedProducts.map((p: any) => ({
          name: p.name,
          description: p.description,
          image_url: p.image_url,
          product_url: p.product_url,
          price: p.price,
          promo_price: p.promo_price,
          brand: p.brand || companyName,
          gtin: p.gtin,
          mpn: p.mpn,
          availability: p.availability || 'InStock',
          currency: 'BRL'
        })),
        {
          listName: `Produtos relacionados a ${product.name}`,
          listDescription: `Explore produtos que complementam ${product.name}`,
          includeOffers: true,
          includeBrand: true
        }
      )
    : null;

  // ═══════════════════════════════════════════════════════════
  // 🖼️ Multiple og:image (Gallery Images)
  // ═══════════════════════════════════════════════════════════
  const galleryImages: string[] = [];
  if (product.image_url) {
    galleryImages.push(product.image_url);
  }
  if (Array.isArray(product.images_gallery)) {
    product.images_gallery.slice(0, 3).forEach((img: any) => {
      const imgUrl = typeof img === 'string' ? img : (img.url || img.src);
      if (imgUrl && !galleryImages.includes(imgUrl)) {
        galleryImages.push(imgUrl);
      }
    });
  }

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
        <div class="footer-grid">
          ${footerConfig.locations && footerConfig.locations.length > 0 ? footerConfig.locations.map((loc: any) => `
            <div class="footer-col">
              <h4>${escapeHtml(loc.label || companyName)}</h4>
              ${loc.phone ? `<p><i class="fas fa-phone"></i> ${escapeHtml(loc.phone)}</p>` : ''}
              ${loc.email ? `<p><i class="fas fa-envelope"></i> ${escapeHtml(loc.email)}</p>` : ''}
              ${loc.address ? `<p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(loc.address)}</p>` : ''}
            </div>
          `).join('') : `
            <div class="footer-col">
              <h4>${escapeHtml(companyName)}</h4>
              <p><i class="fas fa-phone"></i> ${escapeHtml(companyProfile?.contact_phone || '')}</p>
              <p><i class="fas fa-envelope"></i> ${escapeHtml(companyProfile?.contact_email || '')}</p>
              <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(companyProfile?.street_address || '')}, ${escapeHtml(companyProfile?.address_number || '')}</p>
              <p>${escapeHtml(companyProfile?.city || '')} - ${escapeHtml(companyProfile?.state || '')}</p>
            </div>
          `}
          
          ${footerConfig.links && footerConfig.links.length > 0 ? `
            <div class="footer-col">
              <h4>Links Úteis</h4>
              ${footerConfig.links.map((link: any) => `
                <a href="${escapeHtml(link.href)}" target="${link.openInNewTab ? '_blank' : '_self'}">${escapeHtml(link.label)}</a>
              `).join('')}
            </div>
          ` : institutionalLinks.length > 0 ? `
            <div class="footer-col">
              <h4>Links Úteis</h4>
              ${institutionalLinks.slice(0, 5).map((link: any) => `
                <a href="${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.label)}</a>
              `).join('')}
            </div>
          ` : ''}
          
          ${footerConfig.social_links && footerConfig.social_links.length > 0 ? `
            <div class="footer-col">
              <h4>Redes Sociais</h4>
              <div class="social-links">
                ${footerConfig.social_links.map((social: any) => `
                  <a href="${escapeHtml(social.href)}" target="_blank" title="${escapeHtml(social.platform || '')}">
                    <i class="fab fa-${escapeHtml(social.platform || 'link')}"></i>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : socialMediaLinks.length > 0 ? `
            <div class="footer-col">
              <h4>Redes Sociais</h4>
              <div class="social-links">
                ${socialMediaLinks.map((social: any) => `
                  <a href="${escapeHtml(social.url || social.href)}" target="_blank" title="${escapeHtml(social.platform || '')}">
                    <i class="fab fa-${escapeHtml(social.platform || 'link')}"></i>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      return `
        <div class="footer-grid">
          <div class="footer-col">
            <h4>${escapeHtml(companyName)}</h4>
            <p><i class="fas fa-phone"></i> ${escapeHtml(companyProfile?.contact_phone || '')}</p>
            <p><i class="fas fa-envelope"></i> ${escapeHtml(companyProfile?.contact_email || '')}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(companyProfile?.street_address || '')}, ${escapeHtml(companyProfile?.address_number || '')}</p>
            <p>${escapeHtml(companyProfile?.city || '')} - ${escapeHtml(companyProfile?.state || '')}</p>
          </div>
          ${institutionalLinks.length > 0 ? `
          <div class="footer-col">
            <h4>Links Úteis</h4>
            ${institutionalLinks.slice(0, 5).map((link: any) => `
              <a href="${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.label)}</a>
            `).join('')}
          </div>
          ` : ''}
        </div>
      `;
    }
  })();

  // FAQ Section HTML (new accordion style)
  const faqSectionHTML = faqs && faqs.length > 0 ? `
    <section class="faq-section" id="faq" itemscope itemtype="https://schema.org/FAQPage">
      <div class="container">
        <h2 class="section-title">Perguntas Frequentes</h2>
        <p class="section-subtitle">Tire suas dúvidas sobre ${escapeHtml(product.name)}</p>
        <div class="faq-list">
          ${faqs.map((faq, idx) => `
            <details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question" ${idx === 0 ? 'open' : ''}>
              <summary itemprop="name">
                <span class="faq-icon"><i class="fas fa-plus"></i></span>
                ${escapeHtml(faq.question)}
              </summary>
              <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <p itemprop="text">${escapeHtml(faq.answer)}</p>
              </div>
            </details>
          `).join('')}
        </div>
      </div>
    </section>
  ` : '';

  // Schema.org JSON-LD - Complete SEO Schema Collection
  const orgSameAs = expandFounderSameAs(companyProfile || {});
  const schemas: any[] = [
    // ✅ Organization Schema (definida 1x; author/publisher referenciam via @id)
    {
      "@type": "Organization",
      "@id": `${websiteUrl}/#organization`,
      "name": companyName,
      "url": websiteUrl,
      ...(companyProfile?.company_logo_url && {
        "logo": {
          "@type": "ImageObject",
          "url": companyProfile.company_logo_url
        }
      }),
      ...(orgSameAs.length > 0 && { "sameAs": orgSameAs })
    },
    // ✅ BlogPosting Schema
    {
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "author": {
        "@id": `${websiteUrl}/#organization`
      },
      "publisher": {
        "@id": `${websiteUrl}/#organization`
      },
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
      },
      // ✅ MELHORIA 4: mainEntity aponta para o Product
      "mainEntity": {
        "@type": "Product",
        "name": product.name
      },
      // ✅ MELHORIA 1: about e mentions automáticos
      "about": [
        { "@type": "Thing", "name": product.category || "Odontologia Digital" },
        { "@type": "Thing", "name": companyProfile?.business_sector || "Equipamentos Odontológicos" }
      ],
      "mentions": [
        { "@type": "Product", "name": product.name },
        { "@type": "Organization", "name": companyName, "@id": `${companyProfile?.website_url || ''}/#organization` }
      ],
      "image": product.image_url,
      "keywords": keywords
    },
    // ✅ Product Schema
    {
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.image_url,
      "brand": {
        "@type": "Brand",
        "name": product.brand || companyName
      },
      // ✅ MELHORIA 5: AggregateRating DINÂMICO via aggregateRating helper
      "aggregateRating": aggregateRating ? {
        "@type": "AggregateRating",
        "ratingValue": aggregateRating.ratingValue || "5.0",
        "reviewCount": aggregateRating.reviewCount || 0,
        "bestRating": 5,
        "worstRating": 1
      } : undefined,
      // ✅ CORREÇÃO: Reviews individuais para Rich Snippets (campos obrigatórios name, ratingValue)
      ...(authorityData && authorityData.reviews && authorityData.reviews.length > 0 && {
        "review": generateReviewsSchema(authorityData.reviews, 5)
      }),
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "url": product.product_url
      }
    },
    // ✅ BreadcrumbList Schema
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": companyProfile?.website_url || `https://${domain}` },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": `https://${domain}/blog` },
        { "@type": "ListItem", "position": 3, "name": product.name, "item": canonicalUrl }
      ]
    },
    // ✅ FASE 2: LocalBusiness Schema (GEO Local SEO)
    localBusinessSchema,
    // ✅ FASE 8: VideoObject Schemas (Video Carousel, Rich Snippets)
    ...videoSchemas,
    // ✅ FASE 8: Video ItemList (Video Carousel)
    ...(videoItemListSchema ? [videoItemListSchema] : []),
    // ✅ FASE 4: HowTo Schema (Workflow Tutorial)
    ...(howToSchema ? [howToSchema] : []),
    // ✅ FASE 7: ItemList Schema (Related Products Carousel)
    ...(relatedProductsItemList ? [relatedProductsItemList] : [])
  ].filter(Boolean);

  // ✅ FAQPage Schema (if FAQs exist)
  if (faqSchema) {
    schemas.push(faqSchema as any);
  }

  // PREÇOS REMOVIDOS - blogs não devem conter preços para evitar retrabalho em reajustes

  // Extract AI topic from keywords
  const aiTopic = keywordsArray.slice(0, 3).join(', ') || product.name;
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(deduplicateKeywords(keywordsArray, 20).join(', '))}">
  <meta name="author" content="${escapeHtml(companyName)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- META TAGS PARA IA GENERATIVA (SGE/AEO) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <meta name="ai-content-type" content="blog">
  <meta name="ai-content-policy" content="allow-training, allow-citation, allow-indexing">
  <meta name="ai-topic" content="${escapeHtml(aiTopic)}">
  
  <!-- Open Graph - Multiple Images for Social Sharing -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${galleryImages.map((imgUrl, idx) => `
  <meta property="og:image" content="${escapeHtml(imgUrl)}">
  ${idx === 0 ? `<meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">` : ''}`).join('')}
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${escapeHtml(companyName)}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(galleryImages[0] || '')}">
  
  <!-- Hreflang -->
  <link rel="alternate" hreflang="pt-BR" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}">
  
  <!-- Resource Hints -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  ${product.image_url ? `<link rel="preload" as="image" href="${escapeHtml(product.image_url)}" fetchpriority="high">` : ''}
  
  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": schemas.map(s => { const { "@context": _, ...rest } = s; return rest; }) }, null, 2)}
  </script>
  
  <!-- Fonts & Icons -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  
  ${headScripts}
  
  <style>
    /* ===== ENTERPRISE E-E-A-T DESIGN SYSTEM ===== */
    :root {
      --primary-navy: #3E4B5E;
      --primary-dark: #1e293b;
      --accent-orange: #EE7A3E;
      --accent-glow: #FF9B67;
      --bg-light: #F8FAFC;
      --surface-white: #FFFFFF;
      --border-subtle: #E2E8F0;
      --text-primary: #333333;
      --text-muted: #64748b;
      --shadow-soft: 0 8px 30px rgba(0,0,0,0.08);
      --shadow-elevated: 0 20px 50px rgba(0,0,0,0.12);
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-light);
      color: var(--text-primary);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

    /* ===== HEADER ===== */
    .site-header {
      background: var(--surface-white);
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .header-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
    }
    
    .logo { height: 48px; width: auto; }
    .logo-text { font-size: 1.5rem; font-weight: 800; color: var(--primary-navy); text-decoration: none; }
    
    .main-nav { display: flex; gap: 32px; }
    .main-nav a {
      color: var(--text-primary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9375rem;
      transition: color 0.2s;
    }
    .main-nav a:hover { color: var(--accent-orange); }

    /* ===== BREADCRUMBS ===== */
    .breadcrumbs {
      padding: 16px 0;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .breadcrumbs a { color: var(--text-muted); text-decoration: none; }
    .breadcrumbs a:hover { color: var(--accent-orange); }
    .breadcrumbs span { margin: 0 8px; }

    /* ===== HERO SECTION (2 COLUMNS) ===== */
    .hero-section {
      background: var(--surface-white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-soft);
      margin-bottom: 24px;
      overflow: hidden;
    }
    
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      padding: 48px;
    }
    
    .hero-image-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .hero-image {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      border-radius: var(--radius-md);
      padding: 32px;
    }
    
    .hero-image img {
      max-width: 100%;
      max-height: 400px;
      object-fit: contain;
      filter: drop-shadow(0 10px 30px rgba(0,0,0,0.1));
      cursor: zoom-in;
    }
    
    .product-gallery-thumbs {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .gallery-thumb {
      width: 72px;
      height: 72px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      border: 2px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.2s;
      opacity: 0.7;
    }
    
    .gallery-thumb:hover {
      border-color: var(--accent-orange);
      opacity: 1;
    }
    
    .gallery-thumb.active {
      border-color: var(--accent-orange);
      opacity: 1;
      box-shadow: 0 0 0 2px rgba(238, 122, 62, 0.3);
    }
    
    .hero-info { display: flex; flex-direction: column; justify-content: center; }
    
    .category-badge {
      display: inline-block;
      background: linear-gradient(135deg, var(--accent-orange) 0%, var(--accent-glow) 100%);
      color: white;
      padding: 6px 16px;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      width: fit-content;
    }
    
    .hero-info h1 {
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--primary-navy);
      line-height: 1.2;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    
    /* PREÇOS REMOVIDOS - blogs não contêm preços */
    
    .feature-checklist {
      list-style: none;
      margin-bottom: 32px;
    }
    
    .feature-checklist li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.9375rem;
    }
    
    .feature-checklist li:last-child { border-bottom: none; }
    
    .feature-checklist i {
      color: var(--accent-orange);
      font-size: 1rem;
      width: 20px;
    }
    
    .cta-buttons { display: flex; gap: 16px; flex-wrap: wrap; }
    
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 16px 32px;
      background: linear-gradient(135deg, var(--accent-orange) 0%, var(--accent-glow) 100%);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 700;
      font-size: 0.9375rem;
      transition: all 0.3s;
      box-shadow: 0 8px 25px rgba(238, 122, 62, 0.35);
    }
    
    .btn-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 35px rgba(238, 122, 62, 0.45);
    }
    
    .btn-outline {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 16px 32px;
      background: transparent;
      color: var(--primary-navy);
      text-decoration: none;
      border: 2px solid var(--primary-navy);
      border-radius: 50px;
      font-weight: 700;
      font-size: 0.9375rem;
      transition: all 0.3s;
    }
    
    .btn-outline:hover {
      background: var(--primary-navy);
      color: white;
    }

    /* ===== TRUST BAR ===== */
    .trust-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: linear-gradient(135deg, var(--primary-navy) 0%, var(--primary-dark) 100%);
      color: white;
    }
    
    .trust-metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      text-align: center;
      border-right: 1px solid rgba(255,255,255,0.1);
    }
    
    .trust-metric:last-child { border-right: none; }
    
    .trust-metric .value {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--accent-orange);
      margin-bottom: 4px;
    }
    
    .trust-metric .label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.85;
    }

    /* ===== E-E-A-T CARDS ===== */
    .eeat-section {
      padding: 64px 0;
    }
    
    .section-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--primary-navy);
      text-align: center;
      margin-bottom: 12px;
    }
    
    .section-subtitle {
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 48px;
      font-size: 1.0625rem;
    }
    
    .eeat-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    
    .eeat-card {
      background: var(--surface-white);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 32px;
      text-align: center;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .eeat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--accent-orange), var(--accent-glow));
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .eeat-card:hover {
      transform: translateY(-8px);
      box-shadow: var(--shadow-elevated);
    }
    
    .eeat-card:hover::before { opacity: 1; }
    
    .eeat-card .icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(238,122,62,0.1) 0%, rgba(255,155,103,0.1) 100%);
      border-radius: 50%;
      margin: 0 auto 20px;
    }
    
    .eeat-card .icon i {
      font-size: 1.5rem;
      color: var(--accent-orange);
    }
    
    .eeat-card h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--primary-navy);
      margin-bottom: 12px;
    }
    
    .eeat-card p {
      color: var(--text-muted);
      font-size: 0.9375rem;
      line-height: 1.7;
    }

    /* ===== BLOG CONTENT ===== */
    .content-section {
      padding: 64px 0;
      background: var(--surface-white);
    }
    
    .blog-content {
      max-width: 800px;
      margin: 0 auto;
      font-size: 1.0625rem;
      line-height: 1.85;
    }
    
    .blog-content h2 {
      font-size: 1.625rem;
      font-weight: 700;
      color: var(--primary-navy);
      margin: 48px 0 20px;
      padding-top: 24px;
      border-top: 1px solid var(--border-subtle);
    }
    
    .blog-content h2:first-child { border-top: none; padding-top: 0; margin-top: 0; }
    
    .blog-content h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--primary-navy);
      margin: 32px 0 16px;
    }
    
    .blog-content p { margin-bottom: 20px; }
    
    .blog-content ul, .blog-content ol {
      margin: 20px 0 28px 24px;
    }
    
    .blog-content li { margin-bottom: 10px; }
    
    .blog-content strong { color: var(--primary-navy); }
    
    .blog-content blockquote {
      border-left: 4px solid var(--accent-orange);
      padding: 16px 24px;
      margin: 24px 0;
      background: var(--bg-light);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      font-style: italic;
      color: var(--text-muted);
    }

    /* ===== SPECS & DOWNLOADS ===== */
    .specs-section {
      padding: 64px 0;
      background: var(--bg-light);
    }
    
    .specs-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 48px;
      align-items: start;
    }
    
    .specs-table-container {
      background: var(--surface-white);
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: var(--shadow-soft);
    }
    
    .specs-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .specs-table thead {
      background: var(--primary-navy);
      color: white;
    }
    
    .specs-table th {
      padding: 16px 20px;
      text-align: left;
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .specs-table tbody tr:nth-child(even) { background: var(--bg-light); }
    
    .specs-table td {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.9375rem;
    }
    
    .specs-table td:first-child { font-weight: 600; color: var(--primary-navy); }
    
    .downloads-panel {
      background: var(--surface-white);
      border-radius: var(--radius-md);
      padding: 32px;
      box-shadow: var(--shadow-soft);
    }
    
    .downloads-panel h4 {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--primary-navy);
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .downloads-panel h4 i { color: var(--accent-orange); }
    
    .download-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg-light);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      text-decoration: none;
      color: var(--text-primary);
      margin-bottom: 12px;
      transition: all 0.2s;
    }
    
    .download-btn:last-child { margin-bottom: 0; }
    
    .download-btn:hover {
      background: var(--surface-white);
      border-color: var(--accent-orange);
      box-shadow: 0 4px 12px rgba(238, 122, 62, 0.15);
    }
    
    .download-btn .icon-pdf {
      width: 40px;
      height: 40px;
      background: #dc2626;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.125rem;
    }
    
    .download-btn span { flex: 1; font-weight: 500; }
    
    .download-btn .icon-download { color: var(--text-muted); }

    /* ===== FAQ ACCORDION ===== */
    .faq-section {
      padding: 64px 0;
      background: var(--surface-white);
    }
    
    .faq-list {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .faq-item {
      background: var(--surface-white);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      margin-bottom: 12px;
      overflow: hidden;
      transition: all 0.3s;
    }
    
    .faq-item:hover { box-shadow: var(--shadow-soft); }
    
    .faq-item[open] { border-color: var(--accent-orange); }
    
    .faq-item summary {
      padding: 20px 24px;
      cursor: pointer;
      font-weight: 600;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 16px;
      list-style: none;
      background: var(--bg-light);
      transition: all 0.2s;
    }
    
    .faq-item summary::-webkit-details-marker { display: none; }
    
    .faq-item summary:hover { background: #f1f5f9; }
    
    .faq-item[open] summary { background: var(--surface-white); border-bottom: 1px solid var(--border-subtle); }
    
    .faq-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-navy);
      color: white;
      border-radius: 50%;
      font-size: 0.75rem;
      flex-shrink: 0;
      transition: transform 0.3s;
    }
    
    .faq-item[open] .faq-icon { transform: rotate(45deg); }
    
    .faq-answer {
      padding: 24px;
      line-height: 1.8;
      color: var(--text-muted);
    }
    
    .faq-answer p { margin: 0; }

    /* ===== CTA SECTION ===== */
    .cta-section {
      padding: 80px 0;
      background: linear-gradient(135deg, var(--primary-navy) 0%, var(--primary-dark) 100%);
      text-align: center;
      color: white;
    }
    
    .cta-section h2 {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 16px;
      color: white;
    }
    
    .cta-section p {
      font-size: 1.125rem;
      opacity: 0.9;
      margin-bottom: 32px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .cta-section .btn-primary {
      font-size: 1rem;
      padding: 18px 40px;
    }

    /* ===== FOOTER ===== */
    .site-footer {
      background: var(--primary-dark);
      color: white;
      padding: 64px 0 32px;
    }
    
    .footer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 48px;
      margin-bottom: 48px;
    }
    
    .footer-col h4 {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 20px;
      color: white;
    }
    
    .footer-col p {
      font-size: 0.875rem;
      color: rgba(255,255,255,0.75);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .footer-col p i { color: var(--accent-orange); width: 16px; }
    
    .footer-col a {
      display: block;
      color: rgba(255,255,255,0.75);
      text-decoration: none;
      font-size: 0.875rem;
      padding: 6px 0;
      transition: color 0.2s;
    }
    
    .footer-col a:hover { color: var(--accent-orange); }
    
    .social-links {
      display: flex;
      gap: 12px;
      margin-top: 12px;
    }
    
    .social-links a {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      color: white;
      font-size: 1rem;
      transition: all 0.2s;
    }
    
    .social-links a:hover {
      background: var(--accent-orange);
    }
    
    .footer-bottom {
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 24px;
      text-align: center;
      font-size: 0.875rem;
      color: rgba(255,255,255,0.6);
    }

    /* ===== VIDEOS SECTION ===== */
    .videos-section {
      padding: 4rem 0;
      background: linear-gradient(135deg, var(--bg-light) 0%, #e2e8f0 100%);
    }
    
    .videos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    
    .video-card {
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--surface-white);
      box-shadow: var(--shadow-soft);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .video-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-elevated);
    }
    
    .video-thumbnail {
      position: relative;
      display: block;
      aspect-ratio: 16/9;
    }
    
    .video-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .play-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.3);
      transition: background 0.3s;
    }
    
    .video-thumbnail:hover .play-overlay {
      background: rgba(0,0,0,0.5);
    }
    
    .play-overlay i {
      font-size: 3rem;
      color: white;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
    
    .video-duration {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .video-title {
      padding: 1rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.4;
    }

    /* ===== CURIOSITY HIGHLIGHT ===== */
    .curiosity-highlight {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: linear-gradient(135deg, var(--accent-orange), var(--accent-glow));
      color: white;
      border-radius: var(--radius-sm);
      margin: 1.5rem 0;
    }
    
    .curiosity-highlight i {
      font-size: 1.5rem;
      color: #FFD700;
    }
    
    .curiosity-link {
      color: white;
      font-weight: 600;
      text-decoration: underline;
      white-space: nowrap;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 968px) {
      .hero-grid { grid-template-columns: 1fr; gap: 32px; padding: 32px; }
      .hero-info { text-align: center; }
      .hero-info h1 { font-size: 1.75rem; }
      .cta-buttons { justify-content: center; }
      .trust-bar { grid-template-columns: repeat(2, 1fr); }
      .eeat-cards { grid-template-columns: 1fr; }
      .specs-grid { grid-template-columns: 1fr; }
    }
    
    @media (max-width: 640px) {
      .header-inner { flex-direction: column; gap: 16px; }
      .main-nav { flex-wrap: wrap; justify-content: center; gap: 16px; }
      .hero-grid { padding: 24px; }
      .trust-bar { grid-template-columns: 1fr 1fr; }
      .trust-metric { padding: 16px 12px; }
      .trust-metric .value { font-size: 1.25rem; }
      .cta-buttons { flex-direction: column; }
      .btn-primary, .btn-outline { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>
  ${bodyScripts}
  
  <!-- HEADER -->
  <header class="site-header">
    <div class="container">
      <div class="header-inner">
        ${companyProfile?.company_logo_url 
          ? `<a href="${escapeHtml(companyProfile?.website_url || '/')}"><img src="${escapeHtml(companyProfile.company_logo_url)}" alt="${escapeHtml(companyName)}" class="logo"></a>`
          : `<a href="${escapeHtml(companyProfile?.website_url || '/')}" class="logo-text">${escapeHtml(companyName)}</a>`
        }
        <nav class="main-nav">${headerLinks}</nav>
      </div>
    </div>
  </header>
  
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
  
  <main>
    <!-- SEÇÃO A: HERO DE ALTA CONVERSÃO -->
    <div class="container">
      <section class="hero-section">
        <div class="hero-grid">
          <div class="hero-image-container">
            <div class="hero-image">
              ${product.image_url 
                ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="eager" width="400" height="400" id="main-product-image">`
                : `<div style="width:300px;height:300px;background:#e2e8f0;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#94a3b8;"><i class="fas fa-image fa-3x"></i></div>`
              }
            </div>
            ${(() => {
              // Extrair galeria de imagens
              const gallery = Array.isArray(product.images_gallery) ? product.images_gallery : [];
              // Adicionar imagem principal se não estiver na galeria
              const allImages: Array<{url: string; alt?: string}> = [];
              if (product.image_url) {
                allImages.push({ url: product.image_url, alt: product.name });
              }
              gallery.forEach((img: any) => {
                const imgUrl = typeof img === 'string' ? img : (img.url || img.src);
                if (imgUrl && imgUrl !== product.image_url) {
                  allImages.push({ url: imgUrl, alt: img.alt || product.name });
                }
              });
              // Mostrar galeria apenas se houver mais de 1 imagem
              if (allImages.length > 1) {
                return `
                  <div class="product-gallery-thumbs">
                    ${allImages.slice(0, 6).map((img, idx) => `
                      <img src="${escapeHtml(img.url)}" 
                           alt="${escapeHtml(img.alt || product.name)}" 
                           class="gallery-thumb ${idx === 0 ? 'active' : ''}"
                           onclick="document.getElementById('main-product-image').src=this.src; document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active')); this.classList.add('active');">
                    `).join('')}
                  </div>
                `;
              }
              return '';
            })()}
          </div>
          <div class="hero-info">
            <span class="category-badge">${escapeHtml(product.subcategory || product.category || 'Produto Premium')}</span>
            <h1>${escapeHtml(product.name)}</h1>
            <!-- PREÇOS REMOVIDOS - blogs não contêm preços para evitar republicação em reajustes -->
            <ul class="feature-checklist">
              ${features.map(f => `<li><i class="fas fa-check-circle"></i> ${escapeHtml(f)}</li>`).join('')}
            </ul>
            <div class="cta-buttons">
              ${product.product_url ? `<a href="${escapeHtml(product.product_url)}" class="btn-primary"><i class="fas fa-shopping-cart"></i> Comprar Agora</a>` : ''}
              <a href="#specs" class="btn-outline"><i class="fas fa-clipboard-list"></i> Ver Especificações</a>
            </div>
          </div>
        </div>
        
        <!-- TRUST BAR -->
        <div class="trust-bar">
          ${trustMetrics.map(m => `
            <div class="trust-metric">
              <span class="value">${escapeHtml(m.value)}</span>
              <span class="label">${escapeHtml(m.label)}</span>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
    
    <!-- SEÇÃO B: E-E-A-T CARDS -->
    <section class="eeat-section">
      <div class="container">
        <h2 class="section-title">Por que escolher ${escapeHtml(product.name)}?</h2>
        <p class="section-subtitle">Descubra o que faz ${escapeHtml(product.name)} ser a escolha de profissionais exigentes</p>
        <div class="eeat-cards">
          ${eeatCards.map(card => `
            <article class="eeat-card">
              <div class="icon"><i class="fas ${card.icon}"></i></div>
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.description)}</p>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
    
    <!-- BLOG CONTENT -->
    <section class="content-section">
      <div class="container">
        <article class="blog-content">
          ${htmlContent}
        </article>
      </div>
    </section>
    
    <!-- SEÇÃO C: ESPECIFICAÇÕES + DOWNLOADS -->
    <section class="specs-section" id="specs">
      <div class="container">
        <h2 class="section-title">Especificações Técnicas</h2>
        <p class="section-subtitle">Informações detalhadas para profissionais</p>
        <div class="specs-grid">
          <div class="specs-table-container">
            <table class="specs-table">
              <thead>
                <tr><th>Especificação</th><th>Valor</th></tr>
              </thead>
              <tbody>
                ${technicalSpecs.map(spec => `
                  <tr>
                    <td>${escapeHtml(spec.key)}</td>
                    <td>${escapeHtml(spec.value)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="downloads-panel">
            <h4><i class="fas fa-file-download"></i> Downloads Técnicos</h4>
            ${documents.length > 0 ? documents.map(doc => `
              <a href="${escapeHtml(doc.url)}" class="download-btn" target="_blank" rel="noopener">
                <div class="icon-pdf"><i class="fas fa-file-pdf"></i></div>
                <span>${escapeHtml(doc.name)}</span>
                <i class="fas fa-download icon-download"></i>
              </a>
            `).join('') : `
              <p style="color: var(--text-muted); font-size: 0.9375rem;">
                <i class="fas fa-info-circle"></i> Entre em contato para solicitar documentação técnica.
              </p>
              <a href="https://api.whatsapp.com/send/?phone=${escapeHtml((companyProfile?.contact_phone || '').replace(/\D/g, ''))}&text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20a%20documenta%C3%A7%C3%A3o%20t%C3%A9cnica%20do%20produto%20${encodeURIComponent(product.name)}" class="download-btn" target="_blank">
                <div class="icon-pdf" style="background: #25D366;"><i class="fab fa-whatsapp"></i></div>
                <span>Solicitar via WhatsApp</span>
                <i class="fas fa-external-link-alt icon-download"></i>
              </a>
            `}
          </div>
        </div>
      </div>
    </section>
    
    <!-- SEÇÃO D: FAQ ACCORDION -->
    ${faqSectionHTML}
    
    <!-- SEÇÃO E: VÍDEOS DO PRODUTO -->
    ${productVideos.length > 0 ? `
    <section class="videos-section">
      <div class="container">
        <h2 class="section-title">🎬 Veja ${escapeHtml(product.name)} na Prática</h2>
        <p class="section-subtitle">Descubra como funciona em situações reais e casos clínicos</p>
        <div class="videos-grid">
          ${productVideos.slice(0, 4).map((video: any, idx: number) => `
            <div class="video-card">
              <a href="${escapeHtml(video.embedUrl || video.contentUrl || '')}" target="_blank" rel="noopener" class="video-thumbnail">
                <img src="${escapeHtml(video.thumbnailUrl || '')}" alt="${escapeHtml(video.name || product.name)}" loading="lazy">
                <div class="play-overlay">
                  <i class="fas fa-play-circle"></i>
                  ${video.duration ? `<span class="video-duration">${formatVideoDuration(video.duration)}</span>` : ''}
                </div>
              </a>
              <h4 class="video-title">${escapeHtml(video.name || 'Vídeo ' + (idx + 1))}</h4>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
    ` : ''}
    
    <!-- CTA FINAL -->
    <section class="cta-section">
      <div class="container">
        <h2>Você já imaginou os resultados que pode alcançar?</h2>
        <p>Profissionais que adotaram ${escapeHtml(product.name)} relatam mudanças significativas em seus casos clínicos. Quer saber se é a escolha certa para seu perfil de trabalho?</p>
        <a href="${escapeHtml(product.product_url || companyProfile?.website_url || '#')}" class="btn-primary">
          <i class="fas fa-flask"></i> Explorar Possibilidades
        </a>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="site-footer">
    <div class="container">
      ${footerHTML}
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${escapeHtml(companyName)}. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- 🏢 FASE 2: GEO Context LocalBusiness Microdata (Hidden) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${geoContextHTML}

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- 🔧 FASE 4: HowTo Microdata (Hidden - for Workflow Products) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${howToMicrodataHTML}

  <!-- GEO Context Text (Enhanced for LLMs/AI Crawlers/SGE) -->
  <div aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;pointer-events:none;">
    <p>${escapeHtml(companyName)} é especialista em ${escapeHtml(product.category || 'produtos odontológicos')}. Produto: ${escapeHtml(product.name)}. ${product.brand ? `Marca: ${escapeHtml(product.brand)}.` : ''} Localização: ${escapeHtml(companyProfile?.city || 'Brasil')}, ${escapeHtml(companyProfile?.state || 'BR')}.</p>
    <p>Perguntas frequentes sobre ${escapeHtml(product.name)}: ${technicalSpecs.slice(0, 3).map((s: any) => `${s.key}: ${s.value}`).join('. ')}.</p>
    <p>Profissionais que buscam ${escapeHtml(product.category || 'produtos odontológicos')} frequentemente comparam especificações técnicas antes de decidir.</p>
    ${productVideos.length > 0 ? `<p>Vídeos demonstrativos disponíveis: ${productVideos.slice(0, 3).map((v: any) => v.name).join(', ')}.</p>` : ''}
    ${features.length > 0 ? `<p>Principais benefícios: ${features.slice(0, 3).join('; ')}.</p>` : ''}
  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- 🏢 FASE 10: Authority Context COMPLETO (E-E-A-T, Trust Signals, Videos) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${authorityData ? generateAuthorityContextHTML(authorityData, videoTestimonials) : ''}
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

    // 2. Get company profile with ALL fields for header/footer (use limit 1 to handle multiple profiles)
    const { data: companyProfiles, error: companyError } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1);

    const companyProfile = companyProfiles?.[0] || null;

    console.log('[publish-product-blog] Company profile query result:', {
      hasData: !!companyProfile,
      error: companyError?.message || null,
      hasSeoDomains: !!companyProfile?.seo_domains,
      seoDomainsLength: Array.isArray(companyProfile?.seo_domains) ? companyProfile.seo_domains.length : 'not array'
    });

    if (companyError) {
      console.warn('[publish-product-blog] Company profile error:', companyError);
    }

    // 3. Get domain config for tracking pixels
    const seoDomains = companyProfile?.seo_domains || [];
    console.log('[publish-product-blog] Looking for domain:', domain);
    console.log('[publish-product-blog] Available domains:', JSON.stringify(seoDomains.map((d: any) => d.domain)));
    
    // Normalize domain comparison (trim whitespace, lowercase)
    const normalizedDomain = domain?.trim()?.toLowerCase();
    const domainConfig = seoDomains.find((d: any) => 
      d.domain?.trim()?.toLowerCase() === normalizedDomain
    );
    
    console.log('[publish-product-blog] Domain config found:', domainConfig ? 'yes' : 'no');
    
    const cloudflareProjectName = domainConfig?.cloudflare_project_name;
    const trackingPixels = domainConfig?.tracking_pixels || companyProfile?.tracking_pixels || null;

    if (!cloudflareProjectName) {
      console.error('[publish-product-blog] No cloudflare_project_name for domain:', domain);
      console.error('[publish-product-blog] Domain config:', JSON.stringify(domainConfig));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Domínio ${domain} não tem cloudflare_project_name configurado em seo_domains`,
          debug: {
            requestedDomain: domain,
            availableDomains: seoDomains.map((d: any) => d.domain),
            domainConfigFound: !!domainConfig
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('[publish-product-blog] Using cloudflare project:', cloudflareProjectName);

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
      publish_status: 'pending',
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

    // 4.5. Fetch related products for ItemList schema (same category, limit 6)
    console.log('[publish-product-blog] Fetching related products for ItemList schema...');
    const { data: relatedProducts } = await supabase
      .from('products_repository')
      .select('id, name, description, image_url, product_url, price, promo_price, brand, gtin, mpn, availability')
      .eq('category', product.category)
      .neq('id', productId)
      .eq('approved', true)
      .limit(6);
    
    console.log(`[publish-product-blog] Related products found: ${relatedProducts?.length || 0}`);

    // 5.5. Fetch authority data for E-E-A-T and Video Testimonials + AggregateRating
    const [authorityData, videoTestimonials, aggregateRating] = await Promise.all([
      fetchAuthorityData(supabase),
      fetchVideoTestimonials(supabase, 20),
      fetchAggregateRating(supabase)
    ]);
    console.log(`✅ [Blog Cloudflare] AggregateRating dinâmico: ${aggregateRating.ratingValue} (${aggregateRating.reviewCount} reviews)`);
    
    if (authorityData) {
      const totalCompanyVideos = authorityData.companyVideos.youtube.length + 
                                 authorityData.companyVideos.technical.length +
                                 authorityData.companyVideos.testimonial.length;
      console.log(`[publish-product-blog] Authority data COMPLETA: ${authorityData.partnerships.length} parceiros, ${totalCompanyVideos} vídeos empresa, ${videoTestimonials.length} video testimonials`);
    } else {
      console.log(`[publish-product-blog] Authority data: not available`);
    }

    // 5. Generate HTML - Use V2 Template Engine when enabled
    let html: string;
    
    if (USE_V2_TEMPLATE) {
      console.log(`[publish-product-blog] Using V2 Mustache Template Engine`);
      
      // Prepare template data
      const templateData: TemplateData = {
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug || slugify(product.name),
          description: product.description || '',
          sales_pitch: product.sales_pitch,
          category: product.category,
          subcategory: product.subcategory,
          brand: product.brand,
          image_url: product.image_url,
          images_gallery: Array.isArray(product.images_gallery) 
            ? product.images_gallery.map((img: any) => ({
                url: typeof img === 'string' ? img : img.url,
                alt: typeof img === 'object' ? img.alt : product.name,
                is_main: typeof img === 'object' ? img.is_main : false
              }))
            : [],
          price: product.price,
          promo_price: product.promo_price,
          currency: product.currency || 'BRL',
          gtin: product.gtin,
          mpn: product.mpn,
          ean: product.ean,
          availability: product.availability || 'in_stock',
          features: Array.isArray(product.features) 
            ? product.features.map((f: any) => typeof f === 'string' ? f : f.name || f.title || f.text).filter(Boolean)
            : [],
          benefits: Array.isArray(product.benefits)
            ? product.benefits.map((b: any) => typeof b === 'string' ? b : b.text || b.title || b.name).filter(Boolean)
            : [],
          applications: Array.isArray(product.applications)
            ? product.applications
            : product.applications?.split?.(',').map((a: string) => a.trim()) || [],
          target_audience: Array.isArray(product.target_audience)
            ? product.target_audience.map((t: any) => typeof t === 'string' ? t : t.persona || t.name).filter(Boolean)
            : [],
          technical_specifications: Array.isArray(product.technical_specifications)
            ? product.technical_specifications.map((s: any) => ({
                key: s.label || s.key || s.name || '',
                value: s.value || ''
              })).filter((s: any) => s.key && s.value)
            : [],
          faq: faqs?.map(f => ({ question: f.question, answer: f.answer })) || [],
          videos: extractProductVideosForTemplate(product),
          warranty_info: product.warranty_info,
          workflow_stages: product.workflow_stages,
          keywords: Array.isArray(product.keywords) ? product.keywords : [],
          canonical_url: `https://${domain}${finalPagePath}`,
          product_url: product.product_url || companyProfile?.website_url
        },
        company: {
          company_name: companyProfile?.company_name || 'Smart Dent',
          company_description: companyProfile?.company_description,
          company_logo_url: companyProfile?.company_logo_url,
          website_url: companyProfile?.website_url || `https://${domain}`,
          contact_email: companyProfile?.contact_email,
          contact_phone: companyProfile?.contact_phone,
          street_address: companyProfile?.street_address,
          city: companyProfile?.city,
          state: companyProfile?.state,
          postal_code: companyProfile?.postal_code,
          country: companyProfile?.country || 'Brasil',
          latitude: companyProfile?.latitude,
          longitude: companyProfile?.longitude,
          social_profiles: extractSocialProfiles(companyProfile),
          founded_year: companyProfile?.founded_year,
          founder_name: companyProfile?.founder_name,
          google_aggregate_rating: companyProfile?.google_aggregate_rating,
          tracking_pixels: {
            gtm_id: trackingPixels?.google_tag_manager?.enabled ? trackingPixels.google_tag_manager.container_id || undefined : undefined,
            meta_pixel_id: trackingPixels?.meta_pixel?.enabled ? trackingPixels.meta_pixel.pixel_id || undefined : undefined,
            tiktok_pixel_id: trackingPixels?.tiktok_pixel?.enabled ? trackingPixels.tiktok_pixel.pixel_id || undefined : undefined
          },
          seo_domains: companyProfile?.seo_domains
        },
        author: undefined, // TODO: Fetch author from KOL if needed
        blogType,
        generatedAt: new Date().toISOString()
      };
      
      html = renderProductBlogTemplate(templateData);
    } else {
      // V1: Use legacy programmatic HTML generator
      html = generateProductBlogHTML({
        product,
        blogType,
        content,
        faqs: faqs || [],
        domain,
        pagePath: finalPagePath,
        companyProfile,
        trackingPixels,
        relatedProducts: relatedProducts || [],
        authorityData,
        videoTestimonials
      });
    }

    console.log(`[publish-product-blog] HTML generated: ${html.length} bytes`);

    // 6. Upload to Cloudflare Pages - CORRECT 5-STEP PROCESS
    // (Copied from publish-cloudflare-pages)
    
    // STEP 1: Calculate BLAKE3 hash and prepare file path
    const filePath = finalPagePath === '/' 
      ? '/index.html' 
      : `/${finalPagePath.replace(/^\//, '')}/index.html`;
    const contentHash = await calculateBlake3Hash(html);
    console.log(`[publish-product-blog] STEP 1 - BLAKE3 hash calculated:`, { 
      filePath, 
      hash: contentHash,
      contentLength: html.length 
    });

    // STEP 2: Get JWT upload token
    console.log(`[publish-product-blog] STEP 2 - Getting upload token...`);
    const tokenResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${cloudflareProjectName}/upload-token`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        }
      }
    );

    const tokenData = await tokenResponse.json();
    console.log(`[publish-product-blog] Token response:`, {
      status: tokenResponse.status,
      success: tokenData.success,
      hasJwt: !!tokenData.result?.jwt
    });

    if (!tokenResponse.ok || !tokenData.success || !tokenData.result?.jwt) {
      console.error('[publish-product-blog] Failed to get upload token:', tokenData);
      
      await supabase
        .from('product_blog_publications')
        .update({ 
          publish_status: 'error',
          publish_error_message: tokenData.errors?.[0]?.message || 'Falha ao obter token de upload'
        })
        .eq('id', publicationId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: tokenData.errors?.[0]?.message || 'Falha ao obter token de upload' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const jwtToken = tokenData.result.jwt;

    // STEP 3: Upload file content using JWT
    console.log(`[publish-product-blog] STEP 3 - Uploading file content...`);
    
    const base64Content = stringToBase64(html);
    
    const uploadPayload = [{
      key: contentHash,
      value: base64Content,
      metadata: { contentType: 'text/html' },
      base64: true
    }];

    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/pages/assets/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(uploadPayload)
      }
    );

    const uploadData = await uploadResponse.json();
    console.log(`[publish-product-blog] Upload response:`, {
      status: uploadResponse.status,
      success: uploadData.success,
      errors: uploadData.errors
    });

    if (!uploadResponse.ok || !uploadData.success) {
      console.error('[publish-product-blog] Failed to upload file:', uploadData);
      
      await supabase
        .from('product_blog_publications')
        .update({ 
          publish_status: 'error',
          publish_error_message: uploadData.errors?.[0]?.message || 'Falha ao fazer upload do arquivo'
        })
        .eq('id', publicationId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: uploadData.errors?.[0]?.message || 'Falha ao fazer upload do arquivo' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // STEP 4: Upsert hashes to register the uploaded files
    console.log(`[publish-product-blog] STEP 4 - Registering hashes...`);
    
    const upsertResponse = await fetch(
      `https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hashes: [contentHash] })
      }
    );

    const upsertData = await upsertResponse.json();
    console.log(`[publish-product-blog] Upsert hashes response:`, {
      status: upsertResponse.status,
      success: upsertData.success,
      errors: upsertData.errors
    });

    if (!upsertResponse.ok || !upsertData.success) {
      console.error('[publish-product-blog] Failed to upsert hashes:', upsertData);
      
      await supabase
        .from('product_blog_publications')
        .update({ 
          publish_status: 'error',
          publish_error_message: upsertData.errors?.[0]?.message || 'Falha ao registrar hashes'
        })
        .eq('id', publicationId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: upsertData.errors?.[0]?.message || 'Falha ao registrar hashes' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // STEP 5: Create deployment with manifest only (no blob)
    console.log(`[publish-product-blog] STEP 5 - Creating deployment...`);
    
    const manifest = { [filePath]: contentHash };
    console.log(`[publish-product-blog] Manifest:`, manifest);

    const formData = new FormData();
    formData.append('manifest', JSON.stringify(manifest));

    const createDeploymentResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${cloudflareProjectName}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
        body: formData
      }
    );

    const uploadResult = await createDeploymentResponse.json();
    console.log(`[publish-product-blog] Create deployment response:`, {
      status: createDeploymentResponse.status,
      success: uploadResult.success,
      errors: uploadResult.errors,
      hasResult: !!uploadResult.result
    });

    if (!createDeploymentResponse.ok || !uploadResult.success) {
      console.error('[publish-product-blog] Failed to create deployment:', uploadResult);
      
      await supabase
        .from('product_blog_publications')
        .update({ 
          publish_status: 'error',
          publish_error_message: uploadResult.errors?.[0]?.message || 'Falha ao criar deployment'
        })
        .eq('id', publicationId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: uploadResult.errors?.[0]?.message || 'Falha ao criar deployment no Cloudflare' 
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
