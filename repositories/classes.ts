// Wordlish · Repositorio del expediente único de clase (ClassRecord)
// Cada Booking creado genera automáticamente un ClassRecord.
// A este expediente se enganchan reports, screenshots y materials.

import type { ClassRecord, ClassRecordStatus } from '@/types';
import { mockDb, makeId } from '@/services/mockDb';
import { BaseRepository } from './base';
import { SecurityContext, filterBookings } from '@/services/securityService';

interface BookingSeed {
  id: string;
  studentId: string;
  teacherId: string;
  guardianId: string | null;
  subject: string;
  date: string;
  time: string;
  zoomUrl: string;
}

class ClassRecordsRepository extends BaseRepository<ClassRecord> {
  constructor() {
    super(mockDb.classRecords);
  }

  listForUser(ctx: SecurityContext | null): ClassRecord[] {
    return filterBookings(ctx, this.list());
  }

  findByBookingId(bookingId: string): ClassRecord | undefined {
    return this.store.find((c) => c.bookingId === bookingId);
  }

  createFromBooking(booking: BookingSeed): ClassRecord {
    const nowIso = new Date().toISOString();
    const cr: ClassRecord = {
      id: makeId('cr'),
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
    return this._insert(cr);
  }

  updateStatus(
    id: string,
    status: ClassRecordStatus,
    patch?: Partial<ClassRecord>,
  ): ClassRecord | undefined {
    if (!id) return undefined;
    return this._update(id, {
      status,
      ...patch,
      updatedAt: new Date().toISOString(),
    } as Partial<ClassRecord>);
  }

  attachReport(id: string, reportId: string): ClassRecord | undefined {
    return this._update(id, {
      reportId,
      updatedAt: new Date().toISOString(),
    } as Partial<ClassRecord>);
  }

  attachScreenshot(id: string, screenshotId: string): ClassRecord | undefined {
    return this._update(id, {
      screenshotId,
      updatedAt: new Date().toISOString(),
    } as Partial<ClassRecord>);
  }

  attachMaterial(id: string, materialId: string): ClassRecord | undefined {
    const cr = this.findById(id);
    if (!cr) return undefined;
    return this._update(id, {
      materialIds: [...cr.materialIds, materialId],
      updatedAt: new Date().toISOString(),
    } as Partial<ClassRecord>);
  }
}

export const classRecordsRepo = new ClassRecordsRepository();
