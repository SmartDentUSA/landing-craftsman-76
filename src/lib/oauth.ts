/**
 * OAuth Multi-Origem - Configuração de Redirect URIs
 * Suporta Produção, Preview Lovable, Localhost (dev)
 */

export const ALLOWED_REDIRECT_ORIGINS = new Set([
  "https://landing-craftsman-76.lovable.app",
  "https://b282ae68-9aa1-4f3f-8597-81ef6773926f.lovableproject.com",
  "http://localhost:5173",
  "http://localhost:3000",
]);

export const CANONICAL_REDIRECT = "https://landing-craftsman-76.lovable.app/oauth2/callback";

/**
 * Retorna redirect_uri dinâmico baseado na origem atual
 * Fallback para CANONICAL_REDIRECT se origem não for permitida
 */
export function getRedirectUri(): string {
  const origin = window.location.origin;
  if (ALLOWED_REDIRECT_ORIGINS.has(origin)) {
    return `${origin}/oauth2/callback`;
  }
  console.warn(`⚠️ Origem não permitida: ${origin}. Usando canônico.`);
  return CANONICAL_REDIRECT;
}
