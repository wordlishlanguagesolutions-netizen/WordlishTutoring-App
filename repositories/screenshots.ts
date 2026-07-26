// ============================================================================
// Wordlish · Repositorio de screenshots (Cloud real) — Módulo #11.
//
// Capa async pura sobre `public.screenshots`. El facade sincrónico
// (`screenshotsRepo`) para consumidores legacy se expone desde
// `services/screenshotsService.ts` y comparte cache.
//
// Regla dura preservada: un screenshot SIEMPRE pertenece a un ClassRecord.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { Screenshot } from '@/types';

interface DbScreenshotRow {
  id: string;
  class_record_id: string;
  booking_id: string;
  teacher_id: string;
  student_id: string;
  storage_path: string;
  captured_at: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  'id, class_record_id, booking_id, teacher_id, student_id, storage_path, captured_at, verified, created_at, updated_at';

function toModel(row: DbScreenshotRow): Screenshot {
  return {
    id: row.id,
    classRecordId: row.class_record_id,
    bookingId: row.booking_id,
    teacherId: row.teacher_id,
    studentId: row.student_id,
    url: row.storage_path,
    capturedAt: row.captured_at,
    verified: row.verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ScreenshotCreateArgs {
  classRecordId: string;
  bookingId: string;
  teacherId: string;
  studentId: string;
  url: string;
}

export interface ScreenshotUpdatePatch {
  verified?: boolean;
}

export const screenshotsCloudRepo = {
  async list(): Promise<Screenshot[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('screenshots')
        .select(SELECT_COLS)
        .order('captured_at', { ascending: false });
      if (error) {
        console.warn('[screenshotsCloudRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbScreenshotRow));
    } catch (err) {
      console.warn('[screenshotsCloudRepo.list] exception', err);
      return [];
    }
  },

  async insert(
    args: ScreenshotCreateArgs,
  ): Promise<{ screenshot: Screenshot | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const payload: Record<string, unknown> = {
        class_record_id: args.classRecordId,
        booking_id: args.bookingId,
        teacher_id: args.teacherId,
        student_id: args.studentId,
        storage_path: args.url,
      };
      const { data, error } = await sb
        .from('screenshots')
        .insert(payload)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[screenshotsCloudRepo.insert] error', error.message);
        return { screenshot: null, error: error.message };
      }
      return { screenshot: toModel(data as unknown as DbScreenshotRow) };
    } catch (err: any) {
      console.warn('[screenshotsCloudRepo.insert] exception', err);
      return { screenshot: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async update(
    id: string,
    patch: ScreenshotUpdatePatch,
  ): Promise<{ screenshot: Screenshot | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const dbPatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (patch.verified !== undefined) dbPatch.verified = patch.verified;
      const { data, error } = await sb
        .from('screenshots')
        .update(dbPatch)
        .eq('id', id)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[screenshotsCloudRepo.update] error', error.message);
        return { screenshot: null, error: error.message };
      }
      return { screenshot: toModel(data as unknown as DbScreenshotRow) };
    } catch (err: any) {
      console.warn('[screenshotsCloudRepo.update] exception', err);
      return { screenshot: null, error: err?.message ?? 'unknown_error' };
    }
  },
};
