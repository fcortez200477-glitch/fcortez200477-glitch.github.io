import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, getToken, setToken, unauthorizedEvent } from './api';
import type { AuthUser, LoginResponse, UserRole } from './types';

const USER_KEY = 'moblytix.user';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** true se o papel do usuario esta entre os informados. */
  can: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => (getToken() ? readStoredUser() : null));

  const logout = useCallback(() => {
    setToken(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignora indisponibilidade do storage */
    }
    setUser(null);
  }, []);

  // A API sinaliza 401 (token expirado/invalido) — encerra a sessao local.
  useEffect(() => {
    const handler = () => logout();
    unauthorizedEvent.addEventListener('unauthorized', handler);
    return () => unauthorizedEvent.removeEventListener('unauthorized', handler);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<LoginResponse>('/auth/login', { email, password });
    setToken(result.token);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    } catch {
      /* ignora indisponibilidade do storage */
    }
    setUser(result.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
      can: (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return context;
}
