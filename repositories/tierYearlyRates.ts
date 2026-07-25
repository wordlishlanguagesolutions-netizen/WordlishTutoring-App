// ============================================================================
// Wordlish · Repositorio de tarifas anuales por rango (tier × kind × year).
//
// Consume `public.tier_yearly_rates` en OnSpace Cloud. RLS:
//   · admin_all_tier_yearly_rates      → CRUD para admin
//   · staff_select_tier_yearly_rates   → SELECT para admin, supervisor, teacher
//
// Mapeo obligatorio en el borde:
//   App `specialist`   ↔ Cloud `special`
//   App `individual`   ↔ Cloud `personal`
//
// Los consumidores UI usan los términos de la app; el mapeo vive solo aquí.
// ============================================================================
import { getSupabaseClient } from '@/template';

export type TeacherTier = 'essentials' | 'specialist';
export type ClassKind = 'individual' | 'group';

export interface TierYearlyRate {
  id: string;
  year: number;
  tier: TeacherTier;
  kind: ClassKind;
  amount: number;
  currency: string;
  active: boolean;
  underReview: boolean;
  note?: string;
}

// ─── Cloud raw types ────────────────────────────────────────────────────────
type DbTier = 'essentials' | 'special';
type DbKind = 'personal' | 'group';

interface DbRow {
  id: string;
  year: number;
  tier: DbTier;
  kind: DbKind;
  amount: string | number;
  currency: string;
  active: boolean;
  under_review: boolean;
  note: string | null;
  effective_from: string | null;
}

// ─── Mappers ────────────────────────────────────────────────────────────────
function tierToApp(t: DbTier): TeacherTier {
  return t === 'special' ? 'specialist' : 'essentials';
}
function tierToDb(t: TeacherTier): DbTier {
  return t === 'specialist' ? 'special' : 'essentials';
}
function kindToApp(k: DbKind): ClassKind {
  return k === 'personal' ? 'individual' : 'group';
}
function kindToDb(k: ClassKind): DbKind {
  return k === 'individual' ? 'personal' : 'group';
}

function toModel(r: DbRow): TierYearlyRate {
  return {
    id: r.id,
    year: r.year,
    tier: tierToApp(r.tier),
    kind: kindToApp(r.kind),
    amount: typeof r.amount === 'string' ? Number(r.amount) : r.amount,
    currency: r.currency,
    active: r.active,
    underReview: r.under_review,
    note: r.note ?? undefined,
  };
}

// ─── API ────────────────────────────────────────────────────────────────────
export const tierYearlyRatesRepo = {
  /** Lista todas las tarifas activas. */
  async list(): Promise<TierYearlyRate[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tier_yearly_rates')
        .select('id, year, tier, kind, amount, currency, active, under_review, note, effective_from')
        .eq('active', true)
        .order('year', { ascending: false });
      if (error) {
        console.warn('[tierYearlyRatesRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as DbRow));
    } catch (err) {
      console.warn('[tierYearlyRatesRepo.list] exception', err);
      return [];
    }
  },

  /**
   * Inserta o actualiza una tarifa (year, tier, kind) → amount.
   * Usa el UNIQUE index de Cloud para hacer upsert atómico.
   * Devuelve el row actualizado o `null` si Cloud falla.
   */
  async upsert(args: {
    year: number;
    tier: TeacherTier;
    kind: ClassKind;
    amount: number;
    currency: string;
    underReview?: boolean;
    note?: string;
  }): Promise<TierYearlyRate | null> {
    try {
      const supabase = getSupabaseClient();
      const payload = {
        year: args.year,
        tier: tierToDb(args.tier),
        kind: kindToDb(args.kind),
        amount: args.amount,
        currency: args.currency,
        under_review: args.underReview ?? false,
        note: args.note ?? null,
        active: true,
      };
      const { data, error } = await supabase
        .from('tier_yearly_rates')
        .upsert(payload, { onConflict: 'year,tier,kind' })
        .select('id, year, tier, kind, amount, currency, active, under_review, note, effective_from')
        .single();
      if (error) {
        console.warn('[tierYearlyRatesRepo.upsert] error', error.message);
        return null;
      }
      return toModel(data as DbRow);
    } catch (err) {
      console.warn('[tierYearlyRatesRepo.upsert] exception', err);
      return null;
    }
  },

  /**
   * Actualiza el `note` de todas las filas de un año.
   */
  async setYearNote(year: number, note: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('tier_yearly_rates')
        .update({ note })
        .eq('year', year);
      if (error) {
        console.warn('[tierYearlyRatesRepo.setYearNote] error', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[tierYearlyRatesRepo.setYearNote] exception', err);
      return false;
    }
  },

  /**
   * Actualiza la moneda de todas las filas de un año.
   */
  async setYearCurrency(year: number, currency: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('tier_yearly_rates')
        .update({ currency })
        .eq('year', year);
      if (error) {
        console.warn('[tierYearlyRatesRepo.setYearCurrency] error', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[tierYearlyRatesRepo.setYearCurrency] exception', err);
      return false;
    }
  },

  /**
   * Duplica todas las filas de un año en otro. Ignora conflictos si el
   * destino ya existe (respeta el UNIQUE constraint).
   */
  async cloneYear(fromYear: number, toYear: number): Promise<TierYearlyRate[]> {
    try {
      const supabase = getSupabaseClient();
      const { data: src, error: readErr } = await supabase
        .from('tier_yearly_rates')
        .select('tier, kind, amount, currency, under_review, note')
        .eq('year', fromYear);
      if (readErr) {
        console.warn('[tierYearlyRatesRepo.cloneYear.read] error', readErr.message);
        return [];
      }
      if (!src || src.length === 0) return [];
      const payload = src.map((r: any) => ({
        year: toYear,
        tier: r.tier,
        kind: r.kind,
        amount: r.amount,
        currency: r.currency,
        under_review: r.under_review,
        note: r.note,
        active: true,
      }));
      const { data, error } = await supabase
        .from('tier_yearly_rates')
        .upsert(payload, { onConflict: 'year,tier,kind', ignoreDuplicates: true })
        .select('id, year, tier, kind, amount, currency, active, under_review, note, effective_from');
      if (error) {
        console.warn('[tierYearlyRatesRepo.cloneYear.write] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as DbRow));
    } catch (err) {
      console.warn('[tierYearlyRatesRepo.cloneYear] exception', err);
      return [];
    }
  },
};
