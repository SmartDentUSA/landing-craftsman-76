import { useCallback, useState, useEffect } from 'react';
import { useAdvancedSchemaGenerator } from './useAdvancedSchemaGenerator';
import { processContentWithAdvancedIntelligentLinks } from '@/lib/intelligent-links-advanced';
import { useLinksRepository } from './useLinksRepository';
import { isSEOContextEnabled, logSEODebug } from '@/config/feature-flags';
import { buildStrategicBlogInput } from '@/services/strategicBlogInput';
import { stripInternalLabels } from '@/lib/sanitize-internal-labels';
import { getDomainConfig } from '@/config/domain-config';
import { getCompanyProfileForSEO, buildSEOMetaFromCompany } from '@/lib/company-profile-helper';
import { generateSchemaFromCompanyProfile } from '@/lib/schema-reviews';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedReview } from '@/types/reviews';
import { getTrackingConfig, injectTrackingPixels, injectGTMNoScript, generateSEODomainTags, generateSchemaSameAs, generateFooterLinks, generateSEODomainsFooter, type TrackingConfig } from '@/lib/tracking-injector';
import { generateBlogHTML } from '@/services/seo/blogHTMLGenerator';
import { buildIntelligentLinksMap, applyIntelligentLinks } from '@/services/seo/intelligentLinksProcessor';
import { generateSchema } from '@/services/seo/schemaGenerator';
import { buildMetaTags } from '@/services/seo/metaTagsBuilder';
import { generateSmoothScrollScript } from '@/services/seo/criticalCSS';
import { generateTableOfContents, addIdsToHeadings } from '@/services/seo/blogHTMLHelpers';
import { applyAutoLinksOncePerTerm } from '@/lib/auto-link';
// ✅ FASE 2: Importar função de parcerias
import { generatePartnershipsSchema } from '@/lib/company-profile-helper';

// Helper para truncar títulos SEO (≤60 caracteres)
const truncateSEOTitle = (title: string, maxLength = 60): string => {
  if (title.length <= maxLength) return title;
  
  // Truncar no último espaço antes do limite
  const truncated = title.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
};

// Função para converter markdown inline para HTML (para títulos e textos inline)
const convertInlineMarkdownToHTML = (content: string): string => {
  if (!content) return '';
  
  let processedContent = content;
  
  // Links markdown [texto](url "título") - com melhor handling
  processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+?)\s+"([^"]*)"\)/g, '<a href="$2" title="$3">$1</a>');
  processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Bold **texto**
  processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic *texto*
  processedContent = processedContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return processedContent.trim();
};

/**
 * Remove links markdown aninhados ANTES da conversão para HTML
 */
const cleanNestedMarkdown = (md: string): string => {
  return md
    .replace(/\[\[([^\]]+)\]\]\(([^)]+)\)/g, '[$1]($2)') // [[text]](url) → [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\s+"[^"]*"\)\]\(([^)]+)\)/g, '[$1]($2)'); // [text](url "title")](url2) → [text](url)
};

/**
 * Remove links HTML aninhados APÓS a conversão
 */
const removeNestedLinks = (html: string): string => {
  // Remove <a> tags aninhados dentro de outros <a> tags
  let cleaned = html;
  let previousCleaned = '';
  
  // Loop até não haver mais links aninhados
  while (cleaned !== previousCleaned) {
    previousCleaned = cleaned;
    // Remove <a> interno, mantendo apenas o texto
    cleaned = cleaned.replace(/<a([^>]*)>([^<]*)<a[^>]*>([^<]*)<\/a>([^<]*)<\/a>/gi, '<a$1>$2$3$4</a>');
  }
  
  return cleaned;
};

/**
 * Sanitiza atributos HTML para evitar aspas duplicadas
 */
const sanitizeHTMLAttributes = (text: string): string => {
  return text
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// Função para sanitizar conteúdo do blog antes da conversão HTML
const sanitizeBlogContent = (content: string): string => {
  if (!content) return '';
  
  let sanitized = content;
  
  // Remove primeiro H1 (título principal que gera duplicação)
  sanitized = sanitized.replace(/^# .+\n+/m, '');
  
  // Remove seções com "Análise Técnica"
  sanitized = sanitized.replace(/^#+\s*.*Análise Técnica( Completa)?[^\n]*$/gmi, '');
  
  // Substitui "Introdução Técnica" por apenas "Introdução"
  sanitized = sanitized.replace(/^##\s*Introdução Técnica(?::)?/gmi, '## Introdução');
  
  // Remove linhas vazias excessivas
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  return sanitized.trim();
};

/**
 * Gera ícones SVG inline para redes sociais com cores de marca
 */
const getSocialIconSVG = (platform: string): string => {
  const icons = {
    instagram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    youtube: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>`,
    lattes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
    website: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>`
  };
  return icons[platform as keyof typeof icons] || '';
};

/**
 * Retorna cor de fundo da marca para cada rede social
 */
const getSocialBrandColor = (platform: string): string => {
  const colors = {
    instagram: 'background: linear-gradient(135deg, #feda75 0%, #d62976 25%, #962fbf 50%, #4f5bd5 100%)',
    youtube: 'background: #FF0000',
    lattes: 'background: #1877F2',
    website: 'background: #000000'
  };
  return colors[platform as keyof typeof colors] || 'background: #000000';
};

// Função para extrair título do markdown (com filtro de termos banidos)
const extractTitleFromMarkdown = (content: string): string => {
  if (!content) return '';
  
  const bannedTerms = ['análise técnica', 'introdução técnica', 'informativo técnico', 'informativo comercial'];
  const lines = content.split('\n');
  
  // Procurar por H1 válido
  for (const line of lines) {
    const h1Match = line.match(/^# (.+)$/);
    if (h1Match) {
      const title = h1Match[1].trim();
      const isBanned = bannedTerms.some(term => 
        title.toLowerCase().includes(term)
      );
      if (!isBanned) {
        return title;
      }
    }
  }
  
  // Procurar por H2 válido se H1 não encontrado ou é banido
  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      const title = h2Match[1].trim();
      const isBanned = bannedTerms.some(term => 
        title.toLowerCase().includes(term)
      );
      if (!isBanned) {
        return title;
      }
    }
  }
  
  return 'Especificações do Produto';
};

// Função para converter markdown para HTML completo
const convertMarkdownToHTML = (content: string): string => {
  if (!content) return '';

  // Sanitizar conteúdo antes da conversão e limpar markdown aninhado
  const sanitizedContent = cleanNestedMarkdown(sanitizeBlogContent(content));
  
  // Processar conteúdo linha por linha para manter estrutura
  const lines = sanitizedContent.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  const processLine = (line: string): string => {
    // Headers (processo com ordem correta para evitar conflitos)
    if (line.match(/^#### /)) {
      return `<h4>${convertInlineMarkdownToHTML(line.replace(/^#### /, '').trim())}</h4>`;
    }
    if (line.match(/^### /)) {
      return `<h3>${convertInlineMarkdownToHTML(line.replace(/^### /, '').trim())}</h3>`;
    }
    if (line.match(/^## /)) {
      return `<h2>${convertInlineMarkdownToHTML(line.replace(/^## /, '').trim())}</h2>`;
    }
    if (line.match(/^# /)) {
      return `<h1>${convertInlineMarkdownToHTML(line.replace(/^# /, '').trim())}</h1>`;
    }

    // Aplicar conversão inline para texto normal
    return convertInlineMarkdownToHTML(line);
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Lista com -
    if (trimmed.match(/^- /)) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(`<li>${convertInlineMarkdownToHTML(trimmed.replace(/^- /, ''))}</li>`);
      return;
    }
    
    // Finalizar lista se necessário
    if (inList && !trimmed.match(/^- /)) {
      processedLines.push(`<ul>${listItems.join('')}</ul>`);
      inList = false;
      listItems = [];
    }

    // Linha vazia
    if (trimmed === '') {
      if (!inList) {
        processedLines.push('');
      }
      return;
    }

    // Linha normal
    if (!trimmed.match(/^#/)) {
      processedLines.push(`<p>${processLine(trimmed)}</p>`);
    } else {
      processedLines.push(processLine(trimmed));
    }
  });

  // Finalizar lista pendente
  if (inList) {
    processedLines.push(`<ul>${listItems.join('')}</ul>`);
  }

  return processedLines.join('\n');
};

interface SEOHTMLOptions {
  title: string;
  description: string;
  keywords?: string[];
  content: string;
  domain?: string;
  canonicalUrl?: string;
  ogImage?: string;
  author?: {
    name: string;
    url?: string;
  };
  type?: 'article' | 'product' | 'landing-page' | 'email';
  products?: any[];
  includeSchema?: boolean;
}

interface ConsolidatedBlogOptions {
  title: string;
  description: string;
  domain: string;
  blogs: Array<{
    title: string;
    content: string;
    productName?: string;
    productId?: string;
    productImageUrl?: string;
    productUrl?: string;
    keywords?: string[];
  }>;
  landingPagesSEO?: Array<{
    id: string;
    name: string;
    seo_title: string;
    seo_description: string;
    ai_keywords: string[];
    selected_product_ids: string[];
    image1_url?: string;
  }>;
  selectedProducts?: Array<{
    id: string;
    name: string;
    description: string;
    price?: string | number;
    productUrl?: string;
    image_url?: string;
    keywords?: string[];
    market_keywords?: string[];
    search_intent_keywords?: string[];
    category?: string;
    target_audience?: string[];
    seo_title_override?: string;
    seo_description_override?: string;
    canonical_url?: string;
    gtin?: string;
    mpn?: string;
    brand?: string;
  }>;
  aggregatedKeywords?: string[];
  landingPageData?: any;
  includeOffers?: boolean;
  ogImage?: string;
  seoHiddenData?: {
    contextKeywords: string[];
    marketPositioning: string;
    competitiveAdvantages: string;
    technicalExpertise: string;
    serviceAreas: string;
  };
  landingPageIdForSEOContext?: string;
  preview?: boolean;
  authorKolId?: string; // ✅ FASE 3: ID do autor KOL
}

export const useSEOHTMLGenerator = () => {
  const [trackingConfig, setTrackingConfig] = useState<TrackingConfig | null>(null);

  // Carregar configurações de tracking ao montar
  useEffect(() => {
    getTrackingConfig().then(setTrackingConfig);
  }, []);

  // Função helper para limpar tags HTML e markdown do texto (para JSON-LD)
  const stripHtmlTags = (html: string): string => {
    let clean = html;
    // Remover tags HTML
    clean = clean.replace(/<[^>]*>/g, '');
    // Remover markdown links [texto](url)
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remover markdown bold **texto**
    clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
    // Remover markdown italic *texto*
    clean = clean.replace(/\*([^*]+)\*/g, '$1');
    // Remover markdown headers
    clean = clean.replace(/^#+\s*/gm, '');
    return clean.trim();
  };

  const { generateAdvancedProductSchema, generateFAQSchema, generateCompletePageSchema } = useAdvancedSchemaGenerator();
  const { allLinks } = useLinksRepository();

  const generateOptimizedHTML = useCallback(async (options: SEOHTMLOptions): Promise<string> => {
    const {
      title,
      description,
      keywords = [],
      content,
      domain = '',
      canonicalUrl,
      ogImage,
      author,
      type = 'article',
      products = [],
      includeSchema = true
    } = options;

    // ✨ APPLY SEO OVERRIDES FROM PRODUCTS
    const seoTitle = products.length > 0 && products[0].seo_title_override 
      ? products[0].seo_title_override 
      : title;
    const seoDescription = products.length > 0 && products[0].seo_description_override 
      ? products[0].seo_description_override 
      : description;
    const seoCanonicalUrl = products.length > 0 && products[0].canonical_url 
      ? products[0].canonical_url 
      : canonicalUrl;

    // Criar mapeamento de links inteligentes
    const intelligentLinks: Record<string, string> = {};
    allLinks.forEach(link => {
      if (link.name) {
        intelligentLinks[link.name.toLowerCase()] = link.url;
      }
    });

    // Converter markdown para HTML e processar com links inteligentes
    const htmlContent = convertMarkdownToHTML(content);
    const processedContent = processContentWithAdvancedIntelligentLinks(htmlContent, intelligentLinks);

    // Gerar Schema.org se solicitado
    let schemaJson = '';
    if (includeSchema) {
      if (type === 'product' && products.length > 0) {
        // ✨ GENERATE SCHEMA FOR MULTIPLE PRODUCTS
        if (products.length === 1) {
          const schemaResult = await generateCompletePageSchema(products, undefined, undefined, undefined, seoTitle, seoDescription);
          schemaJson = `
          <script type="application/ld+json">
          ${JSON.stringify(schemaResult.schemas, null, 2)}
          </script>`;
        } else {
          // Generate ItemList schema for multiple products
          const itemListSchema = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": seoTitle,
            "description": seoDescription,
            "numberOfItems": products.length,
            "itemListElement": products.map((product, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Product",
                "name": product.name,
                "description": product.description,
                "image": product.image_url,
                ...(product.gtin && { "gtin": product.gtin }),
                ...(product.mpn && { "mpn": product.mpn }),
                ...(product.brand && { "brand": { "@type": "Brand", "name": product.brand } }),
                ...(product.technical_specifications && product.technical_specifications.length > 0 && {
                  "additionalProperty": product.technical_specifications.map((spec: any) => ({
                    "@type": "PropertyValue",
                    "name": spec.label || spec.name,
                    "value": spec.value || spec.description
                  }))
                }),
                "offers": {
                  "@type": "Offer",
                  "price": product.price,
                  "priceCurrency": product.currency || "BRL",
                  "availability": `https://schema.org/${product.availability === 'in stock' ? 'InStock' : 'OutOfStock'}`,
                  "itemCondition": `https://schema.org/${product.condition === 'new' ? 'NewCondition' : 'UsedCondition'}`
                }
              }
            }))
          };
          schemaJson = `
          <script type="application/ld+json">
          ${JSON.stringify(itemListSchema, null, 2)}
          </script>`;
        }
      } else if (type === 'article') {
        const articleSchema = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": title,
          "description": description,
          "datePublished": new Date().toISOString(),
          "dateModified": new Date().toISOString(),
          "author": author ? {
            "@type": "Person",
            "name": author.name,
            "url": author.url
          } : undefined,
          "publisher": {
            "@type": "Organization",
            "name": domain || "Nossa Empresa"
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl || window.location.href
          }
        };
        schemaJson = `
        <script type="application/ld+json">
        ${JSON.stringify(articleSchema, null, 2)}
        </script>`;
      }
    }

    // ✨ AGGREGATE KEYWORDS FROM PRODUCTS 
    const aggregatedKeywords = [...keywords];
    if (products.length > 0) {
      products.forEach(product => {
        if (product.keywords) aggregatedKeywords.push(...product.keywords);
        if (product.market_keywords) aggregatedKeywords.push(...product.market_keywords);
        if (product.search_intent_keywords) aggregatedKeywords.push(...product.search_intent_keywords);
      });
    }
    // Remove duplicates and limit to top 50 keywords
    const uniqueKeywords = [...new Set(aggregatedKeywords)].slice(0, 50);

    // URL canônica com SEO override
    const canonical = seoCanonicalUrl || (domain ? `https://${domain}` : window.location.href);

    // ✨ GENERATE GOOGLE MERCHANT META TAGS FOR ALL PRODUCTS
    const generateGoogleMerchantTags = () => {
      if (products.length === 0) return '';
      
      // For single product, use product:* tags
      if (products.length === 1) {
        const product = products[0];
        return `
  ${product.gtin ? `<meta property="product:retailer_item_id" content="${product.gtin}">` : ''}
  ${product.mpn ? `<meta property="product:sku" content="${product.mpn}">` : ''}
  ${product.brand ? `<meta property="product:brand" content="${product.brand}">` : ''}
  ${product.condition ? `<meta property="product:condition" content="${product.condition}">` : ''}
  ${product.availability ? `<meta property="product:availability" content="${product.availability}">` : ''}
  ${product.color ? `<meta property="product:color" content="${product.color}">` : ''}
  ${product.google_product_category ? `<meta property="product:category" content="${product.google_product_category}">` : ''}
  <meta property="product:price:amount" content="${product.price || 0}">
  <meta property="product:price:currency" content="${product.currency || 'BRL'}">`;
      }
      
      // For multiple products, generate tags for each
      return products.map((product, index) => `
  <!-- Product ${index + 1} -->
  ${product.gtin ? `<meta property="product:retailer_item_id:${index}" content="${product.gtin}">` : ''}
  ${product.mpn ? `<meta property="product:sku:${index}" content="${product.mpn}">` : ''}
  ${product.brand ? `<meta property="product:brand:${index}" content="${product.brand}">` : ''}
  ${product.condition ? `<meta property="product:condition:${index}" content="${product.condition}">` : ''}
  ${product.availability ? `<meta property="product:availability:${index}" content="${product.availability}">` : ''}
  ${product.color ? `<meta property="product:color:${index}" content="${product.color}">` : ''}
  ${product.google_product_category ? `<meta property="product:category:${index}" content="${product.google_product_category}">` : ''}
  <meta property="product:price:amount:${index}" content="${product.price || 0}">
  <meta property="product:price:currency:${index}" content="${product.currency || 'BRL'}">`).join('');
    };

    // ✅ INJETAR TRACKING PIXELS E DOMÍNIOS SEO
    const trackingSnippets = injectTrackingPixels(trackingConfig);
    const gtmNoScript = injectGTMNoScript(trackingConfig);
    const seoDomainTags = generateSEODomainTags(trackingConfig);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  
  ${trackingSnippets}
  
  <!-- SEO Meta Tags -->
  <title>${truncateSEOTitle(seoTitle)}</title>
  <meta name="description" content="${seoDescription}">
  ${seoDomainTags}
  <meta name="description" content="${seoDescription}">
  ${uniqueKeywords.length > 0 ? `<meta name="keywords" content="${uniqueKeywords.join(', ')}">` : ''}
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <link rel="robots" href="/robots.txt">
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="${type === 'product' ? 'product' : 'article'}">
  <meta property="og:title" content="${seoTitle}">
  <meta property="og:description" content="${seoDescription}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="${domain || 'Nossa Empresa'}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  <meta property="og:locale" content="pt_BR">
  
  <!-- ✅ Video Meta Tags for Social Sharing -->
  ${(() => {
    if (!products || products.length === 0) return '';
    
    const allVideos = products.flatMap((product: any) => [
      ...(product.youtube_videos || []),
      ...(product.instagram_videos || []),
      ...(product.technical_videos || []),
      ...(product.testimonial_videos || []),
      ...((product as any).tiktok_videos || [])
    ].filter(Boolean));
    
    return allVideos.map((video: any, idx: number) => {
      const videoDescription = typeof video === 'object' 
        ? (video.description || products[0]?.sales_pitch || products[0]?.description || '')
        : (products[0]?.sales_pitch || products[0]?.description || '');
      
      return `<meta property="og:video:description" content="${videoDescription}">`;
    }).join('\n  ');
  })()}
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${seoTitle}">
  <meta name="twitter:description" content="${seoDescription}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
  
  <!-- Additional SEO Meta Tags -->
  <meta name="author" content="${author?.name || domain || 'Nossa Empresa'}">
  <meta name="generator" content="SEO Generator">
  <meta name="theme-color" content="#007bff">
  
  <!-- ✨ GOOGLE MERCHANT META TAGS FOR ALL PRODUCTS -->
  ${generateGoogleMerchantTags()}
  
  ${schemaJson}
  
  <!-- CSS Styling -->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.7;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    
    .container {
      max-width: 100%;
      margin: 0 auto;
    }
    
    header {
      margin-bottom: 40px;
      border-bottom: 3px solid #007bff;
      padding-bottom: 20px;
    }
    
    h1 {
      color: #1a1a1a;
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 15px;
      line-height: 1.2;
    }
    
    .meta-info {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 20px;
    }
    
    .content {
      font-size: 1.1rem;
      line-height: 1.7;
    }
    
    .content h2 {
      color: #2c3e50;
      font-size: 1.8rem;
      margin: 30px 0 15px 0;
      border-left: 4px solid #007bff;
      padding-left: 15px;
    }
    
    .content h3 {
      color: #34495e;
      font-size: 1.4rem;
      margin: 25px 0 12px 0;
    }
    
    .content p {
      margin-bottom: 18px;
      text-align: justify;
    }
    
    .content ul, .content ol {
      margin: 15px 0 15px 30px;
    }
    
    .content li {
      margin-bottom: 8px;
    }
    
    .content a {
      color: #007bff;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.3s ease;
    }
    
    .content a:hover {
      border-bottom-color: #007bff;
      text-decoration: none;
    }
    
    .content blockquote {
      background: #f8f9fa;
      border-left: 4px solid #007bff;
      margin: 20px 0;
      padding: 15px 20px;
      font-style: italic;
    }
    
    .content strong {
      color: #2c3e50;
    }
    
    footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }
    
    .keywords {
      margin-top: 30px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #28a745;
    }
    
    .keywords h4 {
      color: #28a745;
      margin-bottom: 10px;
    }
    
    .keywords .tag {
      display: inline-block;
      background: #e9ecef;
      color: #495057;
      padding: 4px 8px;
      margin: 2px;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 15px;
      }
      
      h1 {
        font-size: 2rem;
      }
      
      .content h2 {
        font-size: 1.5rem;
      }
      
      .content h3 {
        font-size: 1.2rem;
      }
    }
    
    /* Author Signature Mobile Responsiveness */
    @media (max-width: 640px) {
      .author-signature > div {
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;
      }
      
      .author-signature h4,
      .author-signature p {
        text-align: center !important;
      }
      
      .author-signature > div > div:first-of-type {
        justify-content: center !important;
      }
    }
  </style>
</head>
<body>
  ${gtmNoScript}
  
  <div class="container">
    <header>
      <h1>${title}</h1>
      <div class="meta-info">
        ${author ? `Por ${author.name} • ` : ''}Publicado em ${new Date().toLocaleDateString('pt-BR')}
        ${domain ? ` • ${domain}` : ''}
      </div>
    </header>
    
    <main>
      <article class="content">
        ${processedContent}
      </article>
      
      ${keywords.length > 0 ? `
      <section class="keywords">
        <h4>Palavras-chave relacionadas:</h4>
        <div>
          ${keywords.map(keyword => `<span class="tag">${keyword}</span>`).join('')}
        </div>
      </section>
      ` : ''}
    </main>
    
    <footer>
      <p>&copy; ${new Date().getFullYear()} ${domain || 'Nossa Empresa'}. Todos os direitos reservados.</p>
      ${canonical ? `<p><small>URL: ${canonical}</small></p>` : ''}
    </footer>
  </div>
  
  ${generateFooterLinks(trackingConfig)}
</body>
</html>`;
  }, [generateCompletePageSchema, trackingConfig]);

  const generateConsolidatedBlogHTML = useCallback(async (options: ConsolidatedBlogOptions & {
    excludeMetaInfo?: boolean;
    excludeFooter?: boolean;
    excludeSubtitle?: boolean;
  }): Promise<string> => {
    const { 
      title, 
      description, 
      domain, 
      blogs, 
      landingPagesSEO, 
      selectedProducts, 
      aggregatedKeywords = [], 
      landingPageData, 
      includeOffers = false, 
      ogImage, 
      seoHiddenData,
      landingPageIdForSEOContext,
      preview = false,
      excludeMetaInfo = true,
      excludeFooter = true,
      excludeSubtitle = true,
    } = options;

    // ============= PATCH 1: Funções de Sanitização =============
    // Helper functions for sanitization
    const stripTags = (s = '') => s.replace(/<[^>]*>/g, '');
    const collapse = (s = '') => s.replace(/\s+/g, ' ').trim();
    const attrEscape = (s = '') => collapse(stripTags(s)).replace(/"/g, '&quot;'); // para atributos HTML
    const jsonText = (s = '') => collapse(stripTags(s)); // para JSON.stringify

    // ✅ Sanitizar keywords agregadas
    const sanitizeAggregatedKeywords = (input: unknown): string[] => {
      const list = Array.isArray(input) ? input : (typeof input === 'string' ? [input] : []);
      
      // ✅ Explodir strings separadas por vírgula ou pipe
      const exploded = list.flatMap(k => 
        (typeof k === 'string' ? k.split(/[,|;]/) : [])
      ).map(s => s.trim()).filter(Boolean);
      
      // ✅ Filtrar keywords inválidas (mais restritivo)
      const filtered = exploded.filter(k => {
        if (k.length < 3) return false; // ✅ Muito curta
        if (k.length > 40) return false; // ✅ Reduzido de 60 para 40
        if (/[.?!]/.test(k)) return false; // ✅ Contém pontuação de frase
        if (k.split(/\s+/).length > 4) return false; // ✅ Reduzido de 6 para 4 palavras
        if (/entre em contato|saiba mais|clique aqui|leia mais/i.test(k)) return false; // ✅ CTAs
        if (/\d{10,}/i.test(k)) return false; // ✅ Números longos (telefones, etc)
        return true;
      });
      
      // ✅ Remover duplicatas e limitar a 5
      return [...new Set(filtered)].slice(0, 5);
    };

    const safeKeywords = sanitizeAggregatedKeywords(aggregatedKeywords);

    // ============= SEO CRÍTICO 1: Buscar Company Profile para SEO =============
    const companyProfile = await getCompanyProfileForSEO();
    const companySEO = companyProfile ? buildSEOMetaFromCompany(companyProfile) : null;

    // ============= SEO CRÍTICO 2: Buscar Reviews para Schema =============
    let allReviews: UnifiedReview[] = [];
    
    // ============= E-E-A-T: FETCH AUTHOR FROM BLOG POST =============
    let authorKol = null;
    if (landingPageIdForSEOContext) {
      try {
        // Buscar approved_reviews
        const { data: approvedReviews } = await supabase
          .from('approved_reviews')
          .select(`
            raw_review_id,
            raw_reviews!inner(author_name, rating, review_text, review_date)
          `)
          .eq('landing_page_id', landingPageIdForSEOContext)
          .limit(10);

        if (approvedReviews) {
          allReviews.push(...approvedReviews.map((r: any) => ({
            type: 'google_approved' as const,
            author_name: r.raw_reviews.author_name,
            rating: r.raw_reviews.rating,
            review_text: r.raw_reviews.review_text || undefined,
            review_date: r.raw_reviews.review_date || undefined,
          })));
        }

        // Buscar video_testimonials
        const { data: videoTestimonials } = await supabase
          .from('video_testimonials')
          .select('*')
          .eq('landing_page_id', landingPageIdForSEOContext)
          .eq('approved', true)
          .limit(5);

        if (videoTestimonials) {
          allReviews.push(...videoTestimonials.map((v: any) => ({
            type: 'video_testimonial' as const,
            author_name: v.client_name,
            rating: 5, // Video testimonials são sempre 5 estrelas
            review_text: v.testimonial_text,
            profession: v.profession || undefined,
            location: v.location || undefined,
            state: v.state || undefined,
            specialty: v.specialty || undefined,
            youtube_url: v.youtube_url || undefined,
            instagram_url: v.instagram_url || undefined,
          })));
        }
      } catch (error) {
        console.error('❌ Erro ao buscar reviews para schema:', error);
      }
    }

    // ========================================
    // ✅ FASE 3: FETCH AUTHOR KOL
    // ========================================
    if (options.authorKolId) {
      try {
        const { data: kol } = await supabase
          .from('key_opinion_leaders')
          .select('*')
          .eq('id', options.authorKolId)
          .eq('approved', true)
          .single();

        if (kol) {
          authorKol = kol;
          console.log('✅ Author KOL loaded:', authorKol.full_name);
        }
      } catch (error) {
        console.error('❌ Error fetching KOL author:', error);
      }
    } else if (landingPageIdForSEOContext) {
      // Fallback: buscar do blog_post
      try {
        const { data: blogPost } = await supabase
          .from('blog_posts')
          .select(`
            author_kol_id,
            key_opinion_leaders!inner(*)
          `)
          .eq('landing_page_id', landingPageIdForSEOContext)
          .maybeSingle();

        if (blogPost?.key_opinion_leaders) {
          authorKol = blogPost.key_opinion_leaders;
          console.log('✅ Author loaded from blog_post:', authorKol.full_name);
        }
      } catch (error) {
        console.error('❌ Error fetching blog author:', error);
      }
    }

    // ============= SEO CRÍTICO 3: Aplicar Overrides de Produto =============
    let finalTitle = title;
    let finalDescription = description;
    let finalCanonicalUrl = '';

    if (selectedProducts && selectedProducts.length > 0) {
      const firstProduct = selectedProducts[0];
      if (firstProduct.seo_title_override) {
        finalTitle = firstProduct.seo_title_override;
      }
      if (firstProduct.seo_description_override) {
        finalDescription = firstProduct.seo_description_override;
      }
      if (firstProduct.canonical_url) {
        finalCanonicalUrl = firstProduct.canonical_url;
      }
    }

    // ============= PATCH 5: Normalizar BaseURL =============
    const baseURL = domain.includes('.com.br') 
      ? `https://${domain}` 
      : `https://${domain}.com.br`;
    const blogURL = finalCanonicalUrl || `${baseURL}/blog`;
    const canonicalUrl = baseURL; // manter compatibilidade

    // ============= PATCH 2: Sanitizar description para uso seguro =============
    const safeDesc = attrEscape(finalDescription || '');
    const safeJsonDesc = jsonText(finalDescription || '');

    // Use aggregated keywords from landing pages + products + blogs if provided
    const allKeywords = aggregatedKeywords && aggregatedKeywords.length > 0 
      ? aggregatedKeywords 
      : blogs.reduce((acc: string[], blog) => {
          if (blog.keywords) {
            acc.push(...blog.keywords);
          }
          return acc;
        }, []);

    // Remover duplicatas e limitar para melhor performance SEO
    const uniqueKeywords = [...new Set(allKeywords)].slice(0, 30);

    // Gerar schema para múltiplos artigos com relações para produtos
    const blogSchemas = blogs.map((blog, index) => {
      // Converter markdown para HTML inline e depois limpar para JSON-LD
      const htmlTitle = convertInlineMarkdownToHTML(blog.title);
      const cleanTitle = sanitizeHTMLAttributes(stripHtmlTags(htmlTitle));
      // Para descrição, primeiro converter markdown e depois limpar tags HTML e links aninhados
      const htmlContent = convertMarkdownToHTML(blog.content);
      const cleanDescription = stripHtmlTags(removeNestedLinks(htmlContent)).substring(0, 160);
      
      // Encontrar produto relacionado se existir
      let relatedProduct = null;
      if (selectedProducts && blog.productName) {
        relatedProduct = selectedProducts.find(product => 
          product.name.toLowerCase().includes(blog.productName.toLowerCase()) ||
          blog.productName.toLowerCase().includes(product.name.toLowerCase())
        );
      }
      
      const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": cleanTitle,
        "description": cleanDescription,
        "datePublished": new Date().toISOString(),
        "position": index + 1,
        "author": {
          "@type": "Organization",
          "name": domain
        }
      };

      // Adicionar relação com produto se encontrado
      if (relatedProduct) {
        articleSchema["about"] = { "@id": `#product-${relatedProduct.id}` };
        articleSchema["mainEntity"] = { "@id": `#product-${relatedProduct.id}` };
      }
      
      return articleSchema;
    });

    // ============= SEO CRÍTICO 4: Gerar Reviews Schema =============
    let reviewsSchemaJSON = null;
    if (companyProfile && allReviews.length > 0) {
      try {
        reviewsSchemaJSON = generateSchemaFromCompanyProfile(companyProfile, allReviews, 15);
      } catch (error) {
        console.error('❌ Erro ao gerar reviews schema:', error);
      }
    }

    // Generate complete schema including products for SEO
    let completeSchema;
    
    if (selectedProducts && selectedProducts.length > 0) {
      // Convert selectedProducts to ProductData format for advanced schema with @id
      const productDataArray = selectedProducts.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: typeof product.price === 'number' ? product.price : parseFloat(product.price?.toString() || '0'),
        currency: 'BRL',
        category: product.category || '',
        brand: product.brand || '',
        image_url: product.image_url || '',
        product_url: product.productUrl || '',
        keywords: [...(product.keywords || []), ...(product.market_keywords || []), ...(product.search_intent_keywords || [])],
        availability: 'in stock',
        condition: 'new',
        gtin: product.gtin || '',
        mpn: product.mpn || '',
        // ✨ FASE 1: Incluir technical_specifications no schema
        technical_specifications: product.technical_specifications || []
      }));

      // Use advanced schema generator for complete page schema
      const schemaResult = await generateCompletePageSchema(
        productDataArray,
        undefined, // companyData
        undefined, // faqItems
        undefined, // reviewsData,
        finalTitle,
        finalDescription,
        authorKol // ✨ E-E-A-T: Pass author data
      );
      const { schemas } = schemaResult;
      
      // Add blogs ItemList to the schema graph
      const blogsItemList = {
        "@type": "ItemList",
        "name": "Artigos Relacionados",
        "description": "Conteúdo informativo relacionado aos produtos",
        "numberOfItems": blogs.length,
        "itemListElement": blogSchemas.map((schema, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": schema
        }))
      };
      
      // Schemas já vem com @id correto do generateCompletePageSchema
      if (Array.isArray(schemas)) {
        completeSchema = [...schemas, blogsItemList];
      } else {
        completeSchema = [schemas, blogsItemList];
      }

      // ✨ ADICIONAR REVIEWS SCHEMA se disponível
      if (reviewsSchemaJSON) {
        try {
          const parsedReviewsSchema = JSON.parse(reviewsSchemaJSON);
          if (Array.isArray(completeSchema)) {
            completeSchema.push(parsedReviewsSchema);
          } else {
            completeSchema = [completeSchema, parsedReviewsSchema];
          }
        } catch (error) {
          console.error('❌ Erro ao parsear reviews schema:', error);
        }
      }

      // ✅ FASE 2: Adicionar Schema de Parcerias Internacionais
      if (companyProfile && companyProfile.institutional_links) {
        try {
          const partnershipsSchemas = generatePartnershipsSchema(companyProfile);
          if (partnershipsSchemas.length > 0) {
            const partnershipsItemList = {
              "@type": "ItemList",
              "name": "Parcerias Internacionais",
              "numberOfItems": partnershipsSchemas.length,
              "itemListElement": partnershipsSchemas.map((partner, idx) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "item": partner
              }))
            };
            
            if (Array.isArray(completeSchema)) {
              completeSchema.push(partnershipsItemList);
            } else {
              completeSchema = [completeSchema, partnershipsItemList];
            }
            
            console.log(`✅ FASE 2: ${partnershipsSchemas.length} parcerias adicionadas ao Schema`);
          }
        } catch (error) {
          console.error('❌ Erro ao gerar schema de parcerias:', error);
        }
      }
    } else {
      // Only blogs schema
      completeSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": finalTitle,
        "description": finalDescription,
        "numberOfItems": blogs.length,
        "itemListElement": blogSchemas.map((schema, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": schema
        }))
      };
    }

    const schemaJson = `
    <script type="application/ld+json">
    ${JSON.stringify(completeSchema, null, 2)}
    </script>`;

    // ✅ CARREGAR KEYWORDS PARA AUTO-LINKING
    const autoLinkItems: { term: string; url: string }[] = [];
    
    try {
      // Prioridade 1: Links externos
      const { data: externalLinks } = await supabase
        .from('external_links')
        .select('name, url')
        .eq('approved', true);
      
      externalLinks?.forEach(link => {
        autoLinkItems.push({ term: link.name, url: link.url });
      });
      
      // Prioridade 2: Landing pages
      const { data: internalPages } = await supabase
        .from('landing_pages')
        .select('id, name, data')
        .eq('status', 'published');
      
      internalPages?.forEach(page => {
        const pageData = page.data as any;
        const url = pageData?.seo?.canonical_url || `/${page.id}`;
        autoLinkItems.push({ term: page.name, url });
      });
      
      // Prioridade 3-6: Produtos e keywords
      const { data: products } = await supabase
        .from('products_repository')
        .select('name, product_url, keywords, search_intent_keywords, market_keywords')
        .eq('approved', true)
        .eq('use_in_ai_generation', true);
      
      products?.forEach(product => {
        const productUrl = product.product_url || '#';
        
        // Nome do produto
        if (product.name) {
          autoLinkItems.push({ term: product.name, url: productUrl });
        }
        
        // Keywords (processar arrays)
        const allProductKeywords = [
          ...(Array.isArray(product.keywords) ? product.keywords : []),
          ...(Array.isArray(product.search_intent_keywords) ? product.search_intent_keywords : []),
          ...(Array.isArray(product.market_keywords) ? product.market_keywords : [])
        ];
        
        allProductKeywords.forEach(kw => {
          if (kw && typeof kw === 'string' && kw.length >= 3) {
            autoLinkItems.push({ term: kw.trim(), url: productUrl });
          }
        });
      });
    } catch (error) {
      console.warn('⚠️ Erro ao carregar keywords para auto-linking:', error);
    }

    // Create intelligent links mapping from selected products (mantido para compatibilidade)
    const intelligentLinks: Record<string, string> = {};
    if (selectedProducts) {
      selectedProducts.forEach(product => {
        if (product.name) {
          intelligentLinks[product.name.toLowerCase()] = product.productUrl || `${canonicalUrl}/produto/${product.id}`;
        }
        // Add keywords as links too
        [...(product.keywords || []), ...(product.market_keywords || [])].forEach(keyword => {
          if (keyword.length > 3) {
            intelligentLinks[keyword.toLowerCase()] = product.productUrl || `${canonicalUrl}/produto/${product.id}`;
          }
        });
      });
    }

    // Processar conteúdo dos blogs com links clicáveis
    const blogContents = blogs.map((blog, index) => {
      const blogCanonicalUrl = `${blogURL}/${domain}-${index + 1}`;
      
      // Converter markdown para HTML primeiro
      let htmlContent = convertMarkdownToHTML(blog.content);
      
      // ✅ APLICAR AUTO-LINKS (antes de adicionar IDs aos H2s)
      if (autoLinkItems.length > 0) {
        htmlContent = applyAutoLinksOncePerTerm(htmlContent, autoLinkItems, {
          maxLinks: 12,
          caseSensitive: false
        });
      }
      
      // ✅ Adicionar IDs aos H2s (para navegação via TOC)
      htmlContent = addIdsToHeadings(htmlContent);
      
      // Depois aplicar links inteligentes (mantido para compatibilidade) e remover links aninhados
      const processedContent = removeNestedLinks(
        processContentWithAdvancedIntelligentLinks(htmlContent, intelligentLinks)
      );
      
      // Smart HTML-aware truncation for preview
      const previewLength = 300;
      let previewContent = processedContent;
      
      // Extract text content without HTML for length calculation
      const textContent = processedContent.replace(/<[^>]*>/g, '');
      
      if (textContent.length > previewLength) {
        // ✅ Encontrar ponto de corte inteligente
        let truncateAt = previewLength;
        const substring = textContent.substring(0, previewLength);
        
        // Procurar último espaço, ponto, vírgula ou quebra de linha
        const breakPoints = [
          substring.lastIndexOf('. '),
          substring.lastIndexOf('! '),
          substring.lastIndexOf('? '),
          substring.lastIndexOf(', '),
          substring.lastIndexOf(' ')
        ];
        
        const bestBreakPoint = Math.max(...breakPoints);
        if (bestBreakPoint > previewLength * 0.7) { // ✅ Pelo menos 70% do preview
          truncateAt = bestBreakPoint + 1;
        }
        
        // Smart truncation that preserves HTML structure
        let textCount = 0;
        let htmlIndex = 0;
        let insideTag = false;
        
        for (let i = 0; i < processedContent.length; i++) {
          const char = processedContent[i];
          
          if (char === '<') {
            insideTag = true;
          } else if (char === '>') {
            insideTag = false;
          } else if (!insideTag) {
            textCount++;
            if (textCount >= truncateAt) {
              htmlIndex = i + 1;
              break;
            }
          }
        }
        
        if (htmlIndex > 0) {
          let truncatedHTML = processedContent.substring(0, htmlIndex);
          
          // Ensure all opened tags are properly closed
          const openTags: string[] = [];
          const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
          let match;
          
          while ((match = tagRegex.exec(truncatedHTML)) !== null) {
            const tagName = match[1].toLowerCase();
            if (match[0].startsWith('</')) {
              // Closing tag
              const lastOpenTag = openTags.lastIndexOf(tagName);
              if (lastOpenTag !== -1) {
                openTags.splice(lastOpenTag, 1);
              }
            } else if (!match[0].endsWith('/>') && !['br', 'hr', 'img', 'input'].includes(tagName)) {
              // Opening tag (not self-closing)
              openTags.push(tagName);
            }
          }
          
          // Close any remaining open tags
          for (let i = openTags.length - 1; i >= 0; i--) {
            truncatedHTML += `</${openTags[i]}>`;
          }
          
          // ✅ ADICIONAR "..." se truncado
          previewContent = truncatedHTML + ' <span style="color: #6b7280;">...</span>';
        }
      }
      
      // Extrair título sanitizado do conteúdo markdown
      const sanitizedTitle = extractTitleFromMarkdown(blog.content) || blog.title;
      const htmlTitle = convertInlineMarkdownToHTML(sanitizedTitle);
      const processedTitle = processContentWithAdvancedIntelligentLinks(htmlTitle, intelligentLinks);
      
      // ============= PATCH 7: Sanitizar título antes de linkar =============
      const cleanTitle = collapse(stripTags(processedTitle));
      
      // Encontrar URL do produto relacionado
      let productUrl = '';
      let productName = '';
      if (blog.productName && selectedProducts) {
        const relatedProduct = selectedProducts.find((p: any) => 
          p.name.toLowerCase().includes(blog.productName.toLowerCase())
        );
        if (relatedProduct) {
          productUrl = relatedProduct.productUrl || `${canonicalUrl}/produto/${relatedProduct.id}`;
          productName = relatedProduct.name;
        }
      }

      // Buscar imagem do produto relacionado (fallback robusto)
      const productImageUrl = blog.productImageUrl 
        || (blog.productId && selectedProducts 
          ? selectedProducts.find((p: any) => p.id === blog.productId)?.image_url 
          : '')
        || (blog.productName && selectedProducts 
          ? selectedProducts.find((p: any) => p.name.toLowerCase().includes(blog.productName.toLowerCase()))?.image_url
          : '')
        || '';

      return `
        <section class="blog-item">
          <h2>
            <a href="${blogCanonicalUrl}" class="blog-link">
              ${cleanTitle}
            </a>
          </h2>
          ${productName && productImageUrl ? `
            <div class="product-image">
              <img 
                src="${productImageUrl}" 
                alt="${productName}" 
                loading="lazy"
                style="max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0;"
              />
            </div>
          ` : ''}
          ${productName ? `
            <p class="product-reference">
              <strong>Produto:</strong>
              <a href="${productUrl}" title="Saiba mais sobre ${productName}">
                ${productName}
              </a>
            </p>
          ` : ''}
          <div class="blog-content post-card-content">
            <div class="preview-content">
              ${previewContent}
            </div>
            ${previewContent !== processedContent ? `
              <button class="read-more-btn" onclick="toggleReadMore(this)">Leia mais →</button>
              <div class="full-content">
                ${processedContent}
              </div>
            ` : ''}
          </div>
        </section>
      `;
    }).join('\n');
    
    // ✅ ADICIONAR IDs AOS H2s PARA TOC
    const blogContentsWithIds = addIdsToHeadings(blogContents);
    
    // ✅ GERAR TOC
    const tocHTML = generateTableOfContents(blogContentsWithIds, domain);
    
    // Add SEO summary from landing pages if available
    let seoSummary = '';
    if (landingPagesSEO && landingPagesSEO.length > 0) {
      seoSummary = `
        <section class="seo-summary">
          <h2>Contexto das Landing Pages</h2>
          ${landingPagesSEO.map(lp => `
            <div class="landing-page-context">
              <h3>${lp.seo_title}</h3>
              <p>${lp.seo_description}</p>
              ${lp.ai_keywords.length > 0 ? `<p><strong>Keywords:</strong> ${lp.ai_keywords.slice(0, 10).join(', ')}</p>` : ''}
            </div>
          `).join('')}
        </section>
      `;
    }
    

    const finalHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  
  <!-- SEO Meta Tags -->
  <title>${sanitizeHTMLAttributes(truncateSEOTitle(finalTitle))}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${blogURL}">
  <link rel="alternate" href="${blogURL}" hreflang="pt-br">
  <link rel="alternate" href="${blogURL}" hreflang="x-default">
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${sanitizeHTMLAttributes(truncateSEOTitle(finalTitle))}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${blogURL}">
  ${companySEO?.siteNameMeta ? `<meta property="og:site_name" content="${sanitizeHTMLAttributes(companySEO.siteNameMeta)}">` : ''}
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : `<meta property="og:image" content="${baseURL}/static/og/blog.jpg">`}
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${sanitizeHTMLAttributes(truncateSEOTitle(finalTitle))}">
  <meta name="twitter:description" content="${safeDesc}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : `<meta name="twitter:image" content="${baseURL}/static/og/blog.jpg">`}
  
    <!-- Additional SEO Meta Tags -->
    <meta name="author" content="${authorKol?.full_name || domain}">
    ${authorKol ? `<meta property="article:author" content="${authorKol.full_name}">` : ''}
    <meta name="generator" content="Blog Consolidado SEO">
  <meta name="theme-color" content="#007bff">
  
  ${companySEO?.additionalKeywords.length ? companySEO.additionalKeywords.map(k => `<meta name="keyword" content="${sanitizeHTMLAttributes(k)}">`).join('\n  ') : ''}
  
  <!-- WebPage JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Blog ${domain === 'dentala' ? 'Dentala' : 'Eodonto'} - Odontologia Digital",
    "description": ${JSON.stringify(safeJsonDesc)},
    "url": "${blogURL}",
    "inLanguage": "pt-BR"
  }
  </script>
  
  ${schemaJson}
  
  <!-- CSS Styling -->
  <style>
    :root {
      --primary-color: hsl(221, 83%, 53%);
      --primary-hover: hsl(221, 83%, 43%);
      --secondary-color: hsl(215, 25%, 27%);
      --text-color: hsl(224, 71%, 4%);
      --text-muted: hsl(215, 16%, 47%);
      --background: hsl(0, 0%, 100%);
      --background-alt: hsl(210, 40%, 98%);
      --border-color: hsl(214, 32%, 91%);
      --card-background: hsl(0, 0%, 100%);
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      --gradient-primary: linear-gradient(135deg, var(--primary-color), hsl(221, 83%, 63%));
      --gradient-soft: linear-gradient(135deg, var(--background-alt), hsl(210, 40%, 96%));
      --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      --border-radius: 0.75rem;
      --font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: var(--font-family);
      background: var(--background-alt);
      color: var(--text-color);
      line-height: 1.6;
    }
    
    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 4rem 1rem;
    }
    
    .header {
      display: none;
      position: absolute;
      left: -9999px;
      text-align: center;
      margin-bottom: 4rem;
      padding: 3rem 2rem;
      background: var(--card-background);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--gradient-primary);
    }
    
    .header h1 {
      color: var(--text-color);
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 700;
      margin-bottom: 1rem;
      line-height: 1.1;
    }
    
    .header .subtitle {
      color: var(--text-muted);
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
      font-weight: 400;
    }
    
    .header .meta-info {
      display: none; /* Oculto visualmente - mantido no código */
      color: var(--text-muted);
      font-size: 0.95rem;
      font-weight: 500;
    }
    
    .blog-section {
      display: grid;
      gap: 2rem;
    }
    
    .blog-item {
      background: var(--card-background);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-md);
      overflow: hidden;
      transition: var(--transition-smooth);
      border: 1px solid var(--border-color);
    }
    
    .blog-item:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-xl);
    }
    
    .blog-link {
      text-decoration: none;
      color: inherit;
      display: block;
    }
    
    .blog-item h2 {
      color: var(--text-color);
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 1rem;
      padding: 2rem 2rem 0;
      transition: var(--transition-smooth);
    }
    
    .blog-link:hover h2 {
      color: var(--primary-color);
    }
    
    .blog-item.strategic {
      background: linear-gradient(135deg, hsl(262, 83%, 98%), hsl(262, 83%, 96%));
      border-left: 4px solid hsl(262, 83%, 58%);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
      margin-bottom: 3rem;
    }
    
    .blog-item.strategic h2 {
      display: none;
      color: hsl(262, 83%, 48%);
      font-size: 1.8rem;
    }
    
    .blog-item.strategic .blog-content {
      padding-top: 2rem;
    }
    
    .blog-item.strategic .blog-link {
      color: hsl(262, 83%, 48%);
      text-decoration: none;
    }
    
    .blog-item.strategic .blog-link:hover {
      text-decoration: underline;
    }
    
    .product-reference {
      background: linear-gradient(135deg, hsl(221, 83%, 98%), hsl(221, 83%, 95%));
      padding: 0.875rem 1.25rem;
      margin: 0 2rem 1.5rem;
      border-radius: 0.5rem;
      border-left: 4px solid var(--primary-color);
      font-weight: 500;
      color: var(--secondary-color);
    }
    
    .blog-content {
      padding: 0 2rem 2rem;
      font-size: 1rem;
      line-height: 1.7;
      color: var(--text-color);
    }
    
    .post-card-content {
      padding: 0 2rem 2rem;
    }
    
    .blog-content h3 {
      color: var(--secondary-color);
      font-size: 1.375rem;
      font-weight: 600;
      margin: 2rem 0 1rem 0;
    }
    
    .blog-content h4 {
      color: var(--text-color);
      font-size: 1.125rem;
      font-weight: 600;
      margin: 1.5rem 0 0.75rem 0;
    }
    
    .blog-content p {
      margin-bottom: 1.25rem;
      text-align: justify;
    }
    
    .blog-content ul, .blog-content ol {
      margin: 1rem 0 1.25rem 2rem;
    }
    
    .blog-content li {
      margin-bottom: 0.5rem;
    }
    
    .blog-content a {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: var(--transition-smooth);
    }
    
    .blog-content a:hover {
      border-bottom-color: var(--primary-color);
    }
    
    .blog-content blockquote {
      background: var(--background-alt);
      border-left: 4px solid var(--primary-color);
      margin: 1.5rem 0;
      padding: 1.25rem 1.5rem;
      font-style: italic;
      border-radius: 0.5rem;
    }
    
    .blog-content strong {
      color: var(--secondary-color);
      font-weight: 600;
    }
    
    .read-more-btn {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      font-family: inherit;
      font-size: 0.95rem;
      transition: var(--transition-smooth);
      box-shadow: var(--shadow-sm);
    }
    
    .read-more-btn:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    .full-content {
      display: none;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
    }
    
    .full-content.expanded {
      display: block;
    }
    
    .preview-content {
      margin-bottom: 0;
    }
    
    .keywords-section {
      margin-top: 3rem;
      padding: 2rem;
      background: linear-gradient(135deg, hsl(142, 76%, 98%), hsl(142, 76%, 95%));
      border-radius: var(--border-radius);
      border-left: 4px solid hsl(142, 76%, 36%);
      box-shadow: var(--shadow-md);
    }
    
    .keywords-section h3 {
      color: hsl(142, 76%, 36%);
      margin-bottom: 1.25rem;
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .keywords-section .tag {
      display: inline-block;
      background: var(--card-background);
      color: var(--text-color);
      padding: 0.5rem 1rem;
      margin: 0.25rem;
      border-radius: 1.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-color);
      transition: var(--transition-smooth);
    }
    
    .keywords-section .tag:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    
    .seo-summary {
      background: linear-gradient(135deg, hsl(291, 64%, 98%), hsl(291, 64%, 95%));
      padding: 2rem;
      border-radius: var(--border-radius);
      margin: 3rem 0;
      border-left: 4px solid hsl(291, 64%, 42%);
      box-shadow: var(--shadow-md);
    }
    
    .seo-summary h2 {
      color: hsl(291, 64%, 42%);
      margin-bottom: 1.5rem;
      font-weight: 600;
    }
    
    .landing-page-context {
      margin-bottom: 1.5rem;
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
    }
    
    .landing-page-context h3 {
      color: var(--text-color);
      margin-bottom: 0.75rem;
      font-size: 1.125rem;
    }
    
    .products-summary {
      background: linear-gradient(135deg, hsl(35, 100%, 98%), hsl(35, 100%, 95%));
      padding: 2rem;
      border-radius: var(--border-radius);
      margin: 3rem 0;
      border-left: 4px solid hsl(35, 100%, 50%);
      box-shadow: var(--shadow-md);
    }
    
    .products-summary h2 {
      color: hsl(35, 100%, 40%);
      margin-bottom: 1.5rem;
      font-weight: 600;
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    
    .product-card {
      background: rgba(255, 255, 255, 0.9);
      padding: 1.5rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      transition: var(--transition-smooth);
    }
    
    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    .product-card h3 {
      color: var(--text-color);
      margin-bottom: 0.75rem;
      font-size: 1.125rem;
      font-weight: 600;
    }

    footer {
      display: none; /* Oculto visualmente - mantido no código */
      margin-top: 4rem;
      padding: 2rem;
      background: var(--card-background);
      border-radius: var(--border-radius);
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      box-shadow: var(--shadow-md);
      border-top: 4px solid var(--primary-color);
    }
    
    footer p {
      margin-bottom: 0.5rem;
    }
    
    footer p:last-child {
      margin-bottom: 0;
    }
    
    /* ✨ FASE 1: Especificações Técnicas */
    .technical-specs-section {
      padding: 3rem 0;
      margin: 3rem 0;
      background: var(--background-alt);
      border-radius: var(--border-radius);
    }
    
    .technical-specs-section h2 {
      text-align: center;
      margin-bottom: 2rem;
      font-size: 1.75rem;
      color: var(--text-color);
      font-weight: 600;
    }
    
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }
    
    .spec-item {
      background: var(--card-background);
      padding: 1.25rem;
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: var(--transition-smooth);
      border: 1px solid var(--border-color);
    }
    
    .spec-item:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    .spec-item dt {
      font-weight: 600;
      color: var(--primary-color);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .spec-item dd {
      margin: 0;
      color: var(--text-color);
      font-size: 1rem;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 2rem 1rem;
      }
      
      .technical-specs-section {
        padding: 2rem 0;
        margin: 2rem 0;
      }
      
      .specs-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      
      .spec-item {
        padding: 1rem;
      }
      
      .header {
        padding: 2rem 1rem;
        margin-bottom: 2rem;
      }
      
      .header h1 {
        font-size: clamp(1.75rem, 4vw, 2.5rem);
      }
      
      .header .subtitle {
        font-size: 1.125rem;
      }
      
      .blog-item h2 {
        font-size: 1.5rem;
        padding: 1.5rem 1.5rem 0;
      }
      
      .blog-content, .post-card-content {
        padding: 0 1.5rem 1.5rem;
        font-size: 0.95rem;
      }
      
      .product-reference {
        margin: 0 1.5rem 1.25rem;
      }
      
      .seo-summary, .products-summary, .keywords-section {
        margin: 2rem 0;
        padding: 1.5rem;
      }
      
      .products-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container" role="main">
    <!-- ✅ HERO SECTION -->
    <header class="hero" aria-label="Cabeçalho do artigo">
      <div>
        <div class="eyebrow">${(safeKeywords && safeKeywords.length > 0 ? safeKeywords[0] : 'Artigo')} • ${companySEO?.siteNameMeta || domain}</div>
        <h1>${title}</h1>
        <p class="lead">${description}</p>
      </div>
    </header>

    <main>
      <!-- ✅ SIDEBAR TOC -->
      <nav class="toc" aria-label="Sumário do artigo">
        <h4>Sumário</h4>
        <ul>
          ${tocHTML}
        </ul>
        <hr style="margin:12px 0;border:none;border-top:1px solid rgba(15,23,42,0.03)" />
        <a class="small" href="https://${domain}">Voltar ao site</a>
      </nav>

      <!-- ✅ ARTICLE CONTENT -->
      <article>
        ${blogContentsWithIds}
      </article>
    </main>
  </div>

    ${authorKol ? `
    <!-- 👤 Author Signature Section (E-E-A-T Enhanced) -->
    <section class="author-signature" style="
      margin-top: 3rem;
      background: white;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    ">
      <div style="
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        flex-wrap: wrap;
      ">
        <!-- Author Photo -->
        ${authorKol.photo_url ? `
        <img 
          src="${authorKol.photo_url}" 
          alt="${authorKol.full_name}"
          style="
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #000000;
            flex-shrink: 0;
          "
        />
        ` : `
        <div style="
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f3f4f6;
          border: 2px solid #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#6b7280">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        `}
        
        <!-- Author Content -->
        <div style="flex: 1; min-width: 0;">
          <!-- Header: Name + Social Icons -->
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
            flex-wrap: wrap;
          ">
            <!-- Author Info -->
            <div style="flex: 1; min-width: 0;">
              <p style="
                font-size: 0.8rem;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-bottom: 0.25rem;
              ">Sobre o autor</p>
              <h4 style="
                font-size: 1.125rem;
                font-weight: 900;
                text-transform: uppercase;
                color: #000000;
                line-height: 1.25;
                margin: 0 0 0.25rem 0;
              ">${authorKol.full_name}</h4>
              ${authorKol.specialty ? `
              <p style="
                font-size: 0.875rem;
                color: #6b7280;
                margin-top: 0.25rem;
              ">${authorKol.specialty}</p>
              ` : ''}
            </div>
            
            <!-- Social Icons -->
            <div style="
              display: flex;
              gap: 0.5rem;
              flex-wrap: wrap;
              align-items: flex-start;
            ">
              ${authorKol.instagram_url ? `
              <a
                href="${authorKol.instagram_url}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style="
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  ${getSocialBrandColor('instagram')};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: opacity 0.2s;
                  text-decoration: none;
                "
                onmouseover="this.style.opacity='0.9'"
                onmouseout="this.style.opacity='1'"
              >${getSocialIconSVG('instagram')}</a>
              ` : ''}
              ${authorKol.youtube_url ? `
              <a
                href="${authorKol.youtube_url}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                style="
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  ${getSocialBrandColor('youtube')};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: opacity 0.2s;
                  text-decoration: none;
                "
                onmouseover="this.style.opacity='0.9'"
                onmouseout="this.style.opacity='1'"
              >${getSocialIconSVG('youtube')}</a>
              ` : ''}
              ${authorKol.website_url ? `
              <a
                href="${authorKol.website_url}"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Website"
                style="
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  ${getSocialBrandColor('website')};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: opacity 0.2s;
                  text-decoration: none;
                "
                onmouseover="this.style.opacity='0.9'"
                onmouseout="this.style.opacity='1'"
              >${getSocialIconSVG('website')}</a>
              ` : ''}
            </div>
          </div>
          
          <!-- Mini Bio Box -->
          ${authorKol.mini_cv ? `
          <div style="
            border-radius: 30px;
            border: 1px solid #e5e7eb;
            padding: 1rem;
            margin-bottom: 0.75rem;
          ">
            <p style="
              font-size: 0.875rem;
              color: #000000;
              line-height: 1.625;
              text-align: left;
              margin: 0;
            ">${authorKol.mini_cv}</p>
          </div>
          ` : ''}
          
          <!-- Lattes Link -->
          ${authorKol.lattes_url ? `
          <a
            href="${authorKol.lattes_url}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display: inline-block;
              margin-top: 0.75rem;
              font-size: 0.875rem;
              color: #1877F2;
              text-decoration: none;
              transition: text-decoration 0.2s;
            "
            onmouseover="this.style.textDecoration='underline'"
            onmouseout="this.style.textDecoration='none'"
          >Ver Currículo Lattes</a>
          ` : ''}
          
          <!-- Transparency Notice -->
          <div style="
            margin-top: 1rem;
            padding: 1rem;
            background: #f3f4f6;
            border-radius: 12px;
            border-left: 4px solid #1877F2;
          ">
            <p style="
              margin: 0;
              font-size: 0.75rem;
              color: #6b7280;
              line-height: 1.5;
            ">
              <strong>Transparência:</strong> Este artigo foi escrito com base em testes práticos realizados pelo autor. Smart Dent apenas fornece materiais necessários para desenvolvimento do conteúdo, mas não afeta nossas recomendações.
            </p>
          </div>
        </div>
      </div>
    </section>
    ` : ''}
    
    ${selectedProducts && selectedProducts.length > 0 && selectedProducts.some((p: any) => p.technical_specifications && p.technical_specifications.length > 0) ? `
    <section class="technical-specs-section">
      <h2>Especificações Técnicas</h2>
      <div class="specs-grid">
        ${selectedProducts
          .flatMap((p: any) => p.technical_specifications || [])
          .filter((spec: any) => spec.label && spec.value)
          .map((spec: any) => `
            <div class="spec-item">
              <dt>${spec.label || spec.property || spec.name}</dt>
              <dd>${spec.value || spec.description}</dd>
            </div>
          `).join('')}
      </div>
    </section>
    ` : ''}
    
    ${excludeFooter ? '' : `
    ${companySEO?.companyFooter || ''}
    ${(() => {
      // ✅ FASE 4: Adicionar footer com links SEO domains
      const seoDomainsFooter = generateSEODomainsFooter(trackingConfig);
      return seoDomainsFooter;
    })()}
    ${companySEO?.institutionalLinksHtml ? `
    <section class="institutional-links">
      ${companySEO.institutionalLinksHtml}
    </section>
    ` : ''}
    <footer>
      <p>&copy; ${new Date().getFullYear()} ${domain}. Todos os direitos reservados.</p>
      <p><small>Conteúdo gerado com tecnologia avançada de SEO</small></p>
      <p><small>URL: ${canonicalUrl}</small></p>
    </footer>`}
  </div>
  
  <script>
    function toggleReadMore(btn) {
      var cardContent = btn.closest('.post-card-content') || btn.closest('.featured-post-content');
      if (!cardContent) return;
      
      var fullContent = cardContent.querySelector('.full-content');
      var previewContent = cardContent.querySelector('.preview-content');
      if (!fullContent) return;
      
      var isExpanded = fullContent.classList.contains('expanded');
      fullContent.classList.toggle('expanded');
      btn.textContent = isExpanded ? 'Leia mais →' : 'Fechar ↑';
      
      if (previewContent) {
        previewContent.style.display = isExpanded ? 'block' : 'none';
      }
    }
  </script>
  
  <!-- ✅ SMOOTH SCROLL SCRIPT -->
  ${generateSmoothScrollScript()}
</body>
</html>`;

    // PATCH 5: Blindagem final anti-rótulos internos
    return stripInternalLabels(finalHTML);
  }, []);

  const generateEmailWebViewHTML = useCallback(async (options: {
    subject: string;
    content: string;
    domain: string;
    unsubscribeUrl?: string;
  }): Promise<string> => {
    const { subject, content, domain, unsubscribeUrl } = options;
    const canonicalUrl = `https://${domain}/email-view`;

    return await generateOptimizedHTML({
      title: `Email: ${subject}`,
      description: `Visualização web do email: ${subject}`,
      content: `
        <div class="email-container">
          <div class="email-header">
            <h2>📧 Visualização Web do Email</h2>
            <p><strong>Assunto:</strong> ${subject}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          
          <div class="email-content">
            ${content}
          </div>
          
          ${unsubscribeUrl ? `
          <div class="email-footer">
            <p><small>Para cancelar o recebimento de emails, <a href="${unsubscribeUrl}">clique aqui</a>.</small></p>
          </div>
          ` : ''}
        </div>
        
        <style>
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #f9f9f9;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .email-header {
            background: #007bff;
            color: white;
            padding: 20px;
            text-align: center;
          }
          
          .email-header h2 {
            margin: 0 0 15px 0;
            color: white;
          }
          
          .email-content {
            padding: 30px;
            background: white;
          }
          
          .email-footer {
            padding: 15px;
            background: #f0f0f0;
            text-align: center;
            border-top: 1px solid #ddd;
          }
        </style>
      `,
      domain,
      canonicalUrl,
      type: 'article'
    });
  }, [generateOptimizedHTML]);

  return {
    generateOptimizedHTML,
    generateConsolidatedBlogHTML,
    generateEmailWebViewHTML
  };
};