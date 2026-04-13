import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthReady } from "@/hooks/useAuthReady";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

const ProtectedRoute = ({ children, requiredRole = 'user' }: ProtectedRouteProps) => {
  const { isReady, user, userRole } = useAuthReady();
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  // Only redirect when auth is confirmed ready and no user
  useEffect(() => {
    if (isReady && !user && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate("/auth", { replace: true });
    }
    // Reset flag if user comes back
    if (user) {
      hasNavigated.current = false;
    }
  }, [isReady, user, navigate]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-lg text-muted-foreground">Verificando autenticação...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Admin check — show content immediately if role not yet resolved,
  // block only when confirmed as 'user' and admin is required
  if (requiredRole === 'admin' && userRole === 'user') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-card rounded-lg shadow-medium p-6 border">
            <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-4">
              Esta página requer privilégios de administrador.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">Voltar ao Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
