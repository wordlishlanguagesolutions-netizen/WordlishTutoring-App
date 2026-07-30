// Wordlish · Payroll service (liquidación mensual de profesores)
// Sin React ni JSX. Toda pantalla debe consumir estas funciones,
// no reimplementar reglas de cálculo ni transiciones de estado.
//
// Reglas duras (viven aquí, no en la UI):
//  - Periodo: día 1 al último día del mes (UTC).
//  - Ventana de revisión: día 1 al 5 del mes siguiente.
//  - Máquina de estados: draft → reviewed → paid.
//      reviewed → draft permitido (corrección administrativa).
//      paid es terminal.
//  - Una liquidación pagada NO se puede editar (ajustes/notas/recompute).
//  - Al marcar pagada se emite notificación interna al profesor.
//  - Tarifas se congelan en rateSnapshot al crear el borrador.

import type {
  ClassRecord,
  PayrollStatus,
  TeacherPayroll,
  TeacherPayrollAdjustment,
  TeacherRate,
} from '@/types';
import { makeId, mockDb } from './mockDb';
import { createNotification } from './notificationService';

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ============= PERIODO Y VENTANA =============
export interface PayrollPeriod {
  monthKey: string;
  monthLabel: string;
  periodStart: string;
  periodEnd: string;
}

export function periodForMonth(monthKey: string): PayrollPeriod {
  const [y, m] = monthKey.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return {
    monthKey,
    monthLabel: `${MONTH_NAMES_ES[m - 1]} ${y}`,
    periodStart: start.toISOString().split('T')[0],
    periodEnd: end.toISOString().split('T')[0],
  };
}

export function monthKeyOf(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

export function previousMonthKey(reference?: Date | string): string {
  const base =
    reference == null
      ? new Date()
      : typeof reference === 'string'
        ? new Date(reference + (reference.length === 7 ? '-01T00:00:00Z' : ''))
        : reference;
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const prev = new Date(Date.UTC(y, m - 1, 1));
  return `${prev.getUTCFullYear()}-${(prev.getUTCMonth() + 1).toString().padStart(2, '0')}`;
}

export function reviewWindowForMonth(monthKey: string): { opens: string; closes: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const opens = new Date(Date.UTC(nextYear, nextMonth - 1, 1))
    .toISOString().split('T')[0];
  const closes = new Date(Date.UTC(nextYear, nextMonth - 1, 5))
    .toISOString().split('T')[0];
  return { opens, closes };
}

export function isWithinReviewWindow(monthKey: string, now: Date = new Date()): boolean {
  const { opens, closes } = reviewWindowForMonth(monthKey);
  const today = now.toISOString().split('T')[0];
  return today >= opens && today <= closes;
}

export function labelForMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES_ES[m - 1]} ${y}`;
}

// ============= TARIFAS =============
export function getActiveRate(teacherId: string, atDate: string): TeacherRate | null {
  const rates = mockDb.teacherRates.filter(
    (r) => r.teacherId === teacherId && r.active && r.effectiveFrom <= atDate,
  );
  if (rates.length === 0) return null;
  return rates
    .slice()
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

// ============= CÁLCULO =============
// Estados de ClassRecord donde el profesor cumplió su parte
// (se le paga incluso si hubo issues externos).
const PAID_CLASS_STATES: ClassRecord['status'][] = [
  'ok',
  'completed',
  'in_progress',
  'no_screenshot',
  'no_camera',
  'technical',
  'student_late',
];

export interface PayrollComputation {
  personalClassesCount: number;
  groupClassesCount: number;
  payableHours: number;
  payableAbsences: number;
  cancellations: number;
  rateSnapshot: TeacherPayroll['rateSnapshot'];
  computedTotal: number;
}

export function computePayrollDataForTeacher(
  teacherId: string,
  monthKey: string,
): PayrollComputation {
  const { periodStart, periodEnd } = periodForMonth(monthKey);
  const classRecords = mockDb.classRecords.filter(
    (cr) =>
      cr.teacherId === teacherId &&
      cr.date >= periodStart &&
      cr.date <= periodEnd,
  );

  let personalClassesCount = 0;
  let groupClassesCount = 0;
  let payableHours = 0;
  let payableAbsences = 0;
  let cancellations = 0;

  classRecords.forEach((cr) => {
    const kind = cr.kind ?? 'personal';
    if (cr.status === 'cancelled') {
      cancellations += 1;
      return;
    }
    if (cr.status === 'student_absent') {
      payableAbsences += 1;
      if (kind === 'personal') personalClassesCount += 1;
      else groupClassesCount += 1;
      return;
    }
    if (PAID_CLASS_STATES.includes(cr.status)) {
      if (kind === 'personal') personalClassesCount += 1;
      else groupClassesCount += 1;
      payableHours += 1; // 1h por sesión (default hasta soportar duraciones variables)
    }
  });

  const rate = getActiveRate(teacherId, periodEnd);
  const rateSnapshot: TeacherPayroll['rateSnapshot'] = rate
    ? {
        personalHourRate: rate.personalHourRate,
        groupHourRate: rate.groupHourRate,
        absencePayRate: rate.absencePayRate,
        currency: rate.currency,
      }
    : {
        personalHourRate: 0,
        groupHourRate: 0,
        absencePayRate: 0,
        currency: 'USD',
      };

  const computedTotal = round2(
    personalClassesCount * rateSnapshot.personalHourRate +
      groupClassesCount * rateSnapshot.groupHourRate +
      payableAbsences * rateSnapshot.absencePayRate,
  );

  return {
    personalClassesCount,
    groupClassesCount,
    payableHours,
    payableAbsences,
    cancellations,
    rateSnapshot,
    computedTotal,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumAdjustments(items: TeacherPayrollAdjustment[]): number {
  return items.reduce((s, a) => s + a.amount, 0);
}

function computeFinalTotal(computedTotal: number, items: TeacherPayrollAdjustment[]): number {
  return round2(computedTotal + sumAdjustments(items));
}

// ============= LECTURA =============
export function findById(payrollId: string): TeacherPayroll | undefined {
  return mockDb.payrolls.find((x) => x.id === payrollId);
}

export function findPayroll(teacherId: string, monthKey: string): TeacherPayroll | undefined {
  return mockDb.payrolls.find((p) => p.teacherId === teacherId && p.month === monthKey);
}

export function listPayrollsForTeacher(teacherId: string): TeacherPayroll[] {
  return mockDb.payrolls.filter((p) => p.teacherId === teacherId);
}

export function listPayrollsByStatus(status: PayrollStatus): TeacherPayroll[] {
  return mockDb.payrolls.filter((p) => p.status === status);
}

export function listPayrollsByMonth(monthKey: string): TeacherPayroll[] {
  return mockDb.payrolls.filter((p) => p.month === monthKey);
}

// ============= ESCRITURA =============
export interface OpenDraftArgs {
  teacherId: string;
  monthKey: string;
  actorUserId: string;
}

export function openOrCreateDraft(args: OpenDraftArgs): TeacherPayroll {
  const existing = findPayroll(args.teacherId, args.monthKey);
  if (existing) return existing;

  const { periodStart, periodEnd } = periodForMonth(args.monthKey);
  const teacher = mockDb.teachers.find((t) => t.id === args.teacherId);
  const comp = computePayrollDataForTeacher(args.teacherId, args.monthKey);

  const nowIso = new Date().toISOString();
  const draft: TeacherPayroll = {
    id: makeId('pr'),
    teacherId: args.teacherId,
    teacherName: teacher?.fullName ?? 'Profesor',
    month: args.monthKey,
    periodStart,
    periodEnd,
    personalClassesCount: comp.personalClassesCount,
    groupClassesCount: comp.groupClassesCount,
    payableHours: comp.payableHours,
    payableAbsences: comp.payableAbsences,
    cancellations: comp.cancellations,
    rateSnapshot: comp.rateSnapshot,
    computedTotal: comp.computedTotal,
    adjustments: [],
    finalTotal: comp.computedTotal,
    status: 'draft',
    reviewedAt: null,
    reviewedBy: null,
    paidAt: null,
    paidBy: null,
    paymentReceiptUrl: null,
    paymentReference: null,
    notes: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  mockDb.payrolls.push(draft);

  // Notifica al admin actor que el borrador está listo (opcional).
  createNotification({
    userId: args.actorUserId,
    type: 'payroll_ready',
    message: `Borrador ${labelForMonthKey(args.monthKey)} · ${draft.teacherName} · ${draft.rateSnapshot.currency} ${draft.finalTotal.toFixed(2)}`,
    refType: 'payroll',
    refId: draft.id,
  });

  return draft;
}

export function recomputePayroll(payrollId: string): TeacherPayroll {
  const p = mustFind(payrollId);
  if (p.status === 'paid') {
    throw new Error('No se puede recalcular una liquidación pagada.');
  }
  const comp = computePayrollDataForTeacher(p.teacherId, p.month);
  p.personalClassesCount = comp.personalClassesCount;
  p.groupClassesCount = comp.groupClassesCount;
  p.payableHours = comp.payableHours;
  p.payableAbsences = comp.payableAbsences;
  p.cancellations = comp.cancellations;
  p.rateSnapshot = comp.rateSnapshot;
  p.computedTotal = comp.computedTotal;
  p.finalTotal = computeFinalTotal(p.computedTotal, p.adjustments);
  p.updatedAt = new Date().toISOString();
  return p;
}

export function addAdjustment(
  payrollId: string,
  input: Omit<TeacherPayrollAdjustment, 'id' | 'createdAt'>,
): TeacherPayroll {
  const p = mustFind(payrollId);
  if (p.status === 'paid') {
    throw new Error('No se pueden agregar ajustes a una liquidación pagada.');
  }
  const adj: TeacherPayrollAdjustment = {
    ...input,
    id: makeId('adj'),
    createdAt: new Date().toISOString(),
  };
  p.adjustments = [...p.adjustments, adj];
  p.finalTotal = computeFinalTotal(p.computedTotal, p.adjustments);
  p.updatedAt = adj.createdAt;
  return p;
}

export function removeAdjustment(payrollId: string, adjustmentId: string): TeacherPayroll {
  const p = mustFind(payrollId);
  if (p.status === 'paid') {
    throw new Error('No se pueden quitar ajustes a una liquidación pagada.');
  }
  p.adjustments = p.adjustments.filter((a) => a.id !== adjustmentId);
  p.finalTotal = computeFinalTotal(p.computedTotal, p.adjustments);
  p.updatedAt = new Date().toISOString();
  return p;
}

export function updateNotes(payrollId: string, notes: string | null): TeacherPayroll {
  const p = mustFind(payrollId);
  if (p.status === 'paid') {
    throw new Error('No se pueden editar notas de una liquidación pagada.');
  }
  p.notes = notes;
  p.updatedAt = new Date().toISOString();
  return p;
}

// ============= MÁQUINA DE ESTADOS =============
const ALLOWED_TRANSITIONS: Record<PayrollStatus, PayrollStatus[]> = {
  draft: ['reviewed'],
  reviewed: ['paid', 'draft'],
  paid: [],
};

export function canTransition(current: PayrollStatus, next: PayrollStatus): boolean {
  return (ALLOWED_TRANSITIONS[current] ?? []).includes(next);
}

export function markReviewed(payrollId: string, actorUserId: string): TeacherPayroll {
  const p = mustFind(payrollId);
  if (!canTransition(p.status, 'reviewed')) {
    throw new Error('Solo se puede revisar una liquidación en borrador.');
  }
  const nowIso = new Date().toISOString();
  p.status = 'reviewed';
  p.reviewedAt = nowIso;
  p.reviewedBy = actorUserId;
  p.updatedAt = nowIso;
  return p;
}

export function revertToDraft(payrollId: string): TeacherPayroll {
  const p = mustFind(payrollId);
  if (!canTransition(p.status, 'draft')) {
    throw new Error('Solo se puede devolver a borrador una liquidación revisada.');
  }
  const nowIso = new Date().toISOString();
  p.status = 'draft';
  p.reviewedAt = null;
  p.reviewedBy = null;
  p.updatedAt = nowIso;
  return p;
}

export interface MarkPaidArgs {
  actorUserId: string;
  paidAt?: string;
  paymentReceiptUrl?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
}

export function markPaid(payrollId: string, args: MarkPaidArgs): TeacherPayroll {
  const p = mustFind(payrollId);
  if (!canTransition(p.status, 'paid')) {
    throw new Error('Solo se puede pagar una liquidación revisada.');
  }
  const nowIso = new Date().toISOString();
  p.status = 'paid';
  p.paidAt = args.paidAt ?? nowIso;
  p.paidBy = args.actorUserId;
  p.paymentReceiptUrl = args.paymentReceiptUrl ?? null;
  p.paymentReference = args.paymentReference ?? null;
  if (args.notes !== undefined) p.notes = args.notes;
  p.updatedAt = nowIso;

  // Notificación interna al profesor con acceso al resumen y soporte.
  const teacher = mockDb.teachers.find((t) => t.id === p.teacherId);
  const teacherUserId = teacher?.userId ?? null;
  if (teacherUserId) {
    createNotification({
      userId: teacherUserId,
      type: 'payroll_paid',
      message: `Se registró tu pago de ${labelForMonthKey(p.month)} · ${p.rateSnapshot.currency} ${p.finalTotal.toFixed(2)}`,
      refType: 'payroll',
      refId: p.id,
      actionRoute: '/(teacher)/profile',
      actionLabel: 'Ver resumen',
    });
    // Soporte de Pago disponible (Profesor). Se deriva del payroll
    // via `soporteService.buildTeacherSoporte`. No hay nueva entidad;
    // solo emitimos la notificacion informativa (categoria 'info' -> se
    // marca auto-leida) para que el profesor sepa que ya puede
    // descargarlo desde su perfil.
    createNotification({
      userId: teacherUserId,
      type: 'payroll_paid',
      title: 'Soporte de Pago disponible',
      message: `Tu Soporte de Pago de ${labelForMonthKey(p.month)} ya esta disponible.`,
      refType: 'payroll',
      refId: p.id,
      actionRoute: '/(teacher)/profile',
      actionLabel: 'Descargar soporte',
    });
  }
  return p;
}

// ============= RESUMEN AGREGADO =============
export interface PayrollSummary {
  payroll: TeacherPayroll;
  period: PayrollPeriod;
  reviewWindow: { opens: string; closes: string };
  hasReceipt: boolean;
  isPaid: boolean;
  canReview: boolean;
  canPay: boolean;
  canRevert: boolean;
  canEdit: boolean;
}

export function summaryOf(payrollId: string): PayrollSummary | null {
  const p = findById(payrollId);
  if (!p) return null;
  return {
    payroll: p,
    period: periodForMonth(p.month),
    reviewWindow: reviewWindowForMonth(p.month),
    hasReceipt: !!p.paymentReceiptUrl,
    isPaid: p.status === 'paid',
    canReview: p.status === 'draft',
    canPay: p.status === 'reviewed',
    canRevert: p.status === 'reviewed',
    canEdit: p.status !== 'paid',
  };
}

function mustFind(payrollId: string): TeacherPayroll {
  const p = findById(payrollId);
  if (!p) throw new Error('Liquidación no encontrada.');
  return p;
}
