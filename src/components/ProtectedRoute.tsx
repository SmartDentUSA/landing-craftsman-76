import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthReady } from "@/hooks/useAuthReady";
import { CategoryProvider } from "@/contexts/CategoryContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

const PUBLISHED_URL = "https://landing-craftsman-76.lovable.app";

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { authStatus, user, error, clearSession } = useAuthReady();
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  const isPreview = window.self !== window.top;

  useEffect(() => {
    if (authStatus === 'ready' && !user && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate("/auth", { replace: true });
    }
    if (user) {
      hasNavigated.current = false;
    }
  }, [authStatus, user, navigate]);

  // Loading state
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-lg text-muted-foreground">Verificando autenticação...</div>
        </div>
      </div>
    );
  }

  // Timeout or error — show recovery UI
  if (authStatus === 'timeout' || authStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-card rounded-lg shadow-md p-6 border space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {authStatus === 'timeout' ? 'Conexão lenta' : 'Erro de autenticação'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {error || (authStatus === 'timeout'
                ? 'A verificação de sessão demorou demais. Isso pode acontecer com conexão instável.'
                : 'Não foi possível verificar sua sessão.')}
            </p>

            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                Tentar novamente
              </Button>
              <Button 
                onClick={async () => { await clearSession(); navigate('/auth', { replace: true }); }} 
                variant="outline" 
                className="w-full"
              >
                Limpar sessão e fazer login
              </Button>
              {isPreview && (
                <a 
                  href={`${PUBLISHED_URL}/auth`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="secondary" className="w-full">
                    Abrir no site publicado
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No user after ready
  if (!user) return null;

  // Admin guard temporariamente desativado a pedido do usuário.
  // Reativar quando o has_role RPC estiver confiável.

  return <CategoryProvider>{children}</CategoryProvider>;
};

export default ProtectedRoute;
