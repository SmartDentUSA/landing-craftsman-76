import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

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

    if (code) {
      // Redirecionar baseado no parâmetro state
      if (state === "google-business") {
        console.log("OAuth callback recebido para Google Business, redirecionando com code:", code);
        navigate("/repository", { 
          replace: true,
          state: { 
            openOAuthModal: true, 
            code,
            activeView: 'google-business'
          }
        });
      } else if (state === "youtube") {
        console.log("OAuth callback recebido para YouTube, redirecionando com code no query param:", code);
        navigate(`/repository?code=${code}`, { 
          replace: true,
          state: { 
            activeView: 'youtube'
          }
        });
      } else {
        // Fallback para YouTube (compatibilidade com fluxo antigo)
        console.log("OAuth callback sem state, usando fallback para YouTube");
        navigate(`/repository?code=${code}`, { 
          replace: true,
          state: { 
            activeView: 'youtube'
          }
        });
      }
    } else {
      // Se não tem code nem error, volta para repository
      navigate("/repository", { replace: true });
    }
  }, [params, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Processando autenticação do YouTube...</p>
    </div>
  );
}
