/**
 * useOAuth - Hook unificado para fluxo OAuth multi-provider
 */

import { supabase } from "@/integrations/supabase/client";
import { OAuthProvider, buildAuthUrl, getRedirectUri } from "@/lib/oauth";

interface UseOAuthReturn {
  start: (config_id: string) => Promise<void>;
  exchange: (code: string, config_id: string) => Promise<{ refresh_token: string }>;
}

export function useOAuth(provider: OAuthProvider): UseOAuthReturn {
  const start = async (config_id: string) => {
    try {
      const { data, error } = await supabase
        .from("oauth_client_configs")
        .select("client_id")
        .eq("id", config_id)
        .single();

      if (error) throw new Error(`Erro ao buscar config: ${error.message}`);
      if (!data) throw new Error("Configuração OAuth não encontrada");

      // config_id is encoded in the state parameter (survives cross-domain redirect)
      const authUrl = buildAuthUrl(data.client_id, provider, config_id);

      console.log(`🔐 Redirecionando para OAuth ${provider}...`);
      window.location.href = authUrl;
    } catch (err) {
      console.error("❌ Erro ao iniciar OAuth:", err);
      throw err;
    }
  };

  const exchange = async (code: string, config_id: string) => {
    try {
      console.log(`🔄 Trocando código OAuth ${provider}...`);

      const { data, error } = await supabase.functions.invoke("exchange-oauth-code", {
        body: { code, provider, config_id, redirect_uri: getRedirectUri() },
      });

      if (error) throw new Error(`Erro na Edge Function: ${error.message}`);
      if (!data?.refresh_token) throw new Error("Refresh token não retornado");

      console.log("✅ Refresh token obtido com sucesso");
      return { refresh_token: data.refresh_token };
    } catch (err) {
      console.error("❌ Erro ao trocar código OAuth:", err);
      throw err;
    }
  };

  return { start, exchange };
}
