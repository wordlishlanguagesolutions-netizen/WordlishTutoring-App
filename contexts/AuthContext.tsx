import React, { createContext, useEffect, useState, ReactNode, useRef } from 'react';
import {
  authService,
  MockUser,
  SignInResult,
  ResetPasswordResult,
} from '@/services/authService';
import type { UserRole } from '@/constants/roles';
import type { AccountType } from '@/types';
import { getSupabaseClient } from '@/template';

export interface AuthContextType {
  user: MockUser | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    expectedAccountType?: AccountType,
  ) => Promise<SignInResult>;
  loginAs: (role: UserRole) => Promise<MockUser>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<ResetPasswordResult>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const mounted = useRef(true);

  // Hidrata sesión al arranque y (en modo real) escucha cambios en auth.
  useEffect(() => {
    mounted.current = true;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const initial = await authService.getCurrentUser();
      if (!mounted.current) return;
      setUser(initial);
      setLoading(false);
    })();

    if (authService.isReal()) {
      try {
        const supabase = getSupabaseClient();
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted.current) return;
          if (!session?.user) {
            setUser(null);
            return;
          }
          // Cuando cambia la sesión (token refresh, logout externo, cambio
          // de contraseña), volvemos a resolver el perfil completo.
          const resolved = await authService.getCurrentUser();
          if (mounted.current) setUser(resolved);
        });
        unsubscribe = () => data?.subscription?.unsubscribe();
      } catch (err) {
        console.warn('[AuthContext] onAuthStateChange no disponible', err);
      }
    }

    return () => {
      mounted.current = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    password: string,
    expectedAccountType?: AccountType,
  ) => {
    const result = await authService.signIn(email, password, expectedAccountType);
    if (result.user) setUser(result.user);
    return result;
  };

  const loginAs = async (role: UserRole) => {
    const u = await authService.loginAs(role);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    return authService.resetPassword(email);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, loginAs, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}
