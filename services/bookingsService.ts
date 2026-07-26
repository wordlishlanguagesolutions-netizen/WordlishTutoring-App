// ============================================================================
// Wordlish · Servicio de reservas.
// Cache + hidratación + suscripción + facade sincrónico sobre
// bookingsCloudRepo (Cloud real). Expone `bookingsRepo` compatible con los
// consumidores legacy que importan desde `@/repositories`.
//
// Fallbacks temporales:
//   · Semilla desde `mockDb.bookings` al iniciar para mantener la demo
//     mock viva mientras Auth real / Cloud no estén poblados.
//   · Los sub-módulos aún en mock (packagesRepo, classRecordsRepo,
//     mockDb.students/guardians) siguen consultándose desde el context.
// ============================================================================

import type { Booking } from '@/types';
import {
  bookingsCloudRepo,
  bookingHoldsCloudRepo,
  type BookingCreateArgs,
  type BookingUpdatePatch,
} from '@/repositories/bookings';
import { mockDb } from './mockDb';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}

function localId(): string {
  return 'bk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ---------------------------------------------------------------------------
// Cache + suscripción.
// ---------------------------------------------------------------------------
let cache: Booking[] = [...mockDb.bookings];
let hydrated = false;
let inflight: Promise<Booking[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[bookingsService] listener error', err);
    }
  });
}

// ---------------------------------------------------------------------------
// Reads (sync).
// ---------------------------------------------------------------------------
export function getBookings(): Booking[] {
  return cache;
}
export function getBookingsVersion(): number {
  return version;
}
export function isBookingsHydrated(): boolean {
  return hydrated;
}
export function getBookingById(id: string): Booking | undefined {
  return cache.find((b) => b.id === id);
}
export function getBookingsForStudent(studentId: string): Booking[] {
  return cache.filter((b) => b.studentId === studentId);
}
export function getBookingsForTeacher(teacherId: string): Booking[] {
  return cache.filter((b) => b.teacherId === teacherId);
}
export function getBookingsForStudentIds(ids: string[]): Booking[] {
  const set = new Set(ids);
  return cache.filter((b) => set.has(b.studentId));
}
export function getBookingsByDate(date: string): Booking[] {
  return cache.filter((b) => b.date === date);
}
export function subscribeBookings(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ---------------------------------------------------------------------------
// Hydration (Cloud).
// ---------------------------------------------------------------------------
export function hydrateBookings(force = false): Promise<Booking[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const list = await bookingsCloudRepo.list();
    if (list.length > 0) {
      cache = list;
    }
    hydrated = true;
    notify();
    inflight = null;
    return cache;
  })();
  return inflight;
}

// ---------------------------------------------------------------------------
// Facade sincrónico (backward-compatible con el antiguo bookingsRepo).
//
// insert/update aplican al cache inmediatamente y disparan la persistencia
// Cloud en background (fire-and-forget). Si Cloud falla:
//   · insert → se conserva el registro local (rollback no aplica: el
//               usuario ya lo vio confirmado en pantalla) y se loguea.
//   · update → se revierte el patch si el id era UUID (existía en Cloud).
// ---------------------------------------------------------------------------
export const bookingsRepo = {
  listAll(): Booking[] {
    return cache;
  },
  listForStudent(studentId: string): Booking[] {
    return getBookingsForStudent(studentId);
  },
  listForTeacher(teacherId: string): Booking[] {
    return getBookingsForTeacher(teacherId);
  },
  listForGuardian(studentIds: string[]): Booking[] {
    return getBookingsForStudentIds(studentIds);
  },
  findById(id: string): Booking | undefined {
    return getBookingById(id);
  },

  insert(args: Omit<Booking, 'id'>): Booking {
    const nowIso = new Date().toISOString();
    const created: Booking = {
      ...args,
      id: localId(),
      createdAt: args.createdAt || nowIso,
      updatedAt: args.updatedAt || nowIso,
    };
    cache = [...cache, created];
    notify();

    // Solo intentamos Cloud si los ids son UUIDs reales.
    if (isUuid(args.studentId) && isUuid(args.teacherId)) {
      const cloudArgs: BookingCreateArgs = {
        studentId: args.studentId,
        studentName: args.studentName,
        studentAvatar: args.studentAvatar,
        teacherId: args.teacherId,
        teacherName: args.teacherName,
        teacherAvatar: args.teacherAvatar,
        subject: args.subject,
        date: args.date,
        time: args.time,
        durationMin: args.durationMin,
        status: args.status,
        zoomUrl: args.zoomUrl,
        hourConsumed: args.hourConsumed,
        packageId: args.packageId ?? null,
        guardianId: args.guardianId ?? null,
        classRecordId: args.classRecordId ?? null,
        createdBy: args.createdBy,
      };
      bookingsCloudRepo
        .insert(cloudArgs)
        .then(({ booking, error }) => {
          if (error || !booking) {
            console.warn('[bookingsService.insert] Cloud falló:', error);
            return;
          }
          cache = cache.map((b) => (b.id === created.id ? booking : b));
          notify();
        })
        .catch((err) =>
          console.warn('[bookingsService.insert] Cloud exception:', err),
        );
    }

    return created;
  },

  update(id: string, patch: Partial<Booking>): Booking | undefined {
    const prev = cache.find((b) => b.id === id);
    if (!prev) return undefined;
    const updated: Booking = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((b) => (b.id === id ? updated : b));
    notify();

    if (isUuid(id)) {
      const cloudPatch: BookingUpdatePatch = {};
      if (patch.status !== undefined) cloudPatch.status = patch.status;
      if (patch.hourConsumed !== undefined) cloudPatch.hourConsumed = patch.hourConsumed;
      if (patch.date !== undefined) cloudPatch.date = patch.date;
      if (patch.time !== undefined) cloudPatch.time = patch.time;
      if (patch.classRecordId !== undefined) cloudPatch.classRecordId = patch.classRecordId;
      if (patch.substituteId !== undefined) cloudPatch.substituteId = patch.substituteId;
      if (patch.zoomUrl !== undefined) cloudPatch.zoomUrl = patch.zoomUrl;
      if (Object.keys(cloudPatch).length > 0) {
        bookingsCloudRepo
          .update(id, cloudPatch)
          .then(({ booking, error }) => {
            if (error) {
              console.warn(
                '[bookingsService.update] Cloud falló, revierte cache:',
                error,
              );
              cache = cache.map((b) => (b.id === id ? prev : b));
              notify();
              return;
            }
            if (booking) {
              cache = cache.map((b) => (b.id === id ? booking : b));
              notify();
            }
          })
          .catch((err) =>
            console.warn('[bookingsService.update] Cloud exception:', err),
          );
      }
    }

    return updated;
  },
};

// ---------------------------------------------------------------------------
// Booking holds Cloud (best-effort desde el context).
// ---------------------------------------------------------------------------
export async function persistHoldToCloud(args: {
  teacherId: string;
  studentId?: string | null;
  userId: string;
  date: string;
  time: string;
  expiresAt: Date;
}): Promise<string | null> {
  if (!isUuid(args.teacherId) || !isUuid(args.userId)) {
    return null;
  }
  const { id } = await bookingHoldsCloudRepo.insertHold(args);
  return id;
}

export async function releaseHoldInCloud(cloudId: string): Promise<void> {
  if (!isUuid(cloudId)) return;
  await bookingHoldsCloudRepo.releaseHold(cloudId);
}

// ---------------------------------------------------------------------------
// Utilities.
// ---------------------------------------------------------------------------
export function resetBookingsCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
