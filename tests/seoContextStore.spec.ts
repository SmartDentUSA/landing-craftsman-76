/**
 * Tests: SEO Context Store
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  saveSEOContext,
  getLatestSEOContext,
  getAllSEOContexts,
  clearSEOContext,
  clearAllSEOContexts,
} from '../src/services/seoContextStore';

describe('SEO Context Store', () => {
  beforeEach(async () => {
    await clearAllSEOContexts();
  });

  test('salva e retorna o mais recente', async () => {
    const id = 'lp_123';
    
    await saveSEOContext({
      landingPageId: id,
      baseTextMarkdown: 'Conteúdo A',
      aiKeywords: [],
      resolvedKeywords: [],
    });
    
    const out = await getLatestSEOContext(id);
    expect(out?.baseTextMarkdown).toBe('Conteúdo A');
  });

  test('mantém múltiplas versões (mais recente primeiro)', async () => {
    const id = 'lp_456';
    
    await saveSEOContext({
      landingPageId: id,
      baseTextMarkdown: 'V1',
      aiKeywords: [],
      resolvedKeywords: [],
    });
    
    await saveSEOContext({
      landingPageId: id,
      baseTextMarkdown: 'V2',
      aiKeywords: [],
      resolvedKeywords: [],
    });
    
    const latest = await getLatestSEOContext(id);
    expect(latest?.baseTextMarkdown).toBe('V2');
    
    const all = await getAllSEOContexts(id);
    expect(all).toHaveLength(2);
    expect(all[0].baseTextMarkdown).toBe('V2');
    expect(all[1].baseTextMarkdown).toBe('V1');
  });

  test('limita versões em memória (MAX 10)', async () => {
    const id = 'lp_overflow';
    
    for (let i = 1; i <= 15; i++) {
      await saveSEOContext({
        landingPageId: id,
        baseTextMarkdown: `V${i}`,
        aiKeywords: [],
        resolvedKeywords: [],
      });
    }
    
    const all = await getAllSEOContexts(id);
    expect(all).toHaveLength(10);
    expect(all[0].baseTextMarkdown).toBe('V15'); // Mais recente
    expect(all[9].baseTextMarkdown).toBe('V6');  // Mais antiga mantida
  });

  test('retorna null quando não existe contexto', async () => {
    const out = await getLatestSEOContext('lp_nao_existe');
    expect(out).toBeNull();
  });

  test('clearSEOContext remove contexto específico', async () => {
    await saveSEOContext({
      landingPageId: 'lp_A',
      baseTextMarkdown: 'A',
      aiKeywords: [],
      resolvedKeywords: [],
    });
    
    await saveSEOContext({
      landingPageId: 'lp_B',
      baseTextMarkdown: 'B',
      aiKeywords: [],
      resolvedKeywords: [],
    });
    
    await clearSEOContext('lp_A');
    
    expect(await getLatestSEOContext('lp_A')).toBeNull();
    expect(await getLatestSEOContext('lp_B')).not.toBeNull();
  });
});
