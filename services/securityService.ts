// Wordlish · Security service (permisos y filtros tipo RLS)
// Fase 1: aplicación en cliente vía repositorios.
// Fase 2: las mismas reglas se replican como policies RLS en Supabase.

import type { SpecificRole } from '@/types';

export interface SecurityContext {
  userId: string;
  role: SpecificRole;
  studentIds?: string[]; // para guardian
  teacherId?: string;    // para teacher
  studentId?: string;    // para student
}

// Matriz de permisos por rol
const PERMISSIONS: Record<SpecificRole, Record<string, boolean>> = {
  admin: {
    canViewAllUsers: true,
    canEditAllUsers: true,
    canViewAllBookings: true,
    canEditAllBookings: true,
    canViewAllPayments: true,
    canManagePackages: true,
    canManageSettings: true,
    canViewAllReports: true,
    canViewAllClasses: true,
    canCreateBookings: true,
    canOverrideSecurity: true,
  },
  supervisor: {
    canViewAllBookings: true,
    canViewAllReports: true,
    canViewAllClasses: true,
    canManageAlerts: true,
    canViewLiveClasses: true,
  },
  teacher: {
    canViewOwnClasses: true,
    canPublishAvailability: true,
    canSubmitReports: true,
    canUploadScreenshots: true,
    canUploadMaterials: true,
    canCreateBookings: false, // regla explícita
  },
  student: {
    canCreateBookings: true,
    canViewOwnBookings: true,
    canViewOwnReports: true,
    canViewOwnMaterials: true,
    canViewOwnPayments: true,
  },
  guardian: {
    canCreateBookings: true,
    canViewLinkedStudents: true,
    canViewLinkedBookings: true,
    canViewLinkedReports: true,
    canViewLinkedMaterials: true,
    canViewLinkedPayments: true,
  },
};

export function can(ctx: SecurityContext | null, permission: string): boolean {
  if (!ctx) return false;
  return !!PERMISSIONS[ctx.role]?.[permission];
}

// ============= FILTROS TIPO ROW-LEVEL SECURITY =============
// Cada filtro replica lo que hará una policy RLS en Supabase.

export function filterBookings<
  T extends { studentId: string; teacherId: string; guardianId?: string | null },
>(ctx: SecurityContext | null, bookings: T[]): T[] {
  if (!ctx) return [];
  switch (ctx.role) {
    case 'admin':
    case 'supervisor':
      return bookings;
    case 'teacher':
      return bookings.filter((b) => b.teacherId === ctx.teacherId);
    case 'student':
      return bookings.filter((b) => b.studentId === ctx.studentId);
    case 'guardian': {
      const ids = new Set(ctx.studentIds ?? []);
      return bookings.filter((b) => ids.has(b.studentId));
    }
    default:
      return [];
  }
}

export function filterStudents<T extends { id: string; guardianId?: string | null }>(
  ctx: SecurityContext | null,
  students: T[],
): T[] {
  if (!ctx) return [];
  switch (ctx.role) {
    case 'admin':
    case 'supervisor':
      return students;
    case 'teacher':
      // Un profesor NO ve datos personales de otros estudiantes,
      // solo los que le tocan clase. El filtro por booking lo hace
      // filterBookings; para nombre/avatar mínimo, es aceptable.
      return students;
    case 'student':
      return students.filter((s) => s.id === ctx.studentId);
    case 'guardian': {
      const ids = new Set(ctx.studentIds ?? []);
      return students.filter((s) => ids.has(s.id));
    }
    default:
      return [];
  }
}

export function filterTeachers<T extends { id: string; userId?: string }>(
  ctx: SecurityContext | null,
  teachers: T[],
): T[] {
  if (!ctx) return teachers;
  // Regla: los profesores NUNCA ven datos personales de otros profesores.
  if (ctx.role === 'teacher') {
    return teachers.filter((t) => t.id === ctx.teacherId);
  }
  return teachers;
}

export function canViewUser(ctx: SecurityContext | null, targetUserId: string): boolean {
  if (!ctx) return false;
  if (ctx.role === 'admin') return true;
  if (ctx.userId === targetUserId) return true;
  if (ctx.role === 'teacher') return false;
  return false;
}
