// ============================================================================
// Wordlish · Repositorio del expediente único de clase (Cloud real) — Módulo #9.
//
// Capa async pura sobre `public.class_records`. El facade sincrónico
// (`classRecordsRepo`) para consumidores legacy se expone desde
// `services/classRecordsService.ts` y comparte cache.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { ClassRecord, ClassRecordStatus, ClassKind } from '@/types';

// Subject id ↔ name cache local (mismo patrón que bookings).
const subjectIdToName = new Map<string, string>();
const subjectNameToId = new Map<string, string>();
let subjectsHydrated = false;
let subjectsInflight: Promise<void> | null = null;

async function ensureSubjectCache(): Promise<void> {
  if (subjectsHydrated) return;
  if (subjectsInflight) return subjectsInflight;
  subjectsInflight = (async () => {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb.from('subjects').select('id, name, code');
      if (error) {
        console.warn('[classRecords.ensureSubjectCache] error', error.message);
        return;
      }
      (data ?? []).forEach((row: any) => {
        if (!row?.id || !row?.name) return;
        subjectIdToName.set(row.id, row.name);
        subjectNameToId.set(String(row.name).trim().toLowerCase(), row.id);
      });
      subjectsHydrated = true;
    } catch (err) {
      console.warn('[classRecords.ensureSubjectCache] exception', err);
    } finally {
      subjectsInflight = null;
    }
  })();
  return subjectsInflight;
}

function resolveSubjectId(name: string): string | null {
  if (!name) return null;
  const base = name.split(' · ')[0].trim().toLowerCase();
  return subjectNameToId.get(base) ?? null;
}
function resolveSubjectName(id: string): string {
  return subjectIdToName.get(id) ?? '';
}

interface DbClassRecordRow {
  id: string;
  booking_id: string;
  student_id: string;
  teacher_id: string;
  guardian_id: string | null;
  subject_id: string;
  kind: ClassKind;
  scheduled_date: string;
  scheduled_time: string;
  status: ClassRecordStatus;
  zoom_url: string | null;
  zoom_meeting_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  student_joined_at: string | null;
  teacher_joined_at: string | null;
  screenshot_id: string | null;
  report_id: string | null;
  student_topic: string | null;
  student_material_submitted_at: string | null;
  observations: string | null;
  supervisor_notes: string | null;
  substitute_assigned: boolean;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  'id, booking_id, student_id, teacher_id, guardian_id, subject_id, kind, scheduled_date, scheduled_time, status, zoom_url, zoom_meeting_id, started_at, ended_at, student_joined_at, teacher_joined_at, screenshot_id, report_id, student_topic, student_material_submitted_at, observations, supervisor_notes, substitute_assigned, created_at, updated_at';

function toModel(row: DbClassRecordRow): ClassRecord {
  return {
    id: row.id,
    bookingId: row.booking_id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    guardianId: row.guardian_id,
    subject: resolveSubjectName(row.subject_id),
    kind: row.kind,
    date: row.scheduled_date,
    time: (row.scheduled_time ?? '').slice(0, 5),
    status: row.status,
    zoomUrl: row.zoom_url ?? '',
    zoomMeetingId: row.zoom_meeting_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    studentJoinedAt: row.student_joined_at,
    teacherJoinedAt: row.teacher_joined_at,
    screenshotId: row.screenshot_id,
    reportId: row.report_id,
    materialIds: [],
    observations: row.observations,
    supervisorNotes: row.supervisor_notes,
    substituteAssigned: row.substitute_assigned,
    studentTopic: row.student_topic,
    studentMaterialSubmittedAt: row.student_material_submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTime(t: string): string {
  if (!t) return '00:00:00';
  return t.length === 5 ? `${t}:00` : t;
}

export interface ClassRecordCreateArgs {
  bookingId: string;
  studentId: string;
  teacherId: string;
  guardianId: string | null;
  subject: string;
  date: string;
  time: string;
  zoomUrl: string;
  kind?: ClassKind;
}

export interface ClassRecordUpdatePatch {
  status?: ClassRecordStatus;
  date?: string;
  time?: string;
  zoomUrl?: string;
  zoomMeetingId?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  studentJoinedAt?: string | null;
  teacherJoinedAt?: string | null;
  screenshotId?: string | null;
  reportId?: string | null;
  studentTopic?: string | null;
  studentMaterialSubmittedAt?: string | null;
  observations?: string | null;
  supervisorNotes?: string | null;
  substituteAssigned?: boolean;
}

export const classRecordsCloudRepo = {
  async list(): Promise<ClassRecord[]> {
    await ensureSubjectCache();
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('class_records')
        .select(SELECT_COLS)
        .order('starts_at', { ascending: true });
      if (error) {
        console.warn('[classRecordsCloudRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbClassRecordRow));
    } catch (err) {
      console.warn('[classRecordsCloudRepo.list] exception', err);
      return [];
    }
  },

  async getById(id: string): Promise<ClassRecord | null> {
    await ensureSubjectCache();
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('class_records')
        .select(SELECT_COLS)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('[classRecordsCloudRepo.getById] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbClassRecordRow) : null;
    } catch (err) {
      console.warn('[classRecordsCloudRepo.getById] exception', err);
      return null;
    }
  },

  async insert(
    args: ClassRecordCreateArgs,
  ): Promise<{ record: ClassRecord | null; error?: string }> {
    await ensureSubjectCache();
    const subject_id = resolveSubjectId(args.subject);
    if (!subject_id) {
      return {
        record: null,
        error: `Materia no resuelta en Cloud: ${args.subject}`,
      };
    }
    try {
      const sb = getSupabaseClient();
      const payload: Record<string, unknown> = {
        booking_id: args.bookingId,
        student_id: args.studentId,
        teacher_id: args.teacherId,
        guardian_id: args.guardianId ?? null,
        subject_id,
        kind: args.kind ?? 'personal',
        scheduled_date: args.date,
        scheduled_time: normalizeTime(args.time),
        status: 'scheduled',
        zoom_url: args.zoomUrl,
      };
      const { data, error } = await sb
        .from('class_records')
        .insert(payload)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[classRecordsCloudRepo.insert] error', error.message);
        return { record: null, error: error.message };
      }
      return { record: toModel(data as unknown as DbClassRecordRow) };
    } catch (err: any) {
      console.warn('[classRecordsCloudRepo.insert] exception', err);
      return { record: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async update(
    id: string,
    patch: ClassRecordUpdatePatch,
  ): Promise<{ record: ClassRecord | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const dbPatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.date !== undefined) dbPatch.scheduled_date = patch.date;
      if (patch.time !== undefined) dbPatch.scheduled_time = normalizeTime(patch.time);
      if (patch.zoomUrl !== undefined) dbPatch.zoom_url = patch.zoomUrl;
      if (patch.zoomMeetingId !== undefined) dbPatch.zoom_meeting_id = patch.zoomMeetingId;
      if (patch.startedAt !== undefined) dbPatch.started_at = patch.startedAt;
      if (patch.endedAt !== undefined) dbPatch.ended_at = patch.endedAt;
      if (patch.studentJoinedAt !== undefined) dbPatch.student_joined_at = patch.studentJoinedAt;
      if (patch.teacherJoinedAt !== undefined) dbPatch.teacher_joined_at = patch.teacherJoinedAt;
      if (patch.screenshotId !== undefined) dbPatch.screenshot_id = patch.screenshotId;
      if (patch.reportId !== undefined) dbPatch.report_id = patch.reportId;
      if (patch.studentTopic !== undefined) dbPatch.student_topic = patch.studentTopic;
      if (patch.studentMaterialSubmittedAt !== undefined) dbPatch.student_material_submitted_at = patch.studentMaterialSubmittedAt;
      if (patch.observations !== undefined) dbPatch.observations = patch.observations;
      if (patch.supervisorNotes !== undefined) dbPatch.supervisor_notes = patch.supervisorNotes;
      if (patch.substituteAssigned !== undefined) dbPatch.substitute_assigned = patch.substituteAssigned;
      const { data, error } = await sb
        .from('class_records')
        .update(dbPatch)
        .eq('id', id)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[classRecordsCloudRepo.update] error', error.message);
        return { record: null, error: error.message };
      }
      return { record: toModel(data as unknown as DbClassRecordRow) };
    } catch (err: any) {
      console.warn('[classRecordsCloudRepo.update] exception', err);
      return { record: null, error: err?.message ?? 'unknown_error' };
    }
  },
};
