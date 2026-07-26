// ============================================================================
// Wordlish · Repositorio de acudientes (Cloud real) — Módulo #6.
// Mismo patrón que repositories/students.ts.
// La relación con estudiantes se resuelve vía students.guardian_id (FK directa).
// ============================================================================

import { getSupabaseClient } from '@/template';

export interface GuardianFull {
  id: string;
  userId: string;
  fullName: string;
  firstName: string;
  email: string;
  phone: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbGuardianRow {
  id: string;
  user_id: string;
  full_name: string;
  first_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  'id, user_id, full_name, first_name, email, phone, avatar_url, created_at, updated_at';

function toModel(row: DbGuardianRow): GuardianFull {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    firstName: row.first_name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface GuardianEditable {
  fullName?: string;
  firstName?: string;
  email?: string;
  phone?: string;
  avatar?: string | null;
}

function toDbPayload(patch: GuardianEditable): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.fullName !== undefined) out.full_name = patch.fullName;
  if (patch.firstName !== undefined) out.first_name = patch.firstName;
  if (patch.email !== undefined) out.email = patch.email;
  if (patch.phone !== undefined) out.phone = patch.phone;
  if (patch.avatar !== undefined) out.avatar_url = patch.avatar;
  return out;
}

export const guardiansRepo = {
  async list(): Promise<GuardianFull[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('guardians')
        .select(SELECT_COLS)
        .order('created_at', { ascending: true });
      if (error) {
        console.warn('[guardiansRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbGuardianRow));
    } catch (err) {
      console.warn('[guardiansRepo.list] exception', err);
      return [];
    }
  },

  async getById(id: string): Promise<GuardianFull | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('guardians')
        .select(SELECT_COLS)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('[guardiansRepo.getById] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbGuardianRow) : null;
    } catch (err) {
      console.warn('[guardiansRepo.getById] exception', err);
      return null;
    }
  },

  async findByUserId(userId: string): Promise<GuardianFull | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('guardians')
        .select(SELECT_COLS)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.warn('[guardiansRepo.findByUserId] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbGuardianRow) : null;
    } catch (err) {
      console.warn('[guardiansRepo.findByUserId] exception', err);
      return null;
    }
  },

  async update(
    id: string,
    patch: GuardianEditable,
  ): Promise<{ guardian: GuardianFull | null; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('guardians')
        .update({ ...toDbPayload(patch), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[guardiansRepo.update] error', error.message);
        return { guardian: null, error: error.message };
      }
      return { guardian: toModel(data as unknown as DbGuardianRow) };
    } catch (err: any) {
      console.warn('[guardiansRepo.update] exception', err);
      return { guardian: null, error: err?.message ?? 'unknown_error' };
    }
  },
};
