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

/**
 * Converts markdown to HTML including image support
 */
export function convertMarkdownToHTML(markdown: string): string {
  return markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g, '<img src="$2" alt="$1" title="$3" loading="lazy" style="max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0;" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, '<br>');
}