/**
 * Helper para gerenciar domínios multi-site
 */

/**
 * Obtém o domínio atual da aplicação
 * @returns O hostname atual ou 'smartdent.com.br' como fallback
 */
export function getCurrentDomain(): string {
  if (typeof window === 'undefined') return 'smartdent.com.br';
  return window.location.hostname;
}

/**
 * Verifica se o domínio atual corresponde a um dos domínios esperados
 * @param expectedDomains - Lista de domínios para verificar
 * @returns true se o domínio atual está na lista
 */
export function isCurrentDomain(...expectedDomains: string[]): boolean {
  const currentDomain = getCurrentDomain();
  return expectedDomains.some(domain => 
    currentDomain.includes(domain) || domain === currentDomain
  );
}

/**
 * Constantes de domínios conhecidos
 */
export const DOMAINS = {
  DENTALA: 'dentala.com.br',
  EODONTO: 'eodonto.com.br',
  SMARTDENT: 'smartdent.com.br',
} as const;
