/**
 * Serviço para processamento de links inteligentes
 * Extraído de useSEOHTMLGenerator para melhor modularidade
 */

export function buildIntelligentLinksMap(
  selectedProducts: any[] = [],
  canonicalUrl: string
): Record<string, string> {
  const intelligentLinks: Record<string, string> = {};
  
  selectedProducts.forEach(product => {
    if (product.name) {
      const productUrl = product.productUrl || `${canonicalUrl}/produto/${product.id}`;
      intelligentLinks[product.name.toLowerCase()] = productUrl;
    }
    
    // ✅ FASE 3: Priorizar bot_trigger_words (alta relevância SEO)
    const priorityKeywords = [
      ...(Array.isArray(product.bot_trigger_words) ? product.bot_trigger_words : []),
      ...(Array.isArray(product.keywords) ? product.keywords : []),
      ...(Array.isArray(product.market_keywords) ? product.market_keywords : []),
      ...(Array.isArray(product.search_intent_keywords) ? product.search_intent_keywords : [])
    ];
    
    priorityKeywords.forEach(keyword => {
      if (keyword && keyword.length > 3) {
        intelligentLinks[keyword.toLowerCase()] = product.productUrl || `${canonicalUrl}/produto/${product.id}`;
      }
    });
    
    // ✅ FASE 3: Adicionar delivery_approach como anchor text contextual
    if (product.delivery_approach && product.delivery_approach.length > 5) {
      intelligentLinks[product.delivery_approach.toLowerCase()] = product.productUrl || `${canonicalUrl}/produto/${product.id}`;
    }
  });
  
  return intelligentLinks;
}

export function applyIntelligentLinks(
  content: string,
  linksMap: Record<string, string>
): string {
  let processedContent = content;
  
  // ✅ FASE 4: Converter links markdown [texto](# "tooltip") → HTML
  processedContent = processedContent.replace(
    /\[([^\]]+)\]\(#\s*["']([^"']+)["']\)/g,
    '<a href="#" title="$2">$1</a>'
  );
  
  // Apply links to content
  Object.entries(linksMap).forEach(([keyword, url]) => {
    // Criar regex que não substitui dentro de tags HTML
    const regex = new RegExp(`(?<!<[^>]*)\\b${keyword}\\b(?![^<]*>)`, 'gi');
    processedContent = processedContent.replace(regex, (match) => {
      return `<a href="${url}" title="${match}">${match}</a>`;
    });
  });
  
  return processedContent;
}
