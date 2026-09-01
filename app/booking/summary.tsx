import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { Avatar, KnowCard } from '@/components/ui';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { useBookings } from '@/hooks/useBookings';
import { dateUtils } from '@/services/mockData';
import { policiesAck } from '@/services/policiesAck';
import { POLICY_COPY } from '@/constants/policies';

// Las reglas rápidas viven ahora en POLICY_COPY.bookingSummary
// (constants/policies.ts). Se muestran a través de <KnowCard />.

export default function BookingSummary() {
  const router = useRouter();
  const { draft, setHoldId, reset } = useDraftBooking();
  const { holds, createBooking, releaseHold, remainingHours } = useBookings();

  const hold = holds.find((h) => h.id === draft.holdId);
  const hoursLeft = remainingHours[draft.studentId] ?? 0;

  const [remaining, setRemaining] = useState<number>(() =>
    hold ? Math.max(0, Math.floor((hold.expiresAt - Date.now()) / 1000)) : 0,
  );
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [policiesViewed, setPoliciesViewed] = useState<boolean>(
    policiesAck.hasViewed(draft.studentId),
  );

  useEffect(() => {
    if (
      !draft.date ||
      !draft.time ||
      !draft.teacherId ||
      !draft.subject ||
      !draft.studentId
    ) {
      router.replace('/booking/new' as any);
    }
  }, [draft.date, draft.time, draft.teacherId, draft.subject, draft.studentId]);

  // Cada vez que la pantalla vuelve al foco, refresca si las políticas se
  // visualizaron (por ejemplo tras volver del modal de Tips).
  useFocusEffect(
    useCallback(() => {
      setPoliciesViewed(policiesAck.hasViewed(draft.studentId));
    }, [draft.studentId]),
  );

  useEffect(() => {
    if (!hold) return;
    const t = setInterval(() => {
      const r = Math.max(0, Math.floor((hold.expiresAt - Date.now()) / 1000));
      setRemaining(r);
      if (r === 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [hold?.id, hold?.expiresAt]);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  const onChangeSchedule = () => {
    if (draft.holdId) releaseHold(draft.holdId);
    setHoldId(null);
    router.back();
  };

  const openPolicies = () => {
    router.push(`/class/policies?studentId=${draft.studentId}` as any);
  };

  const onConfirm = () => {
    if (busy) return;
    if (!policiesViewed) {
      setError('Revisa las políticas antes de confirmar.');
      return;
    }
    setBusy(true);
    setError('');
    const result = createBooking(
      {
        studentId: draft.studentId,
        studentName: draft.studentName,
        studentAvatar: draft.studentAvatar,
        teacherId: draft.teacherId,
        teacherName: draft.teacherName,
        teacherAvatar: draft.teacherAvatar,
        subject: draft.subject,
        date: draft.date,
        time: draft.time,
      },
      draft.holdId ?? undefined,
    );
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setHoldId(null);
    const id = result.booking.id;
    router.replace(`/booking/success?id=${id}` as any);
    setTimeout(() => reset(), 200);
  };

  const holdExpired = hold ? remaining === 0 : false;
  const confirmDisabled = busy || holdExpired || !policiesViewed;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Paso 4 de 4</Text>
          <Text style={typography.h2}>Resumen</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <StepDots current={3} />

        {hold && !holdExpired && (
          <View style={s.holdBanner}>
            <Ionicons name="lock-closed" size={16} color={colors.primaryDark} />
            <Text style={s.holdText}>
              Horario reservado · {mm}:{ss}
            </Text>
          </View>
        )}
        {hold && holdExpired && (
          <View style={[s.holdBanner, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[s.holdText, { color: colors.danger }]}>
              La reserva temporal expiró. Vuelve al horario.
            </Text>
          </View>
        )}

        <View style={s.hero}>
          <View style={s.serviceTag}>
            <Ionicons name="person" size={11} color={colors.primaryDark} />
            <Text style={s.serviceTagText}>Tutoría individual</Text>
          </View>
          <Text style={s.heroSubject}>{draft.subject}</Text>
          <Text style={s.heroDate}>
            {dateUtils.formatDisplay(draft.date)} · {draft.time}
          </Text>
        </View>

        <View style={s.card}>
          <Row avatar={draft.teacherAvatar} name={draft.teacherName} role="Profesor" />
          <Divider />
          <Row avatar={draft.studentAvatar} name={draft.studentName} role="Estudiante" />
        </View>

        <View style={s.card}>
          <InfoLine icon="time-outline" label="Duración" value="60 minutos" />
          <InfoLine
            icon="hourglass-outline"
            label="Horas disponibles"
            value={`${hoursLeft} h`}
          />
          <InfoLine icon="person-add-outline" label="Suplente" value="Sin asignar" />
          <InfoLine
            icon={hoursLeft > 0 ? 'checkmark-circle' : 'card-outline'}
            label="Estado inicial"
            value={hoursLeft > 0 ? 'Confirmada' : 'Pendiente de pago'}
            tone={hoursLeft > 0 ? 'success' : 'warning'}
            last
          />
        </View>

        {/* 💡 Lo que debes saber (reglas visibles antes de confirmar) */}
        <KnowCard
          rules={POLICY_COPY.bookingSummary}
          style={{ marginTop: spacing.lg }}
        />

        {hoursLeft === 0 && (
          <View style={s.noticeBox}>
            <Ionicons name="information-circle" size={18} color={colors.warning} />
            <Text style={s.noticeText}>
              No tienes horas en paquete activo. Se creará una orden pendiente
              de pago.
            </Text>
          </View>
        )}

        {error !== '' && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Ver políticas */}
        <Pressable
          onPress={openPolicies}
          style={({ pressed }) => [s.policyBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={colors.primaryDark}
          />
          <Text style={s.policyBtnText}>Ver políticas</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
        </Pressable>

        {policiesViewed ? (
          <View style={s.policyStatus}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[s.policyStatusText, { color: colors.success }]}>
              Políticas revisadas
            </Text>
          </View>
        ) : (
          <View style={s.policyStatus}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
            <Text style={[s.policyStatusText, { color: colors.warning }]}>
              Revisa las políticas antes de confirmar
            </Text>
          </View>
        )}

        <Pressable
          onPress={onConfirm}
          disabled={confirmDisabled}
          style={({ pressed }) => [
            s.primaryBtn,
            confirmDisabled && { opacity: 0.5 },
            pressed && !confirmDisabled && { opacity: 0.9 },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.textOnPrimary} />
          <Text style={s.primaryText}>
            {hoursLeft > 0 ? 'Confirmar reserva' : 'Crear orden y reservar'}
          </Text>
        </Pressable>

        <Pressable onPress={onChangeSchedule} style={s.secondaryBtn}>
          <Text style={s.secondaryText}>Cambiar horario</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ avatar, name, role }: { avatar: string; name: string; role: string }) {
  return (
    <View style={s.row}>
      <Avatar name={name} uri={avatar} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyStrong}>{name}</Text>
        <Text style={typography.caption}>{role}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }}
    />
  );
}

function InfoLine({
  icon,
  label,
  value,
  tone,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger' | 'default';
  last?: boolean;
}) {
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
      ? colors.warning
      : tone === 'danger'
      ? colors.danger
      : colors.text;
  return (
    <View
      style={[
        s.infoLine,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={s.infoIcon}>
        <Ionicons name={icon as any} size={16} color={colors.primaryDark} />
      </View>
      <Text style={typography.caption}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={[typography.bodyStrong, { color }]}>{value}</Text>
    </View>
  );
}

function StepDots({ current }: { current: number }) {
  return (
    <View style={s.dotsRow}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[s.dot, i === current && s.dotActive, i < current && s.dotDone]}
        />
      ))}
    </View>
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
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryDark },

  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  holdText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },

  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.md,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  serviceTagText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 11,
  },
  heroSubject: { color: colors.textOnPrimary, fontSize: 22, fontWeight: '700' },
  heroDate: { color: colors.primarySoft, fontSize: 14, marginTop: 6 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rulesTitle: { ...typography.h3, fontSize: 16 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ruleText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
    fontSize: 14,
  },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  noticeText: {
    color: colors.warning,
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  errorText: { color: colors.danger, fontWeight: '600', fontSize: 13, flex: 1 },

  policyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  policyBtnText: {
    flex: 1,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
  },
  policyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  policyStatusText: { fontWeight: '700', fontSize: 12 },

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
  primaryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },

  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
