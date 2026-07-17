import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Card, Avatar, StatusBadge, SupportRow } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { currentTeacher } from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { GrowthCard } from '@/components/teacher/GrowthCard';
import { TeacherHint } from '@/components/teacher/TeacherHint';
import { GROWTH_PROGRAM } from '@/constants/teacherCulture';

export default function TeacherProfile() {
  const router = useRouter();
  const { logout } = useAuth();
  const s = currentTeacher.stats;
  const level = GROWTH_PROGRAM.essential;

  return (
    <Screen>
      <View style={styles.headerBar}>
        <Text style={typography.h1}>Perfil</Text>
        <Pressable onPress={logout} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>

      <TeacherHint hint="profile" icon="heart-outline" />

      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.lg }}>
        <Avatar name={currentTeacher.name} uri={currentTeacher.avatar} size={96} />
        <Text style={[typography.h2, { marginTop: spacing.md }]}>{currentTeacher.name}</Text>
        <Text style={typography.caption}>{currentTeacher.phone}</Text>
        <View style={styles.levelPill}>
          <Ionicons name="star" size={12} color={colors.primaryDark} />
          <Text style={styles.levelPillText}>Nivel {level.name}</Text>
        </View>
        <Text style={styles.levelTagline}>{level.tagline}</Text>
      </Card>

      <Text style={styles.section}>Tu crecimiento</Text>
      <View style={{ marginBottom: spacing.lg }}>
        <GrowthCard currentLevel="essential" />
      </View>

      <Text style={styles.section}>Guía del profesor</Text>
      <Pressable
        onPress={() => router.push('/teacher/standards' as any)}
        style={({ pressed }) => [styles.programRow, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.programIcon}>
          <Ionicons name="book" size={16} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.programTitle}>Guía del profesor</Text>
          <Text style={styles.programSubtitle}>
            Cultura y estándares Wordlish
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      <Text style={styles.section}>Materias</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.chips}>
          {currentTeacher.subjects.map((sub) => (
            <View key={sub} style={styles.chip}>
              <Text style={styles.chipText}>{sub}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={styles.section}>Grados</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.chips}>
          {currentTeacher.grades.map((g) => (
            <View key={g} style={[styles.chip, { backgroundColor: colors.infoSoft }]}>
              <Text style={[styles.chipText, { color: colors.info }]}>{g}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={styles.section}>Estadísticas</Text>
      <View style={styles.gridRow}>
        <StatTile icon="calendar" value={s.assigned} label="Asignadas" tone="primary" />
        <StatTile icon="checkmark-done" value={s.delivered} label="Impartidas" tone="success" />
      </View>
      <View style={[styles.gridRow, { marginTop: spacing.md }]}>
        <StatTile icon="close-circle" value={s.absences} label="Ausencias" tone="danger" />
        <StatTile icon="document-text" value={s.pendingReports} label="Reportes pendientes" tone="warning" />
      </View>

      <Card tone="primary" style={{ marginTop: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.primarySoft }]}>Pago acumulado (Julio)</Text>
        <Text style={styles.pay}>${s.accumulatedPay}</Text>
        <Text style={{ color: colors.primarySoft, fontSize: 12, marginTop: 2 }}>
          {s.delivered} clases · próximo corte 31 Jul
        </Text>
      </Card>

      <Text style={[styles.section, { marginTop: spacing.lg }]}>Soporte</Text>
      <SupportRow role="teacher" screen="Perfil" />
    </Screen>
  );
}

function StatTile({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: 'primary' | 'success' | 'danger' | 'warning' }) {
  const TONES = {
    primary: { bg: colors.primarySoft, fg: colors.primaryDark },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  };
  const t = TONES[tone];
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon as any} size={18} color={t.fg} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  section: { ...typography.h3, marginBottom: spacing.md, marginTop: spacing.md },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  levelPillText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  levelTagline: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    fontWeight: '500',
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  programIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  programSubtitle: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
    fontWeight: '500',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  chipText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start' },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  tileValue: { ...typography.h2, marginBottom: 2 },
  pay: { color: colors.textOnPrimary, fontSize: 36, fontWeight: '700', marginTop: 4 },
});
