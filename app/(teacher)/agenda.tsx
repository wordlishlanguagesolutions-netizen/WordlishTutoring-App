
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
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
import { colors, spacing, typography, radius } from '@/constants/theme';
import { useTeacherNotifications } from '@/hooks/useTeacherNotifications';
import { useBookings } from '@/hooks/useBookings';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { BOOKING_STATUS, dateUtils } from '@/services/mockData';
import {
  hydrateTeachers,
  getTeacherByUserId,
  subscribeTeachers,
} from '@/services/teachersService';
import { availabilityRepo } from '@/repositories/availability';

// ============================================================================
// Agenda del Profesor · fusiona Disponibilidad + Clases con toggle superior.
//
// Cambio de infraestructura (beta): el tab "Mi horario" ahora publica y lee
// directamente contra public.teacher_availability via availabilityRepo.
// Ya no usa mock local; los cambios impactan inmediatamente a reservas
// (bookingService lee del mismo cache) y a la web (que consume el mismo
// backend). El tab "Mis clases" mantiene su comportamiento previo.
// ============================================================================

type AgendaTab = 'schedule' | 'classes';
type ClassesFilter = 'today' | 'week' | 'past';

const DAYS = [
  { label: 'Lun', weekday: 1 },
  { label: 'Mar', weekday: 2 },
  { label: 'Mié', weekday: 3 },
  { label: 'Jue', weekday: 4 },
  { label: 'Vie', weekday: 5 },
  { label: 'Sáb', weekday: 6 },
  { label: 'Dom', weekday: 0 },
];

// Franjas horarias permitidas. Manteniendo un set fijo para que el catalogo
// sea consistente entre profesores y con el wizard de reservas.
const SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

// ---------------------------------------------------------------------------
// Helpers de semana (ISO Monday-based).
// ---------------------------------------------------------------------------
function currentWeekStart(): string {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun, 1=Mon...
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMon);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatWeekRange(weekStartIso: string): string {
  const [y, m, d] = weekStartIso.split('-').map(Number);
  const monday = new Date(y, (m ?? 1) - 1, d);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${monday.getDate()} ${months[monday.getMonth()]} – ${sunday.getDate()} ${months[sunday.getMonth()]}`;
}

export default function AgendaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { ctx } = usePermissions();
  const { bookings } = useBookings();
  const { weekPublished, publishWeek } = useTeacherNotifications();

  const [tab, setTab] = useState<AgendaTab>('schedule');

  // Semana ISO objetivo. Al momento la UI trabaja siempre con la semana
  // actual; el diseno permite extender a proximas semanas mas adelante.
  const weekStart = useMemo(() => currentWeekStart(), []);
  const weekRange = useMemo(() => formatWeekRange(weekStart), [weekStart]);

  // Estado del horario: mapea weekday -> Set<string> de slots publicados.
  const [slotsByWeekday, setSlotsByWeekday] = useState<Record<number, Set<string>>>({});
  const [selectedWeekday, setSelectedWeekday] = useState<number>(1); // Lunes por defecto
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [initialSignature, setInitialSignature] = useState<string>('');
  const [hasPublishedData, setHasPublishedData] = useState<boolean>(false);

  const buildSignature = useCallback((map: Record<number, Set<string>>): string => {
    return Object.keys(map)
      .map(Number)
      .sort()
      .map((wd) => `${wd}:${Array.from(map[wd] ?? []).sort().join(',')}`)
      .join('|');
  }, []);

  const currentSignature = useMemo(
    () => buildSignature(slotsByWeekday),
    [slotsByWeekday, buildSignature],
  );
  const dirty = currentSignature !== initialSignature;

  // ---------------------------------------------------------------------
  // Carga inicial: resolver teacher del usuario logueado + disponibilidad
  // publicada para la semana actual desde Cloud.
  // ---------------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        await hydrateTeachers().catch(() => undefined);
        if (!alive) return;
        if (!user?.id) {
          setLoadError('Sesion no valida. Vuelve a iniciar sesion.');
          setLoading(false);
          return;
        }
        const meTeacher = getTeacherByUserId(user.id);
        if (!meTeacher) {
          setLoadError('No encontramos tu perfil de profesor en el sistema. Contacta al administrador.');
          setLoading(false);
          return;
        }
        setTeacherId(meTeacher.id);
        await availabilityRepo.warmCache(true);
        const rows = await availabilityRepo.getForTeacher(meTeacher.id);
        if (!alive) return;
        const forThisWeek = rows.filter((r) => r.weekStart === weekStart);
        const map: Record<number, Set<string>> = {};
        for (const r of forThisWeek) {
          map[r.weekday] = new Set(r.slots ?? []);
        }
        setSlotsByWeekday(map);
        setInitialSignature(buildSignature(map));
        setHasPublishedData(forThisWeek.some((r) => (r.slots ?? []).length > 0));
      } catch (err: any) {
        console.warn('[agenda.tsx] load error', err);
        if (alive) setLoadError('No pudimos cargar tu disponibilidad. Reintenta en un momento.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    const unsub = subscribeTeachers(() => {
      if (!alive || teacherId || !user?.id) return;
      const meTeacher = getTeacherByUserId(user.id);
      if (meTeacher) setTeacherId(meTeacher.id);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [user?.id, weekStart, buildSignature, teacherId]); // Added buildSignature and teacherId to dependencies

  // ---------------------------------------------------------------------
  // Estado del listado de clases (tab "Mis clases") — sin cambios.
  // ---------------------------------------------------------------------
  const [classesFilter, setClassesFilter] = useState<ClassesFilter>('today');
  const activeTeacherId = teacherId ?? ctx?.teacherId ?? 't1';
  const today = dateUtils.todayISO();
  const mine = useMemo(
    () => bookings.filter((b) => b.teacherId === activeTeacherId),
    [bookings, activeTeacherId],
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

  const selectedSlots = slotsByWeekday[selectedWeekday] ?? new Set<string>();

  const toggleSlot = useCallback(
    (slot: string) => {
      setSlotsByWeekday((prev) => {
        const next: Record<number, Set<string>> = { ...prev };
        const current = new Set(next[selectedWeekday] ?? []);
        if (current.has(slot)) current.delete(slot);
        else current.add(slot);
        next[selectedWeekday] = current;
        return next;
      });
    },
    [selectedWeekday],
  );

  const totalSelected = useMemo(
    () =>
      Object.values(slotsByWeekday).reduce(
        (acc, s) => acc + (s ? s.size : 0),
        0,
      ),
    [slotsByWeekday],
  );

  const publish = useCallback(async () => {
    if (!teacherId) {
      Alert.alert('Sin perfil', loadError ?? 'No se identifica tu profesor.');
      return;
    }
    // Convertir Set<string> -> string[] ordenado por hora.
    const payload: Record<number, string[]> = {};
    // Solo enviamos los weekdays que aparecen en el estado. Un weekday con
    // Set vacio se envia como [] (publicacion explicita sin disponibilidad).
    for (const [wdStr, set] of Object.entries(slotsByWeekday)) {
      payload[Number(wdStr)] = Array.from(set ?? []).sort();
    }
    if (Object.keys(payload).length === 0) {
      Alert.alert(
        'Sin franjas',
        'Selecciona al menos una franja horaria antes de publicar.',
      );
      return;
    }
    setSaving(true);
    const result = await availabilityRepo.publishMany(
      teacherId,
      weekStart,
      payload,
    );
    setSaving(false);
    if (!result.ok) {
      Alert.alert('Error al publicar', result.error ?? 'Intenta nuevamente.');
      return;
    }
    setInitialSignature(currentSignature);
    setHasPublishedData(totalSelected > 0);
    publishWeek();
    Alert.alert(
      'Publicado',
      'Tu disponibilidad ya es visible para estudiantes y acudientes.',
    );
  }, [
    teacherId,
    weekStart,
    slotsByWeekday,
    currentSignature,
    totalSelected,
    publishWeek,
    loadError,
  ]);

  const handlePublishPress = useCallback(() => {
    if (saving) return;
    if (!dirty && hasPublishedData) {
      Alert.alert(
        'Sin cambios',
        'No hay cambios pendientes para publicar en esta semana.',
      );
      return;
    }
    const willOverwrite = hasPublishedData && dirty;
    const title = willOverwrite ? 'Sobrescribir horarios' : 'Publicar disponibilidad';
    const message = willOverwrite
      ? `Semana ${weekRange}. Reemplazaras tu disponibilidad publicada. ¿Confirmas?`
      : `Semana ${weekRange}. Total: ${totalSelected} franja(s). ¿Confirmas?`;
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: willOverwrite ? 'Sobrescribir' : 'Publicar',
        style: willOverwrite ? 'destructive' : 'default',
        onPress: publish,
      },
    ]);
  }, [dirty, hasPublishedData, weekRange, totalSelected, publish, saving]);

  return (
    <Screen>
      <Header
        title="Agenda"
        subtitle={
          tab === 'schedule'
            ? `Semana ${weekRange}`
            : `${classesList.length} clases`
        }
      />

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
          {loading ? (
            <Card>
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={typography.caption}>
                  Cargando tu disponibilidad...
                </Text>
              </View>
            </Card>
          ) : loadError ? (
            <NotificationBanner
              tone="danger"
              icon="alert-circle"
              title="No podemos cargar tu horario"
              message={loadError}
            />
          ) : (
            <>
              {hasPublishedData ? (
                <View style={{ marginBottom: spacing.md }}>
                  <NotificationBanner
                    tone={dirty ? 'warning' : 'success'}
                    icon={dirty ? 'alert-circle' : 'checkmark-circle'}
                    title={
                      dirty
                        ? 'Cambios sin publicar'
                        : 'Disponibilidad publicada'
                    }
                    message={
                      dirty
                        ? 'Los estudiantes aun ven tu ultima publicacion hasta que confirmes.'
                        : `Semana ${weekRange} · ${totalSelected} franja(s) visibles.`
                    }
                  />
                </View>
              ) : (
                <View style={{ marginBottom: spacing.md }}>
                  <NotificationBanner
                    tone="danger"
                    icon="alarm"
                    title="Publicacion pendiente"
                    message="Aun no publicas horarios para esta semana. Selecciona al menos una franja y publica."
                  />
                </View>
              )}

              <Text style={styles.section}>Selecciona dia y franjas</Text>
              <View style={styles.daysRow}>
                {DAYS.map((d) => {
                  const active = selectedWeekday === d.weekday;
                  const dayCount = (slotsByWeekday[d.weekday] ?? new Set()).size;
                  return (
                    <Pressable
                      key={d.weekday}
                      onPress={() => setSelectedWeekday(d.weekday)}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                    >
                      <Text style={[styles.dayText, active && styles.dayTextActive]}>
                        {d.label}
                      </Text>
                      {dayCount > 0 ? (
                        <View style={styles.dayCountDot}>
                          <Text style={styles.dayCountText}>{dayCount}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ height: spacing.md }} />
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
                Toca para activar o desactivar franjas · Total semana: {totalSelected}
              </Text>

              <Pressable
                onPress={handlePublishPress}
                disabled={saving}
                style={({ pressed }) => [
                  styles.publishBtn,
                  (pressed || saving) && { opacity: 0.85 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload"
                      size={20}
                      color={colors.textOnPrimary}
                    />
                    <Text style={styles.publishText}>
                      {hasPublishedData
                        ? dirty
                          ? 'Actualizar publicacion'
                          : 'Republicar'
                        : 'Publicar disponibilidad'}
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
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
              label={`Proximas (${buckets.week.length})`}
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
                                'La reserva aun no tiene expediente.',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.textSubtle, fontWeight: '600', fontSize: 13 },
  dayTextActive: { color: colors.textOnPrimary },
  dayCountDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCountText: {
    color: colors.textOnPrimary,
    fontSize: 10,
    fontWeight: '800',
  },
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

  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },

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
