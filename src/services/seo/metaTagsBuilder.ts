/**
 * Serviço para construção de meta tags SEO e Open Graph
 * Extraído de useSEOHTMLGenerator para melhor modularidade
 */

import { validateMetaDescription } from '@/lib/seo-validators';

export interface MetaTagsOptions {
  title: string;
  description: string;
  canonicalUrl: string;
  domain: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  keywords?: string[];
  robots?: string;
}

export function buildMetaTags(options: MetaTagsOptions): string {
  const {
    title,
    description,
    canonicalUrl,
    domain,
    ogImage,
    ogType = 'website',
    twitterCard = 'summary_large_image',
    keywords = [],
    robots = 'index, follow'
  } = options;
  
  // Validate meta description
  const validation = validateMetaDescription(description);
  if (!validation.valid) {
    console.warn('⚠️ Meta description validation warnings:', validation.warnings);
  }
  
  const metaTags = [
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `<meta name="description" content="${description}">`,
    `<meta name="robots" content="${robots}">`,
    keywords.length > 0 ? `<meta name="keywords" content="${keywords.join(', ')}">` : '',
    
    // Open Graph
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonicalUrl}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:site_name" content="${domain}">`,
    ogImage ? `<meta property="og:image" content="${ogImage}">` : '',
    
    // Twitter Card
    `<meta name="twitter:card" content="${twitterCard}">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    ogImage ? `<meta name="twitter:image" content="${ogImage}">` : '',
    
    // Canonical
    `<link rel="canonical" href="${canonicalUrl}">`
  ];
  
  return metaTags.filter(tag => tag).join('\n    ');
}

export function truncateSEOTitle(title: string, maxLength = 60): string {
  if (title.length <= maxLength) return title;
  
  // Truncar no último espaço antes do limite
  const truncated = title.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}
