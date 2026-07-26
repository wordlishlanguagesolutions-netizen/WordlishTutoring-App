// ============================================================================
// Wordlish · Servicio de estudiantes.
// Cache + hidratación + suscripción sobre studentsRepo (Cloud real).
// Mismo patrón que usersService / teachersService.
// ============================================================================

import {
  studentsRepo,
  type StudentFull,
  type StudentEditable,
} from '@/repositories/students';

let cache: StudentFull[] = [];
let hydrated = false;
let inflight: Promise<StudentFull[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[studentsService] listener error', err);
    }
  });
}

export function getStudents(): StudentFull[] {
  return cache;
}

export function getStudentsVersion(): number {
  return version;
}

export function isStudentsHydrated(): boolean {
  return hydrated;
}

export function getStudentById(id: string): StudentFull | undefined {
  return cache.find((s) => s.id === id);
}

export function getStudentByUserId(userId: string): StudentFull | undefined {
  return cache.find((s) => s.userId === userId);
}

export function getStudentsByGuardianId(guardianId: string): StudentFull[] {
  return cache.filter((s) => s.guardianId === guardianId);
}

export function subscribeStudents(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hydrateStudents(force = false): Promise<StudentFull[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = (async () => {
    const list = await studentsRepo.list();
    cache = list;
    hydrated = true;
    notify();
    inflight = null;
    return cache;
  })();

  return inflight;
}

export async function updateStudent(
  id: string,
  patch: StudentEditable,
): Promise<{ ok: boolean; error?: string }> {
  const prevIdx = cache.findIndex((s) => s.id === id);
  if (prevIdx < 0) return { ok: false, error: 'Estudiante no encontrado en cache.' };
  const prev = cache[prevIdx];
  const optimistic: StudentFull = {
    ...prev,
    ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
    ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
    ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
    ...(patch.age !== undefined ? { age: patch.age } : {}),
    ...(patch.grade !== undefined ? { grade: patch.grade } : {}),
    ...(patch.school !== undefined ? { school: patch.school } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.planTier !== undefined ? { planTier: patch.planTier } : {}),
    ...(patch.guardianId !== undefined ? { guardianId: patch.guardianId } : {}),
    ...(patch.active !== undefined ? { active: patch.active } : {}),
    updatedAt: new Date().toISOString(),
  };
  cache = cache.map((s) => (s.id === id ? optimistic : s));
  notify();

  const { student, error } = await studentsRepo.update(id, patch);
  if (error || !student) {
    cache = cache.map((s) => (s.id === id ? prev : s));
    notify();
    return { ok: false, error: error ?? 'No se pudo actualizar el estudiante.' };
  }
  cache = cache.map((s) => (s.id === id ? student : s));
  notify();
  return { ok: true };
}

export function resetStudentsCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
