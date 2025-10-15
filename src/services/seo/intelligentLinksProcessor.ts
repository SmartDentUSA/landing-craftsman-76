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
    
    // Add keywords as links too
    const keywords = [
      ...(Array.isArray(product.keywords) ? product.keywords : []),
      ...(Array.isArray(product.market_keywords) ? product.market_keywords : [])
    ];
    
    keywords.forEach(keyword => {
      if (keyword && keyword.length > 3) {
        intelligentLinks[keyword.toLowerCase()] = product.productUrl || `${canonicalUrl}/produto/${product.id}`;
      }
    });
  });
  
  return intelligentLinks;
}

export function applyIntelligentLinks(
  content: string,
  linksMap: Record<string, string>
): string {
  let processedContent = content;
  
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
