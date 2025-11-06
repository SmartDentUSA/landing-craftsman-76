/**
 * Utilidades compartilhadas para geração de conteúdo SPIN
 */

export interface DataQualityResult {
  score: number;
  level: 'poor' | 'acceptable' | 'good' | 'excellent';
  missing_fields: string[];
}

/**
 * Calcula a qualidade dos dados dos produtos para validação pré-geração
 */
export function calculateDataQuality(products: any[]): DataQualityResult {
  if (!products || products.length === 0) {
    return { score: 0, level: 'poor', missing_fields: ['products'] };
  }

  let totalScore = 0;
  const missing: Set<string> = new Set();
  
  products.forEach(p => {
    let productScore = 0;
    
    if (p.name) productScore += 10;
    else missing.add('name');
    
    if (p.description && p.description.length > 50) productScore += 15;
    else missing.add('description');
    
    if (Array.isArray(p.benefits) && p.benefits.length > 0) productScore += 20;
    else missing.add('benefits');
    
    if (Array.isArray(p.features) && p.features.length > 0) productScore += 15;
    else missing.add('features');
    
    if (p.applications) productScore += 10;
    else missing.add('applications');
    
    if (p.video_captions) productScore += 15;
    
    if (Array.isArray(p.document_transcriptions) && p.document_transcriptions.length > 0) {
      productScore += 15;
    }
    
    totalScore += productScore;
  });
  
  const avgScore = Math.round(totalScore / products.length);
  
  let level: 'poor' | 'acceptable' | 'good' | 'excellent';
  if (avgScore >= 80) level = 'excellent';
  else if (avgScore >= 60) level = 'good';
  else if (avgScore >= 40) level = 'acceptable';
  else level = 'poor';
  
  return { 
    score: avgScore, 
    level, 
    missing_fields: Array.from(missing) 
  };
}

/**
 * Trunca texto mantendo integridade semântica
 */
export function truncateText(text: string, maxChars: number): string {
  if (!text || text.length <= maxChars) return text;
  
  // Tentar quebrar por frase
  const truncated = text.slice(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastPeriod > maxChars * 0.7) {
    return truncated.slice(0, lastPeriod + 1);
  } else if (lastSpace > maxChars * 0.8) {
    return truncated.slice(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Prioriza produtos por relevância (mais dados = mais prioritário)
 */
export function prioritizeProducts(
  products: any[], 
  painType: string, 
  maxProducts: number = 3
): any[] {
  if (products.length <= maxProducts) return products;
  
  // Calcular score de relevância para cada produto
  const scored = products.map(p => ({
    product: p,
    score: (
      (p.description ? 2 : 0) +
      (Array.isArray(p.benefits) ? p.benefits.length * 2 : 0) +
      (Array.isArray(p.features) ? p.features.length : 0) +
      (p.video_captions ? 3 : 0) +
      (Array.isArray(p.document_transcriptions) ? p.document_transcriptions.length * 2 : 0) +
      (p.applications ? 2 : 0)
    )
  }));
  
  // Ordenar por score decrescente
  scored.sort((a, b) => b.score - a.score);
  
  console.log('📊 Produtos priorizados:', scored.map(s => ({
    name: s.product.name,
    score: s.score
  })));
  
  return scored.slice(0, maxProducts).map(s => s.product);
}

/**
 * Processa produtos para geração: trunca vídeos e documentos
 */
export function processProductsForGeneration(products: any[]): any[] {
  return products.map(p => {
    const processed = { ...p };
    
    // Truncar video_captions
    if (processed.video_captions && typeof processed.video_captions === 'object') {
      processed.video_captions = Object.fromEntries(
        Object.entries(processed.video_captions).map(([key, videos]) => [
          key,
          Array.isArray(videos) ? videos.map((v: any) => ({
            ...v,
            summary: truncateText(v.summary || '', 200)
          })) : []
        ])
      );
    }
    
    // Truncar document_transcriptions
    if (Array.isArray(processed.document_transcriptions)) {
      processed.document_transcriptions = processed.document_transcriptions.map((d: any) => ({
        ...d,
        extracted_data: d.extracted_data ? {
          ...d.extracted_data,
          summary: truncateText(d.extracted_data.summary || '', 200),
          description: truncateText(d.extracted_data.description || '', 200)
        } : null
      }));
    }
    
    return processed;
  });
}

/**
 * Extrai URLs de vídeos YouTube de diferentes estruturas de dados
 */
export function extractVideoUrls(product: any): string[] {
  const urls: string[] = [];
  
  // YouTube videos array
  if (Array.isArray(product.youtube_videos)) {
    urls.push(...product.youtube_videos.filter((v: string) => v));
  }
  
  // Technical videos
  if (Array.isArray(product.technical_videos)) {
    urls.push(...product.technical_videos.filter((v: string) => v));
  }
  
  // Testimonial videos
  if (Array.isArray(product.testimonial_videos)) {
    urls.push(...product.testimonial_videos.filter((v: string) => v));
  }
  
  return urls;
}
