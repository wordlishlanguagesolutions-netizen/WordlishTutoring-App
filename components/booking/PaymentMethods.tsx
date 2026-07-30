import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius, shadow } from '@/constants/theme';
import { getSetting } from '@/services/appSettingsService';
import type { PaymentMethod } from '@/types';
import { uploadPaymentReceipt } from '@/services/paymentsService';

// ============================================================================
// PaymentMethods - componente unico de metodos de pago Wordlish.
//
// Cambios QA (Payments -> Cloud):
//   1. Propaga el metodo real seleccionado (yappy/transfer/card) en
//      onUploadProof (antes se persistia 'other').
//   2. Usa DocumentPicker real (imagen o PDF) y sube el archivo al
//      bucket privado payment-receipts. El path se envia al caller para
//      persistirlo en payments.receipt_url. Antes el archivo vivia en
//      memoria y se perdia al recargar.
//   3. Permite reintentar tras rechazo (uploading state controlable).
//
// La UI sigue siendo la misma tarjeta con 3 radios + detalle + upload;
// no se agregan pantallas nuevas.
// ============================================================================

type PayKey = 'yappy' | 'ach' | 'cuanto';

const PAY_KEY_TO_METHOD: Record<PayKey, PaymentMethod> = {
  yappy: 'yappy',
  ach: 'transfer',
  cuanto: 'card',
};

export interface UploadedProofDisplay {
  name: string;
  at: number;
  status?: 'submitted' | 'reviewing' | 'approved' | 'rejected';
}

export interface UploadedProofPayload {
  name: string;
  method: PaymentMethod;
  receiptPath: string | null;
  size?: number | null;
  mimeType?: string | null;
}

interface PaymentMethodsProps {
  amount?: number;
  /** Callback cuando el comprobante fue subido (o se opto por seguir en mock si falla). */
  onUploadProof: (payload: UploadedProofPayload) => void;
  /** Muestra el estado "Comprobante enviado" cuando existe. */
  uploadedProof?: UploadedProofDisplay | null;
  /** Callback para reemplazar el comprobante ya enviado. */
  onReplaceProof?: () => void;
  /** Prefijo bajo el que se sube el archivo (p.ej. `bookings/<id>` o `plans/<userId>`). */
  receiptPathPrefix: string;
}

export function PaymentMethods({
  amount,
  onUploadProof,
  uploadedProof,
  onReplaceProof,
  receiptPathPrefix,
}: PaymentMethodsProps) {
  const [method, setMethod] = useState<PayKey | null>(null);
  const [copied, setCopied] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  const checkoutUrl = getSetting<string>('payment.checkout_url', '');
  const beneficiary = getSetting<string>('payment.beneficiary_name', 'Maristella Florian');
  const yappyNumber = getSetting<string>('payment.yappy_number', '+507 6216-4495');
  const achAccount = getSetting<string>('payment.ach_account', '04-72-99-558451-2');
  const pricePerHour = getSetting<number>('payment.price_per_hour_usd', 0);

  // Cierre final MVP: validacion runtime (no silenciar fallos).
  // Si falta checkout_url o price_per_hour_usd, mostramos banner claro
  // al usuario en lugar de dejarlo con un checkout que no abre o un
  // monto en $0. Solo se muestra a pagadores (no bloquea otros metodos).
  const missingCheckout = !checkoutUrl;
  const missingPrice = !pricePerHour || pricePerHour <= 0;

  const amountText = amount && amount > 0 ? `$${amount.toFixed(2)}` : 'el monto';
  const isRejected = uploadedProof?.status === 'rejected';

  const copy = async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
    } catch {
      // no-op web
    }
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  const handleCardPay = () => {
    if (missingCheckout) {
      Alert.alert(
        'Enlace de pago no configurado',
        'La pasarela de tarjeta aun no esta habilitada. Elige Yappy o Transferencia, o contacta a soporte.',
      );
      return;
    }
    Linking.openURL(checkoutUrl).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el enlace de pago.'),
    );
  };

  const doUpload = async () => {
    if (!method) return;
    setUploadError('');
    try {
      const pick = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      // Compat con la forma antigua ({type:'success'}) y la nueva ({assets}).
      const asset: any =
        (pick as any).assets?.[0] ??
        ((pick as any).type === 'success' ? pick : null);
      if ((pick as any).canceled || !asset) return;

      const fileName = asset.name ?? 'comprobante';
      const mimeType = asset.mimeType ?? null;
      const size = typeof asset.size === 'number' ? asset.size : null;

      setUploading(true);
      const { path, error } = await uploadPaymentReceipt(receiptPathPrefix, {
        uri: asset.uri,
        name: fileName,
        mimeType,
        size,
      });
      setUploading(false);

      if (error) {
        setUploadError(error);
        // Aun asi propagamos el nombre para mantener la UI de "en revision"
        // pero sin URL persistente. El admin vera el mensaje de error.
        onUploadProof({
          name: fileName,
          method: PAY_KEY_TO_METHOD[method],
          receiptPath: null,
          size,
          mimeType,
        });
        return;
      }

      onUploadProof({
        name: fileName,
        method: PAY_KEY_TO_METHOD[method],
        receiptPath: path,
        size,
        mimeType,
      });
    } catch (err: any) {
      setUploading(false);
      setUploadError(err?.message ?? 'No se pudo subir el archivo.');
    }
  };

  if (uploadedProof && !isRejected) {
    return (
      <View style={s.proofBox}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={s.proofTitle}>Comprobante enviado</Text>
          <Text style={s.proofHint}>
            {uploadedProof.name} - en revision por el equipo Wordlish
          </Text>
        </View>
        {onReplaceProof ? (
          <Pressable onPress={onReplaceProof} hitSlop={8}>
            <Text style={s.proofReplace}>Reemplazar</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={s.paySection}>
      {missingPrice ? (
        <View style={s.configWarn}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={s.configWarnText}>
            Configuracion incompleta: falta el valor por hora. Contacta a soporte antes de pagar.
          </Text>
        </View>
      ) : null}
      {isRejected ? (
        <View style={s.rejectedBanner}>
          <Ionicons name="close-circle" size={18} color={colors.danger} />
          <Text style={s.rejectedText}>
            Comprobante rechazado. Sube uno nuevo para continuar.
          </Text>
        </View>
      ) : null}

      <PayRadio
        active={method === 'yappy'}
        icon="phone-portrait"
        label="Yappy"
        hint="Transferencia movil"
        onPress={() => setMethod('yappy')}
      />
      <PayRadio
        active={method === 'ach'}
        icon="business"
        label="Transferencia ACH"
        hint="Banco General"
        onPress={() => setMethod('ach')}
      />
      <PayRadio
        active={method === 'cuanto'}
        icon="card"
        label="Tarjeta con Cuanto"
        hint="Visa - Mastercard - Amex"
        onPress={() => setMethod('cuanto')}
      />

      {method === 'yappy' ? (
        <View style={s.detail}>
          <Text style={s.detailStep}>1 - Envia {amountText} via Yappy</Text>
          <View style={s.copyRow}>
            <Text style={s.copyValue}>{yappyNumber}</Text>
            <Pressable
              onPress={() => copy(yappyNumber, 'Yappy')}
              hitSlop={8}
              style={s.copyBtn}
            >
              <Ionicons
                name={copied === 'Yappy' ? 'checkmark' : 'copy-outline'}
                size={14}
                color={copied === 'Yappy' ? colors.success : colors.primaryDark}
              />
              <Text
                style={[
                  s.copyText,
                  copied === 'Yappy' && { color: colors.success },
                ]}
              >
                {copied === 'Yappy' ? 'Copiado' : 'Copiar'}
              </Text>
            </Pressable>
          </View>
          <Text style={s.detailBene}>Beneficiario: {beneficiary}</Text>
          <Text style={s.detailStep}>2 - Sube tu comprobante</Text>
          <UploadCta uploading={uploading} onPress={doUpload} />
        </View>
      ) : null}

      {method === 'ach' ? (
        <View style={s.detail}>
          <Text style={s.detailStep}>1 - Transfiere {amountText} por ACH</Text>
          <View style={s.copyRow}>
            <Text style={s.copyValue}>{achAccount}</Text>
            <Pressable
              onPress={() => copy(achAccount, 'ACH')}
              hitSlop={8}
              style={s.copyBtn}
            >
              <Ionicons
                name={copied === 'ACH' ? 'checkmark' : 'copy-outline'}
                size={14}
                color={copied === 'ACH' ? colors.success : colors.primaryDark}
              />
              <Text
                style={[
                  s.copyText,
                  copied === 'ACH' && { color: colors.success },
                ]}
              >
                {copied === 'ACH' ? 'Copiado' : 'Copiar'}
              </Text>
            </Pressable>
          </View>
          <Text style={s.detailBene}>Beneficiario: {beneficiary}</Text>
          <Text style={s.detailStep}>2 - Sube tu comprobante</Text>
          <UploadCta uploading={uploading} onPress={doUpload} />
        </View>
      ) : null}

      {method === 'cuanto' ? (
        <View style={s.detail}>
          <Text style={s.detailStep}>
            Pago en linea con Cuanto - confirmacion inmediata.
          </Text>
          <Pressable
            onPress={handleCardPay}
            style={({ pressed }) => [s.cardBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="card" size={18} color={colors.textOnPrimary} />
            <Text style={s.cardBtnText}>Pagar con tarjeta</Text>
            <Ionicons name="open-outline" size={16} color={colors.textOnPrimary} />
          </Pressable>
          <Text style={s.detailBene}>
            Si prefieres, tambien puedes subir un comprobante de la tarjeta.
          </Text>
          <UploadCta uploading={uploading} onPress={doUpload} />
        </View>
      ) : null}

      {method === null ? (
        <Text style={s.methodHintEmpty}>
          Selecciona un metodo para ver las instrucciones.
        </Text>
      ) : null}

      {uploadError ? (
        <View style={s.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={s.errorText}>{uploadError}</Text>
        </View>
      ) : null}
    </View>
  );
}

function UploadCta({
  uploading,
  onPress,
}: {
  uploading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={uploading}
      style={({ pressed }) => [
        s.uploadBtn,
        pressed && !uploading && { opacity: 0.9 },
        uploading && { opacity: 0.7 },
      ]}
    >
      {uploading ? (
        <ActivityIndicator size="small" color={colors.primaryDark} />
      ) : (
        <Ionicons name="cloud-upload-outline" size={18} color={colors.primaryDark} />
      )}
      <Text style={s.uploadText}>
        {uploading ? 'Subiendo...' : 'Subir comprobante'}
      </Text>
    </Pressable>
  );
}

function PayRadio({
  active,
  icon,
  label,
  hint,
  onPress,
}: {
  active: boolean;
  icon: string;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.radioRow,
        active && s.radioRowOn,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[s.methodIcon, active && { backgroundColor: colors.primary }]}>
        <Ionicons
          name={icon as any}
          size={18}
          color={active ? colors.textOnPrimary : colors.primaryDark}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.radioLabel}>{label}</Text>
        <Text style={s.radioHint}>{hint}</Text>
      </View>
      <View style={[s.radio, active && s.radioOn]}>
        {active ? <View style={s.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  paySection: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  rejectedText: { flex: 1, color: colors.danger, fontWeight: '700', fontSize: 13 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  radioLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  radioHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  radioOn: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  detail: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    gap: spacing.sm,
  },
  detailStep: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  detailBene: { fontSize: 12, color: colors.textSubtle, fontWeight: '600' },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  copyText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  cardBtnText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '700' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  uploadText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  methodHintEmpty: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontStyle: 'italic',
  },
  proofBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },
  proofTitle: { color: colors.success, fontWeight: '700', fontSize: 14 },
  proofHint: { color: colors.textSubtle, fontSize: 12, marginTop: 2 },
  proofReplace: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 12, fontWeight: '600' },
  configWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  configWarnText: {
    flex: 1,
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700',
  },
});
