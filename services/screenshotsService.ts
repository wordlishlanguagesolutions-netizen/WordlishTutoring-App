// ============================================================================
// Wordlish · Servicio de screenshots.
// Cache + hidratación + suscripción + facade sincrónico sobre
// screenshotsCloudRepo (Cloud real). Expone `screenshotsRepo` compatible
// con consumidores legacy (classService, useClassManager).
//
// Placeholder: `url` (storage_path) queda como URL mock mientras no exista
// upload real a Storage; toda la lógica de asociación con ClassRecord y
// persistencia de metadata funciona contra Cloud.
// ============================================================================

import type { Screenshot } from '@/types';
import {
  screenshotsCloudRepo,
  type ScreenshotCreateArgs,
} from '@/repositories/screenshots';
import { classRecordsRepo } from './classRecordsService';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}

function localId(): string {
  return 'scr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

let cache: Screenshot[] = [];
let hydrated = false;
let inflight: Promise<Screenshot[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[screenshotsService] listener error', err);
    }
  });
}

export function getScreenshots(): Screenshot[] {
  return cache;
}
export function getScreenshotsVersion(): number {
  return version;
}
export function isScreenshotsHydrated(): boolean {
  return hydrated;
}
export function subscribeScreenshots(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hydrateScreenshots(force = false): Promise<Screenshot[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const list = await screenshotsCloudRepo.list();
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

type CreateArgs = Omit<
  Screenshot,
  'id' | 'createdAt' | 'updatedAt' | 'capturedAt' | 'verified'
>;

export const screenshotsRepo = {
  list(): Screenshot[] {
    return cache;
  },
  findById(id: string): Screenshot | undefined {
    return cache.find((s) => s.id === id);
  },
  listForClass(classRecordId: string): Screenshot[] {
    return cache.filter((s) => s.classRecordId === classRecordId);
  },

  createForClass(args: CreateArgs): Screenshot {
    const cr = classRecordsRepo.findById(args.classRecordId);
    if (!cr) throw new Error('No se puede crear screenshot fuera de una clase.');
    const nowIso = new Date().toISOString();
    const s: Screenshot = {
      ...args,
      id: localId(),
      capturedAt: nowIso,
      verified: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    cache = [...cache, s];
    notify();
    classRecordsRepo.attachScreenshot(cr.id, s.id);

    if (
      isUuid(args.classRecordId) &&
      isUuid(args.bookingId) &&
      isUuid(args.teacherId) &&
      isUuid(args.studentId)
    ) {
      const cloudArgs: ScreenshotCreateArgs = {
        classRecordId: args.classRecordId,
        bookingId: args.bookingId,
        teacherId: args.teacherId,
        studentId: args.studentId,
        url: args.url,
      };
      screenshotsCloudRepo
        .insert(cloudArgs)
        .then(({ screenshot, error }) => {
          if (error || !screenshot) {
            console.warn('[screenshotsService.createForClass] Cloud falló:', error);
            return;
          }
          cache = cache.map((x) => (x.id === s.id ? screenshot : x));
          notify();
        })
        .catch((err) =>
          console.warn('[screenshotsService.createForClass] exception:', err),
        );
    }
    return s;
  },

  markVerified(id: string): Screenshot | undefined {
    const prev = cache.find((s) => s.id === id);
    if (!prev) return undefined;
    const updated: Screenshot = {
      ...prev,
      verified: true,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((s) => (s.id === id ? updated : s));
    notify();
    if (isUuid(id)) {
      screenshotsCloudRepo
        .update(id, { verified: true })
        .then(({ screenshot, error }) => {
          if (error) {
            console.warn('[screenshotsService.markVerified] Cloud falló, revierte:', error);
            cache = cache.map((s) => (s.id === id ? prev : s));
            notify();
            return;
          }
          if (screenshot) {
            cache = cache.map((s) => (s.id === id ? screenshot : s));
            notify();
          }
        })
        .catch((err) =>
          console.warn('[screenshotsService.markVerified] exception:', err),
        );
    }
    return updated;
  },
};

export function resetScreenshotsCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
