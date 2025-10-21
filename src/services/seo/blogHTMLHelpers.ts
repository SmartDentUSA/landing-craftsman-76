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
  
  const seen = new Set<string>();
  
  const tocItems = headings
    .map(h => {
      // ✅ Remover tags HTML e normalizar agressivamente
      const text = h
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, '') // Remover entidades HTML
        .trim();
      
      const id = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') // ✅ Remover hífens duplicados
        .replace(/^-|-$/g, ''); // ✅ Remover hífens nas pontas
      
      // ✅ Debug: Log para identificar duplicatas
      if (seen.has(id)) {
        console.warn(`⚠️ TOC: H2 duplicado ignorado: "${text}" (id: ${id})`);
        return null;
      }
      seen.add(id);
      
      return `<li><a href="#${id}">${text}</a></li>`;
    })
    .filter(Boolean)
    .join('');
  
  return tocItems; // ✅ Retornar apenas <li>s sem duplicatas
}

/**
 * Adiciona IDs aos H2s para navegação via TOC
 */
export function addIdsToHeadings(content: string): string {
  const seenIds = new Map<string, number>();
  
  return content.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (match, attrs, text) => {
    const plainText = text
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, '')
      .trim();
    
    let id = plainText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // ✅ Garantir ID único com sufixo -2, -3, etc
    if (seenIds.has(id)) {
      const count = seenIds.get(id)! + 1;
      seenIds.set(id, count);
      id = `${id}-${count}`;
      console.warn(`⚠️ IDs: H2 duplicado renomeado para "${id}"`);
    } else {
      seenIds.set(id, 1);
    }
    
    return `<h2${attrs} id="${id}">${text}</h2>`;
  });
}
