/**
 * 🤖 AI Readiness Helpers
 * Enhances HTML for AI crawler indexing, LLM citation, and semantic entity graphs.
 * 
 * Modules:
 * H. Wikidata Entity Linking — Maps dental entities to Wikidata URIs
 * I. AI Summary Block — Generates structured summary blocks for LLM citation
 * J. AI-Ready Article Schema — Adds isAccessibleForFree, SearchAction
 */

// ============================================
// H. Wikidata Entity Linking
// ============================================

/**
 * Map of dental/medical entities to Wikidata QIDs
 * Used in JSON-LD `about`, `mentions`, `knowsAbout` fields
 */
export const WIKIDATA_ENTITIES: Record<string, { qid: string; label: string; description: string }> = {
  // Dental Specialties
  'odontologia digital': { qid: 'Q2915883', label: 'Digital dentistry', description: 'Use of dental technologies' },
  'odontologia': { qid: 'Q12128', label: 'Dentistry', description: 'Branch of medicine for teeth and oral cavity' },
  'implantodontia': { qid: 'Q1667294', label: 'Dental implant', description: 'Surgical component for dental prosthesis' },
  'ortodontia': { qid: 'Q181560', label: 'Orthodontics', description: 'Dental specialty for malpositioned teeth' },
  'endodontia': { qid: 'Q1341203', label: 'Endodontics', description: 'Root canal treatment specialty' },
  'periodontia': { qid: 'Q654356', label: 'Periodontics', description: 'Gum disease treatment specialty' },
  'prostodontia': { qid: 'Q1479897', label: 'Prosthodontics', description: 'Dental prosthesis specialty' },
  
  // Technologies
  'cad/cam': { qid: 'Q1071923', label: 'CAD/CAM', description: 'Computer-aided design and manufacturing' },
  'cadcam': { qid: 'Q1071923', label: 'CAD/CAM', description: 'Computer-aided design and manufacturing' },
  'impressão 3d': { qid: 'Q229367', label: '3D printing', description: 'Additive manufacturing process' },
  'impressora 3d': { qid: 'Q229367', label: '3D printing', description: 'Additive manufacturing process' },
  'scanner intraoral': { qid: 'Q113534653', label: 'Intraoral scanner', description: 'Digital dental impression device' },
  'scanner 3d': { qid: 'Q752401', label: '3D scanner', description: 'Device for 3D scanning' },
  'tomografia computadorizada': { qid: 'Q32566', label: 'CT scan', description: 'Medical imaging technique' },
  'cone beam': { qid: 'Q1784935', label: 'Cone beam CT', description: 'CBCT dental imaging' },
  'radiografia digital': { qid: 'Q219712', label: 'Digital radiography', description: 'Digital X-ray imaging' },
  
  // Materials
  'zircônia': { qid: 'Q80235', label: 'Zirconia', description: 'Zirconium dioxide ceramic material' },
  'zirconia': { qid: 'Q80235', label: 'Zirconia', description: 'Zirconium dioxide ceramic material' },
  'dissilicato de lítio': { qid: 'Q419181', label: 'Lithium disilicate', description: 'Glass-ceramic material for dental restorations' },
  'resina composta': { qid: 'Q899928', label: 'Dental composite', description: 'Tooth-colored restorative material' },
  'cerâmica dental': { qid: 'Q45621', label: 'Dental ceramic', description: 'Ceramic material for dental prosthetics' },
  'titânio': { qid: 'Q716', label: 'Titanium', description: 'Chemical element used in dental implants' },
  'pmma': { qid: 'Q146439', label: 'PMMA', description: 'Poly(methyl methacrylate) dental material' },
  
  // Products/Procedures
  'implante dentário': { qid: 'Q1667294', label: 'Dental implant', description: 'Surgical component for dental prosthesis' },
  'coroa dentária': { qid: 'Q1196274', label: 'Dental crown', description: 'Dental restoration covering tooth' },
  'prótese dentária': { qid: 'Q214095', label: 'Denture', description: 'Removable dental prosthesis' },
  'faceta': { qid: 'Q603698', label: 'Dental veneer', description: 'Thin shell covering tooth surface' },
  'alinhador': { qid: 'Q4726550', label: 'Clear aligner', description: 'Transparent orthodontic device' },
  'guia cirúrgico': { qid: 'Q96392710', label: 'Surgical guide', description: 'Dental implant placement guide' },
  
  // Regulatory
  'anvisa': { qid: 'Q4030131', label: 'ANVISA', description: 'Brazilian Health Regulatory Agency' },
  'fda': { qid: 'Q204711', label: 'FDA', description: 'US Food and Drug Administration' },
};

/**
 * Enriches a Thing schema entity with Wikidata sameAs linking
 * @param entityName Name of the entity (e.g., "Odontologia Digital")
 * @returns Enhanced Thing object with sameAs Wikidata URI, or basic Thing
 */
export function enrichEntityWithWikidata(entityName: string): Record<string, any> {
  const normalized = entityName.toLowerCase().trim();
  const match = WIKIDATA_ENTITIES[normalized];
  
  if (match) {
    return {
      "@type": "Thing",
      "name": entityName,
      "sameAs": `https://www.wikidata.org/entity/${match.qid}`,
      "description": match.description
    };
  }
  
  // Partial match: check if entity name contains a known entity
  for (const [key, value] of Object.entries(WIKIDATA_ENTITIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        "@type": "Thing",
        "name": entityName,
        "sameAs": `https://www.wikidata.org/entity/${value.qid}`,
        "description": value.description
      };
    }
  }
  
  return { "@type": "Thing", "name": entityName };
}

/**
 * Enriches an array of entity names with Wikidata linking
 */
export function enrichEntitiesWithWikidata(entities: string[]): Record<string, any>[] {
  if (!entities || entities.length === 0) return [];
  return entities.map(enrichEntityWithWikidata);
}

/**
 * Enriches existing `about` or `mentions` arrays in a JSON-LD schema
 * by adding Wikidata sameAs to Thing entities
 */
export function enrichSchemaEntitiesWithWikidata(schema: Record<string, any>): Record<string, any> {
  const enriched = { ...schema };
  
  // Enrich about
  if (Array.isArray(enriched.about)) {
    enriched.about = enriched.about.map((entity: any) => {
      if (entity?.["@type"] === "Thing" && entity?.name && !entity?.sameAs) {
        return enrichEntityWithWikidata(entity.name);
      }
      return entity;
    });
  }
  
  // Enrich mentions  
  if (Array.isArray(enriched.mentions)) {
    enriched.mentions = enriched.mentions.map((entity: any) => {
      if (entity?.["@type"] === "Thing" && entity?.name && !entity?.sameAs) {
        return enrichEntityWithWikidata(entity.name);
      }
      return entity;
    });
  }
  
  // Enrich knowsAbout
  if (Array.isArray(enriched.knowsAbout)) {
    enriched.knowsAbout = enriched.knowsAbout.map((entity: any) => {
      if (entity?.["@type"] === "Thing" && entity?.name && !entity?.sameAs) {
        return enrichEntityWithWikidata(entity.name);
      }
      return entity;
    });
  }
  
  return enriched;
}

// ============================================
// I. AI Summary Block — LLM Citation Ready
// ============================================

/**
 * Generates an AI Summary HTML block for LLM citation
 * Placed after the H1, visually hidden but semantically accessible
 */
export function generateAISummaryBlock(params: {
  productName?: string;
  companyName?: string;
  category?: string;
  description?: string;
  keyBenefits?: string[];
  certifications?: string[];
}): string {
  const { productName, companyName, category, description, keyBenefits, certifications } = params;
  
  if (!productName && !description) return '';
  
  const summaryParts: string[] = [];
  
  if (productName && companyName) {
    summaryParts.push(`${productName} é um produto${category ? ` de ${category}` : ''} oferecido pela ${companyName}.`);
  } else if (productName) {
    summaryParts.push(`${productName}${category ? ` — produto de ${category}` : ''}.`);
  }
  
  if (description) {
    // Truncate to ~200 chars for summary
    const cleanDesc = description.replace(/<[^>]*>/g, '').trim();
    const truncated = cleanDesc.length > 200 ? cleanDesc.substring(0, 197) + '...' : cleanDesc;
    summaryParts.push(truncated);
  }
  
  if (keyBenefits && keyBenefits.length > 0) {
    const topBenefits = keyBenefits.slice(0, 3).join(', ');
    summaryParts.push(`Principais benefícios: ${topBenefits}.`);
  }
  
  if (certifications && certifications.length > 0) {
    summaryParts.push(`Certificações: ${certifications.join(', ')}.`);
  }
  
  const summaryText = summaryParts.join(' ');
  
  return `
  <div class="ai-summary" data-ai-hint="summary" role="doc-abstract" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;">
    <p>${summaryText}</p>
  </div>`;
}

/**
 * Generates an AI Summary for landing pages (company-focused)
 */
export function generateLandingPageAISummary(params: {
  companyName: string;
  pageTitle?: string;
  sector?: string;
  location?: string;
  services?: string;
}): string {
  const { companyName, pageTitle, sector, location, services } = params;
  
  const parts: string[] = [];
  parts.push(`${companyName}${sector ? ` — especialista em ${sector}` : ''}.`);
  if (pageTitle) parts.push(pageTitle + '.');
  if (location) parts.push(`Localização: ${location}.`);
  if (services) parts.push(`Serviços: ${services}.`);
  
  return `
  <div class="ai-summary" data-ai-hint="summary" role="doc-abstract" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;">
    <p>${parts.join(' ')}</p>
  </div>`;
}

// ============================================
// J. AI-Ready Article Schema Enhancements
// ============================================

/**
 * Adds isAccessibleForFree to Article/BlogPosting schemas
 */
export function addArticleAIReadiness(articleSchema: Record<string, any>): Record<string, any> {
  return {
    ...articleSchema,
    "isAccessibleForFree": true,
    "isPartOf": articleSchema.isPartOf || {
      "@type": "WebSite",
      "name": articleSchema.publisher?.name || "Smart Dent"
    }
  };
}

/**
 * Generates SearchAction for WebSite schema (enables Google Sitelinks Search Box)
 */
export function generateSearchAction(websiteUrl: string): Record<string, any> {
  const cleanUrl = websiteUrl.replace(/\/$/, '');
  return {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${cleanUrl}/busca?q={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  };
}

/**
 * Enriches a full JSON-LD @graph with Wikidata entities and AI readiness
 * This is a safety-net function to be called on any generated schema graph
 */
export function enrichGraphWithAIReadiness(graph: Record<string, any>[], websiteUrl?: string): Record<string, any>[] {
  return graph.map(schema => {
    let enriched = enrichSchemaEntitiesWithWikidata(schema);
    
    // Add isAccessibleForFree to Article/BlogPosting
    if (enriched["@type"] === "Article" || enriched["@type"] === "BlogPosting") {
      enriched = addArticleAIReadiness(enriched);
    }
    
    // Add SearchAction to WebSite
    if (enriched["@type"] === "WebSite" && websiteUrl && !enriched.potentialAction) {
      enriched.potentialAction = generateSearchAction(websiteUrl);
    }
    
    return enriched;
  });
}

console.log('🤖 [AI-Readiness] Helpers loaded: Wikidata entities, AI summary, article enhancements');
