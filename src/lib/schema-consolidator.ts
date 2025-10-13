/**
 * Consolidador de Schemas JSON-LD
 * Unifica múltiplos schemas em um único @graph (Google recomendado)
 */

interface SchemaObject {
  '@context'?: string;
  '@type': string;
  [key: string]: any;
}

export function consolidateSchemas(schemas: SchemaObject[]): string {
  if (schemas.length === 0) return '';
  
  // ✅ Remover @context individual e consolidar em @graph
  const cleanedSchemas = schemas.map(({ '@context': _, ...rest }) => rest);
  
  const consolidated = {
    '@context': 'https://schema.org',
    '@graph': cleanedSchemas
  };
  
  return JSON.stringify(consolidated, null, 2);
}

/**
 * Exemplo de uso:
 * 
 * const schemas = [
 *   { "@context": "https://schema.org", "@type": "Organization", ... },
 *   { "@context": "https://schema.org", "@type": "WebPage", ... },
 *   { "@context": "https://schema.org", "@type": "BreadcrumbList", ... }
 * ];
 * 
 * const consolidated = consolidateSchemas(schemas);
 * // Retorna:
 * // {
 * //   "@context": "https://schema.org",
 * //   "@graph": [
 * //     { "@type": "Organization", ... },
 * //     { "@type": "WebPage", ... },
 * //     { "@type": "BreadcrumbList", ... }
 * //   ]
 * // }
 */
