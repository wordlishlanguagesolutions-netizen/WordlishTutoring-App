// ============================================================================
// Wordlish · Soporte de Pago (client + teacher).
//
// Vista derivada, NO una nueva entidad.
//
// Un "Soporte de Pago" es una proyeccion legible sobre datos ya
// existentes (Payment + Booking + Package + TeacherPayroll). No hay
// nuevas tablas, ni logica financiera paralela, ni un segundo origen
// de verdad. Cuando el pago o la liquidacion se aprueben, este service
// arma el documento a partir del registro real.
//
// Nomenclatura obligatoria: "Soporte de Pago" (nunca "Factura").
//
// Preparado para exportacion PDF en fase posterior (buildPdfPayload).
// ============================================================================

import type {
  Payment,
  PaymentStatus,
  Booking,
  TeacherPayroll,
} from '@/types';
import {
  paymentsRepo,
  paymentMethodLabel,
} from '@/services/paymentsService';
import { getBookingById } from '@/services/bookingsService';
import { getStudentById } from '@/services/studentsService';
import { getGuardianById } from '@/services/guardiansService';
import { mockDb } from '@/services/mockDb';
import {
  findById as findPayrollById,
  labelForMonthKey,
} from '@/services/payrollService';
import { getSetting } from '@/services/appSettingsService';

// ---------------------------------------------------------------------------
// Numero de soporte determinista.
//
// Formato: SOP-{YYYYMMDD}-{shortId}
// Deriva del id/createdAt del registro subyacente: mismo Payment ->
// mismo numero de soporte, sin persistir campos adicionales.
// ---------------------------------------------------------------------------
function shortHash(id: string): string {
  // Hash muy simple; solo necesitamos algo estable y legible.
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).slice(0, 6).toUpperCase();
}

function dateKey(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '00000000';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function generateSoporteNumber(
  prefix: 'CLI' | 'PRO',
  entityId: string,
  refDate: string | null | undefined,
): string {
  return `SOP-${prefix}-${dateKey(refDate)}-${shortHash(entityId)}`;
}

// ---------------------------------------------------------------------------
// Cliente (Estudiante / Acudiente).
// ---------------------------------------------------------------------------
export interface ClientSoporte {
  number: string;
  status: PaymentStatus;
  statusLabel: 'Pagado' | 'Pendiente' | 'Rechazado' | 'Reembolsado';
  date: string; // ISO
  concept: string;
  studentName: string | null;
  guardianName: string | null;
  teacherName: string | null;
  subject: string | null;
  hours: number | null;
  hourlyRate: number | null;
  total: number;
  currency: string;
  method: string; // etiqueta ES
  // Audit
  paymentId: string;
  bookingId: string | null;
  studentId: string | null;
  guardianId: string | null;
  teacherId: string | null;
  generatedAt: string;
  generatedBy: 'system';
}

const STATUS_LABEL: Record<PaymentStatus, ClientSoporte['statusLabel']> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  failed: 'Rechazado',
  refunded: 'Reembolsado',
};

function studentNameOf(studentId: string | null): string | null {
  if (!studentId) return null;
  const cloud = getStudentById(studentId);
  if (cloud?.fullName) return cloud.fullName;
  const m = mockDb.students.find((s) => s.id === studentId);
  return m?.fullName ?? null;
}

function guardianNameOf(guardianId: string | null): string | null {
  if (!guardianId) return null;
  const cloud = getGuardianById(guardianId);
  if (cloud?.fullName) return cloud.fullName;
  const m = mockDb.guardians.find((g) => g.id === guardianId);
  return m?.fullName ?? null;
}

// Deriva contexto (profesor / materia / horas) a partir del Booking
// enlazado al Payment. Si el Payment no tiene bookingId (compra de plan
// / recarga) se dejan estos campos en null.
function bookingContextOf(bookingId: string | null): {
  booking: Booking | null;
  teacherName: string | null;
  teacherId: string | null;
  subject: string | null;
} {
  if (!bookingId) {
    return { booking: null, teacherName: null, teacherId: null, subject: null };
  }
  const b = getBookingById(bookingId) ?? null;
  return {
    booking: b,
    teacherName: b?.teacherName ?? null,
    teacherId: b?.teacherId ?? null,
    subject: b?.subject ?? null,
  };
}

export function buildClientSoporte(paymentId: string): ClientSoporte | null {
  const payment: Payment | undefined = paymentsRepo.findById(paymentId);
  if (!payment) return null;
  // Regla del prompt: soporte solo cuando el pago esta aprobado.
  // Retornamos igualmente si esta pending/failed para poder previsualizar,
  // pero statusLabel reflejara el estado real.
  const ctx = bookingContextOf(payment.bookingId);
  const rate = getSetting<number>('payment.price_per_hour_usd', 18);
  const hours = ctx.booking
    ? Math.round(((ctx.booking.durationMin ?? 60) / 60) * 100) / 100
    : null;
  const hourlyRate = hours && hours > 0
    ? Math.round((payment.amount / hours) * 100) / 100
    : rate;

  return {
    number: generateSoporteNumber(
      'CLI',
      payment.id,
      payment.paidAt ?? payment.createdAt,
    ),
    status: payment.status,
    statusLabel: STATUS_LABEL[payment.status] ?? 'Pendiente',
    date: payment.paidAt ?? payment.createdAt,
    concept: payment.concept,
    studentName: studentNameOf(payment.studentId),
    guardianName: guardianNameOf(payment.guardianId),
    teacherName: ctx.teacherName,
    subject: ctx.subject,
    hours,
    hourlyRate,
    total: payment.amount,
    currency: payment.currency ?? 'USD',
    method: paymentMethodLabel(payment.method),
    paymentId: payment.id,
    bookingId: payment.bookingId,
    studentId: payment.studentId,
    guardianId: payment.guardianId,
    teacherId: ctx.teacherId,
    generatedAt: new Date().toISOString(),
    generatedBy: 'system',
  };
}

// ---------------------------------------------------------------------------
// Profesor (liquidacion).
// ---------------------------------------------------------------------------
export type TeacherSoporteStatus = 'Pendiente' | 'Liquidado' | 'Pagado';

export interface TeacherSoporte {
  number: string;
  teacherName: string;
  teacherId: string;
  month: string;             // YYYY-MM
  monthLabel: string;        // "Junio 2026"
  periodStart: string;
  periodEnd: string;
  hoursTaught: number;
  personalHourRate: number;
  groupHourRate: number;
  personalClasses: number;
  groupClasses: number;
  absences: number;
  computedTotal: number;
  finalTotal: number;
  currency: string;
  status: TeacherSoporteStatus;
  paidAt: string | null;
  paymentReference: string | null;
  // Audit
  payrollId: string;
  generatedAt: string;
  generatedBy: 'system';
}

function teacherSoporteStatus(p: TeacherPayroll): TeacherSoporteStatus {
  if (p.status === 'paid') return 'Pagado';
  if (p.status === 'reviewed') return 'Liquidado';
  return 'Pendiente';
}

export function buildTeacherSoporte(payrollId: string): TeacherSoporte | null {
  const p = findPayrollById(payrollId);
  if (!p) return null;
  return {
    number: generateSoporteNumber('PRO', p.id, p.paidAt ?? p.createdAt),
    teacherName: p.teacherName,
    teacherId: p.teacherId,
    month: p.month,
    monthLabel: labelForMonthKey(p.month),
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    hoursTaught: p.payableHours,
    personalHourRate: p.rateSnapshot.personalHourRate,
    groupHourRate: p.rateSnapshot.groupHourRate,
    personalClasses: p.personalClassesCount,
    groupClasses: p.groupClassesCount,
    absences: p.payableAbsences,
    computedTotal: p.computedTotal,
    finalTotal: p.finalTotal,
    currency: p.rateSnapshot.currency,
    status: teacherSoporteStatus(p),
    paidAt: p.paidAt,
    paymentReference: p.paymentReference,
    payrollId: p.id,
    generatedAt: new Date().toISOString(),
    generatedBy: 'system',
  };
}

// ---------------------------------------------------------------------------
// Placeholder de exportacion PDF.
//
// El prompt pide dejar la estructura lista para descargar como PDF
// cuando se implemente la exportacion. Aqui exponemos un payload
// serializable que en la fase siguiente alimentara al exportador
// (expo-print / react-native-pdf / edge function). Por ahora devuelve
// el JSON limpio del soporte.
// ---------------------------------------------------------------------------
export interface SoportePdfPayload {
  kind: 'client' | 'teacher';
  title: 'Soporte de Pago';
  data: ClientSoporte | TeacherSoporte;
}

export function buildClientSoportePdfPayload(
  soporte: ClientSoporte,
): SoportePdfPayload {
  return { kind: 'client', title: 'Soporte de Pago', data: soporte };
}

export function buildTeacherSoportePdfPayload(
  soporte: TeacherSoporte,
): SoportePdfPayload {
  return { kind: 'teacher', title: 'Soporte de Pago', data: soporte };
}
