import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { can, SecurityContext } from '@/services/securityService';
import { mockDb } from '@/services/mockDb';
import {
  getUserByEmail,
  hydrateUsers,
  subscribeUsers,
} from '@/services/usersService';
import {
  getTeacherByUserId,
  hydrateTeachers,
  subscribeTeachers,
} from '@/services/teachersService';

/**
 * Hook central de permisos.
 * Devuelve el SecurityContext derivado del usuario autenticado y una función
 * `can(permission)` para chequeos declarativos.
 *
 * Estado de migración por dominio:
 *   · Users (#3):     ✅ Cloud (usersService).
 *   · Teachers (#4):  ✅ Cloud (teachersService).
 *   · Guardians (#6): ⏳ mockDb (pendiente).
 *   · Students (#5):  ⏳ mockDb (pendiente).
 *
 * Cuando #5 y #6 migren, se retirará por completo el import de `mockDb`.
 */
export function usePermissions() {
  const { user } = useAuth();
  const [, setTick] = useState(0);

  // Hidrata caches Cloud (idempotente) y re-renderiza cuando cambian.
  useEffect(() => {
    hydrateUsers().catch(() => undefined);
    hydrateTeachers().catch(() => undefined);
    const unsubUsers = subscribeUsers(() => setTick((n) => n + 1));
    const unsubTeachers = subscribeTeachers(() => setTick((n) => n + 1));
    return () => {
      unsubUsers();
      unsubTeachers();
    };
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
        // TODO(#6): migrar a guardiansService cuando el módulo esté listo.
        const g = mockDb.guardians.find((x) => x.userId === userId);
        return { userId, role: user.role, studentIds: g?.studentIds ?? [] };
      }
      case 'teacher': {
        // Cloud primero (módulo #4 migrado). Fallback mock durante coexistencia
        // porque los sub-módulos aún consumen el store mock para IDs de
        // profesor. Se retirará el fallback al migrar Bookings/Payrolls.
        const cloudTeacher = getTeacherByUserId(userId);
        if (cloudTeacher) {
          return { userId, role: user.role, teacherId: cloudTeacher.id };
        }
        const t = mockDb.teachers.find((x) => x.userId === userId);
        return { userId, role: user.role, teacherId: t?.id };
      }
      case 'student': {
        // TODO(#5): migrar a studentsService cuando el módulo esté listo.
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
