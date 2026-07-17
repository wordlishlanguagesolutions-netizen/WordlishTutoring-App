// ============================================================================
// Cultura Wordlish para profesores · v2.0
// ============================================================================
// Este archivo NO es un reglamento. Es la cultura del equipo docente.
// La app enseña la cultura Wordlish poco a poco, mediante pequeños mensajes
// contextuales que aparecen únicamente cuando corresponde.
//
// Reglas de redacción para TODO texto expuesto al profesor:
//   · Una sola línea.
//   · Máximo 8 palabras cuando sea posible.
//   · Tono cercano, profesional, positivo, tranquilo, sin presión.
//   · Nunca usar: advertencia, penalización, incumplimiento, castigo.
//   · Usar pequeños recordatorios y reconocimientos.
//
// Las reglas completas viven solo dentro de "Guía del profesor". La app las
// enseña de forma natural durante el uso diario, sin interrumpir.
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
  '¡Excelente trabajo!',
  'Vas por muy buen camino.',
  'Estás cada vez más cerca de Special.',
  'Tu constancia se nota.',
];

// Selecciona un mensaje de crecimiento en función del promedio actual.
// Es determinista para que el mismo valor muestre siempre el mismo mensaje
// durante una sesión y no oscile de manera nerviosa.
export function encouragementFor(avg: number): string {
  if (avg >= SPECIAL_THRESHOLD) return 'Estás cada vez más cerca de Special.';
  if (avg >= 85) return 'Vas por muy buen camino.';
  if (avg >= 75) return 'Tu constancia se nota.';
  return 'Cada clase suma a tu crecimiento.';
}

// ----------------------------------------------------------------------------
// Recordatorios contextuales (Teacher Hints).
// Se muestran únicamente en la pantalla y momento adecuados. Nunca varios
// a la vez. Cada uno ocupa una sola línea.
// ----------------------------------------------------------------------------

export type TeacherHintKey =
  | 'home_start'
  | 'home_ready'
  | 'before_class'
  | 'agenda'
  | 'report'
  | 'material'
  | 'profile'
  | 'after_class'
  | 'after_report'
  | 'pendientes_calm'
  | 'pendientes_none';

export const TEACHER_HINTS: Record<TeacherHintKey, string> = {
  home_start: 'Hoy será un gran día.',
  home_ready: 'Todo listo para comenzar.',
  before_class: 'Llega con unos minutos de anticipación.',
  agenda: 'Una buena organización hace la diferencia.',
  report: 'Un buen reporte también enseña.',
  material: 'Preparar antes siempre ayuda.',
  profile: 'Tu espacio también comunica confianza.',
  after_class: 'Excelente trabajo.',
  after_report: 'Gracias por acompañar este proceso.',
  pendientes_calm: 'Un paso a la vez, sin prisa.',
  pendientes_none: 'Todo al día. Gracias.',
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
      return { title: '¡Qué bueno verte!' };
    case 'before_class':
      return { title: 'Todo listo para comenzar.' };
    case 'after_screenshot':
      return { title: 'Asistencia registrada. Excelente inicio.' };
    case 'after_report':
      return { title: 'Un buen reporte también enseña.' };
    case 'end_of_day':
      return { title: 'Excelente trabajo. Gracias por hoy.' };
    case 'perfect_week':
      return { title: 'Semana impecable. Gracias por tu constancia.' };
    case 'high_indicators':
      return { title: 'Estás cada vez más cerca de Special.' };
    case 'great_ratings':
      return { title: 'Tu constancia se nota.' };
    case 'month_on_time':
      return { title: 'Un mes de puntualidad. Gran hábito.' };
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
