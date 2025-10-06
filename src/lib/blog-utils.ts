/**
 * Blog utility functions for normalizing AI responses and blog data
 */

import { marked } from 'marked';

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
 * Normalizes blog content from various formats (JSON, Markdown, HTML) to clean HTML
 * Handles legacy JSON-wrapped content and markdown conversion
 */
export function normalizeBlogContent(rawContent: string): string {
  if (!rawContent || typeof rawContent !== 'string') {
    return '';
  }

  let cleanContent = rawContent.trim();

  // Remove code fences (```json ... ```)
  cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(cleanContent);
    if (parsed.content) {
      // Extract the content field from JSON
      cleanContent = parsed.content;
    }
  } catch {
    // Not JSON, continue with raw content
  }

  // Check if it's markdown (contains markdown syntax)
  const hasMarkdownSyntax = /^#{1,6}\s+|^\*\*|^\*|^\[.+\]\(.+\)|^!\[/.test(cleanContent);
  
  if (hasMarkdownSyntax) {
    // Convert markdown to HTML using marked
    try {
      cleanContent = marked.parse(cleanContent) as string;
    } catch (error) {
      console.warn('Failed to parse markdown, using fallback:', error);
      cleanContent = convertMarkdownToHTMLFallback(cleanContent);
    }
  }

  return cleanContent;
}

/**
 * Converts markdown to HTML including image support (fallback)
 */
function convertMarkdownToHTMLFallback(markdown: string): string {
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

/**
 * Converts markdown to HTML (public API - uses marked library)
 */
export function convertMarkdownToHTML(markdown: string): string {
  try {
    return marked.parse(markdown) as string;
  } catch {
    return convertMarkdownToHTMLFallback(markdown);
  }
}