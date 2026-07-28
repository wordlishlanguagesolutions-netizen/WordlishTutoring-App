import React, { useEffect, useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { Avatar, ZoomButton, StatusBadge } from '@/components/ui';
import { useBookings } from '@/hooks/useBookings';
import { BOOKING_STATUS, dateUtils } from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { getSetting } from '@/services/appSettingsService';

type PayKey = 'yappy' | 'ach' | 'cuanto';

// ============================================================================
// Reserva · Paso final (post-confirmacion).
//
// Flujo 1 (con paquete): "Reserva confirmada" + horas descontadas + restantes.
//   No se muestran opciones de pago.
// Flujo 2 (sin horas): "Pago pendiente" con tres canales oficiales:
//   - Yappy (numero configurable)
//   - Transferencia ACH (cuenta configurable)
//   - Tarjeta de credito via link Cuanto (payment.checkout_url)
//   + boton "Subir comprobante" que envia notificaciones a admin/supervisor.
// ============================================================================

export default function BookingSuccess() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getById,
    remainingHours,
    paymentProofs,
    submitPaymentProof,
  } = useBookings();
  const { user } = useAuth();
  const { reset } = useDraftBooking();
  const [copied, setCopied] = useState<string>('');
  const [method, setMethod] = useState<PayKey | null>(null);

  useEffect(() => {
    reset();
  }, []);

  const b = getById(id ?? '');

  if (!b) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top']}
      >
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          <Text style={typography.h2}>Reserva no encontrada</Text>
          <Pressable
            onPress={() => router.replace('/booking/mine' as any)}
            style={s.primaryBtn}
          >
            <Text style={s.primaryText}>Ver mis reservas</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const st = BOOKING_STATUS[b.status];
  const confirmed = b.status === 'confirmed';
  const pending = b.status === 'pending_payment';
  const proof = paymentProofs[b.id];
  const remaining = remainingHours[b.studentId] ?? 0;
  const price = getSetting<number>('payment.price_per_hour_usd', 18);
  const checkoutUrl = getSetting<string>('payment.checkout_url', '');
  const beneficiary = getSetting<string>('payment.beneficiary_name', 'Maristella Florian');
  const yappyNumber = getSetting<string>('payment.yappy_number', '+507 6216-4495');
  const achAccount = getSetting<string>('payment.ach_account', '04-72-99-558451-2');

  const role = (user as any)?.role ?? 'student';
  const homeRoute = () => {
    switch (role) {
      case 'guardian':
        return '/(guardian)';
      case 'teacher':
        return '/(teacher)';
      case 'supervisor':
        return '/(supervisor)';
      case 'admin':
        return '/(admin)';
      default:
        return '/(student)';
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
    } catch {
      // no-op: en web sin permisos u otras plataformas ignoramos silenciosamente
    }
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  };

  const handleCardPay = () => {
    if (!checkoutUrl) {
      Alert.alert(
        'Enlace de pago no configurado',
        'El administrador aún no habilitó la pasarela. Envía tu comprobante o contacta soporte.',
      );
      return;
    }
    Linking.openURL(checkoutUrl).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el enlace de pago.'),
    );
  };

  const handleUpload = () => {
    Alert.alert('Subir comprobante', 'Selecciona el tipo de archivo', [
      {
        text: 'Imagen',
        onPress: () => submitPaymentProof(b.id, 'comprobante.jpg'),
      },
      {
        text: 'PDF',
        onPress: () => submitPaymentProof(b.id, 'comprobante.pdf'),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const showPayStep = pending && !proof;
  const showReview = pending && !!proof;

  const headerTitle = confirmed
    ? 'Reserva confirmada'
    : showReview
    ? 'Pago en revisión'
    : 'Elige cómo pagar';

  const headerSubtitle = confirmed
    ? `Se descontó 1 hora de tu paquete · Te quedan ${remaining} h disponibles.`
    : showReview
    ? 'Recibimos tu comprobante. Te avisaremos apenas el equipo Wordlish lo valide.'
    : `Sin horas disponibles · Valor a pagar $${price.toFixed(2)}. Selecciona un método abajo.`;

  const headerIcon = confirmed
    ? 'checkmark-circle'
    : showReview
    ? 'time'
    : 'card-outline';

  const headerBg = confirmed
    ? colors.successSoft
    : showReview
    ? colors.infoSoft
    : colors.warningSoft;

  const headerFg = confirmed
    ? colors.success
    : showReview
    ? colors.info
    : colors.warning;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        {showPayStep ? (
          <View style={s.stepHeader}>
            <Text style={s.stepLabel}>Paso 4 de 4</Text>
            <Text style={s.stepTitle}>Elige cómo pagar</Text>
            <View style={s.dotsRow}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[s.dot, i === 3 && s.dotActive, i < 3 && s.dotDone]}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={s.iconWrap}>
          <View style={[s.bigIcon, { backgroundColor: headerBg }]}>
            <Ionicons name={headerIcon as any} size={52} color={headerFg} />
          </View>
        </View>

        <Text style={s.title}>{headerTitle}</Text>
        <Text style={s.subtitle}>{headerSubtitle}</Text>

        <View style={{ alignItems: 'center', marginTop: spacing.md }}>
          <StatusBadge
            tone={showReview ? 'info' : st.tone}
            label={showReview ? 'Pago en revisión' : st.label}
            icon={showReview ? 'time-outline' : st.icon}
          />
        </View>

        <View style={s.card}>
          <Text style={s.subject}>{b.subject}</Text>
          <Text style={s.datetime}>
            {dateUtils.formatDisplay(b.date)} · {b.time}
          </Text>
          <View style={s.person}>
            <Avatar name={b.teacherName} uri={b.teacherAvatar} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyStrong}>{b.teacherName}</Text>
              <Text style={typography.caption}>Profesor principal</Text>
            </View>
          </View>
          <View style={s.person}>
            <Avatar name={b.studentName} uri={b.studentAvatar} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyStrong}>{b.studentName}</Text>
              <Text style={typography.caption}>Estudiante</Text>
            </View>
          </View>
        </View>

        {/* Paso 4 · Métodos de pago con selección única */}
        {showPayStep ? (
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
                <Text style={s.detailStep}>1 · Envía ${price.toFixed(2)} vía Yappy</Text>
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
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color={colors.primaryDark}
                  />
                  <Text style={s.uploadText}>Subir comprobante</Text>
                </Pressable>
              </View>
            ) : null}

            {method === 'ach' ? (
              <View style={s.detail}>
                <Text style={s.detailStep}>1 · Transfiere ${price.toFixed(2)} por ACH</Text>
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
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color={colors.primaryDark}
                  />
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
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.textOnPrimary}
                  />
                </Pressable>
              </View>
            ) : null}

            {method === null ? (
              <Text style={s.methodHintEmpty}>
                Selecciona un método para ver las instrucciones.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Comprobante enviado · pago en revisión */}
        {showReview ? (
          <View style={s.proofBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={s.proofTitle}>Comprobante enviado</Text>
              <Text style={s.proofHint}>
                {proof!.name} · en revisión por el equipo Wordlish
              </Text>
            </View>
            <Pressable onPress={handleUpload} hitSlop={8}>
              <Text style={s.proofReplace}>Reemplazar</Text>
            </Pressable>
          </View>
        ) : null}

        {confirmed && (
          <View style={{ marginTop: spacing.lg }}>
            <ZoomButton />
          </View>
        )}

        <Pressable
          onPress={() => router.replace(`/booking/${b.id}` as any)}
          style={s.secondaryBtn}
        >
          <Ionicons name="document-text" size={18} color={colors.primaryDark} />
          <Text style={s.secondaryText}>Ver detalle de la clase</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace(homeRoute() as any)}
          style={s.textBtn}
        >
          <Text style={s.textBtnText}>Volver al inicio</Text>
        </Pressable>
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
  iconWrap: { alignItems: 'center', marginTop: spacing.xl },
  bigIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
    gap: spacing.md,
  },
  subject: { ...typography.h2 },
  datetime: { ...typography.caption },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  sectionTitle: {
    ...typography.h3,
    marginTop: spacing.md,
  },
  sectionHint: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  paySection: {
    marginTop: spacing.lg,
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
  radioOn: {
    borderColor: colors.primary,
  },
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
  methodHintEmpty: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontStyle: 'italic',
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  methodValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  methodHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
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

  cardMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  cardMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMethodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  cardMethodHint: {
    fontSize: 12,
    color: colors.primarySoft,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  uploadText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  primaryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  textBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  textBtnText: { color: colors.textSubtle, fontSize: 13, fontWeight: '600' },

  proofBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
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
  stepHeader: {
    marginBottom: spacing.md,
    gap: 4,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryDark },
});
