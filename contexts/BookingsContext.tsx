import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import type { Booking, BookingStatus, PaymentMethod } from '@/types';
import {
  Hold,
  hasStudentConflict,
  hasTeacherConflict,
} from '@/services/bookingService';
import { createNotification } from '@/services/notificationService';
import { getZoomUrl } from '@/services/zoomService';
import {
  bookingsRepo,
  getBookings,
  hydrateBookings,
  subscribeBookings,
} from '@/services/bookingsService';
import {
  getStudentById,
  hydrateStudents,
  subscribeStudents,
} from '@/services/studentsService';
import {
  getGuardianById,
  getGuardianByUserId,
  hydrateGuardians,
} from '@/services/guardiansService';
import {
  packagesRepo,
  getPackages,
  hydratePackages,
  subscribePackages,
} from '@/services/packagesService';
import {
  classRecordsRepo,
  hydrateClassRecords,
} from '@/services/classRecordsService';
import {
  paymentsRepo,
  getPaymentsForBooking,
  hydratePayments,
} from '@/services/paymentsService';
import {
  hydrateUsers,
  getUsersByRole,
} from '@/services/usersService';
import { getSetting } from '@/services/appSettingsService';
import { mockDb } from '@/services/mockDb';
import { useAuth } from '@/hooks/useAuth';

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

export interface PaymentProof {
  name: string;
  at: number;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected';
  method?: PaymentMethod;
  receiptPath?: string | null;
  rejectionReason?: string | null;
}

export interface SubmitProofArgs {
  name: string;
  method?: PaymentMethod;
  receiptPath?: string | null;
}

export interface BookingsContextType {
  bookings: Booking[];
  holds: Hold[];
  remainingHours: Record<string, number>;
  paymentProofs: Record<string, PaymentProof>;
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
  submitPaymentProof: (bookingId: string, proof: SubmitProofArgs | string) => void;
  rejectPayment: (bookingId: string, reason?: string) => void;
  getById: (id: string) => Booking | undefined;
  getForStudent: (studentId: string) => Booking[];
  getForTeacher: (teacherId: string) => Booking[];
}

export const BookingsContext = createContext<BookingsContextType | undefined>(
  undefined,
);

// Lookups con fallback: Cloud primero (studentsService/guardiansService),
// mockDb como respaldo temporal solo para módulos aún no migrados
// (users/staff se resuelven vía userId; students y guardians ya son Cloud).
function studentToUserId(studentId: string): string {
  const cloudStudent = getStudentById(studentId);
  if (cloudStudent?.userId) return cloudStudent.userId;
  const s = mockDb.students.find((x) => x.id === studentId);
  return s?.userId ?? `u-${studentId}`;
}
function guardianToUserId(guardianId: string | null): string | null {
  if (!guardianId) return null;
  const cloudGuardian = getGuardianById(guardianId);
  if (cloudGuardian?.userId) return cloudGuardian.userId;
  const g = mockDb.guardians.find((x) => x.id === guardianId);
  return g?.userId ?? null;
}
function studentGuardianId(studentId: string): string | null {
  const cloudStudent = getStudentById(studentId);
  if (cloudStudent) return cloudStudent.guardianId ?? null;
  const s = mockDb.students.find((x) => x.id === studentId);
  return s?.guardianId ?? null;
}

// Horas restantes: derivadas directamente del cache Cloud de packages.
// Sin dependencia de mockDb.students (fallback #8 eliminado).
function computeRemainingHours(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of getPackages()) {
    if (!p.active) continue;
    map[p.studentId] = (map[p.studentId] ?? 0) + p.remainingHours;
  }
  return map;
}

export function BookingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>(() => getBookings());
  const [holds, setHolds] = useState<Hold[]>([]);
  const [remainingHours, setRemainingHours] = useState<Record<string, number>>(
    computeRemainingHours(),
  );
  const [paymentProofs, setPaymentProofs] = useState<Record<string, PaymentProof>>({});

  // Resolucion del guardian real desde Auth. Cuando el usuario logueado
  // es un acudiente, mapeamos su user.id -> guardian.id via cache Cloud.
  const resolveGuardianIdForCurrentUser = useCallback((): string | null => {
    if (!user) return null;
    if ((user as any).role !== 'guardian') return null;
    return getGuardianByUserId(user.id)?.id ?? null;
  }, [user]);

  // Hidratación Cloud + suscripción reactiva al cache del service.
  useEffect(() => {
    hydrateBookings().catch(() => undefined);
    hydrateStudents().catch(() => undefined);
    hydrateGuardians().catch(() => undefined);
    hydratePackages().catch(() => undefined);
    hydrateClassRecords().catch(() => undefined);
    // QA fix (Production): sin estas dos hidrataciones, los pagos de
    // Cloud nunca aparecian tras recargar la app (solo se veian los
    // escritos en la sesion actual) y las notificaciones a staff se
    // enviaban a IDs mock que en produccion no existen.
    hydratePayments().catch(() => undefined);
    hydrateUsers().catch(() => undefined);
    const unsubBookings = subscribeBookings(() => {
      setBookings(getBookings());
    });
    const unsubStudents = subscribeStudents(() => {
      setRemainingHours(computeRemainingHours());
    });
    const unsubPackages = subscribePackages(() => {
      setRemainingHours(computeRemainingHours());
    });
    return () => {
      unsubBookings();
      unsubStudents();
      unsubPackages();
    };
  }, []);

  // Limpieza periódica de holds expirados.
  useEffect(() => {
    const iv = setInterval(() => {
      setHolds((prev) => prev.filter((h) => h.expiresAt > Date.now()));
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const syncCache = useCallback(() => {
    setBookings(getBookings());
    setRemainingHours(computeRemainingHours());
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

      // Consumo de horas contra el cache Cloud de packages (packagesService).
      const hasHours = packagesRepo.remainingHoursFor(args.studentId) > 0;
      const consumed = hasHours ? packagesRepo.consumeHour(args.studentId) : false;

      const guardianId = studentGuardianId(args.studentId);
      const nowIso = new Date().toISOString();

      // 1. Insertar booking (cache + fire-and-forget Cloud vía service).
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
        // Enlace único fijo de Wordlish desde app_settings.zoom.official_link.
        zoomUrl: getZoomUrl(),
        hourConsumed: consumed,
        packageId: null,
        classRecordId: null,
        guardianId,
        createdBy: guardianId
          ? guardianToUserId(guardianId) ?? ''
          : studentToUserId(args.studentId),
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // 2. ClassRecord Cloud (classRecordsService).
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

      // 3. Notificaciones (arquitectura lista para push/whatsapp).
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
      syncCache();
      return {
        booking: bookingsRepo.findById(inserted.id) as Booking,
        requiresPayment: !consumed,
      };
    },
    [releaseHold, syncCache],
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
      syncCache();
    },
    [syncCache],
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
      syncCache();
      return { ok: true };
    },
    [syncCache],
  );

  const submitPaymentProof = useCallback(
    (bookingId: string, proof: SubmitProofArgs | string) => {
      const b = bookingsRepo.findById(bookingId);
      if (!b) return;
      const args: SubmitProofArgs =
        typeof proof === 'string' ? { name: proof } : proof;
      const at = Date.now();
      const proofMethod: PaymentMethod = args.method ?? 'other';
      const receiptPath = args.receiptPath ?? null;
      setPaymentProofs((prev) => ({
        ...prev,
        [bookingId]: {
          name: args.name,
          at,
          status: 'reviewing',
          method: proofMethod,
          receiptPath,
          rejectionReason: null,
        },
      }));

      // ── QA fix (Payments Cloud) ────────────────────────────────────
      // Un unico Payment por reserva. Ciclo posible:
      //   pending -> failed -> pending -> paid.
      // Al reenviar, se reutiliza el registro existente en vez de crear
      // duplicados. Solo se ignora si ya esta 'paid' (idempotencia).
      const linked = getPaymentsForBooking(bookingId).filter(
        (p) => p.status !== 'refunded',
      );
      const existing =
        linked.find((p) => p.status === 'paid') ??
        linked.find((p) => p.status === 'pending') ??
        linked.find((p) => p.status === 'failed');
      if (existing?.status === 'paid') {
        return; // ya pagado, no reabrimos
      }
      if (existing) {
        paymentsRepo.update(existing.id, {
          status: 'pending',
          method: proofMethod,
          externalReference: args.name,
          receiptUrl: receiptPath,
        });
      } else {
        const price = getSetting<number>('payment.price_per_hour_usd', 18);
        const amount = price * ((b.durationMin ?? 60) / 60);
        const guardianId =
          b.guardianId ?? resolveGuardianIdForCurrentUser();
        paymentsRepo.create({
          studentId: b.studentId,
          guardianId,
          packageId: null,
          bookingId: b.id,
          concept: `${b.subject} · ${b.date} ${b.time}`,
          amount,
          currency: 'USD',
          status: 'pending',
          method: proofMethod,
          paidAt: null,
          externalReference: args.name,
          receiptUrl: receiptPath,
          createdBy: user?.id ?? null,
        } as any);
      }

      // Notificaciones internas para admin y supervisor.
      // QA fix (Production): resolvemos UUID real de cada admin y
      // supervisor activo desde usersService (Cloud). Antes se hardcodeaba
      // 'u-admin' / 'u-sup' (IDs mock) y en real ningun staff recibia el
      // aviso de comprobante subido.
      const meta = `${b.studentName} · ${b.subject} · ${b.date} ${b.time}`;
      const staffTargets = [
        ...getUsersByRole('admin'),
        ...getUsersByRole('supervisor'),
      ].filter((u) => u.active !== false);
      const fallbackTargets = staffTargets.length === 0 ? ['u-admin', 'u-sup'] : [];
      [...staffTargets.map((u) => u.id), ...fallbackTargets].forEach((uid) => {
        createNotification({
          userId: uid,
          type: 'payment_pending',
          title: 'Comprobante recibido',
          message: `${meta} · Revisar en reservas`,
          refType: 'booking',
          refId: bookingId,
          actionRoute: `/booking/${bookingId}`,
          actionLabel: 'Revisar pago',
        });
      });
    },
    [resolveGuardianIdForCurrentUser, user?.id],
  );

  const rejectPayment = useCallback(
    (bookingId: string, reason?: string) => {
      const b = bookingsRepo.findById(bookingId);
      if (!b) return;
      if (b.status === 'confirmed') return; // no rechazar aprobados

      // Marca el Payment 'pending' asociado como 'failed'. Idempotente:
      // si ya esta 'failed' o no existe pending, no hace nada.
      const linked = getPaymentsForBooking(bookingId);
      const pending = linked.find((p) => p.status === 'pending');
      if (pending) {
        paymentsRepo.update(pending.id, {
          status: 'failed',
          paidAt: null,
          externalReference: reason
            ? `rechazo: ${reason}`
            : pending.externalReference,
        });
      }

      // Deja el comprobante local en estado 'rejected' para que la UI del
      // estudiante/acudiente muestre el banner y el picker vuelva a
      // aparecer para reemplazarlo.
      setPaymentProofs((prev) => {
        const cur = prev[bookingId];
        return {
          ...prev,
          [bookingId]: {
            name: cur?.name ?? '',
            at: Date.now(),
            status: 'rejected',
            method: cur?.method,
            receiptPath: cur?.receiptPath ?? null,
            rejectionReason: reason ?? null,
          },
        };
      });

      // Avisar al estudiante y al acudiente que deben reintentar.
      const studentUserId = studentToUserId(b.studentId);
      const detail = reason ? ` Motivo: ${reason}` : '';
      createNotification({
        userId: studentUserId,
        type: 'payment_pending',
        title: 'Comprobante rechazado',
        message: `${b.subject} · ${b.date} ${b.time}.${detail} Sube uno nuevo para continuar.`,
        refType: 'booking',
        refId: bookingId,
        actionRoute: `/booking/${bookingId}`,
        actionLabel: 'Reintentar pago',
      });
      const guardianUserId = guardianToUserId(b.guardianId ?? null);
      if (guardianUserId && guardianUserId !== studentUserId) {
        createNotification({
          userId: guardianUserId,
          type: 'payment_pending',
          title: 'Comprobante rechazado',
          message: `${b.studentName} · ${b.subject}.${detail}`,
          refType: 'booking',
          refId: bookingId,
          actionRoute: `/booking/${bookingId}`,
          actionLabel: 'Reintentar pago',
        });
      }
    },
    [],
  );

  const markPaid = useCallback(
    (id: string) => {
      // ── QA fix (idempotencia) ─────────────────────────────────────
      // Lectura fresca del cache: evita que un doble clic aprovado
      // aún con el mismo `b` capturado del render dispare dos
      // consumos de hora contra el paquete.
      const b = bookingsRepo.findById(id);
      if (!b) return;
      if (b.status === 'confirmed') return; // ya aprobada
      let consumed = b.hourConsumed;
      if (!consumed) {
        consumed = packagesRepo.consumeHour(b.studentId);
      }
      bookingsRepo.update(id, {
        status: 'confirmed' as BookingStatus,
        hourConsumed: consumed,
      });

      // ── QA fix (Payments Cloud) ──────────────────────────────────
      // Cerrar el pago asociado. Si el estudiante había subido
      // comprobante, movemos ese Payment de 'pending' a 'paid'
      // (una sola vez). Si no existe, generamos uno 'paid' para
      // dejar trazabilidad completa en el historial.
      const linked = getPaymentsForBooking(id);
      const pending = linked.find((p) => p.status === 'pending');
      const alreadyPaid = linked.find((p) => p.status === 'paid');
      if (pending) {
        paymentsRepo.markStatus(pending.id, 'paid');
      } else if (!alreadyPaid) {
        const price = getSetting<number>('payment.price_per_hour_usd', 18);
        const amount = (price * ((b.durationMin ?? 60) / 60));
        paymentsRepo.create({
          studentId: b.studentId,
          guardianId: b.guardianId ?? resolveGuardianIdForCurrentUser(),
          packageId: null,
          bookingId: b.id,
          concept: `${b.subject} · ${b.date} ${b.time}`,
          amount,
          currency: 'USD',
          status: 'paid',
          method: 'other',
          paidAt: new Date().toISOString(),
          externalReference: null,
          receiptUrl: null,
          createdBy: user?.id ?? null,
        } as any);
      }

      createNotification({
        userId: studentToUserId(b.studentId),
        type: 'payment_confirmed',
        message: `Pago confirmado · ${b.subject}`,
        refType: 'booking',
        refId: id,
      });
      // Soporte de Pago disponible (Cliente). No es una nueva entidad:
      // el service `soporteService` lo deriva del Payment. Solo
      // emitimos la notificacion informativa para que el estudiante y
      // el acudiente sepan que ya pueden descargarlo desde el detalle.
      const paidPayment =
        getPaymentsForBooking(id).find((p) => p.status === 'paid') ?? null;
      const soporteRoute = paidPayment
        ? `/payments/${paidPayment.id}?kind=guardianPayment`
        : `/booking/${id}`;
      createNotification({
        userId: studentToUserId(b.studentId),
        type: 'payment_confirmed',
        title: 'Soporte de Pago disponible',
        message: `Tu Soporte de Pago de ${b.subject} ya esta disponible.`,
        refType: 'payment',
        refId: paidPayment?.id ?? id,
        actionRoute: soporteRoute,
        actionLabel: 'Ver soporte',
      });
      const guardianUserIdPaid = guardianToUserId(b.guardianId ?? null);
      if (guardianUserIdPaid && guardianUserIdPaid !== studentToUserId(b.studentId)) {
        createNotification({
          userId: guardianUserIdPaid,
          type: 'payment_confirmed',
          title: 'Soporte de Pago disponible',
          message: `Soporte de ${b.studentName} · ${b.subject}`,
          refType: 'payment',
          refId: paidPayment?.id ?? id,
          actionRoute: soporteRoute,
          actionLabel: 'Ver soporte',
        });
      }
      setPaymentProofs((prev) => {
        const existing = prev[id];
        if (!existing) return prev;
        return { ...prev, [id]: { ...existing, status: 'approved' } };
      });
      syncCache();
    },
    [syncCache],
  );

  const value = useMemo<BookingsContextType>(
    () => ({
      bookings,
      holds,
      remainingHours,
      paymentProofs,
      createHold,
      releaseHold,
      createBooking,
      cancelBooking,
      rescheduleBooking,
      markPaid,
      submitPaymentProof,
      rejectPayment,
      getById: (id) => bookingsRepo.findById(id),
      getForStudent: (sid) => bookingsRepo.listForStudent(sid),
      getForTeacher: (tid) => bookingsRepo.listForTeacher(tid),
    }),
    [
      bookings,
      holds,
      remainingHours,
      paymentProofs,
      createHold,
      releaseHold,
      createBooking,
      cancelBooking,
      rescheduleBooking,
      markPaid,
      submitPaymentProof,
      rejectPayment,
    ],
  );

  return (
    <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>
  );
}
