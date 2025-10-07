/**
 * Corrige o bloqueio do Google OAuth dentro do sandbox do Lovable.
 * Detecta iframes e força a navegação fora do contexto (window.top).
 * Compatível com Lovable Preview, Produção e localhost.
 */

export interface OAuthLaunchOptions {
  authUrl: string;
  source: 'youtube' | 'google-business';
  onBlocked?: () => void;
}

export function launchGoogleOAuth({ authUrl, source, onBlocked }: OAuthLaunchOptions): void {
  if (!authUrl || typeof authUrl !== "string") {
    console.error("❌ URL OAuth inválida:", authUrl);
    throw new Error("URL de autenticação inválida");
  }

  const inIframe = window.self !== window.top;
  console.log(`🔍 [${source}] Ambiente detectado:`, {
    inIframe,
    currentOrigin: window.location.origin,
    topOrigin: inIframe ? 'cross-origin (blocked)' : window.location.origin,
  });

  try {
    if (inIframe) {
      console.warn(`⚠️ [${source}] Executando em iframe Lovable — forçando navegação top-level`);
      if (window.top) {
        window.top.location.href = authUrl;
      } else {
        window.location.assign(authUrl);
      }
    } else {
      console.log(`✅ [${source}] Ambiente principal — navegação normal`);
      window.location.assign(authUrl);
    }
  } catch (error) {
    console.error(`❌ [${source}] Erro ao iniciar OAuth:`, error);
    try {
      const popup = window.open(authUrl, 'GoogleOAuth', 'width=600,height=700');
      if (!popup && onBlocked) {
        onBlocked();
      }
    } catch (popupError) {
      console.error('❌ Popup também bloqueado:', popupError);
      if (onBlocked) {
        onBlocked();
      }
    }
  }
}
