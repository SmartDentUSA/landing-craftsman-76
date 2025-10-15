import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML de conteúdo de blog para prevenir XSS
 * Permite apenas tags seguras e remove scripts/eventos
 */
export const sanitizeBlogContent = (html: string): string => {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 
      'class', 'id',
      'src', 'alt', 'width', 'height',
      'style'
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true
  });
};

/**
 * Sanitiza conteúdo para preview de WhatsApp (apenas quebras de linha)
 */
export const sanitizeSimpleText = (text: string): string => {
  if (!text) return '';
  
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['br'],
    ALLOWED_ATTR: []
  });
};
