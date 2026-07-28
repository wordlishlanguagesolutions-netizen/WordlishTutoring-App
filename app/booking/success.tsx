import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
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
// Flujo 2 (sin horas): "Reserva confirmada · Pago pendiente" con dos acciones
//   claras: Pagar ahora (checkout externo configurable) y Subir comprobante.
//   Al subir el comprobante, se notifica automaticamente a admin y supervisor
//   y la vista cambia a "Comprobante enviado · Pago en revision".
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

  const handlePayNow = () => {
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
            Estado: Pago pendiente · Valor a pagar ${price.toFixed(2)}
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

        {/* Bloque de pago · solo cuando esta pendiente y sin comprobante */}
        {pending && !proof ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Pressable
              onPress={handlePayNow}
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="card" size={18} color={colors.textOnPrimary} />
              <Text style={s.primaryText}>Pagar ahora</Text>
            </Pressable>
            <Pressable
              onPress={handleUpload}
              style={({ pressed }) => [
                s.secondaryBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={18}
                color={colors.primaryDark}
              />
              <Text style={s.secondaryText}>Subir comprobante</Text>
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
    marginTop: spacing.sm,
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
