import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, typography, radius } from '@/constants/theme';
import type { ClassEvent, ClassEventType } from '@/types';

interface Props {
  events: ClassEvent[];
}

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

const META: Record<ClassEventType, { icon: string; tone: Tone; label: string }> = {
  booking_created: { icon: 'calendar-outline', tone: 'primary', label: 'Reserva creada' },
  payment_confirmed: { icon: 'card', tone: 'success', label: 'Pago confirmado' },
  teacher_assigned: { icon: 'school', tone: 'primary', label: 'Profesor asignado' },
  substitute_assigned: { icon: 'people', tone: 'info', label: 'Suplente asignado' },
  material_received: { icon: 'folder-open', tone: 'info', label: 'Material recibido' },
  topic_received: { icon: 'chatbubble-ellipses', tone: 'info', label: 'Tema recibido' },
  class_started: { icon: 'play-circle', tone: 'success', label: 'Clase iniciada' },
  screenshot_received: { icon: 'camera', tone: 'primary', label: 'Screenshot' },
  technical_issue: { icon: 'warning', tone: 'warning', label: 'Problema técnico' },
  student_absent: { icon: 'person-remove', tone: 'danger', label: 'Estudiante ausente' },
  teacher_absent: { icon: 'person-remove', tone: 'danger', label: 'Profesor ausente' },
  no_camera: { icon: 'videocam-off', tone: 'warning', label: 'Sin cámara' },
  student_late: { icon: 'time-outline', tone: 'warning', label: 'Estudiante tarde' },
  class_ended: { icon: 'stop-circle', tone: 'info', label: 'Clase finalizada' },
  report_submitted: { icon: 'document-text', tone: 'success', label: 'Reporte enviado' },
  report_read: { icon: 'eye', tone: 'info', label: 'Reporte leído' },
  report_confirmed: { icon: 'checkmark-done', tone: 'success', label: 'Reporte confirmado' },
  material_sent: { icon: 'send', tone: 'success', label: 'Material enviado' },
  hours_deducted: { icon: 'hourglass', tone: 'warning', label: 'Horas descontadas' },
};

const TONE_MAP: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primaryDark },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-PA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ClassTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="time-outline" size={18} color={colors.textMuted} />
        <Text style={styles.emptyText}>Sin eventos aún.</Text>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      {events.map((ev, i) => {
        const meta = META[ev.type] ?? { icon: 'ellipse', tone: 'info' as Tone, label: ev.type };
        const t = TONE_MAP[meta.tone];
        const isLast = i === events.length - 1;
        return (
          <View key={ev.id} style={styles.item}>
            <View style={styles.left}>
              <View style={[styles.dot, { backgroundColor: t.bg }]}>
                <Ionicons name={meta.icon as any} size={12} color={t.fg} />
              </View>
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.right}>
              <Text style={typography.bodyStrong}>{meta.label}</Text>
              <Text style={typography.caption}>{ev.message}</Text>
              <Text style={styles.time}>{fmt(ev.at)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: { flexDirection: 'row', gap: spacing.md },
  left: { width: 24, alignItems: 'center' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  right: { flex: 1, paddingBottom: spacing.md },
  time: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
});
