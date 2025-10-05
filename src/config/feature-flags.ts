/**
 * Feature Flags
 * Controle de features experimentais e flags de ambiente
 */

// Helper para acessar env vars (Vite + SSR fallback)
const env = (key: string): string | undefined => {
  return (import.meta as any)?.env?.[key] ?? (typeof process !== 'undefined' ? process?.env?.[key] : undefined);
};

/**
 * Flag: SEO Context Inteligente
 * Ativa o sistema de SEO Context com IA + reconciliação de keywords
 */
export const isSEOContextEnabled = (): boolean => {
  return env('VITE_ENABLE_SEO_CONTEXT') === 'true';
};

/**
 * Flag: Auto-link em todos os conteúdos
 * Aplica auto-linking não só no SEO Context, mas também nos cards de blog
 */
export const isAutoLinkAllEnabled = (): boolean => {
  return env('VITE_LINK_AUTOLINK_ALL') === 'true';
};

/**
 * Debug: Logs detalhados de geração SEO
 */
export const DEBUG_SEO_GENERATION = env('VITE_DEBUG_SEO') === 'true';

/**
 * Helper para logs de debug SEO
 */
export const logSEODebug = (message: string, data?: any): void => {
  if (DEBUG_SEO_GENERATION) {
    console.log(`🔍[SEO] ${message}`, data ?? '');
  }
};
