/**
 * Validadores SEO para Meta Descriptions, Canonical URLs e outros elementos
 */

const CTA_VERBS = [
  'saiba', 'descubra', 'conheça', 'entenda', 'veja', 
  'confira', 'acesse', 'encontre', 'aprenda', 'explore',
  'garanta', 'solicite', 'compre', 'baixe', 'assista',
  'cadastre', 'compare', 'economize', 'teste', 'experimente'
];

export interface MetaDescriptionValidation {
  valid: boolean;
  warnings: string[];
  score: number;
}

export function validateMetaDescription(meta: string): MetaDescriptionValidation {
  const warnings: string[] = [];
  let score = 100;
  
  if (!meta || meta.trim().length === 0) {
    return {
      valid: false,
      warnings: ['Meta description está vazia'],
      score: 0
    };
  }
  
  const trimmedMeta = meta.trim();
  
  // Length validation
  if (trimmedMeta.length < 50) {
    warnings.push(`Meta description muito curta (${trimmedMeta.length} caracteres). Mínimo recomendado: 50`);
    score -= 30;
  }
  if (trimmedMeta.length > 160) {
    warnings.push(`Meta description muito longa (${trimmedMeta.length} caracteres). Máximo recomendado: 160`);
    score -= 20;
  }
  
  // CTA validation
  const hasCTA = CTA_VERBS.some(verb => 
    new RegExp(`\\b${verb}\\b`, 'i').test(trimmedMeta)
  );
  if (!hasCTA) {
    warnings.push('Meta description sem CTA (Call-to-Action). Adicione palavras como: ' + CTA_VERBS.slice(0, 5).join(', '));
    score -= 25;
  }
  
  // Special chars validation
  if (trimmedMeta.includes('"') || trimmedMeta.includes("'")) {
    warnings.push('Evite aspas na meta description - podem quebrar o HTML');
    score -= 10;
  }
  
  // Duplicate words check (spam detection)
  const words = trimmedMeta.toLowerCase().split(/\s+/);
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    if (word.length > 3) { // Ignorar palavras muito curtas
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  const repeatedWords = Object.entries(wordCount)
    .filter(([_, count]) => count > 2)
    .map(([word]) => word);
    
  if (repeatedWords.length > 0) {
    warnings.push(`Palavras repetidas excessivamente: ${repeatedWords.join(', ')}`);
    score -= 15;
  }
  
  return { 
    valid: score >= 50, 
    warnings, 
    score: Math.max(0, score)
  };
}

export interface CanonicalURLValidation {
  valid: boolean;
  normalized: string;
  errors: string[];
}

export async function validateCanonicalURL(
  url: string, 
  domain: string,
  existingId?: string
): Promise<CanonicalURLValidation> {
  const errors: string[] = [];
  let normalized = url.trim();
  
  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      errors: ['Canonical URL não pode estar vazio']
    };
  }
  
  // Force HTTPS
  if (!normalized.startsWith('https://')) {
    if (normalized.startsWith('http://')) {
      normalized = normalized.replace(/^http:\/\//, 'https://');
      errors.push('⚠️ Canonical URL convertida para HTTPS');
    } else if (!normalized.startsWith('//')) {
      normalized = `https://${normalized}`;
      errors.push('⚠️ Protocolo HTTPS adicionado');
    }
  }
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Validate domain
  if (!normalized.includes(domain)) {
    errors.push(`❌ Canonical URL deve conter o domínio ${domain}`);
    return { valid: false, normalized, errors };
  }
  
  // Validate URL format
  try {
    new URL(normalized);
  } catch {
    errors.push('❌ Canonical URL inválida (formato incorreto)');
    return { valid: false, normalized, errors };
  }
  
  return { 
    valid: errors.filter(e => e.startsWith('❌')).length === 0, 
    normalized, 
    errors 
  };
}

export interface SchemaValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSchemaOrg(schema: any): SchemaValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!schema || typeof schema !== 'object') {
    errors.push('Schema deve ser um objeto JSON válido');
    return { valid: false, errors, warnings };
  }
  
  // Validate basic structure
  if (!schema['@context']) {
    errors.push('Missing @context property');
  } else if (schema['@context'] !== 'https://schema.org') {
    warnings.push('@context should be "https://schema.org"');
  }
  
  if (!schema['@type']) {
    errors.push('Missing @type property');
  }
  
  // Validate specific types
  if (schema['@type'] === 'Product') {
    if (!schema.offers || !Array.isArray(schema.offers) || schema.offers.length === 0) {
      warnings.push('Product schema should have offers array');
    }
    if (!schema.brand) {
      warnings.push('Product schema should have brand');
    }
    if (!schema.name) {
      errors.push('Product schema must have name');
    }
  }
  
  if (schema['@type'] === 'LocalBusiness') {
    if (!schema.address) {
      errors.push('LocalBusiness must have address');
    }
    if (!schema.aggregateRating && !schema.review) {
      warnings.push('LocalBusiness should have reviews or rating');
    }
  }
  
  if (schema['@type'] === 'Article' || schema['@type'] === 'BlogPosting') {
    if (!schema.headline) {
      errors.push(`${schema['@type']} must have headline`);
    }
    if (!schema.author) {
      warnings.push(`${schema['@type']} should have author`);
    }
    if (!schema.datePublished) {
      warnings.push(`${schema['@type']} should have datePublished`);
    }
  }
  
  // Size validation (max 100KB for performance)
  try {
    const schemaSize = new Blob([JSON.stringify(schema)]).size;
    if (schemaSize > 100000) {
      errors.push(`Schema too large: ${(schemaSize/1000).toFixed(1)}KB (max 100KB recommended)`);
    }
  } catch {
    warnings.push('Could not calculate schema size');
  }
  
  // Test JSON validity
  try {
    JSON.parse(JSON.stringify(schema));
  } catch (e) {
    errors.push('Invalid JSON structure - cannot serialize');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
