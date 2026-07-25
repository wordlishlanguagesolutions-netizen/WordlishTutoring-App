// ============================================================================
// Wordlish · Configuración de tarifas por hora de profesores.
//
// El administrador define cuánto se paga al profesor por cada hora dictada,
// separado por:
//   · Categoría (tier)     : essentials | specialist
//   · Modalidad (kind)     : individual | group
//   · Año fiscal (year)    : la tarifa puede cambiar cada año.
//
// Todo consumidor (nómina, reportes, panel admin) debe leer las tarifas
// vigentes desde aquí. En Fase 3B se persistirá en la tabla `teacher_rates`
// de OnSpace Cloud. Por ahora vive en memoria y ofrece los mismos métodos
// que el backend expondrá luego.
// ============================================================================

export type TeacherTier = 'essentials' | 'specialist';
export type ClassKind = 'individual' | 'group';

export interface TeacherRate {
  tier: TeacherTier;
  kind: ClassKind;
  amount: number;      // valor por hora en `currency`
  underReview?: boolean;
}

export interface YearlyRates {
  year: number;
  currency: string;    // 'COP' | 'USD' | 'PAB' …
  rates: TeacherRate[];
  note?: string;
}

// ─── Tarifas por defecto declaradas por Wordlish · 2026 ──────────────────────
// Essentials individual : 25.000
// Essentials grupal     : 27.000
// Specialist individual : 30.000
// Specialist grupal     : 35.000 (en evaluación)
const DEFAULT_2026: YearlyRates = {
  year: 2026,
  currency: 'COP',
  note: 'La tarifa grupal de especialistas está en evaluación y puede ajustarse.',
  rates: [
    { tier: 'essentials', kind: 'individual', amount: 25000 },
    { tier: 'essentials', kind: 'group',      amount: 27000 },
    { tier: 'specialist', kind: 'individual', amount: 30000 },
    { tier: 'specialist', kind: 'group',      amount: 35000, underReview: true },
  ],
};

// Estado global en memoria. Un futuro `teacherRatesRepository` reemplazará
// este objeto sin cambiar la API pública.
export const teacherRatesConfig = {
  currentYear: DEFAULT_2026.year,
  years: [DEFAULT_2026] as YearlyRates[],
};

// ─── Lectura ────────────────────────────────────────────────────────────────
export function getYearRates(year: number): YearlyRates | undefined {
  return teacherRatesConfig.years.find((y) => y.year === year);
}

export function listYears(): number[] {
  return teacherRatesConfig.years.map((y) => y.year).sort((a, b) => b - a);
}

export function getRate(
  year: number,
  tier: TeacherTier,
  kind: ClassKind,
): TeacherRate | undefined {
  return getYearRates(year)?.rates.find(
    (r) => r.tier === tier && r.kind === kind,
  );
}

// ─── Escritura ──────────────────────────────────────────────────────────────
export function upsertRate(
  year: number,
  tier: TeacherTier,
  kind: ClassKind,
  amount: number,
  underReview?: boolean,
): void {
  const y = getYearRates(year);
  if (!y) return;
  const existing = y.rates.find((r) => r.tier === tier && r.kind === kind);
  if (existing) {
    existing.amount = amount;
    if (underReview !== undefined) existing.underReview = underReview;
  } else {
    y.rates.push({ tier, kind, amount, underReview });
  }
}

export function setYearNote(year: number, note: string): void {
  const y = getYearRates(year);
  if (y) y.note = note;
}

export function setYearCurrency(year: number, currency: string): void {
  const y = getYearRates(year);
  if (y) y.currency = currency;
}

export function setCurrentYear(year: number): void {
  teacherRatesConfig.currentYear = year;
}

export function cloneYear(fromYear: number, toYear: number): YearlyRates | undefined {
  if (getYearRates(toYear)) return getYearRates(toYear);
  const src = getYearRates(fromYear);
  if (!src) return undefined;
  const copy: YearlyRates = {
    year: toYear,
    currency: src.currency,
    note: src.note,
    rates: src.rates.map((r) => ({ ...r })),
  };
  teacherRatesConfig.years.push(copy);
  return copy;
}

// ─── Etiquetas de presentación ──────────────────────────────────────────────
export const TIER_LABEL: Record<TeacherTier, string> = {
  essentials: 'Essentials',
  specialist: 'Specialist',
};

export const KIND_LABEL: Record<ClassKind, string> = {
  individual: 'Individual',
  group: 'Grupal',
};

export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('es-CO')}`;
  }
}
