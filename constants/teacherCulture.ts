// ============================================================================
// Cultura Wordlish para profesores · v3.0.1
// ============================================================================
// La app enseña los procesos únicamente mediante:
//   1. Recordatorios contextuales del siguiente paso.
//   2. Felicitaciones breves cuando un proceso se completa.
//
// Reglas de redacción para TODO texto expuesto al profesor:
//   · Cortos, naturales, útiles, amables.
//   · Una sola línea, siempre relacionados al momento exacto.
//   · Nunca frases motivacionales ni inspiracionales.
//   · Nunca usar: advertencia, penalización, incumplimiento, castigo.
//   · Prohibido: "cada clase es una oportunidad", "tu constancia hace la
//     diferencia", "sigue creciendo", "vas muy bien".
//   · Nunca mostrar varios mensajes al mismo tiempo.
//
// Las reglas completas viven solo dentro de "Guía del profesor". El resto
// del producto solo recuerda el siguiente paso o reconoce lo bien hecho.
// ============================================================================

// ----------------------------------------------------------------------------
// Programa de crecimiento (dos niveles).
// ----------------------------------------------------------------------------

export type TeacherLevel = 'essential' | 'special';

export const GROWTH_PROGRAM: Record<
  TeacherLevel,
  {
    key: TeacherLevel;
    name: string;
    tagline: string;
    description: string;
    benefits: string[];
  }
> = {
  essential: {
    key: 'essential',
    name: 'Essential',
    tagline: 'El punto de partida',
    description:
      'Aquí conoces nuestra metodología y comienzas a construir tu trayectoria.',
    benefits: [
      'Acompañamiento continuo',
      'Formación en metodología Wordlish',
      'Feedback sobre tus clases',
    ],
  },
  special: {
    key: 'special',
    name: 'Special',
    tagline: 'Reconocimiento al compromiso',
    description:
      'Los profesores Special reciben mejor tarifa y prioridad en asignaciones.',
    benefits: [
      'Mejor tarifa',
      'Prioridad en asignaciones',
      'Prioridad para nuevos cursos',
      'Prioridad en proyectos especiales',
    ],
  },
};

// ----------------------------------------------------------------------------
// Nuestro estándar (visible únicamente dentro de "Guía del profesor").
// ----------------------------------------------------------------------------

export const OUR_STANDARD: string[] = [
  'Llegar puntual',
  'Preparar cada clase',
  'Completar 60 minutos efectivos',
  'Presentación profesional',
  'Fondo limpio o neutro',
  'Revisar internet, cámara y micrófono',
  'Mantener un ambiente positivo',
  'Concentrar la clase en el aprendizaje',
];

// ----------------------------------------------------------------------------
// Bloques de cultura (visibles únicamente dentro de "Guía del profesor").
// ----------------------------------------------------------------------------

export interface CultureBlock {
  id: string;
  title: string;
  icon: string;
  lines: string[];
}

export const CULTURE_BLOCKS: CultureBlock[] = [
  {
    id: 'quality',
    title: 'Calidad',
    icon: 'sparkles',
    lines: [
      'Screenshot durante los primeros 10 minutos',
      'Reporte el mismo día',
      'Material de apoyo cuando aplique',
      'Todo queda registrado en Wordlish',
    ],
  },
  {
    id: 'communication',
    title: 'Comunicación',
    icon: 'chatbubbles',
    lines: [
      'La comunicación se realiza únicamente desde Wordlish',
      'No compartir teléfono ni redes personales',
      'El material se comparte por Zoom o Wordlish',
    ],
  },
  {
    id: 'punctuality',
    title: 'Puntualidad',
    icon: 'time',
    lines: [
      'Cada clase dura 60 minutos efectivos',
      'Si hay retraso, completa el tiempo restante',
      'Ante un imprevisto, avisa a coordinación',
    ],
  },
  {
    id: 'no_show',
    title: 'No show',
    icon: 'person-remove',
    lines: [
      'Si el estudiante no asiste, se registra según Wordlish',
      'La remuneración sigue la política vigente',
    ],
  },
  {
    id: 'recordings',
    title: 'Grabaciones',
    icon: 'videocam',
    lines: [
      'Las clases pueden grabarse con fines académicos y de calidad',
    ],
  },
  {
    id: 'payments',
    title: 'Pagos',
    icon: 'card',
    lines: ['Liquidaciones entre el día 1 y el día 5 de cada mes'],
  },
  {
    id: 'growth',
    title: 'Crecimiento',
    icon: 'trending-up',
    lines: [
      'Evaluamos puntualidad, preparación, reportes, satisfacción y procesos',
      'Coordinación acompaña siempre tu camino',
      'Siempre es una oportunidad de mejorar',
    ],
  },
];

// ----------------------------------------------------------------------------
// Indicadores positivos de crecimiento hacia Special.
// Cinco dimensiones: Puntualidad, Reportes, Preparación, Satisfacción,
// Cumplimiento de procesos. Cada valor 0-100.
// ----------------------------------------------------------------------------

export interface GrowthIndicator {
  id: string;
  label: string;
  icon: string;
  value: number;
  hint: string;
}

export const GROWTH_INDICATORS: GrowthIndicator[] = [
  {
    id: 'punctuality',
    label: 'Puntualidad',
    icon: 'time',
    value: 96,
    hint: 'Un mes sin retrasos.',
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: 'document-text',
    value: 92,
    hint: '22 de 24 a tiempo.',
  },
  {
    id: 'preparation',
    label: 'Preparación',
    icon: 'sparkles',
    value: 88,
    hint: 'Materiales listos a tiempo.',
  },
  {
    id: 'satisfaction',
    label: 'Satisfacción',
    icon: 'heart',
    value: 94,
    hint: 'Tus estudiantes lo notan.',
  },
  {
    id: 'process',
    label: 'Cumplimiento de procesos',
    icon: 'shield-checkmark',
    value: 91,
    hint: 'Screenshots y cierres al día.',
  },
];

// Umbral general para Special.
export const SPECIAL_THRESHOLD = 90;

export function growthAverage(indicators: GrowthIndicator[]): number {
  if (indicators.length === 0) return 0;
  const sum = indicators.reduce((acc, i) => acc + i.value, 0);
  return Math.round(sum / indicators.length);
}

// ----------------------------------------------------------------------------
// Frases de reconocimiento cuando el profesor mejora.
// Todas de una sola línea, máximo 8 palabras.
// ----------------------------------------------------------------------------

export const GROWTH_ENCOURAGEMENT: string[] = [
  '¡Excelente puntualidad este mes!',
  '¡Todos tus reportes están al día!',
  '¡Muy buen trabajo con tus procesos!',
  '¡Estás cada vez más cerca de Special!',
];

// Reconocimiento breve según el promedio actual. Nunca inspiracional.
// Retorna cadena vacía cuando no hay un logro concreto que reconocer.
export function encouragementFor(avg: number): string {
  if (avg >= SPECIAL_THRESHOLD) return '¡Estás cada vez más cerca de Special!';
  if (avg >= 85) return '¡Muy buen trabajo con tus procesos!';
  if (avg >= 75) return '¡Todos tus reportes están al día!';
  return '';
}

// ----------------------------------------------------------------------------
// Recordatorios contextuales (Teacher Hints).
// Se muestran únicamente en la pantalla y momento adecuados. Nunca varios
// a la vez. Cada uno ocupa una sola línea.
// ----------------------------------------------------------------------------

export type TeacherHintKey =
  // Recordatorios del siguiente paso
  | 'before_class'
  | 'ready_to_start'
  | 'during_screenshot'
  | 'complete_report'
  | 'finalize_after_report'
  | 'review_material'
  // Felicitaciones breves al completar un proceso
  | 'punctual_thanks'
  | 'report_sent'
  | 'screenshot_ok'
  | 'class_finished'
  | 'material_ready'
  // Reconocimientos por buenos indicadores
  | 'great_punctuality'
  | 'reports_on_track'
  | 'great_processes'
  | 'near_special'
  | 'all_done';

export const TEACHER_HINTS: Record<TeacherHintKey, string> = {
  before_class: 'Recuerda iniciar tu clase a la hora programada.',
  ready_to_start: 'Verifica que todo esté listo para comenzar.',
  during_screenshot: 'Verifica que el screenshot haya sido registrado.',
  complete_report: 'Completa el reporte para cerrar la sesión.',
  finalize_after_report: 'Finaliza la clase cuando hayas terminado el reporte.',
  review_material: 'Revisa el material antes de comenzar.',
  punctual_thanks: '¡Gracias por tu puntualidad!',
  report_sent: '¡Reporte enviado!',
  screenshot_ok: '¡Screenshot registrado!',
  class_finished: '¡Clase finalizada!',
  material_ready: '¡Material listo!',
  great_punctuality: '¡Excelente puntualidad este mes!',
  reports_on_track: '¡Todos tus reportes están al día!',
  great_processes: '¡Muy buen trabajo con tus procesos!',
  near_special: '¡Estás cada vez más cerca de Special!',
  all_done: '¡Todo al día!',
};

// ----------------------------------------------------------------------------
// Momentos motivacionales para el CoachBanner.
// Todos los mensajes de una sola línea, máximo 8 palabras cuando es posible.
// ----------------------------------------------------------------------------

export type CoachMoment =
  | 'login'
  | 'before_class'
  | 'after_screenshot'
  | 'after_report'
  | 'end_of_day'
  | 'perfect_week'
  | 'high_indicators'
  | 'great_ratings'
  | 'month_on_time';

export interface CoachMessage {
  title: string;
}

export function coachMessage(m: CoachMoment): CoachMessage | null {
  switch (m) {
    case 'login':
      // Sin mensaje de bienvenida motivacional. Silencio = respeto.
      return null;
    case 'before_class':
      return { title: 'Recuerda iniciar tu clase a la hora programada.' };
    case 'after_screenshot':
      return { title: '¡Screenshot registrado!' };
    case 'after_report':
      return { title: '¡Reporte enviado!' };
    case 'end_of_day':
      return { title: '¡Clase finalizada!' };
    case 'perfect_week':
      return { title: '¡Muy buen trabajo con tus procesos!' };
    case 'high_indicators':
      return { title: '¡Estás cada vez más cerca de Special!' };
    case 'great_ratings':
      return { title: '¡Todos tus reportes están al día!' };
    case 'month_on_time':
      return { title: '¡Excelente puntualidad este mes!' };
  }
}

// ----------------------------------------------------------------------------
// Selección automática del momento a mostrar según el contexto de la sesión.
// ----------------------------------------------------------------------------

export interface CoachContext {
  justLoggedIn?: boolean;
  hasClassSoon?: boolean;
  justSentScreenshot?: boolean;
  justSentReport?: boolean;
  dayFinished?: boolean;
  perfectWeek?: boolean;
  monthOnTime?: boolean;
  averageIndicator?: number;
}

export function pickCoachMoment(ctx: CoachContext): CoachMoment | null {
  if (ctx.justSentReport) return 'after_report';
  if (ctx.justSentScreenshot) return 'after_screenshot';
  if (ctx.dayFinished) return 'end_of_day';
  if (ctx.perfectWeek) return 'perfect_week';
  if (ctx.monthOnTime) return 'month_on_time';
  if (ctx.hasClassSoon) return 'before_class';
  if (
    typeof ctx.averageIndicator === 'number' &&
    ctx.averageIndicator >= SPECIAL_THRESHOLD
  ) {
    return 'high_indicators';
  }
  if (ctx.justLoggedIn) return 'login';
  return null;
}

// ----------------------------------------------------------------------------
// Estado del screenshot durante la clase en curso.
// Fuente única compartida entre Home y Pendientes.
// ----------------------------------------------------------------------------

export type ScreenshotTone = 'primary' | 'warning' | 'danger';

export function getScreenshotStatus(
  minutesElapsed: number,
  graceMin: number,
): { label: string; tone: ScreenshotTone } {
  if (minutesElapsed > graceMin) return { label: 'Screenshot vencido', tone: 'danger' };
  if (minutesElapsed >= graceMin - 2) return { label: 'Envíalo ahora', tone: 'warning' };
  return { label: 'Screenshot pendiente', tone: 'primary' };
}
