// Wordlish · Modelos de dominio (Fase 1)
// Interfaces de todas las entidades. Preparadas para mapearse
// directamente a tablas de Supabase en Fase 2.
//
// Reglas duras:
// - Reports, Screenshots y Materials NUNCA existen sueltos.
//   Siempre pertenecen a un ClassRecord (expediente único de clase).
// - Cada Booking crea automáticamente su ClassRecord.
// - Todas las notificaciones apuntan a un userId destinatario.

import type {
  BookingStatus,
  ClassRecordStatus,
  PaymentStatus,
  PaymentMethod,
  NotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
  AlertSeverity,
  AccountType,
  SpecificRole,
  MaterialKind,
  ClassKind,
  PayrollStatus,
  PayrollAdjustmentKind,
  ClassEventType,
  ReportStatus,
  MaterialSource,
} from './enums';

// ============= BASE =============
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ============= USUARIOS =============
export interface UserProfile extends BaseEntity {
  fullName: string;
  firstName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: SpecificRole;
  accountType: AccountType;
  active: boolean;
}

// Estudiante (puede o no tener userId propio si es menor)
export interface Student extends BaseEntity {
  userId: string | null;
  fullName: string;
  firstName: string;
  avatar: string | null;
  age: number;
  grade: string;
  school: string;
  guardianId: string | null;
  phone: string | null;
}

// Acudiente
export interface Guardian extends BaseEntity {
  userId: string;
  fullName: string;
  firstName: string;
  email: string;
  phone: string;
  avatar: string | null;
  studentIds: string[];
}

// Staff: admin | supervisor | teacher
export interface Staff extends BaseEntity {
  userId: string;
  fullName: string;
  firstName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: 'admin' | 'supervisor' | 'teacher';
  active: boolean;
}

// Profesor (extensión de Staff con datos didácticos)
export interface Teacher extends BaseEntity {
  staffId: string;
  userId: string;
  fullName: string;
  firstName: string;
  avatar: string | null;
  subjects: string[];
  grades: string[];
  phone: string | null;
  hourlyRate: number;
  stats: {
    assigned: number;
    delivered: number;
    absences: number;
    pendingReports: number;
    accumulatedPay: number;
  };
}

// Disponibilidad de un profesor por día de semana (0=Dom, 1=Lun, ..., 6=Sáb)
export interface TeacherAvailability extends BaseEntity {
  teacherId: string;
  weekday: number;
  slots: string[]; // ['09:00', '10:00', ...]
  publishedAt: string | null;
  weekStart: string; // ISO YYYY-MM-DD (lunes de la semana)
}

// ============= RESERVAS =============
// El módulo de reservas actual usa esta forma. Se mantienen los
// nombres denormalizados (studentName, teacherAvatar, etc.) para
// que las pantallas existentes no cambien; en Supabase se resolverán
// por joins pero seguirán exponiéndose iguales al cliente.
export interface Booking extends BaseEntity {
  studentId: string;
  studentName: string;
  studentAvatar: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  substituteId: string | null;
  substituteName: string | null;
  subject: string;
  date: string;
  time: string;
  durationMin: number;
  status: BookingStatus;
  zoomUrl: string;
  hourConsumed: boolean;
  // Campos de arquitectura extendida (opcionales para compat)
  packageId?: string | null;
  classRecordId?: string | null;
  guardianId?: string | null;
  createdBy?: string;
}

// ============= EXPEDIENTE DE CLASE =============
// Único expediente por clase. Relaciona todo lo que sucede
// durante y después de la sesión.
export interface ClassRecord extends BaseEntity {
  bookingId: string;
  studentId: string;
  teacherId: string;
  guardianId: string | null;
  subject: string;
  kind?: ClassKind;
  date: string;
  time: string;
  status: ClassRecordStatus;
  zoomUrl: string;
  zoomMeetingId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  studentJoinedAt: string | null;
  teacherJoinedAt: string | null;
  screenshotId: string | null;
  reportId: string | null;
  materialIds: string[];
  observations: string | null;
  supervisorNotes: string | null;
  substituteAssigned: boolean;
  // Campos opcionales del flujo de gestión
  studentTopic?: string | null;
  studentMaterialSubmittedAt?: string | null;
}

// ============= LÍNEA DE TIEMPO DE LA CLASE =============
// Cada acción del ciclo de vida (antes/durante/después)
// se registra aquí. El timeline es inmutable y ordenado por 'at'.
export interface ClassEvent extends BaseEntity {
  classRecordId: string;
  type: ClassEventType;
  at: string;
  actorId: string;
  actorRole: SpecificRole;
  message: string;
  meta: Record<string, unknown> | null;
}

// ============= REPORTES =============
// Regla dura: SIEMPRE pertenecen a un ClassRecord.
// Ciclo: draft -> sent -> read -> confirmed.
export interface Report extends BaseEntity {
  classRecordId: string;
  bookingId: string;
  teacherId: string;
  studentId: string;
  topic: string;
  progress: string;
  objectives: string;
  strengths: string;
  improvements: string;
  homework: string | null;
  guardianNotes: string | null;
  rating: number | null;
  attachments: string[];
  status: ReportStatus;
  submittedAt: string;
}

// ============= SCREENSHOTS =============
// Regla dura: SIEMPRE pertenecen a un ClassRecord.
export interface Screenshot extends BaseEntity {
  classRecordId: string;
  bookingId: string;
  teacherId: string;
  studentId: string;
  url: string;
  capturedAt: string;
  verified: boolean;
}

// ============= MATERIALES =============
// Regla dura: SIEMPRE pertenecen a un ClassRecord.
// 'source' identifica si lo aportó el estudiante (pre-clase)
// o lo envió el profesor (post-clase).
export interface Material extends BaseEntity {
  classRecordId: string;
  bookingId: string;
  teacherId: string;
  studentId: string;
  title: string;
  description: string | null;
  kind: MaterialKind;
  url: string;
  size: string;
  source: MaterialSource;
}

// ============= NOTIFICACIONES =============
// Cada usuario tiene su centro de notificaciones (userId).
// La arquitectura está preparada para despachar por multiples canales
// (push, whatsapp, email) pero Fase 1 solo entrega in_app.
export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  deliveryStatus: NotificationDeliveryStatus;
  read: boolean;
  readAt: string | null;
  actionRoute: string | null;
  actionLabel: string | null;
  refType: 'booking' | 'class' | 'payment' | 'report' | 'material' | 'payroll' | null;
  refId: string | null;
  scheduledFor: string | null;
  tone: 'info' | 'success' | 'warning' | 'danger' | 'primary';
  icon: string;
}

// ============= ALERTAS (sistema, para supervisor) =============
export interface SystemAlert extends BaseEntity {
  classRecordId: string | null;
  teacherId: string | null;
  studentId: string | null;
  type: string;
  detail: string;
  severity: AlertSeverity;
  icon: string;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

// ============= PAQUETES =============
export interface HourPackage extends BaseEntity {
  studentId: string;
  guardianId: string | null;
  name: string;
  totalHours: number;
  remainingHours: number;
  purchasedAt: string;
  expiresAt: string;
  paymentId: string | null;
  active: boolean;
}

// ============= PAGOS =============
export interface Payment extends BaseEntity {
  studentId: string | null;
  guardianId: string | null;
  packageId: string | null;
  bookingId: string | null;
  concept: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  paidAt: string | null;
  externalReference: string | null;
}

// ============= HISTORIAL (audit log) =============
export interface AuditLog extends BaseEntity {
  actorUserId: string;
  actorRole: SpecificRole;
  action: string;
  entity: string;
  entityId: string;
  changes: Record<string, unknown>;
}

// ============= TARIFAS DE PROFESOR =============
// Snapshot de tarifas vigentes por profesor. Al calcular una
// liquidación, se congela el valor dentro de TeacherPayroll.rateSnapshot
// para que un cambio de tarifa futuro no altere periodos ya liquidados.
export interface TeacherRate extends BaseEntity {
  teacherId: string;
  personalHourRate: number;
  groupHourRate: number;
  absencePayRate: number;
  currency: string;
  effectiveFrom: string; // ISO YYYY-MM-DD
  effectiveTo: string | null;
  active: boolean;
}

// ============= LIQUIDACIONES MENSUALES =============
// Reglas duras (aplican en payrollService, no en pantallas):
// - Periodo: día 1 al último día del mes (UTC).
// - Revisión: días 1 al 5 del mes siguiente.
// - Estados: draft -> reviewed -> paid. `paid` es terminal.
// - Una liquidación pagada NO se puede editar.
// - Al marcar pagada se emite notificación interna al profesor.
export interface TeacherPayrollAdjustment {
  id: string;
  kind: PayrollAdjustmentKind;
  reason: string;
  amount: number; // positivo o negativo
  createdAt: string;
  createdBy: string;
}

export interface TeacherPayroll extends BaseEntity {
  teacherId: string;
  teacherName: string;   // snapshot denormalizado
  month: string;         // YYYY-MM
  periodStart: string;   // YYYY-MM-DD
  periodEnd: string;     // YYYY-MM-DD
  personalClassesCount: number;
  groupClassesCount: number;
  payableHours: number;
  payableAbsences: number;
  cancellations: number;
  rateSnapshot: {
    personalHourRate: number;
    groupHourRate: number;
    absencePayRate: number;
    currency: string;
  };
  computedTotal: number;
  adjustments: TeacherPayrollAdjustment[];
  finalTotal: number;
  status: PayrollStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  paidAt: string | null;
  paidBy: string | null;
  paymentReceiptUrl: string | null;
  paymentReference: string | null;
  notes: string | null;
}
