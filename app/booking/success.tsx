import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { Avatar, StatusBadge } from '@/components/ui';
import { PaymentMethods } from '@/components/booking/PaymentMethods';
import { useBookings } from '@/hooks/useBookings';
import { BOOKING_STATUS, dateUtils } from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { getSetting } from '@/services/appSettingsService';

// ============================================================================
// Estado de pago de una reserva pending_payment.
//
// Ya NO es parte del wizard (el flujo se resume en 3 pasos con pago
// inline en summary.tsx). Esta pantalla solo se abre desde el detalle de
// una reserva pendiente si el estudiante decidio pagar despues.
// Muestra:
//   - Sin comprobante: metodos de pago via <PaymentMethods />
//   - Con comprobante: estado "Pago en revision"
// ============================================================================

export default function BookingSuccess() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getById,
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
  const proof = paymentProofs[b.id];
  const price = getSetting<number>('payment.price_per_hour_usd', 18);

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

  const inReview = !!proof;
  const headerTitle = inReview ? 'Pago en revision' : 'Elige como pagar';
  const headerSubtitle = inReview
    ? 'Recibimos tu comprobante. Te avisaremos apenas el equipo Wordlish lo valide.'
    : `Sin horas disponibles · Valor a pagar $${price.toFixed(2)}. Selecciona un metodo abajo.`;

  const headerIcon = inReview ? 'time' : 'card-outline';
  const headerBg = inReview ? colors.infoSoft : colors.warningSoft;
  const headerFg = inReview ? colors.info : colors.warning;

  const handleUploadProof = (name: string) => {
    submitPaymentProof(b.id, name);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={s.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Reserva pendiente</Text>
          <Text style={typography.h2}>
            {inReview ? 'Pago en revision' : 'Elige como pagar'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <View style={s.iconWrap}>
          <View style={[s.bigIcon, { backgroundColor: headerBg }]}>
            <Ionicons name={headerIcon as any} size={52} color={headerFg} />
          </View>
        </View>

        <Text style={s.title}>{headerTitle}</Text>
        <Text style={s.subtitle}>{headerSubtitle}</Text>

        <View style={{ alignItems: 'center', marginTop: spacing.md }}>
          <StatusBadge
            tone={inReview ? 'info' : st.tone}
            label={inReview ? 'Pago en revision' : st.label}
            icon={inReview ? 'time-outline' : st.icon}
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

        <View style={{ marginTop: spacing.lg }}>
          <PaymentMethods
            amount={price}
            onUploadProof={handleUploadProof}
            uploadedProof={proof ? { name: proof.name, at: proof.at } : null}
          />
        </View>

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
    marginTop: spacing.lg,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  textBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  textBtnText: { color: colors.textSubtle, fontSize: 13, fontWeight: '600' },
});
