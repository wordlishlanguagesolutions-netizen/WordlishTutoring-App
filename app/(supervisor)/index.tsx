import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import {
  Screen,
  Header,
  Card,
  StatCard,
  Avatar,
  ZoomButton,
  SupportRow,
  StatusBadge,
} from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { liveClasses, supervisorStats } from '@/services/mockData';
import { getScreenshotStatus } from '@/constants/policies';
import {
  getOpenSystemAlerts,
  hydrateSystemAlerts,
  subscribeSystemAlerts,
  resolveSystemAlert,
  type SystemAlertItem,
} from '@/services/systemAlertsService';

type Filter = 'all' | 'live' | 'alerts';

type UploadedScreenshot = { by: 'teacher' | 'supervisor'; at: number };

function fmtHm(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-PA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  // Screenshots subidos localmente (supervisor o profesor) durante la sesion.
  // Al subirse, la clase pasa a considerarse con evidencia y la alerta
  // 'Screenshot faltante' desaparece automaticamente.
  const [uploaded, setUploaded] = useState<Record<string, UploadedScreenshot>>({});

  // Alertas del sistema · public.system_alerts (Cloud real).
  // Se cargan y se suscriben para repintar cuando cambian.
  const [systemAlerts, setSystemAlerts] = useState<SystemAlertItem[]>(() =>
    getOpenSystemAlerts(),
  );
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    hydrateSystemAlerts().catch(() => undefined);
    const unsub = subscribeSystemAlerts(() => {
      if (alive) setSystemAlerts(getOpenSystemAlerts());
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const handleResolveAlert = (alert: SystemAlertItem) => {
    Alert.alert(
      'Resolver alerta',
      `${alert.type}. ¿Confirmas que ya fue atendida?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          style: 'default',
          onPress: async () => {
            setResolvingId(alert.id);
            const res = await resolveSystemAlert(alert.id);
            setResolvingId(null);
            if (!res.ok) {
              Alert.alert('No se pudo resolver', res.error ?? 'Intenta nuevamente.');
            }
          },
        },
      ],
    );
  };

  const uploadScreenshot = (
    classId: string,
    by: 'teacher' | 'supervisor',
  ) => {
    setUploaded((prev) => ({ ...prev, [classId]: { by, at: Date.now() } }));
  };

  const handleUploadPress = (
    classId: string,
    teacherName: string,
  ) => {
    const existing = uploaded[classId];
    const doUpload = () => uploadScreenshot(classId, 'supervisor');
    if (existing) {
      Alert.alert(
        'Reemplazar screenshot',
        `Ya existe una evidencia subida por ${existing.by === 'supervisor' ? 'el supervisor' : 'el profesor'} a las ${fmtHm(existing.at)}. Deseas reemplazarla?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reemplazar', style: 'destructive', onPress: doUpload },
        ],
      );
      return;
    }
    if (Platform.OS === 'web') {
      doUpload();
      return;
    }
    Alert.alert(
      'Subir screenshot',
      `Sube la evidencia de la clase de ${teacherName}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Subir', onPress: doUpload },
      ],
    );
  };

  const enriched = useMemo(
    () =>
      liveClasses.map((c) => {
        const local = uploaded[c.id];
        const effective = { ...c, hasScreenshot: c.hasScreenshot || Boolean(local) };
        return {
          ...effective,
          uploaded: local ?? (c.hasScreenshot ? { by: 'teacher' as const, at: Date.now() } : null),
          display: computeDisplayStatus(effective),
        };
      }),
    [uploaded],
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

              {c.display.key === 'no_screenshot' ? (
                <Pressable
                  onPress={() => handleUploadPress(c.id, c.teacher)}
                  style={({ pressed }) => [
                    styles.uploadBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons name="camera" size={16} color={colors.textOnPrimary} />
                  <Text style={styles.uploadBtnText}>Subir screenshot</Text>
                </Pressable>
              ) : null}

              {c.uploaded && c.display.key !== 'no_screenshot' ? (
                <View style={styles.uploadedRow}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={styles.uploadedText}>
                    Evidencia subida por {c.uploaded.by === 'supervisor' ? 'supervisor' : 'profesor'} · {fmtHm(c.uploaded.at)}
                  </Text>
                  <Pressable
                    onPress={() => handleUploadPress(c.id, c.teacher)}
                    hitSlop={8}
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.uploadedReplace}>Reemplazar</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={{ marginTop: spacing.md }}>
                <ZoomButton
                  variant={isCritical ? 'primary' : 'secondary'}
                  label="Entrar a Zoom"
                  onPress={() =>
                    Alert.alert(
                      'Entrar a Zoom',
                      `Abriendo la clase de ${c.teacher}.`,
                    )
                  }
                />
              </View>
            </Card>
          );
        })}
      </View>

      <Text style={styles.section}>Alertas del sistema ({systemAlerts.length})</Text>
      {systemAlerts.length === 0 ? (
        <Card>
          <View style={styles.emptyAlerts}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.emptyAlertsText}>Sin alertas activas.</Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          {systemAlerts.map((a) => {
            const sevTone =
              a.severity === 'critical' || a.severity === 'danger'
                ? { bg: colors.dangerSoft, fg: colors.danger, label: 'Critica' as const }
                : a.severity === 'warning'
                ? { bg: colors.warningSoft, fg: colors.warning, label: 'Aviso' as const }
                : { bg: colors.infoSoft, fg: colors.info, label: 'Info' as const };
            const busy = resolvingId === a.id;
            return (
              <Card key={a.id}>
                <View style={styles.sysAlertHead}>
                  <View style={[styles.sysAlertIcon, { backgroundColor: sevTone.bg }]}>
                    <Ionicons
                      name={(a.icon as any) ?? 'warning'}
                      size={16}
                      color={sevTone.fg}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={typography.bodyStrong} numberOfLines={1}>
                      {a.type}
                    </Text>
                    {a.detail ? (
                      <Text style={[typography.caption, { marginTop: 2 }]} numberOfLines={2}>
                        {a.detail}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge
                    label={sevTone.label}
                    tone={
                      a.severity === 'critical' || a.severity === 'danger'
                        ? 'danger'
                        : a.severity === 'warning'
                        ? 'warning'
                        : 'info'
                    }
                  />
                </View>
                <View style={styles.sysAlertMetaRow}>
                  <Text style={styles.sysAlertMeta}>
                    {new Date(a.createdAt).toLocaleString('es-PA')}
                  </Text>
                  <Pressable
                    onPress={() => handleResolveAlert(a)}
                    disabled={busy}
                    style={({ pressed }) => [
                      styles.sysAlertBtn,
                      (pressed || busy) && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons name="checkmark-done" size={12} color={colors.textOnPrimary} />
                    <Text style={styles.sysAlertBtnText}>
                      {busy ? 'Resolviendo...' : 'Marcar resuelto'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      )}

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
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  uploadBtnText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  uploadedText: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  uploadedReplace: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },

  emptyAlerts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  emptyAlertsText: {
    color: colors.textSubtle,
    fontWeight: '600',
    fontSize: 13,
  },
  sysAlertHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sysAlertIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sysAlertMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  sysAlertMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sysAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  sysAlertBtnText: {
    color: colors.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
});
