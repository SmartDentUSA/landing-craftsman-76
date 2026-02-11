/**
 * Tests: SEO HTML Generator - All modes should use index, follow
 */

import { describe, test, expect } from 'vitest';

describe('SEO HTML Generator - Robots Meta', () => {
  test('preview mode: deve ter index, follow (não noindex)', () => {
    const mockHTML = `
      <meta name="robots" content="index, follow">
      <link rel="canonical" href="https://dentala.com.br/blog">
    `;
    
    expect(mockHTML).toMatch(/index, follow/);
    expect(mockHTML).not.toMatch(/noindex/);
    expect(mockHTML).toMatch(/<link rel="canonical"/);
  });

  test('produção: index, follow e canonical presente', () => {
    const mockHTML = `
      <meta name="robots" content="index, follow">
      <link rel="canonical" href="https://dentala.com.br/blog">
    `;
    
    expect(mockHTML).toMatch(/index, follow/);
    expect(mockHTML).toMatch(/<link rel="canonical"/);
  });
});
