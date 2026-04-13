/**
 * Hook centralizado de autenticação.
 * Fonte única de verdade para isReady, user e role.
 * Evita race conditions e falsos logouts.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const RPC_TIMEOUT_MS = 2000;

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

interface AuthReadyState {
  isReady: boolean;
  user: User | null;
  isAuthenticated: boolean;
  userRole: 'admin' | 'user' | null;
  error: string | null;
}

export function useAuthReady(): AuthReadyState {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Verificar sessão inicial
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (sessionError) {
          console.warn("useAuthReady: Session error", sessionError.message);
          setError(sessionError.message);
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsReady(true);

        // Resolve role in background
        if (currentUser) {
          setUserRole('user'); // default immediately
          const role = await checkRoleWithTimeout(currentUser.id);
          if (mounted) setUserRole(role);
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error("useAuthReady: Exception", err);
        setError(err.message);
        setIsReady(true);
      }
    };

    checkSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log("useAuthReady: Auth state change", event);

        // Ignore transient events that don't indicate real logout
        if (event === 'TOKEN_REFRESHED') {
          // Token refreshed — keep current user, just update if needed
          if (session?.user) {
            setUser(session.user);
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserRole(null);
          setError(null);
          setIsReady(true);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          const newUser = session?.user ?? null;
          setUser(newUser);
          setError(null);
          setIsReady(true);

          if (newUser) {
            setUserRole('user');
            checkRoleWithTimeout(newUser.id).then(role => {
              if (mounted) setUserRole(role);
            });
          }
          return;
        }

        // For any other event, update user but don't clear it unless explicitly null
        if (session?.user) {
          setUser(session.user);
        }
        setIsReady(true);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    isReady,
    user,
    isAuthenticated: !!user,
    userRole,
    error
  };
}
