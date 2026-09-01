// ============================================================================
// Cultura Wordlish para profesores · v1.0
// ============================================================================
// Este archivo NO es un reglamento. Es la cultura del equipo docente.
// Todo texto está redactado con tono cercano, profesional y motivador.
// Nunca se habla de castigos: se habla de crecimiento.
// Nunca se habla de reglas: se habla de estándares.
//
// El módulo del profesor debe transmitir orgullo de pertenecer a Wordlish
// y acompañar al docente durante todo su recorrido: recordar, motivar,
// felicitar y reconocer. La app no supervisa; entrena.
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
      'Aquí conoces nuestra metodología, fortaleces tus procesos y comienzas a construir tu trayectoria.',
    benefits: [
      'Acompañamiento continuo',
      'Formación en la metodología Wordlish',
      'Feedback sobre tus clases',
    ],
  },
  special: {
    key: 'special',
    name: 'Special',
    tagline: 'Un reconocimiento al compromiso y la excelencia',
    description:
      'Los profesores Special reciben mejor tarifa y prioridad en asignaciones, nuevos cursos y proyectos.',
    benefits: [
      'Mejor tarifa',
      'Prioridad en asignación de clases',
      'Prioridad para nuevos cursos',
      'Prioridad en proyectos especiales',
    ],
  },
};

// ----------------------------------------------------------------------------
// Nuestro estándar (lo que esperamos de cada profesor).
// No son "reglas": son la manera Wordlish de dar clase.
// ----------------------------------------------------------------------------

export const OUR_STANDARD: string[] = [
  'Llegar puntual',
  'Preparar cada clase',
  'Completar 60 minutos efectivos',
  'Mantener presentación profesional',
  'Fondo limpio, desenfocado o pared neutra',
  'Revisar internet, cámara y micrófono antes de iniciar',
  'Mantener un ambiente positivo',
  'Concentrar la conversación en el aprendizaje',
];

// ----------------------------------------------------------------------------
// Bloques de cultura (calidad, comunicación, puntualidad, etc.).
// Se usan en la pantalla de estándares y como recordatorios contextuales.
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
      'Toda la comunicación con estudiantes y acudientes se realiza únicamente desde Wordlish',
      'No compartir teléfono, correo personal ni redes sociales',
      'El material se comparte únicamente por Zoom o Wordlish',
    ],
  },
  {
    id: 'punctuality',
    title: 'Puntualidad',
    icon: 'time',
    lines: [
      'Cada clase dura 60 minutos efectivos',
      'Si presentas un retraso, completa el tiempo restante',
      'Si surge un imprevisto, informa a coordinación de inmediato',
    ],
  },
  {
    id: 'no_show',
    title: 'No show',
    icon: 'person-remove',
    lines: [
      'Si el estudiante no asiste, la clase se registra según el procedimiento de Wordlish',
      'La remuneración corresponde a la política vigente de tu nivel',
    ],
  },
  {
    id: 'recordings',
    title: 'Grabaciones',
    icon: 'videocam',
    lines: [
      'Las clases podrán grabarse para fines académicos y de control de calidad',
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
      'Evaluamos puntualidad, preparación, screenshot oportuno, calidad del reporte, experiencia del estudiante y cumplimiento de procesos',
      'Cuando surjan incumplimientos reiterados, coordinación revisará contigo tu nivel',
      'El objetivo siempre será ayudarte a recuperarlo. Es una oportunidad, no un castigo.',
    ],
  },
];

// ----------------------------------------------------------------------------
// Indicadores positivos de crecimiento hacia Special.
// El profesor ve su progreso sin sentir presión. Cada indicador es una
// métrica positiva, expresada como porcentaje de logro (0-100).
// Los valores mock se usan hasta migrar a mockDb/repositories.
// ----------------------------------------------------------------------------

export interface GrowthIndicator {
  id: string;
  label: string;
  icon: string;
  value: number; // 0-100
  hint: string;
}

export const GROWTH_INDICATORS: GrowthIndicator[] = [
  {
    id: 'punctuality',
    label: 'Puntualidad',
    icon: 'time',
    value: 96,
    hint: 'Un mes sin retrasos',
  },
  {
    id: 'reports',
    label: 'Reportes al día',
    icon: 'document-text',
    value: 92,
    hint: '22 de 24 enviados a tiempo',
  },
  {
    id: 'preparation',
    label: 'Preparación',
    icon: 'sparkles',
    value: 88,
    hint: 'Materiales cargados a tiempo',
  },
  {
    id: 'satisfaction',
    label: 'Satisfacción',
    icon: 'heart',
    value: 94,
    hint: 'Tus estudiantes lo están notando',
  },
];

// Umbral general para Special. Cuando el promedio supere este valor durante
// varios ciclos, coordinación evalúa el ascenso. Nunca se muestra como una
// "nota": se muestra como progreso hacia una meta positiva.
export const SPECIAL_THRESHOLD = 90;

export function growthAverage(indicators: GrowthIndicator[]): number {
  if (indicators.length === 0) return 0;
  const sum = indicators.reduce((acc, i) => acc + i.value, 0);
  return Math.round(sum / indicators.length);
}

// ----------------------------------------------------------------------------
// Momentos motivacionales.
// La app acompaña al profesor. Devuelve el mensaje adecuado para el momento
// actual. Si no hay mensaje relevante, devuelve `null` (silencio = respeto).
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
  subtitle?: string;
}

export function coachMessage(m: CoachMoment): CoachMessage | null {
  switch (m) {
    case 'login':
      return { title: 'Hoy tienes la oportunidad de marcar la diferencia.' };
    case 'before_class':
      return { title: 'Todo listo. Que tengas una excelente clase.' };
    case 'after_screenshot':
      return {
        title: 'Asistencia registrada.',
        subtitle: 'Excelente inicio.',
      };
    case 'after_report':
      return {
        title: 'Un buen reporte también enseña.',
        subtitle: 'Gracias.',
      };
    case 'end_of_day':
      return {
        title: 'Buen trabajo.',
        subtitle: 'Gracias por representar la experiencia Wordlish.',
      };
    case 'perfect_week':
      return {
        title: 'Semana impecable.',
        subtitle: 'Gracias por tu compromiso.',
      };
    case 'high_indicators':
      return { title: 'Tu constancia te acerca al nivel Special.' };
    case 'great_ratings':
      return { title: 'Tus estudiantes lo están notando. Sigue así.' };
    case 'month_on_time':
      return {
        title: 'Un mes de puntualidad.',
        subtitle: 'Los pequeños hábitos construyen grandes profesores.',
      };
  }
}

// ----------------------------------------------------------------------------
// Selección automática del momento a mostrar según el contexto de la sesión.
// El home del profesor puede llamar a este helper con datos básicos y recibir
// el mensaje más adecuado sin lógica repetida en cada pantalla.
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
