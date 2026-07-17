// Wordlish · Registro en memoria de aceptación de políticas por estudiante.
// Reemplaza la casilla "He leído las políticas" del resumen de reserva.
// Se marca automáticamente cuando el usuario abre la pantalla "Tips para tu clase".

const viewed = new Set<string>();

export const policiesAck = {
  markViewed(studentId: string): void {
    if (studentId) viewed.add(studentId);
  },
  hasViewed(studentId: string): boolean {
    return !!studentId && viewed.has(studentId);
  },
  reset(): void {
    viewed.clear();
  },
};
