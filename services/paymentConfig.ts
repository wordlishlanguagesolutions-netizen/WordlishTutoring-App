// ============================================================================
// Wordlish · Payment configuration & scalable architecture.
//
// Toda la app consume el catálogo de métodos de pago desde este archivo.
// Cada método declara:
//   - id, label, icon
//   - kind: 'gateway' | 'manual' | 'proof'
//   - provider: identifica el integrador (stripe, paguelofacil, yappy, wompi…)
//     o 'manual' cuando no hay pasarela.
//   - enabled: se activa/desactiva desde el panel admin sin tocar código.
//
// Cuando conectemos una pasarela real (Stripe, PagueloFacil, Wompi…),
// bastará con encender ese método y proveer `provider` + credenciales en
// las variables de entorno / edge functions. La UI del cliente no cambia.
// ============================================================================

export type PaymentMethodKind = 'gateway' | 'manual' | 'proof';

export interface PaymentMethodOption {
  id: string;
  label: string;
  description: string;
  icon: string;                 // Ionicons name
  kind: PaymentMethodKind;
  provider: string;             // 'stripe' | 'paguelofacil' | 'wompi' | 'yappy' | 'ach' | 'manual'
  enabled: boolean;             // configurable desde admin
  requiresProof?: boolean;      // fuerza carga de comprobante
  whatsappOnly?: boolean;       // opción "ya envié por WhatsApp"
}

// Bandera global. Cambia a `true` cuando el admin la activa desde ajustes.
// Está en memoria porque aún no persistimos configuración del admin.
export const paymentConfig = {
  whatsappProofEnabled: true,
};

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'card',
    label: 'Tarjeta de crédito / débito',
    description: 'Visa, Mastercard, Amex — cobro seguro con la pasarela conectada.',
    icon: 'card-outline',
    kind: 'gateway',
    provider: 'stripe',
    enabled: false, // se enciende cuando Stripe/PagueloFacil esté conectado
  },
  {
    id: 'yappy',
    label: 'Yappy',
    description: 'Paga desde tu app Yappy en segundos.',
    icon: 'phone-portrait-outline',
    kind: 'gateway',
    provider: 'yappy',
    enabled: false,
  },
  {
    id: 'ach',
    label: 'Transferencia bancaria / ACH',
    description: 'Realiza la transferencia y sube tu comprobante.',
    icon: 'business-outline',
    kind: 'manual',
    provider: 'manual',
    enabled: true,
    requiresProof: true,
  },
  {
    id: 'upload',
    label: 'Subir comprobante',
    description: 'Adjunta imagen o PDF de un pago que ya realizaste.',
    icon: 'cloud-upload-outline',
    kind: 'proof',
    provider: 'manual',
    enabled: true,
    requiresProof: true,
  },
  {
    id: 'whatsapp',
    label: 'Ya envié mi comprobante por WhatsApp',
    description: 'Confirmaremos la reserva cuando validemos tu mensaje.',
    icon: 'logo-whatsapp',
    kind: 'proof',
    provider: 'manual',
    enabled: true,
    whatsappOnly: true,
  },
];

// Getter reactivo (respeta la bandera del admin). Componentes UI deben llamar
// a esta función en lugar de importar la constante directamente.
export function getActivePaymentMethods(): PaymentMethodOption[] {
  return PAYMENT_METHODS.filter((m) => {
    if (!m.enabled) return false;
    if (m.whatsappOnly && !paymentConfig.whatsappProofEnabled) return false;
    return true;
  });
}

export function setWhatsappProofEnabled(enabled: boolean) {
  paymentConfig.whatsappProofEnabled = enabled;
}
