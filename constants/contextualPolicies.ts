// ============================================================================
// Wordlish · Ubicación automática de políticas · v1.0
// ============================================================================
// Las políticas NO se muestran en una pantalla única ni como reglamento.
// Cada regla aparece únicamente cuando el usuario realiza la acción a la
// que pertenece. Este módulo centraliza los mensajes contextuales y evita
// que el mismo contenido se duplique en varias pantallas.
//
// Regla general antes de mostrar cualquier política:
//   "¿Esta información ayuda al usuario en este momento?"
//   Si la respuesta es no, no debe mostrarse.
// ============================================================================

import { POLICIES } from '@/constants/policies';

/**
 * Reglas visibles al reservar una TUTORÍA INDIVIDUAL.
 * Se muestran únicamente durante el flujo de reserva individual, no en
 * cursos grupales, no en pagos, no en clase.
 */
export const INDIVIDUAL_BOOKING_HINTS: string[] = [
  `Puedes cancelar hasta ${POLICIES.individualCancellationHours} hora antes del inicio.`,
  `Puntualidad: el profesor esperará ${POLICIES.studentToleranceMin} minutos después del inicio.`,
  'Tu profesor prepara la clase con anticipación.',
];

/**
 * Reglas visibles al reservar un CURSO GRUPAL.
 * Reemplaza a POLICY_COPY.groupCourses cuando aplique estrictamente a la
 * decisión de inscribirse en un grupo.
 */
export const GROUP_BOOKING_HINTS: string[] = [
  'Los horarios son fijos.',
  'Las clases grupales no son reprogramables.',
  'Las clases grupales no son reembolsables.',
  'Cualquier cambio dependerá de Coordinación Académica.',
];

/**
 * Reglas visibles antes de ingresar a la clase. Son recomendaciones
 * rápidas, no un reglamento.
 */
export const PRE_CLASS_TIPS: string[] = [
  'Procura conectarte unos minutos antes.',
  'Si es posible, mantén tu cámara encendida para una mejor interacción.',
  'Ten listo tu material.',
];

/**
 * Mensaje único cuando el estudiante llega tarde.
 */
export const STUDENT_LATE_MESSAGE = `Tu profesor esperará hasta ${POLICIES.studentToleranceMin} minutos después del inicio de la clase.`;

/**
 * Mensaje único al finalizar una clase personalizada.
 * Nunca mostrar políticas al finalizar.
 */
export const CLASS_FINISHED_MESSAGE =
  'Tu profesor preparará un reporte académico que estará disponible muy pronto.';

/**
 * Mensaje único al consultar un curso grupal (reportes).
 */
export const GROUP_REPORTS_MESSAGE =
  'Los reportes académicos se compartirán periódicamente durante el desarrollo del curso.';

/**
 * Reglas visibles en PAGOS.
 * Solo políticas administrativas de pago. Nunca políticas académicas.
 */
export const PAYMENT_HINTS: string[] = [
  'Los pagos se confirman al recibir el comprobante o el débito.',
  'Los paquetes se activan automáticamente después de la confirmación.',
  'Métodos de pago: tarjeta, Yappy y Cuanto.',
];

/**
 * Devuelve el mensaje que corresponde al subir material según el tiempo
 * restante para la clase. La app se pregunta automáticamente cuál es el
 * más útil ahora.
 *
 * @param hoursUntilStart horas restantes hasta el inicio de la clase.
 * @returns copy contextual con tono y texto.
 */
export function materialUploadFeedback(hoursUntilStart: number): {
  text: string;
  tone: 'success' | 'muted';
  icon: string;
} {
  if (hoursUntilStart >= POLICIES.materialLockHours) {
    return {
      text: '¡Perfecto! El profesor podrá preparar una clase completamente personalizada.',
      tone: 'success',
      icon: 'checkmark-circle',
    };
  }
  return {
    text: 'El material fue recibido después del tiempo recomendado. El profesor utilizará el contenido disponible y su planificación académica para aprovechar al máximo la sesión.',
    tone: 'muted',
    icon: 'information-circle-outline',
  };
}

/**
 * Documento completo de políticas de Wordlish para el módulo de Perfil.
 * Se consulta cuando el usuario lo desea. Nunca obligarlo a leerlo.
 */
export interface PolicySection {
  title: string;
  icon: string;
  lines: string[];
}

export const FULL_POLICIES_DOC: PolicySection[] = [
  {
    title: 'Tutorías individuales',
    icon: 'person-outline',
    lines: [
      `Puedes cancelar o reprogramar hasta ${POLICIES.individualCancellationHours} hora antes del inicio.`,
      `El estudiante cuenta con ${POLICIES.studentToleranceMin} minutos de tolerancia después del inicio.`,
      `El profesor esperará ${POLICIES.teacherToleranceMin} minutos si el estudiante se retrasa.`,
      'Si el estudiante no asiste, la hora se considera utilizada.',
    ],
  },
  {
    title: 'Cursos grupales',
    icon: 'people-outline',
    lines: [
      'Los horarios son fijos.',
      'Las clases grupales no son reprogramables.',
      'Las clases grupales no son reembolsables.',
      `Los grupos se abren a partir de ${POLICIES.groupMinStudents} estudiantes inscritos.`,
      'Cualquier cambio dependerá de Coordinación Académica.',
    ],
  },
  {
    title: 'Material de clase',
    icon: 'cloud-upload-outline',
    lines: [
      `Puedes subir material hasta ${POLICIES.materialLockHours} horas antes del inicio.`,
      'Si envías el material antes del plazo, tu profesor podrá preparar una clase completamente personalizada.',
      'Si el material llega después, el profesor utilizará el contenido disponible y su planificación académica.',
    ],
  },
  {
    title: 'Reportes académicos',
    icon: 'document-text-outline',
    lines: [
      'Tutorías individuales: el reporte se envía el mismo día en que finaliza la clase.',
      'Cursos grupales: los reportes se comparten periódicamente durante el desarrollo del curso.',
    ],
  },
  {
    title: 'Pagos',
    icon: 'card-outline',
    lines: [
      'Los pagos se confirman al recibir el comprobante o el débito.',
      'Los paquetes se activan automáticamente después de la confirmación.',
      `Cursos grupales: pago por adelantado, con ${POLICIES.groupGraceDays} días de gracia y recargo de USD ${POLICIES.groupLateFeeUsdPerDay} por día de atraso.`,
      'Métodos de pago: tarjeta, Yappy y Cuanto.',
    ],
  },
];
