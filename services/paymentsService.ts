// ============================================================================
// Wordlish · Servicio de pagos.
// Cache + hidratación + suscripción + facade sincrónico sobre
// paymentsCloudRepo (Cloud real). Expone `paymentsRepo` compatible con
// los consumidores legacy (payments repository barrel).
//
// Fallbacks temporales:
//   · Semilla desde `mockData.guardianPaymentsHistory` y
//     `mockData.paymentsHistory` para mantener la demo viva mientras
//     Auth real / Cloud no estén poblados. La semilla se mapea a
//     Payment (dominio) preservando el string original de fecha en
//     `_displayDate` para el helper de UI legacy.
//   · La UI del dashboard sigue consumiendo la lista con la misma
//     forma pública `{ id, concept, amount, date, status, method }` a
//     través de `getGuardianPaymentsHistory()`. Cuando Cloud hidrate,
//     el helper mapea las filas reales a la misma forma sin cambios
//     visuales.
// ============================================================================

import type { Payment, PaymentStatus, PaymentMethod } from '@/types';
import {
  paymentsCloudRepo,
  type PaymentCreateArgs,
  type PaymentUpdatePatch,
} from '@/repositories/payments';
import {
  guardianPaymentsHistory as _seedGuardian,
  paymentsHistory as _seedStudent,
} from './mockData';

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}

function localId(): string {
  return 'pay' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

const METHOD_TO_LABEL: Record<PaymentMethod, string> = {
  card: 'Tarjeta',
  yappy: 'Yappy',
  cuanto: 'Cuanto',
  transfer: 'Transferencia',
  other: 'Otro',
};

const LABEL_TO_METHOD: Record<string, PaymentMethod> = {
  tarjeta: 'card',
  card: 'card',
  yappy: 'yappy',
  cuanto: 'cuanto',
  transferencia: 'transfer',
  transfer: 'transfer',
  otro: 'other',
  other: 'other',
};

function parseMethodLabel(raw: string): PaymentMethod {
  if (!raw) return 'other';
  const key = String(raw).trim().toLowerCase();
  return LABEL_TO_METHOD[key] ?? 'other';
}

export function paymentMethodLabel(m: PaymentMethod): string {
  return METHOD_TO_LABEL[m] ?? 'Otro';
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function formatShortDateEs(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_ES[d.getMonth()] ?? '';
  return `${day} ${mon}`;
}

// ---------------------------------------------------------------------------
// Dominio interno: extendemos Payment con un `_displayDate` opcional
// para preservar el formato original del mock ("01 Jul") sin cambiar el
// tipo público Payment.
// ---------------------------------------------------------------------------
interface InternalPayment extends Payment {
  _displayDate?: string;
}

// ---------------------------------------------------------------------------
// Semilla desde mock.
// ---------------------------------------------------------------------------
function seedFromMock(): InternalPayment[] {
  const nowIso = new Date().toISOString();
  const seed: InternalPayment[] = [];
  _seedGuardian.forEach((m) => {
    seed.push({
      id: m.id,
      studentId: null,
      guardianId: 'g1',
      packageId: null,
      bookingId: null,
      concept: m.concept,
      amount: m.amount,
      currency: 'USD',
      status: m.status as PaymentStatus,
      method: parseMethodLabel(m.method),
      paidAt: m.status === 'paid' ? nowIso : null,
      externalReference: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      _displayDate: m.date,
    });
  });
  _seedStudent.forEach((m) => {
    if (seed.some((s) => s.id === m.id)) return;
    seed.push({
      id: m.id,
      studentId: 's1',
      guardianId: null,
      packageId: null,
      bookingId: null,
      concept: m.concept,
      amount: m.amount,
      currency: 'USD',
      status: m.status as PaymentStatus,
      method: parseMethodLabel(m.method),
      paidAt: m.status === 'paid' ? nowIso : null,
      externalReference: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      _displayDate: m.date,
    });
  });
  return seed;
}

// ---------------------------------------------------------------------------
// Cache + suscripción.
// ---------------------------------------------------------------------------
let cache: InternalPayment[] = seedFromMock();
let hydrated = false;
let inflight: Promise<Payment[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[paymentsService] listener error', err);
    }
  });
}

// ---------------------------------------------------------------------------
// Reads (sync).
// ---------------------------------------------------------------------------
export function getPayments(): Payment[] {
  return cache;
}
export function getPaymentsVersion(): number {
  return version;
}
export function isPaymentsHydrated(): boolean {
  return hydrated;
}
export function getPaymentById(id: string): Payment | undefined {
  return cache.find((p) => p.id === id);
}
export function getPaymentsForStudent(studentId: string): Payment[] {
  return cache.filter((p) => p.studentId === studentId);
}
export function getPaymentsForGuardian(guardianId: string): Payment[] {
  return cache.filter((p) => p.guardianId === guardianId);
}
export function getPaymentsForBooking(bookingId: string): Payment[] {
  return cache.filter((p) => p.bookingId === bookingId);
}
export function subscribePayments(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ---------------------------------------------------------------------------
// Legacy-compat: forma pública consumida hoy por app/(guardian)/payments.tsx
//   { id, concept, amount, date, status, method }
// donde `date` es el string corto ("01 Jul") y `method` la etiqueta ES.
// Cuando Cloud hidrate, `_displayDate` puede estar vacío y usamos
// `paidAt || createdAt` con `formatShortDateEs`.
// ---------------------------------------------------------------------------
export interface LegacyGuardianPaymentEntry {
  id: string;
  concept: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  method: string;
}

function toLegacyDisplay(p: InternalPayment): LegacyGuardianPaymentEntry {
  return {
    id: p.id,
    concept: p.concept,
    amount: p.amount,
    date: p._displayDate ?? formatShortDateEs(p.paidAt ?? p.createdAt),
    status: p.status,
    method: paymentMethodLabel(p.method),
  };
}

export function getGuardianPaymentsHistory(): LegacyGuardianPaymentEntry[] {
  return cache
    .filter((p) => p.guardianId !== null || p.studentId === null)
    .map(toLegacyDisplay);
}

export function getStudentPaymentsHistory(): LegacyGuardianPaymentEntry[] {
  return cache
    .filter((p) => p.studentId !== null)
    .map(toLegacyDisplay);
}

// ---------------------------------------------------------------------------
// Hydration (Cloud).
// ---------------------------------------------------------------------------
export function hydratePayments(force = false): Promise<Payment[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const list = await paymentsCloudRepo.list();
    if (list.length > 0) {
      cache = list.map((p) => ({ ...p }));
    }
    hydrated = true;
    notify();
    inflight = null;
    return cache;
  })();
  return inflight;
}

// ---------------------------------------------------------------------------
// Facade sincrónico backward-compatible con el antiguo paymentsRepo.
//
// insert/update aplican al cache inmediatamente y disparan la
// persistencia Cloud en background (fire-and-forget). Si Cloud falla:
//   · insert → se conserva el registro local (rollback no aplica: el
//               usuario ya lo vio confirmado en pantalla) y se loguea.
//   · update → se revierte el patch si el id era UUID (existía en Cloud).
// ---------------------------------------------------------------------------
export const paymentsRepo = {
  listAll(): Payment[] {
    return cache;
  },
  listForStudent(studentId: string): Payment[] {
    return getPaymentsForStudent(studentId);
  },
  listForGuardian(guardianId: string): Payment[] {
    return getPaymentsForGuardian(guardianId);
  },
  listForBooking(bookingId: string): Payment[] {
    return getPaymentsForBooking(bookingId);
  },
  findById(id: string): Payment | undefined {
    return getPaymentById(id);
  },

  create(p: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Payment {
    const nowIso = new Date().toISOString();
    const created: InternalPayment = {
      ...p,
      id: localId(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    cache = [created, ...cache];
    notify();

    const canPersist =
      isUuid(p.guardianId ?? undefined) ||
      isUuid(p.studentId ?? undefined) ||
      isUuid(p.bookingId ?? undefined);

    if (canPersist) {
      const cloudArgs: PaymentCreateArgs = {
        studentId: p.studentId,
        guardianId: p.guardianId,
        packageId: p.packageId,
        bookingId: p.bookingId,
        concept: p.concept,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        method: p.method,
        paidAt: p.paidAt,
        externalReference: p.externalReference,
      };
      paymentsCloudRepo
        .insert(cloudArgs)
        .then(({ payment, error }) => {
          if (error || !payment) {
            console.warn('[paymentsService.create] Cloud falló:', error);
            return;
          }
          cache = cache.map((x) =>
            x.id === created.id ? { ...payment } : x,
          );
          notify();
        })
        .catch((err) =>
          console.warn('[paymentsService.create] Cloud exception:', err),
        );
    }

    return created;
  },

  update(id: string, patch: Partial<Payment>): Payment | undefined {
    const prev = cache.find((p) => p.id === id);
    if (!prev) return undefined;
    const updated: InternalPayment = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((p) => (p.id === id ? updated : p));
    notify();

    if (isUuid(id)) {
      const cloudPatch: PaymentUpdatePatch = {};
      if (patch.status !== undefined) cloudPatch.status = patch.status;
      if (patch.method !== undefined) cloudPatch.method = patch.method;
      if (patch.paidAt !== undefined) cloudPatch.paidAt = patch.paidAt;
      if (patch.amount !== undefined) cloudPatch.amount = patch.amount;
      if (patch.concept !== undefined) cloudPatch.concept = patch.concept;
      if (patch.externalReference !== undefined)
        cloudPatch.externalReference = patch.externalReference;
      if (Object.keys(cloudPatch).length > 0) {
        paymentsCloudRepo
          .update(id, cloudPatch)
          .then(({ payment, error }) => {
            if (error) {
              console.warn(
                '[paymentsService.update] Cloud falló, revierte cache:',
                error,
              );
              cache = cache.map((p) => (p.id === id ? prev : p));
              notify();
              return;
            }
            if (payment) {
              cache = cache.map((p) =>
                p.id === id ? { ...payment } : p,
              );
              notify();
            }
          })
          .catch((err) =>
            console.warn('[paymentsService.update] Cloud exception:', err),
          );
      }
    }

    return updated;
  },

  markStatus(
    id: string,
    status: PaymentStatus,
    paidAt?: string,
  ): Payment | undefined {
    return this.update(id, {
      status,
      paidAt:
        status === 'paid' ? (paidAt ?? new Date().toISOString()) : null,
    } as Partial<Payment>);
  },
};

// ---------------------------------------------------------------------------
// Utilities.
// ---------------------------------------------------------------------------
export function resetPaymentsCache(): void {
  cache = seedFromMock();
  hydrated = false;
  inflight = null;
  notify();
}
