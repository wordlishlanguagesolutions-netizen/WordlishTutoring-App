import React, { useEffect, useMemo, useState } from 'react';
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
import { colors, spacing, typography, radius } from '@/constants/theme';
import { Avatar } from '@/components/ui';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { getTeachersForSubject } from '@/services/bookingService';
import { currentStudent, linkedStudents } from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { TEACHER_TIERS, type TeacherTier } from '@/constants/policies';

// ============================================================================
// Reserva · flujo secundario cuando el usuario elige "profesor espec\u00edfico".
// Layout minimalista: dos pesta\u00f1as (Essentials / Specials) con la lista
// de profesores compatibles con la materia + nivel + plan del estudiante.
// Cada profesor pertenece obligatoriamente a un tier. La disponibilidad
// horaria se resuelve en el paso siguiente (/booking/schedule).
// ============================================================================

export default function BookingTeacher() {
  const router = useRouter();
  const { user } = useAuth();
  const { draft, setTeacher, setStudent } = useDraftBooking();
  const [tab, setTab] = useState<TeacherTier>('essentials');

  const role = (user as any)?.role ?? 'student';
  const isGuardian = role === 'guardian';

  useEffect(() => {
    if (!draft.studentId) {
      if (isGuardian) {
        const s = linkedStudents[0];
        setStudent(s.id, s.name, s.avatar);
      } else {
        setStudent(
          currentStudent.id,
          currentStudent.name,
          currentStudent.avatar,
        );
      }
    }
  }, [draft.studentId]);

  const studentPlanTier = useMemo<TeacherTier>(() => {
    if (isGuardian && draft.studentId) {
      return (
        (linkedStudents.find((s) => s.id === draft.studentId)
          ?.planTier as TeacherTier) ?? 'essentials'
      );
    }
    return currentStudent.planTier;
  }, [isGuardian, draft.studentId]);

  const teachers = useMemo(
    () =>
      draft.subject ? getTeachersForSubject(draft.subject, studentPlanTier) : [],
    [draft.subject, studentPlanTier],
  );

  const essentials = teachers.filter((t) => t.tier === 'essentials');
  const specials = teachers.filter((t) => t.tier === 'special');

  const availableTiers: TeacherTier[] = [];
  if (essentials.length > 0) availableTiers.push('essentials');
  if (specials.length > 0) availableTiers.push('special');

  useEffect(() => {
    if (availableTiers.length > 0 && !availableTiers.includes(tab)) {
      setTab(availableTiers[0]);
    }
  }, [availableTiers.join(','), tab]);

  const visible = tab === 'essentials' ? essentials : specials;

  const pick = (id: string, name: string, avatar: string) => {
    setTeacher(id, name, avatar);
    router.push('/booking/schedule' as any);
  };

  const showTierInfo = (tier: TeacherTier) => {
    const info = TEACHER_TIERS[tier];
    Alert.alert(`${info.stars} ${info.label}`, info.description);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.stepText}>Paso 3 de 4</Text>
          <Text style={s.title}>Elige tu profesor</Text>
        </View>
      </View>

      {draft.subject ? (
        <View style={s.contextRow}>
          <Ionicons name="bookmark" size={12} color={colors.primaryDark} />
          <Text style={s.contextText}>{draft.subject}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={s.scroll}>
        {!draft.subject ? (
          <View style={s.emptyBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textMuted}
            />
            <Text style={typography.caption}>
              Vuelve para elegir materia y nivel.
            </Text>
          </View>
        ) : availableTiers.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textMuted}
            />
            <Text style={typography.caption}>
              No hay profesores compatibles con esta selecci\u00f3n.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.tabs}>
              {availableTiers.map((tier) => {
                const info = TEACHER_TIERS[tier];
                const on = tab === tier;
                const count =
                  tier === 'essentials' ? essentials.length : specials.length;
                return (
                  <Pressable
                    key={tier}
                    onPress={() => setTab(tier)}
                    style={[s.tab, on && s.tabOn]}
                  >
                    <Text
                      style={[
                        s.tabText,
                        on && { color: colors.textOnPrimary },
                      ]}
                    >
                      {info.stars} {info.label}
                    </Text>
                    <Text
                      style={[
                        s.tabCount,
                        on && { color: colors.primarySoft },
                      ]}
                    >
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => showTierInfo(tab)}
              hitSlop={6}
              style={s.tierHint}
            >
              <Ionicons
                name="information-circle-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text style={s.tierHintText}>
                {TEACHER_TIERS[tab].description}
              </Text>
            </Pressable>

            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {visible.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => pick(t.id, t.name, t.avatar)}
                  style={({ pressed }) => [
                    s.teacherRow,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Avatar name={t.name} uri={t.avatar} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.teacherName}>{t.name}</Text>
                    <Text style={s.teacherMeta} numberOfLines={1}>
                      {t.subjects.join(' \u00b7 ')}
                      {t.levels && t.levels.length > 0
                        ? ` \u00b7 ${t.levels.join(', ')}`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Pressable
          onPress={() => router.back()}
          style={s.backLink}
          hitSlop={10}
        >
          <Text style={s.backLinkText}>
            Prefiero que Wordlish elija por m\u00ed
          </Text>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 2 },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  contextText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSubtle, fontWeight: '700', fontSize: 13 },
  tabCount: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 11,
  },
  tierHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  tierHintText: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  teacherMeta: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  backLinkText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
