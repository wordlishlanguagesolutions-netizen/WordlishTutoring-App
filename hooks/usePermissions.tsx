import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { can, SecurityContext } from '@/services/securityService';
import { mockDb } from '@/services/mockDb';
import {
  getUserByEmail,
  hydrateUsers,
  subscribeUsers,
} from '@/services/usersService';

/**
 * Hook central de permisos.
 * Devuelve el SecurityContext derivado del usuario autenticado y una función
 * `can(permission)` para chequeos declarativos.
 *
 * Notas de la migración #3 (Users/Profiles → Cloud):
 *   · Ya no leemos `mockDb.users` para resolver el id: usamos `usersService`
 *     (cache Cloud) o directamente el id del usuario autenticado.
 *   · Seguimos consultando `mockDb.guardians/teachers/students` porque esos
 *     módulos aún no están migrados. Se retirarán cuando cada uno complete
 *     su fase (#4, #5, #6 del tablero).
 */
export function usePermissions() {
  const { user } = useAuth();
  const [, setTick] = useState(0);

  // Hidrata usuarios desde Cloud una vez y re-renderiza cuando cambie el cache.
  useEffect(() => {
    hydrateUsers().catch(() => undefined);
    const unsub = subscribeUsers(() => setTick((n) => n + 1));
    return unsub;
  }, []);

  const ctx: SecurityContext | null = useMemo(() => {
    if (!user) return null;
    // En modo real el id del user autenticado ya es el uuid de user_profiles.
    // En modo mock (`mock-admin`, `mock-teacher`, etc.) intentamos resolver
    // por email contra el cache Cloud; si no hay match, caemos al id mock.
    const cloudMatch = getUserByEmail(user.email);
    const userId = cloudMatch?.id ?? user.id;

    switch (user.role) {
      case 'guardian': {
        const g = mockDb.guardians.find((x) => x.userId === userId);
        return { userId, role: user.role, studentIds: g?.studentIds ?? [] };
      }
      case 'teacher': {
        const t = mockDb.teachers.find((x) => x.userId === userId);
        return { userId, role: user.role, teacherId: t?.id };
      }
      case 'student': {
        const s = mockDb.students.find((x) => x.userId === userId);
        return { userId, role: user.role, studentId: s?.id ?? 's1' };
      }
      case 'admin':
      case 'supervisor':
      default:
        return { userId, role: user.role };
    }
  }, [user]);

  return {
    ctx,
    can: (perm: string) => can(ctx, perm),
  };
}
