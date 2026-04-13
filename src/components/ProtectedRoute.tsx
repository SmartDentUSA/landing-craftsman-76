import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

const RPC_TIMEOUT_MS = 5000;

async function checkRoleWithTimeout(userId: string): Promise<'admin' | 'user'> {
  try {
    const rpcPromise = supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('RPC timeout')), RPC_TIMEOUT_MS)
    );
    const { data: isAdmin, error } = await Promise.race([rpcPromise, timeoutPromise]);
    if (error) {
      console.warn('Role check failed, defaulting to user:', error.message);
      return 'user';
    }
    return isAdmin ? 'admin' : 'user';
  } catch (err) {
    console.warn('Role check timeout/error, defaulting to user:', err);
    return 'user';
  }
}

const ProtectedRoute = ({ children, requiredRole = 'user' }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  useEffect(() => {
    let mounted = true;

    const resolveRole = async (sessionUser: User) => {
      if (!mounted) return;
      setUser(sessionUser);
      // Set loading false with default role immediately, upgrade if RPC succeeds
      const role = await checkRoleWithTimeout(sessionUser.id);
      if (!mounted) return;
      setUserRole(role);
      setLoading(false);
    };

    const checkAuth = async () => {
      try {
        // 2 retries max (0s + 1s delay = 1s total wait)
        for (let i = 0; i < 2; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await resolveRole(session.user);
            return;
          }
          if (i < 1) await new Promise(r => setTimeout(r, 1000));
        }

        // No session found
        if (mounted && !hasNavigated.current) {
          hasNavigated.current = true;
          navigate("/auth", { replace: true });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (mounted) setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setUserRole(null);
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            navigate("/auth", { replace: true });
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          hasNavigated.current = false;
          // Resolve role directly — don't re-run full checkAuth
          resolveRole(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // 8s fallback timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true);
        setLoading(false);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-lg text-muted-foreground">Verificando autenticação...</div>
        </div>
      </div>
    );
  }

  if (loadingTimeout && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-card rounded-lg shadow-medium p-6 border">
            <div className="text-xl font-semibold mb-2 text-foreground">Problema de Conexão</div>
            <p className="text-muted-foreground mb-4">
              Não foi possível verificar sua autenticação. Verifique sua conexão e tente novamente.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
              <Button variant="outline" onClick={() => navigate('/auth')}>Ir para Login</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

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
