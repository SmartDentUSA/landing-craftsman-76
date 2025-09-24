/**
 * Blog utility functions for normalizing AI responses and blog data
 */

interface AiBlogResponse {
  title: string;
  content: string;
  metaDescription?: string;
  meta_description?: string;
  keywords: string[] | string;
}

interface NormalizedBlogData {
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
}

/**
 * Normalizes AI blog response to internal BlogPost format
 * Handles field name inconsistencies and type conversions
 */
export function normalizeAiBlog(payload: AiBlogResponse): NormalizedBlogData {
  // Normalize keywords to array
  let keywords: string[] = [];
  if (Array.isArray(payload.keywords)) {
    keywords = payload.keywords;
  } else if (typeof payload.keywords === 'string') {
    keywords = payload.keywords.split(',').map(k => k.trim()).filter(Boolean);
  }

  // Handle meta_description vs metaDescription
  const metaDescription = payload.meta_description || payload.metaDescription || '';

  return {
    title: payload.title || '',
    content: payload.content || '',
    meta_description: metaDescription,
    keywords
  };
}

/**
 * Helper to ensure keywords is always an array
 */
export function normalizeKeywords(keywords: any): string[] {
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === 'string') return keywords.split(',').map(k => k.trim()).filter(Boolean);
  return [];
}