// ============================================================================
// Dashboard admin · Fase 4.
// Datos exclusivamente para el panel administrativo web. No sustituyen los
// mocks de negocio, únicamente los agregan y agrupan para presentación.
// Cuando se conecte OnSpace Cloud, este archivo se reemplazará por consultas
// reales sin tocar la UI del Dashboard.
// ============================================================================

export type DashSeverity = 'info' | 'warning' | 'danger' | 'success';

export interface LiveClassRow {
  id: string;
  teacher: string;
  student: string;
  subject: string;
  startedAt: string;   // "10:00"
  elapsedMin: number;
  screenshot: 'ok' | 'pending' | 'late';
  status: 'ok' | 'no_camera' | 'technical';
}

export interface UpcomingRow {
  id: string;
  teacher: string;
  student: string;
  subject: string;
  time: string;
  in: string;           // "en 15 min"
  kind: 'individual' | 'group';
}

export interface ConnectedTeacherRow {
  id: string;
  name: string;
  since: string;       // "09:12"
  nextClass: string;   // "10:00 · Lucía"
  tier: 'essential' | 'special';
}

export interface ConnectedStudentRow {
  id: string;
  name: string;
  waitingFor: string;  // teacher name
  since: string;       // "en clase" | "09:58"
}

export interface PendingScreenshotRow {
  id: string;
  teacher: string;
  student: string;
  subject: string;
  minutesLate: number;
}

export interface PendingReportRow {
  id: string;
  teacher: string;
  student: string;
  subject: string;
  finishedAt: string;
  hoursOverdue: number;
}

export interface PendingMaterialRow {
  id: string;
  teacher: string;
  student: string;
  subject: string;
  due: string;
}

export interface StudentWaitingRow {
  id: string;
  student: string;
  teacher: string;
  since: string;
  minutes: number;
}

export interface TeacherOfflineRow {
  id: string;
  teacher: string;
  student: string;
  subject: string;
  startsIn: string;
  minutesLate: number;
}

export interface PendingPaymentRow {
  id: string;
  student: string;
  concept: string;
  amount: number;
  dueDate: string;
  daysLate: number;
}

export interface NewBookingRow {
  id: string;
  student: string;
  teacher: string;
  subject: string;
  date: string;
  time: string;
  createdAt: string;
}

export interface MessageRow {
  id: string;
  from: string;
  role: 'student' | 'guardian' | 'teacher';
  subject: string;
  createdAt: string;
  severity: DashSeverity;
}

export interface SystemAlertRow {
  id: string;
  title: string;
  detail: string;
  severity: DashSeverity;
  ts: string;
}

// -------- Column 1 · Operativo en vivo --------
export const dashLiveClasses: LiveClassRow[] = [
  { id: 'lc1', teacher: 'Prof. Carlos Ríos',  student: 'Lucía Estudiante', subject: 'Inglés · Básico',      startedAt: '10:00', elapsedMin: 5,  screenshot: 'ok',      status: 'ok' },
  { id: 'lc2', teacher: 'Prof. María Luna',   student: 'Diego Pérez',      subject: 'Inglés · Conversación', startedAt: '10:30', elapsedMin: 4,  screenshot: 'pending', status: 'ok' },
  { id: 'lc3', teacher: 'Prof. Ana Vega',     student: 'Sara Morales',     subject: 'Inglés · Business',    startedAt: '11:00', elapsedMin: 12, screenshot: 'late',    status: 'no_camera' },
];

export const dashUpcoming: UpcomingRow[] = [
  { id: 'up1', teacher: 'Prof. Carlos Ríos',  student: 'Pablo Estudiante', subject: 'Inglés · Básico', time: '11:00', in: 'en 12 min', kind: 'individual' },
  { id: 'up2', teacher: 'Prof. María Luna',   student: 'Andrés Gómez',     subject: 'Conversación',    time: '11:30', in: 'en 42 min', kind: 'individual' },
  { id: 'up3', teacher: 'Prof. Ana Vega',     student: 'Grupo B1',         subject: 'Business',        time: '12:00', in: 'en 1 h 12', kind: 'group' },
  { id: 'up4', teacher: 'Prof. Luis Torres',  student: 'Camila Ruiz',      subject: 'Matemáticas',     time: '14:00', in: 'en 3 h',    kind: 'individual' },
];

export const dashConnectedTeachers: ConnectedTeacherRow[] = [
  { id: 't1', name: 'Prof. Carlos Ríos', since: '09:12', nextClass: '10:00 · Lucía',       tier: 'essential' },
  { id: 't2', name: 'Prof. María Luna',  since: '09:45', nextClass: '10:30 · Diego',       tier: 'essential' },
  { id: 't3', name: 'Prof. Ana Vega',    since: '10:20', nextClass: 'En curso · Sara',     tier: 'special' },
  { id: 't4', name: 'Prof. Luis Torres', since: '09:58', nextClass: '14:00 · Camila',      tier: 'special' },
];

export const dashConnectedStudents: ConnectedStudentRow[] = [
  { id: 's1', name: 'Lucía Estudiante', waitingFor: 'Prof. Carlos', since: 'en clase' },
  { id: 's2', name: 'Diego Pérez',      waitingFor: 'Prof. María',  since: 'en clase' },
  { id: 's3', name: 'Sara Morales',     waitingFor: 'Prof. Ana',    since: 'en clase' },
];

// -------- Column 2 · Pendientes operativos --------
export const dashPendingScreenshots: PendingScreenshotRow[] = [
  { id: 'ps1', teacher: 'Prof. María Luna', student: 'Diego Pérez',  subject: 'Inglés · Conversación', minutesLate: 4 },
  { id: 'ps2', teacher: 'Prof. Ana Vega',   student: 'Sara Morales', subject: 'Inglés · Business',     minutesLate: 12 },
];

export const dashPendingReports: PendingReportRow[] = [
  { id: 'pr1', teacher: 'Prof. Carlos Ríos', student: 'Sara Morales',     subject: 'Conversación', finishedAt: '09 Jul · 3:00 PM', hoursOverdue: 18 },
  { id: 'pr2', teacher: 'Prof. María Luna',  student: 'Pablo Estudiante', subject: 'Inglés Básico', finishedAt: '10 Jul · 4:00 PM', hoursOverdue: 2 },
];

export const dashPendingMaterials: PendingMaterialRow[] = [
  { id: 'pm1', teacher: 'Prof. Carlos Ríos', student: 'Lucía Estudiante', subject: 'Inglés Básico', due: 'Hoy' },
  { id: 'pm2', teacher: 'Prof. María Luna',  student: 'Diego Pérez',      subject: 'Conversación',  due: 'Mañana' },
];

export const dashStudentsWaiting: StudentWaitingRow[] = [
  { id: 'sw1', student: 'Andrés Gómez', teacher: 'Prof. Ana Vega', since: '10:58', minutes: 3 },
];

export const dashTeachersOffline: TeacherOfflineRow[] = [
  { id: 'to1', teacher: 'Prof. Luis Torres', student: 'Camila Ruiz', subject: 'Matemáticas', startsIn: '14:00', minutesLate: 0 },
];

// -------- Column 3 · Negocio, mensajes, alertas --------
export const dashPendingPayments: PendingPaymentRow[] = [
  { id: 'pp1', student: 'Pablo Estudiante', concept: 'Curso grupal Inglés',   amount: 55,  dueDate: '10 Jul 2026', daysLate: 2 },
  { id: 'pp2', student: 'Lucía Estudiante', concept: 'Renovación 8 h',        amount: 110, dueDate: '15 Ago 2026', daysLate: 0 },
  { id: 'pp3', student: 'Andrés Gómez',     concept: 'Recarga 2 h',           amount: 30,  dueDate: '10 Jun 2026', daysLate: 32 },
];

export const dashNewBookings: NewBookingRow[] = [
  { id: 'nb1', student: 'Lucía Estudiante', teacher: 'Prof. Carlos Ríos', subject: 'Inglés Básico', date: '12 Jul', time: '10:00', createdAt: 'hace 12 min' },
  { id: 'nb2', student: 'Diego Pérez',      teacher: 'Prof. María Luna',  subject: 'Conversación',  date: '13 Jul', time: '11:00', createdAt: 'hace 34 min' },
  { id: 'nb3', student: 'Sara Morales',     teacher: 'Prof. Ana Vega',    subject: 'Business',      date: '15 Jul', time: '09:00', createdAt: 'hace 2 h' },
];

export const dashMessages: MessageRow[] = [
  { id: 'm1', from: 'Marta Acudiente', role: 'guardian', subject: 'Consulta de horario',      createdAt: 'hace 8 min',  severity: 'info' },
  { id: 'm2', from: 'Prof. Carlos',    role: 'teacher',  subject: 'Solicita cambio de clase', createdAt: 'hace 40 min', severity: 'warning' },
  { id: 'm3', from: 'Lucía',           role: 'student',  subject: 'No pudo entrar a Zoom',    createdAt: 'hace 1 h',    severity: 'danger' },
];

export const dashSystemAlerts: SystemAlertRow[] = [
  { id: 'a1', title: 'Screenshot faltante',   detail: 'Prof. Ana Vega · Sara Morales · 12 min', severity: 'danger',  ts: '11:12' },
  { id: 'a2', title: 'Reporte vencido',       detail: 'Prof. Carlos · Sara · +18 h',            severity: 'warning', ts: '09:00' },
  { id: 'a3', title: 'Pago vencido',          detail: 'Andrés Gómez · 32 días',                 severity: 'danger',  ts: '08:20' },
  { id: 'a4', title: 'Profesor sin publicar', detail: 'Prof. Luis Torres · semana 12 Jul',      severity: 'warning', ts: '07:45' },
];

// -------- KPIs cabecera --------
export const dashKpis = {
  classesToday: 24,
  liveNow: dashLiveClasses.length,
  teachersOnline: dashConnectedTeachers.length,
  studentsOnline: dashConnectedStudents.length,
  screenshotsPending: dashPendingScreenshots.length,
  reportsPending: dashPendingReports.length,
  paymentsPending: dashPendingPayments.length,
  incidents: dashSystemAlerts.filter((a) => a.severity === 'danger').length,
};
