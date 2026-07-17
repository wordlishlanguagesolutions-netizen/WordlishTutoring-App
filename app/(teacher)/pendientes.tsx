import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header } from '@/components/ui';
import { TeacherHint } from '@/components/teacher/TeacherHint';
import type { TeacherHintKey } from '@/constants/teacherCulture';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { useTeacherNotifications } from '@/hooks/useTeacherNotifications';
import { useBookings } from '@/hooks/useBookings';
import { usePermissions } from '@/hooks/usePermissions';
import {
  teacherActiveClass,
  teacherPendingReports,
} from '@/services/mockData';
import { POLICIES } from '@/constants/policies';

// Pantalla "Pendientes" del profesor · vista extendida.
// Vista extendida de "Acciones de hoy" del Home con la misma jerarquía
// operativa (screenshot -> reporte -> reserva). Sin filtro "Materiales":
// todo material se adjunta dentro del reporte.

type Filter = 'all' | 'screenshot' | 'report' | 'booking';
type ActionType = 'screenshot' | 'report' | 'booking';

interface PendingItem {
  id: string;
  type: ActionType;
  student: string;
  action: string;
  time: string;
  icon: string;
  ctaLabel: string;
  route?: string;
  priority: number;
  timeKey: number;
  tone?: 'danger' | 'warning' | 'primary';
}

const PRIORITY: Record<ActionType, number> = {
  screenshot: 1,
  report: 2,
  booking: 3,
};

function screenshotLabel(minutesElapsed: number): {
  label: string;
  tone: 'primary' | 'warning' | 'danger';
} {
  const grace = POLICIES.screenshotGraceMin;
  if (minutesElapsed > grace) return { label: 'Screenshot vencido', tone: 'danger' };
  if (minutesElapsed >= grace - 2) return { label: 'Envíalo ahora', tone: 'warning' };
  return { label: 'Screenshot pendiente', tone: 'primary' };
}

export default function PendientesScreen() {
  const router = useRouter();
  const { ctx } = usePermissions();
  const { bookings } = useBookings();
  const { pendingReports, markReportSent } = useTeacherNotifications();

  const teacherId = ctx?.teacherId ?? 't1';
  const [filter, setFilter] = useState<Filter>('all');
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [screenshotSent, setScreenshotSent] = useState(false);

  const live = teacherActiveClass;
  const showScreenshot = !!live && !live.hasScreenshot && !screenshotSent;

  const all = useMemo<PendingItem[]>(() => {
    const list: PendingItem[] = [];

    // 1) Screenshot de clase en curso (máxima prioridad)
    if (showScreenshot && live) {
      const ss = screenshotLabel(live.minutesElapsed);
      list.push({
        id: 'screenshot-active',
        type: 'screenshot',
        student: live.student,
        action: `${ss.label} · ${live.subject}`,
        time: `Inició ${live.startTime} · ${live.minutesElapsed} min`,
        icon: 'camera',
        ctaLabel: 'Subir',
        priority: PRIORITY.screenshot,
        timeKey: 0,
        tone: ss.tone,
      });
    }

    // 2) Reportes pendientes
    if (pendingReports > 0) {
      teacherPendingReports.forEach((r) => {
        list.push({
          id: `report-${r.id}`,
          type: 'report',
          student: r.student,
          action: `Completar reporte · ${r.subject}`,
          time: r.finishedAt,
          icon: 'document-text',
          ctaLabel: 'Completar',
          route: `/class/${r.classRecordId}`,
          priority: PRIORITY.report,
          timeKey: r.timeKey,
        });
      });
    }

    // 3) Reservas por confirmar
    bookings
      .filter((b) => b.teacherId === teacherId && b.status === 'pending_payment')
      .forEach((b) => {
        list.push({
          id: `booking-${b.id}`,
          type: 'booking',
          student: b.studentName,
          action: `Confirmar reserva · ${b.subject}`,
          time: `${b.date} · ${b.time}`,
          icon: 'calendar',
          ctaLabel: 'Confirmar',
          route: b.classRecordId
            ? (`/class/${b.classRecordId}` as string)
            : undefined,
          priority: PRIORITY.booking,
          timeKey: new Date(`${b.date}T${b.time}:00`).getTime(),
        });
      });

    return list
      .filter((a) => !completed.has(a.id))
      .sort((a, b) =>
        a.priority !== b.priority
          ? a.priority - b.priority
          : a.timeKey - b.timeKey,
      );
  }, [bookings, teacherId, pendingReports, completed, showScreenshot, live]);

  const counts = useMemo(
    () => ({
      all: all.length,
      screenshot: all.filter((a) => a.type === 'screenshot').length,
      report: all.filter((a) => a.type === 'report').length,
      booking: all.filter((a) => a.type === 'booking').length,
    }),
    [all],
  );

  const visible = useMemo(
    () => (filter === 'all' ? all : all.filter((a) => a.type === filter)),
    [all, filter],
  );

  const hintKey: TeacherHintKey | null = useMemo(() => {
    if (counts.all === 0) return 'all_done';
    if (filter === 'report' || (filter === 'all' && counts.report > 0))
      return 'complete_report';
    if (filter === 'screenshot' || counts.screenshot > 0)
      return 'during_screenshot';
    return null;
  }, [filter, counts]);

  const handleComplete = (item: PendingItem) => {
    if (item.type === 'screenshot') {
      const stamp = new Date().toLocaleTimeString('es-PA', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setScreenshotSent(true);
      Alert.alert(
        'Screenshot enviado',
        `Registrado a las ${stamp}. La evidencia queda disponible para el estudiante y el acudiente.`,
      );
      return;
    }
    if (item.type === 'report') markReportSent();
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    if (item.route) router.push(item.route as any);
  };

  return (
    <Screen>
      <Header
        title="Pendientes"
        subtitle={
          counts.all === 0
            ? 'Sin acciones pendientes'
            : `${counts.all} acción${counts.all === 1 ? '' : 'es'} por resolver`
        }
      />

      {/* Filtros por tipo · sin "Materiales" */}
      <View style={styles.filters}>
        <Chip
          label={`Todos ${counts.all}`}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        {counts.screenshot > 0 ? (
          <Chip
            label={`Screenshot ${counts.screenshot}`}
            active={filter === 'screenshot'}
            onPress={() => setFilter('screenshot')}
          />
        ) : null}
        <Chip
          label={`Reportes ${counts.report}`}
          active={filter === 'report'}
          onPress={() => setFilter('report')}
        />
        <Chip
          label={`Reservas ${counts.booking}`}
          active={filter === 'booking'}
          onPress={() => setFilter('booking')}
        />
      </View>

      {hintKey ? (
        <TeacherHint
          hint={hintKey}
          icon={
            hintKey === 'all_done'
              ? 'checkmark-circle-outline'
              : hintKey === 'complete_report'
              ? 'document-text-outline'
              : hintKey === 'during_screenshot'
              ? 'camera-outline'
              : 'ellipse-outline'
          }
          tone={hintKey === 'all_done' ? 'success' : 'default'}
        />
      ) : null}

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.emptyText}>
            {filter === 'all'
              ? 'Todo al día. Buen trabajo.'
              : 'Sin pendientes en este filtro.'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {visible.map((item) => {
            const isScreenshot = item.type === 'screenshot';
            const tone = item.tone ?? 'primary';
            const border =
              tone === 'danger'
                ? colors.danger
                : tone === 'warning'
                ? colors.warning
                : colors.border;
            const ctaBg =
              tone === 'danger'
                ? colors.danger
                : tone === 'warning'
                ? colors.warning
                : colors.primary;
            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  isScreenshot && {
                    borderColor: border,
                    borderWidth: 2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.icon,
                    isScreenshot && tone !== 'primary' && {
                      backgroundColor:
                        tone === 'danger' ? colors.dangerSoft : colors.warningSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={
                      isScreenshot && tone === 'danger'
                        ? colors.danger
                        : isScreenshot && tone === 'warning'
                        ? colors.warning
                        : colors.primaryDark
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.header}>
                    <Text style={styles.student} numberOfLines={1}>
                      {item.student}
                    </Text>
                    <Text style={styles.time}>{item.time}</Text>
                  </View>
                  <Text style={styles.action} numberOfLines={1}>
                    {item.action}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleComplete(item)}
                  style={({ pressed }) => [
                    styles.cta,
                    { backgroundColor: ctaBg },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.ctaText}>{item.ctaLabel}</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={12}
                    color={colors.textOnPrimary}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function Chip({
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
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && { color: colors.textOnPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSubtle,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  student: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  action: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  ctaText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '600',
  },
});
