import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import type { Booking, BookingStatus } from '@/types';
import {
  Hold,
  hasStudentConflict,
  hasTeacherConflict,
} from '@/services/bookingService';
import {
  bookingsRepo,
  classRecordsRepo,
  packagesRepo,
} from '@/repositories';
import { createNotification } from '@/services/notificationService';
import { mockDb } from '@/services/mockDb';

const HOLD_MS = 5 * 60 * 1000; // 5 minutos

interface CreateBookingArgs {
  studentId: string;
  studentName: string;
  studentAvatar: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  subject: string;
  date: string;
  time: string;
}

export interface BookingsContextType {
  bookings: Booking[];
  holds: Hold[];
  remainingHours: Record<string, number>;
  createHold: (teacherId: string, date: string, time: string) => Hold;
  releaseHold: (id: string) => void;
  createBooking: (
    args: CreateBookingArgs,
    holdId?: string,
  ) => { booking: Booking; requiresPayment: boolean; error?: string };
  cancelBooking: (id: string) => void;
  rescheduleBooking: (
    id: string,
    newDate: string,
    newTime: string,
  ) => { ok: boolean; error?: string };
  markPaid: (id: string) => void;
  getById: (id: string) => Booking | undefined;
  getForStudent: (studentId: string) => Booking[];
  getForTeacher: (teacherId: string) => Booking[];
}

export const BookingsContext = createContext<BookingsContextType | undefined>(
  undefined,
);

// Derivar horas restantes desde packagesRepo (fuente única)
function computeRemainingHours(): Record<string, number> {
  const map: Record<string, number> = {};
  mockDb.students.forEach((s) => {
    map[s.id] = packagesRepo.remainingHoursFor(s.id);
  });
  return map;
}

// Mapa studentId → userId (para notificaciones)
function studentToUserId(studentId: string): string {
  const s = mockDb.students.find((x) => x.id === studentId);
  return s?.userId ?? `u-${studentId}`;
}
function guardianToUserId(guardianId: string | null): string | null {
  if (!guardianId) return null;
  const g = mockDb.guardians.find((x) => x.id === guardianId);
  return g?.userId ?? null;
}

export function BookingsProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(() =>
    bookingsRepo.listAll(),
  );
  const [holds, setHolds] = useState<Hold[]>([]);
  const [remainingHours, setRemainingHours] = useState<Record<string, number>>(
    computeRemainingHours(),
  );

  const syncBookings = useCallback(() => {
    setBookings(bookingsRepo.listAll());
    setRemainingHours(computeRemainingHours());
  }, []);

  // Limpieza periódica de holds expirados
  useEffect(() => {
    const iv = setInterval(() => {
      setHolds((prev) => prev.filter((h) => h.expiresAt > Date.now()));
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const createHold = useCallback(
    (teacherId: string, date: string, time: string): Hold => {
      const hold: Hold = {
        id:
          'h' +
          Date.now().toString(36) +
          Math.random().toString(36).slice(2, 4),
        teacherId,
        date,
        time,
        expiresAt: Date.now() + HOLD_MS,
      };
      setHolds((prev) => [
        ...prev.filter(
          (h) =>
            !(h.teacherId === teacherId && h.date === date && h.time === time),
        ),
        hold,
      ]);
      return hold;
    },
    [],
  );

  const releaseHold = useCallback((id: string) => {
    setHolds((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const createBooking = useCallback(
    (args: CreateBookingArgs, holdId?: string) => {
      const all = bookingsRepo.listAll();

      if (hasStudentConflict(args.studentId, args.date, args.time, all)) {
        return {
          booking: {} as Booking,
          requiresPayment: false,
          error: 'Ya tienes una clase reservada en este horario.',
        };
      }
      if (hasTeacherConflict(args.teacherId, args.date, args.time, all)) {
        return {
          booking: {} as Booking,
          requiresPayment: false,
          error: 'El profesor ya no está disponible en este horario.',
        };
      }

      const hasHours = packagesRepo.remainingHoursFor(args.studentId) > 0;
      const consumed = hasHours ? packagesRepo.consumeHour(args.studentId) : false;

      const student = mockDb.students.find((s) => s.id === args.studentId);
      const guardianId = student?.guardianId ?? null;
      const nowIso = new Date().toISOString();

      // 1. Insertar booking en el repositorio
      const inserted = bookingsRepo.insert({
        studentId: args.studentId,
        studentName: args.studentName,
        studentAvatar: args.studentAvatar,
        teacherId: args.teacherId,
        teacherName: args.teacherName,
        teacherAvatar: args.teacherAvatar,
        substituteId: null,
        substituteName: null,
        subject: args.subject,
        date: args.date,
        time: args.time,
        durationMin: 60,
        status: (consumed ? 'confirmed' : 'pending_payment') as BookingStatus,
        zoomUrl: `https://zoom.us/j/${Math.floor(Math.random() * 9e9 + 1e9)}`,
        hourConsumed: consumed,
        packageId: consumed ? `pkg-${args.studentId}` : null,
        classRecordId: null,
        guardianId,
        createdBy: guardianId ? guardianToUserId(guardianId) ?? '' : studentToUserId(args.studentId),
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // 2. Crear el expediente único de clase (ClassRecord)
      const cr = classRecordsRepo.createFromBooking({
        id: inserted.id,
        studentId: inserted.studentId,
        teacherId: inserted.teacherId,
        guardianId: inserted.guardianId ?? null,
        subject: inserted.subject,
        date: inserted.date,
        time: inserted.time,
        zoomUrl: inserted.zoomUrl,
      });
      bookingsRepo.update(inserted.id, { classRecordId: cr.id });

      // 3. Emitir notificaciones (arquitectura lista para push/whatsapp)
      const studentUserId = studentToUserId(args.studentId);
      const guardianUserId = guardianToUserId(guardianId);

      createNotification({
        userId: studentUserId,
        type: consumed ? 'booking_confirmed' : 'payment_pending',
        message: `${args.subject} con ${args.teacherName} · ${args.date} ${args.time}`,
        refType: 'booking',
        refId: inserted.id,
        actionRoute: `/booking/${inserted.id}`,
        actionLabel: 'Ver detalle',
      });
      if (guardianUserId && guardianUserId !== studentUserId) {
        createNotification({
          userId: guardianUserId,
          type: consumed ? 'booking_confirmed' : 'payment_pending',
          message: `Reserva de ${args.studentName} · ${args.subject} · ${args.date} ${args.time}`,
          refType: 'booking',
          refId: inserted.id,
        });
      }

      if (holdId) releaseHold(holdId);
      syncBookings();
      return { booking: bookingsRepo.findById(inserted.id) as Booking, requiresPayment: !consumed };
    },
    [releaseHold, syncBookings],
  );

  const cancelBooking = useCallback(
    (id: string) => {
      const target = bookingsRepo.findById(id);
      if (!target) return;
      if (target.hourConsumed) {
        packagesRepo.restoreHour(target.studentId);
      }
      bookingsRepo.update(id, {
        status: 'cancelled' as BookingStatus,
        hourConsumed: false,
      });
      if (target.classRecordId) {
        classRecordsRepo.updateStatus(target.classRecordId, 'cancelled');
      }
      const studentUserId = studentToUserId(target.studentId);
      createNotification({
        userId: studentUserId,
        type: 'class_cancelled',
        message: `Se canceló tu clase de ${target.subject} el ${target.date} a las ${target.time}`,
        refType: 'booking',
        refId: id,
      });
      const guardianUserId = guardianToUserId(target.guardianId ?? null);
      if (guardianUserId && guardianUserId !== studentUserId) {
        createNotification({
          userId: guardianUserId,
          type: 'class_cancelled',
          message: `Clase de ${target.studentName} cancelada · ${target.subject}`,
          refType: 'booking',
          refId: id,
        });
      }
      syncBookings();
    },
    [syncBookings],
  );

  const rescheduleBooking = useCallback(
    (id: string, newDate: string, newTime: string) => {
      const b = bookingsRepo.findById(id);
      if (!b) return { ok: false, error: 'Reserva no encontrada.' };
      const others = bookingsRepo.listAll().filter((x) => x.id !== id);
      if (hasStudentConflict(b.studentId, newDate, newTime, others)) {
        return { ok: false, error: 'Conflicto con otra reserva del estudiante.' };
      }
      if (hasTeacherConflict(b.teacherId, newDate, newTime, others)) {
        return { ok: false, error: 'El profesor no está disponible.' };
      }
      bookingsRepo.update(id, {
        date: newDate,
        time: newTime,
        status: 'rescheduled' as BookingStatus,
      });
      if (b.classRecordId) {
        classRecordsRepo.updateStatus(b.classRecordId, 'scheduled', {
          date: newDate,
          time: newTime,
        });
      }
      createNotification({
        userId: studentToUserId(b.studentId),
        type: 'class_rescheduled',
        message: `Tu clase de ${b.subject} se movió a ${newDate} ${newTime}`,
        refType: 'booking',
        refId: id,
      });
      syncBookings();
      return { ok: true };
    },
    [syncBookings],
  );

  const markPaid = useCallback(
    (id: string) => {
      const b = bookingsRepo.findById(id);
      if (!b) return;
      let consumed = b.hourConsumed;
      if (!consumed) {
        consumed = packagesRepo.consumeHour(b.studentId);
      }
      bookingsRepo.update(id, {
        status: 'confirmed' as BookingStatus,
        hourConsumed: consumed,
      });
      createNotification({
        userId: studentToUserId(b.studentId),
        type: 'payment_confirmed',
        message: `Pago confirmado · ${b.subject}`,
        refType: 'booking',
        refId: id,
      });
      syncBookings();
    },
    [syncBookings],
  );

  const value = useMemo<BookingsContextType>(
    () => ({
      bookings,
      holds,
      remainingHours,
      createHold,
      releaseHold,
      createBooking,
      cancelBooking,
      rescheduleBooking,
      markPaid,
      getById: (id) => bookingsRepo.findById(id),
      getForStudent: (sid) => bookingsRepo.listForStudent(sid),
      getForTeacher: (tid) => bookingsRepo.listForTeacher(tid),
    }),
    [
      bookings,
      holds,
      remainingHours,
      createHold,
      releaseHold,
      createBooking,
      cancelBooking,
      rescheduleBooking,
      markPaid,
    ],
  );

  return (
    <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>
  );
}
