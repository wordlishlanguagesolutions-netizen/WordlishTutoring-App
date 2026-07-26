// ============================================================================
// Wordlish · Servicio de acudientes.
// Cache + hidratación + suscripción sobre guardiansRepo (Cloud real).
// Mismo patrón que studentsService.
// ============================================================================

import {
  guardiansRepo,
  type GuardianFull,
  type GuardianEditable,
} from '@/repositories/guardians';
import { getStudentsByGuardianId } from './studentsService';

let cache: GuardianFull[] = [];
let hydrated = false;
let inflight: Promise<GuardianFull[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[guardiansService] listener error', err);
    }
  });
}

export function getGuardians(): GuardianFull[] {
  return cache;
}

export function getGuardiansVersion(): number {
  return version;
}

export function isGuardiansHydrated(): boolean {
  return hydrated;
}

export function getGuardianById(id: string): GuardianFull | undefined {
  return cache.find((g) => g.id === id);
}

export function getGuardianByUserId(userId: string): GuardianFull | undefined {
  return cache.find((g) => g.userId === userId);
}

// Devuelve los IDs de estudiantes vinculados a un acudiente
// (usa el cache de studentsService, que hidrata por separado).
export function getStudentIdsForGuardian(guardianId: string): string[] {
  return getStudentsByGuardianId(guardianId).map((s) => s.id);
}

export function subscribeGuardians(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hydrateGuardians(force = false): Promise<GuardianFull[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = (async () => {
    const list = await guardiansRepo.list();
    cache = list;
    hydrated = true;
    notify();
    inflight = null;
    return cache;
  })();

  return inflight;
}

export async function updateGuardian(
  id: string,
  patch: GuardianEditable,
): Promise<{ ok: boolean; error?: string }> {
  const prevIdx = cache.findIndex((g) => g.id === id);
  if (prevIdx < 0) return { ok: false, error: 'Acudiente no encontrado en cache.' };
  const prev = cache[prevIdx];
  const optimistic: GuardianFull = {
    ...prev,
    ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
    ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
    ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
    updatedAt: new Date().toISOString(),
  };
  cache = cache.map((g) => (g.id === id ? optimistic : g));
  notify();

  const { guardian, error } = await guardiansRepo.update(id, patch);
  if (error || !guardian) {
    cache = cache.map((g) => (g.id === id ? prev : g));
    notify();
    return { ok: false, error: error ?? 'No se pudo actualizar el acudiente.' };
  }
  cache = cache.map((g) => (g.id === id ? guardian : g));
  notify();
  return { ok: true };
}

export function resetGuardiansCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
