// ============================================================================
// Wordlish · Servicio de materiales.
// Cache + hidratación + suscripción + facade sincrónico sobre
// materialsCloudRepo (Cloud real). Expone `materialsRepo` compatible con
// consumidores legacy (classService, useClassManager).
//
// Placeholder: `url` (storage_path) queda como URL mock mientras no exista
// upload real a Storage; toda la lógica de asociación con ClassRecord y
// persistencia de metadata funciona contra Cloud.
// ============================================================================

import type { Material } from '@/types';
import {
  materialsCloudRepo,
  type MaterialCreateArgs,
} from '@/repositories/materials';
import { classRecordsRepo } from './classRecordsService';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}

function localId(): string {
  return 'mat' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

let cache: Material[] = [];
let hydrated = false;
let inflight: Promise<Material[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[materialsService] listener error', err);
    }
  });
}

export function getMaterials(): Material[] {
  return cache;
}
export function getMaterialsVersion(): number {
  return version;
}
export function isMaterialsHydrated(): boolean {
  return hydrated;
}
export function subscribeMaterials(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hydrateMaterials(force = false): Promise<Material[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const list = await materialsCloudRepo.list();
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

type CreateArgs = Omit<Material, 'id' | 'createdAt' | 'updatedAt'>;

export const materialsRepo = {
  list(): Material[] {
    return cache;
  },
  findById(id: string): Material | undefined {
    return cache.find((m) => m.id === id);
  },
  listForClass(classRecordId: string): Material[] {
    return cache.filter((m) => m.classRecordId === classRecordId);
  },
  listForStudent(studentId: string): Material[] {
    return cache.filter((m) => m.studentId === studentId);
  },

  createForClass(args: CreateArgs): Material {
    const cr = classRecordsRepo.findById(args.classRecordId);
    if (!cr) throw new Error('No se puede crear material fuera de una clase.');
    const nowIso = new Date().toISOString();
    const m: Material = {
      ...args,
      id: localId(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    cache = [...cache, m];
    notify();
    classRecordsRepo.attachMaterial(cr.id, m.id);

    if (
      isUuid(args.classRecordId) &&
      isUuid(args.bookingId) &&
      isUuid(args.teacherId) &&
      isUuid(args.studentId)
    ) {
      const cloudArgs: MaterialCreateArgs = {
        classRecordId: args.classRecordId,
        bookingId: args.bookingId,
        teacherId: args.teacherId,
        studentId: args.studentId,
        title: args.title,
        description: args.description,
        kind: args.kind,
        url: args.url,
        size: args.size,
        source: args.source,
      };
      materialsCloudRepo
        .insert(cloudArgs)
        .then(({ material, error }) => {
          if (error || !material) {
            console.warn('[materialsService.createForClass] Cloud falló:', error);
            return;
          }
          cache = cache.map((x) => (x.id === m.id ? material : x));
          notify();
        })
        .catch((err) =>
          console.warn('[materialsService.createForClass] exception:', err),
        );
    }
    return m;
  },
};

export function resetMaterialsCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
