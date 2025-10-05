/**
 * Tests: Strategic Blog Input Builder
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { saveSEOContext, clearAllSEOContexts } from '../src/services/seoContextStore';
import { buildStrategicBlogInput } from '../src/services/strategicBlogInput';

describe('Strategic Blog Input', () => {
  beforeEach(async () => {
    await clearAllSEOContexts();
  });

  test('retorna null quando não há SEO Context', async () => {
    const result = await buildStrategicBlogInput('lp_vazio', 'https://dentala.com.br');
    expect(result).toBeNull();
  });

  test('gera HTML com autolink 1ª ocorrência', async () => {
    const lp = 'lp_test';
    
    await saveSEOContext({
      landingPageId: lp,
      baseTextMarkdown: '## Título\n\nImpressão 3D é essencial. A impressão 3D revoluciona.',
      aiKeywords: [{ term: 'Impressão 3D' }],
      resolvedKeywords: [
        {
          source: 'Repository',
          term: 'Impressão 3D',
          matched: true,
          status: 'approved',
          url: '/p/3d',
        },
      ],
    });
    
    const result = await buildStrategicBlogInput(lp, 'https://dentala.com.br');
    
    expect(result).not.toBeNull();
    expect(result?.baseTextHTML).toContain('<a href="https://dentala.com.br/p/3d"');
    
    // Deve linkar apenas 1ª ocorrência
    const matches = result?.baseTextHTML.match(/href="https:\/\/dentala\.com\.br\/p\/3d"/g);
    expect(matches).toHaveLength(1);
  });

  test('remove rótulos internos ([nlog], [estratégico], etc.)', async () => {
    const lp = 'lp_sanitize';
    
    await saveSEOContext({
      landingPageId: lp,
      baseTextMarkdown: '## Título [nlog]\n\nConteúdo estratégico [estratégico] e técnico [técnico].',
      aiKeywords: [],
      resolvedKeywords: [],
    });
    
    const result = await buildStrategicBlogInput(lp, 'https://eodonto.com.br');
    
    expect(result?.baseTextHTML).not.toMatch(/\[?nlog\]?/i);
    expect(result?.baseTextHTML).not.toMatch(/\[?estratégico\]?/i);
    expect(result?.baseTextHTML).not.toMatch(/\[?técnico\]?/i);
    expect(result?.baseTextHTML).not.toMatch(/\[?comercial\]?/i);
  });

  test('sanitiza anchors aninhados', async () => {
    const lp = 'lp_anchors';
    
    await saveSEOContext({
      landingPageId: lp,
      baseTextMarkdown: 'Texto com [link](https://example.com) normal.',
      aiKeywords: [],
      resolvedKeywords: [
        {
          source: 'Repository',
          term: 'link',
          matched: true,
          status: 'approved',
          url: '/outro',
        },
      ],
    });
    
    const result = await buildStrategicBlogInput(lp, 'https://dentala.com.br');
    
    // Não deve criar <a> dentro de <a>
    expect(result?.baseTextHTML).not.toMatch(/<a[^>]*>.*<a/i);
  });

  test('respeita limite de 12 links', async () => {
    const lp = 'lp_limit';
    
    const keywords = Array.from({ length: 20 }, (_, i) => ({
      source: 'Repository' as const,
      term: `Termo${i}`,
      matched: true,
      status: 'approved' as const,
      url: `/p/${i}`,
    }));
    
    const markdown = keywords.map((k, i) => `${k.term} aparece aqui.`).join(' ');
    
    await saveSEOContext({
      landingPageId: lp,
      baseTextMarkdown: markdown,
      aiKeywords: [],
      resolvedKeywords: keywords,
    });
    
    const result = await buildStrategicBlogInput(lp, 'https://dentala.com.br');
    
    const linkMatches = result?.baseTextHTML.match(/<a href=/g);
    expect(linkMatches?.length).toBeLessThanOrEqual(12);
  });

  test('URLs absolutas são preservadas', async () => {
    const lp = 'lp_absolute';
    
    await saveSEOContext({
      landingPageId: lp,
      baseTextMarkdown: 'Link externo aqui.',
      aiKeywords: [],
      resolvedKeywords: [
        {
          source: 'Manual',
          term: 'externo',
          matched: true,
          status: 'approved',
          url: 'https://external.com/page',
        },
      ],
    });
    
    const result = await buildStrategicBlogInput(lp, 'https://dentala.com.br');
    
    expect(result?.baseTextHTML).toContain('href="https://external.com/page"');
  });
});
