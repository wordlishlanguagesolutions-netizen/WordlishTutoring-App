// ============================================================================
// Wordlish · Diagnostico de integridad Cloud.
//
// Consulta conteos y verifica prerequisites minimos para operar el beta:
//   - Al menos 1 admin activo (bootstrap y gestion).
//   - Al menos 1 profesor con materias asignadas y disponibilidad
//     publicada (reservas viables).
//   - Al menos 5 materias activas (catalogo utilizable).
//
// No modifica datos. Solo lecturas COUNT(*) sobre las tablas core.
// Usado por components/admin/CloudIntegrityBlock en Admin > Ajustes.
// ============================================================================

import { getSupabaseClient } from '@/template';

export type IntegrityStatus = 'ok' | 'warning' | 'error';

export interface IntegrityMetric {
  key: string;
  label: string;
  count: number;
  status: IntegrityStatus;
  hint?: string;
}

export interface IntegrityResult {
  ok: boolean;
  metrics: IntegrityMetric[];
  error?: string;
  at: string;
  hasBlockers: boolean;
}

async function countRows(query: any): Promise<number> {
  try {
    const { count, error } = await query;
    if (error) {
      console.warn('[cloudIntegrityService] count error', error?.message ?? error);
      return -1;
    }
    return count ?? 0;
  } catch (err: any) {
    console.warn('[cloudIntegrityService] count exception', err?.message ?? err);
    return -1;
  }
}

export async function checkCloudIntegrity(): Promise<IntegrityResult> {
  const at = new Date().toISOString();
  try {
    const supabase = getSupabaseClient();
    const q = (table: string) =>
      supabase.from(table).select('*', { count: 'exact', head: true });
    const [
      admins,
      teachers,
      availability,
      subjects,
      teacherSubjects,
      students,
      guardians,
      bookings,
      packages,
      payments,
      reports,
      alerts,
      tickets,
    ] = await Promise.all([
      countRows(
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin')
          .eq('active', true),
      ),
      countRows(q('teachers')),
      countRows(
        supabase
          .from('teacher_availability')
          .select('*', { count: 'exact', head: true })
          .not('published_at', 'is', null),
      ),
      countRows(
        supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .eq('active', true),
      ),
      countRows(q('teacher_subjects')),
      countRows(q('students')),
      countRows(q('guardians')),
      countRows(q('bookings')),
      countRows(q('hour_packages')),
      countRows(q('payments')),
      countRows(q('reports')),
      countRows(
        supabase
          .from('system_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('resolved', false),
      ),
      countRows(q('support_tickets')),
    ]);

    const metrics: IntegrityMetric[] = [
      {
        key: 'admins',
        label: 'Admins activos',
        count: admins,
        status: admins >= 1 ? 'ok' : 'error',
        hint: admins >= 1 ? undefined : 'Requiere bootstrap del primary admin',
      },
      {
        key: 'teachers',
        label: 'Profesores',
        count: teachers,
        status: teachers >= 1 ? 'ok' : 'error',
        hint: teachers >= 1 ? undefined : 'Sin profesores el beta no arranca',
      },
      {
        key: 'subjects_active',
        label: 'Materias activas',
        count: subjects,
        status: subjects >= 5 ? 'ok' : subjects >= 1 ? 'warning' : 'error',
        hint: subjects >= 5 ? undefined : 'Catalogo minimo recomendado: 5',
      },
      {
        key: 'teacher_subjects',
        label: 'Materias asignadas',
        count: teacherSubjects,
        status: teacherSubjects >= 1 ? 'ok' : 'error',
        hint:
          teacherSubjects >= 1
            ? undefined
            : 'Cada profesor debe tener al menos 1 materia',
      },
      {
        key: 'availability',
        label: 'Franjas publicadas',
        count: availability,
        status: availability >= 1 ? 'ok' : 'error',
        hint: availability >= 1 ? undefined : 'Sin disponibilidad no hay reservas',
      },
      {
        key: 'students',
        label: 'Estudiantes',
        count: students,
        status: 'ok',
      },
      {
        key: 'guardians',
        label: 'Acudientes',
        count: guardians,
        status: 'ok',
      },
      {
        key: 'bookings',
        label: 'Reservas',
        count: bookings,
        status: 'ok',
      },
      {
        key: 'packages',
        label: 'Paquetes de horas',
        count: packages,
        status: 'ok',
      },
      {
        key: 'payments',
        label: 'Pagos',
        count: payments,
        status: 'ok',
      },
      {
        key: 'reports',
        label: 'Reportes',
        count: reports,
        status: 'ok',
      },
      {
        key: 'system_alerts',
        label: 'Alertas abiertas',
        count: alerts,
        status: alerts === 0 ? 'ok' : alerts <= 5 ? 'warning' : 'error',
      },
      {
        key: 'support_tickets',
        label: 'Tickets soporte',
        count: tickets,
        status: 'ok',
      },
    ];

    const hasBlockers = metrics.some((m) => m.status === 'error');

    return { ok: true, metrics, at, hasBlockers };
  } catch (err: any) {
    return {
      ok: false,
      metrics: [],
      error: err?.message ?? 'unknown_error',
      at,
      hasBlockers: true,
    };
  }
}
