/**
 * Hook centralizado de autenticação.
 * Fonte única de verdade para authStatus, user e role.
 * Compartilha o mesmo estado entre componentes para evitar listeners duplicados.
 * Faz limpeza local automática quando encontra sessão persistida inválida.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const SESSION_TIMEOUT_MS = 8000;
const RPC_TIMEOUT_MS = 5000;
const AUTH_STORAGE_KEY_PATTERN = /^sb-.*-auth-token$/;

type AuthStatus = 'loading' | 'ready' | 'timeout' | 'error';

interface AuthStoreState {
  authStatus: AuthStatus;
  user: User | null;
  userRole: 'admin' | 'user' | null;
  error: string | null;
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

const INITIAL_AUTH_STATE: AuthStoreState = {
  authStatus: 'loading',
  user: null,
  userRole: null,
  error: null,
};

let authState: AuthStoreState = INITIAL_AUTH_STATE;
const listeners = new Set<(state: AuthStoreState) => void>();
let isInitialized = false;
let authSubscription: { unsubscribe: () => void } | null = null;
let sessionTimeoutId: ReturnType<typeof setTimeout> | null = null;
let currentRoleRequestId = 0;
let pendingRecoveryMessage: string | null = null;

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

function emitAuthState() {
  listeners.forEach((listener) => listener(authState));
}

function setAuthState(patch: Partial<AuthStoreState>) {
  authState = { ...authState, ...patch };
  emitAuthState();
}

function getStoredSessionKeys(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    return Object.keys(window.localStorage).filter(
      (key) => AUTH_STORAGE_KEY_PATTERN.test(key) || key === 'supabase.auth.token'
    );
  } catch {
    return [];
  }
}

function hasStoredSession() {
  return getStoredSessionKeys().length > 0;
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;

  try {
    getStoredSessionKeys().forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.warn('useAuthReady: could not clear local session storage', error);
  }
}

function clearSessionTimeout() {
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
}

function isFetchFailure(error: unknown) {
  const status = typeof error === 'object' && error !== null ? (error as { status?: number }).status : undefined;
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error ?? '');

  return status === 0 || message.toLowerCase().includes('failed to fetch');
}

function markReady(user: User | null, error: string | null = null) {
  clearSessionTimeout();

  const preservedRole = user && authState.user?.id === user.id ? authState.userRole : null;

  authState = {
    authStatus: 'ready',
    user,
    userRole: user ? preservedRole ?? 'user' : null,
    error,
  };
  emitAuthState();

  if (!user) {
    currentRoleRequestId += 1;
    return;
  }

  const roleRequestId = ++currentRoleRequestId;
  setAuthState({ userRole: preservedRole ?? 'user' });

  void checkRoleWithTimeout(user.id).then((role) => {
    if (roleRequestId !== currentRoleRequestId || authState.user?.id !== user.id) return;
    setAuthState({ userRole: role });
  });
}

async function signOutLocally() {
  pendingRecoveryMessage = null;
  clearStoredSession();

  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error) {
    console.warn('useAuthReady: local signOut fallback failed', error);
  }
}

function recoverBrokenSession(message: string) {
  console.warn('useAuthReady: clearing broken persisted session');
  pendingRecoveryMessage = message;
  clearStoredSession();
  void supabase.auth.signOut({ scope: 'local' }).catch((error) => {
    console.warn('useAuthReady: failed to finalize broken session cleanup', error);
  });
  markReady(null, message);
}

function initializeAuth() {
  if (isInitialized) return;
  isInitialized = true;

  setAuthState({ authStatus: 'loading', error: null });

  sessionTimeoutId = setTimeout(() => {
    console.warn('useAuthReady: session timeout after', SESSION_TIMEOUT_MS, 'ms');
    setAuthState({
      authStatus: 'timeout',
      error: 'A verificação da sessão demorou demais. Limpe a sessão local e tente novamente.',
      user: null,
      userRole: null,
    });
  }, SESSION_TIMEOUT_MS);

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('useAuthReady: Auth event', event);

    if (event === 'TOKEN_REFRESHED') {
      if (session?.user) {
        markReady(session.user);
      }
      return;
    }

    if (event === 'SIGNED_OUT') {
      const recoveryMessage = pendingRecoveryMessage;
      pendingRecoveryMessage = null;
      markReady(null, recoveryMessage);
      return;
    }

    if (event === 'INITIAL_SESSION' && !session?.user && hasStoredSession()) {
      recoverBrokenSession('Sua sessão anterior expirou ou ficou inválida. Faça login novamente.');
      return;
    }

    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
      pendingRecoveryMessage = null;
      markReady(session?.user ?? null);
      return;
    }

    if (session?.user) {
      setAuthState({ user: session.user, error: null });
    }
  });

  authSubscription = subscription;

  supabase.auth.getSession()
    .then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.warn('useAuthReady: getSession error', sessionError.message);

        if (isFetchFailure(sessionError) && hasStoredSession()) {
          recoverBrokenSession('Não foi possível restaurar sua sessão salva. Faça login novamente.');
          return;
        }

        setAuthState({
          authStatus: 'error',
          user: null,
          userRole: null,
          error: sessionError.message,
        });
        clearSessionTimeout();
        return;
      }

      if (!session?.user && hasStoredSession()) {
        recoverBrokenSession('Sua sessão anterior expirou ou ficou inválida. Faça login novamente.');
        return;
      }

      pendingRecoveryMessage = null;
      markReady(session?.user ?? null);
    })
    .catch((error: unknown) => {
      console.error('useAuthReady: getSession exception', error);

      if (isFetchFailure(error) && hasStoredSession()) {
        recoverBrokenSession('Não foi possível restaurar sua sessão salva. Faça login novamente.');
        return;
      }

      setAuthState({
        authStatus: 'error',
        user: null,
        userRole: null,
        error: error instanceof Error ? error.message : 'Session fetch failed',
      });
      clearSessionTimeout();
    });
}

const clearSession = async () => {
  await signOutLocally();
  markReady(null);
};

export function useAuthReady(): AuthReadyState {
  const [snapshot, setSnapshot] = useState<AuthStoreState>(authState);

  useEffect(() => {
    initializeAuth();

    const listener = (nextState: AuthStoreState) => {
      setSnapshot(nextState);
    };

    listeners.add(listener);
    listener(authState);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    authStatus: snapshot.authStatus,
    isReady: snapshot.authStatus === 'ready' || snapshot.authStatus === 'timeout',
    user: snapshot.user,
    isAuthenticated: !!snapshot.user,
    userRole: snapshot.userRole,
    error: snapshot.error,
    clearSession,
  };
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearSessionTimeout();
    authSubscription?.unsubscribe();
    authSubscription = null;
    isInitialized = false;
    listeners.clear();
  });
}
