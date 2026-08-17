import React, { createContext, useEffect, useState, ReactNode, useRef } from 'react';
import { router } from 'expo-router';
import { useAlert } from '@/template/ui';
import {
  authService,
  MockUser,
  SignInResult,
  ResetPasswordResult,
  SignUpResult,
  SignUpArgs,
} from '@/services/authService';

import type { UserRole } from '@/constants/roles';
import type { AccountType } from '@/types';
import { getSupabaseClient } from '@/template';
import { resetUsersCache } from '@/services/usersService';
import { resetStudentsCache } from '@/services/studentsService';
import { resetTeachersCache } from '@/services/teachersService';
import { resetGuardiansCache } from '@/services/guardiansService';
import { resetBookingsCache } from '@/services/bookingsService';
import { resetReportsCache } from '@/services/reportsService';
import { resetPaymentsCache } from '@/services/paymentsService';
import { resetPackagesCache } from '@/services/packagesService';
import { resetNotificationsCache } from '@/services/notificationService';
import { resetMaterialsCache } from '@/services/materialsService';
import { resetScreenshotsCache } from '@/services/screenshotsService';
import { resetClassRecordsCache } from '@/services/classRecordsService';
import { resetSystemAlertsCache } from '@/services/systemAlertsService';
import { resetSupportTicketsCache } from '@/services/supportTicketsService';
import { invalidateRoleCapacityCache } from '@/services/userRolesPolicy';

// Limpia todas las caches locales para evitar que un usuario nuevo
// herede datos del anterior en el mismo dispositivo.
function clearAllLocalCaches() {
  try { resetUsersCache(); } catch {}
  try { resetStudentsCache(); } catch {}
  try { resetTeachersCache(); } catch {}
  try { resetGuardiansCache(); } catch {}
  try { resetBookingsCache(); } catch {}
  try { resetReportsCache(); } catch {}
  try { resetPaymentsCache(); } catch {}
  try { resetPackagesCache(); } catch {}
  try { resetNotificationsCache(); } catch {}
  try { resetMaterialsCache(); } catch {}
  try { resetScreenshotsCache(); } catch {}
  try { resetClassRecordsCache(); } catch {}
  try { resetSystemAlertsCache(); } catch {}
  try { resetSupportTicketsCache(); } catch {}
  try { invalidateRoleCapacityCache(); } catch {}
}

export interface AuthContextType {
  user: MockUser | null;
  loading: boolean;
  loggingOut: boolean;
  signIn: (
    email: string,
    password: string,
    expectedAccountType?: AccountType,
  ) => Promise<SignInResult>;
  loginAs: (role: UserRole) => Promise<MockUser>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<ResetPasswordResult>;
  signUp: (args: SignUpArgs) => Promise<SignUpResult>;
  updatePassword: (newPassword: string) => Promise<ResetPasswordResult>;
  verifySignupOtp: (email: string, token: string) => Promise<SignUpResult>;
  verifyRecoveryOtp: (email: string, token: string) => Promise<ResetPasswordResult>;
  resendSignupOtp: (email: string) => Promise<ResetPasswordResult>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const mounted = useRef(true);
  const logoutInFlight = useRef(false);
  // AlertProvider siempre es padre de AuthProvider (ver app/_layout.tsx).
  const { showAlert } = useAlert();

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
    // Guard contra multiples pulsaciones consecutivas del boton Salir.
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    if (mounted.current) setLoggingOut(true);
    try {
      await authService.logout();
    } catch (err: any) {
      console.warn('[AuthContext.logout] error', err);
      const msg =
        err?.message ??
        'No se pudo cerrar la sesion. Verifica tu conexion e intentalo de nuevo.';
      try {
        showAlert('Cerrar sesion', msg, [
          { text: 'Reintentar', onPress: () => { logout().catch(() => {}); } },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      } catch {
        // no-op: si showAlert falla, no bloqueamos al usuario.
      }
      logoutInFlight.current = false;
      if (mounted.current) setLoggingOut(false);
      return;
    }
    // Limpia estado local ANTES de navegar para que el guard de index.tsx
    // no rebote al dashboard.
    clearAllLocalCaches();
    if (mounted.current) setUser(null);
    try {
      // replace evita agregar entrada al historial (back del navegador
      // o del telefono no vuelve al dashboard tras cerrar sesion).
      router.replace('/login');
    } catch (navErr) {
      console.warn('[AuthContext.logout] navigation error', navErr);
    }
    logoutInFlight.current = false;
    if (mounted.current) setLoggingOut(false);
  };

  const resetPassword = async (email: string) => {
    return authService.resetPassword(email);
  };

  const signUp = async (args: SignUpArgs) => {
    const result = await authService.signUp(args);
    if (result.user) setUser(result.user);
    return result;
  };

  const updatePassword = async (newPassword: string) => {
    return authService.updatePassword(newPassword);
  };

  const verifySignupOtp = async (email: string, token: string) => {
    const result = await authService.verifySignupOtp(email, token);
    if (result.user) setUser(result.user);
    return result;
  };

  const verifyRecoveryOtp = async (email: string, token: string) => {
    return authService.verifyRecoveryOtp(email, token);
  };

  const resendSignupOtp = async (email: string) => {
    return authService.resendSignupOtp(email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loggingOut,
        signIn,
        loginAs,
        logout,
        resetPassword,
        signUp,
        updatePassword,
        verifySignupOtp,
        verifyRecoveryOtp,
        resendSignupOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
