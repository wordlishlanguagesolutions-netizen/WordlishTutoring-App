import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import {
  Screen,
  Header,
  Card,
  NotificationBanner,
  Avatar,
  StatusBadge,
  ZoomButton,
} from '@/components/ui';
import { TeacherHint } from '@/components/teacher/TeacherHint';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { useTeacherNotifications } from '@/hooks/useTeacherNotifications';
import { useBookings } from '@/hooks/useBookings';
import { usePermissions } from '@/hooks/usePermissions';
import { BOOKING_STATUS, dateUtils } from '@/services/mockData';

// ============================================================================
// Agenda del Profesor · fusiona Disponibilidad + Clases con toggle superior.
// Reemplaza las tabs independientes "Disponibilidad" y "Clases".
// El profesor decide entre gestionar su horario o revisar sus clases sin
// cambiar de módulo.
// ============================================================================

type AgendaTab = 'schedule' | 'classes';
type ClassesFilter = 'today' | 'week' | 'past';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const SLOTS = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export default function AgendaScreen() {
  const router = useRouter();
  const { ctx } = usePermissions();
  const { bookings } = useBookings();
  const { weekPublished, publishWeek, deadline } = useTeacherNotifications();

  const [tab, setTab] = useState<AgendaTab>('schedule');

  // Estado del horario
  const [selectedDay, setSelectedDay] = useState<string>('Lun');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(
    new Set(['09:00', '10:00', '14:00'])
  );

  // Estado del listado de clases
  const [classesFilter, setClassesFilter] = useState<ClassesFilter>('today');
  const teacherId = ctx?.teacherId ?? 't1';
  const today = dateUtils.todayISO();
  const mine = useMemo(
    () => bookings.filter((b) => b.teacherId === teacherId),
    [bookings, teacherId],
  );
  const buckets = useMemo(() => {
    const todayList = mine.filter((b) => b.date === today);
    const weekList = mine
      .filter((b) => b.date >= today)
      .slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const pastList = mine
      .filter((b) => b.date < today)
      .slice()
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    return { today: todayList, week: weekList, past: pastList };
  }, [mine, today]);
  const classesList =
    classesFilter === 'today'
      ? buckets.today
      : classesFilter === 'week'
      ? buckets.week
      : buckets.past;

  const toggleSlot = (slot: string) => {
    const next = new Set(selectedSlots);
    if (next.has(slot)) next.delete(slot);
    else next.add(slot);
    setSelectedSlots(next);
  };

  const handlePublish = () => {
    if (selectedSlots.size === 0) {
      Alert.alert(
        'Sin franjas',
        'Selecciona al menos una franja horaria antes de publicar.',
      );
      return;
    }
    Alert.alert(
      'Publicar disponibilidad',
      `Semana ${deadline.weekRange}. Se enviará a los estudiantes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Publicar',
          onPress: () => {
            publishWeek();
            Alert.alert('Publicado', 'Tu disponibilidad ya es visible.');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Header
        title="Agenda"
        subtitle={
          tab === 'schedule'
            ? `Semana ${deadline.weekRange}`
            : `${classesList.length} clases`
        }
      />

      <TeacherHint hint="agenda" icon="calendar-outline" />

      {/* Toggle superior · Mi horario / Mis clases */}
      <View style={styles.toggle}>
        <Pressable
          onPress={() => setTab('schedule')}
          style={[styles.toggleBtn, tab === 'schedule' && styles.toggleBtnActive]}
        >
          <Ionicons
            name="time"
            size={14}
            color={tab === 'schedule' ? colors.textOnPrimary : colors.textSubtle}
          />
          <Text
            style={[
              styles.toggleText,
              tab === 'schedule' && { color: colors.textOnPrimary },
            ]}
          >
            Mi horario
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('classes')}
          style={[styles.toggleBtn, tab === 'classes' && styles.toggleBtnActive]}
        >
          <Ionicons
            name="calendar"
            size={14}
            color={tab === 'classes' ? colors.textOnPrimary : colors.textSubtle}
          />
          <Text
            style={[
              styles.toggleText,
              tab === 'classes' && { color: colors.textOnPrimary },
            ]}
          >
            Mis clases
          </Text>
        </Pressable>
      </View>

      {tab === 'schedule' ? (
        <>
          {!weekPublished ? (
            <View style={{ marginBottom: spacing.md }}>
              <NotificationBanner
                tone="danger"
                icon="alarm"
                title="Publicación pendiente"
                message={`Debes publicar antes del ${deadline.label}. Los estudiantes no verán tu disponibilidad hasta que la publiques.`}
              />
            </View>
          ) : (
            <View style={{ marginBottom: spacing.md }}>
              <NotificationBanner
                tone="success"
                icon="checkmark-circle"
                title="Semana publicada"
                message="Puedes editar y volver a publicar cuando quieras."
              />
            </View>
          )}

          <Text style={styles.section}>Día</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d) => {
              const active = selectedDay === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setSelectedDay(d)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text style={[styles.dayText, active && styles.dayTextActive]}>
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>Franjas horarias</Text>
          <Card>
            <View style={styles.slotsGrid}>
              {SLOTS.map((s) => {
                const active = selectedSlots.has(s);
                return (
                  <Pressable
                    key={s}
                    onPress={() => toggleSlot(s)}
                    style={[styles.slot, active && styles.slotActive]}
                  >
                    <Text
                      style={[styles.slotText, active && styles.slotTextActive]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Text
            style={[
              typography.caption,
              { marginTop: spacing.md, textAlign: 'center' },
            ]}
          >
            Toca para activar o desactivar franjas
          </Text>

          <Pressable
            onPress={handlePublish}
            style={({ pressed }) => [
              styles.publishBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons
              name="cloud-upload"
              size={20}
              color={colors.textOnPrimary}
            />
            <Text style={styles.publishText}>
              {weekPublished ? 'Actualizar publicación' : 'Publicar disponibilidad'}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.chips}>
            <Chip
              label={`Hoy (${buckets.today.length})`}
              active={classesFilter === 'today'}
              onPress={() => setClassesFilter('today')}
            />
            <Chip
              label={`Próximas (${buckets.week.length})`}
              active={classesFilter === 'week'}
              onPress={() => setClassesFilter('week')}
            />
            <Chip
              label={`Pasadas (${buckets.past.length})`}
              active={classesFilter === 'past'}
              onPress={() => setClassesFilter('past')}
            />
          </View>

          {classesList.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>Sin clases en este filtro.</Text>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {classesList.map((b) => {
                const st = BOOKING_STATUS[b.status];
                return (
                  <Card key={b.id}>
                    <View style={styles.rowCenter}>
                      <Avatar
                        name={b.studentName}
                        uri={b.studentAvatar}
                        size={44}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={typography.bodyStrong}>
                          {b.studentName}
                        </Text>
                        <Text style={typography.caption}>
                          {b.subject} · {dateUtils.formatDisplay(b.date)}{' '}
                          {b.time}
                        </Text>
                      </View>
                      <StatusBadge tone={st.tone} label={st.label} />
                    </View>
                    <View style={styles.actionsRow}>
                      <View style={{ flex: 1 }}>
                        <ZoomButton variant="secondary" />
                      </View>
                      <Pressable
                        onPress={() =>
                          b.classRecordId
                            ? router.push(`/class/${b.classRecordId}` as any)
                            : Alert.alert(
                                'Sin expediente',
                                'La reserva aún no tiene expediente.',
                              )
                        }
                        style={({ pressed }) => [
                          styles.manageBtn,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Ionicons
                          name="folder-open"
                          size={14}
                          color={colors.textOnPrimary}
                        />
                        <Text style={styles.manageText}>Gestionar</Text>
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </>
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
  toggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
  },

  section: { ...typography.h3, marginTop: spacing.md, marginBottom: spacing.md },
  daysRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.textSubtle, fontWeight: '600', fontSize: 13 },
  dayTextActive: { color: colors.textOnPrimary },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: '30%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontWeight: '600', color: colors.textSubtle },
  slotTextActive: { color: colors.textOnPrimary },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
  },
  publishText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },

  chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', fontSize: 12, color: colors.textSubtle },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  manageText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 12 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  emptyText: { color: colors.textMuted, fontWeight: '600' },
});
