/**
 * useOAuth - Hook unificado para fluxo OAuth multi-provider
 * Suporta: YouTube, Google Business Profile
 */

import { supabase } from "@/integrations/supabase/client";
import { OAuthProvider, buildAuthUrl } from "@/lib/oauth";

interface UseOAuthReturn {
  start: (config_id: string) => Promise<void>;
  exchange: (code: string, config_id: string) => Promise<{ refresh_token: string }>;
}

export function useOAuth(provider: OAuthProvider): UseOAuthReturn {
  /**
   * Inicia o fluxo OAuth redirecionando para o Google
   */
  const start = async (config_id: string) => {
    try {
      // 1. Buscar apenas client_id do backend (sem expor client_secret)
      const { data, error } = await supabase
        .from("oauth_client_configs")
        .select("client_id")
        .eq("id", config_id)
        .single();

      if (error) throw new Error(`Erro ao buscar config: ${error.message}`);
      if (!data) throw new Error("Configuração OAuth não encontrada");

      // 2. Construir URL de autorização
      const authUrl = buildAuthUrl(data.client_id, provider);

      // 3. Salvar config_id no sessionStorage para callback
      sessionStorage.setItem("oauth_config_id", config_id);
      sessionStorage.setItem("oauth_provider", provider);

      // 4. Redirecionar para Google OAuth
      console.log(`🔐 Redirecionando para OAuth ${provider}...`);
      window.location.href = authUrl;
    } catch (err) {
      console.error("❌ Erro ao iniciar OAuth:", err);
      throw err;
    }
  };

  /**
   * Troca o código de autorização por refresh_token
   */
  const exchange = async (code: string, config_id: string) => {
    try {
      console.log(`🔄 Trocando código OAuth ${provider}...`);

      // Invocar Edge Function segura (valida JWT, busca client_secret, troca tokens)
      const { data, error } = await supabase.functions.invoke("exchange-oauth-code", {
        body: { code, provider, config_id },
      });

      if (error) throw new Error(`Erro na Edge Function: ${error.message}`);
      if (!data?.refresh_token) throw new Error("Refresh token não retornado");

      console.log("✅ Refresh token obtido e armazenado com sucesso");
      return { refresh_token: data.refresh_token };
    } catch (err) {
      console.error("❌ Erro ao trocar código OAuth:", err);
      throw err;
    }
  };

  return { start, exchange };
}
