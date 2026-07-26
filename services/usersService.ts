// ============================================================================
// Wordlish · Servicio de usuarios.
//
// Capa de caché + hidratación sobre `usersRepo` (Cloud real).
//
// Patrón (idéntico al de subjectsService / teacherRatesConfig):
//   1. Getters sincrónicos devuelven el snapshot local.
//   2. `hydrateUsers()` es idempotente y deduplica peticiones concurrentes.
//   3. `subscribeUsers(cb)` notifica a componentes cuando cambia el cache.
//   4. Las mutaciones optimistas (`updateUser`, `setUserActive`, `setUserRole`)
//      aplican el cambio en cache, disparan Cloud, y hacen rollback si falla.
//
// Este servicio elimina la necesidad de `mockDb.users` para el resto de la
// app: quien necesite el perfil de un usuario debe consultarlo aquí.
// ============================================================================

import {
  usersRepo,
  type UserProfileFull,
  type UserProfileEditable,
} from '@/repositories/users';
import type { UserRole } from '@/constants/roles';
import { invalidateRoleCapacityCache } from './userRolesPolicy';

// ─── Estado interno ─────────────────────────────────────────────────────────
let cache: UserProfileFull[] = [];
let hydrated = false;
let inflight: Promise<UserProfileFull[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[usersService] listener error', err);
    }
  });
}

// ─── Lecturas sincrónicas sobre el cache ────────────────────────────────────
export function getUsers(): UserProfileFull[] {
  return cache;
}

export function getUsersVersion(): number {
  return version;
}

export function isUsersHydrated(): boolean {
  return hydrated;
}

export function getUserById(id: string): UserProfileFull | undefined {
  return cache.find((u) => u.id === id);
}

export function getUserByEmail(email: string): UserProfileFull | undefined {
  const normalized = email.trim().toLowerCase();
  return cache.find((u) => u.email.toLowerCase() === normalized);
}

export function getUsersByRole(role: UserRole): UserProfileFull[] {
  return cache.filter((u) => u.role === role);
}

export function getPrimaryAdmin(): UserProfileFull | undefined {
  return cache.find((u) => u.isPrimaryAdmin === true);
}

// ─── Suscripciones para forzar re-render ────────────────────────────────────
export function subscribeUsers(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ─── Hidratación desde Cloud ────────────────────────────────────────────────
export function hydrateUsers(force = false): Promise<UserProfileFull[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = (async () => {
    const list = await usersRepo.list();
    cache = list;
    hydrated = true;
    notify();
    inflight = null;
    return cache;
  })();

  return inflight;
}

// ─── Mutaciones (optimistic UI + rollback) ──────────────────────────────────
export async function updateUser(
  id: string,
  patch: UserProfileEditable,
): Promise<{ ok: boolean; error?: string }> {
  const prevIdx = cache.findIndex((u) => u.id === id);
  if (prevIdx < 0) return { ok: false, error: 'Usuario no encontrado en cache.' };
  const prev = cache[prevIdx];
  const optimistic: UserProfileFull = {
    ...prev,
    ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
    ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
    ...(patch.accountType !== undefined ? { accountType: patch.accountType } : {}),
    updatedAt: new Date().toISOString(),
  };
  cache = cache.map((u) => (u.id === id ? optimistic : u));
  notify();

  const { user, error } = await usersRepo.update(id, patch);
  if (error || !user) {
    // Rollback
    cache = cache.map((u) => (u.id === id ? prev : u));
    notify();
    return { ok: false, error: error ?? 'No se pudo actualizar el usuario.' };
  }
  cache = cache.map((u) => (u.id === id ? user : u));
  notify();
  return { ok: true };
}

export async function setUserActive(
  id: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const prevIdx = cache.findIndex((u) => u.id === id);
  if (prevIdx < 0) return { ok: false, error: 'Usuario no encontrado en cache.' };
  const prev = cache[prevIdx];
  // Protección local del admin principal (además del trigger DB).
  if (prev.isPrimaryAdmin && !active) {
    return {
      ok: false,
      error: 'La cuenta administradora principal no puede desactivarse.',
    };
  }
  const optimistic: UserProfileFull = { ...prev, active, updatedAt: new Date().toISOString() };
  cache = cache.map((u) => (u.id === id ? optimistic : u));
  notify();

  const { user, error } = await usersRepo.setActive(id, active);
  if (error || !user) {
    cache = cache.map((u) => (u.id === id ? prev : u));
    notify();
    return { ok: false, error: error ?? 'No se pudo cambiar el estado.' };
  }
  cache = cache.map((u) => (u.id === id ? user : u));
  invalidateRoleCapacityCache(); // supervisores activos cambió
  notify();
  return { ok: true };
}

export async function setUserRole(
  id: string,
  role: UserRole,
): Promise<{ ok: boolean; error?: string }> {
  const prevIdx = cache.findIndex((u) => u.id === id);
  if (prevIdx < 0) return { ok: false, error: 'Usuario no encontrado en cache.' };
  const prev = cache[prevIdx];
  if (prev.isPrimaryAdmin && role !== 'admin') {
    return {
      ok: false,
      error:
        'El admin principal debe conservar el rol admin. Transfiere el rol antes.',
    };
  }
  const optimistic: UserProfileFull = {
    ...prev,
    role,
    accountType:
      role === 'admin' || role === 'supervisor' || role === 'teacher'
        ? 'staff'
        : 'student_guardian',
    updatedAt: new Date().toISOString(),
  };
  cache = cache.map((u) => (u.id === id ? optimistic : u));
  notify();

  const { user, error } = await usersRepo.setRole(id, role);
  if (error || !user) {
    cache = cache.map((u) => (u.id === id ? prev : u));
    notify();
    return { ok: false, error: error ?? 'No se pudo cambiar el rol.' };
  }
  cache = cache.map((u) => (u.id === id ? user : u));
  invalidateRoleCapacityCache();
  notify();
  return { ok: true };
}

// ─── Reset (uso interno para logout / cambio de sesión) ─────────────────────
export function resetUsersCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
