// ============================================================================
// Wordlish · Repositorio de reportes (Cloud real) — Módulo #12.
//
// Capa async pura sobre `public.reports`. El facade sincrónico
// (`reportsRepo`) para consumidores legacy se expone desde
// `services/reportsService.ts` y comparte cache.
//
// Regla dura preservada: un reporte SIEMPRE pertenece a un ClassRecord.
// Ciclo de vida: draft -> sent -> read -> confirmed.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { Report, ReportStatus } from '@/types';

interface DbReportRow {
  id: string;
  class_record_id: string;
  booking_id: string;
  teacher_id: string;
  student_id: string;
  topic: string;
  progress: string;
  objectives: string;
  strengths: string;
  improvements: string;
  homework: string | null;
  guardian_notes: string | null;
  rating: number | null;
  attachments: string[];
  status: ReportStatus;
  submitted_at: string | null;
  read_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  'id, class_record_id, booking_id, teacher_id, student_id, topic, progress, objectives, strengths, improvements, homework, guardian_notes, rating, attachments, status, submitted_at, read_at, confirmed_at, created_at, updated_at';

function toModel(row: DbReportRow): Report {
  return {
    id: row.id,
    classRecordId: row.class_record_id,
    bookingId: row.booking_id,
    teacherId: row.teacher_id,
    studentId: row.student_id,
    topic: row.topic,
    progress: row.progress,
    objectives: row.objectives,
    strengths: row.strengths,
    improvements: row.improvements,
    homework: row.homework,
    guardianNotes: row.guardian_notes,
    rating: row.rating,
    attachments: row.attachments ?? [],
    status: row.status,
    submittedAt: row.submitted_at ?? row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ReportCreateArgs {
  classRecordId: string;
  bookingId: string;
  teacherId: string;
  studentId: string;
  topic: string;
  progress: string;
  objectives: string;
  strengths: string;
  improvements: string;
  homework: string | null;
  guardianNotes: string | null;
  rating: number | null;
  attachments: string[];
  status: ReportStatus;
}

export interface ReportUpdatePatch {
  topic?: string;
  progress?: string;
  objectives?: string;
  strengths?: string;
  improvements?: string;
  homework?: string | null;
  guardianNotes?: string | null;
  rating?: number | null;
  attachments?: string[];
  status?: ReportStatus;
  readAt?: string | null;
  confirmedAt?: string | null;
}

export const reportsCloudRepo = {
  async list(): Promise<Report[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('reports')
        .select(SELECT_COLS)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[reportsCloudRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbReportRow));
    } catch (err) {
      console.warn('[reportsCloudRepo.list] exception', err);
      return [];
    }
  },

  async insert(
    args: ReportCreateArgs,
  ): Promise<{ report: Report | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const payload: Record<string, unknown> = {
        class_record_id: args.classRecordId,
        booking_id: args.bookingId,
        teacher_id: args.teacherId,
        student_id: args.studentId,
        topic: args.topic,
        progress: args.progress,
        objectives: args.objectives,
        strengths: args.strengths,
        improvements: args.improvements,
        homework: args.homework,
        guardian_notes: args.guardianNotes,
        rating: args.rating,
        attachments: args.attachments,
        status: args.status,
        submitted_at: args.status !== 'draft' ? new Date().toISOString() : null,
      };
      const { data, error } = await sb
        .from('reports')
        .insert(payload)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[reportsCloudRepo.insert] error', error.message);
        return { report: null, error: error.message };
      }
      return { report: toModel(data as unknown as DbReportRow) };
    } catch (err: any) {
      console.warn('[reportsCloudRepo.insert] exception', err);
      return { report: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async update(
    id: string,
    patch: ReportUpdatePatch,
  ): Promise<{ report: Report | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const dbPatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (patch.topic !== undefined) dbPatch.topic = patch.topic;
      if (patch.progress !== undefined) dbPatch.progress = patch.progress;
      if (patch.objectives !== undefined) dbPatch.objectives = patch.objectives;
      if (patch.strengths !== undefined) dbPatch.strengths = patch.strengths;
      if (patch.improvements !== undefined) dbPatch.improvements = patch.improvements;
      if (patch.homework !== undefined) dbPatch.homework = patch.homework;
      if (patch.guardianNotes !== undefined) dbPatch.guardian_notes = patch.guardianNotes;
      if (patch.rating !== undefined) dbPatch.rating = patch.rating;
      if (patch.attachments !== undefined) dbPatch.attachments = patch.attachments;
      if (patch.status !== undefined) {
        dbPatch.status = patch.status;
        if (patch.status === 'read' && patch.readAt === undefined) {
          dbPatch.read_at = new Date().toISOString();
        }
        if (patch.status === 'confirmed' && patch.confirmedAt === undefined) {
          dbPatch.confirmed_at = new Date().toISOString();
        }
      }
      if (patch.readAt !== undefined) dbPatch.read_at = patch.readAt;
      if (patch.confirmedAt !== undefined) dbPatch.confirmed_at = patch.confirmedAt;
      const { data, error } = await sb
        .from('reports')
        .update(dbPatch)
        .eq('id', id)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[reportsCloudRepo.update] error', error.message);
        return { report: null, error: error.message };
      }
      return { report: toModel(data as unknown as DbReportRow) };
    } catch (err: any) {
      console.warn('[reportsCloudRepo.update] exception', err);
      return { report: null, error: err?.message ?? 'unknown_error' };
    }
  },
};
