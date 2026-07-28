import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { useBookings } from '@/hooks/useBookings';
import {
  generateNextDays,
  getTeacherAvailableSlots,
  getAvailableSlotsForSubject,
  pickBestTeacher,
} from '@/services/bookingService';
import {
  dateUtils,
  TEACHERS_FULL,
  currentStudent,
  linkedStudents,
} from '@/services/mockData';
import type { TeacherTier } from '@/constants/policies';

export default function BookingSchedule() {
  const router = useRouter();
  const { draft, setTeacher, setSchedule, setHoldId } = useDraftBooking();
  const { bookings, holds, createHold, releaseHold } = useBookings();

  const [date, setDate] = useState<string>(draft.date || dateUtils.todayISO());

  useEffect(() => {
    if (!draft.subject || !draft.teacherId) {
      router.replace('/booking/new' as any);
    }
  }, [draft.subject, draft.teacherId]);

  const isAuto = draft.teacherId === 'any';

  // Plan tier del estudiante activo: filtra profesores compatibles al
  // auto-asignar y al listar horarios disponibles.
  const planTier = useMemo<TeacherTier>(() => {
    if (draft.studentId === currentStudent.id) return currentStudent.planTier;
    const linked = linkedStudents.find((s) => s.id === draft.studentId);
    return (linked?.planTier as TeacherTier) ?? 'essentials';
  }, [draft.studentId]);

  // Slots simplificados: solo hora. Sin exponer profesor cuando es auto.
  const slots = useMemo<{ time: string }[]>(() => {
    if (!draft.subject) return [];
    const now = Date.now();
    if (isAuto) {
      return getAvailableSlotsForSubject(
        draft.subject,
        date,
        bookings,
        holds,
        now,
        planTier,
      );
    }
    if (!draft.teacherId) return [];
    return getTeacherAvailableSlots(draft.teacherId, date, bookings, holds, now).map(
      (time) => ({ time }),
    );
  }, [date, draft.teacherId, draft.subject, bookings, holds, isAuto, planTier]);

  const days = generateNextDays(14);

  const handlePick = (slot: { time: string }) => {
    if (draft.holdId) releaseHold(draft.holdId);

    let teacherId = draft.teacherId;
    let teacherName = draft.teacherName;
    let teacherAvatar = draft.teacherAvatar;

    if (isAuto) {
      const best = pickBestTeacher(
        draft.subject,
        draft.studentId,
        date,
        slot.time,
        bookings,
        holds,
        Date.now(),
        planTier,
      );
      if (!best) return;
      teacherId = best.id;
      teacherName = best.name;
      teacherAvatar = best.avatar;
    } else {
      const t = TEACHERS_FULL.find((x) => x.id === draft.teacherId);
      if (t) {
        teacherName = t.name;
        teacherAvatar = t.avatar;
      }
    }

    const hold = createHold(teacherId, date, slot.time);
    setHoldId(hold.id);
    setTeacher(teacherId, teacherName, teacherAvatar);
    setSchedule(date, slot.time);
    router.push('/booking/summary' as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Paso 2 de 4</Text>
          <Text style={typography.h2}>Fecha y hora</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <StepDots current={1} />

        <View style={s.contextRow}>
          <View style={s.pill}>
            <Ionicons name="book-outline" size={13} color={colors.primaryDark} />
            <Text style={s.pillText}>{draft.subject}</Text>
          </View>
          {!isAuto && draft.teacherName ? (
            <View style={s.pill}>
              <Ionicons name="person-outline" size={13} color={colors.primaryDark} />
              <Text style={s.pillText}>{draft.teacherName.replace('Prof. ', '')}</Text>
            </View>
          ) : null}
        </View>

        {isAuto ? (
          <View style={s.autoHint}>
            <Ionicons name="sparkles" size={14} color={colors.primaryDark} />
            <Text style={s.autoHintText}>
              Wordlish asignará el mejor profesor disponible.
            </Text>
            <Pressable
              onPress={() => router.push('/booking/teacher' as any)}
              hitSlop={8}
            >
              <Text style={s.autoHintLink}>Cambiar</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={s.section}>Fecha</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
        >
          {days.map((d) => {
            const on = d === date;
            return (
              <Pressable
                key={d}
                onPress={() => setDate(d)}
                style={[s.dateChip, on && s.dateChipOn]}
              >
                <Text style={[s.dateText, on && { color: colors.textOnPrimary }]}>
                  {dateUtils.formatDisplay(d)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={s.section}>Horarios disponibles ({slots.length})</Text>

        {slots.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={28} color={colors.textMuted} />
            <Text style={typography.bodyStrong}>Sin horarios en esta fecha</Text>
            <Text style={typography.caption}>Prueba otro día</Text>
          </View>
        ) : (
          <View style={s.slotsGrid}>
            {slots.map((slot) => (
              <Pressable
                key={slot.time}
                onPress={() => handlePick(slot)}
                style={({ pressed }) => [s.slotCard, pressed && { opacity: 0.85 }]}
              >
                <Text style={s.slotTime}>{slot.time}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.infoBox}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.primaryDark} />
          <Text style={s.infoText}>
            El horario se bloquea por 5 minutos mientras completas la reserva.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { ...typography.h3, marginTop: spacing.lg, marginBottom: spacing.md },

  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryDark },

  contextRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pillText: { color: colors.primaryDark, fontWeight: '600', fontSize: 12 },

  autoHint: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primarySoft, padding: spacing.md,
    borderRadius: radius.md, marginTop: spacing.md,
  },
  autoHintText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600', flex: 1 },
  autoHintLink: { color: colors.primaryDark, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },

  dateChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  dateChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateText: { fontWeight: '600', fontSize: 13, color: colors.textSubtle },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotCard: {
    width: '31%',
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
    ...shadow.sm,
  },
  slotTime: { fontWeight: '700', fontSize: 16, color: colors.primaryDark },

  emptyCard: {
    alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, padding: spacing.xl,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primarySoft, padding: spacing.md,
    borderRadius: radius.md, marginTop: spacing.lg,
  },
  infoText: { color: colors.primaryDark, fontSize: 12, flex: 1, fontWeight: '600' },
});
