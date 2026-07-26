// ============================================================================
// Wordlish · Servicio de profesores.
//
// Capa de caché + hidratación sobre `teachersRepo` (Cloud real).
//
// Patrón (idéntico al usado por usersService / subjectsService):
//   1. Getters sincrónicos devuelven el snapshot local.
//   2. `hydrateTeachers()` es idempotente y deduplica peticiones.
//   3. `subscribeTeachers(cb)` notifica a componentes cuando cambia el cache.
//   4. Las mutaciones optimistas (`updateTeacher`) aplican el cambio en
//      cache, disparan Cloud, y hacen rollback si falla.
//
// Este servicio elimina la necesidad de `mockDb.teachers` para el módulo
// #4. Los sub-módulos que aún leen `mockDb.teachers` (payroll, export,
// class detail) se migrarán con sus respectivas iteraciones.
// ============================================================================

import {
  teachersRepo,
  type TeacherFull,
  type TeacherEditable,
} from '@/repositories/teachers';

// ─── Estado interno ─────────────────────────────────────────────────────────
let cache: TeacherFull[] = [];
let hydrated = false;
let inflight: Promise<TeacherFull[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[teachersService] listener error', err);
    }
  });
}

// ─── Lecturas sincrónicas sobre el cache ────────────────────────────────────
export function getTeachers(): TeacherFull[] {
  return cache;
}

export function getTeachersVersion(): number {
  return version;
}

export function isTeachersHydrated(): boolean {
  return hydrated;
}

export function getTeacherById(id: string): TeacherFull | undefined {
  return cache.find((t) => t.id === id);
}

export function getTeacherByUserId(userId: string): TeacherFull | undefined {
  return cache.find((t) => t.userId === userId);
}

export function getActiveTeachers(): TeacherFull[] {
  return cache.filter((t) => t.active !== false);
}

// ─── Suscripciones para forzar re-render ────────────────────────────────────
export function subscribeTeachers(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ─── Hidratación desde Cloud ────────────────────────────────────────────────
export function hydrateTeachers(force = false): Promise<TeacherFull[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = (async () => {
    const list = await teachersRepo.list();
    cache = list;
    hydrated = true;
    notify();
    inflight = null;
    return cache;
  })();

  return inflight;
}

// ─── Mutaciones (optimistic UI + rollback) ──────────────────────────────────
export async function updateTeacher(
  id: string,
  patch: TeacherEditable,
): Promise<{ ok: boolean; error?: string }> {
  const prevIdx = cache.findIndex((t) => t.id === id);
  if (prevIdx < 0) return { ok: false, error: 'Profesor no encontrado en cache.' };
  const prev = cache[prevIdx];
  const optimistic: TeacherFull = {
    ...prev,
    ...(patch.tier !== undefined ? { tier: patch.tier } : {}),
    ...(patch.subjects !== undefined ? { subjects: patch.subjects } : {}),
    ...(patch.grades !== undefined ? { grades: patch.grades } : {}),
    ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
    ...(patch.hourlyRate !== undefined ? { hourlyRate: patch.hourlyRate } : {}),
    ...(patch.stats !== undefined ? { stats: patch.stats } : {}),
    updatedAt: new Date().toISOString(),
  };
  cache = cache.map((t) => (t.id === id ? optimistic : t));
  notify();

  const { teacher, error } = await teachersRepo.update(id, patch);
  if (error || !teacher) {
    cache = cache.map((t) => (t.id === id ? prev : t));
    notify();
    return { ok: false, error: error ?? 'No se pudo actualizar el profesor.' };
  }
  cache = cache.map((t) => (t.id === id ? teacher : t));
  notify();
  return { ok: true };
}

// ─── Reset (uso interno para logout / cambio de sesión) ─────────────────────
export function resetTeachersCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
