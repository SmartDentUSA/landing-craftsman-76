/**
 * 🧠 Knowledge System Helpers
 * Generates entity references, citation blocks, expanded knowledge layers,
 * definition paragraphs, and entity index JSON-LD for LLM/SGE optimization.
 * 
 * Modules:
 * N. Entity Reference Meta Tags
 * O. AI Crawler Policy Meta
 * P. Citation Blocks
 * Q. Expanded Knowledge Layer
 * R. Entity Index JSON-LD (ItemList)
 * S. Definition Paragraph
 * T. MedicalEntity Schema
 */

const VISUALLY_HIDDEN_STYLE = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';

// ============================================
// N. Entity Reference Meta Tags
// ============================================

/**
 * Generates <meta name="entity:*"> tags for HEAD
 * Allows LLMs to identify entities without parsing body
 */
export function generateEntityReferenceMetas(params: {
  products?: string[];
  technologies?: string[];
  organization?: string;
  legalName?: string;
  taxID?: string;
  categories?: string[];
  persons?: string[];
  materials?: string[];
}): string {
  const { products, technologies, organization, legalName, taxID, categories, persons, materials } = params;
  const metas: string[] = [];

  if (organization) {
    metas.push(`<meta name="entity:organization" content="${escapeAttr(organization)}">`);
  }
  if (legalName) {
    metas.push(`<meta name="entity:legalName" content="${escapeAttr(legalName)}">`);
  }
  if (taxID) {
    metas.push(`<meta name="entity:taxID" content="${escapeAttr(taxID)}">`);
  }

  if (products && products.length > 0) {
    products.slice(0, 5).forEach(p => {
      metas.push(`<meta name="entity:product" content="${escapeAttr(p)}">`);
    });
  }

  if (technologies && technologies.length > 0) {
    technologies.slice(0, 5).forEach(t => {
      metas.push(`<meta name="entity:technology" content="${escapeAttr(t)}">`);
    });
  }

  if (categories && categories.length > 0) {
    categories.slice(0, 3).forEach(c => {
      metas.push(`<meta name="entity:category" content="${escapeAttr(c)}">`);
    });
  }

  if (persons && persons.length > 0) {
    persons.slice(0, 5).forEach(p => {
      metas.push(`<meta name="entity:person" content="${escapeAttr(p)}">`);
    });
  }

  if (materials && materials.length > 0) {
    materials.slice(0, 5).forEach(m => {
      metas.push(`<meta name="entity:material" content="${escapeAttr(m)}">`);
    });
  }

  if (metas.length === 0) return '';

  return `
  <!-- ═══════════════════════════════════════════════════════════ -->
  <!-- ENTITY REFERENCE META TAGS (Knowledge System) -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  ${metas.join('\n  ')}`;
}

// ============================================
// O. AI Crawler Policy Meta (Expanded)
// ============================================

/**
 * Generates expanded AI crawler policy meta tag
 * Explicit directives per bot beyond the generic ai-content-policy
 */
export function generateAICrawlerPolicyMeta(): string {
  return `<meta name="ai-crawler-policy" content="allow: GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, ChatGPT-User, anthropic-ai, cohere-ai, meta-externalagent">`;
}

// ============================================
// P. Citation Blocks
// ============================================

/**
 * Generates a citation blockquote for LLM citation
 * Visually rendered with semantic markup for AI extraction
 */
export function generateCitationBlock(params: {
  quote: string;
  source?: string;
  expertName?: string;
  expertRole?: string;
  date?: string;
}): string {
  const { quote, source, expertName, expertRole, date } = params;
  if (!quote) return '';

  const citeAttr = source ? ` cite="${escapeAttr(source)}"` : '';
  const footerParts: string[] = [];
  
  if (expertName) {
    footerParts.push(`<strong>${escapeAttr(expertName)}</strong>`);
  }
  if (expertRole) {
    footerParts.push(`<span>${escapeAttr(expertRole)}</span>`);
  }
  if (date) {
    footerParts.push(`<time datetime="${escapeAttr(date)}">${escapeAttr(date)}</time>`);
  }

  const footer = footerParts.length > 0
    ? `\n    <footer>— ${footerParts.join(', ')}</footer>`
    : '';

  return `
  <blockquote${citeAttr} class="citation-block" data-ai-hint="citation" style="${VISUALLY_HIDDEN_STYLE}">
    <p>${escapeAttr(quote)}</p>${footer}
  </blockquote>`;
}

/**
 * Generates multiple citation blocks from an array of expert data
 */
export function generateCitationBlocks(citations: Array<{
  quote: string;
  source?: string;
  expertName?: string;
  expertRole?: string;
  date?: string;
}>): string {
  if (!citations || citations.length === 0) return '';
  return citations.map(generateCitationBlock).join('');
}

// ============================================
// Q. Expanded Knowledge Layer
// ============================================

/**
 * Generates an expanded LLM Knowledge Layer with full entity context
 * Evolution of generateLLMKnowledgeLayer with additional fields
 */
export function generateExpandedKnowledgeLayer(params: {
  entity?: string;
  category?: string;
  company?: string;
  definition?: string;
  technology?: string;
  clinicalApplication?: string;
  keyProperties?: string[];
  certifications?: string[];
  applications?: string[];
  associatedExperts?: string[];
  relatedProducts?: string[];
}): string {
  const {
    entity, category, company, definition, technology,
    clinicalApplication, keyProperties, certifications,
    applications, associatedExperts, relatedProducts
  } = params;

  if (!entity && !definition && !technology) return '';

  const items: string[] = [];

  if (entity) {
    items.push(`    <dt>Entidade</dt>\n    <dd>${escapeAttr(entity)}</dd>`);
  }
  if (category) {
    items.push(`    <dt>Categoria</dt>\n    <dd>${escapeAttr(category)}</dd>`);
  }
  if (company) {
    items.push(`    <dt>Empresa</dt>\n    <dd>${escapeAttr(company)}</dd>`);
  }
  if (definition) {
    items.push(`    <dt>Definição</dt>\n    <dd>${escapeAttr(definition)}</dd>`);
  }
  if (technology) {
    items.push(`    <dt>Tecnologia</dt>\n    <dd>${escapeAttr(technology)}</dd>`);
  }
  if (clinicalApplication) {
    items.push(`    <dt>Aplicação clínica</dt>\n    <dd>${escapeAttr(clinicalApplication)}</dd>`);
  }
  if (keyProperties && keyProperties.length > 0) {
    items.push(`    <dt>Propriedades principais</dt>\n    <dd>${keyProperties.map(escapeAttr).join('; ')}</dd>`);
  }
  if (applications && applications.length > 0) {
    items.push(`    <dt>Aplicações</dt>\n    <dd>${applications.map(escapeAttr).join('; ')}</dd>`);
  }
  if (certifications && certifications.length > 0) {
    items.push(`    <dt>Certificações</dt>\n    <dd>${certifications.map(escapeAttr).join(', ')}</dd>`);
  }
  if (associatedExperts && associatedExperts.length > 0) {
    items.push(`    <dt>Especialistas associados</dt>\n    <dd>${associatedExperts.map(escapeAttr).join('; ')}</dd>`);
  }
  if (relatedProducts && relatedProducts.length > 0) {
    items.push(`    <dt>Produtos relacionados</dt>\n    <dd>${relatedProducts.map(escapeAttr).join('; ')}</dd>`);
  }

  if (items.length === 0) return '';

  return `
  <aside class="llm-knowledge-expanded" data-ai-hint="knowledge-graph" role="doc-glossary" style="${VISUALLY_HIDDEN_STYLE}">
    <dl>
${items.join('\n')}
    </dl>
  </aside>`;
}

// ============================================
// R. Entity Index JSON-LD (ItemList)
// ============================================

/**
 * Generates an ItemList JSON-LD schema of related entities
 * Complements the Entity Index HTML with structured data
 */
export function generateEntityIndexJsonLD(params: {
  entities: Array<{ type: string; name: string; url?: string; description?: string }>;
  pageName?: string;
}): string {
  const { entities, pageName } = params;
  if (!entities || entities.length === 0) return '';

  const listItems = entities.slice(0, 20).map((entity, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": entity.type || "Thing",
      "name": entity.name,
      ...(entity.url ? { "url": entity.url } : {}),
      ...(entity.description ? { "description": entity.description } : {})
    }
  }));

  const schema = {
    "@type": "ItemList",
    "name": pageName || "Entidades Relacionadas",
    "numberOfItems": listItems.length,
    "itemListElement": listItems
  };

  return `
  <script type="application/ld+json" data-ai-hint="entity-index">
${JSON.stringify(schema, null, 2)}
  </script>`;
}

// ============================================
// S. Definition Paragraph
// ============================================

/**
 * Generates a semantic definition paragraph with itemprop="description"
 * Placed after AI Summary for LLM extraction priority
 */
export function generateDefinitionParagraph(params: {
  entityName: string;
  category?: string;
  definition: string;
  company?: string;
}): string {
  const { entityName, category, definition, company } = params;
  if (!definition) return '';

  const cleanDef = definition.replace(/<[^>]*>/g, '').trim();
  const truncated = cleanDef.length > 400 ? cleanDef.substring(0, 397) + '...' : cleanDef;

  return `
  <p itemprop="description" class="definition-paragraph" data-section="definition" data-ai-hint="definition" style="${VISUALLY_HIDDEN_STYLE}">
    ${escapeAttr(entityName)}${category ? ` (${escapeAttr(category)})` : ''}: ${escapeAttr(truncated)}${company ? ` — ${escapeAttr(company)}` : ''}
  </p>`;
}

// ============================================
// T. MedicalEntity Schema
// ============================================

/**
 * Generates a MedicalEntity JSON-LD schema for dental/medical products
 * Only when applicable (dental products, procedures, materials)
 */
export function generateMedicalEntitySchema(params: {
  name: string;
  description?: string;
  medicalSpecialty?: string;
  relevantSpecialty?: string;
  recognizingAuthority?: string[];
  code?: string;
}): Record<string, any> | null {
  const { name, description, medicalSpecialty, relevantSpecialty, recognizingAuthority, code } = params;
  
  // Only generate for dental/medical context
  const dentalKeywords = ['dental', 'odonto', 'implant', 'prótese', 'resina', 'zircônia', 'endodont', 'ortodont', 'periodont'];
  const normalized = `${name} ${description || ''}`.toLowerCase();
  const isDental = dentalKeywords.some(kw => normalized.includes(kw));
  
  if (!isDental) return null;

  const schema: Record<string, any> = {
    "@type": "MedicalEntity",
    "name": name,
  };

  if (description) {
    schema["description"] = description.replace(/<[^>]*>/g, '').substring(0, 300);
  }

  if (medicalSpecialty || relevantSpecialty) {
    schema["relevantSpecialty"] = {
      "@type": "MedicalSpecialty",
      "name": medicalSpecialty || relevantSpecialty || "Dentistry"
    };
  }

  if (recognizingAuthority && recognizingAuthority.length > 0) {
    schema["recognizingAuthority"] = recognizingAuthority.map(auth => ({
      "@type": "Organization",
      "name": auth
    }));
  }

  if (code) {
    schema["code"] = {
      "@type": "MedicalCode",
      "codeValue": code,
      "codingSystem": "ANVISA"
    };
  }

  return schema;
}

// ============================================
// Utility
// ============================================

function escapeAttr(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

console.log('🧠 [Knowledge-System] Helpers loaded: Entity refs, AI crawler policy, citations, expanded knowledge, entity JSON-LD, definition paragraph, MedicalEntity');
