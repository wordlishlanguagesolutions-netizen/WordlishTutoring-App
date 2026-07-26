// ============================================================================
// Wordlish · Repositorio de estudiantes (Cloud real) — Módulo #5.
// Mismo patrón que repositories/users.ts y repositories/teachers.ts.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { TeacherTier } from '@/constants/policies';

export interface StudentFull {
  id: string;
  userId: string | null;
  guardianId: string | null;
  fullName: string;
  firstName: string;
  avatar: string | null;
  age: number | null;
  grade: string;
  school: string | null;
  phone: string | null;
  planTier: TeacherTier;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DbStudentRow {
  id: string;
  user_id: string | null;
  guardian_id: string | null;
  full_name: string;
  first_name: string;
  avatar_url: string | null;
  age: number | null;
  grade: string;
  school: string | null;
  phone: string | null;
  plan_tier: TeacherTier;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  'id, user_id, guardian_id, full_name, first_name, avatar_url, age, grade, school, phone, plan_tier, active, created_at, updated_at';

function toModel(row: DbStudentRow): StudentFull {
  return {
    id: row.id,
    userId: row.user_id,
    guardianId: row.guardian_id,
    fullName: row.full_name,
    firstName: row.first_name,
    avatar: row.avatar_url,
    age: row.age,
    grade: row.grade,
    school: row.school,
    phone: row.phone,
    planTier: row.plan_tier,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface StudentEditable {
  fullName?: string;
  firstName?: string;
  avatar?: string | null;
  age?: number | null;
  grade?: string;
  school?: string | null;
  phone?: string | null;
  planTier?: TeacherTier;
  guardianId?: string | null;
  active?: boolean;
}

function toDbPayload(patch: StudentEditable): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.fullName !== undefined) out.full_name = patch.fullName;
  if (patch.firstName !== undefined) out.first_name = patch.firstName;
  if (patch.avatar !== undefined) out.avatar_url = patch.avatar;
  if (patch.age !== undefined) out.age = patch.age;
  if (patch.grade !== undefined) out.grade = patch.grade;
  if (patch.school !== undefined) out.school = patch.school;
  if (patch.phone !== undefined) out.phone = patch.phone;
  if (patch.planTier !== undefined) out.plan_tier = patch.planTier;
  if (patch.guardianId !== undefined) out.guardian_id = patch.guardianId;
  if (patch.active !== undefined) out.active = patch.active;
  return out;
}

export const studentsRepo = {
  async list(): Promise<StudentFull[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('students')
        .select(SELECT_COLS)
        .order('created_at', { ascending: true });
      if (error) {
        console.warn('[studentsRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbStudentRow));
    } catch (err) {
      console.warn('[studentsRepo.list] exception', err);
      return [];
    }
  },

  async getById(id: string): Promise<StudentFull | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('students')
        .select(SELECT_COLS)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('[studentsRepo.getById] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbStudentRow) : null;
    } catch (err) {
      console.warn('[studentsRepo.getById] exception', err);
      return null;
    }
  },

  async findByUserId(userId: string): Promise<StudentFull | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('students')
        .select(SELECT_COLS)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.warn('[studentsRepo.findByUserId] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbStudentRow) : null;
    } catch (err) {
      console.warn('[studentsRepo.findByUserId] exception', err);
      return null;
    }
  },

  async findByGuardianId(guardianId: string): Promise<StudentFull[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('students')
        .select(SELECT_COLS)
        .eq('guardian_id', guardianId);
      if (error) {
        console.warn('[studentsRepo.findByGuardianId] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbStudentRow));
    } catch (err) {
      console.warn('[studentsRepo.findByGuardianId] exception', err);
      return [];
    }
  },

  async update(
    id: string,
    patch: StudentEditable,
  ): Promise<{ student: StudentFull | null; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('students')
        .update({ ...toDbPayload(patch), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[studentsRepo.update] error', error.message);
        return { student: null, error: error.message };
      }
      return { student: toModel(data as unknown as DbStudentRow) };
    } catch (err: any) {
      console.warn('[studentsRepo.update] exception', err);
      return { student: null, error: err?.message ?? 'unknown_error' };
    }
  },
};
