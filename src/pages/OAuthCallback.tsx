import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { decodeOAuthState, getRedirectUri } from "@/lib/oauth";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state") || "";
    const error = params.get("error");

    if (error) {
      navigate("/repository", { replace: true, state: { oauthError: error } });
      return;
    }

    if (!code) {
      navigate("/repository", { replace: true });
      return;
    }

    exchangeCode(code, state);
  }, [params, navigate]);

  const exchangeCode = async (code: string, state: string) => {
    try {
      setMessage('Trocando código por token...');

      const { provider, configId } = decodeOAuthState(state);
      const redirect_uri = getRedirectUri();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (configId) {
        // Exchange via user's own OAuth client config
        console.log(`🔄 Exchange with config (provider=${provider}, config=${configId})`);
        const { data, error } = await supabase.functions.invoke("exchange-oauth-code", {
          body: { code, provider, config_id: configId, redirect_uri },
        });

        if (error) throw new Error(`Exchange failed: ${error.message}`);
        if (!data?.refresh_token) throw new Error("Refresh token não retornado");
        console.log("✅ OAuth exchange successful");
      } else {
        // Fallback: use env secrets (GOOGLE_CLIENT_ID/SECRET)
        console.log(`🔄 Direct exchange (provider=${provider})`);
        const { data, error } = await supabase.functions.invoke("exchange-oauth-code-direct", {
          body: { code, provider, redirect_uri },
        });

        if (error) throw new Error(`Direct exchange failed: ${error.message}`);
        if (!data?.refresh_token) throw new Error("Refresh token não retornado");
        console.log("✅ Direct exchange successful");
      }

      setStatus('success');
      setMessage('Autenticação concluída!');

      const activeView = provider === 'googleBusiness' ? 'google-business' : 'youtube';
      setTimeout(() => {
        navigate("/repository", { replace: true, state: { activeView, oauthSuccess: true } });
      }, 1500);

    } catch (err: any) {
      console.error("❌ OAuth exchange error:", err);
      setStatus('error');
      setMessage(err.message || 'Erro ao processar autenticação');

      setTimeout(() => {
        navigate("/repository", { replace: true, state: { oauthError: err.message } });
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className={`w-8 h-8 mb-4 ${status === 'error' ? 'text-destructive' : 'text-primary animate-spin'}`} />
      <p className="text-muted-foreground">{message}</p>
      {status === 'error' && (
        <p className="text-sm text-muted-foreground mt-2">Redirecionando em instantes...</p>
      )}
    </div>
  );
}
