// Wordlish · Class management service (lógica pura, sin React).
// Cubre el ciclo de vida completo: antes, durante y después de la clase.
// Todo evento se registra en el timeline (classEventsRepo).

import type {
  ClassRecord,
  ClassRecordStatus,
  Material,
  MaterialKind,
  Report,
  Screenshot,
  SpecificRole,
} from '@/types';
import { mockDb } from './mockDb';
import {
  classRecordsRepo,
  classEventsRepo,
  materialsRepo,
  reportsRepo,
  screenshotsRepo,
  packagesRepo,
  bookingsRepo,
} from '@/repositories';
import { createNotification } from './notificationService';
import { MATERIAL_LOCK_MS } from '@/constants/policies';

export { MATERIAL_LOCK_MS };

// ============= HELPERS =============
export function computeStartTs(cr: ClassRecord): number {
  return new Date(`${cr.date}T${cr.time}:00`).getTime();
}
export function computeEndTs(cr: ClassRecord, durationMin = 60): number {
  return computeStartTs(cr) + durationMin * 60 * 1000;
}

export interface ClassTimers {
  phase: 'before' | 'during' | 'after';
  msUntilStart: number;
  msSinceStart: number;
  msRemaining: number;
  canUploadMaterial: boolean;
  materialLockAt: number;
  scheduledEndTs: number;
}

export function getTimers(cr: ClassRecord, now = Date.now(), durationMin = 60): ClassTimers {
  const start = computeStartTs(cr);
  const end = start + durationMin * 60 * 1000;
  const started = cr.startedAt ? new Date(cr.startedAt).getTime() : null;
  const ended = cr.endedAt ? new Date(cr.endedAt).getTime() : null;
  let phase: 'before' | 'during' | 'after';
  if (ended) phase = 'after';
  else if (started) phase = 'during';
  else if (now >= start) phase = 'during';
  else phase = 'before';
  const msUntilStart = start - now;
  return {
    phase,
    msUntilStart,
    msSinceStart: started ? now - started : Math.max(0, now - start),
    msRemaining: Math.max(0, end - now),
    canUploadMaterial: msUntilStart > MATERIAL_LOCK_MS && !started && !ended,
    materialLockAt: start - MATERIAL_LOCK_MS,
    scheduledEndTs: end,
  };
}

function userIdForTeacher(id: string): string | null {
  return mockDb.teachers.find((t) => t.id === id)?.userId ?? null;
}
function userIdForStudent(id: string): string | null {
  return mockDb.students.find((s) => s.id === id)?.userId ?? null;
}
function userIdForGuardian(id: string | null): string | null {
  if (!id) return null;
  return mockDb.guardians.find((g) => g.id === id)?.userId ?? null;
}

function log(cr: ClassRecord, type: any, actorId: string, actorRole: SpecificRole, message: string) {
  classEventsRepo.append({ classRecordId: cr.id, type, actorId, actorRole, message });
}

// ============= PRE-CLASS =============
export function uploadStudentMaterial(args: {
  classRecordId: string;
  actorId: string;
  actorRole: SpecificRole;
  title: string;
  kind?: MaterialKind;
}): Material {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  if (!getTimers(cr).canUploadMaterial) throw new Error('El plazo para subir material se cerró.');
  const m = materialsRepo.createForClass({
    classRecordId: cr.id,
    bookingId: cr.bookingId,
    teacherId: cr.teacherId,
    studentId: cr.studentId,
    title: args.title,
    description: null,
    kind: args.kind ?? 'PDF',
    url: `mock://materials/${cr.id}/${encodeURIComponent(args.title)}`,
    size: '—',
    source: 'student',
  });
  classRecordsRepo.updateStatus(cr.id, cr.status, {
    studentMaterialSubmittedAt: new Date().toISOString(),
  });
  log(cr, 'material_received', args.actorId, args.actorRole, `Material recibido: ${args.title}`);
  const teacherUserId = userIdForTeacher(cr.teacherId);
  if (teacherUserId) {
    createNotification({
      userId: teacherUserId,
      type: 'new_material',
      message: `${args.title} · ${cr.subject}`,
      refType: 'material',
      refId: m.id,
      actionRoute: `/class/${cr.id}`,
    });
  }
  return m;
}

export function setStudentTopic(args: {
  classRecordId: string;
  topic: string;
  actorId: string;
  actorRole: SpecificRole;
}): ClassRecord {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  const updated = classRecordsRepo.updateStatus(cr.id, cr.status, { studentTopic: args.topic }) ?? cr;
  log(cr, 'topic_received', args.actorId, args.actorRole, `Tema definido: ${args.topic}`);
  return updated;
}

// ============= DURING CLASS =============
export function startClass(args: { classRecordId: string; actorId: string; actorRole: SpecificRole }): ClassRecord {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  if (cr.startedAt) return cr;
  const nowIso = new Date().toISOString();
  const updated = classRecordsRepo.updateStatus(cr.id, 'in_progress', {
    startedAt: nowIso,
    teacherJoinedAt: nowIso,
  })!;
  log(updated, 'class_started', args.actorId, args.actorRole, 'Clase iniciada');
  return updated;
}

export function endClass(args: {
  classRecordId: string;
  actorId: string;
  actorRole: SpecificRole;
  finalStatus?: ClassRecordStatus;
}): ClassRecord {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  if (cr.endedAt) return cr;
  // Regla: si el estudiante llegó tarde, la clase termina a la hora programada.
  const scheduledEnd = computeEndTs(cr);
  const actualEndIso =
    Date.now() > scheduledEnd
      ? new Date(scheduledEnd).toISOString()
      : new Date().toISOString();
  const status = args.finalStatus ?? 'completed';
  const updated = classRecordsRepo.updateStatus(cr.id, status, { endedAt: actualEndIso })!;
  log(updated, 'class_ended', args.actorId, args.actorRole, 'Clase finalizada');
  return updated;
}

export function uploadScreenshot(args: {
  classRecordId: string;
  actorId: string;
  actorRole: SpecificRole;
}): Screenshot {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  const s = screenshotsRepo.createForClass({
    classRecordId: cr.id,
    bookingId: cr.bookingId,
    teacherId: cr.teacherId,
    studentId: cr.studentId,
    url: `mock://screenshots/${cr.id}/${Date.now()}.jpg`,
  });
  log(cr, 'screenshot_received', args.actorId, args.actorRole, 'Screenshot registrado');
  return s;
}

export function markStudentAbsent(args: { classRecordId: string; actorId: string; actorRole: SpecificRole }): ClassRecord {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  const booking = bookingsRepo.findById(cr.bookingId);
  if (booking && !booking.hourConsumed) {
    if (packagesRepo.consumeHour(booking.studentId)) {
      bookingsRepo.update(booking.id, { hourConsumed: true });
      log(cr, 'hours_deducted', args.actorId, args.actorRole, 'Hora consumida por ausencia');
    }
  }
  log(cr, 'student_absent', args.actorId, args.actorRole, 'Estudiante ausente');
  const updated = classRecordsRepo.updateStatus(cr.id, 'student_absent', {
    endedAt: new Date().toISOString(),
  })!;
  return updated;
}

export function markTeacherAbsent(args: { classRecordId: string; actorId: string; actorRole: SpecificRole }): ClassRecord {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  log(cr, 'teacher_absent', args.actorId, args.actorRole, 'Profesor ausente');
  const updated = classRecordsRepo.updateStatus(cr.id, 'teacher_late', {}) ?? cr;
  const studentUserId = userIdForStudent(cr.studentId);
  if (studentUserId) {
    createNotification({
      userId: studentUserId,
      type: 'teacher_absent',
      message: `El profesor no ha llegado a tu clase de ${cr.subject}.`,
      refType: 'class',
      refId: cr.id,
    });
  }
  return updated;
}

export function markNoCamera(args: { classRecordId: string; actorId: string; actorRole: SpecificRole }): ClassRecord {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  log(cr, 'no_camera', args.actorId, args.actorRole, 'Estudiante sin cámara');
  return classRecordsRepo.updateStatus(cr.id, 'no_camera', {}) ?? cr;
}

export function markTechnicalIssue(args: {
  classRecordId: string;
  actorId: string;
  actorRole: SpecificRole;
  detail?: string;
}): ClassRecord {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  log(
    cr,
    'technical_issue',
    args.actorId,
    args.actorRole,
    `Problema técnico${args.detail ? ': ' + args.detail : ''}`,
  );
  return classRecordsRepo.updateStatus(cr.id, 'technical', {}) ?? cr;
}

// ============= POST CLASS =============
export interface ReportPayload {
  topic: string;
  objectives: string;
  strengths: string;
  improvements: string;
  homework: string;
  guardianNotes: string;
  attachments: string[];
}

export function submitReport(args: {
  classRecordId: string;
  actorId: string;
  actorRole: SpecificRole;
  payload: ReportPayload;
}): Report {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  const r = reportsRepo.createForClass({
    classRecordId: cr.id,
    bookingId: cr.bookingId,
    teacherId: cr.teacherId,
    studentId: cr.studentId,
    topic: args.payload.topic,
    progress: args.payload.strengths,
    objectives: args.payload.objectives,
    strengths: args.payload.strengths,
    improvements: args.payload.improvements,
    homework: args.payload.homework || null,
    guardianNotes: args.payload.guardianNotes || null,
    rating: null,
    attachments: args.payload.attachments,
    status: 'sent',
  });
  log(cr, 'report_submitted', args.actorId, args.actorRole, `Reporte enviado: ${args.payload.topic}`);
  const studentUserId = userIdForStudent(cr.studentId);
  if (studentUserId) {
    createNotification({
      userId: studentUserId,
      type: 'new_report',
      message: `Nuevo reporte de ${cr.subject}`,
      refType: 'report',
      refId: r.id,
      actionRoute: `/class/${cr.id}`,
    });
  }
  const guardianUserId = userIdForGuardian(cr.guardianId);
  if (guardianUserId && guardianUserId !== studentUserId) {
    createNotification({
      userId: guardianUserId,
      type: 'new_report',
      message: `Nuevo reporte de ${cr.subject}`,
      refType: 'report',
      refId: r.id,
      actionRoute: `/class/${cr.id}`,
    });
  }
  return r;
}

export function markReportRead(args: { classRecordId: string; actorId: string; actorRole: SpecificRole }): Report | undefined {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) return undefined;
  const r = reportsRepo.listForClass(cr.id)[0];
  if (!r || r.status !== 'sent') return r;
  const updated = reportsRepo.updateStatus(r.id, 'read');
  log(cr, 'report_read', args.actorId, args.actorRole, 'Reporte leído por la familia');
  return updated;
}

export function confirmReport(args: { classRecordId: string; actorId: string; actorRole: SpecificRole }): Report | undefined {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) return undefined;
  const r = reportsRepo.listForClass(cr.id)[0];
  if (!r) return undefined;
  const updated = reportsRepo.updateStatus(r.id, 'confirmed');
  log(cr, 'report_confirmed', args.actorId, args.actorRole, 'Reporte confirmado por la familia');
  return updated;
}

export function sendTeacherMaterial(args: {
  classRecordId: string;
  actorId: string;
  actorRole: SpecificRole;
  title: string;
  kind?: MaterialKind;
}): Material {
  const cr = classRecordsRepo.findById(args.classRecordId);
  if (!cr) throw new Error('Clase no encontrada');
  const m = materialsRepo.createForClass({
    classRecordId: cr.id,
    bookingId: cr.bookingId,
    teacherId: cr.teacherId,
    studentId: cr.studentId,
    title: args.title,
    description: null,
    kind: args.kind ?? 'PDF',
    url: `mock://materials/${cr.id}/${encodeURIComponent(args.title)}`,
    size: '—',
    source: 'teacher',
  });
  log(cr, 'material_sent', args.actorId, args.actorRole, `Material enviado: ${args.title}`);
  const studentUserId = userIdForStudent(cr.studentId);
  if (studentUserId) {
    createNotification({
      userId: studentUserId,
      type: 'new_material',
      message: `${args.title} · ${cr.subject}`,
      refType: 'material',
      refId: m.id,
      actionRoute: `/class/${cr.id}`,
    });
  }
  return m;
}

export const classService = {
  computeStartTs,
  computeEndTs,
  getTimers,
  uploadStudentMaterial,
  setStudentTopic,
  startClass,
  endClass,
  uploadScreenshot,
  markStudentAbsent,
  markTeacherAbsent,
  markNoCamera,
  markTechnicalIssue,
  submitReport,
  markReportRead,
  confirmReport,
  sendTeacherMaterial,
  MATERIAL_LOCK_MS,
};
