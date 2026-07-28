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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <View style={s.iconWrap}>
          <View
            style={[
              s.bigIcon,
              {
                backgroundColor: confirmed
                  ? colors.successSoft
                  : colors.warningSoft,
              },
            ]}
          >
            <Ionicons
              name={confirmed ? 'checkmark-circle' : 'card-outline'}
              size={56}
              color={confirmed ? colors.success : colors.warning}
            />
          </View>
        </View>

        <Text style={s.title}>Reserva confirmada</Text>

        {confirmed ? (
          <Text style={s.subtitle}>
            Se descontó 1 hora de tu paquete. Te quedan {remaining} h disponibles.
          </Text>
        ) : proof ? (
          <Text style={s.subtitle}>
            Comprobante enviado · Pago en revisión. Te avisaremos cuando el
            supervisor lo valide.
          </Text>
        ) : (
          <Text style={s.subtitle}>
            Sin horas disponibles · Valor a pagar ${price.toFixed(2)}.
            Elige un método a continuación.
          </Text>
        )}

        <View style={{ alignItems: 'center', marginTop: spacing.md }}>
          <StatusBadge
            tone={proof && pending ? 'info' : st.tone}
            label={proof && pending ? 'Pago en revisión' : st.label}
            icon={proof && pending ? 'time-outline' : st.icon}
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

        {/* Metodos de pago · solo cuando esta pendiente y sin comprobante */}
        {pending && !proof ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Text style={s.sectionTitle}>Métodos de pago</Text>
            <Text style={s.sectionHint}>
              Todos los pagos manuales van a nombre de {beneficiary}.
            </Text>

            <PayMethod
              icon="phone-portrait"
              label="Yappy"
              value={yappyNumber}
              hint={beneficiary}
              onCopy={() => copy(yappyNumber, 'Yappy')}
              copied={copied === 'Yappy'}
            />

            <PayMethod
              icon="business"
              label="Transferencia ACH"
              value={achAccount}
              hint={beneficiary}
              onCopy={() => copy(achAccount, 'ACH')}
              copied={copied === 'ACH'}
            />

            <Pressable
              onPress={handleCardPay}
              style={({ pressed }) => [s.cardMethod, pressed && { opacity: 0.9 }]}
            >
              <View style={s.cardMethodIcon}>
                <Ionicons name="card" size={18} color={colors.textOnPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardMethodLabel}>Tarjeta de crédito</Text>
                <Text style={s.cardMethodHint}>
                  Pagar en línea con Cuanto (Visa · Mastercard · Amex)
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textOnPrimary} />
            </Pressable>

            <View style={s.divider} />

            <Pressable
              onPress={handleUpload}
              style={({ pressed }) => [
                s.uploadBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={18}
                color={colors.primaryDark}
              />
              <Text style={s.uploadText}>Ya pagué · Subir comprobante</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Bloque post-comprobante */}
        {pending && proof ? (
          <View style={s.proofBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={s.proofTitle}>Comprobante enviado</Text>
              <Text style={s.proofHint}>
                {proof.name} · en revisión por el equipo Wordlish
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

function PayMethod({
  icon,
  label,
  value,
  hint,
  onCopy,
  copied,
}: {
  icon: string;
  label: string;
  value: string;
  hint: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <View style={s.method}>
      <View style={s.methodIcon}>
        <Ionicons name={icon as any} size={18} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.methodLabel}>{label}</Text>
        <Text style={s.methodValue}>{value}</Text>
        <Text style={s.methodHint}>{hint}</Text>
      </View>
      <Pressable onPress={onCopy} hitSlop={8} style={s.copyBtn}>
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={14}
          color={copied ? colors.success : colors.primaryDark}
        />
        <Text style={[s.copyText, copied && { color: colors.success }]}>
          {copied ? 'Copiado' : 'Copiar'}
        </Text>
      </Pressable>
    </View>
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
});
