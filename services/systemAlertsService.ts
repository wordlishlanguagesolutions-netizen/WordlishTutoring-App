// ============================================================================
// Wordlish · Servicio de alertas del sistema (Cloud real).
//
// Facade sincronico sobre public.system_alerts con hidratacion asincrona,
// cache en memoria y subscribers. Alimenta el panel "Alertas del sistema"
// del dashboard admin (y potencialmente supervisor) reemplazando el mock
// `dashSystemAlerts`.
//
// Contrato (identico a otros services Cloud del proyecto):
//   - getSystemAlerts(): snapshot local (todas las filas leidas).
//   - getOpenSystemAlerts(): snapshot filtrado por resolved=false.
//   - hydrateSystemAlerts(force?): idempotente, deduplica.
//   - subscribeSystemAlerts(cb): notifica al refrescar el cache.
//   - resetSystemAlertsCache(): usado en logout.
//
// Notas RLS:
//   - `supervisor_all_system_alerts` da acceso ALL a supervisor. La consulta
//     usa el rol autenticado; si un rol distinto llama, Supabase filtrara
//     segun policies y esta funcion regresara [] sin lanzar.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { AlertSeverity } from '@/types/enums';

export interface SystemAlertItem {
  id: string;
  classRecordId: string | null;
  teacherId: string | null;
  studentId: string | null;
  type: string;
  detail: string | null;
  severity: AlertSeverity;
  icon: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

let cache: SystemAlertItem[] = [];
let hydrated = false;
let inflight: Promise<SystemAlertItem[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[systemAlertsService.notify] listener error', err);
    }
  });
}

function toModel(row: any): SystemAlertItem {
  return {
    id: row.id,
    classRecordId: row.class_record_id,
    teacherId: row.teacher_id,
    studentId: row.student_id,
    type: row.type,
    detail: row.detail,
    severity: (row.severity ?? 'info') as AlertSeverity,
    icon: row.icon,
    resolved: !!row.resolved,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export function getSystemAlerts(): SystemAlertItem[] {
  return cache;
}

export function getOpenSystemAlerts(): SystemAlertItem[] {
  return cache.filter((a) => !a.resolved);
}

export function getSystemAlertsVersion(): number {
  return version;
}

export function isSystemAlertsHydrated(): boolean {
  return hydrated;
}

export function subscribeSystemAlerts(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hydrateSystemAlerts(force = false): Promise<SystemAlertItem[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('system_alerts')
        .select(
          'id, class_record_id, teacher_id, student_id, type, detail, severity, icon, resolved, resolved_at, created_at',
        )
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        console.warn('[systemAlertsService.hydrate] error', error.message);
        cache = [];
      } else {
        cache = (data ?? []).map(toModel);
      }
      hydrated = true;
    } catch (err) {
      console.warn('[systemAlertsService.hydrate] exception', err);
      cache = [];
      hydrated = true;
    } finally {
      inflight = null;
    }
    notify();
    return cache;
  })();
  return inflight;
}

export function resetSystemAlertsCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}

// ---------------------------------------------------------------------------
// Mutacion: marcar alerta como resuelta.
// Optimistic (remueve del cache local) + Cloud UPDATE. Si falla, se reintenta
// hidratacion para dejar el cache alineado con el estado real.
// RLS: `supervisor_all_system_alerts` habilita la operacion a supervisor y
// admin. Otros roles reciben error de Supabase.
// ---------------------------------------------------------------------------
export async function resolveSystemAlert(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const prev = cache;
  cache = cache.map((a) => (a.id === id ? { ...a, resolved: true } : a));
  notify();
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('system_alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      cache = prev;
      notify();
      return { ok: false, error: error.message };
    }
    void hydrateSystemAlerts(true).catch(() => undefined);
    return { ok: true };
  } catch (err: any) {
    cache = prev;
    notify();
    return { ok: false, error: err?.message ?? 'unknown_error' };
  }
}
