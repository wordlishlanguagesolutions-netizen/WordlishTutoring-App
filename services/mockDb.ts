// Wordlish · Base de datos mock en memoria (Fase 1)
// Fuente única de verdad para todas las entidades.
// En Fase 2 se reemplaza por consultas a Supabase con RLS;
// los repositorios encapsulan el acceso y no cambia la API pública.

import type {
  UserProfile,
  Student,
  Guardian,
  Staff,
  Teacher,
  TeacherAvailability,
  Booking,
  ClassRecord,
  ClassEvent,
  Report,
  Screenshot,
  Material,
  Notification,
  SystemAlert,
  HourPackage,
  Payment,
  AuditLog,
  TeacherRate,
  TeacherPayroll,
} from '@/types';
import {
  INITIAL_BOOKINGS,
  packageInfo,
  currentStudent,
  currentTeacher,
  currentGuardian,
  linkedStudents,
  TEACHERS_FULL,
  TEACHER_WEEK_AVAILABILITY,
  dateUtils,
} from './mockData';

const nowIso = new Date().toISOString();

// Helper para IDs únicos
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ============= SEMILLA DE USUARIOS =============
const seedUsers: UserProfile[] = [
  { id: 'u-admin', fullName: 'Ana Administradora', firstName: 'Ana', email: 'admin@wordlish.com', phone: null, avatar: 'https://i.pravatar.cc/150?img=5', role: 'admin', accountType: 'staff', active: true, createdAt: nowIso, updatedAt: nowIso },
  { id: 'u-sup', fullName: 'Sofía Supervisora', firstName: 'Sofía', email: 'supervisor@wordlish.com', phone: null, avatar: 'https://i.pravatar.cc/150?img=20', role: 'supervisor', accountType: 'staff', active: true, createdAt: nowIso, updatedAt: nowIso },
  { id: 'u-t1', fullName: currentTeacher.name, firstName: currentTeacher.firstName, email: 'profesor@wordlish.com', phone: currentTeacher.phone, avatar: currentTeacher.avatar, role: 'teacher', accountType: 'staff', active: true, createdAt: nowIso, updatedAt: nowIso },
  { id: 'u-s1', fullName: currentStudent.name, firstName: currentStudent.firstName, email: 'estudiante@wordlish.com', phone: currentStudent.phone, avatar: currentStudent.avatar, role: 'student', accountType: 'student_guardian', active: true, createdAt: nowIso, updatedAt: nowIso },
  { id: 'u-g1', fullName: currentGuardian.name, firstName: currentGuardian.firstName, email: 'acudiente@wordlish.com', phone: currentGuardian.phone, avatar: currentGuardian.avatar, role: 'guardian', accountType: 'student_guardian', active: true, createdAt: nowIso, updatedAt: nowIso },
];

const seedStudents: Student[] = linkedStudents.map((s) => ({
  id: s.id,
  userId: s.id === 's1' ? 'u-s1' : null,
  fullName: s.name,
  firstName: s.firstName,
  avatar: s.avatar,
  age: s.id === 's1' ? 12 : 9,
  grade: s.grade,
  school: s.school,
  guardianId: 'g1',
  phone: null,
  createdAt: nowIso,
  updatedAt: nowIso,
}));

const seedGuardians: Guardian[] = [
  {
    id: 'g1',
    userId: 'u-g1',
    fullName: currentGuardian.name,
    firstName: currentGuardian.firstName,
    email: currentGuardian.email,
    phone: currentGuardian.phone,
    avatar: currentGuardian.avatar,
    studentIds: ['s1', 's2'],
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];

const seedStaff: Staff[] = [
  { id: 'st-a1', userId: 'u-admin', fullName: 'Ana Administradora', firstName: 'Ana', email: 'admin@wordlish.com', phone: null, avatar: 'https://i.pravatar.cc/150?img=5', role: 'admin', active: true, createdAt: nowIso, updatedAt: nowIso },
  { id: 'st-sup1', userId: 'u-sup', fullName: 'Sofía Supervisora', firstName: 'Sofía', email: 'supervisor@wordlish.com', phone: null, avatar: 'https://i.pravatar.cc/150?img=20', role: 'supervisor', active: true, createdAt: nowIso, updatedAt: nowIso },
  { id: 'st-t1', userId: 'u-t1', fullName: currentTeacher.name, firstName: currentTeacher.firstName, email: 'profesor@wordlish.com', phone: currentTeacher.phone, avatar: currentTeacher.avatar, role: 'teacher', active: true, createdAt: nowIso, updatedAt: nowIso },
];

const seedTeachers: Teacher[] = TEACHERS_FULL.map((t) => ({
  id: t.id,
  staffId: t.id === 't1' ? 'st-t1' : `st-${t.id}`,
  userId: t.id === 't1' ? 'u-t1' : `u-${t.id}`,
  fullName: t.name,
  firstName: t.name.replace('Prof. ', '').split(' ')[0],
  avatar: t.avatar,
  subjects: t.subjects,
  grades: currentTeacher.grades,
  phone: null,
  hourlyRate: 30,
  stats: currentTeacher.stats,
  createdAt: nowIso,
  updatedAt: nowIso,
}));

const seedAvailability: TeacherAvailability[] = Object.entries(
  TEACHER_WEEK_AVAILABILITY,
).flatMap(([teacherId, byDay]) =>
  Object.entries(byDay).map(([weekday, slots]) => ({
    id: `av-${teacherId}-${weekday}`,
    teacherId,
    weekday: Number(weekday),
    slots,
    publishedAt: nowIso,
    weekStart: dateUtils.todayISO(),
    createdAt: nowIso,
    updatedAt: nowIso,
  })),
);

const seedBookings: Booking[] = INITIAL_BOOKINGS.map((b) => ({
  ...b,
  packageId: b.hourConsumed ? `pkg-${b.studentId}` : null,
  classRecordId: null,
  guardianId: 'g1',
  createdBy: b.studentId === 's1' ? 'u-s1' : 'u-g1',
}));

// Nota: dejamos el paquete de Lucia (s1) con 0 horas para que al reservar
// se dispare el Flujo 2 (pago pendiente) y sea posible ver el Paso 4
// con los metodos de pago oficiales. Cambiar a >0 cuando se conecte
// el flujo real de compra de paquetes.
const seedPackages: HourPackage[] = [
  {
    id: 'pkg-s1',
    studentId: 's1',
    guardianId: 'g1',
    name: packageInfo.name,
    totalHours: packageInfo.total,
    remainingHours: 0,
    purchasedAt: nowIso,
    expiresAt: dateUtils.addDays(45),
    paymentId: null,
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: 'pkg-s2',
    studentId: 's2',
    guardianId: 'g1',
    name: 'Paquete 8 horas',
    totalHours: 8,
    remainingHours: 3,
    purchasedAt: nowIso,
    expiresAt: dateUtils.addDays(45),
    paymentId: null,
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];

// ============= TARIFAS DE PROFESOR (semilla) =============
const seedTeacherRates: TeacherRate[] = seedTeachers.map((t) => ({
  id: `rate-${t.id}`,
  teacherId: t.id,
  personalHourRate: t.hourlyRate,
  groupHourRate: Math.round(t.hourlyRate * 1.4 * 100) / 100,
  absencePayRate: Math.round(t.hourlyRate * 0.5 * 100) / 100,
  currency: 'USD',
  effectiveFrom: dateUtils.addDays(-120),
  effectiveTo: null,
  active: true,
  createdAt: nowIso,
  updatedAt: nowIso,
}));

// ============= LIQUIDACIONES (semilla demo, mes anterior pagado) =============
const seedPayrolls: TeacherPayroll[] = [
  {
    id: 'pr-seed-t1-202606',
    teacherId: 't1',
    teacherName: currentTeacher.name,
    month: '2026-06',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    personalClassesCount: 22,
    groupClassesCount: 0,
    payableHours: 22,
    payableAbsences: 1,
    cancellations: 1,
    rateSnapshot: {
      personalHourRate: 30,
      groupHourRate: 42,
      absencePayRate: 15,
      currency: 'USD',
    },
    computedTotal: 675,
    adjustments: [],
    finalTotal: 675,
    status: 'paid',
    reviewedAt: '2026-07-02T10:00:00.000Z',
    reviewedBy: 'u-admin',
    paidAt: '2026-07-03T15:00:00.000Z',
    paidBy: 'u-admin',
    paymentReceiptUrl: null,
    paymentReference: 'TR-062026-T1',
    notes: null,
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-03T15:00:00.000Z',
  },
];

// ============= EXPORT DB =============
export const mockDb = {
  users: seedUsers,
  students: seedStudents,
  guardians: seedGuardians,
  staff: seedStaff,
  teachers: seedTeachers,
  availability: seedAvailability,
  bookings: seedBookings,
  classRecords: [] as ClassRecord[],
  classEvents: [] as ClassEvent[],
  reports: [] as Report[],
  screenshots: [] as Screenshot[],
  materials: [] as Material[],
  notifications: [] as Notification[],
  systemAlerts: [] as SystemAlert[],
  packages: seedPackages,
  payments: [] as Payment[],
  teacherRates: seedTeacherRates,
  payrolls: seedPayrolls,
  auditLog: [] as AuditLog[],
};

// Seed inicial: crear expediente de clase por cada booking existente
mockDb.bookings.forEach((b) => {
  if (b.classRecordId) return;
  const cr: ClassRecord = {
    id: makeId('cr'),
    bookingId: b.id,
    studentId: b.studentId,
    teacherId: b.teacherId,
    guardianId: b.guardianId ?? null,
    subject: b.subject,
    date: b.date,
    time: b.time,
    status: b.status === 'completed' ? 'completed' : 'scheduled',
    zoomUrl: b.zoomUrl,
    zoomMeetingId: null,
    startedAt: null,
    endedAt: null,
    studentJoinedAt: null,
    teacherJoinedAt: null,
    screenshotId: null,
    reportId: null,
    materialIds: [],
    observations: null,
    supervisorNotes: null,
    substituteAssigned: false,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
  mockDb.classRecords.push(cr);
  b.classRecordId = cr.id;
});
