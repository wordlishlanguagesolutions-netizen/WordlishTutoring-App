import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { router } from 'expo-router';
import type { UserRole } from '@/constants/roles';
import { getRoleInfo } from '@/constants/roles';

// ============================================================================
// Wordlish · Modo "Ver como..." para el Administrador
//
// Este contexto NO modifica el rol real del usuario ni su sesion. Solo
// registra en memoria (no persiste) que un admin esta viendo la UI de otro
// rol para inspeccion / QA. Al detenerlo, vuelve al panel administrativo.
//
// Reglas:
//   - Solo el Administrador puede iniciarlo (el consumidor debe validar).
//   - No modifica auth.uid ni RLS. El admin ya tiene acceso global.
//   - No se guarda en almacenamiento persistente: al recargar se pierde.
//   - Muestra un banner visible mientras esta activo.
// ============================================================================

export type ImpersonationRole = 'teacher' | 'supervisor' | 'student' | 'guardian';

export interface ImpersonationContextType {
  asRole: ImpersonationRole | null;
  isActive: boolean;
  startViewAs: (role: ImpersonationRole) => void;
  stopViewAs: () => void;
}

export const ImpersonationContext = createContext<ImpersonationContextType | undefined>(
  undefined,
);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [asRole, setAsRole] = useState<ImpersonationRole | null>(null);

  const startViewAs = useCallback((role: ImpersonationRole) => {
    setAsRole(role);
    try {
      const info = getRoleInfo(role as UserRole);
      router.push(info.route as any);
    } catch (err) {
      console.warn('[ImpersonationContext] navigation error', err);
    }
  }, []);

  const stopViewAs = useCallback(() => {
    setAsRole(null);
    try {
      router.replace('/(admin)' as any);
    } catch (err) {
      console.warn('[ImpersonationContext] stop navigation error', err);
    }
  }, []);

  const value = useMemo<ImpersonationContextType>(
    () => ({
      asRole,
      isActive: asRole !== null,
      startViewAs,
      stopViewAs,
    }),
    [asRole, startViewAs, stopViewAs],
  );

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}
