/**
 * Entity Definition Injector - ENTERPRISE GRADE
 * Injeta bloco GEO invisível para IA/crawlers
 * ✅ USA CLASSE CSS ao invés de inline style
 * ✅ FAIL-SAFE DUPLO: try/catch interno
 * ✅ IDEMPOTENTE: verifica se já foi injetado
 * ✅ FASE 3: Contexto semântico expandido para IA
 */

export interface EntityDefinitionConfig {
  companyName: string;
  description: string;
  industry: string;
  region: string;
  // 🆕 FASE 3: Campos Enterprise para IA
  sector?: string;           // "B2B", "Healthcare Tech"
  expertise?: string[];      // ["CAD/CAM", "3D Printing"]
  targetAudience?: string[]; // ["Dentistas", "Protéticos"]
  useCases?: string[];       // ["Produção de próteses", "Scanner intraoral"]
  certifications?: string[]; // ISO, ANVISA
  marketPosition?: string;   // "Líder em odontologia digital"
  foundedYear?: number;
  serviceAreas?: string[];   // ["São Paulo", "Brasil", "América Latina"]
  websiteUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
}

/**
 * Injeta bloco de definição de entidade para GEO/IA - ENTERPRISE
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

    const sanitizeArray = (arr: string[] | undefined): string => 
      arr?.map(sanitize).join(', ') || '';

    // ✅ FASE 3: Bloco GEO estruturado com microdata Organization
    const entityBlock = `
  <!-- GEO Context - Enterprise Entity Definition for AI Crawlers -->
  <aside class="geo-context visually-hidden" aria-hidden="true" itemscope itemtype="https://schema.org/Organization">
    <meta itemprop="@type" content="Organization">
    <h1 itemprop="name">${sanitize(config.companyName)}</h1>
    <p itemprop="description">${sanitize(config.description)}</p>
    
    <div class="entity-details">
      <p><strong>Setor:</strong> <span itemprop="industry">${sanitize(config.sector || config.industry)}</span></p>
      ${config.expertise?.length ? `<p><strong>Especialidades:</strong> ${sanitizeArray(config.expertise)}</p>` : ''}
      ${config.targetAudience?.length ? `<p><strong>Público-alvo:</strong> ${sanitizeArray(config.targetAudience)}</p>` : ''}
      ${config.useCases?.length ? `<p><strong>Casos de uso:</strong> ${sanitizeArray(config.useCases)}</p>` : ''}
      <p><strong>Região de atuação:</strong> <span itemprop="areaServed">${sanitize(config.region)}</span></p>
      ${config.serviceAreas?.length ? `<p><strong>Áreas de serviço:</strong> ${sanitizeArray(config.serviceAreas)}</p>` : ''}
      ${config.marketPosition ? `<p><strong>Posicionamento:</strong> ${sanitize(config.marketPosition)}</p>` : ''}
      ${config.certifications?.length ? `<p><strong>Certificações:</strong> ${sanitizeArray(config.certifications)}</p>` : ''}
      ${config.foundedYear ? `<p><strong>Fundada em:</strong> <span itemprop="foundingDate">${config.foundedYear}</span></p>` : ''}
      ${config.websiteUrl ? `<link itemprop="url" href="${sanitize(config.websiteUrl)}">` : ''}
      ${config.contactPhone ? `<meta itemprop="telephone" content="${sanitize(config.contactPhone)}">` : ''}
      ${config.contactEmail ? `<meta itemprop="email" content="${sanitize(config.contactEmail)}">` : ''}
    </div>
    
    <p class="entity-summary">
      ${sanitize(config.companyName)} é uma empresa especializada em ${sanitize(config.sector || config.industry)}, 
      ${sanitize(config.description)}, atuando em ${sanitize(config.region)}.
      ${config.expertise?.length ? `Expertise em: ${sanitizeArray(config.expertise)}.` : ''}
      ${config.targetAudience?.length ? `Atendendo: ${sanitizeArray(config.targetAudience)}.` : ''}
    </p>
  </aside>
`;

    // Injetar antes de </body>
    if (html.includes('</body>')) {
      console.log('✅ [Entity] Bloco GEO Enterprise injetado antes de </body>');
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
