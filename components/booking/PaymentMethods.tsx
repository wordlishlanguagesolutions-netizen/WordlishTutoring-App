import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius, shadow } from '@/constants/theme';
import { getSetting } from '@/services/appSettingsService';

// ============================================================================
// PaymentMethods · componente unico de metodos de pago Wordlish.
//
// Consumido por:
//   - app/booking/success.tsx (Paso 4 del wizard cuando faltan horas)
//   - app/booking/pay.tsx (compra directa de plan/recarga desde Reservas)
//
// Fuente unica: elimina la duplicacion de PayRadio, Yappy/ACH/Cuanto, copy
// y upload que antes vivia en 3 archivos.
// ============================================================================

type PayKey = 'yappy' | 'ach' | 'cuanto';

interface PaymentMethodsProps {
  /** Monto a mostrar en el paso "1 · Envia $X". Si es 0 muestra "el monto". */
  amount?: number;
  /** Callback cuando el usuario elige subir comprobante. */
  onUploadProof: (name: string) => void;
  /** Si existe, se muestra el estado "Comprobante enviado" en vez del selector. */
  uploadedProof?: { name: string; at: number } | null;
  /** Callback para reemplazar el comprobante ya enviado. */
  onReplaceProof?: () => void;
}

export function PaymentMethods({
  amount,
  onUploadProof,
  uploadedProof,
  onReplaceProof,
}: PaymentMethodsProps) {
  const [method, setMethod] = useState<PayKey | null>(null);
  const [copied, setCopied] = useState<string>('');

  const checkoutUrl = getSetting<string>('payment.checkout_url', '');
  const beneficiary = getSetting<string>('payment.beneficiary_name', 'Maristella Florian');
  const yappyNumber = getSetting<string>('payment.yappy_number', '+507 6216-4495');
  const achAccount = getSetting<string>('payment.ach_account', '04-72-99-558451-2');

  const amountText = amount && amount > 0 ? `$${amount.toFixed(2)}` : 'el monto';

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
    if (!checkoutUrl) {
      Alert.alert(
        'Enlace de pago no configurado',
        'El administrador aun no habilito la pasarela. Envia tu comprobante o contacta soporte.',
      );
      return;
    }
    Linking.openURL(checkoutUrl).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el enlace de pago.'),
    );
  };

  const promptUpload = () => {
    Alert.alert('Subir comprobante', 'Selecciona el tipo de archivo', [
      { text: 'Imagen', onPress: () => onUploadProof('comprobante.jpg') },
      { text: 'PDF', onPress: () => onUploadProof('comprobante.pdf') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (uploadedProof) {
    return (
      <View style={s.proofBox}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={s.proofTitle}>Comprobante enviado</Text>
          <Text style={s.proofHint}>
            {uploadedProof.name} · en revision por el equipo Wordlish
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
        hint="Visa · Mastercard · Amex"
        onPress={() => setMethod('cuanto')}
      />

      {method === 'yappy' ? (
        <View style={s.detail}>
          <Text style={s.detailStep}>1 · Envia {amountText} via Yappy</Text>
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
          <Text style={s.detailStep}>2 · Sube tu comprobante</Text>
          <Pressable
            onPress={promptUpload}
            style={({ pressed }) => [s.uploadBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primaryDark} />
            <Text style={s.uploadText}>Subir comprobante</Text>
          </Pressable>
        </View>
      ) : null}

      {method === 'ach' ? (
        <View style={s.detail}>
          <Text style={s.detailStep}>1 · Transfiere {amountText} por ACH</Text>
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
          <Text style={s.detailStep}>2 · Sube tu comprobante</Text>
          <Pressable
            onPress={promptUpload}
            style={({ pressed }) => [s.uploadBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primaryDark} />
            <Text style={s.uploadText}>Subir comprobante</Text>
          </Pressable>
        </View>
      ) : null}

      {method === 'cuanto' ? (
        <View style={s.detail}>
          <Text style={s.detailStep}>
            Pago en linea con Cuanto · confirmacion inmediata.
          </Text>
          <Pressable
            onPress={handleCardPay}
            style={({ pressed }) => [s.cardBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="card" size={18} color={colors.textOnPrimary} />
            <Text style={s.cardBtnText}>Pagar con tarjeta</Text>
            <Ionicons name="open-outline" size={16} color={colors.textOnPrimary} />
          </Pressable>
        </View>
      ) : null}

      {method === null ? (
        <Text style={s.methodHintEmpty}>
          Selecciona un metodo para ver las instrucciones.
        </Text>
      ) : null}
    </View>
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
});
