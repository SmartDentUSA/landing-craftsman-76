/**
 * Funções auxiliares para geração de HTML de blogs
 */

/**
 * Gera Table of Contents (TOC) baseado nos H2s do conteúdo
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
  
  return `
  <nav class="toc" aria-label="Sumário do artigo">
    <h4>📋 Sumário</h4>
    <ul>${tocItems}</ul>
    <hr style="margin:12px 0;border:none;border-top:1px solid var(--border)" />
    <a class="small" href="https://${domain}">← Voltar ao site</a>
  </nav>
  `;
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
