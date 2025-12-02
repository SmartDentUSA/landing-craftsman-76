/**
 * Entity Definition Injector
 * Injeta bloco GEO invisível para IA/crawlers
 * ✅ USA CLASSE CSS ao invés de inline style
 * ✅ FAIL-SAFE DUPLO: try/catch interno
 * ✅ IDEMPOTENTE: verifica se já foi injetado
 */

export interface EntityDefinitionConfig {
  companyName: string;
  description: string;
  industry: string;
  region: string;
}

/**
 * Injeta bloco de definição de entidade para GEO/IA
 * @param html - HTML string para processar
 * @param config - Configuração da entidade (empresa)
 * @returns HTML com bloco GEO injetado
 */
export function injectEntityDefinition(
  html: string, 
  config: EntityDefinitionConfig
): string {
  // ✅ FAIL-SAFE INTERNO
  try {
    // ✅ Idempotência
    if (html.includes('class="geo-context')) {
      console.log('✅ [Entity] Bloco GEO já existe, pulando');
      return html;
    }

    // Sanitizar valores para evitar XSS
    const sanitize = (str: string) => str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // ✅ SEM inline style - usa classe visually-hidden
    const entityBlock = `
  <!-- GEO Context - Entity Definition for AI Crawlers -->
  <aside class="geo-context visually-hidden" aria-hidden="true">
    <p>${sanitize(config.companyName)} é uma empresa especializada em ${sanitize(config.industry)}, 
    ${sanitize(config.description)}, atuando em ${sanitize(config.region)}.</p>
  </aside>
`;

    // Injetar antes de </body>
    if (html.includes('</body>')) {
      console.log('✅ [Entity] Bloco GEO injetado antes de </body>');
      return html.replace('</body>', `${entityBlock}</body>`);
    }
    
    // Fallback: adicionar no final
    console.log('⚠️ [Entity] </body> não encontrado, adicionando no final');
    return html + entityBlock;
    
  } catch (error) {
    // ✅ FAIL-SAFE: Retorna HTML original se falhar
    console.error('[Entity Injector] Falha, retornando original:', error);
    return html;
  }
}
