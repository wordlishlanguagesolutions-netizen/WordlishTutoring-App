// ============================================================================
// Wordlish · WhatsApp facade (única fuente de verdad).
//
// TODO botón de la aplicación que abra WhatsApp DEBE consumir este servicio.
// No importar números, ni construir URLs `wa.me` ni `whatsapp://` en otros
// archivos. Cuando Wordlish adopte la API oficial de WhatsApp Business,
// bastará con cambiar `openWhatsapp()` internamente; los llamadores no se
// modifican.
//
// Config vive en `public.app_settings` bajo claves `whatsapp.*` y se lee
// vía `appSettingsService.getSetting()` (con caché + fallback local).
// ============================================================================

import { Alert, Linking } from 'react-native';
import { getSetting } from './appSettingsService';

export type WhatsappModule =
  | 'support'
  | 'payment_proof'
  | 'advisor'
  | 'help'
  | 'contact';

// Normaliza a E.164 sin '+' ni separadores (formato requerido por wa.me).
function normalizePhone(raw: string): string {
  return (raw || '').replace(/[^0-9]/g, '');
}

// -----------------------------------------------------------------------------
// Getters de configuración
// -----------------------------------------------------------------------------

export function getOfficialPhone(): string {
  return normalizePhone(getSetting<string>('whatsapp.official_number', '+50769329481'));
}

export function getDisplayPhone(): string {
  return getSetting<string>('whatsapp.display_number', '+507 6932-9481');
}

export function getDefaultMessage(): string {
  return getSetting<string>('whatsapp.default_message', 'Hola Wordlish, necesito ayuda con...');
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
// URL builders (uso interno; no exportar salvo casos muy justificados)
// -----------------------------------------------------------------------------

function buildAppUrl(message: string): string {
  return `whatsapp://send?phone=${getOfficialPhone()}&text=${encodeURIComponent(message)}`;
}

function buildWaMeUrl(message: string): string {
  return `https://wa.me/${getOfficialPhone()}?text=${encodeURIComponent(message)}`;
}

// -----------------------------------------------------------------------------
// Punto de entrada único
// -----------------------------------------------------------------------------

/**
 * Abre WhatsApp con el mensaje prellenado. Respeta el toggle global y
 * cae a `wa.me` si el esquema nativo `whatsapp://` no está disponible.
 * Nunca falla en silencio.
 */
export function openWhatsapp(message?: string): void {
  if (!isWhatsappEnabled()) {
    Alert.alert(
      'WhatsApp no disponible',
      'El contacto por WhatsApp está temporalmente desactivado. Intenta más tarde.',
    );
    return;
  }
  const finalMessage = (message && message.trim().length > 0
    ? message
    : getDefaultMessage()) as string;

  const nativeUrl = buildAppUrl(finalMessage);
  const webUrl = buildWaMeUrl(finalMessage);

  Linking.openURL(nativeUrl).catch(() => {
    Linking.openURL(webUrl).catch(() =>
      Alert.alert(
        'WhatsApp no disponible',
        'Instala WhatsApp o abre wa.me en el navegador para contactar a Wordlish.',
      ),
    );
  });
}

/**
 * Abre WhatsApp solo si el módulo especificado está activo en la
 * configuración. Útil para botones contextuales (soporte, comprobante,
 * ayuda) que el admin puede apagar sin tocar código.
 */
export function openWhatsappForModule(
  module: WhatsappModule,
  message?: string,
): boolean {
  if (!isModuleEnabled(module)) return false;
  openWhatsapp(message);
  return true;
}
