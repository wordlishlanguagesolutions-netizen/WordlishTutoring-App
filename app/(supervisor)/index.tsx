import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import {
  Screen,
  Header,
  Card,
  StatCard,
  Avatar,
  ZoomButton,
  SupportRow,
} from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { liveClasses, supervisorStats } from '@/services/mockData';
import { getScreenshotStatus } from '@/constants/policies';

type Filter = 'all' | 'live' | 'alerts';

type DisplayKey =
  | 'ok'
  | 'waiting_screenshot'
  | 'no_screenshot'
  | 'no_camera'
  | 'teacher_late'
  | 'technical';

interface DisplayStatus {
  key: DisplayKey;
  label: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
  critical: boolean;
  icon: string;
}

// Determina el estado visible de cada clase en vivo:
// 1) Estados críticos declarados (teacher_late, no_camera, technical) tienen prioridad.
// 2) Luego se evalúa la evidencia de ingreso con getScreenshotStatus:
//    - Antes de POLICIES.screenshotGraceMin minutos: informativo (Esperando).
//    - A partir de ese minuto: incidencia crítica (Screenshot faltante).
function computeDisplayStatus(c: {
  status: string;
  minutesElapsed: number;
  hasScreenshot: boolean;
}): DisplayStatus {
  if (c.status === 'teacher_late') {
    return {
      key: 'teacher_late',
      label: 'Profesor tarde',
      tone: 'danger',
      critical: true,
      icon: 'time-outline',
    };
  }
  if (c.status === 'no_camera') {
    return {
      key: 'no_camera',
      label: 'Sin cámara',
      tone: 'warning',
      critical: true,
      icon: 'videocam-off',
    };
  }
  if (c.status === 'technical') {
    return {
      key: 'technical',
      label: 'Problema técnico',
      tone: 'danger',
      critical: true,
      icon: 'alert-circle',
    };
  }
  const ss = getScreenshotStatus(c.minutesElapsed, c.hasScreenshot);
  if (ss.key === 'waiting') {
    return {
      key: 'waiting_screenshot',
      label: ss.label,
      tone: 'info',
      critical: false,
      icon: 'hourglass-outline',
    };
  }
  if (ss.key === 'missing') {
    return {
      key: 'no_screenshot',
      label: ss.label,
      tone: 'danger',
      critical: true,
      icon: 'camera-outline',
    };
  }
  return {
    key: 'ok',
    label: 'En curso',
    tone: 'success',
    critical: false,
    icon: 'checkmark-circle',
  };
}

const TONE_MAP: Record<
  'success' | 'info' | 'warning' | 'danger',
  { bg: string; fg: string }
> = {
  success: { bg: colors.successSoft, fg: colors.success },
  info: { bg: colors.infoSoft, fg: colors.info },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export default function SupervisorMonitor() {
  const [filter, setFilter] = useState<Filter>('all');

  const enriched = useMemo(
    () =>
      liveClasses.map((c) => ({
        ...c,
        display: computeDisplayStatus(c),
      })),
    [],
  );

  const alertsCount = enriched.filter((c) => c.display.critical).length;

  const filtered = useMemo(() => {
    if (filter === 'live') return enriched.filter((c) => !c.display.critical);
    if (filter === 'alerts') return enriched.filter((c) => c.display.critical);
    return enriched;
  }, [filter, enriched]);

  return (
    <Screen>
      <Header title="Monitor" subtitle="Clases en vivo" />

      {/* Stats grid */}
      <View style={styles.gridRow}>
        <StatCard
          label="Programadas"
          value={supervisorStats.scheduled}
          icon="calendar"
          tone="primary"
        />
        <StatCard
          label="En curso"
          value={supervisorStats.inProgress}
          icon="play-circle"
          tone="success"
        />
      </View>
      <View style={[styles.gridRow, { marginTop: spacing.md }]}>
        <StatCard
          label="Profes online"
          value={supervisorStats.teachersConnected}
          icon="school"
          tone="info"
        />
        <StatCard
          label="Alertas"
          value={alertsCount}
          icon="warning"
          tone="danger"
        />
      </View>

      {/* Filtros */}
      <Text style={styles.section}>Filtros</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <FilterChip
          label={`Todas (${enriched.length})`}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterChip
          label={`En vivo (${enriched.filter((c) => !c.display.critical).length})`}
          active={filter === 'live'}
          onPress={() => setFilter('live')}
        />
        <FilterChip
          label={`Alertas (${alertsCount})`}
          active={filter === 'alerts'}
          onPress={() => setFilter('alerts')}
        />
      </ScrollView>

      <Text style={styles.section}>Clases ({filtered.length})</Text>
      <View style={{ gap: spacing.md }}>
        {filtered.map((c) => {
          const t = TONE_MAP[c.display.tone];
          const isCritical = c.display.critical;
          return (
            <Card key={c.id}>
              <View style={styles.classHeader}>
                <Avatar name={c.teacher} uri={c.teacherAvatar} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.bodyStrong}>{c.teacher}</Text>
                  <Text style={typography.caption}>
                    {c.student} · {c.subject}
                  </Text>
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{c.time}</Text>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <View
                  style={[styles.statusBadge, { backgroundColor: t.bg }]}
                >
                  <Ionicons
                    name={c.display.icon as any}
                    size={12}
                    color={t.fg}
                  />
                  <Text style={[styles.statusText, { color: t.fg }]}>
                    {c.display.label}
                  </Text>
                </View>
                <View style={styles.elapsed}>
                  <Ionicons
                    name="stopwatch-outline"
                    size={12}
                    color={colors.textMuted}
                  />
                  <Text style={styles.elapsedText}>{c.minutesElapsed} min</Text>
                </View>
                <View style={styles.presence}>
                  <PresenceDot label="Prof" online={c.teacherOnline} />
                  <PresenceDot label="Est" online={c.studentOnline} />
                </View>
              </View>

              {isCritical ? (
                <View style={styles.incidentBox}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.incidentText}>
                    {c.display.label} · {c.minutesElapsed} min transcurridos
                  </Text>
                </View>
              ) : null}

              <View style={{ marginTop: spacing.md }}>
                {isCritical ? (
                  <ZoomButton
                    label="Entrar a la clase"
                    onPress={() =>
                      Alert.alert(
                        'Entrar a la clase',
                        `Entrando a la clase de ${c.teacher}.`,
                      )
                    }
                  />
                ) : (
                  <ZoomButton
                    variant="secondary"
                    label="Supervisar en Zoom"
                    onPress={() =>
                      Alert.alert(
                        'Supervisar',
                        `Entrando a supervisar la clase de ${c.teacher}.`,
                      )
                    }
                  />
                )}
              </View>
            </Card>
          );
        })}
      </View>

      <Text style={styles.section}>Soporte</Text>
      <SupportRow role="supervisor" screen="Monitor" />
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text
        style={[
          styles.filterChipText,
          active && { color: colors.textOnPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PresenceDot({ label, online }: { label: string; online: boolean }) {
  return (
    <View style={styles.presenceItem}>
      <View
        style={[
          styles.dot,
          { backgroundColor: online ? colors.success : colors.textMuted },
        ]}
      />
      <Text style={styles.presenceText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gridRow: { flexDirection: 'row', gap: spacing.md },
  section: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: { fontWeight: '600', fontSize: 13, color: colors.textSubtle },
  classHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeBox: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  timeText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { fontWeight: '700', fontSize: 11 },
  elapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  elapsedText: { color: colors.textSubtle, fontSize: 11, fontWeight: '700' },
  presence: { flexDirection: 'row', gap: spacing.md, marginLeft: 'auto' },
  presenceItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  presenceText: { fontSize: 11, color: colors.textSubtle, fontWeight: '600' },
  incidentBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  incidentText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
