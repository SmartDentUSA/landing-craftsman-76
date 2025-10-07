/**
 * OAuth Multi-Provider - Configuração Segura
 * Suporta YouTube e Google Business Profile
 */

export type OAuthProvider = "youtube" | "googleBusiness";

export const ALLOWED_REDIRECT_ORIGINS = new Set([
  "https://landing-craftsman-76.lovable.app",
  "https://b282ae68-9aa1-4f3f-8597-81ef6773926f.lovableproject.com",
  "http://localhost:5173",
  "http://localhost:3000",
]);

export const CANONICAL_REDIRECT = "https://landing-craftsman-76.lovable.app/oauth2/callback";

/**
 * Retorna redirect_uri dinâmico baseado na origem atual
 */
export function getRedirectUri(): string {
  const origin = window.location.origin;
  if (ALLOWED_REDIRECT_ORIGINS.has(origin)) {
    return `${origin}/oauth2/callback`;
  }
  console.warn(`⚠️ Origem não permitida: ${origin}. Usando canônico.`);
  return CANONICAL_REDIRECT;
}

/**
 * Retorna os scopes OAuth necessários para cada provider
 */
export function getScopes(provider: OAuthProvider): string[] {
  if (provider === "youtube") {
    return [
      "https://www.googleapis.com/auth/youtube.force-ssl",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];
  }
  
  // Google Business Profile
  return [
    "https://www.googleapis.com/auth/business.manage",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];
}

/**
 * Constrói a URL de autorização OAuth do Google
 */
export function buildAuthUrl(clientId: string, provider: OAuthProvider): string {
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", getRedirectUri());
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", getScopes(provider).join(" "));
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("state", provider);
  return auth.toString();
}
