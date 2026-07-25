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
import { colors, spacing, radius } from '@/constants/theme';
import { Avatar } from '@/components/ui';
import {
  SUBJECTS_CATALOG,
  SUBJECT_META,
  currentStudent,
  linkedStudents,
} from '@/services/mockData';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { useAuth } from '@/hooks/useAuth';
import { KnowCard } from '@/components/ui';
import { INDIVIDUAL_BOOKING_HINTS } from '@/constants/contextualPolicies';

// ============================================================================
// Reserva · flujo minimalista de dos pasos internos:
//   subject  -> materia base (8 opciones estrictas)
//   assign   -> autoasignación (principal) o profesor específico (secundaria)
//
// El paso de "nivel" fue eliminado: pasamos directo a la programación del
// docente. La materia se guarda tal cual, sin sufijo de nivel. La lógica de
// getTeachersForSubject y pickBestTeacher siguen funcionando porque ya
// extraían la parte base antes.
// ============================================================================

type Step = 'subject' | 'assign';

export default function BookingNew() {
  const router = useRouter();
  const { user } = useAuth();
  const { setStudent, setSubject, setTeacher, reset } = useDraftBooking();

  const role = (user as any)?.role ?? 'student';
  const isGuardian = role === 'guardian';

  const [step, setStep] = useState<Step>('subject');
  const [subject, setPickedSubject] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string>(
    isGuardian ? linkedStudents[0].id : currentStudent.id,
  );

  useEffect(() => {
    reset();
    setStep('subject');
    setPickedSubject(null);
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

  // Directo a la asignación: sin selección de nivel.
  const pickSubject = (subj: string) => {
    setPickedSubject(subj);
    setStep('assign');
  };

  const proceedAuto = () => {
    setSubject(subject!);
    setTeacher('any', 'Auto-asignación', '');
    router.push('/booking/schedule' as any);
  };

  const proceedSpecific = () => {
    setSubject(subject!);
    router.push('/booking/teacher' as any);
  };

  const back = () => {
    if (step === 'assign') {
      setStep('subject');
      setPickedSubject(null);
    } else {
      router.back();
    }
  };

  const stepIndex = step === 'assign' ? 2 : 1;
  const stepTitle =
    step === 'subject' ? 'Elige la materia' : '¿Quién te va a enseñar?';

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
            {/* Políticas de tutoría individual visibles sólo al iniciar. */}
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

        {step === 'assign' && subject && (
          <>
            <View style={s.contextRow}>
              <Ionicons name="bookmark" size={12} color={colors.primaryDark} />
              <Text style={s.contextText}>{subject}</Text>
            </View>

            <Pressable
              onPress={proceedAuto}
              style={({ pressed }) => [s.autoCard, pressed && { opacity: 0.92 }]}
            >
              <View style={s.autoIcon}>
                <Ionicons name="sparkles" size={20} color={colors.textOnPrimary} />
              </View>
              <Text style={s.autoTitle}>
                Wordlish elegirá el mejor profesor disponible para ti.
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textOnPrimary}
              />
            </Pressable>

            <Pressable onPress={proceedSpecific} hitSlop={8} style={s.altLink}>
              <Text style={s.altLinkText}>
                Prefiero elegir un profesor específico
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
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
