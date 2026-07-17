import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Header, Avatar, WebTwoColumn } from '@/components/ui';
import { BookingCard } from '@/components/booking';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { useBookings } from '@/hooks/useBookings';
import { linkedStudents } from '@/services/mockData';

// ============================================================================
// Reservas del acudiente · Fase 3.
// Desktop: dos columnas · izquierda acción + estudiantes vinculados,
// derecha próximas clases (tabla compacta) + historial.
// Móvil/tablet: layout apilado original.
// ============================================================================

export default function GuardianBookHub() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { bookings } = useBookings();
  const linkedIds = new Set(linkedStudents.map((s) => s.id));
  const today = new Date().toISOString().split('T')[0];
  const all = bookings.filter((b) => linkedIds.has(b.studentId));
  const upcoming = all
    .filter((b) => b.date >= today && !['cancelled', 'completed'].includes(b.status))
    .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
    .slice(0, 6);

  const HeroBlock = (
    <View style={{ gap: spacing.md }}>
      <Pressable
        onPress={() => router.push('/booking/type' as any)}
        style={({ pressed }) => [styles.hero, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.heroIcon}>
          <Ionicons name="add-circle" size={26} color={colors.textOnPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Reservar clase</Text>
          <Text style={styles.heroSubtitle}>Individual o curso grupal</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.textOnPrimary} />
      </Pressable>

      {isDesktop ? (
        <View style={styles.studentsPanel}>
          <Text style={styles.studentsTitle}>Tus estudiantes</Text>
          <View style={{ gap: 6 }}>
            {linkedStudents.map((st) => (
              <View key={st.id} style={styles.studentRow}>
                <Avatar name={st.name} uri={st.avatar} size={26} />
                <Text style={styles.studentRowText}>{st.firstName}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
        >
          {linkedStudents.map((st) => (
            <View key={st.id} style={styles.studentChip}>
              <Avatar name={st.name} uri={st.avatar} size={22} />
              <Text style={styles.studentChipText}>{st.firstName}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const UpcomingBlock = (
    <View>
      <View style={styles.sectionRow}>
        <Text style={typography.h3}>Próximas clases</Text>
      </View>
      {upcoming.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={26} color={colors.textMuted} />
          <Text style={typography.caption}>Sin clases próximas</Text>
        </View>
      ) : isDesktop ? (
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thCell, { flex: 1.6 }]}>Estudiante</Text>
            <Text style={[styles.thCell, { flex: 2 }]}>Materia</Text>
            <Text style={[styles.thCell, { flex: 1.4 }]}>Fecha</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Hora</Text>
            <Text style={[styles.thCell, { flex: 0.8, textAlign: 'right' }]}> </Text>
          </View>
          {upcoming.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/booking/${b.id}` as any)}
              style={({ pressed }) => [styles.tableRow, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={[styles.tdCell, { flex: 1.6, fontWeight: '600' }]} numberOfLines={1}>{b.studentName}</Text>
              <Text style={[styles.tdCell, { flex: 2 }]} numberOfLines={1}>{b.subject}</Text>
              <Text style={[styles.tdCell, { flex: 1.4, color: colors.textSubtle }]}>{b.date}</Text>
              <Text style={[styles.tdCell, { flex: 1 }]}>{b.time}</Text>
              <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                <View style={styles.detailBtn}>
                  <Text style={styles.detailBtnText}>Ver</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.primaryDark} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {upcoming.map((b) => (
            <BookingCard key={b.id} booking={b} showStudent compact />
          ))}
        </View>
      )}
      <Pressable
        onPress={() => router.push('/booking/mine' as any)}
        style={({ pressed }) => [styles.historyLink, pressed && { opacity: 0.7 }]}
        hitSlop={8}
      >
        <Text style={styles.historyLinkText}>Ver historial</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
      </Pressable>
    </View>
  );

  return (
    <Screen>
      <Header title="Reservas" subtitle="Clases de tus estudiantes" />

      {isDesktop ? (
        <WebTwoColumn
          leftFlex={4}
          rightFlex={8}
          left={HeroBlock}
          right={UpcomingBlock}
        />
      ) : (
        <>
          {HeroBlock}
          <View style={{ height: spacing.md }} />
          {UpcomingBlock}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: radius.lg, ...shadow.sm,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { color: colors.textOnPrimary, fontSize: 17, fontWeight: '700' },
  heroSubtitle: { color: colors.primarySoft, fontSize: 12, marginTop: 2, fontWeight: '500' },
  studentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  studentChipText: { color: colors.textSubtle, fontWeight: '600', fontSize: 12 },
  studentsPanel: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  studentsTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingVertical: 4,
  },
  studentRowText: { fontSize: 13, color: colors.text, fontWeight: '600' },

  sectionRow: { marginBottom: spacing.md },
  empty: {
    alignItems: 'center', gap: spacing.sm, padding: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  historyLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: spacing.lg, paddingVertical: spacing.md,
  },
  historyLinkText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },

  table: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  thCell: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  tdCell: { fontSize: 13, color: colors.text, paddingHorizontal: 4 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailBtnText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
});
