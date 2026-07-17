import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { Avatar, KnowCard } from '@/components/ui';
import { GROUP_COURSES } from '@/services/mockData';
import { getGroupCourseStatus } from '@/constants/policies';
import { GROUP_BOOKING_HINTS } from '@/constants/contextualPolicies';

// ============================================================================
// Curso grupal · listado de cursos activos.
// Muestra materia, grado, profesor, horario, inicio, cupos, plan y precio.
// La inscripción es simulada (Alert) hasta conectar la matrícula real.
// No mezclar con la lógica de tutoría individual.
// ============================================================================

export default function BookingGroups() {
  const router = useRouter();

  const enroll = (subject: string) => {
    Alert.alert(
      'Curso grupal',
      `La inscripción a "${subject}" se activará cuando conectemos la matrícula real.`,
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Curso grupal</Text>
          <Text style={typography.h2}>Cursos activos</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        {/* Ubicación automática: reglas específicas de cursos grupales.
            Horario fijo, no reprogramables, no reembolsables. Nunca se
            muestran políticas de tutoría individual aquí. */}
        <KnowCard
          rules={GROUP_BOOKING_HINTS}
          style={{ marginBottom: spacing.lg }}
        />

        {GROUP_COURSES.map((c) => {
          const status = getGroupCourseStatus(c.availableSpots, c.totalSpots);
          const full = status.status === 'full';
          const toneMap = {
            success: { bg: colors.successSoft, fg: colors.success },
            warning: { bg: colors.warningSoft, fg: colors.warning },
            danger: { bg: colors.dangerSoft, fg: colors.danger },
            info: { bg: colors.infoSoft, fg: colors.info },
          } as const;
          const t = toneMap[status.tone];
          return (
            <View key={c.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.subject}>{c.subject}</Text>
                  <Text style={s.grade}>{c.grade}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: t.bg }]}>
                  <View style={[s.statusDot, { backgroundColor: t.fg }]} />
                  <Text style={[s.statusText, { color: t.fg }]}>
                    {status.label}
                  </Text>
                </View>
              </View>
              {!full ? (
                <Text style={s.spotsHint}>
                  {c.availableSpots} de {c.totalSpots} cupos disponibles
                </Text>
              ) : null}

              <View style={s.teacherRow}>
                <Avatar name={c.teacherName} uri={c.teacherAvatar} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.caption}>Profesor</Text>
                  <Text style={typography.bodyStrong}>{c.teacherName}</Text>
                </View>
              </View>

              <InfoLine icon="calendar-outline" label="Horario" value={c.schedule} />
              <InfoLine icon="play-outline" label="Inicio" value={c.startDate} />
              <InfoLine icon="pricetag-outline" label="Plan" value={c.planName} />

              <View style={s.priceRow}>
                <Text style={s.priceLabel}>Precio</Text>
                <Text style={s.price}>${c.price}</Text>
              </View>

              <View style={s.noteRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={12}
                  color={colors.textMuted}
                />
                <Text style={s.noteRowText}>
                  Las clases grupales no son cancelables ni reembolsables.
                </Text>
              </View>

              <Pressable
                onPress={() => enroll(c.subject)}
                disabled={full}
                style={({ pressed }) => [
                  s.enrollBtn,
                  full && { opacity: 0.5 },
                  pressed && !full && { opacity: 0.9 },
                ]}
              >
                <Text style={s.enrollText}>
                  {full ? 'Sin cupos disponibles' : 'Inscribirme'}
                </Text>
                {!full ? (
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnPrimary} />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={s.infoLine}>
      <View style={s.infoIcon}>
        <Ionicons name={icon as any} size={14} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.caption}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  bannerText: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  subject: { ...typography.h3 },
  grade: { ...typography.caption, marginTop: 2 },
  spotsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  spotsBadgeFull: { backgroundColor: colors.danger },
  spotsText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
  },
  spotsHint: {
    ...typography.caption,
    marginTop: 6,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoValue: { ...typography.bodyStrong, fontSize: 14 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceLabel: { ...typography.caption },
  price: { fontSize: 26, fontWeight: '700', color: colors.text },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  noteRowText: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  enrollText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
});
