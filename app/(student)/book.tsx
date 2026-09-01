import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Header, WebTwoColumn } from '@/components/ui';
import { BookingCard } from '@/components/booking';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { useBookings } from '@/hooks/useBookings';
import { currentStudent } from '@/services/mockData';

// ============================================================================
// Reservas del estudiante · Fase 3.
// Desktop: dos columnas · izquierda "Reservar clase", derecha próximas
// clases (tabla compacta) + historial.
// Móvil/tablet: layout apilado original.
// ============================================================================

export default function StudentBookHub() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { getForStudent } = useBookings();
  const today = new Date().toISOString().split('T')[0];
  const all = getForStudent(currentStudent.id);
  const upcoming = all
    .filter((b) => b.date >= today && !['cancelled', 'completed'].includes(b.status))
    .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
    .slice(0, 6);

  const HeroBlock = (
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
        // Tabla compacta desktop
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thCell, { flex: 2 }]}>Materia</Text>
            <Text style={[styles.thCell, { flex: 2 }]}>Profesor</Text>
            <Text style={[styles.thCell, { flex: 1.4 }]}>Fecha</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Hora</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}> </Text>
          </View>
          {upcoming.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/booking/${b.id}` as any)}
              style={({ pressed }) => [styles.tableRow, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={[styles.tdCell, { flex: 2, fontWeight: '700' }]} numberOfLines={1}>{b.subject}</Text>
              <Text style={[styles.tdCell, { flex: 2, color: colors.textSubtle }]} numberOfLines={1}>{b.teacherName}</Text>
              <Text style={[styles.tdCell, { flex: 1.4 }]}>{b.date}</Text>
              <Text style={[styles.tdCell, { flex: 1 }]}>{b.time}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
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
            <BookingCard key={b.id} booking={b} compact />
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
      <Header title="Reservas" subtitle="Tus clases individuales y grupales" />

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

  // Tabla desktop
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
