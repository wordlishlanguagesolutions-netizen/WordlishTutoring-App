// ============================================================================
// Wordlish · Zoom facade (única fuente de verdad).
//
// Contrato: TODO botón/pantalla que abra Zoom o muestre el enlace DEBE
// consumir este servicio. No importar URLs, ni construir enlaces
// `https://zoom.us/...` en otros archivos. La configuración vive en
// `public.app_settings` bajo claves `zoom.*` y se lee vía
// `appSettingsService.getSetting()` (caché + fallback local + suscripciones).
//
// Modelo actual: **enlace único fijo** para todas las clases de Wordlish.
// Cuando implementemos OAuth de Zoom para salas dinámicas por clase,
// solo cambia el `provider` interno (`static_link` → `oauth`); la UI
// no se toca.
//
// Puntos de entrada públicos:
//   · getZoomUrl()              → URL oficial (o específica si se guarda por clase)
//   · getZoomUrlForBooking(b)   → URL a mostrar para una reserva concreta
//   · openZoom(url?)            → abrir el enlace con fallback amigable
//   · isZoomEnabled()           → toggle global
// ============================================================================

import { Alert, Linking } from 'react-native';
import { getSetting } from './appSettingsService';

// Fallback local (bootstrap). Refleja el seed oficial. NO es fuente de
// verdad: la fuente es `public.app_settings.zoom.official_link`.
const FALLBACK_URL = 'https://us06web.zoom.us/j/2797072933';
const FALLBACK_MEETING_ID = '279 707 2933';
const FALLBACK_LABEL = 'Entrar a Zoom';

// -----------------------------------------------------------------------------
// Getters
// -----------------------------------------------------------------------------

export function getZoomUrl(): string {
  const v = getSetting<string>('zoom.official_link', FALLBACK_URL);
  return typeof v === 'string' && v.trim().length > 0 ? v : FALLBACK_URL;
}

export function getMeetingIdDisplay(): string {
  return getSetting<string>('zoom.meeting_id', FALLBACK_MEETING_ID);
}

export function getZoomLabel(): string {
  return getSetting<string>('zoom.default_label', FALLBACK_LABEL);
}

export function isZoomEnabled(): boolean {
  return getSetting<boolean>('zoom.enabled', true) === true;
}

export function getZoomProvider(): 'static_link' | 'oauth' {
  const p = getSetting<string>('zoom.provider', 'static_link');
  return p === 'oauth' ? 'oauth' : 'static_link';
}

/**
 * Devuelve la URL a usar para una reserva. Hoy Wordlish opera con enlace
 * único fijo, así que cualquier valor guardado en el booking se ignora
 * y se retorna el enlace oficial. Cuando cambiemos a OAuth, este método
 * respetará `bookingZoomUrl` cuando exista.
 */
export function getZoomUrlForBooking(bookingZoomUrl?: string | null): string {
  if (getZoomProvider() === 'oauth' && bookingZoomUrl && bookingZoomUrl.trim().length > 0) {
    return bookingZoomUrl;
  }
  return getZoomUrl();
}

// -----------------------------------------------------------------------------
// Acción pública
// -----------------------------------------------------------------------------

/**
 * Abre Zoom. Si se pasa una URL específica se prioriza (útil para OAuth
 * futuro); si no, usa la oficial de `app_settings`.
 */
export function openZoom(url?: string): void {
  if (!isZoomEnabled()) {
    Alert.alert(
      'Zoom no disponible',
      'La sala virtual está temporalmente desactivada. Contacta a soporte.',
    );
    return;
  }
  const target = url && url.trim().length > 0 ? url : getZoomUrl();
  Linking.openURL(target).catch(() =>
    Alert.alert(
      'Zoom no disponible',
      'No se pudo abrir el enlace. Verifica tu conexión o instala Zoom.',
    ),
  );
}
