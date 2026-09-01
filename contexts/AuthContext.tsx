import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { authService, MockUser, SignInResult } from '@/services/authService';
import type { UserRole } from '@/constants/roles';
import type { AccountType } from '@/types';

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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
