import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, isDemoMode } from '../api';
import { demoSessionStore } from '../api/authToken';
import type { LoginInput, RegisterInput } from '../types/api';
import type { AuthUser } from '../types/domain';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isDemoSession: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (isDemoMode) {
        const demoUser = demoSessionStore.get();
        if (cancelled) return;
        setUser(demoUser);
        setStatus(demoUser ? 'authenticated' : 'anonymous');
        return;
      }
      try {
        const current = await api.me();
        if (cancelled) return;
        setUser(current);
        setStatus(current ? 'authenticated' : 'anonymous');
      } catch {
        if (cancelled) return;
        setUser(null);
        setStatus('anonymous');
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      setStatus('anonymous');
    }
    window.addEventListener('coopgig:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('coopgig:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await api.login(input);
    if (isDemoMode) demoSessionStore.set(session.user);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await api.register(input);
    if (isDemoMode) demoSessionStore.set(session.user);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      demoSessionStore.clear();
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const refresh = useCallback(async () => {
    if (isDemoMode) {
      const demoUser = demoSessionStore.get();
      setUser(demoUser);
      setStatus(demoUser ? 'authenticated' : 'anonymous');
      return;
    }
    try {
      const current = await api.me();
      setUser(current);
      setStatus(current ? 'authenticated' : 'anonymous');
    } catch {
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isDemoSession: isDemoMode && Boolean(user),
      login,
      register,
      logout,
      refresh,
    }),
    [user, status, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
