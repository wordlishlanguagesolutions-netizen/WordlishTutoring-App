// ============================================================================
// Wordlish · Repositorio de reservas (Cloud real) — Módulo #7 migrado.
//
// Capa async pura sobre `public.bookings` + helpers para `public.booking_holds`.
// El facade sincrónico (`bookingsRepo`) para consumidores legacy se expone
// desde `services/bookingsService.ts` y comparte cache.
//
// Estrategia de nomenclatura:
//   · `subject` (nombre) ↔ `subject_id` (uuid) se resuelve vía cache local
//     poblado bajo demanda desde `public.subjects`.
//   · `time` se recibe en formato "HH:mm" y se normaliza a "HH:mm:ss" en Cloud.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { Booking, BookingStatus } from '@/types';

// ---------------------------------------------------------------------------
// Subject id ↔ name cache.
// ---------------------------------------------------------------------------
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
      const { data, error } = await sb
        .from('subjects')
        .select('id, name, code');
      if (error) {
        console.warn('[bookings.ensureSubjectCache] error', error.message);
        return;
      }
      (data ?? []).forEach((row: any) => {
        if (!row?.id || !row?.name) return;
        subjectIdToName.set(row.id, row.name);
        subjectNameToId.set(String(row.name).trim().toLowerCase(), row.id);
      });
      subjectsHydrated = true;
    } catch (err) {
      console.warn('[bookings.ensureSubjectCache] exception', err);
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

// ---------------------------------------------------------------------------
// Row mapping.
// ---------------------------------------------------------------------------
interface DbBookingRow {
  id: string;
  student_id: string;
  guardian_id: string | null;
  teacher_id: string;
  substitute_id: string | null;
  subject_id: string;
  package_id: string | null;
  class_record_id: string | null;
  kind: 'personal' | 'group';
  scheduled_date: string;
  scheduled_time: string;
  duration_min: number;
  status: BookingStatus;
  zoom_url: string | null;
  hour_consumed: boolean;
  student_name: string | null;
  teacher_name: string | null;
  student_avatar: string | null;
  teacher_avatar: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

const SELECT_COLS =
  'id, student_id, guardian_id, teacher_id, substitute_id, subject_id, package_id, class_record_id, kind, scheduled_date, scheduled_time, duration_min, status, zoom_url, hour_consumed, student_name, teacher_name, student_avatar, teacher_avatar, created_at, updated_at, created_by, updated_by';

function toModel(row: DbBookingRow): Booking {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name ?? '',
    studentAvatar: row.student_avatar ?? '',
    teacherId: row.teacher_id,
    teacherName: row.teacher_name ?? '',
    teacherAvatar: row.teacher_avatar ?? '',
    substituteId: row.substitute_id,
    substituteName: null,
    subject: resolveSubjectName(row.subject_id),
    date: row.scheduled_date,
    time: (row.scheduled_time ?? '').slice(0, 5),
    durationMin: row.duration_min,
    status: row.status,
    zoomUrl: row.zoom_url ?? '',
    hourConsumed: row.hour_consumed,
    packageId: row.package_id,
    classRecordId: row.class_record_id,
    guardianId: row.guardian_id,
    createdBy: row.created_by ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTime(t: string): string {
  if (!t) return '00:00:00';
  return t.length === 5 ? `${t}:00` : t;
}

// ---------------------------------------------------------------------------
// Args tipados.
// ---------------------------------------------------------------------------
export interface BookingCreateArgs {
  studentId: string;
  studentName: string;
  studentAvatar: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  subject: string;
  date: string;
  time: string;
  durationMin?: number;
  status: BookingStatus;
  zoomUrl: string;
  hourConsumed: boolean;
  packageId?: string | null;
  guardianId?: string | null;
  classRecordId?: string | null;
  createdBy?: string;
  kind?: 'personal' | 'group';
}

export interface BookingUpdatePatch {
  status?: BookingStatus;
  hourConsumed?: boolean;
  date?: string;
  time?: string;
  classRecordId?: string | null;
  substituteId?: string | null;
  substituteName?: string | null;
  zoomUrl?: string;
}

// ---------------------------------------------------------------------------
// Cloud async API.
// ---------------------------------------------------------------------------
export const bookingsCloudRepo = {
  async list(): Promise<Booking[]> {
    await ensureSubjectCache();
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('bookings')
        .select(SELECT_COLS)
        .order('starts_at', { ascending: true });
      if (error) {
        console.warn('[bookingsCloudRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbBookingRow));
    } catch (err) {
      console.warn('[bookingsCloudRepo.list] exception', err);
      return [];
    }
  },

  async listForStudent(studentId: string): Promise<Booking[]> {
    await ensureSubjectCache();
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('bookings')
        .select(SELECT_COLS)
        .eq('student_id', studentId)
        .order('starts_at', { ascending: true });
      if (error) {
        console.warn('[bookingsCloudRepo.listForStudent] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbBookingRow));
    } catch (err) {
      console.warn('[bookingsCloudRepo.listForStudent] exception', err);
      return [];
    }
  },

  async listForTeacher(teacherId: string): Promise<Booking[]> {
    await ensureSubjectCache();
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('bookings')
        .select(SELECT_COLS)
        .eq('teacher_id', teacherId)
        .order('starts_at', { ascending: true });
      if (error) {
        console.warn('[bookingsCloudRepo.listForTeacher] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbBookingRow));
    } catch (err) {
      console.warn('[bookingsCloudRepo.listForTeacher] exception', err);
      return [];
    }
  },

  async listByDate(date: string): Promise<Booking[]> {
    await ensureSubjectCache();
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('bookings')
        .select(SELECT_COLS)
        .eq('scheduled_date', date)
        .order('scheduled_time', { ascending: true });
      if (error) {
        console.warn('[bookingsCloudRepo.listByDate] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbBookingRow));
    } catch (err) {
      console.warn('[bookingsCloudRepo.listByDate] exception', err);
      return [];
    }
  },

  async getById(id: string): Promise<Booking | null> {
    await ensureSubjectCache();
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('bookings')
        .select(SELECT_COLS)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('[bookingsCloudRepo.getById] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbBookingRow) : null;
    } catch (err) {
      console.warn('[bookingsCloudRepo.getById] exception', err);
      return null;
    }
  },

  async insert(
    args: BookingCreateArgs,
  ): Promise<{ booking: Booking | null; error?: string }> {
    await ensureSubjectCache();
    const subject_id = resolveSubjectId(args.subject);
    if (!subject_id) {
      return {
        booking: null,
        error: `Materia no resuelta en Cloud: ${args.subject}`,
      };
    }
    try {
      const sb = getSupabaseClient();
      const payload: Record<string, unknown> = {
        student_id: args.studentId,
        teacher_id: args.teacherId,
        guardian_id: args.guardianId ?? null,
        subject_id,
        package_id: args.packageId ?? null,
        class_record_id: args.classRecordId ?? null,
        kind: args.kind ?? 'personal',
        scheduled_date: args.date,
        scheduled_time: normalizeTime(args.time),
        duration_min: args.durationMin ?? 60,
        status: args.status,
        zoom_url: args.zoomUrl,
        hour_consumed: args.hourConsumed,
        student_name: args.studentName,
        teacher_name: args.teacherName,
        student_avatar: args.studentAvatar,
        teacher_avatar: args.teacherAvatar,
        created_by: args.createdBy || null,
      };
      const { data, error } = await sb
        .from('bookings')
        .insert(payload)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[bookingsCloudRepo.insert] error', error.message);
        return { booking: null, error: error.message };
      }
      return { booking: toModel(data as unknown as DbBookingRow) };
    } catch (err: any) {
      console.warn('[bookingsCloudRepo.insert] exception', err);
      return { booking: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async update(
    id: string,
    patch: BookingUpdatePatch,
  ): Promise<{ booking: Booking | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const dbPatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.hourConsumed !== undefined) dbPatch.hour_consumed = patch.hourConsumed;
      if (patch.date !== undefined) dbPatch.scheduled_date = patch.date;
      if (patch.time !== undefined) dbPatch.scheduled_time = normalizeTime(patch.time);
      if (patch.classRecordId !== undefined) dbPatch.class_record_id = patch.classRecordId;
      if (patch.substituteId !== undefined) dbPatch.substitute_id = patch.substituteId;
      if (patch.zoomUrl !== undefined) dbPatch.zoom_url = patch.zoomUrl;
      const { data, error } = await sb
        .from('bookings')
        .update(dbPatch)
        .eq('id', id)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[bookingsCloudRepo.update] error', error.message);
        return { booking: null, error: error.message };
      }
      return { booking: toModel(data as unknown as DbBookingRow) };
    } catch (err: any) {
      console.warn('[bookingsCloudRepo.update] exception', err);
      return { booking: null, error: err?.message ?? 'unknown_error' };
    }
  },
};

// ---------------------------------------------------------------------------
// Booking holds Cloud (fire-and-forget desde el context).
// ---------------------------------------------------------------------------
export const bookingHoldsCloudRepo = {
  async insertHold(args: {
    teacherId: string;
    studentId?: string | null;
    userId: string;
    date: string;
    time: string;
    expiresAt: Date;
  }): Promise<{ id: string | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const payload: Record<string, unknown> = {
        teacher_id: args.teacherId,
        student_id: args.studentId ?? null,
        user_id: args.userId,
        scheduled_date: args.date,
        scheduled_time: normalizeTime(args.time),
        status: 'active',
        expires_at: args.expiresAt.toISOString(),
      };
      const { data, error } = await sb
        .from('booking_holds')
        .insert(payload)
        .select('id')
        .single();
      if (error) {
        console.warn('[bookingHoldsCloudRepo.insertHold] error', error.message);
        return { id: null, error: error.message };
      }
      return { id: (data as any)?.id ?? null };
    } catch (err: any) {
      console.warn('[bookingHoldsCloudRepo.insertHold] exception', err);
      return { id: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async releaseHold(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const { error } = await sb
        .from('booking_holds')
        .update({ status: 'released', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        console.warn('[bookingHoldsCloudRepo.releaseHold] error', error.message);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err: any) {
      console.warn('[bookingHoldsCloudRepo.releaseHold] exception', err);
      return { ok: false, error: err?.message ?? 'unknown_error' };
    }
  },
};
