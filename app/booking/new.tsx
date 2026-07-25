import React, { useEffect, useState, useMemo } from 'react';
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
  SUBJECT_META,
  currentStudent,
  linkedStudents,
} from '@/services/mockData';
import {
  getSubjects,
  hydrateSubjects,
  getSubjectsVersion,
} from '@/services/subjectsService';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { useAuth } from '@/hooks/useAuth';
import { KnowCard } from '@/components/ui';
import { INDIVIDUAL_BOOKING_HINTS } from '@/constants/contextualPolicies';

// ============================================================================
// Reserva · Paso 1 de 3: elegir materia.
//
// Al elegir la materia se auto-asigna el mejor profesor disponible y se
// navega directo al horario. Con esto reducimos el flujo a 3 pasos reales
// (materia → fecha/hora → resumen) y eliminamos pantallas intermedias.
// El estudiante siempre puede cambiar de profesor desde el horario si lo
// necesita.
// ============================================================================

export default function BookingNew() {
  const router = useRouter();
  const { user } = useAuth();
  const { setStudent, setSubject, setTeacher, reset } = useDraftBooking();

  const role = (user as any)?.role ?? 'student';
  const isGuardian = role === 'guardian';

  const [activeStudentId, setActiveStudentId] = useState<string>(
    isGuardian ? linkedStudents[0].id : currentStudent.id,
  );
  const [subjectsTick, setSubjectsTick] = useState<number>(getSubjectsVersion());

  // Hidratar catálogo de materias desde Cloud al montar (módulo #2 migrado)
  useEffect(() => {
    let alive = true;
    hydrateSubjects().then(() => {
      if (alive) setSubjectsTick(getSubjectsVersion());
    });
    return () => {
      alive = false;
    };
  }, []);

  const subjectsList = useMemo(() => getSubjects(), [subjectsTick]);

  useEffect(() => {
    reset();
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

  // Materia → auto-asignación → horario. Un solo flujo.
  const pickSubject = (subj: string) => {
    setSubject(subj);
    setTeacher('any', 'Auto-asignación', '');
    router.push('/booking/schedule' as any);
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
          <Text style={s.stepText}>Paso 1 de 3</Text>
          <Text style={s.title}>Elige la materia</Text>
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
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.dot, i === 0 && s.dotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {isGuardian ? (
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

        <KnowCard
          rules={INDIVIDUAL_BOOKING_HINTS}
          style={{ marginBottom: spacing.md }}
        />

        <View style={s.subjectsGrid}>
          {subjectsList.map((subj) => {
            const meta = SUBJECT_META[subj] ?? { icon: 'book-outline', desc: '' };
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
});
