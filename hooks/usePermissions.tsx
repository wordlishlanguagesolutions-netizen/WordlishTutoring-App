import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { can, SecurityContext } from '@/services/securityService';
import { mockDb } from '@/services/mockDb';

/**
 * Hook central de permisos.
 * Devuelve el SecurityContext derivado del usuario autenticado
 * y una función `can(permission)` para chequeos declarativos.
 */
export function usePermissions() {
  const { user } = useAuth();

  const ctx: SecurityContext | null = useMemo(() => {
    if (!user) return null;
    const email = user.email.toLowerCase();
    const record = mockDb.users.find((u) => u.email.toLowerCase() === email);
    const userId = record?.id ?? user.id;

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
