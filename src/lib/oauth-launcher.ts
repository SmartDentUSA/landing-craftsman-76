/**
 * Corrige o bloqueio do Google OAuth dentro do sandbox do Lovable.
 * Detecta iframes e força a navegação fora do contexto (window.top).
 * Compatível com Lovable Preview, Produção e localhost.
 */

export interface OAuthLaunchOptions {
  /** URL completa de autenticação do Google */
  authUrl: string;

  /** Identificador do fluxo (YouTube ou Google Business) */
  source: 'youtube' | 'google-business';

  /** Origem usada para rota de fallback (/oauth/launch) */
  fallbackOrigin?: string;

  /** Callback opcional quando popup é bloqueado */
  onBlocked?: () => void;
}

export function launchGoogleOAuth({
  authUrl,
  source,
  fallbackOrigin = window.location.origin,
  onBlocked,
}: OAuthLaunchOptions): void {
  if (!authUrl || typeof authUrl !== "string") {
    console.error("❌ URL OAuth inválida:", authUrl);
    throw new Error("URL de autenticação inválida");
  }

  const inIframe = window.self !== window.top;
  console.log(`🔍 [${source}] Diagnóstico OAuth:`, {
    inIframe,
    currentOrigin: window.location.origin,
    fallbackOrigin,
    authUrlPreview: authUrl.substring(0, 60) + '...',
  });

  try {
    if (inIframe) {
      console.warn(`⚠️ [${source}] Iframe detectado — usando rota intermediária /oauth/launch`);
      const launchUrl = `${fallbackOrigin}/oauth/launch?target=${encodeURIComponent(authUrl)}`;
      const newTab = window.open(launchUrl, "_blank", "noopener,noreferrer");
      if (!newTab) {
        console.error("❌ Nova aba bloqueada pelo navegador");
        if (onBlocked) onBlocked();
      } else {
        console.log("✅ Nova aba aberta com sucesso:", launchUrl);
      }
    } else {
      console.log(`✅ [${source}] Ambiente top-level — redirecionamento direto`);
      try {
        window.location.assign(authUrl);
      } catch (err) {
        console.error(`❌ [${source}] location.assign falhou:`, err);
        window.location.replace(authUrl);
      }
    }
  } catch (error) {
    console.error(`❌ [${source}] Erro crítico ao iniciar OAuth:`, error);
    if (onBlocked) onBlocked();
  }
}
