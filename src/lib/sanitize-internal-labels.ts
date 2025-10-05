/**
 * Sanitization Utilities
 * Remove rótulos internos e previne estruturas HTML inválidas
 */

/**
 * Remove rótulos internos que não devem aparecer no HTML final
 * Exemplos: [nlog], [estratégico], [comercial], [técnico]
 */
export function stripInternalLabels(content: string): string {
  if (!content) return content;
  
  return content
    .replace(/\[nlog\]/gi, '')
    .replace(/\[estratégico\]/gi, '')
    .replace(/\[comercial\]/gi, '')
    .replace(/\[técnico\]/gi, '')
    .replace(/\[(estrategico|comercial|tecnico)\]/gi, '') // sem acento
    .trim();
}

/**
 * Previne anchors aninhados e anchors dentro de elementos interativos
 * Remove <a> dentro de: <a>, <button>, <h1>-<h6>
 */
export function sanitizeAnchors(html: string): string {
  if (!html) return html;
  
  // Regex para encontrar tags proibidas que podem conter <a>
  const forbiddenTags = /((?:<(?:a|button|h[1-6])\b[^>]*>)(.*?)(?:<\/(?:a|button|h[1-6])>))/gi;
  
  return html.replace(forbiddenTags, (match) => {
    // Remove qualquer <a> dentro dessas tags
    return match.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
  });
}
