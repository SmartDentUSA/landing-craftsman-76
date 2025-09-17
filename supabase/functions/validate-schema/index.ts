import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  richSnippetPreview?: {
    title: string;
    description: string;
    url: string;
    breadcrumbs?: string[];
    reviews?: {
      rating: string;
      count: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { html, url } = await req.json();
    
    if (!html) {
      return new Response(
        JSON.stringify({ error: 'HTML content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Validating schema markup for:', url || 'unknown URL');

    const validationResult = await validateSchemaMarkup(html, url);
    
    console.log('✅ Schema validation completed:', {
      isValid: validationResult.isValid,
      errorsCount: validationResult.errors.length,
      warningsCount: validationResult.warnings.length
    });

    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error validating schema:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Schema validation failed',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function validateSchemaMarkup(html: string, url?: string): Promise<SchemaValidationResult> {
  const result: SchemaValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // Extract JSON-LD scripts from HTML
    const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis);
    
    if (!jsonLdMatches || jsonLdMatches.length === 0) {
      result.warnings.push('Nenhum schema JSON-LD encontrado na página');
      return result;
    }

    let validSchemas = 0;
    let richSnippetData: any = {};

    for (const match of jsonLdMatches) {
      try {
        // Extract JSON content
        const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
        const schema = JSON.parse(jsonContent.trim());
        
        // Validate schema structure
        const schemaValidation = validateSchemaObject(schema);
        
        if (schemaValidation.isValid) {
          validSchemas++;
          
          // Extract data for rich snippet preview
          if (schema['@type'] === 'WebPage' || schema['@type'] === 'SoftwareApplication') {
            richSnippetData = { ...richSnippetData, ...extractRichSnippetData(schema) };
          }
          
          if (schema['@type'] === 'BreadcrumbList') {
            richSnippetData.breadcrumbs = extractBreadcrumbs(schema);
          }
          
          if (schema['@type'] === 'AggregateRating') {
            richSnippetData.reviews = extractReviewData(schema);
          }
          
        } else {
          result.errors.push(...schemaValidation.errors);
          result.isValid = false;
        }
        
      } catch (parseError) {
        result.errors.push(`Erro ao analisar JSON-LD: ${parseError.message}`);
        result.isValid = false;
      }
    }

    // Generate rich snippet preview if we have valid data
    if (validSchemas > 0 && Object.keys(richSnippetData).length > 0) {
      result.richSnippetPreview = {
        title: richSnippetData.name || richSnippetData.headline || 'Título não encontrado',
        description: richSnippetData.description || 'Descrição não encontrada',
        url: url || richSnippetData.url || 'https://seudominio.com',
        ...richSnippetData
      };
    }

    // Add summary info
    if (validSchemas === 0) {
      result.warnings.push('Nenhum schema válido encontrado');
    } else {
      result.warnings.push(`${validSchemas} schema(s) válido(s) encontrado(s)`);
    }

    return result;

  } catch (error) {
    result.isValid = false;
    result.errors.push(`Erro na validação: ${error.message}`);
    return result;
  }
}

function validateSchemaObject(schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required @context
  if (!schema['@context'] || !schema['@context'].includes('schema.org')) {
    errors.push('Campo @context obrigatório (deve incluir schema.org)');
  }

  // Check required @type
  if (!schema['@type']) {
    errors.push('Campo @type obrigatório');
  }

  // Validate specific schema types
  if (schema['@type'] === 'SoftwareApplication') {
    if (!schema.name) errors.push('SoftwareApplication: campo "name" obrigatório');
    if (!schema.operatingSystem) errors.push('SoftwareApplication: campo "operatingSystem" obrigatório');
  }

  if (schema['@type'] === 'AggregateRating') {
    if (!schema.ratingValue) errors.push('AggregateRating: campo "ratingValue" obrigatório');
    if (!schema.ratingCount && !schema.reviewCount) {
      errors.push('AggregateRating: campo "ratingCount" ou "reviewCount" obrigatório');
    }
  }

  if (schema['@type'] === 'BreadcrumbList') {
    if (!schema.itemListElement || !Array.isArray(schema.itemListElement)) {
      errors.push('BreadcrumbList: campo "itemListElement" deve ser um array');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function extractRichSnippetData(schema: any): any {
  return {
    name: schema.name,
    headline: schema.headline,
    description: schema.description,
    url: schema.url,
    image: schema.image?.url || schema.image
  };
}

function extractBreadcrumbs(schema: any): string[] {
  if (!schema.itemListElement || !Array.isArray(schema.itemListElement)) {
    return [];
  }
  
  return schema.itemListElement.map((item: any) => item.name || item.item?.name).filter(Boolean);
}

function extractReviewData(schema: any): { rating: string; count: string } {
  return {
    rating: schema.ratingValue?.toString() || '0',
    count: schema.ratingCount?.toString() || schema.reviewCount?.toString() || '0'
  };
}