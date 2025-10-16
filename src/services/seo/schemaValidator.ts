/**
 * Schema.org Validator - Integração com Google Rich Results Test
 * Valida schemas antes da publicação para garantir elegibilidade
 */

import { supabase } from '@/integrations/supabase/client';

export interface SchemaValidationResult {
  isValid: boolean;
  errors: Array<{
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
    path?: string;
  }>;
  richSnippetPreview?: {
    type: string;
    title?: string;
    description?: string;
    image?: string;
    rating?: string;
    price?: string;
  };
  googleTestUrl?: string;
}

/**
 * Valida schema usando Edge Function
 */
export async function validateSchemaMarkup(
  schema: any,
  url?: string
): Promise<SchemaValidationResult> {
  try {
    // Converter schema para HTML com JSON-LD
    const htmlWithSchema = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">
  ${JSON.stringify(schema, null, 2)}
  </script>
</head>
<body></body>
</html>`;

    // Chamar Edge Function de validação
    const { data, error } = await supabase.functions.invoke('validate-schema', {
      body: {
        html: htmlWithSchema,
        url: url
      }
    });

    if (error) {
      console.error('❌ Erro ao validar schema:', error);
      return {
        isValid: false,
        errors: [{
          severity: 'ERROR',
          message: `Falha na validação: ${error.message}`
        }]
      };
    }

    return data as SchemaValidationResult;
  } catch (err) {
    console.error('❌ Exceção ao validar schema:', err);
    return {
      isValid: false,
      errors: [{
        severity: 'ERROR',
        message: 'Erro interno ao validar schema'
      }]
    };
  }
}

/**
 * Valida múltiplos schemas consolidados
 */
export async function validateConsolidatedSchemas(
  schemas: any[],
  url?: string
): Promise<SchemaValidationResult> {
  const consolidatedSchema = {
    '@context': 'https://schema.org',
    '@graph': schemas.map(({ '@context': _, ...rest }) => rest)
  };

  return validateSchemaMarkup(consolidatedSchema, url);
}

/**
 * Gera alerta visual de erro de schema para o editor
 */
export function generateSchemaErrorAlert(
  validation: SchemaValidationResult
): string {
  if (validation.isValid) return '';

  const errorsList = validation.errors
    .filter(e => e.severity === 'ERROR')
    .map(e => `<li><strong>${e.path || 'Schema'}:</strong> ${e.message}</li>`)
    .join('');

  const warningsList = validation.errors
    .filter(e => e.severity === 'WARNING')
    .map(e => `<li>${e.path || 'Schema'}: ${e.message}</li>`)
    .join('');

  return `
<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
  <h3 style="color: #856404; margin: 0 0 10px 0;">⚠️ Problemas de Schema Detectados</h3>
  
  ${errorsList ? `
  <div style="margin-bottom: 10px;">
    <strong style="color: #dc3545;">Erros Críticos:</strong>
    <ul style="margin: 5px 0; padding-left: 20px; color: #721c24;">
      ${errorsList}
    </ul>
  </div>` : ''}
  
  ${warningsList ? `
  <div>
    <strong style="color: #856404;">Avisos:</strong>
    <ul style="margin: 5px 0; padding-left: 20px; color: #856404;">
      ${warningsList}
    </ul>
  </div>` : ''}
  
  ${validation.googleTestUrl ? `
  <p style="margin: 10px 0 0 0; font-size: 0.9em;">
    <a href="${validation.googleTestUrl}" target="_blank" style="color: #004085; text-decoration: underline;">
      🔍 Testar no Google Rich Results
    </a>
  </p>` : ''}
</div>`.trim();
}

/**
 * Valida schema localmente (offline validation)
 */
export function validateSchemaLocally(schema: any): SchemaValidationResult {
  const errors: SchemaValidationResult['errors'] = [];

  // Validação 1: @context obrigatório
  if (!schema['@context']) {
    errors.push({
      severity: 'ERROR',
      message: '@context ausente. Adicione: "@context": "https://schema.org"',
      path: '@context'
    });
  }

  // Validação 2: @type obrigatório
  if (!schema['@type'] && !schema['@graph']) {
    errors.push({
      severity: 'ERROR',
      message: '@type ausente. Especifique o tipo do schema (Product, Article, etc.)',
      path: '@type'
    });
  }

  // Validação 3: @graph deve ter array
  if (schema['@graph'] && !Array.isArray(schema['@graph'])) {
    errors.push({
      severity: 'ERROR',
      message: '@graph deve ser um array de schemas',
      path: '@graph'
    });
  }

  // Validação 4: Product schema específico
  if (schema['@type'] === 'Product' || 
      (schema['@graph'] && schema['@graph'].some((s: any) => s['@type'] === 'Product'))) {
    const productSchema = schema['@type'] === 'Product' 
      ? schema 
      : schema['@graph'].find((s: any) => s['@type'] === 'Product');

    if (!productSchema.name) {
      errors.push({
        severity: 'ERROR',
        message: 'Product.name é obrigatório',
        path: 'Product.name'
      });
    }

    if (!productSchema.offers) {
      errors.push({
        severity: 'WARNING',
        message: 'Product.offers recomendado para Rich Snippets',
        path: 'Product.offers'
      });
    }

    if (!productSchema.image) {
      errors.push({
        severity: 'WARNING',
        message: 'Product.image recomendado para melhor apresentação',
        path: 'Product.image'
      });
    }
  }

  // Validação 5: Article schema específico
  if (schema['@type'] === 'Article' || schema['@type'] === 'BlogPosting') {
    if (!schema.headline) {
      errors.push({
        severity: 'ERROR',
        message: 'Article.headline é obrigatório',
        path: 'Article.headline'
      });
    }

    if (!schema.datePublished) {
      errors.push({
        severity: 'WARNING',
        message: 'Article.datePublished recomendado',
        path: 'Article.datePublished'
      });
    }

    if (!schema.author) {
      errors.push({
        severity: 'WARNING',
        message: 'Article.author recomendado para E-E-A-T',
        path: 'Article.author'
      });
    }
  }

  // Validação 6: Tamanho do schema (< 100KB)
  const schemaSize = new Blob([JSON.stringify(schema)]).size;
  if (schemaSize > 100 * 1024) {
    errors.push({
      severity: 'ERROR',
      message: `Schema muito grande: ${(schemaSize / 1024).toFixed(2)}KB (máx 100KB). Reduza reviews ou dados.`,
      path: 'size'
    });
  }

  return {
    isValid: errors.filter(e => e.severity === 'ERROR').length === 0,
    errors
  };
}
