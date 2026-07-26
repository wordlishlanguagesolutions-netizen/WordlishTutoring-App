// ============================================================================
// Wordlish · Repositorio de materiales (Cloud real) — Módulo #10.
//
// Capa async pura sobre `public.materials`. El facade sincrónico
// (`materialsRepo`) para consumidores legacy se expone desde
// `services/materialsService.ts` y comparte cache.
//
// Regla dura preservada: un material SIEMPRE pertenece a un ClassRecord.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { Material, MaterialKind, MaterialSource } from '@/types';

interface DbMaterialRow {
  id: string;
  class_record_id: string;
  booking_id: string;
  teacher_id: string;
  student_id: string;
  title: string;
  description: string | null;
  kind: MaterialKind;
  storage_path: string;
  size_label: string | null;
  source: MaterialSource;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  'id, class_record_id, booking_id, teacher_id, student_id, title, description, kind, storage_path, size_label, source, created_at, updated_at';

function toModel(row: DbMaterialRow): Material {
  return {
    id: row.id,
    classRecordId: row.class_record_id,
    bookingId: row.booking_id,
    teacherId: row.teacher_id,
    studentId: row.student_id,
    title: row.title,
    description: row.description,
    kind: row.kind,
    url: row.storage_path,
    size: row.size_label ?? '—',
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface MaterialCreateArgs {
  classRecordId: string;
  bookingId: string;
  teacherId: string;
  studentId: string;
  title: string;
  description: string | null;
  kind: MaterialKind;
  url: string;
  size: string;
  source: MaterialSource;
}

export const materialsCloudRepo = {
  async list(): Promise<Material[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('materials')
        .select(SELECT_COLS)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[materialsCloudRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbMaterialRow));
    } catch (err) {
      console.warn('[materialsCloudRepo.list] exception', err);
      return [];
    }
  },

  async insert(
    args: MaterialCreateArgs,
  ): Promise<{ material: Material | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const payload: Record<string, unknown> = {
        class_record_id: args.classRecordId,
        booking_id: args.bookingId,
        teacher_id: args.teacherId,
        student_id: args.studentId,
        title: args.title,
        description: args.description,
        kind: args.kind,
        storage_path: args.url,
        size_label: args.size,
        source: args.source,
      };
      const { data, error } = await sb
        .from('materials')
        .insert(payload)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[materialsCloudRepo.insert] error', error.message);
        return { material: null, error: error.message };
      }
      return { material: toModel(data as unknown as DbMaterialRow) };
    } catch (err: any) {
      console.warn('[materialsCloudRepo.insert] exception', err);
      return { material: null, error: err?.message ?? 'unknown_error' };
    }
  },
};
