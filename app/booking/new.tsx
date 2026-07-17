import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { Avatar } from '@/components/ui';
import {
  SUBJECTS_CATALOG,
  SUBJECT_LEVELS,
  SUBJECT_META,
  currentStudent,
  linkedStudents,
} from '@/services/mockData';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { useAuth } from '@/hooks/useAuth';
import { KnowCard } from '@/components/ui';
import { INDIVIDUAL_BOOKING_HINTS } from '@/constants/contextualPolicies';

// ============================================================================
// Reserva · flujo minimalista de tres pasos internos:
//   subject  -> materia base (8 opciones estrictas)
//   level    -> nivel/especialidad si aplica (opcional: sin nivel)
//   assign   -> autoasignaci\u00f3n (principal) o profesor espec\u00edfico (secundaria)
// El subject se guarda como "Base \u00b7 Nivel" cuando hay nivel; la l\u00f3gica de
// getTeachersForSubject y pickBestTeacher extrae la parte base.
// ============================================================================

type Step = 'subject' | 'level' | 'assign';

export default function BookingNew() {
  const router = useRouter();
  const { user } = useAuth();
  const { setStudent, setSubject, setTeacher, reset } = useDraftBooking();

  const role = (user as any)?.role ?? 'student';
  const isGuardian = role === 'guardian';

  const [step, setStep] = useState<Step>('subject');
  const [subject, setPickedSubject] = useState<string | null>(null);
  const [level, setPickedLevel] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string>(
    isGuardian ? linkedStudents[0].id : currentStudent.id,
  );

  useEffect(() => {
    reset();
    setStep('subject');
    setPickedSubject(null);
    setPickedLevel(null);
    if (isGuardian) {
      const s = linkedStudents[0];
      setStudent(s.id, s.name, s.avatar);
      setActiveStudentId(s.id);
    } else {
      setStudent(currentStudent.id, currentStudent.name, currentStudent.avatar);
      setActiveStudentId(currentStudent.id);
    }
  }, [isGuardian]);

  const pickStudent = (id: string) => {
    const s = linkedStudents.find((x) => x.id === id);
    if (!s) return;
    setStudent(s.id, s.name, s.avatar);
    setActiveStudentId(s.id);
  };

  const pickSubject = (subj: string) => {
    setPickedSubject(subj);
    setPickedLevel(null);
    const levels = SUBJECT_LEVELS[subj] ?? [];
    setStep(levels.length > 0 ? 'level' : 'assign');
  };

  // Nunca se ofrece "Sin nivel específico". Si una materia no tiene niveles
  // definidos (SUBJECT_LEVELS[subj] vacío), pickSubject salta directo a
  // 'assign' sin pasar por este paso.
  const pickLevel = (lvl: string) => {
    setPickedLevel(lvl);
    setStep('assign');
  };

  const finalSubject = () => (level ? `${subject} \u00b7 ${level}` : subject!);

  const proceedAuto = () => {
    setSubject(finalSubject());
    setTeacher('any', 'Auto-asignaci\u00f3n', '');
    router.push('/booking/schedule' as any);
  };

  const proceedSpecific = () => {
    setSubject(finalSubject());
    router.push('/booking/teacher' as any);
  };

  const back = () => {
    if (step === 'assign') {
      const levels = SUBJECT_LEVELS[subject!] ?? [];
      setStep(levels.length > 0 ? 'level' : 'subject');
      if (levels.length === 0) setPickedSubject(null);
    } else if (step === 'level') {
      setStep('subject');
      setPickedSubject(null);
      setPickedLevel(null);
    } else {
      router.back();
    }
  };

  const stepIndex = step === 'assign' ? 2 : 1;
  const stepTitle =
    step === 'subject'
      ? 'Elige la materia'
      : step === 'level'
        ? 'Elige el nivel'
        : '\u00bfQui\u00e9n te va a ense\u00f1ar?';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={back} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.stepText}>Paso {stepIndex + 1} de 4</Text>
          <Text style={s.title}>{stepTitle}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/booking/mine' as any)}
          hitSlop={10}
          style={s.iconBtn}
        >
          <Ionicons name="list" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>

      <View style={s.stepBar}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              s.dot,
              i === stepIndex + 1 && s.dotActive,
              i < stepIndex + 1 && s.dotDone,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {isGuardian && step === 'subject' ? (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={s.miniLabel}>Para</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {linkedStudents.map((st) => {
                const on = st.id === activeStudentId;
                return (
                  <Pressable
                    key={st.id}
                    onPress={() => pickStudent(st.id)}
                    style={[s.studentChip, on && s.studentChipOn]}
                  >
                    <Avatar name={st.name} uri={st.avatar} size={22} />
                    <Text
                      style={[
                        s.studentChipText,
                        on && { color: colors.textOnPrimary },
                      ]}
                    >
                      {st.firstName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {step === 'subject' && (
          <>
            {/* Ubicación automática: políticas de tutoría individual visibles
                sólo al iniciar este flujo. No aparecen en cursos grupales. */}
            <KnowCard
              rules={INDIVIDUAL_BOOKING_HINTS}
              style={{ marginBottom: spacing.md }}
            />
          <View style={s.subjectsGrid}>
            {SUBJECTS_CATALOG.map((subj) => {
              const meta =
                SUBJECT_META[subj] ?? { icon: 'book-outline', desc: '' };
              return (
                <Pressable
                  key={subj}
                  onPress={() => pickSubject(subj)}
                  style={({ pressed }) => [
                    s.subjectCard,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons
                    name={meta.icon as any}
                    size={22}
                    color={colors.primaryDark}
                  />
                  <Text style={s.subjectName}>{subj}</Text>
                </Pressable>
              );
            })}
          </View>
          </>
        )}

        {step === 'level' && subject && (
          <>
            <View style={s.contextRow}>
              <Ionicons
                name="bookmark"
                size={12}
                color={colors.primaryDark}
              />
              <Text style={s.contextText}>{subject}</Text>
            </View>
            <View style={{ gap: spacing.sm }}>
              {(SUBJECT_LEVELS[subject] ?? []).map((lvl) => (
                <Pressable
                  key={lvl}
                  onPress={() => pickLevel(lvl)}
                  style={({ pressed }) => [
                    s.rowCard,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={s.rowCardText}>{lvl}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.primaryDark}
                  />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 'assign' && subject && (
          <>
            <View style={s.contextRow}>
              <Ionicons
                name="bookmark"
                size={12}
                color={colors.primaryDark}
              />
              <Text style={s.contextText}>
                {level ? `${subject} \u00b7 ${level}` : subject}
              </Text>
            </View>

            <Pressable
              onPress={proceedAuto}
              style={({ pressed }) => [
                s.autoCard,
                pressed && { opacity: 0.92 },
              ]}
            >
              <View style={s.autoIcon}>
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={colors.textOnPrimary}
                />
              </View>
              <Text style={s.autoTitle}>
                Wordlish elegir\u00e1 el mejor profesor disponible para ti.
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textOnPrimary}
              />
            </Pressable>

            <Pressable
              onPress={proceedSpecific}
              hitSlop={8}
              style={s.altLink}
            >
              <Text style={s.altLinkText}>
                Prefiero elegir un profesor espec\u00edfico
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.primaryDark}
              />
            </Pressable>
          </>
        )}
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
  stepBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryDark },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  studentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  studentChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  studentChipText: {
    color: colors.textSubtle,
    fontWeight: '700',
    fontSize: 13,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  subjectCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
    gap: 6,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  contextText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowCardText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  rowCardMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowCardMutedText: {
    color: colors.textSubtle,
    fontWeight: '600',
    fontSize: 13,
  },
  autoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  autoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoTitle: {
    flex: 1,
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  altLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  altLinkText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '600',
  },
});
