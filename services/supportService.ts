// ============================================================================
// Wordlish · Soporte único vía WhatsApp.
//
// Punto de entrada único para todo contacto con el asesor de Wordlish.
// A partir de ahora NO define el número ni construye URLs: delega en
// `whatsappService`, que a su vez lee el número oficial desde
// `public.app_settings`. Único lugar donde vive el número: el backend.
//
// Al centralizar aquí solo el copy por rol, cualquier ajuste de tono se
// hace en este archivo; los cambios de teléfono, mensaje predeterminado
// o habilitación se hacen en Admin → Ajustes → Comunicación.
// ============================================================================

import type { UserRole } from '@/constants/roles';
import { openWhatsapp } from './whatsappService';

// Contexto opcional para enriquecer el mensaje. Ej: pantalla activa.
export interface SupportContext {
  screen?: string;
}

// Mensaje base por rol (sin contexto extra). Coincide con los ejemplos
// definidos por producto para mantener un tono uniforme.
const MESSAGES_BY_ROLE: Record<UserRole, string> = {
  student:
    'Hola, soy estudiante de Wordlish y necesito ayuda con mi cuenta o una clase.',
  guardian:
    'Hola, soy acudiente de Wordlish y necesito ayuda con la cuenta de mi estudiante.',
  teacher:
    'Hola, soy profesor de Wordlish y necesito soporte con una clase o reporte.',
  supervisor:
    'Hola, soy supervisor de Wordlish y necesito soporte con la operación en vivo.',
  admin:
    'Hola, soy administrador de Wordlish y necesito soporte con la plataforma.',
};

// Mensaje utilizado desde la pantalla de ingreso (sin rol identificado aún).
export const LOGIN_SUPPORT_MESSAGE =
  'Hola, necesito ayuda para ingresar a la aplicación de Wordlish.';

/**
 * Devuelve el mensaje adaptado al rol y, cuando aplica, a la pantalla actual.
 * Si no se conoce el rol, cae al mensaje genérico de login para no bloquear.
 */
export function getSupportMessage(
  role: UserRole | null | undefined,
  ctx?: SupportContext,
): string {
  const base = role ? MESSAGES_BY_ROLE[role] : LOGIN_SUPPORT_MESSAGE;
  if (ctx?.screen && ctx.screen.trim().length > 0) {
    return `${base} (Pantalla: ${ctx.screen})`;
  }
  return base;
}

/**
 * Abre WhatsApp con el asesor. Respeta el toggle global de WhatsApp
 * configurado por el admin.
 */
export function contactAdvisor(
  role: UserRole | null | undefined,
  ctx?: SupportContext,
): void {
  openWhatsapp(getSupportMessage(role, ctx));
}

/**
 * Variante para la pantalla de ingreso: no requiere rol.
 */
export function contactLoginSupport(): void {
  openWhatsapp(LOGIN_SUPPORT_MESSAGE);
}
