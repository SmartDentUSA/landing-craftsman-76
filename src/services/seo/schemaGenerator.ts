/**
 * Serviço para geração de Schema.org JSON-LD
 * Extraído de useSEOHTMLGenerator para melhor modularidade
 */

import { validateSchemaOrg } from '@/lib/seo-validators';

export interface SchemaOptions {
  type: 'Article' | 'BlogPosting' | 'Product' | 'LocalBusiness' | 'ItemList';
  name: string;
  description?: string;
  url?: string;
  author?: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  datePublished?: string;
  dateModified?: string;
  image?: string;
  publisher?: {
    '@type': 'Organization';
    name: string;
    logo?: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  [key: string]: any;
}

export function generateSchema(options: SchemaOptions): string {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': options.type,
    ...options
  };
  
  // Remove fields used only for config
  delete schema.type;
  
  // Validate schema
  const validation = validateSchemaOrg(schema);
  
  if (!validation.valid) {
    console.error('❌ Schema validation errors:', validation.errors);
    // Return minimal valid schema as fallback
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: options.name
    }, null, 2);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Schema validation warnings:', validation.warnings);
  }
  
  return JSON.stringify(schema, null, 2);
}

export function generateBlogListSchema(blogs: Array<{ title: string; description?: string; url?: string }>): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: blogs.length,
    itemListElement: blogs.map((blog, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Article',
        headline: blog.title,
        description: blog.description || '',
        url: blog.url || ''
      }
    }))
  };
  
  return JSON.stringify(schema, null, 2);
}
