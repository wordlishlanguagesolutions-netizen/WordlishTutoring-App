import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { Avatar, ZoomButton, StatusBadge } from '@/components/ui';
import { useBookings } from '@/hooks/useBookings';
import { BOOKING_STATUS, dateUtils } from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useDraftBooking } from '@/hooks/useDraftBooking';

export default function BookingSuccess() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById } = useBookings();
  const { user } = useAuth();
  const { reset } = useDraftBooking();

  useEffect(() => { reset(); }, []);

  const b = getById(id ?? '');

  if (!b) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          <Text style={typography.h2}>Reserva no encontrada</Text>
          <Pressable onPress={() => router.replace('/booking/mine' as any)} style={s.primaryBtn}>
            <Text style={s.primaryText}>Ver mis reservas</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const st = BOOKING_STATUS[b.status];
  const confirmed = b.status === 'confirmed';

  const role = (user as any)?.role ?? 'student';
  const homeRoute = () => {
    switch (role) {
      case 'guardian': return '/(guardian)';
      case 'teacher': return '/(teacher)';
      case 'supervisor': return '/(supervisor)';
      case 'admin': return '/(admin)';
      default: return '/(student)';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={s.iconWrap}>
          <View style={[s.bigIcon, { backgroundColor: confirmed ? colors.successSoft : colors.warningSoft }]}>
            <Ionicons
              name={confirmed ? 'checkmark-circle' : 'card-outline'}
              size={56}
              color={confirmed ? colors.success : colors.warning}
            />
          </View>
        </View>

        <Text style={s.title}>
          {confirmed ? 'Reserva confirmada' : 'Orden creada'}
        </Text>
        <Text style={s.subtitle}>
          {confirmed
            ? 'Tu clase quedó guardada. Nos vemos pronto.'
            : 'Completa el pago para confirmar la clase.'}
        </Text>

        <View style={{ alignItems: 'center', marginTop: spacing.md }}>
          <StatusBadge tone={st.tone} label={st.label} icon={st.icon} />
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

        {confirmed && (
          <View style={{ marginTop: spacing.lg }}>
            <ZoomButton />
          </View>
        )}

        <Pressable
          onPress={() => router.replace(`/booking/${b.id}` as any)}
          style={s.primaryBtn}
        >
          <Ionicons name="document-text" size={18} color={colors.textOnPrimary} />
          <Text style={s.primaryText}>Ver detalle de la clase</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/booking/mine' as any)}
          style={s.secondaryBtn}
        >
          <Ionicons name="list" size={18} color={colors.primaryDark} />
          <Text style={s.secondaryText}>Ver mis reservas</Text>
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
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    ...typography.h1, textAlign: 'center', marginTop: spacing.lg,
  },
  subtitle: {
    ...typography.caption, textAlign: 'center', marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginTop: spacing.xl,
    borderWidth: 1, borderColor: colors.border, ...shadow.sm,
    gap: spacing.md,
  },
  subject: { ...typography.h2 },
  datetime: { ...typography.caption },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: 16,
    borderRadius: radius.md, marginTop: spacing.lg,
  },
  primaryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primarySoft, paddingVertical: 14,
    borderRadius: radius.md, marginTop: spacing.sm,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  textBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  textBtnText: { color: colors.textSubtle, fontSize: 13, fontWeight: '600' },
});
