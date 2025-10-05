/**
 * SEO Context Store
 * Persistência em memória do SEO Context (stub para migração futura para Supabase)
 */

import { SEOContext, KeywordResolution, KeywordSuggestion } from '@/types/seo';

// Armazenamento em memória (Map por landingPageId)
const _mem = new Map<string, SEOContext[]>();

// Limite de versões mantidas em memória
const MAX_VERSIONS_PER_LP = 10;

interface SaveSEOContextPayload {
  landingPageId: string;
  baseTextMarkdown: string;
  aiKeywords: KeywordSuggestion[];
  resolvedKeywords: KeywordResolution[];
  locale?: 'pt_BR';
}

/**
 * Salva um novo SEO Context (versão mais recente)
 */
export async function saveSEOContext(payload: SaveSEOContextPayload): Promise<SEOContext> {
  const now = new Date().toISOString();
  const data: SEOContext = {
    id: `ctx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    landingPageId: payload.landingPageId,
    baseTextMarkdown: payload.baseTextMarkdown,
    aiKeywords: payload.aiKeywords,
    resolvedKeywords: payload.resolvedKeywords,
    createdAt: now,
    updatedAt: now,
    locale: payload.locale ?? 'pt_BR',
  };
  
  const arr = _mem.get(payload.landingPageId) || [];
  arr.unshift(data); // Mais recente no início
  
  // Limitar versões em memória
  if (arr.length > MAX_VERSIONS_PER_LP) {
    arr.pop();
  }
  
  _mem.set(payload.landingPageId, arr);
  return data;
}

/**
 * Retorna o SEO Context mais recente para uma landing page
 */
export async function getLatestSEOContext(landingPageId: string): Promise<SEOContext | null> {
  const arr = _mem.get(landingPageId);
  return arr?.[0] ?? null;
}

/**
 * Retorna todas as versões de SEO Context para uma landing page
 */
export async function getAllSEOContexts(landingPageId: string): Promise<SEOContext[]> {
  return _mem.get(landingPageId) || [];
}

/**
 * Limpa o cache de uma landing page específica
 */
export async function clearSEOContext(landingPageId: string): Promise<void> {
  _mem.delete(landingPageId);
}

/**
 * Limpa todo o cache (útil para testes)
 */
export async function clearAllSEOContexts(): Promise<void> {
  _mem.clear();
}
