/**
 * OAuth Multi-Provider - Configuração Segura
 * Suporta YouTube e Google Business Profile
 */

export type OAuthProvider = "youtube" | "googleBusiness";

export const ALLOWED_REDIRECT_ORIGINS = new Set([
  "https://landing-craftsman-76.lovable.app",
  "https://b282ae68-9aa1-4f3f-8597-81ef6773926f.lovableproject.com",
  "https://id-preview--b282ae68-9aa1-4f3f-8597-81ef6773926f.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
]);

// Always use the canonical redirect (registered in Google Console)
export const CANONICAL_REDIRECT = "https://landing-craftsman-76.lovable.app/oauth2/callback";

/**
 * Returns the redirect_uri to use for OAuth.
 * Always uses canonical to avoid cross-domain sessionStorage loss.
 */
export function getRedirectUri(): string {
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
  
  return [
    "https://www.googleapis.com/auth/business.manage",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];
}

/**
 * Encode state as provider:config_id so it survives cross-domain redirects
 */
export function encodeOAuthState(provider: OAuthProvider, configId?: string): string {
  return configId ? `${provider}:${configId}` : provider;
}

/**
 * Decode state from callback
 */
export function decodeOAuthState(state: string): { provider: OAuthProvider; configId?: string } {
  const parts = state.split(":");
  const providerRaw = parts[0];
  const provider: OAuthProvider = 
    providerRaw === "googleBusiness" || providerRaw === "google-business" 
      ? "googleBusiness" 
      : "youtube";
  const configId = parts.length > 1 ? parts.slice(1).join(":") : undefined;
  return { provider, configId };
}

/**
 * Constrói a URL de autorização OAuth do Google
 */
export function buildAuthUrl(clientId: string, provider: OAuthProvider, configId?: string): string {
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", getRedirectUri());
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", getScopes(provider).join(" "));
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("state", encodeOAuthState(provider, configId));
  return auth.toString();
}
