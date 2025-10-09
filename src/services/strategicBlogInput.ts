/**
 * Strategic Blog Input Builder
 * Constrói o bloco estratégico do blog consolidado com auto-linking
 * 
 * NOTA: Esta funcionalidade foi removida pois era redundante com strategic-blog-generator
 * Este arquivo está mantido apenas para compatibilidade, mas retorna null
 */

import { stripInternalLabels, sanitizeAnchors } from '@/lib/sanitize-internal-labels';
import { applyAutoLinksOncePerTerm } from '@/lib/auto-link';

// Helper para converter markdown básico para HTML
// TODO: Substituir por conversor unificado do projeto se houver
function convertMarkdownToHTML(markdown: string): string {
  if (!markdown) return '';
  
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Wrap in paragraphs
    .replace(/^(.+)$/gm, '<p>$1</p>')
    // Clean up consecutive paragraph tags
    .replace(/<\/p>\s*<p>/g, '</p><p>')
    .trim();
}

interface StrategicBlogInput {
  baseTextHTML: string;
  keywords: Array<{ term: string; url: string }>;
}

/**
 * Constrói o conteúdo estratégico do blog com:
 * 1. Limpeza de rótulos internos
 * 2. Conversão MD → HTML
 * 3. Auto-linking (1ª ocorrência por termo)
 * 4. Sanitização de anchors
 */
export async function buildStrategicBlogInput(
  landingPageId: string,
  domainBaseUrl: string
): Promise<StrategicBlogInput | null> {
  // Funcionalidade removida - era redundante com strategic-blog-generator
  // Retorna null para não quebrar código existente
  console.warn('⚠️ buildStrategicBlogInput: Funcionalidade obsoleta, usar strategic-blog-generator');
  return null;
}
