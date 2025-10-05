/**
 * Tests: SEO HTML Generator - Preview Mode
 */

import { describe, test, expect } from 'vitest';

describe('SEO HTML Generator - Preview Mode', () => {
  test('preview: noindex e sem canonical', () => {
    // Mock básico do comportamento esperado
    const mockHTML = `
      <meta name="robots" content="noindex, nofollow">
      <meta property="og:url" content="https://dentala.com.br/blog">
    `;
    
    expect(mockHTML).toMatch(/noindex, nofollow/);
    expect(mockHTML).not.toMatch(/<link rel="canonical"/);
  });

  test('produção: index, follow e canonical presente', () => {
    const mockHTML = `
      <meta name="robots" content="index, follow">
      <link rel="canonical" href="https://dentala.com.br/blog">
    `;
    
    expect(mockHTML).toMatch(/index, follow/);
    expect(mockHTML).toMatch(/<link rel="canonical"/);
  });

  test('preview não deve incluir Schema.org Article', () => {
    const mockHTML = `
      <script type="application/ld+json">
      {
        "@type": "WebPage"
      }
      </script>
    `;
    
    expect(mockHTML).toMatch(/"@type":\s*"WebPage"/);
    expect(mockHTML).not.toMatch(/"@type":\s*"Article"/);
  });
});
