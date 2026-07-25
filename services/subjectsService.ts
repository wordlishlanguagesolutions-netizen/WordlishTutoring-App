// ============================================================================
// Wordlish · Servicio de materias.
//
// Actúa como capa de caché + hidratación para el frontend. Mantiene la
// firma sincrónica que ya usan las pantallas (`getSubjects()`) para no
// tener que reescribir toda la UI, pero por debajo consulta a
// `public.subjects` la primera vez que se pide y comparte el resultado.
//
// Patrón de referencia (idéntico al usado por financeService.hydrateExpenses):
//   1. La primera llamada devuelve el fallback local (SUBJECTS_CATALOG) para
//      que la UI renderice de inmediato sin flicker.
//   2. En paralelo dispara la hidratación desde Cloud.
//   3. Consumidores que quieran esperar el resultado real usan
//      `hydrateSubjects()` y luego `getSubjects()`.
//   4. Un contador `getSubjectsVersion()` permite forzar re-render en
//      componentes que quieran reactividad manual (setState(tick+1)).
// ============================================================================

import { subjectsRepo, type Subject } from '@/repositories/subjects';
import { SUBJECTS_CATALOG } from './mockData';

// Fallback local (sirve como semilla mientras Cloud responde).
let cache: string[] = [...SUBJECTS_CATALOG];
let hydrated = false;
let inflight: Promise<string[]> | null = null;
let version = 0;

/**
 * Lista sincrónica de materias (nombres). Devuelve el fallback local
 * hasta que `hydrateSubjects()` termine.
 */
export function getSubjects(): string[] {
  return cache;
}

/**
 * Versión del cache. Incrementa cada vez que se hidrata desde Cloud.
 * Consumidores pueden observar este número para forzar re-render.
 */
export function getSubjectsVersion(): number {
  return version;
}

/**
 * ¿Ya se hidrató desde Cloud al menos una vez?
 */
export function isSubjectsHydrated(): boolean {
  return hydrated;
}

/**
 * Hidrata la caché desde Cloud. Idempotente: si ya está hidratado retorna
 * inmediatamente. Deduplica peticiones concurrentes.
 */
export function hydrateSubjects(force = false): Promise<string[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = (async () => {
    const list = await subjectsRepo.list();
    if (list.length > 0) {
      cache = list.map((s) => s.name);
      hydrated = true;
      version += 1;
    } else {
      // Si Cloud no respondió, mantenemos el fallback pero NO marcamos
      // como hidratado para permitir reintentos.
      console.warn('[subjectsService.hydrateSubjects] Cloud devolvió vacío, se mantiene fallback');
    }
    inflight = null;
    return cache;
  })();

  return inflight;
}

/**
 * Devuelve la lista completa con metadata (id, code, active). Útil para
 * paneles admin. Siempre consulta Cloud.
 */
export async function getSubjectsFull(): Promise<Subject[]> {
  return subjectsRepo.listAll();
}
