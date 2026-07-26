// ============================================================================
// Wordlish · Servicio de expedientes de clase (ClassRecords).
// Cache + hidratación + suscripción + facade sincrónico sobre
// classRecordsCloudRepo (Cloud real). Expone `classRecordsRepo` compatible
// con consumidores legacy (BookingsContext, classService, reports,
// screenshots, materials, useClassManager).
// ============================================================================

import type { ClassRecord, ClassRecordStatus } from '@/types';
import {
  classRecordsCloudRepo,
  type ClassRecordCreateArgs,
  type ClassRecordUpdatePatch,
} from '@/repositories/classes';
import { mockDb } from './mockDb';
import { filterBookings, type SecurityContext } from './securityService';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}

function localId(): string {
  return 'cr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

let cache: ClassRecord[] = [...mockDb.classRecords];
let hydrated = false;
let inflight: Promise<ClassRecord[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[classRecordsService] listener error', err);
    }
  });
}

export function getClassRecords(): ClassRecord[] {
  return cache;
}
export function getClassRecordsVersion(): number {
  return version;
}
export function isClassRecordsHydrated(): boolean {
  return hydrated;
}
export function subscribeClassRecords(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hydrateClassRecords(force = false): Promise<ClassRecord[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const list = await classRecordsCloudRepo.list();
    if (list.length > 0) {
      cache = list;
    }
    hydrated = true;
    notify();
    inflight = null;
    return cache;
  })();
  return inflight;
}

// Facade sincrónico backward-compatible con el antiguo classRecordsRepo.
export const classRecordsRepo = {
  list(): ClassRecord[] {
    return cache;
  },
  listForUser(ctx: SecurityContext | null): ClassRecord[] {
    return filterBookings(ctx, cache);
  },
  findById(id: string): ClassRecord | undefined {
    return cache.find((c) => c.id === id);
  },
  findByBookingId(bookingId: string): ClassRecord | undefined {
    return cache.find((c) => c.bookingId === bookingId);
  },

  createFromBooking(booking: {
    id: string;
    studentId: string;
    teacherId: string;
    guardianId: string | null;
    subject: string;
    date: string;
    time: string;
    zoomUrl: string;
  }): ClassRecord {
    const nowIso = new Date().toISOString();
    const cr: ClassRecord = {
      id: localId(),
      bookingId: booking.id,
      studentId: booking.studentId,
      teacherId: booking.teacherId,
      guardianId: booking.guardianId,
      subject: booking.subject,
      date: booking.date,
      time: booking.time,
      status: 'scheduled',
      zoomUrl: booking.zoomUrl,
      zoomMeetingId: null,
      startedAt: null,
      endedAt: null,
      studentJoinedAt: null,
      teacherJoinedAt: null,
      screenshotId: null,
      reportId: null,
      materialIds: [],
      observations: null,
      supervisorNotes: null,
      substituteAssigned: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    cache = [...cache, cr];
    notify();

    if (
      isUuid(booking.id) &&
      isUuid(booking.studentId) &&
      isUuid(booking.teacherId)
    ) {
      const args: ClassRecordCreateArgs = {
        bookingId: booking.id,
        studentId: booking.studentId,
        teacherId: booking.teacherId,
        guardianId: booking.guardianId,
        subject: booking.subject,
        date: booking.date,
        time: booking.time,
        zoomUrl: booking.zoomUrl,
      };
      classRecordsCloudRepo
        .insert(args)
        .then(({ record, error }) => {
          if (error || !record) {
            console.warn('[classRecordsService.createFromBooking] Cloud falló:', error);
            return;
          }
          cache = cache.map((x) => (x.id === cr.id ? record : x));
          notify();
        })
        .catch((err) =>
          console.warn('[classRecordsService.createFromBooking] exception:', err),
        );
    }
    return cr;
  },

  updateStatus(
    id: string,
    status: ClassRecordStatus,
    patch?: Partial<ClassRecord>,
  ): ClassRecord | undefined {
    if (!id) return undefined;
    const prev = cache.find((c) => c.id === id);
    if (!prev) return undefined;
    const updated: ClassRecord = {
      ...prev,
      ...(patch ?? {}),
      status,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((c) => (c.id === id ? updated : c));
    notify();

    if (isUuid(id)) {
      const cloudPatch: ClassRecordUpdatePatch = { status };
      if (patch) {
        if (patch.date !== undefined) cloudPatch.date = patch.date;
        if (patch.time !== undefined) cloudPatch.time = patch.time;
        if (patch.startedAt !== undefined) cloudPatch.startedAt = patch.startedAt;
        if (patch.endedAt !== undefined) cloudPatch.endedAt = patch.endedAt;
        if (patch.studentJoinedAt !== undefined) cloudPatch.studentJoinedAt = patch.studentJoinedAt;
        if (patch.teacherJoinedAt !== undefined) cloudPatch.teacherJoinedAt = patch.teacherJoinedAt;
        if (patch.observations !== undefined) cloudPatch.observations = patch.observations;
        if (patch.supervisorNotes !== undefined) cloudPatch.supervisorNotes = patch.supervisorNotes;
        if (patch.substituteAssigned !== undefined) cloudPatch.substituteAssigned = patch.substituteAssigned;
        if (patch.studentTopic !== undefined) cloudPatch.studentTopic = patch.studentTopic;
        if (patch.studentMaterialSubmittedAt !== undefined) cloudPatch.studentMaterialSubmittedAt = patch.studentMaterialSubmittedAt;
        if (patch.zoomUrl !== undefined) cloudPatch.zoomUrl = patch.zoomUrl;
        if (patch.zoomMeetingId !== undefined) cloudPatch.zoomMeetingId = patch.zoomMeetingId;
      }
      classRecordsCloudRepo
        .update(id, cloudPatch)
        .then(({ record, error }) => {
          if (error) {
            console.warn('[classRecordsService.updateStatus] Cloud falló, revierte:', error);
            cache = cache.map((c) => (c.id === id ? prev : c));
            notify();
            return;
          }
          if (record) {
            cache = cache.map((c) => (c.id === id ? record : c));
            notify();
          }
        })
        .catch((err) =>
          console.warn('[classRecordsService.updateStatus] exception:', err),
        );
    }
    return updated;
  },

  attachReport(id: string, reportId: string): ClassRecord | undefined {
    const prev = cache.find((c) => c.id === id);
    if (!prev) return undefined;
    const updated: ClassRecord = {
      ...prev,
      reportId,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((c) => (c.id === id ? updated : c));
    notify();
    if (isUuid(id)) {
      classRecordsCloudRepo
        .update(id, { reportId })
        .catch((err) =>
          console.warn('[classRecordsService.attachReport] exception:', err),
        );
    }
    return updated;
  },

  attachScreenshot(id: string, screenshotId: string): ClassRecord | undefined {
    const prev = cache.find((c) => c.id === id);
    if (!prev) return undefined;
    const updated: ClassRecord = {
      ...prev,
      screenshotId,
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((c) => (c.id === id ? updated : c));
    notify();
    if (isUuid(id)) {
      classRecordsCloudRepo
        .update(id, { screenshotId })
        .catch((err) =>
          console.warn('[classRecordsService.attachScreenshot] exception:', err),
        );
    }
    return updated;
  },

  attachMaterial(id: string, materialId: string): ClassRecord | undefined {
    const prev = cache.find((c) => c.id === id);
    if (!prev) return undefined;
    const updated: ClassRecord = {
      ...prev,
      materialIds: [...prev.materialIds, materialId],
      updatedAt: new Date().toISOString(),
    };
    cache = cache.map((c) => (c.id === id ? updated : c));
    notify();
    // materialIds no se persiste en Cloud (los materials ya referencian
    // class_record_id vía FK). Solo actualizamos updated_at si es UUID.
    if (isUuid(id)) {
      classRecordsCloudRepo
        .update(id, {})
        .catch((err) =>
          console.warn('[classRecordsService.attachMaterial] exception:', err),
        );
    }
    return updated;
  },
};

export function resetClassRecordsCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}
