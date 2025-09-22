import { useEffect, useState } from "react";
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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 Starting authentication check...');
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('📝 Session data:', { 
          hasSession: !!session, 
          hasUser: !!session?.user, 
          userId: session?.user?.id,
          email: session?.user?.email,
          sessionError 
        });
        
        if (!session?.user) {
          console.log('❌ No valid session found, redirecting to auth');
          navigate("/auth");
          return;
        }

        setUser(session.user);
        console.log('✅ User session validated:', session.user.email);

        // Check if user has admin role using RPC function
        console.log('🔍 Checking admin role for user:', session.user.id);
        const { data: isAdmin, error: roleError } = await supabase
          .rpc('has_role', { 
            _user_id: session.user.id, 
            _role: 'admin' 
          });

        console.log('📋 Role check result:', { isAdmin, roleError });

        // Handle role check errors gracefully
        if (roleError) {
          console.error('❌ Role check failed:', roleError);
          // Fallback: treat as regular user if role check fails
          setUserRole('user');
        } else {
          const role = isAdmin ? 'admin' : 'user';
          setUserRole(role);
          console.log('✅ Role assigned:', role);
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ Authentication check failed:', error);
        // Force refresh of auth state
        await supabase.auth.refreshSession();
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, requiredRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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