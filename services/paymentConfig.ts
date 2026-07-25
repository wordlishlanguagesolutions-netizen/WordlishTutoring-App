// ============================================================================
// Wordlish · Payment configuration & scalable architecture.
//
// Toda la app consume el catálogo de métodos de pago desde este archivo.
// Cada método declara sus metadatos (label, icon, provider, tipo). El
// estado activo/inactivo NO vive aquí: se lee live desde `public.app_settings`
// (claves `payment.methods_enabled` y `payment.whatsapp_proof_enabled`) a
// través de `appSettingsService`.
//
// Regla estricta: **ningún** componente decide si un método está activo
// consultando el catálogo directamente. Debe usarse `getActivePaymentMethods()`
// o `isPaymentMethodEnabled(id)`, que sí respetan la configuración global.
//
// Cuando conectemos una pasarela real (Stripe, PagueloFacil, Wompi…),
// bastará con encender el método correspondiente desde Admin › Ajustes.
// ============================================================================

import { getSetting, setSetting } from './appSettingsService';

export type PaymentMethodKind = 'gateway' | 'manual' | 'proof';

export interface PaymentMethodOption {
  id: string;
  label: string;
  description: string;
  icon: string;                 // Ionicons name
  kind: PaymentMethodKind;
  provider: string;             // 'stripe' | 'paguelofacil' | 'wompi' | 'yappy' | 'ach' | 'manual'
  requiresProof?: boolean;
  whatsappOnly?: boolean;       // opción "ya envié por WhatsApp"
}

// Catálogo estático de métodos disponibles. Metadatos únicamente.
export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'card',
    label: 'Tarjeta de crédito / débito',
    description: 'Visa, Mastercard, Amex — cobro seguro con la pasarela conectada.',
    icon: 'card-outline',
    kind: 'gateway',
    provider: 'stripe',
  },
  {
    id: 'yappy',
    label: 'Yappy',
    description: 'Paga desde tu app Yappy en segundos.',
    icon: 'phone-portrait-outline',
    kind: 'gateway',
    provider: 'yappy',
  },
  {
    id: 'ach',
    label: 'Transferencia bancaria / ACH',
    description: 'Realiza la transferencia y sube tu comprobante.',
    icon: 'business-outline',
    kind: 'manual',
    provider: 'manual',
    requiresProof: true,
  },
  {
    id: 'upload',
    label: 'Subir comprobante',
    description: 'Adjunta imagen o PDF de un pago que ya realizaste.',
    icon: 'cloud-upload-outline',
    kind: 'proof',
    provider: 'manual',
    requiresProof: true,
  },
  {
    id: 'whatsapp',
    label: 'Ya envié mi comprobante por WhatsApp',
    description: 'Confirmaremos la reserva cuando validemos tu mensaje.',
    icon: 'logo-whatsapp',
    kind: 'proof',
    provider: 'manual',
    whatsappOnly: true,
  },
];

// -----------------------------------------------------------------------------
// Configuración reactiva (fuente de verdad: app_settings)
// -----------------------------------------------------------------------------

/**
 * Backward-compat proxy: expone `.whatsappProofEnabled` como getter que lee
 * live desde `app_settings`. Los llamadores existentes no cambian.
 */
export const paymentConfig = {
  get whatsappProofEnabled(): boolean {
    return getSetting<boolean>('payment.whatsapp_proof_enabled', true) === true;
  },
};

/**
 * Actualiza el toggle "Comprobante por WhatsApp" y persiste en Cloud con
 * optimistic UI + rollback. La UI del admin lo llama sin await si no le
 * interesa el resultado.
 */
export async function setWhatsappProofEnabled(enabled: boolean): Promise<boolean> {
  return setSetting('payment.whatsapp_proof_enabled', enabled);
}

/**
 * Lista de IDs de métodos activos según app_settings. Fallback: todos los
 * manuales/proof si no hay configuración (nunca devuelve gateways sin permiso).
 */
export function getEnabledMethodIds(): string[] {
  const raw = getSetting<string[]>('payment.methods_enabled', [
    'ach',
    'upload',
    'whatsapp',
  ]);
  return Array.isArray(raw) ? raw : [];
}

export function isPaymentMethodEnabled(id: string): boolean {
  const method = PAYMENT_METHODS.find((m) => m.id === id);
  if (!method) return false;
  if (!getEnabledMethodIds().includes(id)) return false;
  if (method.whatsappOnly && !paymentConfig.whatsappProofEnabled) return false;
  return true;
}

/**
 * Getter reactivo que la UI usa para renderizar el catálogo activo.
 */
export function getActivePaymentMethods(): PaymentMethodOption[] {
  const enabledIds = new Set(getEnabledMethodIds());
  return PAYMENT_METHODS.filter((m) => {
    if (!enabledIds.has(m.id)) return false;
    if (m.whatsappOnly && !paymentConfig.whatsappProofEnabled) return false;
    return true;
  });
}

/**
 * Persistir el conjunto completo de métodos activos (útil si el admin
 * habilita/deshabilita métodos en bloque en una futura pantalla).
 */
export async function setEnabledMethodIds(ids: string[]): Promise<boolean> {
  return setSetting('payment.methods_enabled', ids);
}
