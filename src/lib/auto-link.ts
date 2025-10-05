/**
 * Auto-Link Utility
 * Aplica links automaticamente no conteúdo, respeitando regras SEO
 */

interface AutoLinkItem {
  term: string;
  url: string;
}

interface AutoLinkOptions {
  maxLinks?: number;
  caseSensitive?: boolean;
}

/**
 * Aplica auto-links no HTML, garantindo:
 * - 1ª ocorrência por termo apenas
 * - Não linka dentro de: <a>, <button>, <h1>-<h6>, <script>, <style>
 * - Limite global de links
 */
export function applyAutoLinksOncePerTerm(
  html: string,
  items: AutoLinkItem[],
  options: AutoLinkOptions = {}
): string {
  if (!html || !items.length) return html;
  
  const { maxLinks = 12, caseSensitive = false } = options;
  const linkedTerms = new Set<string>();
  let linksApplied = 0;
  
  // Tags proibidas (não linkar dentro delas)
  const forbiddenTags = ['a', 'button', 'script', 'style', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const forbiddenRegex = new RegExp(
    `<(${forbiddenTags.join('|')})\\b[^>]*>.*?<\\/\\1>`,
    'gis'
  );
  
  // Dividir HTML em segmentos seguros vs proibidos
  const segments: { text: string; isForbidden: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  const regex = new RegExp(forbiddenRegex);
  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: html.slice(lastIndex, match.index), isForbidden: false });
    }
    segments.push({ text: match[0], isForbidden: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < html.length) {
    segments.push({ text: html.slice(lastIndex), isForbidden: false });
  }
  
  // Aplicar links apenas em segmentos seguros
  const processedSegments = segments.map(seg => {
    if (seg.isForbidden || linksApplied >= maxLinks) return seg.text;
    
    let text = seg.text;
    for (const item of items) {
      if (linksApplied >= maxLinks) break;
      if (linkedTerms.has(item.term.toLowerCase())) continue;
      
      const flags = caseSensitive ? 'g' : 'gi';
      const termRegex = new RegExp(`\\b(${escapeRegExp(item.term)})\\b`, flags);
      
      if (termRegex.test(text)) {
        text = text.replace(termRegex, (match) => {
          if (linksApplied >= maxLinks) return match;
          linkedTerms.add(item.term.toLowerCase());
          linksApplied++;
          return `<a href="${item.url}" title="${item.term}">${match}</a>`;
        });
      }
    }
    
    return text;
  });
  
  return processedSegments.join('');
}

/**
 * Escapa caracteres especiais de regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
