import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  classRecordsRepo,
  classEventsRepo,
  materialsRepo,
  reportsRepo,
  screenshotsRepo,
  bookingsRepo,
} from '@/repositories';
import { classService } from '@/services/classService';
import type { ReportPayload } from '@/services/classService';
import type { ClassRecordStatus } from '@/types';
import { usePermissions } from './usePermissions';

export function useClassManager(classRecordId: string) {
  const { ctx } = usePermissions();
  const [tick, setTick] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const iv = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const record = useMemo(
    () => classRecordsRepo.findById(classRecordId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classRecordId, tick],
  );
  const booking = useMemo(
    () => (record ? bookingsRepo.findById(record.bookingId) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, tick],
  );
  const materials = useMemo(
    () => (record ? materialsRepo.listForClass(record.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, tick],
  );
  const reports = useMemo(
    () => (record ? reportsRepo.listForClass(record.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, tick],
  );
  const screenshots = useMemo(
    () => (record ? screenshotsRepo.listForClass(record.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, tick],
  );
  const events = useMemo(
    () => (record ? classEventsRepo.listForClass(record.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, tick],
  );
  const timers = useMemo(
    () => (record ? classService.getTimers(record, nowTs, booking?.durationMin ?? 60) : null),
    [record, nowTs, booking],
  );

  const isTeacher = ctx?.role === 'teacher' && record?.teacherId === ctx.teacherId;
  const isAdmin = ctx?.role === 'admin';
  const isSupervisor = ctx?.role === 'supervisor';
  const isStudent = ctx?.role === 'student' && record?.studentId === ctx.studentId;
  const isGuardian =
    ctx?.role === 'guardian' && !!record && (ctx.studentIds ?? []).includes(record.studentId);

  const canManage = isTeacher || isAdmin;
  const canView = canManage || isSupervisor || isStudent || isGuardian;
  const canUploadStudentMaterial =
    (isStudent || isGuardian) && timers?.canUploadMaterial === true;
  const canWriteTopic = (isStudent || isGuardian) && timers?.phase === 'before';
  const canConfirmReport = isStudent || isGuardian;

  const actorId = ctx?.userId ?? 'system';
  const actorRole = ctx?.role ?? 'student';

  const run = (fn: () => unknown) => {
    if (!record) return;
    try {
      fn();
    } finally {
      refresh();
    }
  };

  return {
    record,
    booking,
    materials,
    reports,
    screenshots,
    events,
    timers,
    canManage,
    canView,
    canUploadStudentMaterial,
    canWriteTopic,
    canConfirmReport,
    isTeacher,
    isStudent,
    isGuardian,
    isSupervisor,
    isAdmin,
    uploadStudentMaterial: (title: string) =>
      run(() => classService.uploadStudentMaterial({ classRecordId, actorId, actorRole, title })),
    setStudentTopic: (topic: string) =>
      run(() => classService.setStudentTopic({ classRecordId, actorId, actorRole, topic })),
    startClass: () => run(() => classService.startClass({ classRecordId, actorId, actorRole })),
    endClass: (finalStatus?: ClassRecordStatus) =>
      run(() => classService.endClass({ classRecordId, actorId, actorRole, finalStatus })),
    uploadScreenshot: () =>
      run(() => classService.uploadScreenshot({ classRecordId, actorId, actorRole })),
    markStudentAbsent: () =>
      run(() => classService.markStudentAbsent({ classRecordId, actorId, actorRole })),
    markTeacherAbsent: () =>
      run(() => classService.markTeacherAbsent({ classRecordId, actorId, actorRole })),
    markNoCamera: () =>
      run(() => classService.markNoCamera({ classRecordId, actorId, actorRole })),
    markTechnicalIssue: (detail?: string) =>
      run(() => classService.markTechnicalIssue({ classRecordId, actorId, actorRole, detail })),
    submitReport: (payload: ReportPayload) =>
      run(() => classService.submitReport({ classRecordId, actorId, actorRole, payload })),
    markReportRead: () =>
      run(() => classService.markReportRead({ classRecordId, actorId, actorRole })),
    confirmReport: () =>
      run(() => classService.confirmReport({ classRecordId, actorId, actorRole })),
    sendTeacherMaterial: (title: string) =>
      run(() => classService.sendTeacherMaterial({ classRecordId, actorId, actorRole, title })),
    refresh,
  };
}
