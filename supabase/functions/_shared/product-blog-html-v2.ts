/**
 * 🎨 PRODUCT BLOG HTML GENERATOR V2
 * Enterprise SaaS Design System com Dark Mode e Schema.org expandido
 * 
 * Features:
 * - ✅ Design System completo com CSS Variables
 * - ✅ Dark Mode nativo (toggle automático ou manual)
 * - ✅ Hero com galeria de imagens
 * - ✅ Trust Bar com métricas dinâmicas
 * - ✅ E-E-A-T Cards visuais
 * - ✅ FAQ Accordion acessível WCAG 2.1
 * - ✅ Videos Grid 16:9 responsivo
 * - ✅ Schema.org expandido (@graph)
 * - ✅ Tracking pixels integrado
 * - ✅ Performance otimizada (content-visibility, preload)
 */

import { marked } from "https://esm.sh/marked@12.0.0";
import { 
  generateTrackingHeadScripts, 
  generateGTMNoScript,
  type TrackingPixels 
} from './tracking-injector.ts';
import { 
  generateVideoObjectSchemas, 
  extractProductVideos,
  generateVideoItemListSchema
} from './video-schema-helper.ts';
import { 
  generateLocalBusinessSchema,
  type LocalBusinessData 
} from './local-business-helper.ts';
import { generateHowToSchema } from './howto-schema-helper.ts';
// ✅ SEO Fine-Tuning 10/10 - Shared Module
import { 
  expandFounderSameAs,
  generateServiceSchemas,
  generateHasCredential,
  deduplicateKeywords,
  generateHreflangHTML
} from './seo-fine-tuning.ts';

// 🤖 AI Readiness Helpers
import { enrichGraphWithAIReadiness, generateAISummaryBlock } from './ai-readiness-helpers.ts';

// ============================================
// INTERFACES
// ============================================

export interface ProductBlogV2Options {
  product: any;
  blogType: 'commercial' | 'technical';
  content: string;
  faqs: Array<{ question: string; answer: string; sge_snippet?: string; category?: string }>;
  domain: string;
  pagePath: string;
  companyProfile: any;
  trackingPixels?: TrackingPixels | null;
  relatedProducts?: any[];
  authorityData?: any;
  darkModeDefault?: boolean;
  aggregateRatingData?: { ratingValue: string; reviewCount: number; bestRating: number; worstRating: number };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function formatVideoDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// DATA EXTRACTORS (APENAS DADOS REAIS)
// ============================================

function extractProductFeatures(product: any): string[] {
  const features: string[] = [];
  
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
  
  return features.slice(0, 4);
}

function extractTrustMetrics(product: any): Array<{value: string; label: string}> {
  const metrics: Array<{value: string; label: string}> = [];
  
  if (Array.isArray(product.technical_specifications)) {
    product.technical_specifications.slice(0, 4).forEach((spec: any) => {
      const rawKey = spec.key || spec.label || spec.name;
      const rawValue = spec.value;
      if (rawKey && rawValue && metrics.length < 4) {
        const normalizedLabel = String(rawKey).replace(/\s*:\s*$/, '').trim();
        if (normalizedLabel && !metrics.some(m => m.label === normalizedLabel)) {
          metrics.push({ value: String(rawValue), label: normalizedLabel });
        }
      }
    });
  }
  
  if (product.weight && metrics.length < 4) {
    metrics.push({ value: `${product.weight}kg`, label: 'Peso' });
  }
  if (product.package_size && metrics.length < 4) {
    metrics.push({ value: product.package_size, label: 'Dimensões' });
  }
  
  return metrics;
}

function extractTechnicalSpecs(product: any): Array<{key: string; value: string}> {
  if (Array.isArray(product.technical_specifications) && product.technical_specifications.length > 0) {
    return product.technical_specifications.slice(0, 10).map((spec: any) => ({
      key: String(spec.key || spec.label || spec.name || 'Especificação').replace(/\s*:\s*$/, '').trim(),
      value: spec.value || '-'
    }));
  }
  return [];
}

function extractDocuments(product: any): Array<{name: string; url: string; type?: string}> {
  const docs: Array<{name: string; url: string; type?: string}> = [];
  
  if (Array.isArray(product.technical_documents)) {
    product.technical_documents.forEach((doc: any) => {
      if (doc.url && doc.name) {
        docs.push({ 
          name: doc.name, 
          url: doc.url,
          type: doc.type || 'PDF'
        });
      }
    });
  }
  
  return docs;
}

function extractGalleryImages(product: any): string[] {
  const images: string[] = [];
  
  if (product.image_url) {
    images.push(product.image_url);
  }
  
  if (Array.isArray(product.images_gallery)) {
    product.images_gallery.slice(0, 5).forEach((img: any) => {
      const imgUrl = typeof img === 'string' ? img : (img.url || img.src);
      if (imgUrl && !images.includes(imgUrl)) {
        images.push(imgUrl);
      }
    });
  }
  
  return images;
}

function extractVideos(product: any): Array<{url: string; title: string; duration?: string; thumbnail?: string}> {
  const videos: Array<{url: string; title: string; duration?: string; thumbnail?: string}> = [];
  
  const sources = [
    product.youtube_videos,
    product.technical_videos,
    product.testimonial_videos
  ];
  
  sources.forEach(source => {
    if (Array.isArray(source)) {
      source.slice(0, 3).forEach((v: any) => {
        const url = typeof v === 'string' ? v : (v.url || v.embedUrl);
        const title = typeof v === 'string' ? product.name : (v.title || v.name || product.name);
        if (url && videos.length < 3) {
          videos.push({
            url,
            title,
            duration: v.duration ? formatVideoDuration(v.duration) : undefined,
            thumbnail: v.thumbnail || v.thumbnailUrl
          });
        }
      });
    }
  });
  
  return videos;
}

// ============================================
// E-E-A-T CARDS GENERATOR
// ============================================

function getEEATCards(product: any): Array<{icon: string; title: string; description: string}> {
  const cards: Array<{icon: string; title: string; description: string}> = [];
  
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  const features = Array.isArray(product.features) ? product.features : [];
  
  const iconMapping: Record<string, string> = {
    'resistência': 'shield',
    'durabilidade': 'medal',
    'conforto': 'smile',
    'precisão': 'crosshairs',
    'flexibilidade': 'arrows-alt',
    'biocompatib': 'leaf',
    'segurança': 'shield-alt',
    'eficiência': 'bolt',
    'qualidade': 'award',
    'digital': 'laptop',
    'velocidade': 'bolt',
    'integração': 'plug',
    'estética': 'palette',
    'natural': 'leaf',
    'tratamento': 'medkit',
    'profissional': 'user-md',
    'resultado': 'chart-line'
  };
  
  function findIcon(text: string): string {
    const lowerText = text.toLowerCase();
    for (const [keyword, icon] of Object.entries(iconMapping)) {
      if (lowerText.includes(keyword)) return icon;
    }
    return 'check-circle';
  }
  
  function extractTitle(text: string): string {
    const cleanText = text
      .replace(/^(oferece|garante|proporciona|facilita|reduz|assegura|permite|possui|apresenta|dispõe|promove)\s+/i, '')
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
  
  return cards;
}

// ============================================
// SCHEMA GENERATORS
// ============================================

function generateSchemaGraph(options: {
  product: any;
  blogType: string;
  title: string;
  description: string;
  canonicalUrl: string;
  companyProfile: any;
  faqs: any[];
  domain: string;
  aggregateRatingData?: { ratingValue: string; reviewCount: number; bestRating: number; worstRating: number };
}): object[] {
  const { product, blogType, title, description, canonicalUrl, companyProfile, faqs, domain, aggregateRatingData } = options;
  
  const companyName = companyProfile?.company_name || 'Smart Dent';
  const websiteUrl = companyProfile?.website_url || `https://${domain}`;
  const keywordsArray = Array.isArray(product.keywords) ? product.keywords : [];
  
  const schemas: object[] = [];
  
  // 1. Organization
  const orgSchema: any = {
    "@type": "Organization",
    "name": companyName,
    "url": websiteUrl,
    "logo": companyProfile?.company_logo_url ? {
      "@type": "ImageObject",
      "url": companyProfile.company_logo_url
    } : undefined,
    "contactPoint": companyProfile?.contact_phone ? {
      "@type": "ContactPoint",
      "telephone": companyProfile.contact_phone,
      "contactType": "customer service",
      "availableLanguage": "Portuguese"
    } : undefined,
    // ✅ SEO 10/10: sameAs EXPANDIDO via módulo compartilhado
    "sameAs": expandFounderSameAs(companyProfile || {})
  };
  
  // ✅ SEO 10/10: hasCredential para certificações
  const credentials = generateHasCredential(companyProfile?.certifications);
  if (credentials && credentials.length > 0) {
    orgSchema.hasCredential = credentials;
  }
  
  schemas.push(orgSchema);
  
  // 2. BlogPosting / Article - ✅ MELHORIA 1 & 4: about, mentions, mainEntity
  schemas.push({
    "@type": blogType === 'technical' ? 'TechArticle' : 'BlogPosting',
    "headline": title,
    "description": description,
    "author": {
      "@type": "Organization",
      "name": companyName,
      "url": websiteUrl
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
    // ✅ MELHORIA 4: mainEntity aponta para o Product principal
    "mainEntity": {
      "@type": "Product",
      "name": product.name
    },
    // ✅ MELHORIA 1: about automático
    "about": [
      { "@type": "Thing", "name": product.category || "Odontologia Digital" },
      { "@type": "Thing", "name": companyProfile?.business_sector || "Equipamentos Odontológicos" }
    ],
    // ✅ MELHORIA 1: mentions automático
    "mentions": [
      { "@type": "Product", "name": product.name },
      { "@type": "Organization", "name": companyName, "@id": `${websiteUrl}/#organization` }
    ],
    "image": product.image_url,
    "keywords": keywordsArray.join(', '),
    "articleSection": blogType === 'commercial' ? 'Guia de Produtos' : 'Especificações Técnicas',
    "wordCount": 1500
  });
  
  // 3. Product
  const productSchema: any = {
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.image_url,
    "brand": {
      "@type": "Brand",
      "name": product.brand || companyName
    },
    "sku": product.sku || product.mpn,
    "mpn": product.mpn,
    "gtin13": product.gtin
  };
  
  // Add offers if price exists
  if (product.price) {
    productSchema.offers = {
      "@type": "Offer",
      "priceCurrency": "BRL",
      "price": product.promo_price || product.price,
      "availability": "https://schema.org/InStock",
      "url": product.product_url || canonicalUrl,
      "seller": {
        "@type": "Organization",
        "name": companyName
      }
    };
  }
  
  // Add aggregate rating if exists - ✅ CORREÇÃO: Fallback com 698 reviews
  if (product.rating_value && product.rating_count) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": product.rating_value,
      "reviewCount": product.rating_count,
      "bestRating": "5",
      "worstRating": "1"
    };
  } else if (aggregateRatingData) {
    // ✅ MELHORIA 5: AggregateRating DINÂMICO (não mais hardcoded)
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": aggregateRatingData.ratingValue || "5.0",
      "reviewCount": aggregateRatingData.reviewCount || 0,
      "bestRating": "5",
      "worstRating": "1"
    };
  }
  
  // ✅ SEO 10/10: hasCredential para Product (certificações ANVISA, FDA, ISO)
  const productCredentials = generateHasCredential(product?.certifications);
  if (productCredentials && productCredentials.length > 0) {
    productSchema.hasCredential = productCredentials;
  }
  
  schemas.push(productSchema);
  
  // ✅ SEO 10/10: Service Schemas para serviços de consultoria
  const serviceSchemas = generateServiceSchemas(
    companyProfile?.main_products_services,
    companyProfile,
    { websiteUrl, businessSector: companyProfile?.business_sector }
  );
  if (serviceSchemas.length > 0) {
    schemas.push(...serviceSchemas);
  }
  
  // 4. BreadcrumbList
  schemas.push({
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
        "name": "Blog",
        "item": `${websiteUrl}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.category || 'Produtos',
        "item": `${websiteUrl}/blog/${slugify(product.category || 'produtos')}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": product.name
      }
    ]
  });
  
  // 5. FAQPage
  if (faqs && faqs.length > 0) {
    schemas.push({
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    });
  }
  
  // 6. LocalBusiness
  if (companyProfile?.street_address) {
    const localBusinessData: LocalBusinessData = {
      company_name: companyProfile.company_name,
      legal_name: companyProfile.legal_name,
      company_description: companyProfile.company_description,
      website_url: companyProfile.website_url,
      company_logo_url: companyProfile.company_logo_url,
      contact_phone: companyProfile.contact_phone,
      contact_email: companyProfile.contact_email,
      street_address: companyProfile.street_address,
      address_number: companyProfile.address_number,
      city: companyProfile.city,
      state: companyProfile.state,
      postal_code: companyProfile.postal_code,
      country: companyProfile.country,
      latitude: companyProfile.latitude,
      longitude: companyProfile.longitude,
      opening_hours: companyProfile.opening_hours,
      price_range: companyProfile.price_range
    };
    schemas.push(generateLocalBusinessSchema(localBusinessData));
  }
  
  // 7. HowTo (if workflow_stages)
  if (product.workflow_stages) {
    const howToSchema = generateHowToSchema(product, {
      includeSupplies: true,
      includeTips: true,
      companyName,
      websiteUrl
    });
    if (howToSchema) {
      schemas.push(howToSchema);
    }
  }
  
  // 8. VideoObject (if videos)
  const productVideos = extractProductVideos(product, { maxVideos: 3 });
  if (productVideos.length > 0) {
    const videoSchemas = generateVideoObjectSchemas(productVideos, {
      includeTranscript: false,
      includeAboutProduct: true,
      creatorName: companyName,
      creatorUrl: websiteUrl
    });
    schemas.push(...videoSchemas);
    
    if (productVideos.length > 1) {
      const videoItemList = generateVideoItemListSchema(productVideos, `Vídeos sobre ${product.name}`);
      if (videoItemList) {
        schemas.push(videoItemList);
      }
    }
  }
  
  return schemas.filter(Boolean);
}

// ============================================
// CSS DESIGN SYSTEM V2
// ============================================

const CSS_DESIGN_SYSTEM_V2 = `
/* =========================
   DESIGN SYSTEM V2 (Enterprise SaaS)
   ========================= */
:root {
  /* Brand Colors */
  --primary-navy: #1a365d;
  --primary-dark: #0f2547;
  --accent-orange: #ee7a3e;
  --accent-glow: #ff9b67;

  /* Surfaces */
  --bg-light: #f8fafc;
  --surface-white: #ffffff;
  --surface-elevated: rgba(255,255,255,0.92);

  /* Text */
  --text-primary: #0f172a;
  --text-muted: #64748b;
  --text-inverse: #ffffff;

  /* Borders */
  --border-subtle: #e2e8f0;
  --border-strong: #cbd5e1;

  /* Shadows */
  --shadow-soft: 0 8px 30px rgba(0,0,0,0.08);
  --shadow-elevated: 0 20px 50px rgba(0,0,0,0.12);

  /* Radius */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 22px;

  /* Layout */
  --container-max: 1120px;
  --gutter: 20px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 56px;
  --space-10: 72px;

  /* Typography */
  --font-sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  
  --fs-0: 12px;
  --fs-1: 14px;
  --fs-2: 16px;
  --fs-3: 18px;
  --fs-4: 22px;
  --fs-5: 28px;
  --fs-6: 36px;

  --lh-tight: 1.2;
  --lh-snug: 1.35;
  --lh-body: 1.65;

  /* Motion */
  --dur-1: 120ms;
  --dur-2: 180ms;
  --dur-3: 240ms;
  --ease-1: cubic-bezier(.2,.8,.2,1);

  /* Focus */
  --focus-ring: 0 0 0 3px rgba(238, 122, 62, 0.35);

  /* Content */
  --content-max: 74ch;
}

/* Dark Mode */
html[data-theme="dark"] {
  --bg-light: #0b1220;
  --surface-white: #0f1a2e;
  --surface-elevated: rgba(15, 26, 46, 0.92);
  --text-primary: #e5e7eb;
  --text-muted: #a3aab8;
  --border-subtle: #22304a;
  --border-strong: #2c3d5d;
  --shadow-soft: 0 10px 34px rgba(0,0,0,0.35);
  --shadow-elevated: 0 28px 70px rgba(0,0,0,0.45);
}

/* Base */
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: radial-gradient(1000px 600px at 15% 0%, rgba(26,54,93,0.10), transparent 50%),
              radial-gradient(900px 500px at 90% 20%, rgba(238,122,62,0.10), transparent 50%),
              var(--bg-light);
  line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; display: block; }

.container {
  width: 100%;
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--gutter);
}

/* Skip Link */
.skip-link {
  position: absolute;
  left: -9999px;
  top: 10px;
  background: var(--surface-white);
  border: 1px solid var(--border-subtle);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  z-index: 9999;
}
.skip-link:focus { left: 10px; outline: none; box-shadow: var(--focus-ring), var(--shadow-soft); }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: var(--fs-0);
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(10px);
}
html[data-theme="dark"] .badge { background: rgba(15, 26, 46, 0.75); }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-white);
  font-size: var(--fs-1);
}

/* Cards */
.card {
  background: var(--surface-white);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}
.card-pad { padding: var(--space-6); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 44px;
  padding: 0 var(--space-5);
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 650;
  font-size: var(--fs-2);
  cursor: pointer;
  transition: transform var(--dur-2) var(--ease-1), box-shadow var(--dur-2) var(--ease-1);
  user-select: none;
  text-decoration: none;
}
.btn:focus-visible { outline: none; box-shadow: var(--focus-ring); }

.btn-primary {
  color: var(--text-inverse);
  background: linear-gradient(135deg, var(--primary-navy), var(--primary-dark));
  box-shadow: 0 12px 30px rgba(26,54,93,0.22);
}
.btn-primary:hover { transform: translateY(-1px); text-decoration: none; }

.btn-accent {
  color: var(--text-inverse);
  background: linear-gradient(135deg, var(--accent-orange), var(--accent-glow));
  box-shadow: 0 12px 30px rgba(238,122,62,0.35);
}
.btn-accent:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(238,122,62,0.45); text-decoration: none; }

.btn-outline {
  color: var(--primary-navy);
  background: var(--surface-white);
  border-color: var(--border-strong);
}
.btn-outline:hover { transform: translateY(-1px); text-decoration: none; }
html[data-theme="dark"] .btn-outline { color: var(--text-primary); }

.muted { color: var(--text-muted); }

/* Sections */
.section { padding: var(--space-10) 0; }
.section.compact { padding: var(--space-8) 0; }

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-6);
  margin-bottom: var(--space-6);
}
.section-title {
  font-size: var(--fs-5);
  line-height: var(--lh-tight);
  margin: 0;
  letter-spacing: -0.02em;
}
.section-subtitle {
  margin: var(--space-2) 0 0;
  max-width: 70ch;
  color: var(--text-muted);
  font-size: var(--fs-2);
}

/* Header */
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
  background: rgba(248, 250, 252, 0.75);
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
}
html[data-theme="dark"] .site-header {
  background: rgba(11, 18, 32, 0.75);
  border-bottom-color: rgba(34, 48, 74, 0.8);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  padding: var(--space-4) 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.brand-logo {
  height: 40px;
  width: auto;
  border-radius: 10px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.nav a {
  font-size: var(--fs-1);
  color: var(--text-muted);
  padding: 8px 10px;
  border-radius: 10px;
}
.nav a:hover {
  color: var(--text-primary);
  background: rgba(226,232,240,0.6);
  text-decoration: none;
}
html[data-theme="dark"] .nav a:hover { background: rgba(34,48,74,0.6); }

/* Theme Toggle */
.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  color: var(--text-muted);
  transition: all var(--dur-2) var(--ease-1);
}
.theme-toggle:hover { background: rgba(226,232,240,0.6); color: var(--text-primary); }
html[data-theme="dark"] .theme-toggle:hover { background: rgba(34,48,74,0.6); }

/* Breadcrumbs */
.breadcrumbs { padding: var(--space-5) 0 0; }
.breadcrumbs ol {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
  color: var(--text-muted);
  font-size: var(--fs-1);
}
.breadcrumbs li { display: inline-flex; align-items: center; gap: 8px; }
.breadcrumbs li::after { content: "›"; opacity: 0.6; }
.breadcrumbs li:last-child::after { content: ""; }
.breadcrumbs a { color: inherit; }
.breadcrumbs a:hover { color: var(--text-primary); }

/* Hero */
.hero-section { padding: var(--space-7) 0 var(--space-6); }
.hero-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: var(--space-7);
  align-items: start;
}

.hero-media {
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  background: var(--surface-white);
  box-shadow: var(--shadow-soft);
}
.hero-media .main-media {
  aspect-ratio: 4 / 3;
  background: #0b1220;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.hero-media .main-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbs {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  overflow-x: auto;
  border-top: 1px solid var(--border-subtle);
  scroll-snap-type: x mandatory;
}
.thumb {
  flex: 0 0 auto;
  width: 92px;
  height: 64px;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid var(--border-subtle);
  scroll-snap-align: start;
  background: rgba(226,232,240,0.6);
  cursor: pointer;
  transition: all var(--dur-2) var(--ease-1);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb:hover, .thumb.active { border-color: var(--accent-orange); }

.hero-info h1 {
  font-size: clamp(28px, 3.2vw, 40px);
  line-height: var(--lh-tight);
  margin: var(--space-3) 0 var(--space-3);
  letter-spacing: -0.03em;
}
.hero-info .lead {
  color: var(--text-muted);
  font-size: var(--fs-3);
  margin-bottom: var(--space-5);
}

.hero-kpis {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin: var(--space-4) 0 var(--space-5);
}

.feature-list {
  display: grid;
  gap: 10px;
  margin: var(--space-4) 0 var(--space-6);
  padding: 0;
  list-style: none;
}
.feature-list li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: var(--fs-2);
}
.check {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(238, 122, 62, 0.16);
  display: grid;
  place-items: center;
  border: 1px solid rgba(238, 122, 62, 0.35);
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--accent-orange);
}

.cta-row {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
}

/* Trust Bar */
.trust-bar {
  margin-top: var(--space-6);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}
.trust-metric {
  background: var(--surface-white);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-soft);
  min-height: 92px;
  display: grid;
  gap: 6px;
  align-content: center;
  text-align: center;
}
.trust-metric .value {
  font-size: var(--fs-4);
  font-weight: 850;
  letter-spacing: -0.02em;
  color: var(--accent-orange);
}
.trust-metric .label {
  font-size: var(--fs-1);
  color: var(--text-muted);
}

/* E-E-A-T Cards */
.eeat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
}
.eeat-item {
  background: var(--surface-white);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-soft);
  transition: all var(--dur-3) var(--ease-1);
}
.eeat-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-elevated);
}
.eeat-item h3 {
  margin: 0 0 8px;
  font-size: var(--fs-3);
  line-height: var(--lh-snug);
}
.eeat-item p {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--fs-2);
}
.eeat-icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  margin-bottom: var(--space-4);
  border: 1px solid var(--border-subtle);
  background: linear-gradient(135deg, rgba(26,54,93,0.10), rgba(238,122,62,0.10));
  color: var(--accent-orange);
  font-size: var(--fs-3);
}

/* Blog Content */
.article-wrap {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  align-items: start;
}
.blog-content {
  max-width: var(--content-max);
  margin: 0 auto;
}
.blog-content h2 {
  margin: var(--space-8) 0 var(--space-3);
  font-size: var(--fs-4);
  line-height: var(--lh-snug);
  letter-spacing: -0.015em;
}
.blog-content h3 {
  margin: var(--space-7) 0 var(--space-3);
  font-size: 20px;
  line-height: var(--lh-snug);
}
.blog-content p {
  margin: var(--space-3) 0;
  font-size: var(--fs-2);
}
.blog-content ul, .blog-content ol {
  margin: var(--space-3) 0 var(--space-3) var(--space-6);
  color: var(--text-primary);
}
.blog-content strong { color: var(--primary-navy); }
html[data-theme="dark"] .blog-content strong { color: var(--accent-orange); }

.callout {
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-subtle);
  background: linear-gradient(135deg, rgba(238,122,62,0.10), rgba(26,54,93,0.08));
  padding: var(--space-6);
  box-shadow: var(--shadow-soft);
  margin: var(--space-7) 0;
}
.callout strong { display: block; margin-bottom: 6px; }

/* Specs */
.specs-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: var(--space-6);
  align-items: start;
}
.table-wrap { overflow: auto; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); }
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 520px;
  background: var(--surface-white);
}
th, td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
  vertical-align: top;
  font-size: var(--fs-2);
}
th {
  background: rgba(226,232,240,0.55);
  font-size: var(--fs-1);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
html[data-theme="dark"] th { background: rgba(34,48,74,0.55); }

.downloads .dl-item {
  display: flex;
  gap: 12px;
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  background: var(--surface-white);
  box-shadow: var(--shadow-soft);
  margin-bottom: var(--space-4);
  transition: all var(--dur-2) var(--ease-1);
}
.downloads .dl-item:hover {
  border-color: var(--accent-orange);
  box-shadow: var(--shadow-elevated);
}
.dl-badge {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(26,54,93,0.10);
  border: 1px solid var(--border-subtle);
  flex: 0 0 auto;
  color: var(--primary-navy);
}
html[data-theme="dark"] .dl-badge { color: var(--accent-orange); }
.dl-item a { text-decoration: underline; }
.dl-title { margin: 0; font-weight: 750; }
.dl-meta { margin: 2px 0 0; color: var(--text-muted); font-size: var(--fs-1); }

/* FAQ */
.faq-list {
  display: grid;
  gap: var(--space-4);
  max-width: 980px;
  margin: 0 auto;
}
details.faq-item {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  background: var(--surface-white);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}
summary {
  list-style: none;
  cursor: pointer;
  padding: var(--space-5) var(--space-6);
  font-weight: 750;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  font-size: var(--fs-2);
}
summary:focus-visible { outline: none; box-shadow: var(--focus-ring); }
summary::-webkit-details-marker { display: none; }

.chev {
  width: 18px;
  height: 18px;
  transition: transform var(--dur-2) var(--ease-1);
  flex: 0 0 auto;
  opacity: 0.8;
}
details[open] .chev { transform: rotate(180deg); }

.faq-answer {
  padding: 0 var(--space-6) var(--space-6);
  color: var(--text-muted);
  font-size: var(--fs-2);
}

/* Videos */
.videos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
}
.video-card .thumb16x9 {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-bottom: 1px solid var(--border-subtle);
  background: #0b1220;
  position: relative;
}
.video-card .thumb16x9 img { width: 100%; height: 100%; object-fit: cover; opacity: 0.92; }
.play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.play-btn {
  width: 58px; height: 58px;
  border-radius: 999px;
  background: rgba(255,255,255,0.92);
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-soft);
  border: 1px solid rgba(226,232,240,0.9);
  color: var(--primary-navy);
}

.video-body { padding: var(--space-5); }
.video-title { margin: 0 0 6px; font-size: var(--fs-3); line-height: var(--lh-snug); }
.video-meta { margin: 0; color: var(--text-muted); font-size: var(--fs-1); }

/* CTA Section */
.cta-section .card {
  background: linear-gradient(135deg, rgba(26,54,93,0.92), rgba(15,37,71,0.92));
  color: var(--text-inverse);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: var(--shadow-elevated);
}
.cta-inner {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: var(--space-6);
  align-items: center;
}
.cta-inner h2 { margin: 0 0 10px; font-size: var(--fs-5); line-height: var(--lh-tight); color: var(--text-inverse); }
.cta-inner p { margin: 0; opacity: 0.88; font-size: var(--fs-2); }
.cta-actions { display: flex; gap: var(--space-3); justify-content: flex-end; flex-wrap: wrap; }

/* Footer */
.site-footer {
  padding: var(--space-10) 0;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
}
.footer-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1fr;
  gap: var(--space-6);
}
.footer-title { margin: 0 0 10px; color: var(--text-primary); font-weight: 800; }
.footer-grid a { color: inherit; text-decoration: underline; }
.footer-bottom {
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-subtle);
  text-align: center;
  font-size: var(--fs-1);
}

/* Performance */
.content-visibility {
  content-visibility: auto;
  contain-intrinsic-size: 1000px;
}

/* Responsive */
@media (max-width: 968px) {
  .hero-grid { grid-template-columns: 1fr; }
  .specs-grid { grid-template-columns: 1fr; }
  .eeat-cards { grid-template-columns: 1fr; }
  .videos-grid { grid-template-columns: 1fr; }
  .cta-inner { grid-template-columns: 1fr; }
  .cta-actions { justify-content: flex-start; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .section-title { font-size: 26px; }
}

@media (max-width: 640px) {
  :root { --gutter: 16px; }
  .header-inner { flex-direction: column; align-items: flex-start; gap: var(--space-4); }
  .nav { justify-content: flex-start; }
  .btn { width: 100%; }
  .cta-row { width: 100%; }
  .trust-bar { grid-template-columns: repeat(2, 1fr); }
  .thumb { width: 88px; height: 62px; }
  .footer-grid { grid-template-columns: 1fr; }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  * { scroll-behavior: auto !important; }
  .btn, .chev, .eeat-item, .dl-item { transition: none !important; }
}

/* Print */
@media print {
  .site-header, .site-footer, .cta-section, .theme-toggle { display: none; }
  body { background: white; }
}
`;

// ============================================
// MAIN HTML GENERATOR
// ============================================

export function generateProductBlogHTMLV2(options: ProductBlogV2Options): string {
  const { 
    product, 
    blogType, 
    content, 
    faqs, 
    domain, 
    pagePath, 
    companyProfile, 
    trackingPixels,
    darkModeDefault = false,
    aggregateRatingData
  } = options;
  
  const companyName = companyProfile?.company_name || 'Smart Dent';
  const canonicalUrl = `https://${domain}${pagePath}`;
  const websiteUrl = companyProfile?.website_url || `https://${domain}`;
  
  const title = blogType === 'commercial' 
    ? `${product.name} - Guia Completo | ${companyName}`
    : `${product.name} - Especificações Técnicas | ${companyName}`;
  
  const description = product.seo_description_override || 
    `Conheça tudo sobre ${product.name}. ${blogType === 'commercial' ? 'Benefícios, aplicações e como usar.' : 'Especificações técnicas detalhadas e informações profissionais.'}`;
  
  const rawKeywordsArray = Array.isArray(product.keywords) ? product.keywords : [];
  const keywordsArray = deduplicateKeywords(rawKeywordsArray, 20);
  const keywords = keywordsArray.length > 0 ? keywordsArray.join(', ') : product.name;

  // Extract data
  const features = extractProductFeatures(product);
  const trustMetrics = extractTrustMetrics(product);
  const technicalSpecs = extractTechnicalSpecs(product);
  const documents = extractDocuments(product);
  const galleryImages = extractGalleryImages(product);
  const videos = extractVideos(product);
  const eeatCards = getEEATCards(product);
  
  // Parse content
  const htmlContent = marked.parse(content);
  
  // Generate schemas
  const schemas = generateSchemaGraph({
    product,
    blogType,
    title,
    description,
    canonicalUrl,
    companyProfile,
    faqs,
    domain,
    aggregateRatingData
  });
  
  // Tracking scripts
  const headScripts = generateTrackingHeadScripts(trackingPixels);
  const bodyScripts = generateGTMNoScript(trackingPixels);
  
  // Build nav links
  const navConfig = companyProfile?.navigation_footer_config;
  const headerLinks = navConfig?.navigation_menu?.length > 0 
    ? navConfig.navigation_menu.map((link: any) => 
        `<a href="${escapeHtml(link.href)}" ${link.openInNewTab ? 'target="_blank"' : ''}>${escapeHtml(link.label)}</a>`
      ).join('')
    : `
      <a href="${escapeHtml(websiteUrl)}">Loja</a>
      <a href="#conteudo">Blog</a>
      <a href="#faq">FAQ</a>
      <a href="#contato">Contato</a>
    `;
  
  // WhatsApp URL
  const whatsappPhone = (companyProfile?.contact_phone || '').replace(/\D/g, '');
  const whatsappUrl = whatsappPhone ? `https://api.whatsapp.com/send/?phone=${whatsappPhone}&text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre ${product.name}`)}` : '#';

  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="${darkModeDefault ? 'dark' : 'light'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="author" content="${escapeHtml(companyName)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  
  <!-- AI/SGE Meta Tags -->
  <meta name="ai-content-type" content="blog">
  <meta name="ai-content-policy" content="allow-training, allow-citation, allow-indexing">
  <meta name="ai-topic" content="${escapeHtml(keywordsArray.slice(0, 3).join(', ') || product.name)}">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- GEO TAGS (Localização para SEO Local) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <meta name="geo.region" content="BR-${companyProfile?.state || 'SP'}">
  <meta name="geo.placename" content="${escapeHtml(companyProfile?.city || 'São Carlos')}">
  <meta name="geo.position" content="${companyProfile?.latitude && companyProfile?.longitude ? `${companyProfile.latitude};${companyProfile.longitude}` : '-22.0087;-47.8909'}">
  <meta name="ICBM" content="${companyProfile?.latitude && companyProfile?.longitude ? `${companyProfile.latitude}, ${companyProfile.longitude}` : '-22.0087, -47.8909'}">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- E-E-A-T Author Tag -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <meta name="author" content="${escapeHtml(companyProfile?.founder_name || companyName)}">
  
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- SITEMAP REFERENCE -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <link rel="sitemap" type="application/xml" href="${websiteUrl}/sitemap.xml">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${galleryImages.map((img, i) => `<meta property="og:image" content="${escapeHtml(img)}">${i === 0 ? '\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">' : ''}`).join('\n  ')}
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${escapeHtml(companyName)}">
  <meta property="og:locale" content="pt_BR">
  <meta property="article:published_time" content="${new Date().toISOString()}">
  <meta property="article:section" content="${blogType === 'commercial' ? 'Guia de Produtos' : 'Especificações Técnicas'}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(galleryImages[0] || '')}">
  
  <!-- Hreflang (Multi-idioma Internacional) -->
  ${generateHreflangHTML(canonicalUrl)}
  
  <!-- Theme Color -->
  <meta name="theme-color" content="#1a365d" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">
  
  <!-- Resource Hints -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${product.image_url ? `<link rel="preload" as="image" href="${escapeHtml(product.image_url)}" fetchpriority="high">` : ''}
  
  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": enrichGraphWithAIReadiness(schemas.map(s => { const { "@context": _ctx, ...rest } = s as Record<string, any>; return rest; })) }, null, 2)}
  </script>
  
  ${headScripts}
  
  <style>${CSS_DESIGN_SYSTEM_V2}</style>
</head>
<body>
  ${bodyScripts}
  
  <a href="#conteudo" class="skip-link">Pular para o conteúdo</a>
  
  <!-- Header -->
  <header class="site-header">
    <div class="container">
      <div class="header-inner">
        <a href="${escapeHtml(websiteUrl)}" class="brand">
          ${companyProfile?.company_logo_url 
            ? `<img src="${escapeHtml(companyProfile.company_logo_url)}" alt="${escapeHtml(companyName)}" class="brand-logo">`
            : `<span>${escapeHtml(companyName)}</span>`
          }
        </a>
        <nav class="nav" aria-label="Menu principal">
          ${headerLinks}
          <button class="theme-toggle" onclick="toggleTheme()" aria-label="Alternar tema">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </button>
        </nav>
      </div>
    </div>
  </header>
  
  <main>
    <!-- Breadcrumbs -->
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <div class="container">
        <ol itemscope itemtype="https://schema.org/BreadcrumbList">
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a itemprop="item" href="${escapeHtml(websiteUrl)}"><span itemprop="name">Home</span></a>
            <meta itemprop="position" content="1">
          </li>
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a itemprop="item" href="${escapeHtml(websiteUrl)}/blog"><span itemprop="name">Blog</span></a>
            <meta itemprop="position" content="2">
          </li>
          ${product.category ? `
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a itemprop="item" href="${escapeHtml(websiteUrl)}/blog/${slugify(product.category)}"><span itemprop="name">${escapeHtml(product.category)}</span></a>
            <meta itemprop="position" content="3">
          </li>
          ` : ''}
          <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <span itemprop="name">${escapeHtml(product.name)}</span>
            <meta itemprop="position" content="${product.category ? '4' : '3'}">
          </li>
        </ol>
      </div>
    </nav>
    
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container">
        <div class="hero-grid">
          <div class="hero-media">
            <div class="main-media">
              <img src="${escapeHtml(galleryImages[0] || '')}" alt="${escapeHtml(product.name)}" id="main-image" loading="eager" fetchpriority="high">
            </div>
            ${galleryImages.length > 1 ? `
            <div class="thumbs" role="listbox" aria-label="Galeria de imagens">
              ${galleryImages.map((img, i) => `
                <button class="thumb ${i === 0 ? 'active' : ''}" onclick="changeImage('${escapeHtml(img)}', this)" role="option" aria-selected="${i === 0}">
                  <img src="${escapeHtml(img)}" alt="Imagem ${i + 1} de ${product.name}" loading="lazy" decoding="async">
                </button>
              `).join('')}
            </div>
            ` : ''}
          </div>
          
          <div class="hero-info">
            <div class="hero-kpis">
              ${product.category ? `<span class="badge">${escapeHtml(product.category)}</span>` : ''}
              ${product.brand ? `<span class="badge">${escapeHtml(product.brand)}</span>` : ''}
            </div>
            
            <h1>${escapeHtml(product.name)}</h1>
            
            <p class="lead">${escapeHtml(description.substring(0, 200))}${description.length > 200 ? '...' : ''}</p>
            
            ${features.length > 0 ? `
            <ul class="feature-list">
              ${features.map(f => `
                <li>
                  <span class="check">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                  ${escapeHtml(f)}
                </li>
              `).join('')}
            </ul>
            ` : ''}
            
            <div class="cta-row">
              <a href="${escapeHtml(whatsappUrl)}" class="btn btn-accent" target="_blank" rel="noopener">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Falar com Especialista
              </a>
              ${product.product_url ? `
              <a href="${escapeHtml(product.product_url)}" class="btn btn-outline" target="_blank" rel="noopener">
                Ver na Loja
              </a>
              ` : ''}
            </div>
          </div>
        </div>
        
        ${trustMetrics.length > 0 ? `
        <div class="trust-bar">
          ${trustMetrics.map(m => `
            <div class="trust-metric">
              <span class="value">${escapeHtml(m.value)}</span>
              <span class="label">${escapeHtml(m.label)}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    </section>
    
    ${eeatCards.length > 0 ? `
    <!-- E-E-A-T Section -->
    <section class="section compact content-visibility" id="beneficios">
      <div class="container">
        <div class="section-head" style="flex-direction: column; align-items: center; text-align: center;">
          <h2 class="section-title">Por que escolher ${escapeHtml(product.name)}?</h2>
          <p class="section-subtitle">Benefícios reais baseados em dados do produto</p>
        </div>
        <div class="eeat-cards">
          ${eeatCards.map(card => `
            <article class="eeat-item card-pad">
              <div class="eeat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.description)}</p>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
    ` : ''}
    
    <!-- Blog Content -->
    <section class="section content-visibility" id="conteudo">
      <div class="container">
        <div class="article-wrap">
          <article class="blog-content" itemscope itemtype="https://schema.org/${blogType === 'technical' ? 'TechArticle' : 'BlogPosting'}">
            <meta itemprop="headline" content="${escapeHtml(title)}">
            <meta itemprop="author" content="${escapeHtml(companyName)}">
            <div itemprop="articleBody">
              ${htmlContent}
            </div>
          </article>
        </div>
      </div>
    </section>
    
    ${technicalSpecs.length > 0 ? `
    <!-- Technical Specs -->
    <section class="section compact content-visibility" id="especificacoes" style="background: var(--bg-light);">
      <div class="container">
        <div class="section-head" style="flex-direction: column; align-items: center; text-align: center;">
          <h2 class="section-title">Especificações Técnicas</h2>
          <p class="section-subtitle">Dados técnicos verificados do produto</p>
        </div>
        <div class="specs-grid">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Especificação</th>
                  <th>Valor</th>
                </tr>
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
          ${documents.length > 0 ? `
          <div class="downloads">
            <h3 style="margin-bottom: var(--space-4);">Downloads</h3>
            ${documents.map(doc => `
              <div class="dl-item">
                <div class="dl-badge">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div>
                  <p class="dl-title">${escapeHtml(doc.name)}</p>
                  <p class="dl-meta">${escapeHtml(doc.type || 'PDF')}</p>
                </div>
                <a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener" aria-label="Baixar ${escapeHtml(doc.name)}">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
              </div>
            `).join('')}
          </div>
          ` : ''}
        </div>
      </div>
    </section>
    ` : ''}
    
    ${faqs && faqs.length > 0 ? `
    <!-- FAQ Section -->
    <section class="section content-visibility" id="faq" itemscope itemtype="https://schema.org/FAQPage">
      <div class="container">
        <div class="section-head" style="flex-direction: column; align-items: center; text-align: center;">
          <h2 class="section-title">Perguntas Frequentes</h2>
          <p class="section-subtitle">Tire suas dúvidas sobre ${escapeHtml(product.name)}</p>
        </div>
        <div class="faq-list">
          ${faqs.map((faq, i) => `
            <details class="faq-item" ${i === 0 ? 'open' : ''} itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
              <summary itemprop="name">
                ${escapeHtml(faq.question)}
                <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </summary>
              <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <p itemprop="text">${escapeHtml(faq.answer)}</p>
              </div>
            </details>
          `).join('')}
        </div>
      </div>
    </section>
    ` : ''}
    
    ${videos.length > 0 ? `
    <!-- Videos Section -->
    <section class="section compact content-visibility" id="videos" style="background: var(--bg-light);">
      <div class="container">
        <div class="section-head" style="flex-direction: column; align-items: center; text-align: center;">
          <h2 class="section-title">Vídeos</h2>
          <p class="section-subtitle">Conheça melhor o produto em vídeo</p>
        </div>
        <div class="videos-grid">
          ${videos.map(video => `
            <article class="video-card card">
              <div class="thumb16x9">
                <img src="${escapeHtml(video.thumbnail || `https://img.youtube.com/vi/${video.url.includes('youtube') ? video.url.split('v=')[1]?.split('&')[0] || '' : ''}/maxresdefault.jpg`)}" alt="${escapeHtml(video.title)}" loading="lazy" decoding="async">
                <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener" class="play" aria-label="Assistir ${escapeHtml(video.title)}">
                  <span class="play-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </span>
                </a>
              </div>
              <div class="video-body">
                <h3 class="video-title">${escapeHtml(video.title)}</h3>
                ${video.duration ? `<p class="video-meta">Duração: ${escapeHtml(video.duration)}</p>` : ''}
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
    ` : ''}
    
    <!-- CTA Section -->
    <section class="section cta-section" id="contato">
      <div class="container">
        <div class="card card-pad">
          <div class="cta-inner">
            <div>
              <h2>Quer saber mais sobre ${escapeHtml(product.name)}?</h2>
              <p>Entre em contato com nossa equipe de especialistas para tirar dúvidas e receber uma proposta personalizada.</p>
            </div>
            <div class="cta-actions">
              <a href="${escapeHtml(whatsappUrl)}" class="btn btn-accent" target="_blank" rel="noopener">
                Falar no WhatsApp
              </a>
              ${product.product_url ? `
              <a href="${escapeHtml(product.product_url)}" class="btn btn-outline" style="background: transparent; border-color: rgba(255,255,255,0.3); color: white;" target="_blank" rel="noopener">
                Ver Produto
              </a>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
  
  <!-- Footer -->
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4 class="footer-title">${escapeHtml(companyName)}</h4>
          ${companyProfile?.contact_phone ? `<p>📞 ${escapeHtml(companyProfile.contact_phone)}</p>` : ''}
          ${companyProfile?.contact_email ? `<p>✉️ ${escapeHtml(companyProfile.contact_email)}</p>` : ''}
          ${companyProfile?.street_address ? `<p>📍 ${escapeHtml(companyProfile.street_address)}${companyProfile.address_number ? `, ${companyProfile.address_number}` : ''}</p>` : ''}
          ${companyProfile?.city ? `<p>${escapeHtml(companyProfile.city)}${companyProfile.state ? ` - ${companyProfile.state}` : ''}</p>` : ''}
        </div>
        <div>
          <h4 class="footer-title">Links</h4>
          <p><a href="${escapeHtml(websiteUrl)}">Home</a></p>
          <p><a href="${escapeHtml(websiteUrl)}/blog">Blog</a></p>
          <p><a href="#faq">FAQ</a></p>
          <p><a href="#contato">Contato</a></p>
        </div>
        <div>
          <h4 class="footer-title">Produto</h4>
          <p><a href="#conteudo">Sobre o Produto</a></p>
          ${technicalSpecs.length > 0 ? `<p><a href="#especificacoes">Especificações</a></p>` : ''}
          ${videos.length > 0 ? `<p><a href="#videos">Vídeos</a></p>` : ''}
        </div>
        <div>
          <h4 class="footer-title">Redes Sociais</h4>
          ${companyProfile?.instagram_profile ? `<p><a href="${escapeHtml(companyProfile.instagram_profile)}" target="_blank" rel="noopener">Instagram</a></p>` : ''}
          ${companyProfile?.youtube_channel ? `<p><a href="${escapeHtml(companyProfile.youtube_channel)}" target="_blank" rel="noopener">YouTube</a></p>` : ''}
          ${companyProfile?.founder_linkedin ? `<p><a href="${escapeHtml(companyProfile.founder_linkedin)}" target="_blank" rel="noopener">LinkedIn</a></p>` : ''}
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${escapeHtml(companyName)}. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
  
  <script>
    // Theme Toggle
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    }
    
    // Auto-detect theme preference
    (function() {
      const saved = localStorage.getItem('theme');
      if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
    
    // Gallery Image Switcher
    function changeImage(src, thumb) {
      const mainImage = document.getElementById('main-image');
      if (mainImage) {
        mainImage.src = src;
      }
      document.querySelectorAll('.thumb').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      if (thumb) {
        thumb.classList.add('active');
        thumb.setAttribute('aria-selected', 'true');
      }
    }
    
    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href && href !== '#') {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
  </script>
</body>
</html>`;
}

console.log('✅ [HTML V2] product-blog-html-v2.ts carregado');
