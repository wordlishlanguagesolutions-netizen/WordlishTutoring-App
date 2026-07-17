// Wordlish · Export service (CSV/Excel-compatible)
// Serializa cualquier entidad del mockDb a CSV UTF-8, compatible
// con Excel y Google Sheets (importar como CSV, separador coma).
//
// Este módulo NO ejecuta descargas ni escribe archivos.
// Devuelve un ExportPayload (filename + content) para que la capa
// de UI decida cómo entregarlo:
//   - Web: Blob + <a download>
//   - Nativo: expo-file-system + expo-sharing
//
// Todas las entidades comparten el mismo contrato para que en
// Fase 2 sea trivial encolar exportaciones asíncronas o generar
// XLSX real desde una Edge Function.

import { mockDb } from './mockDb';
import { filterBookings, filterStudents, SecurityContext } from './securityService';

export interface ExportPayload {
  filename: string;
  content: string;
  mimeType: string;
  rows: number;
  headers: string[];
}

interface ColumnDef<T> {
  key: string;
  label: string;
  get: (row: T) => unknown;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(cols: ColumnDef<T>[], rows: T[]): string {
  const header = cols.map((c) => escapeCell(c.label)).join(',');
  const body = rows
    .map((r) => cols.map((c) => escapeCell(c.get(r))).join(','))
    .join('\r\n');
  return body.length > 0 ? `${header}\r\n${body}` : header;
}

function stamp(): string {
  return new Date().toISOString().split('T')[0];
}

function build<T>(name: string, cols: ColumnDef<T>[], rows: T[]): ExportPayload {
  return {
    filename: `wordlish-${name}-${stamp()}.csv`,
    content: toCsv(cols, rows),
    mimeType: 'text/csv;charset=utf-8',
    rows: rows.length,
    headers: cols.map((c) => c.label),
  };
}

// ============= CLASES (ClassRecord) =============
export function exportClasses(ctx?: SecurityContext | null): ExportPayload {
  const source = ctx ? filterBookings(ctx, mockDb.classRecords) : mockDb.classRecords;
  return build('clases', [
    { key: 'id', label: 'ID', get: (r) => r.id },
    { key: 'bookingId', label: 'Reserva', get: (r) => r.bookingId },
    { key: 'date', label: 'Fecha', get: (r) => r.date },
    { key: 'time', label: 'Hora', get: (r) => r.time },
    { key: 'teacherId', label: 'Profesor ID', get: (r) => r.teacherId },
    { key: 'studentId', label: 'Estudiante ID', get: (r) => r.studentId },
    { key: 'guardianId', label: 'Acudiente ID', get: (r) => r.guardianId ?? '' },
    { key: 'subject', label: 'Materia', get: (r) => r.subject },
    { key: 'kind', label: 'Tipo', get: (r) => r.kind ?? 'personal' },
    { key: 'status', label: 'Estado', get: (r) => r.status },
    { key: 'startedAt', label: 'Inicio', get: (r) => r.startedAt ?? '' },
    { key: 'endedAt', label: 'Fin', get: (r) => r.endedAt ?? '' },
    { key: 'reportId', label: 'Reporte', get: (r) => r.reportId ?? '' },
    { key: 'screenshotId', label: 'Screenshot', get: (r) => r.screenshotId ?? '' },
    { key: 'substituteAssigned', label: 'Suplente', get: (r) => (r.substituteAssigned ? 'sí' : 'no') },
    { key: 'observations', label: 'Observaciones', get: (r) => r.observations ?? '' },
  ], source);
}

// ============= PROFESORES =============
export function exportTeachers(): ExportPayload {
  return build('profesores', [
    { key: 'id', label: 'ID', get: (t) => t.id },
    { key: 'fullName', label: 'Nombre', get: (t) => t.fullName },
    { key: 'subjects', label: 'Materias', get: (t) => t.subjects.join(' | ') },
    { key: 'grades', label: 'Grados', get: (t) => t.grades.join(' | ') },
    { key: 'phone', label: 'Teléfono', get: (t) => t.phone ?? '' },
    { key: 'hourlyRate', label: 'Tarifa base', get: (t) => t.hourlyRate },
    { key: 'assigned', label: 'Asignadas', get: (t) => t.stats.assigned },
    { key: 'delivered', label: 'Impartidas', get: (t) => t.stats.delivered },
    { key: 'absences', label: 'Ausencias', get: (t) => t.stats.absences },
    { key: 'pendingReports', label: 'Reportes pendientes', get: (t) => t.stats.pendingReports },
    { key: 'accumulatedPay', label: 'Pago acumulado', get: (t) => t.stats.accumulatedPay },
  ], mockDb.teachers);
}

// ============= ESTUDIANTES =============
export function exportStudents(ctx?: SecurityContext | null): ExportPayload {
  const source = ctx ? filterStudents(ctx, mockDb.students) : mockDb.students;
  return build('estudiantes', [
    { key: 'id', label: 'ID', get: (s) => s.id },
    { key: 'fullName', label: 'Nombre', get: (s) => s.fullName },
    { key: 'age', label: 'Edad', get: (s) => s.age },
    { key: 'grade', label: 'Grado', get: (s) => s.grade },
    { key: 'school', label: 'Colegio', get: (s) => s.school },
    { key: 'guardianId', label: 'Acudiente ID', get: (s) => s.guardianId ?? '' },
    { key: 'phone', label: 'Teléfono', get: (s) => s.phone ?? '' },
  ], source);
}

// ============= PAGOS =============
export function exportPayments(): ExportPayload {
  return build('pagos', [
    { key: 'id', label: 'ID', get: (p) => p.id },
    { key: 'studentId', label: 'Estudiante', get: (p) => p.studentId ?? '' },
    { key: 'guardianId', label: 'Acudiente', get: (p) => p.guardianId ?? '' },
    { key: 'packageId', label: 'Paquete', get: (p) => p.packageId ?? '' },
    { key: 'bookingId', label: 'Reserva', get: (p) => p.bookingId ?? '' },
    { key: 'concept', label: 'Concepto', get: (p) => p.concept },
    { key: 'amount', label: 'Monto', get: (p) => p.amount },
    { key: 'currency', label: 'Moneda', get: (p) => p.currency },
    { key: 'status', label: 'Estado', get: (p) => p.status },
    { key: 'method', label: 'Método', get: (p) => p.method },
    { key: 'paidAt', label: 'Pagado', get: (p) => p.paidAt ?? '' },
    { key: 'externalReference', label: 'Referencia', get: (p) => p.externalReference ?? '' },
    { key: 'createdAt', label: 'Creado', get: (p) => p.createdAt },
  ], mockDb.payments);
}

// ============= LIQUIDACIONES =============
export function exportPayrolls(): ExportPayload {
  return build('liquidaciones', [
    { key: 'id', label: 'ID', get: (p) => p.id },
    { key: 'month', label: 'Mes', get: (p) => p.month },
    { key: 'periodStart', label: 'Inicio', get: (p) => p.periodStart },
    { key: 'periodEnd', label: 'Cierre', get: (p) => p.periodEnd },
    { key: 'teacherId', label: 'Profesor ID', get: (p) => p.teacherId },
    { key: 'teacherName', label: 'Profesor', get: (p) => p.teacherName },
    { key: 'personalClassesCount', label: 'Personalizadas', get: (p) => p.personalClassesCount },
    { key: 'groupClassesCount', label: 'Grupales', get: (p) => p.groupClassesCount },
    { key: 'payableHours', label: 'Horas pagables', get: (p) => p.payableHours },
    { key: 'payableAbsences', label: 'Ausencias pagables', get: (p) => p.payableAbsences },
    { key: 'cancellations', label: 'Canceladas', get: (p) => p.cancellations },
    { key: 'personalRate', label: 'Tarifa personal', get: (p) => p.rateSnapshot.personalHourRate },
    { key: 'groupRate', label: 'Tarifa grupal', get: (p) => p.rateSnapshot.groupHourRate },
    { key: 'absenceRate', label: 'Tarifa ausencia', get: (p) => p.rateSnapshot.absencePayRate },
    { key: 'currency', label: 'Moneda', get: (p) => p.rateSnapshot.currency },
    { key: 'computedTotal', label: 'Total calculado', get: (p) => p.computedTotal },
    { key: 'adjustmentsTotal', label: 'Ajustes', get: (p) => p.adjustments.reduce((s, a) => s + a.amount, 0) },
    { key: 'finalTotal', label: 'Total final', get: (p) => p.finalTotal },
    { key: 'status', label: 'Estado', get: (p) => p.status },
    { key: 'reviewedAt', label: 'Revisado', get: (p) => p.reviewedAt ?? '' },
    { key: 'reviewedBy', label: 'Revisor', get: (p) => p.reviewedBy ?? '' },
    { key: 'paidAt', label: 'Fecha de pago', get: (p) => p.paidAt ?? '' },
    { key: 'paidBy', label: 'Registrado por', get: (p) => p.paidBy ?? '' },
    { key: 'paymentReference', label: 'Referencia', get: (p) => p.paymentReference ?? '' },
    { key: 'paymentReceiptUrl', label: 'Soporte', get: (p) => p.paymentReceiptUrl ?? '' },
    { key: 'notes', label: 'Notas', get: (p) => p.notes ?? '' },
  ], mockDb.payrolls);
}

// ============= REPORTES =============
export function exportReports(): ExportPayload {
  return build('reportes', [
    { key: 'id', label: 'ID', get: (r) => r.id },
    { key: 'classRecordId', label: 'Clase', get: (r) => r.classRecordId },
    { key: 'bookingId', label: 'Reserva', get: (r) => r.bookingId },
    { key: 'teacherId', label: 'Profesor', get: (r) => r.teacherId },
    { key: 'studentId', label: 'Estudiante', get: (r) => r.studentId },
    { key: 'topic', label: 'Tema', get: (r) => r.topic },
    { key: 'progress', label: 'Progreso', get: (r) => r.progress },
    { key: 'homework', label: 'Tarea', get: (r) => r.homework ?? '' },
    { key: 'rating', label: 'Rating', get: (r) => r.rating ?? '' },
    { key: 'submittedAt', label: 'Enviado', get: (r) => r.submittedAt },
  ], mockDb.reports);
}

// ============= MATERIALES =============
export function exportMaterials(): ExportPayload {
  return build('materiales', [
    { key: 'id', label: 'ID', get: (m) => m.id },
    { key: 'classRecordId', label: 'Clase', get: (m) => m.classRecordId },
    { key: 'bookingId', label: 'Reserva', get: (m) => m.bookingId },
    { key: 'title', label: 'Título', get: (m) => m.title },
    { key: 'description', label: 'Descripción', get: (m) => m.description ?? '' },
    { key: 'kind', label: 'Tipo', get: (m) => m.kind },
    { key: 'size', label: 'Tamaño', get: (m) => m.size },
    { key: 'url', label: 'URL', get: (m) => m.url },
    { key: 'teacherId', label: 'Profesor', get: (m) => m.teacherId },
    { key: 'studentId', label: 'Estudiante', get: (m) => m.studentId },
  ], mockDb.materials);
}

// ============= SCREENSHOTS =============
export function exportScreenshots(): ExportPayload {
  return build('screenshots', [
    { key: 'id', label: 'ID', get: (s) => s.id },
    { key: 'classRecordId', label: 'Clase', get: (s) => s.classRecordId },
    { key: 'bookingId', label: 'Reserva', get: (s) => s.bookingId },
    { key: 'url', label: 'URL', get: (s) => s.url },
    { key: 'capturedAt', label: 'Capturado', get: (s) => s.capturedAt },
    { key: 'verified', label: 'Verificado', get: (s) => (s.verified ? 'sí' : 'no') },
    { key: 'teacherId', label: 'Profesor', get: (s) => s.teacherId },
    { key: 'studentId', label: 'Estudiante', get: (s) => s.studentId },
  ], mockDb.screenshots);
}

// ============= REGISTRO =============
export const EXPORT_REGISTRY = {
  clases: (ctx?: SecurityContext | null) => exportClasses(ctx),
  profesores: () => exportTeachers(),
  estudiantes: (ctx?: SecurityContext | null) => exportStudents(ctx),
  pagos: () => exportPayments(),
  liquidaciones: () => exportPayrolls(),
  reportes: () => exportReports(),
  materiales: () => exportMaterials(),
  screenshots: () => exportScreenshots(),
} as const;

export type ExportKey = keyof typeof EXPORT_REGISTRY;

export function exportAll(ctx?: SecurityContext | null): Record<ExportKey, ExportPayload> {
  return {
    clases: exportClasses(ctx),
    profesores: exportTeachers(),
    estudiantes: exportStudents(ctx),
    pagos: exportPayments(),
    liquidaciones: exportPayrolls(),
    reportes: exportReports(),
    materiales: exportMaterials(),
    screenshots: exportScreenshots(),
  };
}

// ============= ENTREGA (stub Fase 1) =============
// Fase 2: reemplazar por expo-file-system + expo-sharing en nativo
// y Blob + URL.createObjectURL en web. La firma no cambia.
export async function persistLocally(payload: ExportPayload): Promise<void> {
  console.log(
    `[Export] ${payload.filename} (${payload.rows} filas, ${payload.content.length} bytes)`,
  );
}
