/**
 * Serviço para construção de meta tags SEO e Open Graph
 * Extraído de useSEOHTMLGenerator para melhor modularidade
 */

import { validateMetaDescription } from '@/lib/seo-validators';

export interface GalleryImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  is_main?: boolean;
}

export interface MetaTagsOptions {
  title: string;
  description: string;
  canonicalUrl: string;
  domain: string;
  ogImage?: string; // Mantido para compatibilidade
  ogType?: string;
  twitterCard?: string;
  keywords?: string[];
  robots?: string;
  // ✅ FASE 4: Galeria de imagens para múltiplas og:image
  imagesGallery?: GalleryImage[];
  // ✅ FASE 5: Domínios SEO para canonical alternativo
  seoDomains?: Array<{
    domain: string;
    enabled: boolean;
    use_in_seo: boolean;
    priority: number;
  }>;
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
    robots = 'index, follow',
    imagesGallery = [],
    seoDomains = []
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
    
    // Twitter Card
    `<meta name="twitter:card" content="${twitterCard}">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    
    // Canonical
    `<link rel="canonical" href="${canonicalUrl}">`
  ];
  
  // ✅ FASE 4: Múltiplas imagens da galeria para melhor indexação Google Images
  if (imagesGallery.length > 0) {
    // Priorizar imagem principal
    const sortedImages = [...imagesGallery].sort((a, b) => {
      if (a.is_main && !b.is_main) return -1;
      if (!a.is_main && b.is_main) return 1;
      return 0;
    });
    
    sortedImages.forEach((img, index) => {
      // Open Graph images (múltiplas são suportadas)
      metaTags.push(`<meta property="og:image" content="${img.url}">`);
      
      if (img.alt) {
        metaTags.push(`<meta property="og:image:alt" content="${img.alt}">`);
      }
      
      if (img.width) {
        metaTags.push(`<meta property="og:image:width" content="${img.width}">`);
      }
      
      if (img.height) {
        metaTags.push(`<meta property="og:image:height" content="${img.height}">`);
      }
      
      // Twitter usa apenas primeira imagem
      if (index === 0) {
        metaTags.push(`<meta name="twitter:image" content="${img.url}">`);
        if (img.alt) {
          metaTags.push(`<meta name="twitter:image:alt" content="${img.alt}">`);
        }
      }
    });
    
    console.log(`✅ FASE 4: ${sortedImages.length} imagens adicionadas às meta tags OG`);
  } else if (ogImage) {
    // Fallback para compatibilidade com código legado
    metaTags.push(`<meta property="og:image" content="${ogImage}">`);
    metaTags.push(`<meta name="twitter:image" content="${ogImage}">`);
  }
  
  // ✅ FASE 5: Adicionar canonical alternativo se houver domínio SEO primário
  const primarySEODomain = seoDomains.find(
    d => d.enabled && d.use_in_seo && d.priority === 1
  );
  
  if (primarySEODomain && canonicalUrl) {
    const alternateUrl = canonicalUrl.replace(
      /^https?:\/\/[^\/]+/, 
      `https://${primarySEODomain.domain}`
    );
    metaTags.push(`<link rel="alternate" href="${alternateUrl}" hreflang="pt-br" />`);
    console.log(`✅ FASE 5: Canonical alternativo adicionado: ${alternateUrl}`);
  }
  
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

/**
 * Enriquece meta description com keywords de artigos do Knowledge Feed
 */
export function enrichMetaWithFeedKeywords(
  existingMeta: string,
  articleKeywords: string[]
): string {
  if (!articleKeywords || articleKeywords.length === 0) {
    return existingMeta;
  }

  // Pegar top 5 keywords para adicionar à meta
  const topKeywords = articleKeywords.slice(0, 5);
  
  // Adicionar keywords de forma natural ao final da meta description
  const enrichedDescription = `${existingMeta} Saiba mais sobre: ${topKeywords.join(', ')}.`;
  
  // Garantir que não ultrapasse 160 caracteres
  if (enrichedDescription.length > 160) {
    // Truncar mantendo as keywords mais importantes
    const baseLength = existingMeta.length;
    const remainingSpace = 160 - baseLength - 15; // 15 para " Saiba mais sobre: "
    
    if (remainingSpace > 20) {
      const shortenedKeywords = topKeywords.slice(0, 3).join(', ');
      return `${existingMeta} Saiba mais sobre: ${shortenedKeywords}.`.substring(0, 160);
    }
    
    return existingMeta.substring(0, 160);
  }
  
  return enrichedDescription;
}
