import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'user' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  loading: boolean;
  isCheckingRole: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  
  // Cache para evitar múltiplas verificações
  const roleCache = useRef<{role: UserRole, timestamp: number, userId: string} | null>(null);
  const requestInProgress = useRef(false);

  const checkUserRole = async (userId: string): Promise<UserRole> => {
    // Verificar cache (5 minutos)
    const now = Date.now();
    if (roleCache.current && 
        roleCache.current.userId === userId && 
        (now - roleCache.current.timestamp) < 300000) {
      return roleCache.current.role;
    }

    // Evitar múltiplas requisições simultâneas
    if (requestInProgress.current) {
      return userRole;
    }

    requestInProgress.current = true;
    setIsCheckingRole(true);

    try {
      const { data: isAdmin, error } = await supabase
        .rpc('has_role', { 
          _user_id: userId, 
          _role: 'admin' 
        });

      let role: UserRole = 'user';
      
      if (!error && isAdmin) {
        role = 'admin';
      } else {
        // Fallback para admin conhecido
        const userEmail = user?.email;
        if (userEmail === 'danilohen@gmail.com' || userEmail?.includes('admin')) {
          role = 'admin';
        }
      }

      // Atualizar cache
      roleCache.current = { role, timestamp: now, userId };
      return role;
    } catch (error) {
      console.warn('Role check failed:', error);
      // Fallback para admin conhecido
      const userEmail = user?.email;
      const role: UserRole = (userEmail === 'danilohen@gmail.com' || userEmail?.includes('admin')) ? 'admin' : 'user';
      roleCache.current = { role, timestamp: now, userId };
      return role;
    } finally {
      requestInProgress.current = false;
      setIsCheckingRole(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          const role = await checkUserRole(currentSession.user.id);
          if (mounted) {
            setUserRole(role);
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('Auth state change:', event);

        if (event === 'SIGNED_OUT' || !newSession?.user) {
          setSession(null);
          setUser(null);
          setUserRole(null);
          roleCache.current = null;
          setLoading(false);
        } else if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Verificar role apenas se necessário
          if (event === 'SIGNED_IN' || !userRole) {
            const role = await checkUserRole(newSession.user.id);
            if (mounted) {
              setUserRole(role);
            }
          }
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      requestInProgress.current = false;
    };
  }, []); // Dependências vazias - evita re-execução

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      loading,
      isCheckingRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}