// Wordlish · Mock data centralizado (Fase 1)
// Toda pantalla debe leer desde aquí para mantener coherencia.
import type { TeacherTier } from '@/constants/policies';

export type ClassStatus =
  | 'ok'
  | 'no_screenshot'
  | 'teacher_late'
  | 'student_late'
  | 'no_camera'
  | 'technical'
  | 'confirmed'
  | 'pending'
  | 'completed';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

// ============= BOOKING TYPES =============
export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'cancelled'
  | 'rescheduled'
  | 'completed'
  | 'student_absent'
  | 'technical_issue';

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  substituteId: string | null;
  substituteName: string | null;
  subject: string;
  date: string;        // ISO YYYY-MM-DD
  time: string;        // "10:00"
  durationMin: number;
  status: BookingStatus;
  zoomUrl: string;
  createdAt: string;
  updatedAt: string;
  hourConsumed: boolean;
}

export const BOOKING_STATUS: Record<
  BookingStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary'; icon: string }
> = {
  pending_payment: { label: 'Pendiente de pago', tone: 'warning', icon: 'card-outline' },
  confirmed: { label: 'Confirmada', tone: 'success', icon: 'checkmark-circle' },
  cancelled: { label: 'Cancelada', tone: 'danger', icon: 'close-circle' },
  rescheduled: { label: 'Reprogramada', tone: 'info', icon: 'refresh' },
  completed: { label: 'Completada', tone: 'info', icon: 'checkmark-done-circle' },
  student_absent: { label: 'Estudiante ausente', tone: 'danger', icon: 'person-remove' },
  technical_issue: { label: 'Problema técnico', tone: 'warning', icon: 'warning' },
};

// ============= ESTUDIANTE ACTUAL =============
export const currentStudent = {
  id: 's1',
  name: 'Lucía Estudiante',
  firstName: 'Lucía',
  avatar: 'https://i.pravatar.cc/150?img=47',
  age: 12,
  school: 'Colegio San Ignacio',
  grade: '6° primaria',
  phone: '+507 6123-4567',
  guardian: 'Marta Acudiente',
  subjects: ['Inglés básico', 'Conversación'],
  activeServices: ['Tutoría individual', 'Curso grupal'] as string[],
  planTier: 'special' as TeacherTier,
  // Plan individual activo. hourlyRate se usa como base para recargas.
  activePlan: {
    name: 'Paquete 8 horas',
    hourlyRate: 13.75,
    totalHours: 8,
    price: 110,
  },
};

// ============= PROFESOR ACTUAL =============
export const currentTeacher = {
  id: 't1',
  name: 'Prof. Carlos Ríos',
  firstName: 'Carlos',
  avatar: 'https://i.pravatar.cc/150?img=68',
  phone: '+507 6987-6543',
  subjects: ['Inglés básico', 'Inglés intermedio', 'Conversación'],
  grades: ['4°', '5°', '6°', '7°', '8°'],
  stats: {
    assigned: 24,
    delivered: 22,
    absences: 1,
    pendingReports: 2,
    accumulatedPay: 660,
  },
};

// ============= PRÓXIMA CLASE (estudiante) =============
export const nextClass = {
  id: 'c1',
  subject: 'Inglés · Básico',
  teacher: 'Prof. Carlos Ríos',
  teacherAvatar: 'https://i.pravatar.cc/150?img=68',
  student: 'Lucía Estudiante',
  studentAvatar: 'https://i.pravatar.cc/150?img=47',
  date: 'Hoy 11 Jul',
  time: '10:00 AM',
  duration: 60,
  zoomUrl: 'https://us06web.zoom.us/j/2797072933',
  screenshotStatus: 'pending' as 'pending' | 'received' | 'missing',
  teacherOnline: false,
  startsInMin: 45,
  materialStatus: 'received' as 'received' | 'pending' | 'topic_written' | 'none',
};

// ============= PAQUETE =============
export const packageInfo = {
  name: 'Paquete 8 horas',
  total: 8,
  remaining: 7,
  purchasedAt: '01 Jul',
  expiresAt: '15 Ago',
};

// ============= PAGOS =============
export const latestPayment = {
  amount: 110,
  status: 'paid' as PaymentStatus,
  date: '01 Jul',
  concept: 'Paquete 8 horas',
};

export const paymentsHistory = [
  { id: 'p1', concept: 'Paquete 8 horas · Lucía', amount: 110, date: '01 Jul 2026', status: 'paid' as PaymentStatus, method: 'Tarjeta' },
  { id: 'p2', concept: 'Paquete 4 horas · Lucía', amount: 60, date: '15 Jun 2026', status: 'paid' as PaymentStatus, method: 'Yappy' },
  { id: 'p3', concept: 'Recarga 2 horas', amount: 30, date: '10 Jun 2026', status: 'paid' as PaymentStatus, method: 'Cuanto' },
];

export const guardianPaymentsHistory = [
  { id: 'p1', concept: 'Paquete 8 horas · Lucía', amount: 110, date: '01 Jul', status: 'paid' as PaymentStatus, method: 'Tarjeta' },
  { id: 'p2', concept: 'Paquete 8 horas · Pablo', amount: 110, date: '01 Jul', status: 'paid' as PaymentStatus, method: 'Yappy' },
  { id: 'p3', concept: 'Paquete 4 horas · Lucía', amount: 60, date: '15 Jun', status: 'paid' as PaymentStatus, method: 'Cuanto' },
];

// ============= REPORTES =============
export const lastReport = {
  id: 'r1',
  date: '10 Jul',
  teacher: 'Prof. Carlos Ríos',
  topic: 'Present Simple',
  progress: 'Muy buen desempeño en oraciones afirmativas. Recomiendo reforzar la formulación de preguntas y respuestas cortas para la próxima clase.',
  homework: 'Ejercicios págs 12-14 del libro de práctica.',
};

export interface ReportFile {
  title: string;
  kind: string;   // 'PDF' | 'Video' | 'Link' | 'MP3' | 'Audio' | 'DOC'
  size?: string;
  url?: string;
}

export interface ReportItem {
  id: string;
  date: string;
  teacher: string;
  topic: string;
  progress: string;
  homework?: string;
  materials?: ReportFile[];
  attachments?: ReportFile[];
  screenshotUrl?: string;
  screenshotCapturedAt?: string;
}

export const reportsHistory: ReportItem[] = [
  {
    ...lastReport,
    materials: [
      { title: 'Guía Present Simple', kind: 'PDF', size: '1.2 MB' },
      { title: 'Video: Present Simple explicado', kind: 'Video', size: '5 min' },
      { title: 'Cambridge Grammar Reference', kind: 'Link' },
    ],
    attachments: [{ title: 'Ejercicios de práctica', kind: 'PDF', size: '600 KB' }],
    screenshotUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800',
    screenshotCapturedAt: '10 Jul · 10:05 AM',
  },
  {
    id: 'r2',
    date: '08 Jul',
    teacher: 'Prof. María Luna',
    topic: 'Vocabulary review',
    progress: 'Necesita repasar. Buen esfuerzo, pero es importante practicar el vocabulario nuevo diariamente.',
    homework: 'Lista de verbos irregulares.',
    attachments: [{ title: 'Lista vocabulary A1-A2', kind: 'PDF', size: '400 KB' }],
    screenshotUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800',
    screenshotCapturedAt: '08 Jul · 15:04 PM',
  },
  {
    id: 'r3',
    date: '05 Jul',
    teacher: 'Prof. Carlos Ríos',
    topic: 'Colors and shapes',
    progress: 'Excelente participación durante toda la clase. Muy activa en las dinámicas y en el uso del vocabulario nuevo.',
    homework: 'Dibujo con etiquetas de colores.',
    screenshotUrl: 'https://images.unsplash.com/photo-1610484826967-09c5720778c7?w=800',
    screenshotCapturedAt: '05 Jul · 10:03 AM',
  },
];

// Repositorio único de material de repaso y archivos.
// Deriva de reportsHistory para garantizar una sola fuente de información:
// todo el material que aparezca en la app viene siempre de un reporte.
export function getAllReportMaterials(): Array<ReportFile & {
  reportId: string;
  reportDate: string;
  reportTopic: string;
  reportTeacher: string;
}> {
  const all: Array<ReportFile & {
    reportId: string;
    reportDate: string;
    reportTopic: string;
    reportTeacher: string;
  }> = [];
  reportsHistory.forEach((r) => {
    (r.materials ?? []).forEach((m) => {
      all.push({
        ...m,
        reportId: r.id,
        reportDate: r.date,
        reportTopic: r.topic,
        reportTeacher: r.teacher,
      });
    });
    (r.attachments ?? []).forEach((a) => {
      all.push({
        ...a,
        reportId: r.id,
        reportDate: r.date,
        reportTopic: r.topic,
        reportTeacher: r.teacher,
      });
    });
  });
  return all;
}

// ============= MATERIALES =============
export const currentMaterial = {
  id: 'm1',
  title: 'Guía Present Simple',
  description: 'PDF · 4 páginas',
};

export const materialsList = [
  { id: 'm1', title: 'Guía Present Simple', kind: 'PDF', size: '1.2 MB', date: '10 Jul' },
  { id: 'm2', title: 'Vocabulario básico', kind: 'PDF', size: '800 KB', date: '05 Jul' },
  { id: 'm3', title: 'Audio Listening 1', kind: 'MP3', size: '3.4 MB', date: '01 Jul' },
];

// ============= CLASES DEL PROFESOR =============
export const teacherTodayClasses = [
  { id: 'tc1', student: 'Lucía Estudiante', studentAvatar: 'https://i.pravatar.cc/150?img=47', subject: 'Inglés básico', time: '10:00 AM', status: 'confirmed' as ClassStatus },
  { id: 'tc2', student: 'Diego Pérez', studentAvatar: 'https://i.pravatar.cc/150?img=12', subject: 'Inglés intermedio', time: '11:30 AM', status: 'confirmed' as ClassStatus },
  { id: 'tc3', student: 'Sara Morales', studentAvatar: 'https://i.pravatar.cc/150?img=25', subject: 'Conversación', time: '02:00 PM', status: 'pending' as ClassStatus },
];

export const teacherWeekClasses = [
  ...teacherTodayClasses,
  { id: 'tc4', student: 'Pablo Estudiante', studentAvatar: 'https://i.pravatar.cc/150?img=14', subject: 'Inglés básico', time: 'Mié 09:00 AM', status: 'confirmed' as ClassStatus },
  { id: 'tc5', student: 'Andrés Gómez', studentAvatar: 'https://i.pravatar.cc/150?img=32', subject: 'Conversación', time: 'Jue 03:00 PM', status: 'confirmed' as ClassStatus },
];

export const teacherPendingMaterials = [
  { id: 'mp1', student: 'Lucía Estudiante', material: 'Guía Present Continuous', due: 'Hoy' },
  { id: 'mp2', student: 'Diego Pérez', material: 'Audio Listening 2', due: 'Mañana' },
];

// ============= CLASE EN CURSO DEL PROFESOR =============
// Representa la clase que el profesor está impartiendo AHORA. Es la
// máxima prioridad operativa: mientras esté activa debe aparecer por
// encima de cualquier otra acción o aviso en el Home del profesor.
// hasScreenshot=false y minutesElapsed<10 → screenshot pendiente.
// Cuando el profesor sube el screenshot, la acción se marca localmente
// en el Home como enviada y desaparece de "Acciones de hoy".
export const teacherActiveClass = {
  id: 'lc-active',
  classRecordId: 'cr-active',
  student: 'Lucía Estudiante',
  studentAvatar: 'https://i.pravatar.cc/150?img=47',
  subject: 'Inglés · Básico',
  startTime: '10:00 AM',
  minutesElapsed: 4,
  hasScreenshot: false,
  teacherCameraOn: true,
  studentCameraOn: true,
};

// ============= REPORTES PENDIENTES DEL PROFESOR =============
// Clases ya finalizadas cuyo reporte no ha sido enviado. El material de
// repaso se adjunta OPCIONALMENTE dentro del mismo formulario del reporte;
// no existe una acción "Enviar material" independiente.
export const teacherPendingReports = [
  {
    id: 'rp-sara',
    classRecordId: 'cr-sara-09jul',
    student: 'Sara Morales',
    studentAvatar: 'https://i.pravatar.cc/150?img=25',
    subject: 'Conversación',
    finishedAt: '09 Jul · 3:00 PM',
    timeKey: new Date('2026-07-09T15:00:00').getTime(),
  },
];

// ============= ACUDIENTE =============
export const linkedStudents = [
  {
    id: 's1',
    name: 'Lucía Estudiante',
    firstName: 'Lucía',
    avatar: 'https://i.pravatar.cc/150?img=47',
    grade: '6° primaria',
    school: 'Colegio San Ignacio',
    remaining: 7,
    total: 8,
    next: 'Hoy 10:00 AM',
    nextSubject: 'Inglés básico',
    nextTeacher: 'Prof. Carlos Ríos',
    nextTeacherAvatar: 'https://i.pravatar.cc/150?img=68',
    paymentStatus: 'paid' as PaymentStatus,
    activeServices: ['Tutoría individual'] as string[],
    planTier: 'special' as TeacherTier,
    nextTeacherOnline: true,
    nextStartsInMin: 15,
    nextMaterialStatus: 'received' as 'received' | 'pending' | 'topic_written' | 'none',
  },
  {
    id: 's2',
    name: 'Pablo Estudiante',
    firstName: 'Pablo',
    avatar: 'https://i.pravatar.cc/150?img=14',
    grade: '4° primaria',
    school: 'Colegio San Ignacio',
    remaining: 3,
    total: 8,
    next: 'Mañana 04:00 PM',
    nextSubject: 'Inglés básico',
    nextTeacher: 'Prof. María Luna',
    nextTeacherAvatar: 'https://i.pravatar.cc/150?img=48',
    paymentStatus: 'paid' as PaymentStatus,
    activeServices: ['Tutoría individual', 'Curso grupal'] as string[],
    planTier: 'essentials' as TeacherTier,
    nextTeacherOnline: false,
    nextStartsInMin: 120,
    nextMaterialStatus: 'pending' as 'received' | 'pending' | 'topic_written' | 'none',
  },
];

export const currentGuardian = {
  id: 'g1',
  name: 'Marta Acudiente',
  firstName: 'Marta',
  avatar: 'https://i.pravatar.cc/150?img=32',
  phone: '+507 6555-1234',
  email: 'marta@familia.com',
};

// ============= SUPERVISOR =============
// minutesElapsed = minutos transcurridos desde la hora programada de inicio.
// hasScreenshot = si el profesor ya subió la evidencia de ingreso.
// El estado real del screenshot lo deriva la UI del supervisor usando
// getScreenshotStatus(minutesElapsed, hasScreenshot) desde constants/policies.
export const liveClasses = [
  { id: 'lc1', teacher: 'Prof. Carlos Ríos', teacherAvatar: 'https://i.pravatar.cc/150?img=68', student: 'Lucía E.', studentAvatar: 'https://i.pravatar.cc/150?img=47', subject: 'Inglés · Básico', time: '10:00', status: 'ok' as ClassStatus, teacherOnline: true, studentOnline: true, minutesElapsed: 5, hasScreenshot: true },
  { id: 'lc2', teacher: 'Prof. María Luna', teacherAvatar: 'https://i.pravatar.cc/150?img=48', student: 'Diego P.', studentAvatar: 'https://i.pravatar.cc/150?img=12', subject: 'Inglés · Conversación', time: '10:30', status: 'ok' as ClassStatus, teacherOnline: true, studentOnline: true, minutesElapsed: 4, hasScreenshot: false },
  { id: 'lc3', teacher: 'Prof. Ana Vega', teacherAvatar: 'https://i.pravatar.cc/150?img=44', student: 'Sara M.', studentAvatar: 'https://i.pravatar.cc/150?img=25', subject: 'Inglés · Business', time: '11:00', status: 'ok' as ClassStatus, teacherOnline: true, studentOnline: true, minutesElapsed: 12, hasScreenshot: false },
  { id: 'lc4', teacher: 'Prof. Luis Torres', teacherAvatar: 'https://i.pravatar.cc/150?img=66', student: 'Andrés G.', studentAvatar: 'https://i.pravatar.cc/150?img=32', subject: 'Inglés · Intermedio', time: '11:30', status: 'no_camera' as ClassStatus, teacherOnline: true, studentOnline: true, minutesElapsed: 20, hasScreenshot: true },
];

export const supervisorStats = {
  scheduled: 24,
  inProgress: 3,
  teachersConnected: 8,
  studentsConnected: 3,
  teacherLate: 1,
  studentLate: 0,
  pendingScreenshot: 1,
  cameraOff: 1,
  technicalIssues: 0,
  pendingReports: 4,
};

// ============= ADMIN =============
export const adminStats = {
  todayClasses: 24,
  activeClasses: 3,
  availableTeachers: 8,
  pendingBookings: 5,
  pendingPayments: 2,
  soldHours: 128,
  soldHoursMonth: 128,
  soldHoursYear: 1046,
  consumedHours: 96,
  pendingReports: 4,
  incidents: 2,
};

export const recentAlerts = [
  { id: 'a1', type: 'Screenshot faltante', detail: 'Prof. Carlos · 10:00 AM', tone: 'warning' as const, icon: 'camera-outline' },
  { id: 'a2', type: 'Profesor tarde', detail: 'Prof. Ana · 6 min', tone: 'danger' as const, icon: 'time-outline' },
];

// ============= CATÁLOGOS =============
// Materias base. Los niveles/especialidades se listan en SUBJECT_LEVELS.
// Estructura administrable desde el panel: agregar/editar/desactivar sin tocar código.
export const SUBJECTS_CATALOG = [
  'Inglés', 'Francés', 'Portugués', 'Español',
  'Matemáticas', 'Física', 'Química', 'Sociales',
];

// Niveles/programas reales por materia. Cada materia debe tener al menos un
// nivel; nunca se ofrece "Sin nivel específico". Si en el futuro alguna
// materia no requiere niveles, se deja la lista vacía y el flujo de reserva
// pasa directamente a la selección de profesor.
export const SUBJECT_LEVELS: Record<string, string[]> = {
  'Inglés': ['Básico', 'Intermedio', 'Avanzado', 'Conversación', 'Business', 'Preparación de exámenes'],
  'Francés': ['Básico', 'Intermedio', 'Avanzado'],
  'Portugués': ['Básico', 'Intermedio', 'Avanzado'],
  'Español': ['Primaria', 'Secundaria', 'Universidad'],
  'Matemáticas': ['Primaria', 'Premedia', 'Secundaria', 'Universidad'],
  'Física': ['Secundaria', 'Universidad'],
  'Química': ['Secundaria', 'Universidad'],
  'Sociales': ['Primaria', 'Premedia', 'Secundaria', 'Universidad'],
};

export const SUBJECT_META: Record<string, { icon: string; desc: string }> = {
  'Inglés': { icon: 'chatbubbles-outline', desc: 'Multinivel · A1 a Business' },
  'Francés': { icon: 'globe-outline', desc: 'Multinivel · A1 a B2' },
  'Portugués': { icon: 'globe-outline', desc: 'Multinivel · A1 a B1' },
  'Español': { icon: 'book-outline', desc: 'Redacción y comprensión' },
  'Matemáticas': { icon: 'calculator-outline', desc: 'Aritmética a cálculo' },
  'Física': { icon: 'flash-outline', desc: 'Mecánica y termodinámica' },
  'Química': { icon: 'flask-outline', desc: 'General y orgánica' },
  'Sociales': { icon: 'earth-outline', desc: 'Historia y geografía' },
};

export const TEACHERS_CATALOG = [
  { name: 'Cualquiera disponible', avatar: null },
  { name: 'Prof. Carlos Ríos', avatar: 'https://i.pravatar.cc/150?img=68' },
  { name: 'Prof. María Luna', avatar: 'https://i.pravatar.cc/150?img=48' },
  { name: 'Prof. Ana Vega', avatar: 'https://i.pravatar.cc/150?img=44' },
];

export const SLOTS_CATALOG = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

// ============= LABELS DE ESTADO =============
export const CLASS_STATUS: Record<ClassStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' }> = {
  ok: { label: 'En curso', tone: 'success' },
  no_screenshot: { label: 'Sin screenshot', tone: 'warning' },
  teacher_late: { label: 'Profe tarde', tone: 'danger' },
  student_late: { label: 'Estudiante tarde', tone: 'warning' },
  no_camera: { label: 'Sin cámara', tone: 'warning' },
  technical: { label: 'Técnico', tone: 'danger' },
  confirmed: { label: 'Confirmada', tone: 'success' },
  pending: { label: 'Pendiente', tone: 'warning' },
  completed: { label: 'Completada', tone: 'info' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'info'; icon: string }> = {
  paid: { label: 'Pagado', tone: 'success', icon: 'checkmark-circle' },
  pending: { label: 'Pendiente', tone: 'warning', icon: 'time-outline' },
  failed: { label: 'Fallido', tone: 'danger', icon: 'close-circle' },
  refunded: { label: 'Reembolsado', tone: 'info', icon: 'refresh-outline' },
};

// ============= PROFESORES (catálogo completo con IDs) =============
// subjects = materias base (Inglés, Francés, Matemáticas, etc.).
// levels = niveles/especialidades específicos que este profesor imparte.
export const TEACHERS_FULL: Array<{
  id: string;
  name: string;
  avatar: string;
  subjects: string[];
  levels: string[];
  tier: TeacherTier;
}> = [
  { id: 't1', name: 'Prof. Carlos Ríos', avatar: 'https://i.pravatar.cc/150?img=68', subjects: ['Inglés'], levels: ['Básico', 'Intermedio'], tier: 'essentials' },
  { id: 't2', name: 'Prof. María Luna', avatar: 'https://i.pravatar.cc/150?img=48', subjects: ['Inglés', 'Francés'], levels: ['Básico', 'Intermedio', 'Conversación'], tier: 'essentials' },
  { id: 't3', name: 'Prof. Ana Vega', avatar: 'https://i.pravatar.cc/150?img=44', subjects: ['Inglés'], levels: ['Intermedio', 'Business'], tier: 'special' },
  { id: 't4', name: 'Prof. Luis Torres', avatar: 'https://i.pravatar.cc/150?img=66', subjects: ['Matemáticas', 'Física'], levels: ['Secundaria', 'Universidad'], tier: 'special' },
];

// Disponibilidad semanal (0=Dom, 1=Lun, ..., 6=Sáb)
export const TEACHER_WEEK_AVAILABILITY: Record<string, Record<number, string[]>> = {
  t1: {
    1: ['09:00', '10:00', '11:00', '15:00', '16:00'],
    2: ['09:00', '10:00', '14:00', '16:00'],
    3: ['10:00', '11:00', '15:00'],
    4: ['09:00', '10:00', '14:00'],
    5: ['10:00', '11:00', '15:00', '16:00'],
    6: ['09:00', '10:00'],
  },
  t2: {
    1: ['10:00', '11:00', '14:00', '15:00'],
    2: ['09:00', '11:00', '15:00', '16:00'],
    3: ['10:00', '14:00', '16:00'],
    4: ['11:00', '15:00', '16:00'],
    5: ['09:00', '10:00', '14:00'],
  },
  t3: {
    1: ['14:00', '15:00', '16:00'],
    2: ['10:00', '14:00', '15:00', '16:00'],
    3: ['11:00', '15:00', '16:00'],
    4: ['10:00', '14:00', '15:00'],
    5: ['11:00', '14:00', '15:00'],
    6: ['10:00', '11:00'],
  },
  t4: {
    1: ['09:00', '15:00', '16:00'],
    2: ['10:00', '14:00', '16:00'],
    3: ['09:00', '11:00', '14:00', '15:00'],
    4: ['10:00', '15:00', '16:00'],
    5: ['09:00', '14:00', '15:00'],
  },
};

// ============= FECHAS =============
export const dateUtils = {
  todayISO: (): string => new Date().toISOString().split('T')[0],
  addDays: (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
  weekdayOf: (iso: string): number => new Date(iso + 'T00:00:00').getDay(),
  formatDisplay: (iso: string): string => {
    const d = new Date(iso + 'T00:00:00');
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  },
};

// ============= RESERVAS INICIALES =============
// Cierre final MVP: purga de seed de reservas mock. En produccion
// (__DEV__ === false) INITIAL_BOOKINGS es un arreglo vacio para que
// solo aparezcan reservas reales creadas via Cloud. En desarrollo
// (__DEV__ === true) se conserva la demo bk1..bk4 para poder navegar
// la app sin datos reales. Sigue el mismo patron aplicado a
// seedFromMock en paymentsService.
const _now = new Date().toISOString();
const _DEV_BOOKINGS: Booking[] = [
  {
    id: 'bk1',
    studentId: 's1',
    studentName: 'Lucía Estudiante',
    studentAvatar: 'https://i.pravatar.cc/150?img=47',
    teacherId: 't1',
    teacherName: 'Prof. Carlos Ríos',
    teacherAvatar: 'https://i.pravatar.cc/150?img=68',
    substituteId: null,
    substituteName: null,
    subject: 'Inglés · Básico',
    date: dateUtils.addDays(1),
    time: '10:00',
    durationMin: 60,
    status: 'confirmed',
    zoomUrl: 'https://us06web.zoom.us/j/2797072933',
    createdAt: _now,
    updatedAt: _now,
    hourConsumed: true,
  },
  {
    id: 'bk2',
    studentId: 's1',
    studentName: 'Lucía Estudiante',
    studentAvatar: 'https://i.pravatar.cc/150?img=47',
    teacherId: 't2',
    teacherName: 'Prof. María Luna',
    teacherAvatar: 'https://i.pravatar.cc/150?img=48',
    substituteId: null,
    substituteName: null,
    subject: 'Inglés · Conversación',
    date: dateUtils.addDays(3),
    time: '15:00',
    durationMin: 60,
    status: 'confirmed',
    zoomUrl: 'https://us06web.zoom.us/j/2797072933',
    createdAt: _now,
    updatedAt: _now,
    hourConsumed: true,
  },
  {
    id: 'bk3',
    studentId: 's2',
    studentName: 'Pablo Estudiante',
    studentAvatar: 'https://i.pravatar.cc/150?img=14',
    teacherId: 't2',
    teacherName: 'Prof. María Luna',
    teacherAvatar: 'https://i.pravatar.cc/150?img=48',
    substituteId: null,
    substituteName: null,
    subject: 'Inglés · Básico',
    date: dateUtils.addDays(1),
    time: '16:00',
    durationMin: 60,
    status: 'pending_payment',
    zoomUrl: 'https://us06web.zoom.us/j/2797072933',
    createdAt: _now,
    updatedAt: _now,
    hourConsumed: false,
  },
  {
    id: 'bk4',
    studentId: 's1',
    studentName: 'Lucía Estudiante',
    studentAvatar: 'https://i.pravatar.cc/150?img=47',
    teacherId: 't1',
    teacherName: 'Prof. Carlos Ríos',
    teacherAvatar: 'https://i.pravatar.cc/150?img=68',
    substituteId: null,
    substituteName: null,
    subject: 'Inglés · Básico',
    date: dateUtils.addDays(-2),
    time: '10:00',
    durationMin: 60,
    status: 'completed',
    zoomUrl: 'https://us06web.zoom.us/j/2797072933',
    createdAt: _now,
    updatedAt: _now,
    hourConsumed: true,
  },
];

export const INITIAL_BOOKINGS: Booking[] =
  typeof __DEV__ !== 'undefined' && __DEV__ ? _DEV_BOOKINGS : [];

// ============= PRÓXIMO PAGO =============
export const nextPayment = {
  concept: 'Renovación Paquete 8 horas',
  amount: 110,
  dueDate: '15 Ago 2026',
  autoRenew: false,
};

// ============= HISTORIAL DE PAQUETES =============
export type PackageStatus = 'active' | 'used' | 'expired';
export const packagesHistory: Array<{
  id: string; name: string; totalHours: number; price: number;
  purchasedAt: string; expiresAt: string; status: PackageStatus;
}> = [
  { id: 'pk1', name: 'Paquete 8 horas', totalHours: 8, price: 110, purchasedAt: '01 Jul 2026', expiresAt: '15 Ago 2026', status: 'active' },
  { id: 'pk2', name: 'Paquete 4 horas', totalHours: 4, price: 60, purchasedAt: '15 Jun 2026', expiresAt: '15 Jul 2026', status: 'used' },
  { id: 'pk3', name: 'Paquete 8 horas', totalHours: 8, price: 110, purchasedAt: '01 May 2026', expiresAt: '15 Jun 2026', status: 'expired' },
];

// ============= HISTORIAL DE RECARGAS =============
export const topUpsHistory: Array<{
  id: string; hours: number; price: number; date: string;
  method: string; status: PaymentStatus;
}> = [
  { id: 'tu1', hours: 2, price: 30, date: '10 Jun 2026', method: 'Cuanto', status: 'paid' },
  { id: 'tu2', hours: 4, price: 55, date: '20 May 2026', method: 'Yappy', status: 'paid' },
];

// ============= CONTACTO DEL ESTUDIANTE =============
export type ContactChannel = 'push' | 'whatsapp' | 'email';
export const studentContact = {
  guardian: 'Marta Acudiente',
  guardianPhone: '+507 6555-1234',
  guardianEmail: 'marta@familia.com',
  studentEmail: 'lucia@familia.com',
  preferredChannel: 'whatsapp' as ContactChannel,
  channels: {
    push: true,
    whatsapp: true,
    email: false,
  },
};

// ============= INFO ACADÉMICA DEL ESTUDIANTE =============
export const studentAcademic = {
  school: 'Colegio San Ignacio',
  grade: '6° primaria',
  subjects: ['Inglés básico', 'Conversación'],
  assignedTeacher: {
    name: 'Prof. Carlos Ríos',
    avatar: 'https://i.pravatar.cc/150?img=68',
  },
  hoursAvailable: 7,
  packageExpiresAt: '15 Ago 2026',
};

// ============= PREFERENCIAS DEL ESTUDIANTE =============
export const studentPreferences = {
  preferredSchedule: 'Tardes entre 3:00 PM y 6:00 PM',
  preferredTeacher: 'Prof. Carlos Ríos',
  observations: 'Le motiva la conversación libre y las canciones.',
  accommodations: 'Ninguna reportada.',
};

// ============= CURSOS GRUPALES =============
export interface GroupCourse {
  id: string;
  subject: string;
  grade: string;
  teacherName: string;
  teacherAvatar: string;
  schedule: string;
  startDate: string;
  availableSpots: number;
  totalSpots: number;
  price: number;
  planName: string;
}

export const GROUP_COURSES: GroupCourse[] = [
  {
    id: 'gc1',
    subject: 'Inglés · Básico',
    grade: '4° - 6° primaria',
    teacherName: 'Prof. Carlos Ríos',
    teacherAvatar: 'https://i.pravatar.cc/150?img=68',
    schedule: 'Lunes y miércoles · 4:00 PM',
    startDate: '01 Ago 2026',
    availableSpots: 5,
    totalSpots: 8,
    price: 220,
    planName: 'Plan trimestral · 24 clases',
  },
  {
    id: 'gc2',
    subject: 'Inglés · Conversación',
    grade: 'Adolescentes 12-15',
    teacherName: 'Prof. María Luna',
    teacherAvatar: 'https://i.pravatar.cc/150?img=48',
    schedule: 'Martes y jueves · 5:00 PM',
    startDate: '05 Ago 2026',
    availableSpots: 4,
    totalSpots: 6,
    price: 180,
    planName: 'Plan bimestral · 16 clases',
  },
  {
    id: 'gc3',
    subject: 'Inglés · Business',
    grade: 'Adultos',
    teacherName: 'Prof. Ana Vega',
    teacherAvatar: 'https://i.pravatar.cc/150?img=44',
    schedule: 'Sábados · 9:00 AM',
    startDate: '02 Ago 2026',
    availableSpots: 0,
    totalSpots: 10,
    price: 260,
    planName: 'Plan mensual · 4 clases largas',
  },
];

// ============================================================================
// Cursos grupales · pagos (prepago).
// El estado (Al día, Pendiente, En gracia, Vencido) se deriva con
// getGroupPaymentStatus(daysLate, paid) desde constants/policies.
// ============================================================================

export interface GroupCoursePayment {
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  cycleAmount: number;
  paymentDueDate: string;
  daysLate: number;
  paid: boolean;
}

export const studentGroupPayment: GroupCoursePayment = {
  courseId: 'gc1',
  courseName: 'Inglés · Básico grupal',
  studentId: 's1',
  studentName: 'Lucía',
  cycleAmount: 55,
  paymentDueDate: '15 Ago 2026',
  daysLate: 0,
  paid: true,
};

// Wordlish es 100% prepago: no hay ciclos con vencimiento por curso.
// Este arreglo se conserva vacío por compatibilidad con vistas antiguas.
export const guardianGroupPayments: GroupCoursePayment[] = [];
