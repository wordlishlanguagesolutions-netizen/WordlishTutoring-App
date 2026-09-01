// Wordlish · Soporte único vía WhatsApp
// -----------------------------------------------------------------------------
// Punto de entrada único para todo contacto con el asesor de Wordlish. Un solo
// clic abre WhatsApp con un mensaje prellenado que se adapta al rol y, cuando
// se especifica, a la pantalla actual. No hay menús, alertas ni pasos
// intermedios: el asesor gestiona clases, pagos, reservas, reprogramaciones,
// dudas y soporte técnico.
//
// Al centralizar aquí el número y las plantillas de mensaje, cualquier ajuste
// futuro (cambio de teléfono, textos por rol) se hace en un solo lugar.

import { Alert, Linking } from 'react-native';
import type { UserRole } from '@/constants/roles';

export const WORDLISH_ADVISOR_PHONE = '50765551234';

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

// Devuelve el mensaje adaptado al rol y, cuando aplica, a la pantalla actual.
// Si no se conoce el rol, cae al mensaje genérico de login para no bloquear.
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

// Construye la URL whatsapp:// con el mensaje URL-encoded.
function buildWhatsappUrl(message: string): string {
  const encoded = encodeURIComponent(message);
  return `whatsapp://send?phone=${WORDLISH_ADVISOR_PHONE}&text=${encoded}`;
}

// Abre WhatsApp con el mensaje prellenado. Si WhatsApp no está instalado,
// muestra un Alert nativo con instrucción — nunca falla en silencio.
export function contactAdvisor(
  role: UserRole | null | undefined,
  ctx?: SupportContext,
): void {
  const url = buildWhatsappUrl(getSupportMessage(role, ctx));
  Linking.openURL(url).catch(() =>
    Alert.alert(
      'WhatsApp no disponible',
      'Instala WhatsApp para contactar al asesor de Wordlish.',
    ),
  );
}

// Variante para la pantalla de ingreso: no requiere rol.
export function contactLoginSupport(): void {
  const url = buildWhatsappUrl(LOGIN_SUPPORT_MESSAGE);
  Linking.openURL(url).catch(() =>
    Alert.alert(
      'WhatsApp no disponible',
      'Instala WhatsApp para contactar al asesor de Wordlish.',
    ),
  );
}
