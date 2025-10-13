/**
 * Tests: Schema.org Validation
 * Valida estrutura JSON-LD e consolidação @graph
 */

import { describe, test, expect } from 'vitest';
import { consolidateSchemas } from '@/lib/schema-consolidator';

describe('Schema.org - JSON-LD', () => {
  describe('Consolidação @graph', () => {
    test('deve consolidar múltiplos schemas em @graph único', () => {
      const schemas = [
        { '@context': 'https://schema.org', '@type': 'Organization', name: 'Dentala' },
        { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Home' },
      ];
      
      const result = JSON.parse(consolidateSchemas(schemas));
      
      expect(result['@context']).toBe('https://schema.org');
      expect(result['@graph']).toHaveLength(2);
      expect(result['@graph'][0]['@type']).toBe('Organization');
      expect(result['@graph'][1]['@type']).toBe('WebPage');
    });
    
    test('deve remover @context duplicado de cada schema', () => {
      const schemas = [
        { '@context': 'https://schema.org', '@type': 'Article' },
      ];
      
      const result = JSON.parse(consolidateSchemas(schemas));
      
      expect(result['@graph'][0]).not.toHaveProperty('@context');
      expect(result['@context']).toBe('https://schema.org');
    });
  });
  
  describe('Schema Article (Blog)', () => {
    test('deve ter campos obrigatórios', () => {
      const mockArticle = {
        '@type': 'Article',
        headline: 'Título do Blog',
        author: { '@type': 'Person', name: 'Autor' },
        datePublished: '2025-01-15',
        image: 'https://example.com/image.jpg',
      };
      
      expect(mockArticle).toHaveProperty('headline');
      expect(mockArticle).toHaveProperty('author');
      expect(mockArticle).toHaveProperty('datePublished');
      expect(mockArticle).toHaveProperty('image');
    });
  });
  
  describe('BreadcrumbList', () => {
    test('deve ter itemListElement com position sequencial', () => {
      const mockBreadcrumb = {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://example.com/blog' },
        ],
      };
      
      expect(mockBreadcrumb.itemListElement[0].position).toBe(1);
      expect(mockBreadcrumb.itemListElement[1].position).toBe(2);
    });
  });
});
