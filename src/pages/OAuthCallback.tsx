import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      console.error("OAuth error:", error);
      navigate("/repository", { 
        replace: true,
        state: { oauthError: error }
      });
      return;
    }

    if (!code) {
      navigate("/repository", { replace: true });
      return;
    }

    // Exchange the code right here instead of delegating
    exchangeCode(code, state || 'youtube');
  }, [params, navigate]);

  const exchangeCode = async (code: string, state: string) => {
    try {
      setMessage('Trocando código por token...');
      
      const provider = state === 'google-business' || state === 'googleBusiness' 
        ? 'googleBusiness' 
        : 'youtube';

      // Get user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Get config_id from sessionStorage (saved during OAuth start)
      const configId = sessionStorage.getItem('oauth_config_id');
      
      if (configId) {
        // Use the exchange-oauth-code edge function
        console.log(`🔄 Exchanging code via edge function (provider=${provider}, config=${configId})`);
        const { data, error } = await supabase.functions.invoke("exchange-oauth-code", {
          body: { code, provider, config_id: configId },
        });

        if (error) throw new Error(`Exchange failed: ${error.message}`);
        if (!data?.refresh_token) throw new Error("Refresh token não retornado");

        console.log("✅ OAuth exchange successful, refresh_token saved");
        sessionStorage.removeItem('oauth_config_id');
        sessionStorage.removeItem('oauth_provider');
      } else {
        // Fallback: save directly using GOOGLE_CLIENT_ID/SECRET from env
        // Call a simpler exchange that uses env vars
        console.log(`🔄 Exchanging code via direct flow (provider=${provider})`);
        const { data, error } = await supabase.functions.invoke("exchange-oauth-code-direct", {
          body: { code, provider },
        });

        if (error) {
          console.warn("Direct exchange not available, redirecting to config page");
          // Just redirect with the code for the settings page to handle
          const activeView = provider === 'googleBusiness' ? 'google-business' : 'youtube';
          navigate("/repository", { 
            replace: true,
            state: { openOAuthModal: true, code, activeView }
          });
          return;
        }
      }

      setStatus('success');
      setMessage('Autenticação concluída!');
      
      // Redirect to the correct tab in repository
      const activeView = provider === 'googleBusiness' ? 'google-business' : 'youtube';
      setTimeout(() => {
        navigate("/repository", { 
          replace: true,
          state: { activeView, oauthSuccess: true }
        });
      }, 1500);

    } catch (err: any) {
      console.error("❌ OAuth exchange error:", err);
      setStatus('error');
      setMessage(err.message || 'Erro ao processar autenticação');
      
      // Still redirect after a delay
      const provider = (params.get("state") || '').includes('business') ? 'google-business' : 'youtube';
      setTimeout(() => {
        navigate("/repository", { 
          replace: true,
          state: { activeView: provider, oauthError: err.message }
        });
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
