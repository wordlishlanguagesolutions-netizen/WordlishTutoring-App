// ============================================================================
// Wordlish · Servicio de reportes.
// Cache + hidratación + suscripción + facade sincrónico sobre
// reportsCloudRepo (Cloud real). Expone `reportsRepo` compatible con
// consumidores legacy (classService, useClassManager).
//
// Ciclo de vida: draft -> sent -> read -> confirmed.
// ============================================================================

import type { Report, ReportStatus } from '@/types';
import {
  reportsCloudRepo,
  type ReportCreateArgs,
} from '@/repositories/reports';
import { classRecordsRepo } from './classRecordsService';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}

function localId(): string {
  return 'rep' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

let cache: Report[] = [];
let hydrated = false;
let inflight: Promise<Report[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[reportsService] listener error', err);
    }
  });
}

export function getReports(): Report[] {
  return cache;
}
export function getReportsVersion(): number {
  return version;
}
export function isReportsHydrated(): boolean {
  return hydrated;
}
export function subscribeReports(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hydrateReports(force = false): Promise<Report[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const list = await reportsCloudRepo.list();
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

type CreateArgs = Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'submittedAt'>;

export const reportsRepo = {
  list(): Report[] {
    return cache;
  },
  findById(id: string): Report | undefined {
    return cache.find((r) => r.id === id);
  },
  listForClass(classRecordId: string): Report[] {
    return cache.filter((r) => r.classRecordId === classRecordId);
  },
  listForStudent(studentId: string): Report[] {
    return cache.filter((r) => r.studentId === studentId);
  },
  listForTeacher(teacherId: string): Report[] {
    return cache.filter((r) => r.teacherId === teacherId);
  },

  createForClass(args: CreateArgs): Report {
    const cr = classRecordsRepo.findById(args.classRecordId);
    if (!cr) throw new Error('No se puede crear un reporte fuera de una clase.');
    const nowIso = new Date().toISOString();
    const r: Report = {
      ...args,
      id: localId(),
      submittedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    cache = [...cache, r];
    notify();
    classRecordsRepo.attachReport(cr.id, r.id);

    if (
      isUuid(args.classRecordId) &&
      isUuid(args.bookingId) &&
      isUuid(args.teacherId) &&
      isUuid(args.studentId)
    ) {
      const cloudArgs: ReportCreateArgs = {
        classRecordId: args.classRecordId,
        bookingId: args.bookingId,
        teacherId: args.teacherId,
        studentId: args.studentId,
        topic: args.topic,
        progress: args.progress,
        objectives: args.objectives,
        strengths: args.strengths,
        improvements: args.improvements,
        homework: args.homework,
        guardianNotes: args.guardianNotes,
        rating: args.rating,
        attachments: args.attachments,
        status: args.status,
      };
      reportsCloudRepo
        .insert(cloudArgs)
        .then(({ report, error }) => {
          if (error || !report) {
            console.warn('[reportsService.createForClass] Cloud falló:', error);
            return;
          }
          cache = cache.map((x) => (x.id === r.id ? report : x));
          notify();
        })
        .catch((err) =>
          console.warn('[reportsService.createForClass] exception:', err),
        );
    }
    return r;
  },

  updateStatus(id: string, status: ReportStatus): Report | undefined {
    const prev = cache.find((r) => r.id === id);
    if (!prev) return undefined;
    const updated: Report = {
      ...prev,
      status,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((r) => (r.id === id ? updated : r));
    notify();
    if (isUuid(id)) {
      reportsCloudRepo
        .update(id, { status })
        .then(({ report, error }) => {
          if (error) {
            console.warn('[reportsService.updateStatus] Cloud falló, revierte:', error);
            cache = cache.map((r) => (r.id === id ? prev : r));
            notify();
            return;
          }
          if (report) {
            cache = cache.map((r) => (r.id === id ? report : r));
            notify();
          }
        })
        .catch((err) =>
          console.warn('[reportsService.updateStatus] exception:', err),
        );
    }
    return updated;
  },

  update(id: string, patch: Partial<CreateArgs>): Report | undefined {
    const prev = cache.find((r) => r.id === id);
    if (!prev) return undefined;
    const updated: Report = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((r) => (r.id === id ? updated : r));
    notify();
    if (isUuid(id)) {
      reportsCloudRepo
        .update(id, patch as any)
        .then(({ report, error }) => {
          if (error) {
            console.warn('[reportsService.update] Cloud falló, revierte:', error);
            cache = cache.map((r) => (r.id === id ? prev : r));
            notify();
            return;
          }
          if (report) {
            cache = cache.map((r) => (r.id === id ? report : r));
            notify();
          }
        })
        .catch((err) =>
          console.warn('[reportsService.update] exception:', err),
        );
    }
    return updated;
  },
};

export function resetReportsCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
