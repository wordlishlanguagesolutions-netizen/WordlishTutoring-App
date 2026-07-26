// ============================================================================
// Wordlish · Repositorio de profesores (Cloud real) — Módulo #4 migrado.
//
// Consume `public.teachers` con join denormalizado a `user_profiles` para
// exponer identidad (nombre, avatar, correo, teléfono). Reemplaza el store
// en memoria `mockDb.teachers` para todos los consumidores propios del
// módulo (los sub-módulos que aún leen `mockDb.teachers` — payroll, export,
// class detail — se migrarán en su propia iteración).
//
// Contrato:
//   · list()              → todos los profesores (RLS decide).
//   · getById(id)         → un profesor por su id (public.teachers.id).
//   · findByUserId(uuid)  → un profesor por el uuid de auth (user_profiles.id).
//   · update(id, patch)   → actualiza tier, subjects, grades, hourlyRate,
//                           bio, stats. La identidad (nombre, avatar) se
//                           edita desde el panel de Usuarios.
//
// Notas de RLS:
//   · `authenticated_select_teachers` permite listar a cualquier usuario
//     autenticado.
//   · El join a `user_profiles` respeta las RLS del perfil: admin/supervisor
//     ven todos, cada usuario ve el suyo. Para el panel admin (consumo
//     principal hoy) el join siempre trae la identidad completa.
//   · Sub-módulos con vistas no-admin (booking wizard estudiante/acudiente)
//     verán id/tier/subjects/grades pero identidad limitada; se resolverá
//     al migrar Bookings/Booking Wizard vía tabla de perfil pública.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { TeacherTier } from '@/constants/policies';

export interface TeacherFull {
  id: string;
  staffId: string;
  userId: string;
  fullName: string;
  firstName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  tier: TeacherTier;
  subjects: string[];
  grades: string[];
  bio: string | null;
  hourlyRate: number;
  stats: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DbTeacherRow {
  id: string;
  staff_id: string;
  user_id: string;
  tier: TeacherTier;
  subjects: string[] | null;
  grades: string[] | null;
  bio: string | null;
  hourly_rate: number | string;
  stats: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Join denormalizado (puede venir null si la RLS del perfil oculta la fila).
  user_profiles?: {
    full_name: string;
    first_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    active: boolean;
  } | null;
}

const SELECT_COLS =
  'id, staff_id, user_id, tier, subjects, grades, bio, hourly_rate, stats, created_at, updated_at, user_profiles:user_profiles!teachers_user_id_fkey(full_name, first_name, email, phone, avatar_url, active)';

function toModel(row: DbTeacherRow): TeacherFull {
  const up = row.user_profiles ?? null;
  return {
    id: row.id,
    staffId: row.staff_id,
    userId: row.user_id,
    fullName: up?.full_name ?? '',
    firstName: up?.first_name ?? '',
    email: up?.email ?? '',
    phone: up?.phone ?? null,
    avatar: up?.avatar_url ?? null,
    tier: row.tier,
    subjects: Array.isArray(row.subjects) ? row.subjects : [],
    grades: Array.isArray(row.grades) ? row.grades : [],
    bio: row.bio,
    hourlyRate: Number(row.hourly_rate ?? 0),
    stats: (row.stats ?? {}) as Record<string, unknown>,
    active: up?.active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface TeacherEditable {
  tier?: TeacherTier;
  subjects?: string[];
  grades?: string[];
  bio?: string | null;
  hourlyRate?: number;
  stats?: Record<string, unknown>;
}

function toDbPayload(patch: TeacherEditable): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.tier !== undefined) out.tier = patch.tier;
  if (patch.subjects !== undefined) out.subjects = patch.subjects;
  if (patch.grades !== undefined) out.grades = patch.grades;
  if (patch.bio !== undefined) out.bio = patch.bio;
  if (patch.hourlyRate !== undefined) out.hourly_rate = patch.hourlyRate;
  if (patch.stats !== undefined) out.stats = patch.stats;
  return out;
}

export const teachersRepo = {
  async list(): Promise<TeacherFull[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('teachers')
        .select(SELECT_COLS)
        .order('created_at', { ascending: true });
      if (error) {
        console.warn('[teachersRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbTeacherRow));
    } catch (err) {
      console.warn('[teachersRepo.list] exception', err);
      return [];
    }
  },

  async getById(id: string): Promise<TeacherFull | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('teachers')
        .select(SELECT_COLS)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('[teachersRepo.getById] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbTeacherRow) : null;
    } catch (err) {
      console.warn('[teachersRepo.getById] exception', err);
      return null;
    }
  },

  async findByUserId(userId: string): Promise<TeacherFull | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('teachers')
        .select(SELECT_COLS)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.warn('[teachersRepo.findByUserId] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbTeacherRow) : null;
    } catch (err) {
      console.warn('[teachersRepo.findByUserId] exception', err);
      return null;
    }
  },

  async update(
    id: string,
    patch: TeacherEditable,
  ): Promise<{ teacher: TeacherFull | null; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('teachers')
        .update({ ...toDbPayload(patch), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[teachersRepo.update] error', error.message);
        return { teacher: null, error: error.message };
      }
      return { teacher: toModel(data as unknown as DbTeacherRow) };
    } catch (err: any) {
      console.warn('[teachersRepo.update] exception', err);
      return { teacher: null, error: err?.message ?? 'unknown_error' };
    }
  },
};
