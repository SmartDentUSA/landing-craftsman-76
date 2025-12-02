/**
 * Advanced Schema Enhancer
 * Adiciona SpeakableSpecification, about, mentions para IA-readiness
 * ✅ USA structuredClone para evitar mutação
 * ✅ FAIL-SAFE DUPLO: try/catch interno
 */

/**
 * Gera SpeakableSpecification para assistentes de voz e IA
 * @param cssSelectors - Seletores CSS dos elementos "falantes"
 * @returns Schema SpeakableSpecification
 */
export function generateSpeakableSpecification(cssSelectors: string[] = []): object {
  return {
    "@type": "SpeakableSpecification",
    "cssSelector": cssSelectors.length > 0 
      ? cssSelectors 
      : [".hero h1", ".blog-content h2", ".blog-content p:first-of-type", "article h1", "h1", "h2"]
  };
}

/**
 * Enriquece schemas existentes com contexto de IA
 * @param existingSchemas - Array de schemas existentes
 * @param companyProfile - Perfil da empresa
 * @param products - Lista de produtos (opcional)
 * @returns Schemas enriquecidos (CLONE - não muta original)
 */
export function enrichSchemaWithAIContext(
  existingSchemas: object[],
  companyProfile: any,
  products: any[] = []
): object[] {
  // ✅ FAIL-SAFE INTERNO
  try {
    // ✅ CLONE para evitar mutação
    const clonedSchemas = structuredClone(existingSchemas);
    
    // Encontrar WebPage schema
    const webPageIndex = clonedSchemas.findIndex((s: any) => 
      s['@type'] === 'WebPage' || s['@type'] === 'Article' || s['@type'] === 'BlogPosting'
    );
    
    if (webPageIndex >= 0) {
      const webPage = clonedSchemas[webPageIndex] as any;
      
      // Adicionar SpeakableSpecification se não existe
      if (!webPage.speakable) {
        webPage.speakable = generateSpeakableSpecification();
      }
      
      // Adicionar about se não existe
      if (!webPage.about && companyProfile) {
        webPage.about = {
          "@type": "Thing",
          "name": companyProfile.business_sector || companyProfile.industry || "Odontologia Digital",
          "description": companyProfile.company_description?.substring(0, 200)
        };
      }
      
      // Adicionar mentions baseado em produtos
      if (!webPage.mentions && products.length > 0) {
        webPage.mentions = products.slice(0, 5).map(p => ({
          "@type": "Product",
          "name": p.name,
          "@id": p.product_url || p.url || `#product-${p.id}`
        }));
      }
    }
    
    console.log('✅ [Schema Enhancer] Schemas enriquecidos com contexto IA');
    return clonedSchemas;
    
  } catch (error) {
    // ✅ FAIL-SAFE: Retorna schemas originais se falhar
    console.error('[Schema Enhancer] Falha, retornando original:', error);
    return existingSchemas;
  }
}

/**
 * Valida hierarquia de schemas obrigatórios
 * @param schemas - Array de schemas para validar
 * @returns Resultado da validação
 */
export function validateSchemaHierarchy(schemas: object[]): { 
  valid: boolean; 
  errors: string[]; 
  warnings: string[] 
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const types = schemas.map((s: any) => s['@type']).flat();
    
    // Validações obrigatórias
    if (!types.includes('Organization') && !types.includes('LocalBusiness')) {
      errors.push('Schema Organization/LocalBusiness ausente');
    }
    
    if (!types.includes('WebPage') && !types.includes('Article') && !types.includes('BlogPosting')) {
      warnings.push('Schema WebPage/Article recomendado');
    }
    
    // Verificar SpeakableSpecification
    const hasSpeak = schemas.some((s: any) => s.speakable || s['@type'] === 'SpeakableSpecification');
    if (!hasSpeak) {
      warnings.push('SpeakableSpecification ausente (IA-readiness)');
    }
    
    // Verificar about/mentions
    const hasAbout = schemas.some((s: any) => s.about);
    if (!hasAbout) {
      warnings.push('Campo about ausente (contexto semântico)');
    }
    
  } catch (error) {
    errors.push(`Erro na validação: ${error}`);
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Gera schema de Article completo com melhorias de IA
 * @param articleData - Dados do artigo
 * @param companyProfile - Perfil da empresa (opcional)
 * @returns Schema Article enriquecido
 */
export function generateArticleSchemaWithAI(articleData: {
  title: string;
  description: string;
  author?: { name: string; url?: string };
  datePublished: string;
  dateModified?: string;
  image?: string;
  url: string;
}, companyProfile?: any): object {
  return {
    "@type": "Article",
    "headline": articleData.title,
    "description": articleData.description,
    "author": articleData.author ? {
      "@type": "Person",
      "name": articleData.author.name,
      "url": articleData.author.url
    } : undefined,
    "datePublished": articleData.datePublished,
    "dateModified": articleData.dateModified || articleData.datePublished,
    "image": articleData.image,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleData.url
    },
    "speakable": generateSpeakableSpecification(),
    "about": companyProfile ? {
      "@type": "Thing",
      "name": companyProfile.business_sector || companyProfile.industry || "Odontologia Digital"
    } : undefined
  };
}
