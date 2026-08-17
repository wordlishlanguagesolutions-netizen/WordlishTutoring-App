// ============================================================================
// Wordlish · Repositorio de disponibilidad de profesores (Cloud real).
//
// Reemplaza al mock in-memory `mockDb.availability`. Consulta directamente
// `public.teacher_availability` (RLS `authenticated_select_published_avail`),
// mas un join a `public.teachers`/`user_profiles` para exponer el nombre,
// avatar, tier y materias de cada profesor. La disponibilidad semanal por
// weekday se indexa en memoria para servirla sincronamente a
// `services/bookingService.ts` sin romper el API existente.
//
// Contrato:
//   Asincrono (via Supabase):
//     - warmCache(force?)     -> hidrata el cache; idempotente y con TTL 60s.
//     - refresh()             -> alias de warmCache(true).
//     - getSlots(id, wd)      -> slots publicados del profesor para ese dia.
//     - getBySubject(sub,tier?)-> lista de profesores compatibles con la
//                                 materia (y tier del plan), cada uno con
//                                 sus slots semanales.
//     - getForTeacher(id)     -> filas crudas de disponibilidad.
//     - publish(id, wd, slots, weekStart?) -> upsert de una franja.
//
//   Sincrono (desde el cache; requieren warmCache previo):
//     - getCachedSlots(id, wd)
//     - getCachedTeachersForSubject(subject, tier?)
//     - getCachedTeacherById(id)
//     - isReady() / getVersion()
//
//   Reactividad:
//     - subscribe(cb) -> se dispara en cada refresh del cache. El bump de
//       version permite que consumidores React fuercen un re-render.
//
// Notas de matching de materia:
//   El wizard usa formatos como "Ingles" o "Ingles . Basico" (Basico es un
//   nivel opcional separado por " . "). El matching se hace ignorando
//   mayusculas y tildes contra `teachers.subjects` (text[]) y, si se pasa
//   nivel, se filtra tambien contra `teachers.grades` (text[]) reexpuesto
//   como `levels` para preservar el mismo contrato que TEACHERS_FULL.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { TeacherTier } from '@/constants/policies';
import { getAllowedTiers } from '@/constants/policies';

// ---------------------------------------------------------------------------
// Tipos publicos.
// ---------------------------------------------------------------------------
export interface TeacherAvailabilityRow {
  id: string;
  teacherId: string;
  weekStart: string;
  weekday: number;
  slots: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherWithSlots {
  id: string;
  name: string;
  avatar: string;
  tier: TeacherTier;
  subjects: string[];
  levels: string[];
  weekSlots: Record<number, string[]>; // weekday (0..6) -> slots ordenados
}

// ---------------------------------------------------------------------------
// Estado interno del cache.
// ---------------------------------------------------------------------------
type CacheState = {
  availability: TeacherAvailabilityRow[];
  teachers: TeacherWithSlots[];
  teachersById: Record<string, TeacherWithSlots>;
  ready: boolean;
  version: number;
  loadedAt: number;
};

const state: CacheState = {
  availability: [],
  teachers: [],
  teachersById: {},
  ready: false,
  version: 0,
  loadedAt: 0,
};

const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
const CACHE_TTL_MS = 60_000;

function emit(): void {
  state.version += 1;
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.warn('[availabilityRepo.emit] listener threw', err);
    }
  });
}

// ---------------------------------------------------------------------------
// Utilidades de matching de materia.
// ---------------------------------------------------------------------------
function normalizeSubjectKey(subject: string): string {
  return (subject || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function teacherTeachesSubject(t: TeacherWithSlots, subject: string): boolean {
  if (!subject) return false;
  const key = normalizeSubjectKey(subject);
  return t.subjects.some((s) => normalizeSubjectKey(s) === key);
}

function splitSubject(subject: string): { base: string; level: string | null } {
  const parts = (subject || '').split(' · ');
  return { base: parts[0] ?? '', level: parts[1] ?? null };
}

function applyFilters(
  list: TeacherWithSlots[],
  subject: string,
  planTier?: TeacherTier,
): TeacherWithSlots[] {
  const { base, level } = splitSubject(subject);
  let out = list.filter((t) => teacherTeachesSubject(t, base));
  if (level) {
    const levelKey = normalizeSubjectKey(level);
    out = out.filter(
      (t) =>
        Array.isArray(t.levels) &&
        t.levels.some((l) => normalizeSubjectKey(l) === levelKey),
    );
  }
  if (planTier) {
    const allowed = getAllowedTiers(planTier);
    out = out.filter((t) => allowed.includes(t.tier));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fetchers hacia Supabase.
// ---------------------------------------------------------------------------
async function fetchAvailability(): Promise<TeacherAvailabilityRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('teacher_availability')
      .select(
        'id, teacher_id, week_start, weekday, slots, published_at, created_at, updated_at',
      )
      .not('published_at', 'is', null)
      .order('week_start', { ascending: false });
    if (error) {
      console.warn('[availabilityRepo.fetchAvailability] error', error.message);
      return [];
    }
    return (data ?? []).map((r: any) => ({
      id: r.id,
      teacherId: r.teacher_id,
      weekStart: r.week_start,
      weekday: r.weekday,
      slots: Array.isArray(r.slots) ? r.slots : [],
      publishedAt: r.published_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (err) {
    console.warn('[availabilityRepo.fetchAvailability] exception', err);
    return [];
  }
}

type TeacherMetaBase = Omit<TeacherWithSlots, 'weekSlots'>;

async function fetchTeacherMeta(): Promise<TeacherMetaBase[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('teachers')
      .select(
        'id, tier, subjects, grades, user_profiles:user_profiles!teachers_user_id_fkey(full_name, first_name, avatar_url, active)',
      );
    if (error) {
      console.warn('[availabilityRepo.fetchTeacherMeta] error', error.message);
      return [];
    }
    return (data ?? [])
      .map((r: any) => {
        const up = r.user_profiles ?? {};
        const grades: string[] = Array.isArray(r.grades) ? r.grades : [];
        return {
          id: String(r.id),
          name: up.full_name || up.first_name || 'Profesor',
          avatar: up.avatar_url || '',
          tier: ((r.tier ?? 'essentials') as TeacherTier),
          subjects: Array.isArray(r.subjects) ? r.subjects : [],
          levels: grades,
        };
      })
      .filter((t: TeacherMetaBase) => !!t.id);
  } catch (err) {
    console.warn('[availabilityRepo.fetchTeacherMeta] exception', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Reindex: cruza availability + teachers para producir el mapa consumible
// por el bookingService. Si un profesor tiene varias filas para el mismo
// (weekStart, weekday), se unifican los slots en set + orden ascendente.
// ---------------------------------------------------------------------------
function rebuildIndex(
  availability: TeacherAvailabilityRow[],
  teacherMeta: TeacherMetaBase[],
): { teachers: TeacherWithSlots[]; teachersById: Record<string, TeacherWithSlots> } {
  const bySlot: Record<string, Record<number, Set<string>>> = {};
  for (const av of availability) {
    if (!bySlot[av.teacherId]) bySlot[av.teacherId] = {};
    const bucket = bySlot[av.teacherId][av.weekday] ?? new Set<string>();
    (av.slots ?? []).forEach((s) => bucket.add(s));
    bySlot[av.teacherId][av.weekday] = bucket;
  }
  const teachers: TeacherWithSlots[] = teacherMeta.map((t) => {
    const perDay = bySlot[t.id] ?? {};
    const weekSlots: Record<number, string[]> = {};
    for (const [wdStr, set] of Object.entries(perDay)) {
      const wd = Number(wdStr);
      weekSlots[wd] = Array.from(set).sort();
    }
    return { ...t, weekSlots };
  });
  const teachersById = teachers.reduce<Record<string, TeacherWithSlots>>(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {},
  );
  return { teachers, teachersById };
}

// ---------------------------------------------------------------------------
// API publica del repositorio.
// ---------------------------------------------------------------------------
export const availabilityRepo = {
  isReady(): boolean {
    return state.ready;
  },

  getVersion(): number {
    return state.version;
  },

  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },

  async warmCache(force = false): Promise<void> {
    if (!force && state.ready && Date.now() - state.loadedAt < CACHE_TTL_MS) {
      return;
    }
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const [availability, teacherMeta] = await Promise.all([
          fetchAvailability(),
          fetchTeacherMeta(),
        ]);
        const idx = rebuildIndex(availability, teacherMeta);
        state.availability = availability;
        state.teachers = idx.teachers;
        state.teachersById = idx.teachersById;
        state.ready = true;
        state.loadedAt = Date.now();
        emit();
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  refresh(): Promise<void> {
    return this.warmCache(true);
  },

  async getSlots(teacherId: string, weekday: number): Promise<string[]> {
    if (!state.ready) await this.warmCache();
    return state.teachersById[teacherId]?.weekSlots?.[weekday] ?? [];
  },

  async getBySubject(
    subject: string,
    planTier?: TeacherTier,
  ): Promise<TeacherWithSlots[]> {
    if (!state.ready) await this.warmCache();
    return applyFilters(state.teachers, subject, planTier);
  },

  async getForTeacher(teacherId: string): Promise<TeacherAvailabilityRow[]> {
    if (!state.ready) await this.warmCache();
    return state.availability.filter((a) => a.teacherId === teacherId);
  },

  // ---- Sync accessors (leen del cache; devuelven vacio si aun no esta
  // hidratado). Los consumidores React reciben el warm-up desde
  // BookingsContext y se re-renderizan via subscribeAvailability.
  getCachedSlots(teacherId: string, weekday: number): string[] {
    // Fire-and-forget: si el cache aun no esta listo, disparamos el
    // warm-up para que el proximo render tenga datos.
    if (!state.ready && !inflight) {
      void this.warmCache().catch(() => undefined);
    }
    return state.teachersById[teacherId]?.weekSlots?.[weekday] ?? [];
  },

  getCachedTeachersForSubject(
    subject: string,
    planTier?: TeacherTier,
  ): TeacherWithSlots[] {
    if (!state.ready && !inflight) {
      void this.warmCache().catch(() => undefined);
    }
    return applyFilters(state.teachers, subject, planTier);
  },

  getCachedTeacherById(id: string): TeacherWithSlots | null {
    return state.teachersById[id] ?? null;
  },

  // ---- Publicacion de disponibilidad (upsert idempotente).
  async publish(
    teacherId: string,
    weekday: number,
    slots: string[],
    weekStart?: string,
  ): Promise<TeacherAvailabilityRow | null> {
    try {
      const supabase = getSupabaseClient();
      const ws = weekStart ?? new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('teacher_availability')
        .upsert(
          {
            teacher_id: teacherId,
            week_start: ws,
            weekday,
            slots,
            published_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: 'teacher_id,week_start,weekday' },
        )
        .select(
          'id, teacher_id, week_start, weekday, slots, published_at, created_at, updated_at',
        )
        .maybeSingle();
      if (error) {
        console.warn('[availabilityRepo.publish] error', error.message);
        return null;
      }
      await this.warmCache(true);
      if (!data) return null;
      return {
        id: data.id,
        teacherId: data.teacher_id,
        weekStart: data.week_start,
        weekday: data.weekday,
        slots: Array.isArray(data.slots) ? data.slots : [],
        publishedAt: data.published_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.warn('[availabilityRepo.publish] exception', err);
      return null;
    }
  },

  // ---- Publicacion en lote (upsert de varios weekdays de la misma
  // semana en una unica llamada). Cada entrada de `bySlots` es
  // `{ [weekday]: string[] }`. Slots vacios son validos y significan
  // "publicado sin disponibilidad ese dia".
  async publishMany(
    teacherId: string,
    weekStart: string,
    bySlots: Record<number, string[]>,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const rows = Object.entries(bySlots).map(([wd, slots]) => ({
        teacher_id: teacherId,
        week_start: weekStart,
        weekday: Number(wd),
        slots: Array.isArray(slots) ? slots : [],
        published_at: nowIso,
        updated_at: nowIso,
      }));
      if (rows.length === 0) return { ok: true };
      const { error } = await supabase
        .from('teacher_availability')
        .upsert(rows, { onConflict: 'teacher_id,week_start,weekday' });
      if (error) {
        console.warn('[availabilityRepo.publishMany] error', error.message);
        return { ok: false, error: error.message };
      }
      await this.warmCache(true);
      return { ok: true };
    } catch (err: any) {
      console.warn('[availabilityRepo.publishMany] exception', err);
      return { ok: false, error: err?.message ?? 'unknown_error' };
    }
  },
};

// ---------------------------------------------------------------------------
// Helpers de nivel modulo para consumidores tipo hook / context.
// ---------------------------------------------------------------------------
export function hydrateAvailability(): Promise<void> {
  return availabilityRepo.warmCache();
}

export function subscribeAvailability(cb: () => void): () => void {
  return availabilityRepo.subscribe(cb);
}

export function getAvailabilityVersion(): number {
  return availabilityRepo.getVersion();
}
