/**
 * Hook centralizado de autenticação.
 * Fonte única de verdade para authStatus, user e role.
 * Registra onAuthStateChange ANTES de getSession para não perder eventos.
 * Inclui timeout para evitar spinner infinito.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const SESSION_TIMEOUT_MS = 8000;
const RPC_TIMEOUT_MS = 2000;

type AuthStatus = 'loading' | 'ready' | 'timeout' | 'error';

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
  authStatus: AuthStatus;
  isReady: boolean;
  user: User | null;
  isAuthenticated: boolean;
  userRole: 'admin' | 'user' | null;
  error: string | null;
  clearSession: () => Promise<void>;
}

export function useAuthReady(): AuthReadyState {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let sessionResolved = false;

    // Timeout fallback — if nothing resolves in time, mark as timeout
    const timeoutId = setTimeout(() => {
      if (mounted && !sessionResolved) {
        console.warn('useAuthReady: session timeout after', SESSION_TIMEOUT_MS, 'ms');
        sessionResolved = true;
        setAuthStatus('timeout');
      }
    }, SESSION_TIMEOUT_MS);

    const markReady = (u: User | null) => {
      if (!mounted) return;
      sessionResolved = true;
      clearTimeout(timeoutId);
      setUser(u);
      setAuthStatus('ready');
      setError(null);

      if (u) {
        setUserRole('user'); // default immediately
        checkRoleWithTimeout(u.id).then(role => {
          if (mounted) setUserRole(role);
        });
      } else {
        setUserRole(null);
      }
    };

    // 1. Register listener FIRST to not miss events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        console.log("useAuthReady: Auth event", event);

        if (event === 'TOKEN_REFRESHED') {
          if (session?.user) setUser(session.user);
          return;
        }

        if (event === 'SIGNED_OUT') {
          sessionResolved = true;
          clearTimeout(timeoutId);
          setUser(null);
          setUserRole(null);
          setError(null);
          setAuthStatus('ready');
          return;
        }

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          markReady(session?.user ?? null);
          return;
        }

        // Other events — update user if present
        if (session?.user) {
          setUser(session.user);
        }
      }
    );

    // 2. Then check initial session
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!mounted || sessionResolved) return;

      if (sessionError) {
        console.warn("useAuthReady: getSession error", sessionError.message);
        setError(sessionError.message);
        // Don't block — mark ready with no user
        markReady(null);
        return;
      }

      markReady(session?.user ?? null);
    }).catch((err: any) => {
      if (!mounted || sessionResolved) return;
      console.error("useAuthReady: getSession exception", err);
      setError(err?.message || 'Session fetch failed');
      sessionResolved = true;
      clearTimeout(timeoutId);
      setAuthStatus('error');
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const clearSession = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Force clear local storage as fallback
      localStorage.removeItem('sb-pgfgripuanuwwolmtknn-auth-token');
    }
    setUser(null);
    setUserRole(null);
    setAuthStatus('ready');
    setError(null);
  };

  return {
    authStatus,
    isReady: authStatus === 'ready' || authStatus === 'timeout',
    user,
    isAuthenticated: !!user,
    userRole,
    error,
    clearSession,
  };
}
