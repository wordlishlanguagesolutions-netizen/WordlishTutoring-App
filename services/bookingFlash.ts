// ============================================================================
// bookingFlash · senal efimera entre summary.tsx y el home del rol.
//
// Cuando el estudiante confirma la reserva y pulsa "Volver al inicio",
// summary llama a emitBookingCreated(mode). El home (student/guardian)
// consume la senal en el mount/focus y muestra un NotificationBanner
// temporal que desaparece a los 4 s. No persiste entre sesiones: es
// solo un cierre visual en memoria.
// ============================================================================

export type BookingFlashMode = 'hours' | 'proof' | 'pending';

let pending: BookingFlashMode | null = null;

export function emitBookingCreated(mode: BookingFlashMode) {
  pending = mode;
}

export function consumeBookingCreated(): BookingFlashMode | null {
  const v = pending;
  pending = null;
  return v;
}
