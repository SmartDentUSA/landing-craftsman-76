/**
 * Semantic HTML Enhancer
 * Converte divs genéricas para elementos semânticos HTML5
 * ✅ USA DOMParser NATIVO (browser) - NÃO usa regex destrutivo
 * ✅ FAIL-SAFE DUPLO: try/catch interno
 * ✅ IDEMPOTENTE: verifica se já foi processado
 */

interface SemanticRule {
  selector: string;
  newTag: string;
}

const SEMANTIC_RULES: SemanticRule[] = [
  { selector: '.hero-section', newTag: 'section' },
  { selector: '.indexable', newTag: 'article' },
  { selector: '.faq-section', newTag: 'section' },
  { selector: '.features-section', newTag: 'section' },
  { selector: '.benefits-section', newTag: 'section' },
  { selector: '.products-section', newTag: 'section' },
  { selector: '.testimonials-section', newTag: 'section' },
  { selector: '.cta-section', newTag: 'section' },
  { selector: '.blog-content', newTag: 'article' },
];

/**
 * Aplica melhorias semânticas ao HTML usando DOMParser nativo
 * @param html - HTML string para processar
 * @returns HTML com estrutura semântica melhorada
 */
export function enhanceSemanticStructure(html: string): string {
  // ✅ FAIL-SAFE INTERNO
  try {
    // ✅ Idempotência: Se já processado, retornar original
    if (html.includes('data-semantic-enhanced="true"')) {
      console.log('✅ [Semantic] HTML já processado, pulando');
      return html;
    }

    // ✅ DOMParser NATIVO do browser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let changesApplied = 0;

    // Aplicar substituições semânticas
    for (const rule of SEMANTIC_RULES) {
      const elements = doc.querySelectorAll(`div${rule.selector}`);
      
      elements.forEach((el) => {
        // Já é o elemento correto? Pular
        if (el.tagName.toLowerCase() === rule.newTag) return;
        
        // Criar novo elemento semântico
        const newEl = doc.createElement(rule.newTag);
        
        // Copiar todos os atributos
        Array.from(el.attributes).forEach(attr => {
          newEl.setAttribute(attr.name, attr.value);
        });
        
        // Copiar conteúdo interno
        newEl.innerHTML = el.innerHTML;
        
        // Substituir no DOM
        el.parentNode?.replaceChild(newEl, el);
        changesApplied++;
      });
    }

    // Marcar como processado (invisível)
    doc.documentElement.setAttribute('data-semantic-enhanced', 'true');

    if (changesApplied > 0) {
      console.log(`✅ [Semantic] ${changesApplied} elementos convertidos para tags semânticas`);
    }

    // Serializar de volta para HTML string
    // Preservar DOCTYPE se existia
    const hasDoctype = html.trim().toLowerCase().startsWith('<!doctype');
    const serialized = doc.documentElement.outerHTML;
    
    return hasDoctype ? `<!DOCTYPE html>\n${serialized}` : serialized;
    
  } catch (error) {
    // ✅ FAIL-SAFE: Retorna HTML original se falhar
    console.error('[Semantic Enhancer] Falha, retornando original:', error);
    return html;
  }
}
