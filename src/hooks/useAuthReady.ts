/**
 * Hook reutilizável para aguardar autenticação estar pronta
 * Evita race conditions em componentes que dependem de sessão
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface AuthReadyState {
  isReady: boolean;
  user: User | null;
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuthReady(): AuthReadyState {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
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

        setUser(session?.user ?? null);
        setIsReady(true);
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
        setUser(session?.user ?? null);
        setError(null);
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
    error
  };
}
