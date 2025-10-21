/**
 * Funções auxiliares para geração de HTML de blogs
 */

/**
 * Gera Table of Contents (TOC) baseado nos H2s do conteúdo
 * ✅ ATUALIZADO: Retorna apenas <li>s, não <nav> completo
 */
export function generateTableOfContents(content: string, domain: string): string {
  const headings = content.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  
  if (headings.length === 0) {
    return ''; // Sem H2s, sem TOC
  }
  
  const tocItems = headings.map(h => {
    const text = h.replace(/<[^>]*>/g, ''); // Remove tags HTML
    const id = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    return `<li><a href="#${id}">${text}</a></li>`;
  }).join('');
  
  return tocItems; // ✅ Retornar apenas <li>s
}

/**
 * Adiciona IDs aos H2s para navegação via TOC
 */
export function addIdsToHeadings(content: string): string {
  return content.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (match, attrs, text) => {
    const plainText = text.replace(/<[^>]*>/g, '');
    const id = plainText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    return `<h2${attrs} id="${id}">${text}</h2>`;
  });
}
