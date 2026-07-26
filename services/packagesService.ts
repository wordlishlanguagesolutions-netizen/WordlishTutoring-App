// ============================================================================
// Wordlish · Servicio de paquetes de horas.
// Cache + hidratación + suscripción + facade sincrónico sobre
// packagesCloudRepo (Cloud real). Expone `packagesRepo` compatible con los
// consumidores legacy (BookingsContext, classService).
//
// Semilla mockDb.packages para modo demo mientras Auth real / Cloud no
// estén poblados. Cloud reemplaza el cache al hidratar.
// ============================================================================

import type { HourPackage } from '@/types';
import {
  packagesCloudRepo,
  type PackageCreateArgs,
} from '@/repositories/packages';
import { mockDb } from './mockDb';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}

function localId(): string {
  return 'pkg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

let cache: HourPackage[] = [...mockDb.packages];
let hydrated = false;
let inflight: Promise<HourPackage[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[packagesService] listener error', err);
    }
  });
}

export function getPackages(): HourPackage[] {
  return cache;
}
export function getPackagesVersion(): number {
  return version;
}
export function isPackagesHydrated(): boolean {
  return hydrated;
}
export function subscribePackages(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hydratePackages(force = false): Promise<HourPackage[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const list = await packagesCloudRepo.list();
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

// Facade sincrónico backward-compatible.
export const packagesRepo = {
  list(): HourPackage[] {
    return cache;
  },
  listForStudent(studentId: string): HourPackage[] {
    return cache.filter((p) => p.studentId === studentId && p.active);
  },
  findById(id: string): HourPackage | undefined {
    return cache.find((p) => p.id === id);
  },
  remainingHoursFor(studentId: string): number {
    return cache
      .filter((p) => p.studentId === studentId && p.active)
      .reduce((sum, p) => sum + p.remainingHours, 0);
  },

  consumeHour(studentId: string): boolean {
    const idx = cache.findIndex(
      (p) => p.studentId === studentId && p.active && p.remainingHours > 0,
    );
    if (idx < 0) return false;
    const prev = cache[idx];
    const updated: HourPackage = {
      ...prev,
      remainingHours: prev.remainingHours - 1,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((p, i) => (i === idx ? updated : p));
    notify();

    if (isUuid(updated.id)) {
      packagesCloudRepo
        .update(updated.id, { remainingHours: updated.remainingHours })
        .then(({ package: pkg, error }) => {
          if (error) {
            console.warn('[packagesService.consumeHour] Cloud falló, revierte:', error);
            cache = cache.map((p) => (p.id === updated.id ? prev : p));
            notify();
            return;
          }
          if (pkg) {
            cache = cache.map((p) => (p.id === pkg.id ? pkg : p));
            notify();
          }
        })
        .catch((err) =>
          console.warn('[packagesService.consumeHour] exception:', err),
        );
    }
    return true;
  },

  restoreHour(studentId: string): void {
    const idx = cache.findIndex(
      (p) => p.studentId === studentId && p.active,
    );
    if (idx < 0) return;
    const prev = cache[idx];
    const updated: HourPackage = {
      ...prev,
      remainingHours: prev.remainingHours + 1,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((p, i) => (i === idx ? updated : p));
    notify();

    if (isUuid(updated.id)) {
      packagesCloudRepo
        .update(updated.id, { remainingHours: updated.remainingHours })
        .then(({ package: pkg, error }) => {
          if (error) {
            console.warn('[packagesService.restoreHour] Cloud falló, revierte:', error);
            cache = cache.map((p) => (p.id === updated.id ? prev : p));
            notify();
            return;
          }
          if (pkg) {
            cache = cache.map((p) => (p.id === pkg.id ? pkg : p));
            notify();
          }
        })
        .catch((err) =>
          console.warn('[packagesService.restoreHour] exception:', err),
        );
    }
  },

  insert(p: Omit<HourPackage, 'id' | 'createdAt' | 'updatedAt'>): HourPackage {
    const nowIso = new Date().toISOString();
    const created: HourPackage = {
      ...p,
      id: localId(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    cache = [...cache, created];
    notify();

    if (isUuid(p.studentId)) {
      const cloudArgs: PackageCreateArgs = {
        studentId: p.studentId,
        guardianId: p.guardianId,
        name: p.name,
        totalHours: p.totalHours,
        remainingHours: p.remainingHours,
        purchasedAt: p.purchasedAt,
        expiresAt: p.expiresAt,
        paymentId: p.paymentId,
      };
      packagesCloudRepo
        .insert(cloudArgs)
        .then(({ package: pkg, error }) => {
          if (error || !pkg) {
            console.warn('[packagesService.insert] Cloud falló:', error);
            return;
          }
          cache = cache.map((x) => (x.id === created.id ? pkg : x));
          notify();
        })
        .catch((err) =>
          console.warn('[packagesService.insert] exception:', err),
        );
    }
    return created;
  },
};

export function resetPackagesCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
