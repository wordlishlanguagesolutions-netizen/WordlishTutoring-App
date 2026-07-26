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
import {
  getStudentByUserId,
  hydrateStudents,
  subscribeStudents,
  getStudentsByGuardianId,
} from '@/services/studentsService';
import {
  getGuardianByUserId,
  hydrateGuardians,
  subscribeGuardians,
} from '@/services/guardiansService';

/**
 * Hook central de permisos.
 *
 * Estado de migración por dominio:
 *   · Users (#3):     ✅ Cloud (usersService).
 *   · Teachers (#4):  ✅ Cloud (teachersService).
 *   · Students (#5):  ✅ Cloud (studentsService).
 *   · Guardians (#6): ✅ Cloud (guardiansService).
 *
 * Se conserva `mockDb` como fallback temporal para IDs mientras los
 * sub-módulos (Bookings, ClassRecords, Payrolls) sigan leyéndolo.
 */
export function usePermissions() {
  const { user } = useAuth();
  const [, setTick] = useState(0);

  useEffect(() => {
    hydrateUsers().catch(() => undefined);
    hydrateTeachers().catch(() => undefined);
    hydrateStudents().catch(() => undefined);
    hydrateGuardians().catch(() => undefined);
    const unsubUsers = subscribeUsers(() => setTick((n) => n + 1));
    const unsubTeachers = subscribeTeachers(() => setTick((n) => n + 1));
    const unsubStudents = subscribeStudents(() => setTick((n) => n + 1));
    const unsubGuardians = subscribeGuardians(() => setTick((n) => n + 1));
    return () => {
      unsubUsers();
      unsubTeachers();
      unsubStudents();
      unsubGuardians();
    };
  }, []);

  const ctx: SecurityContext | null = useMemo(() => {
    if (!user) return null;
    const cloudMatch = getUserByEmail(user.email);
    const userId = cloudMatch?.id ?? user.id;

    switch (user.role) {
      case 'guardian': {
        const cloudGuardian = getGuardianByUserId(userId);
        if (cloudGuardian) {
          const studentIds = getStudentsByGuardianId(cloudGuardian.id).map((s) => s.id);
          return { userId, role: user.role, studentIds };
        }
        // Fallback mock (mientras el modo mock siga activo).
        const g = mockDb.guardians.find((x) => x.userId === userId);
        return { userId, role: user.role, studentIds: g?.studentIds ?? [] };
      }
      case 'teacher': {
        const cloudTeacher = getTeacherByUserId(userId);
        if (cloudTeacher) {
          return { userId, role: user.role, teacherId: cloudTeacher.id };
        }
        const t = mockDb.teachers.find((x) => x.userId === userId);
        return { userId, role: user.role, teacherId: t?.id };
      }
      case 'student': {
        const cloudStudent = getStudentByUserId(userId);
        if (cloudStudent) {
          return { userId, role: user.role, studentId: cloudStudent.id };
        }
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
