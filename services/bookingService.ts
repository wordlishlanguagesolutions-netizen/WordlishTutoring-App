// Wordlish · Booking service (lógica pura, sin React)
//
// Cambio de infraestructura (Cloud):
//   - La disponibilidad semanal por profesor + weekday ya NO se lee del
//     mock `TEACHER_WEEK_AVAILABILITY`. Ahora se consulta contra
//     `public.teacher_availability` via `availabilityRepo` (que mantiene
//     un cache en memoria hidratado desde BookingsContext y refrescado
//     mediante subscribeAvailability).
//   - La lista de profesores por materia (getTeachersForSubject) tambien
//     proviene de `availabilityRepo.getCachedTeachersForSubject`, que
//     cruza `teacher_availability` con `public.teachers` + user_profiles.
//   - La logica de bookings + holds + conflictos se mantiene identica:
//     los slots publicados se filtran en memoria contra los bookings
//     vigentes (BookingsContext) y los holds activos (BookingsContext).
import { Booking, BookingStatus, dateUtils } from './mockData';
import type { TeacherTier } from '@/constants/policies';
import { availabilityRepo } from '@/repositories/availability';

export interface Hold {
  id: string;
  teacherId: string;
  date: string;
  time: string;
  expiresAt: number;
}

const BOOKED_STATUSES: BookingStatus[] = ['confirmed', 'pending_payment', 'rescheduled'];

// Slots libres para un profesor en una fecha, excluyendo bookings vigentes y holds activos
export function getTeacherAvailableSlots(
  teacherId: string,
  date: string,
  bookings: Booking[],
  holds: Hold[],
  now: number,
): string[] {
  const weekday = dateUtils.weekdayOf(date);
  // Base semanal viene del cache de teacher_availability (Cloud).
  // Si el cache aun no esta hidratado, devuelve [] (el warm-up dispara
  // en background y BookingsContext fuerza un re-render al llegar).
  const base = availabilityRepo.getCachedSlots(teacherId, weekday);
  const booked = new Set(
    bookings
      .filter(
        (b) =>
          b.teacherId === teacherId &&
          b.date === date &&
          BOOKED_STATUSES.includes(b.status),
      )
      .map((b) => b.time),
  );
  const held = new Set(
    holds
      .filter(
        (h) =>
          h.teacherId === teacherId && h.date === date && h.expiresAt > now,
      )
      .map((h) => h.time),
  );
  return base.filter((s) => !booked.has(s) && !held.has(s));
}

// Filtra el catalogo real de profesores (Cloud) por materia, nivel y plan.
// El subject viene en formato "Base . Nivel" (ej. "Ingles . Basico"). El
// repo `availabilityRepo` hace el match normalizando mayusculas y tildes
// contra `teachers.subjects` (text[]), y si hay nivel filtra tambien
// contra `teachers.grades` reexpuesto como `levels`. El plan tier se
// aplica al final: "special" ve ambos tiers, "essentials" solo essentials.
// La firma de retorno preserva { id, name, avatar, tier, subjects, levels }
// para no romper a los consumidores existentes (BookingWizard, booking/
// teacher.tsx, booking/schedule.tsx).
export function getTeachersForSubject(
  subject: string,
  planTier?: TeacherTier,
) {
  return availabilityRepo.getCachedTeachersForSubject(subject, planTier);
}

// Regla: un estudiante no puede tener dos clases al mismo tiempo
export function hasStudentConflict(
  studentId: string,
  date: string,
  time: string,
  bookings: Booking[],
): boolean {
  return bookings.some(
    (b) =>
      b.studentId === studentId &&
      b.date === date &&
      b.time === time &&
      BOOKED_STATUSES.includes(b.status),
  );
}

// Regla: un profesor no puede tener dos clases al mismo tiempo
export function hasTeacherConflict(
  teacherId: string,
  date: string,
  time: string,
  bookings: Booking[],
  excludeBookingId?: string,
): boolean {
  return bookings.some(
    (b) =>
      b.id !== excludeBookingId &&
      b.teacherId === teacherId &&
      b.date === date &&
      b.time === time &&
      BOOKED_STATUSES.includes(b.status),
  );
}

export function generateNextDays(count: number): string[] {
  return Array.from({ length: count }, (_, i) => dateUtils.addDays(i));
}

export function newBookingId(): string {
  return 'bk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// Reprogramable si está confirmada o pendiente y falta más de 1 hora
export function canReschedule(b: Booking): boolean {
  if (!['confirmed', 'pending_payment'].includes(b.status)) return false;
  const target = new Date(b.date + 'T' + b.time + ':00').getTime();
  return target - Date.now() > 60 * 60 * 1000;
}

// Cancelable si está confirmada o pendiente
export function canCancel(b: Booking): boolean {
  return ['confirmed', 'pending_payment'].includes(b.status);
}

// ============ AUTO-ASIGNACIÓN DE PROFESOR ============
// Regla combinada: materia + disponibilidad + continuidad con el estudiante + carga.
// La lógica vive aquí para no ensuciar la UI y para poder mudarla a Supabase.
export function pickBestTeacher(
  subject: string,
  studentId: string,
  date: string,
  time: string,
  bookings: Booking[],
  holds: Hold[],
  now: number,
  planTier?: TeacherTier,
): { id: string; name: string; avatar: string } | null {
  const candidates = getTeachersForSubject(subject, planTier);
  const available = candidates.filter((t) => {
    const slots = getTeacherAvailableSlots(t.id, date, bookings, holds, now);
    return slots.includes(time);
  });
  if (available.length === 0) return null;

  const scored = available.map((t) => {
    // Continuidad: cuántas clases activas ha tenido este estudiante con este profesor
    const continuity = bookings.filter(
      (b) =>
        b.studentId === studentId &&
        b.teacherId === t.id &&
        BOOKED_STATUSES.includes(b.status),
    ).length;
    // Carga: total de bookings activos del profesor
    const workload = bookings.filter(
      (b) => b.teacherId === t.id && BOOKED_STATUSES.includes(b.status),
    ).length;
    // Continuidad domina, carga desempata (menor carga = mejor)
    return { teacher: t, score: continuity * 100 - workload };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].teacher;
  return { id: best.id, name: best.name, avatar: best.avatar };
}

// Slots únicos donde al menos un profesor de la materia está disponible.
// Oculta el nombre del profesor — se resuelve en pickBestTeacher al confirmar.
export function getAvailableSlotsForSubject(
  subject: string,
  date: string,
  bookings: Booking[],
  holds: Hold[],
  now: number,
  planTier?: TeacherTier,
): { time: string }[] {
  const candidates = getTeachersForSubject(subject, planTier);
  const times = new Set<string>();
  candidates.forEach((t) => {
    getTeacherAvailableSlots(t.id, date, bookings, holds, now).forEach((time) =>
      times.add(time),
    );
  });
  return Array.from(times)
    .sort((a, b) => a.localeCompare(b))
    .map((time) => ({ time }));
}
