// ============================================================================
// Wordlish · WhatsApp facade (única fuente de verdad).
//
// TODO botón/pantalla que abra WhatsApp DEBE consumir este servicio.
// No importar números, ni construir URLs `wa.me` ni `whatsapp://` en otros
// archivos. La configuración vive en `public.app_settings` bajo claves
// `whatsapp.*` y se lee vía `appSettingsService.getSetting()` (con caché +
// fallback local). Cuando Wordlish adopte la API oficial de WhatsApp
// Business, se cambia el proveedor interno aquí; el resto de la app no
// se toca.
//
// Contrato público:
//   · openWhatsapp(message?)               → soporte al asesor oficial de Wordlish
//   · openWhatsappForModule(mod, message?) → respeta whatsapp.modules_enabled
//   · openWhatsappTo(phone, message?)      → contacto directo a un tercero
//                                            (ej. profesor → acudiente).
//   · Getters de configuración (número, mensaje, horario, provider, …).
// ============================================================================

import { Alert, Linking } from 'react-native';
import { getSetting } from './appSettingsService';

export type WhatsappModule =
  | 'support'
  | 'payment_proof'
  | 'advisor'
  | 'help'
  | 'contact';

// Fallback local usado solo hasta que Cloud responda. Refleja el seed
// oficial (migración 013) para evitar flicker o números vacíos en cold-boot.
// NO tratar como fuente de verdad: la fuente es `public.app_settings`.
const FALLBACK_OFFICIAL = '+50769329481';
const FALLBACK_DISPLAY = '+507 6932-9481';
const FALLBACK_MESSAGE = 'Hola Wordlish, necesito ayuda con...';

// Normaliza a E.164 sin '+' ni separadores (formato requerido por wa.me).
function normalizePhone(raw: string): string {
  return (raw || '').replace(/[^0-9]/g, '');
}

// -----------------------------------------------------------------------------
// Getters de configuración (leen live desde app_settings)
// -----------------------------------------------------------------------------

export function getOfficialPhone(): string {
  return normalizePhone(getSetting<string>('whatsapp.official_number', FALLBACK_OFFICIAL));
}

export function getDisplayPhone(): string {
  return getSetting<string>('whatsapp.display_number', FALLBACK_DISPLAY);
}

export function getDefaultMessage(): string {
  return getSetting<string>('whatsapp.default_message', FALLBACK_MESSAGE);
}

export function getBusinessHours(): string {
  return getSetting<string>('whatsapp.business_hours', '');
}

export function isWhatsappEnabled(): boolean {
  return getSetting<boolean>('whatsapp.enabled', true) === true;
}

export function isModuleEnabled(module: WhatsappModule): boolean {
  if (!isWhatsappEnabled()) return false;
  const arr = getSetting<string[]>('whatsapp.modules_enabled', []);
  return Array.isArray(arr) && arr.includes(module);
}

export function getEnabledModules(): WhatsappModule[] {
  const arr = getSetting<string[]>('whatsapp.modules_enabled', []);
  return (Array.isArray(arr) ? arr : []) as WhatsappModule[];
}

export function getProvider(): 'wa_me' | 'business_api' {
  const p = getSetting<string>('whatsapp.provider', 'wa_me');
  return p === 'business_api' ? 'business_api' : 'wa_me';
}

// -----------------------------------------------------------------------------
// URL builders (uso INTERNO exclusivo)
// -----------------------------------------------------------------------------

function buildAppUrl(phone: string, message: string): string {
  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

function buildWaMeUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Handler común: intenta esquema nativo → cae a wa.me → alerta amigable.
function openForPhone(phone: string, message: string): void {
  const provider = getProvider();
  if (provider === 'business_api') {
    // Reservado: cuando exista el proveedor, aquí se enrutará al backend
    // de la API de WhatsApp Business. La UI llamadora no cambia.
    // Por ahora, fallback al esquema estándar para no bloquear.
  }
  const nativeUrl = buildAppUrl(phone, message);
  const webUrl = buildWaMeUrl(phone, message);
  Linking.openURL(nativeUrl).catch(() => {
    Linking.openURL(webUrl).catch(() =>
      Alert.alert(
        'WhatsApp no disponible',
        'Instala WhatsApp o abre wa.me en el navegador para continuar.',
      ),
    );
  });
}

// -----------------------------------------------------------------------------
// Puntos de entrada públicos
// -----------------------------------------------------------------------------

/**
 * Abre WhatsApp con el asesor oficial de Wordlish. Respeta el toggle global.
 */
export function openWhatsapp(message?: string): void {
  if (!isWhatsappEnabled()) {
    Alert.alert(
      'WhatsApp no disponible',
      'El contacto por WhatsApp está temporalmente desactivado.',
    );
    return;
  }
  const finalMessage =
    message && message.trim().length > 0 ? message : getDefaultMessage();
  openForPhone(getOfficialPhone(), finalMessage);
}

/**
 * Variante contextual: solo abre si el módulo está activo en la config.
 * Devuelve `false` si el módulo está deshabilitado (para que el llamador
 * pueda ocultar el botón sin duplicar lógica).
 */
export function openWhatsappForModule(
  module: WhatsappModule,
  message?: string,
): boolean {
  if (!isModuleEnabled(module)) return false;
  openWhatsapp(message);
  return true;
}

/**
 * Abre WhatsApp con un tercero (ej.: profesor → acudiente, admin →
 * profesor). El número viene de los datos del contacto, no del código.
 * Requiere que WhatsApp esté globalmente activo.
 *
 * Este es el único punto autorizado en toda la app para enviar mensajes
 * a números que NO son el oficial de Wordlish.
 */
export function openWhatsappTo(phone: string, message?: string): void {
  if (!isWhatsappEnabled()) {
    Alert.alert(
      'WhatsApp no disponible',
      'El contacto por WhatsApp está temporalmente desactivado.',
    );
    return;
  }
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 6) {
    Alert.alert('WhatsApp', 'No hay un teléfono válido para este contacto.');
    return;
  }
  const finalMessage =
    message && message.trim().length > 0 ? message : getDefaultMessage();
  openForPhone(normalized, finalMessage);
}
