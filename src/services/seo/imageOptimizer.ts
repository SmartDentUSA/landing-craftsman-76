/**
 * Image Optimization Service
 * Gera tags de imagem otimizadas com srcset, lazy loading e WebP/AVIF
 */

export interface ImageOptimizationOptions {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  className?: string;
  quality?: number;
}

/**
 * Gera srcset com múltiplas resoluções
 */
function generateSrcSet(baseUrl: string, widths: number[], format: 'webp' | 'avif' | 'jpeg' = 'webp'): string {
  return widths
    .map(w => {
      const optimizedUrl = `${baseUrl}?width=${w}&format=${format}&quality=85`;
      return `${optimizedUrl} ${w}w`;
    })
    .join(', ');
}

/**
 * Gera <picture> element com WebP/AVIF fallback
 */
export function generateResponsiveImage(options: ImageOptimizationOptions): string {
  const {
    src,
    alt,
    width = 1200,
    height,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px',
    loading = 'lazy',
    className = '',
    quality = 85
  } = options;

  // Dimensões responsivas padrão
  const responsiveWidths = [400, 800, 1200, 1600, 1920];
  
  // Calcular aspect ratio para evitar CLS
  const aspectRatio = height && width ? (height / width) : undefined;
  const styleAttr = aspectRatio 
    ? `style="aspect-ratio: ${width}/${height};"` 
    : width && height 
    ? `width="${width}" height="${height}"` 
    : '';

  // Detectar se a imagem já está em um serviço de otimização
  const needsOptimization = !src.includes('cloudflare') && !src.includes('cdn');

  if (!needsOptimization) {
    // Imagem já otimizada, retornar <img> simples
    return `<img src="${src}" alt="${alt}" ${styleAttr} loading="${loading}" class="${className}" decoding="async">`;
  }

  // Gerar <picture> com múltiplos formatos
  return `
<picture>
  <!-- AVIF (melhor compressão, ~50% menor que WebP) -->
  <source 
    type="image/avif" 
    srcset="${generateSrcSet(src, responsiveWidths, 'avif')}"
    sizes="${sizes}">
  
  <!-- WebP (amplo suporte, ~30% menor que JPEG) -->
  <source 
    type="image/webp" 
    srcset="${generateSrcSet(src, responsiveWidths, 'webp')}"
    sizes="${sizes}">
  
  <!-- Fallback JPEG (compatibilidade universal) -->
  <img 
    src="${src}?width=${width}&quality=${quality}" 
    srcset="${generateSrcSet(src, responsiveWidths, 'jpeg')}"
    sizes="${sizes}"
    alt="${alt}" 
    ${styleAttr}
    loading="${loading}" 
    decoding="async"
    class="${className}">
</picture>`.trim();
}

/**
 * Extrai e otimiza todas as imagens do conteúdo HTML
 */
export function optimizeContentImages(htmlContent: string): string {
  // Regex para encontrar <img> tags
  const imgRegex = /<img\s+([^>]*src=["']([^"']+)["'][^>]*)>/gi;
  
  let optimizedContent = htmlContent;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(htmlContent)) !== null) {
    const fullImgTag = match[0];
    const attributes = match[1];
    const src = match[2];
    
    // Extrair alt text (obrigatório para SEO)
    const altMatch = /alt=["']([^"']*)["']/i.exec(attributes);
    const alt = altMatch ? altMatch[1] : 'Imagem';
    
    // Extrair dimensões se existirem
    const widthMatch = /width=["']?(\d+)["']?/i.exec(attributes);
    const heightMatch = /height=["']?(\d+)["']?/i.exec(attributes);
    const width = widthMatch ? parseInt(widthMatch[1]) : undefined;
    const height = heightMatch ? parseInt(heightMatch[1]) : undefined;
    
    // Extrair class
    const classMatch = /class=["']([^"']*)["']/i.exec(attributes);
    const className = classMatch ? classMatch[1] : '';
    
    // Gerar imagem otimizada
    const optimizedImg = generateResponsiveImage({
      src,
      alt,
      width,
      height,
      className,
      loading: 'lazy'
    });
    
    // Substituir no conteúdo
    optimizedContent = optimizedContent.replace(fullImgTag, optimizedImg);
  }
  
  return optimizedContent;
}

/**
 * Gera resource hints para imagens acima da dobra
 */
export function generateImagePreloadHints(heroImages: string[]): string {
  if (!heroImages.length) return '';
  
  return heroImages
    .slice(0, 2) // Apenas 2 primeiras imagens (LCP)
    .map(src => {
      // Preload WebP para navegadores modernos
      return `<link rel="preload" as="image" href="${src}?format=webp&width=1200&quality=85" type="image/webp">`;
    })
    .join('\n  ');
}

/**
 * Adiciona fetchpriority="high" para imagem LCP
 */
export function markLCPImage(htmlContent: string): string {
  // Primeira imagem do conteúdo = provável LCP
  return htmlContent.replace(
    /(<(?:img|picture)[^>]*)(>)/i,
    '$1 fetchpriority="high"$2'
  );
}
