/**
 * JSON-LD Validation & Sanitization Utilities
 * Funções para garantir que reviews schema não excedam 100KB e sejam seguros
 */

/**
 * Valida se o JSON-LD está dentro do limite de 100KB
 * @returns true se válido (< 100KB), false caso contrário
 */
export function validateJsonLdSize(jsonLd: string): boolean {
  const sizeInBytes = new Blob([jsonLd]).size;
  const sizeInKB = sizeInBytes / 1024;
  
  if (sizeInKB > 100) {
    console.warn(`⚠️ JSON-LD schema muito grande: ${sizeInKB.toFixed(2)}KB (máximo 100KB)`);
    return false;
  }
  
  return true;
}

/**
 * Sanitiza rating para garantir que está no range 1-5
 */
export function sanitizeReviewRating(rating: number | string | undefined): number {
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  
  if (!num || isNaN(num)) return 5; // Default para 5 estrelas se inválido
  if (num < 1) return 1;
  if (num > 5) return 5;
  
  return Math.round(num * 10) / 10; // Arredondar para 1 casa decimal
}

/**
 * Trunca texto de review para evitar JSON-LD muito grande
 * Máximo 1000 caracteres por review
 */
export function truncateReviewBody(text: string | undefined, maxLength: number = 1000): string {
  if (!text) return '';
  
  const sanitized = stripHtml(text.trim());
  
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  
  return sanitized.substring(0, maxLength - 3) + '...';
}

/**
 * Remove tags HTML de texto (segurança)
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  // Remove todas as tags HTML
  let text = html.replace(/<[^>]*>/g, '');
  
  // Remove múltiplos espaços em branco
  text = text.replace(/\s+/g, ' ');
  
  // Remove caracteres de escape
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  return text.trim();
}

/**
 * Sanitiza dados completos de review para segurança
 */
export function sanitizeReviewData(review: any): {
  author_name: string;
  rating: number;
  review_text: string;
  review_date?: string;
} {
  return {
    author_name: stripHtml(review.author_name || 'Cliente Verificado').substring(0, 100),
    rating: sanitizeReviewRating(review.rating),
    review_text: truncateReviewBody(review.review_text || review.testimonial_text),
    review_date: review.review_date || review.approved_at || review.created_at || new Date().toISOString()
  };
}

/**
 * Calcula tamanho aproximado de um objeto JSON em KB
 */
export function estimateJsonSizeKB(obj: any): number {
  try {
    const jsonString = JSON.stringify(obj);
    return new Blob([jsonString]).size / 1024;
  } catch (error) {
    console.error('Erro ao calcular tamanho JSON:', error);
    return 0;
  }
}

/**
 * Trunca array de reviews para caber em 100KB mantendo os melhores reviews
 * @param reviews Array de reviews já sanitizados
 * @param maxReviews Número máximo de reviews a manter
 * @returns Array de reviews truncado
 */
export function truncateReviewsForSize(reviews: any[], maxReviews: number = 15): any[] {
  // Ordenar por rating (maiores primeiro) e limitar quantidade
  return reviews
    .sort((a, b) => b.rating - a.rating)
    .slice(0, maxReviews);
}
