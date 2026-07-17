// Wordlish · Configuración centralizada de políticas visibles.
// Estas constantes representan las reglas de negocio que aparecen en
// pantallas de reserva, Class File, reportes, cursos grupales y pagos.
// La estructura permite mover este objeto al panel de administración
// en el futuro sin tocar UI: los textos se derivan de los números.

export const POLICIES = {
  // Material y bloqueo de archivos
  materialLockHours: 6,

  // Tutoría individual
  individualCancellationHours: 1,
  studentToleranceMin: 15,
  teacherToleranceMin: 5,

  // Cursos grupales
  groupMinStudents: 3,

  // Pagos
  groupPaymentCycleAdverb: 'quincenalmente',
  groupGraceDays: 3,
  groupLateFeeUsdPerDay: 1,

  // Evidencia de ingreso (screenshot). El profesor tiene esta ventana de
  // gracia en minutos desde la hora programada para subir la captura antes
  // de que se considere incidencia crítica.
  screenshotGraceMin: 10,
};

// Milisegundos derivados para el timer de bloqueo de material.
export const MATERIAL_LOCK_MS =
  POLICIES.materialLockHours * 60 * 60 * 1000;

// ============================================================================
// Copy expuesto en cada pantalla. Los textos se arman a partir de POLICIES
// para que cualquier ajuste desde el panel de administración fluya
// automáticamente a las tarjetas "Lo que debes saber".
// ============================================================================

export const POLICY_COPY = {
  bookingSummary: [
    `Puedes cancelar una tutoría individual hasta ${POLICIES.individualCancellationHours} hora antes del inicio.`,
    `El estudiante tiene ${POLICIES.studentToleranceMin} minutos de tolerancia.`,
    `El profesor esperará ${POLICIES.teacherToleranceMin} minutos.`,
    'Si no asistes, la hora se considera utilizada.',
  ],
  classFileMaterial: [
    `Puedes subir archivos hasta ${POLICIES.materialLockHours} horas antes del inicio de la clase.`,
    'Después de ese plazo ya no se aceptarán archivos.',
    'Si el plazo venció, únicamente podrás escribir el título o tema que deseas trabajar.',
    'En ese caso el profesor preparará y desarrollará la clase con el material disponible durante la sesión.',
  ],
  reports: [
    'Tutorías individuales: el reporte se enviará durante el mismo día en que finalice la clase.',
    'Cursos grupales: los reportes se publicarán semanalmente.',
    'El material de repaso es opcional y solo estará disponible cuando el profesor considere necesario compartirlo.',
  ],
  groupCourses: [
    `Los grupos se abren a partir de ${POLICIES.groupMinStudents} estudiantes inscritos.`,
    'Mientras el grupo se completa podrás reservar tu cupo.',
    'Las clases grupales no son cancelables individualmente.',
    'Las inasistencias no generan reposición.',
  ],
  payments: [
    'Los cursos grupales se pagan por adelantado en la fecha establecida.',
    `Se concede un plazo máximo de ${POLICIES.groupGraceDays} días.`,
    `Durante esos ${POLICIES.groupGraceDays} días se aplica un recargo de USD ${POLICIES.groupLateFeeUsdPerDay} por cada día de atraso.`,
    'Después del tercer día la cuenta queda vencida y el cupo puede suspenderse hasta regularizar el pago.',
  ],
  topUps: [
    'Las recargas de tutorías individuales mantienen el mismo valor por hora del plan individual activo del estudiante.',
    'No se aplican precios distintos sin autorización administrativa.',
  ],
  materialClosed: {
    title: 'Material cerrado',
    lines: [
      'Ya no es posible subir archivos para esta sesión.',
      'El profesor desarrollará la clase utilizando el tema indicado y el material disponible durante la tutoría.',
    ],
  },
};

// ============================================================================
// Clasificación de estado para cursos grupales. Derivada de los cupos
// y de POLICIES.groupMinStudents. Listo para reemplazarse por lógica del
// panel administrativo sin tocar la UI.
// ============================================================================

export type GroupCourseStatusKey =
  | 'open'
  | 'opening_soon'
  | 'one_missing'
  | 'full';

export interface GroupCourseStatusInfo {
  status: GroupCourseStatusKey;
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
}

export function getGroupCourseStatus(
  availableSpots: number,
  totalSpots: number,
): GroupCourseStatusInfo {
  const enrolled = Math.max(0, totalSpots - availableSpots);
  const needed = Math.max(0, POLICIES.groupMinStudents - enrolled);
  if (availableSpots <= 0) {
    return { status: 'full', label: 'Grupo completo', tone: 'danger' };
  }
  if (needed === 0) {
    return { status: 'open', label: 'Grupo confirmado', tone: 'success' };
  }
  if (needed === 1) {
    return {
      status: 'one_missing',
      label: 'Falta 1 estudiante para iniciar',
      tone: 'warning',
    };
  }
  return {
    status: 'opening_soon',
    label: `Faltan ${needed} estudiantes para abrir el grupo`,
    tone: 'info',
  };
}

// ============================================================================
// Tiers de profesores.
// - essentials: profesor calificado para tutorías estándar.
// - special: profesor con mayor experiencia o asignado a planes premium
//   y necesidades específicas.
// El plan del estudiante define qué tiers puede ver: los planes "special"
// acceden a ambos, los planes "essentials" solo a essentials.
// Estructura lista para migrar al panel de administración sin tocar UI.
// ============================================================================

export type TeacherTier = 'essentials' | 'special';

export interface TeacherTierInfo {
  key: TeacherTier;
  label: string;
  stars: string;
  description: string;
}

export const TEACHER_TIERS: Record<TeacherTier, TeacherTierInfo> = {
  essentials: {
    key: 'essentials',
    label: 'Essentials',
    stars: '⭐',
    description: 'Profesor calificado para tutorías estándar.',
  },
  special: {
    key: 'special',
    label: 'Special',
    stars: '⭐⭐',
    description:
      'Profesor con mayor experiencia o asignado a planes premium y necesidades específicas.',
  },
};

export function getAllowedTiers(planTier: TeacherTier): TeacherTier[] {
  if (planTier === 'special') return ['essentials', 'special'];
  return ['essentials'];
}

// ============================================================================
// Screenshot · evidencia de ingreso.
// Regla: el profesor tiene POLICIES.screenshotGraceMin minutos desde la hora
// programada para subir la captura. Antes: informativo (esperando). Después:
// incidencia crítica (screenshot faltante).
// ============================================================================

export type ScreenshotStatusKey = 'ok' | 'waiting' | 'missing';

export interface ScreenshotStatusInfo {
  key: ScreenshotStatusKey;
  label: string;
  tone: 'success' | 'info' | 'danger';
}

export function getScreenshotStatus(
  minutesElapsed: number,
  hasScreenshot: boolean,
): ScreenshotStatusInfo {
  if (hasScreenshot) {
    return { key: 'ok', label: 'Evidencia recibida', tone: 'success' };
  }
  if (minutesElapsed < POLICIES.screenshotGraceMin) {
    return { key: 'waiting', label: 'Esperando evidencia', tone: 'info' };
  }
  return { key: 'missing', label: 'Screenshot faltante', tone: 'danger' };
}

// ============================================================================
// Cursos grupales · pago prepago.
// Regla: el pago vence en la fecha establecida. Durante los primeros
// POLICIES.groupGraceDays días de atraso se aplica un recargo diario.
// Pasado ese plazo la cuenta queda vencida y el cupo puede suspenderse.
// ============================================================================

export type GroupPaymentStatusKey =
  | 'on_time'
  | 'pending'
  | 'grace_period'
  | 'suspended';

export interface GroupPaymentStatusInfo {
  key: GroupPaymentStatusKey;
  label: string;
  tone: 'success' | 'warning' | 'danger';
  fee: number;
}

export function getGroupPaymentStatus(
  daysLate: number,
  paid: boolean,
): GroupPaymentStatusInfo {
  if (paid) {
    return { key: 'on_time', label: 'Al día', tone: 'success', fee: 0 };
  }
  if (daysLate <= 0) {
    return { key: 'pending', label: 'Pago pendiente', tone: 'warning', fee: 0 };
  }
  if (daysLate <= POLICIES.groupGraceDays) {
    return {
      key: 'grace_period',
      label: 'En período de gracia',
      tone: 'warning',
      fee: daysLate * POLICIES.groupLateFeeUsdPerDay,
    };
  }
  return {
    key: 'suspended',
    label: 'Vencido · cupo suspendido',
    tone: 'danger',
    fee: POLICIES.groupGraceDays * POLICIES.groupLateFeeUsdPerDay,
  };
}
