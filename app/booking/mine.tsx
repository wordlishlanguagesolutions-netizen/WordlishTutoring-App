import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { BookingCard } from '@/components/booking';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { currentStudent, linkedStudents, Booking } from '@/services/mockData';

type Filter = 'upcoming' | 'past';

export default function BookingMine() {
  const router = useRouter();
  const { bookings } = useBookings();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('upcoming');

  const role = (user as any)?.role ?? 'student';
  const isGuardian = role === 'guardian';
  const showStudent = isGuardian;

  const mine = useMemo(() => {
    if (isGuardian) {
      const ids = new Set(linkedStudents.map((s) => s.id));
      return bookings.filter((b) => ids.has(b.studentId));
    }
    return bookings.filter((b) => b.studentId === currentStudent.id);
  }, [bookings, isGuardian]);

  const filtered = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    const list: Booking[] =
      filter === 'upcoming'
        ? mine.filter(
            (b) =>
              b.date >= now && !['cancelled', 'completed'].includes(b.status),
          )
        : mine.filter(
            (b) => b.date < now || ['completed', 'cancelled'].includes(b.status),
          );
    return [...list].sort((a, b) => (a.date + a.time > b.date + b.time ? -1 : 1));
  }, [mine, filter]);

  const counts = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return {
      upcoming: mine.filter((b) => b.date >= now && !['cancelled', 'completed'].includes(b.status)).length,
      past: mine.filter((b) => b.date < now || ['completed', 'cancelled'].includes(b.status)).length,
    };
  }, [mine]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.h2}>Mis reservas</Text>
        </View>
        <Pressable onPress={() => router.push('/booking/type' as any)} hitSlop={10} style={s.addBtn}>
          <Ionicons name="add" size={22} color={colors.textOnPrimary} />
        </Pressable>
      </View>

      <View style={s.tabsRow}>
        <FilterChip label={`Próximas (${counts.upcoming})`} on={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
        <FilterChip label={`Historial (${counts.past})`} on={filter === 'past'} onPress={() => setFilter('past')} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {filtered.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={typography.bodyStrong}>Nada por aquí</Text>
            <Text style={typography.caption}>
              {filter === 'upcoming' ? 'Reserva tu próxima clase' : 'Sin reservas en este filtro'}
            </Text>
            {filter === 'upcoming' && (
              <Pressable onPress={() => router.push('/booking/type' as any)} style={s.emptyBtn}>
                <Ionicons name="add" size={18} color={colors.textOnPrimary} />
                <Text style={s.emptyBtnText}>Reservar clase</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filtered.map((b) => (
              <BookingCard key={b.id} booking={b} showStudent={showStudent} compact />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && { color: colors.textOnPrimary }]}>{label}</Text>
    </Pressable>
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
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  chip: {
    flex: 1, paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', fontSize: 12, color: colors.textSubtle },

  emptyCard: {
    alignItems: 'center', gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md, marginTop: spacing.md,
  },
  emptyBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
});
