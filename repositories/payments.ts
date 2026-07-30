// ============================================================================
// Wordlish · Repositorio de pagos (Cloud real) — Módulo #13 migrado.
//
// Capa async pura sobre `public.payments`. El facade sincrónico
// (`paymentsRepo`) para consumidores legacy vive en
// `services/paymentsService.ts` y comparte cache.
//
// Convenciones:
//   · `method` se persiste con el enum PaymentMethod (card|yappy|cuanto|
//     transfer|other). Las pantallas antiguas exhiben una etiqueta en
//     español (Tarjeta, Yappy, Cuanto, Transferencia, Otro) que se
//     resuelve con `paymentMethodLabel()` en el service facade.
//   · `paidAt` sólo se setea cuando el estado pasa a 'paid'.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { Payment, PaymentStatus, PaymentMethod } from '@/types';

// ---------------------------------------------------------------------------
// Row mapping.
// ---------------------------------------------------------------------------
interface DbPaymentRow {
  id: string;
  student_id: string | null;
  guardian_id: string | null;
  package_id: string | null;
  booking_id: string | null;
  concept: string;
  amount: number | string;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  paid_at: string | null;
  external_reference: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

const SELECT_COLS =
  'id, student_id, guardian_id, package_id, booking_id, concept, amount, currency, status, method, paid_at, external_reference, receipt_url, created_at, updated_at, created_by, updated_by';

function toModel(row: DbPaymentRow): Payment {
  const amount =
    typeof row.amount === 'string' ? Number(row.amount) : row.amount;
  return {
    id: row.id,
    studentId: row.student_id,
    guardianId: row.guardian_id,
    packageId: row.package_id,
    bookingId: row.booking_id,
    concept: row.concept,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: row.currency ?? 'USD',
    status: row.status,
    method: row.method,
    paidAt: row.paid_at,
    externalReference: row.external_reference,
    receiptUrl: row.receipt_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Args tipados.
// ---------------------------------------------------------------------------
export interface PaymentCreateArgs {
  studentId?: string | null;
  guardianId?: string | null;
  packageId?: string | null;
  bookingId?: string | null;
  concept: string;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  method: PaymentMethod;
  paidAt?: string | null;
  externalReference?: string | null;
  receiptUrl?: string | null;
  createdBy?: string | null;
}

export interface PaymentUpdatePatch {
  status?: PaymentStatus;
  method?: PaymentMethod;
  paidAt?: string | null;
  amount?: number;
  concept?: string;
  externalReference?: string | null;
  receiptUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Cloud async API.
// ---------------------------------------------------------------------------
export const paymentsCloudRepo = {
  async list(): Promise<Payment[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('payments')
        .select(SELECT_COLS)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[paymentsCloudRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbPaymentRow));
    } catch (err) {
      console.warn('[paymentsCloudRepo.list] exception', err);
      return [];
    }
  },

  async listForStudent(studentId: string): Promise<Payment[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('payments')
        .select(SELECT_COLS)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[paymentsCloudRepo.listForStudent] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbPaymentRow));
    } catch (err) {
      console.warn('[paymentsCloudRepo.listForStudent] exception', err);
      return [];
    }
  },

  async listForGuardian(guardianId: string): Promise<Payment[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('payments')
        .select(SELECT_COLS)
        .eq('guardian_id', guardianId)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[paymentsCloudRepo.listForGuardian] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbPaymentRow));
    } catch (err) {
      console.warn('[paymentsCloudRepo.listForGuardian] exception', err);
      return [];
    }
  },

  async listForBooking(bookingId: string): Promise<Payment[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('payments')
        .select(SELECT_COLS)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[paymentsCloudRepo.listForBooking] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbPaymentRow));
    } catch (err) {
      console.warn('[paymentsCloudRepo.listForBooking] exception', err);
      return [];
    }
  },

  async getById(id: string): Promise<Payment | null> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('payments')
        .select(SELECT_COLS)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('[paymentsCloudRepo.getById] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbPaymentRow) : null;
    } catch (err) {
      console.warn('[paymentsCloudRepo.getById] exception', err);
      return null;
    }
  },

  async insert(
    args: PaymentCreateArgs,
  ): Promise<{ payment: Payment | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const payload: Record<string, unknown> = {
        student_id: args.studentId ?? null,
        guardian_id: args.guardianId ?? null,
        package_id: args.packageId ?? null,
        booking_id: args.bookingId ?? null,
        concept: args.concept,
        amount: args.amount,
        currency: args.currency ?? 'USD',
        status: args.status,
        method: args.method,
        paid_at:
          args.paidAt ?? (args.status === 'paid' ? new Date().toISOString() : null),
        external_reference: args.externalReference ?? null,
        receipt_url: args.receiptUrl ?? null,
        created_by: args.createdBy ?? null,
      };
      const { data, error } = await sb
        .from('payments')
        .insert(payload)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[paymentsCloudRepo.insert] error', error.message);
        return { payment: null, error: error.message };
      }
      return { payment: toModel(data as unknown as DbPaymentRow) };
    } catch (err: any) {
      console.warn('[paymentsCloudRepo.insert] exception', err);
      return { payment: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async update(
    id: string,
    patch: PaymentUpdatePatch,
  ): Promise<{ payment: Payment | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const dbPatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (patch.status !== undefined) {
        dbPatch.status = patch.status;
        if (patch.status === 'paid' && patch.paidAt === undefined) {
          dbPatch.paid_at = new Date().toISOString();
        }
      }
      if (patch.method !== undefined) dbPatch.method = patch.method;
      if (patch.paidAt !== undefined) dbPatch.paid_at = patch.paidAt;
      if (patch.amount !== undefined) dbPatch.amount = patch.amount;
      if (patch.concept !== undefined) dbPatch.concept = patch.concept;
      if (patch.externalReference !== undefined)
        dbPatch.external_reference = patch.externalReference;
      if (patch.receiptUrl !== undefined) dbPatch.receipt_url = patch.receiptUrl;
      const { data, error } = await sb
        .from('payments')
        .update(dbPatch)
        .eq('id', id)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[paymentsCloudRepo.update] error', error.message);
        return { payment: null, error: error.message };
      }
      return { payment: toModel(data as unknown as DbPaymentRow) };
    } catch (err: any) {
      console.warn('[paymentsCloudRepo.update] exception', err);
      return { payment: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async markStatus(
    id: string,
    status: PaymentStatus,
    paidAt?: string,
  ): Promise<{ payment: Payment | null; error?: string }> {
    return this.update(id, {
      status,
      paidAt:
        status === 'paid' ? (paidAt ?? new Date().toISOString()) : null,
    });
  },
};
