import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Card, Avatar, StatusBadge } from '@/components/ui';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { TEACHERS_FULL, dateUtils } from '@/services/mockData';
import { getSubjects, hydrateSubjects, getSubjectsVersion } from '@/services/subjectsService';
import {
  getTeachersForSubject, getTeacherAvailableSlots, generateNextDays,
  hasStudentConflict, Hold,
} from '@/services/bookingService';
import { useBookings } from '@/hooks/useBookings';

type Step = 1 | 2 | 3 | 4 | 5;
const ANY = 'any';

interface Props { student: { id: string; name: string; avatar: string }; }

export function BookingWizard({ student }: Props) {
  const router = useRouter();
  const { bookings, holds, createHold, releaseHold, createBooking, remainingHours } = useBookings();

  const [step, setStep] = useState<Step>(1);
  const [subject, setSubject] = useState<string | null>(null);
  const [subjectsTick, setSubjectsTick] = useState<number>(getSubjectsVersion());

  // Hidratar catálogo de materias desde Cloud al montar (módulo #2 migrado)
  useEffect(() => {
    let alive = true;
    hydrateSubjects().then(() => {
      if (alive) setSubjectsTick(getSubjectsVersion());
    });
    return () => {
      alive = false;
    };
  }, []);

  const subjectsList = useMemo(() => getSubjects(), [subjectsTick]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [chosenTeacherId, setChosenTeacherId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [holdRemaining, setHoldRemaining] = useState<number>(0);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hours = remainingHours[student.id] ?? 0;
  const eligible = subject ? getTeachersForSubject(subject) : [];
  const days = useMemo(() => generateNextDays(7), []);
  const resolved = chosenTeacherId ? TEACHERS_FULL.find((t) => t.id === chosenTeacherId) : null;

  useEffect(() => { reset(); /* eslint-disable-next-line */ }, [student.id]);

  useEffect(() => {
    if (!hold) return;
    const iv = setInterval(() => {
      const r = Math.max(0, hold.expiresAt - Date.now());
      setHoldRemaining(r);
      if (r === 0) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [hold]);

  useEffect(() => () => { if (hold) releaseHold(hold.id); }, [hold, releaseHold]);

  const slotsByTeacher = useMemo(() => {
    if (!date) return [];
    if (teacherId === ANY) {
      return eligible
        .map((t) => ({ teacher: t, slots: getTeacherAvailableSlots(t.id, date, bookings, holds, Date.now()) }))
        .filter((g) => g.slots.length > 0);
    }
    if (!teacherId) return [];
    return [{
      teacher: TEACHERS_FULL.find((t) => t.id === teacherId)!,
      slots: getTeacherAvailableSlots(teacherId, date, bookings, holds, Date.now()),
    }];
  }, [date, teacherId, eligible, bookings, holds]);

  function pickSlot(tId: string, s: string) {
    if (hasStudentConflict(student.id, date!, s, bookings)) {
      Alert.alert('Conflicto', 'El estudiante ya tiene una clase en este horario.');
      return;
    }
    if (hold) releaseHold(hold.id);
    const h = createHold(tId, date!, s);
    setHold(h); setTime(s); setChosenTeacherId(tId); setStep(4);
  }

  function handleConfirm() {
    setError(null);
    if (!subject || !date || !time || !chosenTeacherId || !resolved) return;
    const r = createBooking({
      studentId: student.id, studentName: student.name, studentAvatar: student.avatar,
      teacherId: chosenTeacherId, teacherName: resolved.name, teacherAvatar: resolved.avatar,
      subject, date, time,
    }, hold?.id);
    if (r.error) { setError(r.error); return; }
    setConfirmedId(r.booking.id); setRequiresPayment(r.requiresPayment); setHold(null); setStep(5);
  }

  function reset() {
    if (hold) releaseHold(hold.id);
    setStep(1); setSubject(null); setTeacherId(null); setChosenTeacherId(null);
    setDate(null); setTime(null); setHold(null); setConfirmedId(null); setError(null);
  }

  return (
    <View>
      {step < 5 && (
        <View style={s.stepper}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[s.stepDot, n <= step && s.stepDotOn]} />
          ))}
        </View>
      )}

      {step === 1 && (
        <View>
          <Text style={s.title}>1. Elige materia</Text>
          <View style={{ gap: spacing.sm }}>
            {subjectsList.map((x) => (
              <SelectRow key={x} label={x} icon="school-outline" active={subject === x}
                onPress={() => { setSubject(x); setTeacherId(null); }} />
            ))}
          </View>
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={s.title}>2. Elige profesor</Text>
          <SelectRow label="Cualquier profesor disponible" icon="people"
            active={teacherId === ANY} onPress={() => setTeacherId(ANY)} />
          <View style={{ height: spacing.sm }} />
          <View style={{ gap: spacing.sm }}>
            {eligible.map((t) => (
              <Pressable key={t.id} onPress={() => setTeacherId(t.id)}
                style={[s.selectRow, teacherId === t.id && s.selectRowOn]}>
                <Avatar name={t.name} uri={t.avatar} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, teacherId === t.id && { color: colors.textOnPrimary }]}>
                    {t.name}
                  </Text>
                  <Text style={[typography.caption, { color: teacherId === t.id ? colors.primarySoft : colors.textSubtle }]}>
                    {t.subjects.slice(0, 2).join(' · ')}
                  </Text>
                </View>
                {teacherId === t.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.textOnPrimary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={s.title}>3. Elige fecha</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}>
            {days.map((d) => (
              <Pressable key={d} onPress={() => { setDate(d); setTime(null); }}
                style={[s.dateChip, d === date && s.dateChipOn]}>
                <Text style={[s.dateText, d === date && { color: colors.textOnPrimary }]}>
                  {dateUtils.formatDisplay(d)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {date && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={s.title}>Horarios disponibles</Text>
              {slotsByTeacher.length === 0 ? (
                <Card>
                  <View style={s.empty}>
                    <Ionicons name="calendar-clear-outline" size={32} color={colors.textMuted} />
                    <Text style={typography.bodyStrong}>Sin horarios</Text>
                    <Text style={typography.caption}>Prueba otra fecha</Text>
                  </View>
                </Card>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {slotsByTeacher.map((g) => (
                    <Card key={g.teacher.id}>
                      {teacherId === ANY && (
                        <View style={s.teacherHead}>
                          <Avatar name={g.teacher.name} uri={g.teacher.avatar} size={32} />
                          <Text style={typography.bodyStrong}>{g.teacher.name}</Text>
                        </View>
                      )}
                      <View style={s.slotsGrid}>
                        {g.slots.map((x) => (
                          <Pressable key={x} onPress={() => pickSlot(g.teacher.id, x)} style={s.slot}>
                            <Text style={s.slotText}>{x}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {step === 4 && resolved && (
        <View>
          <Text style={s.title}>4. Resumen</Text>
          <View style={s.holdBanner}>
            <Ionicons name="lock-closed" size={16} color={colors.warning} />
            <Text style={s.holdText}>
              Horario bloqueado {holdRemaining > 0 ? `· ${fmt(holdRemaining)}` : '· expirado'}
            </Text>
          </View>

          <Card style={{ marginTop: spacing.md }}>
            <Row label="Materia" value={subject!} />
            <Row label="Profesor" value={resolved.name} />
            <Row label="Estudiante" value={student.name} />
            <Row label="Fecha" value={dateUtils.formatDisplay(date!)} />
            <Row label="Hora" value={time!} />
            <Row label="Duración" value="60 minutos" />
            <Row label="Suplente" value="Por asignar" />
            <Row label="Consumo"
              value={hours > 0 ? '1 hora del paquete' : 'Se creará orden pendiente'} last />
          </Card>

          <View style={s.hoursBox}>
            <View style={s.hoursIcon}>
              <Ionicons name="hourglass" size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.caption}>Saldo del estudiante</Text>
              <Text style={typography.bodyStrong}>{hours} horas</Text>
            </View>
            {hours === 0 && <StatusBadge tone="warning" label="Sin paquete" icon="alert-circle" />}
          </View>

          {error && (
            <View style={s.errBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={s.errText}>{error}</Text>
            </View>
          )}
        </View>
      )}

      {step === 5 && confirmedId && (
        <View>
          <View style={s.success}>
            <View style={s.successIcon}>
              <Ionicons name={requiresPayment ? 'card' : 'checkmark-circle'} size={40} color={colors.textOnPrimary} />
            </View>
            <Text style={s.successTitle}>{requiresPayment ? 'Orden creada' : 'Reserva confirmada'}</Text>
            <Text style={s.successText}>
              {requiresPayment ? 'Completa el pago para activar la clase.' : 'Se descontó 1 hora del paquete.'}
            </Text>
          </View>
          <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
            <Pressable onPress={() => router.push(`/booking/${confirmedId}` as any)} style={s.primary}>
              <Text style={s.primaryText}>Ver detalle</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textOnPrimary} />
            </Pressable>
            <Pressable onPress={reset} style={s.secondary}>
              <Text style={s.secondaryText}>Nueva reserva</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step >= 1 && step <= 3 && (
        <View style={s.navRow}>
          {step > 1 && (
            <Pressable onPress={() => setStep((step - 1) as Step)} style={[s.navBtn, s.navSecondary]}>
              <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
              <Text style={[s.navText, { color: colors.primaryDark }]}>Atrás</Text>
            </Pressable>
          )}
          {step < 3 && (
            <Pressable
              onPress={() => setStep((step + 1) as Step)}
              disabled={(step === 1 && !subject) || (step === 2 && !teacherId)}
              style={[s.navBtn, s.navPrimary, { flex: 1 },
                ((step === 1 && !subject) || (step === 2 && !teacherId)) && { opacity: 0.5 }]}
            >
              <Text style={[s.navText, { color: colors.textOnPrimary }]}>Continuar</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textOnPrimary} />
            </Pressable>
          )}
        </View>
      )}

      {step === 4 && (
        <View style={s.navRow}>
          <Pressable
            onPress={() => { if (hold) releaseHold(hold.id); setHold(null); setStep(3); }}
            style={[s.navBtn, s.navSecondary]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
            <Text style={[s.navText, { color: colors.primaryDark }]}>Cambiar</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            disabled={holdRemaining === 0}
            style={[s.navBtn, s.navPrimary, { flex: 1 }, holdRemaining === 0 && { opacity: 0.5 }]}
          >
            <Text style={[s.navText, { color: colors.textOnPrimary }]}>
              {hours > 0 ? 'Confirmar' : 'Crear orden'}
            </Text>
            <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function fmt(ms: number) {
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;
}

function SelectRow({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.selectRow, active && s.selectRowOn]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
        {icon && <Ionicons name={icon as any} size={20} color={active ? colors.textOnPrimary : colors.primaryDark} />}
        <Text style={[typography.bodyStrong, active && { color: colors.textOnPrimary }]}>{label}</Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={20} color={colors.textOnPrimary} />}
    </Pressable>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.confRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={typography.bodyStrong}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stepper: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stepDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted },
  stepDotOn: { backgroundColor: colors.primary },
  title: { ...typography.h3, marginBottom: spacing.md },
  selectRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  selectRowOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', minWidth: 90,
  },
  dateChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateText: { fontWeight: '600', fontSize: 13, color: colors.textSubtle },
  teacherHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    minWidth: 72, paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center',
  },
  slotText: { fontWeight: '700', color: colors.primaryDark },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  holdBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.warningSoft, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.warning,
  },
  holdText: { color: colors.warning, fontWeight: '700', fontSize: 13, flex: 1 },
  confRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.md,
  },
  hoursBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  hoursIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  errBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md,
    backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md,
  },
  errText: { color: colors.danger, fontWeight: '600', fontSize: 13, flex: 1 },
  success: {
    backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xl,
    alignItems: 'center', ...shadow.md,
  },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  successTitle: { color: colors.textOnPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  successText: { color: colors.primarySoft, fontSize: 14, textAlign: 'center' },
  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.md,
  },
  primaryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  secondary: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primarySoft, paddingVertical: 14, borderRadius: radius.md,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },
  navRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md,
  },
  navPrimary: { backgroundColor: colors.primary },
  navSecondary: { backgroundColor: colors.primarySoft },
  navText: { fontWeight: '700', fontSize: 15 },
});
