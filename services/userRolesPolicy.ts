// ============================================================================
// Wordlish · Políticas de rol y capacidad de la organización.
//
// Este servicio es la ÚNICA fuente en el frontend para decidir si un rol
// puede crearse, promoverse o desactivarse. La verificación real vive en
// OnSpace Cloud (triggers de `user_profiles` + RPCs). Este archivo es la
// capa de UX que:
//   · Consulta el conteo actual (`active_supervisor_count()` RPC).
//   · Devuelve el motivo humano para deshabilitar acciones en la UI.
//   · Nunca reemplaza la validación del backend: los triggers RECHAZAN
//     cualquier intento de superar los límites aunque el frontend falle.
//
// Contrato inmutable de la operación Wordlish:
//   · 1 administrador principal (bandera `is_primary_admin=true`).
//   · Máximo 3 supervisores activos.
//   · Profesores sin límite superior (referencia inicial: 20-30).
//   · Estudiantes y acudientes sin límite artificial.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { UserRole } from '@/constants/roles';

export const MAX_ACTIVE_SUPERVISORS = 3;
export const INITIAL_TEACHER_CAPACITY_HINT = 30; // Solo referencia UI/UX.

export interface RoleCapacity {
  role: UserRole;
  active: number;
  max: number | null; // null = sin límite
  canAddMore: boolean;
  reason?: string;
}

export interface RoleGuardResult {
  allowed: boolean;
  reason?: string;
}

// ─── Caché ligera ────────────────────────────────────────────────────────────
type CacheEntry = { value: number; at: number };
const CACHE_TTL_MS = 15_000;
let supervisorCountCache: CacheEntry | null = null;

// ─── Conteo activo de supervisores ───────────────────────────────────────────
export async function getActiveSupervisorCount(force = false): Promise<number> {
  if (!force && supervisorCountCache && Date.now() - supervisorCountCache.at < CACHE_TTL_MS) {
    return supervisorCountCache.value;
  }
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('active_supervisor_count');
    if (error) {
      console.warn('[userRolesPolicy] active_supervisor_count error', error.message);
      return supervisorCountCache?.value ?? 0;
    }
    const value = typeof data === 'number' ? data : Number(data) || 0;
    supervisorCountCache = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.warn('[userRolesPolicy] active_supervisor_count exception', err);
    return supervisorCountCache?.value ?? 0;
  }
}

// ─── Capacidad por rol ───────────────────────────────────────────────────────
export async function getRoleCapacity(role: UserRole): Promise<RoleCapacity> {
  if (role === 'supervisor') {
    const active = await getActiveSupervisorCount();
    const canAddMore = active < MAX_ACTIVE_SUPERVISORS;
    return {
      role,
      active,
      max: MAX_ACTIVE_SUPERVISORS,
      canAddMore,
      reason: canAddMore
        ? undefined
        : `Se alcanzó el máximo de ${MAX_ACTIVE_SUPERVISORS} supervisores activos.`,
    };
  }
  if (role === 'admin') {
    // Solo hay 1 admin principal; los admin "adicionales" no están permitidos
    // en la operación actual. Se mantiene canAddMore=false a nivel UI.
    return {
      role,
      active: 1,
      max: 1,
      canAddMore: false,
      reason:
        'Wordlish opera con un único administrador principal. Para transferirlo usa "Transferir admin principal".',
    };
  }
  // teacher / student / guardian: sin límite artificial.
  return {
    role,
    active: 0,
    max: null,
    canAddMore: true,
  };
}

// ─── Guardas de acción para la UI ───────────────────────────────────────────
/**
 * ¿Puedo promover a un usuario al rol destino?
 * No hace la escritura; sólo dice si la UI debería habilitar el botón.
 */
export async function canPromoteToRole(target: UserRole): Promise<RoleGuardResult> {
  const cap = await getRoleCapacity(target);
  if (!cap.canAddMore) {
    return { allowed: false, reason: cap.reason ?? 'Cupo agotado para este rol.' };
  }
  return { allowed: true };
}

/**
 * ¿Puedo desactivar al usuario dado? Bloquea al admin principal siempre.
 */
export function canDeactivateUser(profile: {
  is_primary_admin?: boolean;
  role: UserRole;
}): RoleGuardResult {
  if (profile.is_primary_admin === true) {
    return {
      allowed: false,
      reason: 'La cuenta administradora principal no puede desactivarse.',
    };
  }
  return { allowed: true };
}

/**
 * ¿Puedo eliminar al usuario dado? Bloquea al admin principal siempre.
 */
export function canDeleteUser(profile: {
  is_primary_admin?: boolean;
  role: UserRole;
}): RoleGuardResult {
  if (profile.is_primary_admin === true) {
    return {
      allowed: false,
      reason: 'La cuenta administradora principal no puede eliminarse.',
    };
  }
  return { allowed: true };
}

/**
 * ¿Puedo degradar (cambiar rol) al usuario dado?
 */
export function canChangeRole(profile: {
  is_primary_admin?: boolean;
  role: UserRole;
}): RoleGuardResult {
  if (profile.is_primary_admin === true) {
    return {
      allowed: false,
      reason:
        'El admin principal no puede degradarse. Usa "Transferir admin principal" primero.',
    };
  }
  return { allowed: true };
}

// ─── Traducción de errores del backend ───────────────────────────────────────
/**
 * Mapea los códigos que emiten los triggers del backend a mensajes en español.
 * Se usa cuando una escritura falla y queremos mostrar algo humano.
 */
export function translateRolePolicyError(message: string | undefined | null): string {
  if (!message) return 'No se pudo aplicar el cambio.';
  const upper = message.toUpperCase();
  if (upper.includes('MAX_SUPERVISORS_REACHED')) {
    return `Se alcanzó el máximo de ${MAX_ACTIVE_SUPERVISORS} supervisores activos.`;
  }
  if (upper.includes('CANNOT_DELETE_PRIMARY_ADMIN')) {
    return 'La cuenta administradora principal no puede eliminarse.';
  }
  if (upper.includes('CANNOT_DEACTIVATE_PRIMARY_ADMIN')) {
    return 'La cuenta administradora principal no puede desactivarse.';
  }
  if (upper.includes('CANNOT_DEMOTE_PRIMARY_ADMIN')) {
    return 'El admin principal debe conservar el rol admin. Transfiere el rol primero.';
  }
  if (upper.includes('CANNOT_REVOKE_PRIMARY_ADMIN_FLAG')) {
    return 'Usa la transferencia oficial de admin principal para reasignarlo.';
  }
  if (upper.includes('TARGET_NOT_ADMIN')) {
    return 'El usuario destino debe tener rol admin antes de recibir la bandera de principal.';
  }
  if (upper.includes('FORBIDDEN')) {
    return 'No tienes permisos para esta acción.';
  }
  return message;
}

// ─── Transferencia atómica del admin principal ───────────────────────────────
export interface TransferPrimaryAdminResult {
  ok: boolean;
  error?: string;
}

export async function transferPrimaryAdmin(
  newAdminUserId: string,
): Promise<TransferPrimaryAdminResult> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('transfer_primary_admin', {
      new_admin_id: newAdminUserId,
    });
    if (error) {
      return { ok: false, error: translateRolePolicyError(error.message) };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: translateRolePolicyError(err?.message) };
  }
}

// ─── Invalidación externa ────────────────────────────────────────────────────
export function invalidateRoleCapacityCache(): void {
  supervisorCountCache = null;
}
