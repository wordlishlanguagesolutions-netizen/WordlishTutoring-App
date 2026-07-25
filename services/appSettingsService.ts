// ============================================================================
// Wordlish · Servicio de configuración global (`app_settings`).
//
// - Caché en memoria con defaults (evita flicker y fallo si Cloud no responde).
// - Hidratación idempotente al primer `getSetting()`.
// - `setSetting()` con optimistic UI + rollback si Cloud falla.
// - `subscribeSettings()` para que la UI reaccione a cambios sin refactor
//   masivo.
//
// Contrato pensado para ser vendor-agnóstico: cualquier módulo que necesite
// una configuración global lee vía `getSetting(key, fallback)` sin
// depender de la implementación de Cloud.
// ============================================================================

import { appSettingsRepo } from '@/repositories/appSettings';

// Defaults idénticos al seed de la migración 013. Mantener sincronizados.
const DEFAULTS: Record<string, unknown> = {
  // WhatsApp oficial de Wordlish
  'whatsapp.official_number': '+50769329481',
  'whatsapp.display_number': '+507 6932-9481',
  'whatsapp.default_message': 'Hola Wordlish, necesito ayuda con...',
  'whatsapp.enabled': true,
  'whatsapp.business_hours': 'Lun a Vie · 12:00 - 20:00',
  'whatsapp.modules_enabled': ['support', 'payment_proof', 'advisor', 'help', 'contact'],
  'whatsapp.provider': 'wa_me',
  // Pagos
  'payment.methods_enabled': ['card', 'yappy', 'ach', 'proof', 'whatsapp'],
  'payment.whatsapp_proof_enabled': true,
  // Reservas
  'booking.hold_ttl_minutes': 5,
  'booking.cancellation_hours_before': 12,
  'booking.screenshot_grace_minutes': 10,
  // Materiales
  'materials.max_size_mb': 10,
  // Feature flags
  'features.promotions': false,
  'features.zoom_oauth': false,
  'features.push_notifications': false,
  // Políticas
  'policy.prepaid_only': true,
  // Zoom (enlace único oficial de Wordlish)
  'zoom.official_link': 'https://us06web.zoom.us/j/2797072933',
  'zoom.meeting_id': '279 707 2933',
  'zoom.enabled': true,
  'zoom.default_label': 'Entrar a Zoom',
  'zoom.provider': 'static_link',
};

const cache: Record<string, unknown> = { ...DEFAULTS };
let hydrated = false;
let inflight: Promise<void> | null = null;
let version = 0;
let autoHydrateTriggered = false;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  version += 1;
  listeners.forEach((l) => {
    try {
      l();
    } catch (err) {
      console.warn('[appSettingsService.notify] listener error', err);
    }
  });
}

/**
 * Lectura sincrónica. Devuelve el valor cacheado, un `fallback` explícito
 * o el default de referencia. Dispara hidratación perezosa la primera vez.
 */
export function getSetting<T = unknown>(key: string, fallback?: T): T {
  if (!autoHydrateTriggered) {
    autoHydrateTriggered = true;
    hydrateAppSettings().catch(() => {
      /* silenciado: los defaults ya cubren el caso offline */
    });
  }
  const raw = cache[key];
  if (raw === undefined || raw === null) {
    return (fallback ?? (DEFAULTS[key] as T)) as T;
  }
  return raw as T;
}

export function getSettingsVersion(): number {
  return version;
}

export function isSettingsHydrated(): boolean {
  return hydrated;
}

export function subscribeSettings(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Hidrata la caché desde Cloud. Idempotente. Deduplica concurrencia.
 */
export function hydrateAppSettings(force = false): Promise<void> {
  if (hydrated && !force) return Promise.resolve();
  if (inflight) return inflight;

  inflight = (async () => {
    const rows = await appSettingsRepo.list();
    if (rows.length > 0) {
      rows.forEach((r) => {
        cache[r.key] = r.value;
      });
      hydrated = true;
      notify();
    } else {
      console.warn('[appSettingsService.hydrateAppSettings] Cloud vacío o inaccesible, se mantiene fallback');
    }
    inflight = null;
  })();

  return inflight;
}

/**
 * Escritura con optimistic UI + rollback si Cloud rechaza.
 */
export async function setSetting(key: string, value: unknown): Promise<boolean> {
  const prev = cache[key];
  cache[key] = value;
  notify();

  const ok = await appSettingsRepo.upsert(key, value);
  if (!ok) {
    cache[key] = prev;
    notify();
  }
  return ok;
}
