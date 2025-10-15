import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

const ProtectedRoute = ({ children, requiredRole = 'user' }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.warn('Session error:', error);
        }

        if (!session?.user) {
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            console.log('No session found, redirecting to auth');
            navigate("/auth", { replace: true });
          }
          return;
        }

        console.log('Session found for user:', session.user.email);
        setUser(session.user);

        // Verificar role do usuário via RPC
        let role: 'admin' | 'user' = 'user';
        
        try {
          const { data: isAdmin, error: roleError } = await supabase
            .rpc('has_role', { 
              _user_id: session.user.id, 
              _role: 'admin' 
            });

          if (roleError) {
            console.error('❌ Role check failed:', {
              message: roleError.message,
              code: roleError.code,
              hint: roleError.hint,
              details: roleError.details,
              user: session.user.email
            });
            role = 'user';
          } else {
            role = isAdmin ? 'admin' : 'user';
            console.log('✅ Role verificado:', role, 'para', session.user.email);
          }
        } catch (rpcError) {
          console.error('❌ RPC has_role exception:', rpcError);
          role = 'user';
        }

        if (!mounted) return;

        console.log('User role determined:', role);
        setUserRole(role);
        setLoading(false);
      } catch (error) {
        console.error('Authentication check failed:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Listen for auth changes with improved handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change event:', event, session?.user?.email);
        
        // Reset navigation flag on significant auth changes
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
          hasNavigated.current = false;
        }
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setUserRole(null);
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            console.log('User signed out, redirecting to auth');
            navigate("/auth", { replace: true });
          }
        } else if (session?.user) {
          setUser(session.user);
          // Trigger role check for new sessions
          if (event === 'SIGNED_IN') {
            checkAuth();
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Add timeout for loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Auth check timeout - proceeding with fallback');
        setLoadingTimeout(true);
        setLoading(false);
      }
    }, 12000); // 12 second timeout

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

  // Handle timeout scenario
  if (loadingTimeout && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-card rounded-lg shadow-medium p-6 border">
            <div className="text-xl font-semibold mb-2 text-foreground">Problema de Conexão</div>
            <p className="text-muted-foreground mb-4">
              Não foi possível verificar sua autenticação. Verifique sua conexão e tente novamente.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show access denied message for admin-only routes (only for non-admin users)
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
              Esta página requer privilégios de administrador. Apenas administradores podem acessar o editor de landing pages.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;