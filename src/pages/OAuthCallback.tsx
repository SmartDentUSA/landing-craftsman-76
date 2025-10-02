import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = params.get("code");
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
      console.log("OAuth code received, redirecting to repository");
      
      // Redirecionar para Repository com flag para abrir modal
      navigate("/repository", { 
        replace: true,
        state: { openOAuthModal: true, code }
      });
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
