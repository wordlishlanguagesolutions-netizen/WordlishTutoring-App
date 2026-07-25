// ============================================================================
// Wordlish · Repositorio de usuarios (Cloud real) — Módulo #3 migrado.
//
// Consume directamente `public.user_profiles`. Reemplaza el antiguo repo en
// memoria que leía de `mockDb.users`.
//
// Contrato:
//   · list()             → todos los perfiles (uso admin, RLS decide).
//   · listVisibleTo(ctx) → filtro basado en rol (admin/supervisor ven todo).
//   · getById(id)        → un perfil por id (uuid de auth.users).
//   · findByEmail(email) → un perfil por email normalizado.
//   · findByRole(role)   → perfiles filtrados por rol.
//   · update(id, patch)  → actualiza campos editables por el admin.
//   · setActive(id, val) → activa/desactiva. Bloqueado por trigger para el
//                          admin principal.
//   · setRole(id, role)  → cambio de rol. Sujeto a triggers (supervisores
//                          máx. 3, admin principal no degradable).
//
// Notas:
//   · La creación de usuarios NO se hace por este repo. auth.users se puebla
//     vía signup real (trigger `handle_new_user` crea el user_profiles).
//   · El admin principal se protege por triggers (ver migration 014).
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { UserProfile } from '@/types';
import type { UserRole } from '@/constants/roles';
import type { AccountType, SpecificRole } from '@/types';
import type { SecurityContext } from '@/services/securityService';
import { canViewUser } from '@/services/securityService';

// Fila cruda tal como viene de Cloud.
interface DbUserProfile {
  id: string;
  username: string | null;
  email: string;
  full_name: string;
  first_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: SpecificRole;
  account_type: AccountType;
  active: boolean;
  is_primary_admin: boolean;
  created_at: string;
  updated_at: string;
}

// Modelo extendido con la bandera de admin principal (no está en el
// UserProfile base, pero el resto del código lo necesita para decidir
// bloqueos de UI). Mantenemos compatibilidad hacia atrás exponiendo el
// mismo shape que el `UserProfile` de `@/types`.
export interface UserProfileFull extends UserProfile {
  isPrimaryAdmin: boolean;
}

function toModel(row: DbUserProfile): UserProfileFull {
  return {
    id: row.id,
    fullName: row.full_name,
    firstName: row.first_name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar_url,
    role: row.role,
    accountType: row.account_type,
    active: row.active,
    isPrimaryAdmin: row.is_primary_admin === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Solo permitimos actualizar el subconjunto que el admin edita desde UI.
// El rol y active tienen setters dedicados para trazabilidad.
export interface UserProfileEditable {
  fullName?: string;
  firstName?: string;
  phone?: string | null;
  avatar?: string | null;
  accountType?: AccountType;
}

function toDbPayload(patch: UserProfileEditable): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.fullName !== undefined) out.full_name = patch.fullName;
  if (patch.firstName !== undefined) out.first_name = patch.firstName;
  if (patch.phone !== undefined) out.phone = patch.phone ?? null;
  if (patch.avatar !== undefined) out.avatar_url = patch.avatar ?? null;
  if (patch.accountType !== undefined) out.account_type = patch.accountType;
  return out;
}

async function fetchAll(): Promise<UserProfileFull[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        'id, username, email, full_name, first_name, phone, avatar_url, role, account_type, active, is_primary_admin, created_at, updated_at',
      )
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[usersRepo.fetchAll] error', error.message);
      return [];
    }
    return (data ?? []).map((r) => toModel(r as DbUserProfile));
  } catch (err) {
    console.warn('[usersRepo.fetchAll] exception', err);
    return [];
  }
}

export const usersRepo = {
  async list(): Promise<UserProfileFull[]> {
    return fetchAll();
  },

  async listVisibleTo(ctx: SecurityContext | null): Promise<UserProfileFull[]> {
    if (!ctx) return [];
    const all = await fetchAll();
    if (ctx.role === 'admin' || ctx.role === 'supervisor') return all;
    return all.filter((u) => canViewUser(ctx, u.id));
  },

  async getById(id: string): Promise<UserProfileFull | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .select(
          'id, username, email, full_name, first_name, phone, avatar_url, role, account_type, active, is_primary_admin, created_at, updated_at',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('[usersRepo.getById] error', error.message);
        return null;
      }
      return data ? toModel(data as DbUserProfile) : null;
    } catch (err) {
      console.warn('[usersRepo.getById] exception', err);
      return null;
    }
  },

  async findByEmail(email: string): Promise<UserProfileFull | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .select(
          'id, username, email, full_name, first_name, phone, avatar_url, role, account_type, active, is_primary_admin, created_at, updated_at',
        )
        .ilike('email', email.trim())
        .maybeSingle();
      if (error) {
        console.warn('[usersRepo.findByEmail] error', error.message);
        return null;
      }
      return data ? toModel(data as DbUserProfile) : null;
    } catch (err) {
      console.warn('[usersRepo.findByEmail] exception', err);
      return null;
    }
  },

  async findByRole(role: UserRole): Promise<UserProfileFull[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .select(
          'id, username, email, full_name, first_name, phone, avatar_url, role, account_type, active, is_primary_admin, created_at, updated_at',
        )
        .eq('role', role)
        .order('full_name', { ascending: true });
      if (error) {
        console.warn('[usersRepo.findByRole] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as DbUserProfile));
    } catch (err) {
      console.warn('[usersRepo.findByRole] exception', err);
      return [];
    }
  },

  async update(
    id: string,
    patch: UserProfileEditable,
  ): Promise<{ user: UserProfileFull | null; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...toDbPayload(patch), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(
          'id, username, email, full_name, first_name, phone, avatar_url, role, account_type, active, is_primary_admin, created_at, updated_at',
        )
        .single();
      if (error) {
        console.warn('[usersRepo.update] error', error.message);
        return { user: null, error: error.message };
      }
      return { user: toModel(data as DbUserProfile) };
    } catch (err: any) {
      console.warn('[usersRepo.update] exception', err);
      return { user: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async setActive(
    id: string,
    active: boolean,
  ): Promise<{ user: UserProfileFull | null; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(
          'id, username, email, full_name, first_name, phone, avatar_url, role, account_type, active, is_primary_admin, created_at, updated_at',
        )
        .single();
      if (error) {
        console.warn('[usersRepo.setActive] error', error.message);
        return { user: null, error: error.message };
      }
      return { user: toModel(data as DbUserProfile) };
    } catch (err: any) {
      console.warn('[usersRepo.setActive] exception', err);
      return { user: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async setRole(
    id: string,
    role: UserRole,
  ): Promise<{ user: UserProfileFull | null; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      // Derivamos accountType coherente con el rol destino.
      const accountType: AccountType =
        role === 'admin' || role === 'supervisor' || role === 'teacher'
          ? 'staff'
          : 'student_guardian';
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          role,
          account_type: accountType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(
          'id, username, email, full_name, first_name, phone, avatar_url, role, account_type, active, is_primary_admin, created_at, updated_at',
        )
        .single();
      if (error) {
        console.warn('[usersRepo.setRole] error', error.message);
        return { user: null, error: error.message };
      }
      return { user: toModel(data as DbUserProfile) };
    } catch (err: any) {
      console.warn('[usersRepo.setRole] exception', err);
      return { user: null, error: err?.message ?? 'unknown_error' };
    }
  },
};
