import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { getSetting } from '@/services/appSettingsService';
import { createNotification } from '@/services/notificationService';

// ============================================================================
// Pantalla unica de pago Wordlish. Se abre al tocar "Adquirir plan o recarga"
// en Reservas. Reutiliza el mismo componente PayRadio del Paso 4 del wizard
// (app/booking/success.tsx) para garantizar una sola implementacion visual.
// ============================================================================

type PayKey = 'yappy' | 'ach' | 'cuanto';

export default function BookingPay() {
  const router = useRouter();
  const [method, setMethod] = useState<PayKey | null>(null);
  const [copied, setCopied] = useState<string>('');
  const [sent, setSent] = useState<string>('');

  const checkoutUrl = getSetting<string>('payment.checkout_url', '');
  const beneficiary = getSetting<string>('payment.beneficiary_name', 'Maristella Florian');
  const yappyNumber = getSetting<string>('payment.yappy_number', '+507 6216-4495');
  const achAccount = getSetting<string>('payment.ach_account', '04-72-99-558451-2');

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
        'El administrador aun no habilito la pasarela. Contacta soporte.',
      );
      return;
    }
    Linking.openURL(checkoutUrl).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el enlace de pago.'),
    );
  };

  const handleUpload = () => {
    const submit = (name: string) => {
      createNotification({
        userId: 'u-admin',
        type: 'payment_pending',
        title: 'Comprobante recibido',
        message: 'Compra de plan/recarga · Revisar en pagos',
        refType: 'payment',
        refId: `manual-${Date.now()}`,
        actionRoute: '/(admin)/finance',
        actionLabel: 'Revisar pago',
      });
      createNotification({
        userId: 'u-sup',
        type: 'payment_pending',
        title: 'Comprobante recibido',
        message: 'Compra de plan/recarga · Revisar en pagos',
        refType: 'payment',
        refId: `manual-${Date.now()}`,
        actionRoute: '/(admin)/finance',
        actionLabel: 'Revisar pago',
      });
      setSent(name);
    };
    Alert.alert('Subir comprobante', 'Selecciona el tipo de archivo', [
      { text: 'Imagen', onPress: () => submit('comprobante.jpg') },
      { text: 'PDF', onPress: () => submit('comprobante.pdf') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Pago Wordlish</Text>
          <Text style={typography.h2}>Elige cómo pagar</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {sent ? (
          <View style={s.proofBox}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={s.proofTitle}>Comprobante enviado</Text>
              <Text style={s.proofHint}>
                {sent} · en revisión por el equipo Wordlish
              </Text>
            </View>
          </View>
        ) : null}

        <View style={s.paySection}>
          <PayRadio
            active={method === 'yappy'}
            icon="phone-portrait"
            label="Yappy"
            hint="Transferencia móvil"
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
              <Text style={s.detailStep}>1 · Envía el monto vía Yappy</Text>
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
                onPress={handleUpload}
                style={({ pressed }) => [s.uploadBtn, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={colors.primaryDark} />
                <Text style={s.uploadText}>Subir comprobante</Text>
              </Pressable>
            </View>
          ) : null}

          {method === 'ach' ? (
            <View style={s.detail}>
              <Text style={s.detailStep}>1 · Transfiere el monto por ACH</Text>
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
                onPress={handleUpload}
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
                Pago en línea con Cuanto · confirmación inmediata.
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
              Selecciona un método para ver las instrucciones.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  radioLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  radioHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
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
  detailStep: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  detailBene: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: '600',
  },
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
  copyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  cardBtnText: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
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
  uploadText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
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
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },
  proofTitle: { color: colors.success, fontWeight: '700', fontSize: 14 },
  proofHint: { color: colors.textSubtle, fontSize: 12, marginTop: 2 },
});
