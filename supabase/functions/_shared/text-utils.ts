/**
 * Shared text utilities for Google Ads pipeline.
 * Single source of truth for normalization, truncation and semantic blocklists.
 */

/**
 * Normalize string: lowercase, NFD-decompose, strip diacritics, trim.
 * Use for ANY case/accent-insensitive comparison.
 */
export function normalize(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Truncate text to maxLength.
 * - If text fits, return as-is.
 * - If a space exists ABOVE the 50% threshold, cut at that space (preserves word boundary).
 * - Otherwise, hard-truncate (better than returning a 5-char rump).
 * - NEVER appends "..." (Google Ads counts every char + reticências looks bad in RSA).
 */
export function intelligentTruncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) {
    return truncated.substring(0, lastSpace).trim();
  }
  return truncated.trim();
}

/**
 * Structural pattern that catches LLM meta-vocabulary (the kind of garbage that
 * leaked into products_repository.keywords as "palavras-chave do produto",
 * "taxonomia do produto", "metadados do produto", etc.).
 *
 * Bloqueia padrão: <meta-termo> [d(a|o|os|as)] produto[s]
 * Não bloqueia palavras isoladas legítimas como "categorias de resina dental".
 */
export const LLM_META_PATTERN = /\b(palavras-chave|palavras chave|vocabulario|vocabulário|taxonomia|metadados|metadata|glossario|glossário|dicionario|dicionário|repositorio|repositório|indice|índice|catalogo|catálogo|banco|lista|gerador|ferramenta|otimizacao|otimização)\s+(d[aeo]s?\s+)?produtos?\b/i;

/**
 * Standalone tokens that are always invalid as a Google Ads keyword
 * (these are field/column names that got copy-pasted into the keyword array).
 */
export const STANDALONE_BLOCKLIST = ['ai_keywords', 'seo_keywords', 'keyword_list', 'keywords', 'metadata'];

/**
 * Template placeholders that the LLM forgot to substitute (e.g. "[nome do produto]").
 */
export const TEMPLATE_PLACEHOLDER_PATTERN = /\[(nome|categoria|público-alvo|publico-alvo|local|adjetivo|concorrente)[^\]]*\]/i;

/**
 * Returns the first matching pattern label, or null if the keyword is clean.
 * Used by isValidKeyword to log structured reasons.
 */
export function detectMetaPattern(keyword: string): string | null {
  const norm = normalize(keyword);
  if (TEMPLATE_PLACEHOLDER_PATTERN.test(keyword)) return 'TEMPLATE_PLACEHOLDER';
  if (LLM_META_PATTERN.test(norm)) return 'LLM_META_PATTERN';
  for (const banned of STANDALONE_BLOCKLIST) {
    if (norm === normalize(banned)) return `STANDALONE:${banned}`;
  }
  return null;
}
