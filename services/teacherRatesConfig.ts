// ============================================================================
// Wordlish · Configuración de tarifas por hora de profesores.
//
// El administrador define cuánto se paga al profesor por cada hora dictada,
// separado por:
//   · Categoría (tier)     : essentials | specialist
//   · Modalidad (kind)     : individual | group
//   · Año fiscal (year)    : la tarifa puede cambiar cada año.
//
// ── Estado de migración ─────────────────────────────────────────────────────
// ✅ Migrado a OnSpace Cloud (tabla `public.tier_yearly_rates`) el 2026-07-25.
// Este servicio actúa como capa de caché + hidratación para no romper la
// API sincrónica que ya consumen los paneles admin. Todas las mutaciones
// son fire-and-forget al Cloud con rollback si la escritura falla.
//
// Mapeo de nomenclatura vive únicamente en `repositories/tierYearlyRates.ts`.
// Aquí seguimos usando los términos del dominio de la app.
// ============================================================================

import { tierYearlyRatesRepo, type TierYearlyRate } from '@/repositories/tierYearlyRates';

export type TeacherTier = 'essentials' | 'specialist';
export type ClassKind = 'individual' | 'group';

export interface TeacherRate {
  tier: TeacherTier;
  kind: ClassKind;
  amount: number;
  underReview?: boolean;
}

export interface YearlyRates {
  year: number;
  currency: string;
  rates: TeacherRate[];
  note?: string;
}

// ─── Fallback local ──────────────────────────────────────────────────────────
// Se usa solo mientras Cloud responde por primera vez. Después se descarta.
const FALLBACK_2026: YearlyRates = {
  year: 2026,
  currency: 'USD',
  note: 'Cargando desde OnSpace Cloud…',
  rates: [
    { tier: 'essentials', kind: 'individual', amount: 25 },
    { tier: 'essentials', kind: 'group', amount: 27 },
    { tier: 'specialist', kind: 'individual', amount: 30 },
    { tier: 'specialist', kind: 'group', amount: 35, underReview: true },
  ],
};

export const teacherRatesConfig = {
  currentYear: FALLBACK_2026.year,
  years: [FALLBACK_2026] as YearlyRates[],
};

// ─── Reactividad ─────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;
let hydrated = false;
let inflight: Promise<void> | null = null;

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[teacherRatesConfig] listener error', err);
    }
  });
}

export function subscribeTeacherRates(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getTeacherRatesVersion(): number {
  return version;
}

export function isTeacherRatesHydrated(): boolean {
  return hydrated;
}

// ─── Reducer Cloud rows → YearlyRates[] ──────────────────────────────────────
function reduceRows(rows: TierYearlyRate[]): YearlyRates[] {
  const byYear = new Map<number, YearlyRates>();
  for (const row of rows) {
    let entry = byYear.get(row.year);
    if (!entry) {
      entry = { year: row.year, currency: row.currency, rates: [], note: row.note };
      byYear.set(row.year, entry);
    }
    // La moneda y la nota vienen replicadas por fila; conservamos la última
    // no vacía como representante del año.
    if (row.currency) entry.currency = row.currency;
    if (row.note && !entry.note) entry.note = row.note;
    entry.rates.push({
      tier: row.tier,
      kind: row.kind,
      amount: row.amount,
      underReview: row.underReview || undefined,
    });
  }
  return Array.from(byYear.values()).sort((a, b) => b.year - a.year);
}

// ─── Hidratación ─────────────────────────────────────────────────────────────
export function hydrateTeacherRates(force = false): Promise<void> {
  if (hydrated && !force) return Promise.resolve();
  if (inflight) return inflight;

  inflight = (async () => {
    const rows = await tierYearlyRatesRepo.list();
    if (rows.length > 0) {
      const grouped = reduceRows(rows);
      teacherRatesConfig.years = grouped;
      // Si el año "actual" no está en Cloud, elegimos el más reciente.
      const hasCurrent = grouped.some((y) => y.year === teacherRatesConfig.currentYear);
      if (!hasCurrent && grouped[0]) {
        teacherRatesConfig.currentYear = grouped[0].year;
      }
      hydrated = true;
      notify();
    } else {
      console.warn('[teacherRatesConfig.hydrate] Cloud devolvió vacío, se mantiene fallback');
    }
    inflight = null;
  })();

  return inflight;
}

// ─── Lectura sincrónica (compat) ─────────────────────────────────────────────
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
  return getYearRates(year)?.rates.find((r) => r.tier === tier && r.kind === kind);
}

// ─── Escritura (optimistic + rollback) ───────────────────────────────────────
export async function upsertRate(
  year: number,
  tier: TeacherTier,
  kind: ClassKind,
  amount: number,
  underReview?: boolean,
): Promise<boolean> {
  const yearEntry = getYearRates(year);
  const previous = yearEntry?.rates.find((r) => r.tier === tier && r.kind === kind);
  const previousSnapshot = previous ? { ...previous } : undefined;
  const currency = yearEntry?.currency ?? 'USD';
  const note = yearEntry?.note;

  // Optimistic local
  if (yearEntry) {
    if (previous) {
      previous.amount = amount;
      if (underReview !== undefined) previous.underReview = underReview || undefined;
    } else {
      yearEntry.rates.push({ tier, kind, amount, underReview: underReview || undefined });
    }
  } else {
    teacherRatesConfig.years.unshift({
      year,
      currency,
      note,
      rates: [{ tier, kind, amount, underReview: underReview || undefined }],
    });
  }
  notify();

  // Cloud
  const result = await tierYearlyRatesRepo.upsert({
    year,
    tier,
    kind,
    amount,
    currency,
    underReview,
    note,
  });

  if (!result) {
    // Rollback
    const y = getYearRates(year);
    if (y) {
      const idx = y.rates.findIndex((r) => r.tier === tier && r.kind === kind);
      if (idx >= 0) {
        if (previousSnapshot) {
          y.rates[idx] = previousSnapshot;
        } else {
          y.rates.splice(idx, 1);
        }
      }
    }
    notify();
    return false;
  }

  return true;
}

export async function setYearNote(year: number, note: string): Promise<boolean> {
  const y = getYearRates(year);
  const prev = y?.note;
  if (y) {
    y.note = note;
    notify();
  }
  const ok = await tierYearlyRatesRepo.setYearNote(year, note);
  if (!ok && y) {
    y.note = prev;
    notify();
  }
  return ok;
}

export async function setYearCurrency(year: number, currency: string): Promise<boolean> {
  const y = getYearRates(year);
  const prev = y?.currency;
  if (y) {
    y.currency = currency;
    notify();
  }
  const ok = await tierYearlyRatesRepo.setYearCurrency(year, currency);
  if (!ok && y && prev) {
    y.currency = prev;
    notify();
  }
  return ok;
}

export function setCurrentYear(year: number): void {
  teacherRatesConfig.currentYear = year;
  notify();
}

export async function cloneYear(
  fromYear: number,
  toYear: number,
): Promise<YearlyRates | undefined> {
  if (getYearRates(toYear)) return getYearRates(toYear);

  // Optimistic local
  const src = getYearRates(fromYear);
  if (!src) return undefined;
  const copy: YearlyRates = {
    year: toYear,
    currency: src.currency,
    note: src.note,
    rates: src.rates.map((r) => ({ ...r })),
  };
  teacherRatesConfig.years.push(copy);
  teacherRatesConfig.years.sort((a, b) => b.year - a.year);
  notify();

  // Cloud
  const rows = await tierYearlyRatesRepo.cloneYear(fromYear, toYear);
  if (rows.length === 0) {
    // Rollback local si Cloud rechazó
    teacherRatesConfig.years = teacherRatesConfig.years.filter((y) => y.year !== toYear);
    notify();
    return undefined;
  }
  // Reemplazamos la copia local con lo que Cloud confirmó.
  const clouded = reduceRows(rows).find((y) => y.year === toYear);
  if (clouded) {
    const idx = teacherRatesConfig.years.findIndex((y) => y.year === toYear);
    if (idx >= 0) teacherRatesConfig.years[idx] = clouded;
    else teacherRatesConfig.years.unshift(clouded);
    teacherRatesConfig.years.sort((a, b) => b.year - a.year);
    notify();
  }
  return getYearRates(toYear);
}

// ─── Etiquetas de presentación ───────────────────────────────────────────────
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
    const isUsd = currency === 'USD' || currency === 'PAB';
    return new Intl.NumberFormat(isUsd ? 'en-US' : 'es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: isUsd ? 2 : 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('es-CO')}`;
  }
}
