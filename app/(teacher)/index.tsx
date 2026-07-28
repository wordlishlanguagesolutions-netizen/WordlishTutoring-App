import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, PageContainer, WebTwoColumn, ZoomButton } from '@/components/ui';
import { CoachBanner } from '@/components/teacher/CoachBanner';
import { GrowthCard } from '@/components/teacher/GrowthCard';
import { TeacherHint } from '@/components/teacher/TeacherHint';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { useTeacherNotifications } from '@/hooks/useTeacherNotifications';
import {
  GROWTH_INDICATORS,
  growthAverage,
  SPECIAL_THRESHOLD,
} from '@/constants/teacherCulture';
import {
  currentTeacher,
  teacherTodayClasses,
  teacherActiveClass,
  teacherPendingReports,
} from '@/services/mockData';
import { openWhatsapp } from '@/services/whatsappService';
import { POLICIES } from '@/constants/policies';
import { useAuth } from '@/hooks/useAuth';
import { useBookings } from '@/hooks/useBookings';
import { usePermissions } from '@/hooks/usePermissions';

// ============================================================================
// Home del profesor · Fase 3.1: dos columnas en desktop.
// Izquierda (7): Clase en curso.
// Derecha (5): Coach, disponibilidad, Growth, Acciones, Próximas clases.
// Móvil y tablet intactos.
// ============================================================================

type Incident = 'no_camera' | 'late' | 'no_show' | 'technical';
type FlowStep =
  | 'screenshot_pending'
  | 'in_progress'
  | 'ended'
  | 'report_pending'
  | 'report_sent';

// Toda apertura de WhatsApp pasa por `openWhatsapp()` del servicio único,
// que resuelve el número oficial de Wordlish desde `app_settings` (única
// fuente de verdad configurable por el administrador). No se declara ni
// se importa ningún número en este archivo.
const WAIT_SNOOZE_MS = 5 * 60_000;

function fmtHm(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-PA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TeacherHome() {
  const router = useRouter();
  const { logout } = useAuth();
  const { ctx } = usePermissions();
  const { isDesktop } = useResponsive();
  const teacherNotifs = useTeacherNotifications();
  const { weekPublished, deadline, markReportSent } = teacherNotifs;
  const { bookings } = useBookings();
  const teacherId = ctx?.teacherId ?? 't1';

  const live = teacherActiveClass;

  const startMs = useMemo(
    () => Date.now() - live.minutesElapsed * 60_000,
    [live.minutesElapsed],
  );
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const elapsedMin = Math.max(0, Math.floor((nowMs - startMs) / 60_000));

  const [screenshotAt, setScreenshotAt] = useState<number | null>(null);
  const [classEnded, setClassEnded] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [incidents, setIncidents] = useState<Set<Incident>>(new Set());
  const [attendanceSnoozeUntil, setAttendanceSnoozeUntil] = useState<number>(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // eventLog eliminado: la interfaz refleja el estado con los botones
  // visibles; no aporta valor mostrar el log crudo al profesor.
  const logEvent = (_label: string) => {};

  const step: FlowStep = useMemo(() => {
    if (reportSent) return 'report_sent';
    if (classEnded) return 'report_pending';
    if (incidents.has('no_show')) return 'ended';
    if (screenshotAt !== null) return 'in_progress';
    return 'screenshot_pending';
  }, [reportSent, classEnded, incidents, screenshotAt]);

  const showAttendanceAlert =
    step === 'in_progress' &&
    !incidents.has('late') &&
    !incidents.has('no_show') &&
    elapsedMin >= POLICIES.studentToleranceMin &&
    Date.now() >= attendanceSnoozeUntil;

  const handleScreenshot = () => {
    const ts = Date.now();
    setScreenshotAt(ts);
    logEvent(`Screenshot enviado a las ${fmtHm(ts)}`);
    logEvent(`Asistencia confirmada · ${live.student}`);
    logEvent(`Notificación enviada al estudiante y acudiente`);
  };

  const toggleIncident = (key: Incident, label: string) => {
    setIncidents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        logEvent(`${label} desmarcado · ${fmtHm(Date.now())}`);
      } else {
        next.add(key);
        logEvent(`${label} · ${fmtHm(Date.now())}`);
      }
      return next;
    });
  };

  const handleNoShow = () => {
    const ts = Date.now();
    setIncidents((prev) => new Set(prev).add('no_show'));
    logEvent(`Inasistencia registrada · ${fmtHm(ts)}`);
    setClassEnded(true);
  };

  const handleWaitFiveMore = () => {
    setAttendanceSnoozeUntil(Date.now() + WAIT_SNOOZE_MS);
    logEvent(`Espera de 5 minutos · ${fmtHm(Date.now())}`);
  };

  const handleWhatsApp = () => {
    const msg =
      `Hola, soy profesor de Wordlish. Necesito soporte para contactar al acudiente de ${live?.student ?? 'un estudiante'}: la clase ya inició y aún no vemos al estudiante conectado.`;
    logEvent(`WhatsApp a Wordlish · ${fmtHm(Date.now())}`);
    openWhatsapp(msg);
  };

  const handleEndClass = () => {
    setClassEnded(true);
    logEvent(`Clase finalizada · ${fmtHm(Date.now())}`);
  };

  const handleGoToReport = () => {
    router.push(`/class/${live.classRecordId}` as any);
  };

  const handleReportSent = () => {
    setReportSent(true);
    markReportSent();
    logEvent(`Reporte enviado · ${fmtHm(Date.now())}`);
  };

  const ssLabel = useMemo(() => {
    if (elapsedMin < 8) return 'Screenshot pendiente';
    if (elapsedMin <= POLICIES.screenshotGraceMin) return 'Envíalo ahora';
    return 'Screenshot vencido';
  }, [elapsedMin]);

  const ssTone: 'primary' | 'warning' | 'danger' =
    elapsedMin > POLICIES.screenshotGraceMin
      ? 'danger'
      : elapsedMin >= 8
      ? 'warning'
      : 'primary';

  // Focus mode: durante clase en curso o previa, ocultamos todo lo secundario.
  // Solo cuando el reporte esta enviado (o no hay clase activa) vuelven a
  // aparecer acciones de hoy, Growth y proximas clases.
  const focusMode = Boolean(live) && step !== 'report_sent';

  const pendingReports = teacherPendingReports.filter(
    (r) => !completed.has(`report-${r.id}`),
  );
  const pendingBookings = bookings
    .filter((b) => b.teacherId === teacherId && b.status === 'pending_payment')
    .filter((b) => !completed.has(`booking-${b.id}`));

  const upcoming = teacherTodayClasses.filter((c) =>
    live ? c.subject !== live.subject : true,
  );



  // ==================== Bloques ====================
  const HeaderBlock = (
    <>
      <View style={styles.top}>
        <Avatar name={currentTeacher.name} uri={currentTeacher.avatar} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hola, {currentTeacher.firstName}</Text>
        </View>
        <Pressable onPress={logout} hitSlop={10} style={styles.iconBtn} accessibilityLabel="Salir">
          <Ionicons name="log-out-outline" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>

      <CoachBanner
        ctx={{
          justLoggedIn: true,
          hasClassSoon: !!live && screenshotAt === null,
          justSentScreenshot: screenshotAt !== null && !classEnded,
          justSentReport: reportSent,
          dayFinished: reportSent && teacherPendingReports.length === 0,
          averageIndicator: growthAverage(GROWTH_INDICATORS),
          monthOnTime: growthAverage(GROWTH_INDICATORS) >= SPECIAL_THRESHOLD,
        }}
      />

      {!live && !reportSent ? (
        <TeacherHint hint="before_class" icon="time-outline" />
      ) : null}
    </>
  );

  const AvailabilityStrip = (
    <Pressable
      onPress={() => router.push('/(teacher)/agenda' as any)}
      style={({ pressed }) => [
        styles.availabilityStrip,
        {
          backgroundColor: weekPublished ? colors.successSoft : colors.warningSoft,
          borderColor: weekPublished ? colors.success : colors.warning,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons
        name={weekPublished ? 'checkmark-circle' : 'calendar'}
        size={14}
        color={weekPublished ? colors.success : colors.warning}
      />
      <Text
        style={[
          styles.availabilityText,
          { color: weekPublished ? colors.success : colors.warning },
        ]}
        numberOfLines={1}
      >
        {weekPublished
          ? 'Horas publicadas'
          : `Publica tus horas antes del ${deadline.label}`}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={12}
        color={weekPublished ? colors.success : colors.warning}
      />
    </Pressable>
  );

  const LiveClassCard = live ? (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar name={live.student} uri={live.studentAvatar} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.student} numberOfLines={1}>{live.student}</Text>
          <Text style={styles.subject} numberOfLines={1}>{live.subject}</Text>
          <Text style={styles.timeMeta}>Inició {live.startTime} · {elapsedMin} min</Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.livePillText}>En curso</Text>
        </View>
      </View>

      {step === 'screenshot_pending' ? (
        <View style={{ marginTop: spacing.sm }}>
          <ZoomButton variant="secondary" label="Entrar a Zoom" />
        </View>
      ) : null}

      {step === 'screenshot_pending' ? (
        <>
          <Pressable
            onPress={handleScreenshot}
            style={({ pressed }) => [
              styles.primaryBtn,
              ssTone === 'danger' && { backgroundColor: colors.danger },
              ssTone === 'warning' && { backgroundColor: colors.warning },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="camera" size={18} color={colors.textOnPrimary} />
            <Text style={styles.primaryBtnText}>Subir screenshot</Text>
          </Pressable>
          <Text
            style={[
              styles.ssStatus,
              ssTone === 'danger' && { color: colors.danger },
              ssTone === 'warning' && { color: colors.warning },
            ]}
          >
            {ssLabel}
          </Text>
        </>
      ) : null}

      {step === 'in_progress' && screenshotAt ? (
        <Text style={styles.ssDone}>Screenshot enviado, {fmtHm(screenshotAt)}</Text>
      ) : null}

      {step === 'in_progress' ? (
        <Pressable
          onPress={handleEndClass}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="stop-circle" size={18} color={colors.textOnPrimary} />
          <Text style={styles.primaryBtnText}>Finalizar clase</Text>
        </Pressable>
      ) : null}

      {step === 'ended' ? (
        <Pressable
          onPress={() => setClassEnded(true)}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="document-text" size={18} color={colors.textOnPrimary} />
          <Text style={styles.primaryBtnText}>Continuar</Text>
        </Pressable>
      ) : null}

      {step === 'report_pending' ? (
        <Pressable
          onPress={handleGoToReport}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="document-text" size={18} color={colors.textOnPrimary} />
          <Text style={styles.primaryBtnText}>Completar reporte</Text>
        </Pressable>
      ) : null}

      {step === 'report_sent' ? (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.doneText}>Reporte enviado al estudiante y acudiente.</Text>
        </View>
      ) : null}

      {showAttendanceAlert ? (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>Han pasado 15 minutos y el estudiante aún no ingresa.</Text>
          <View style={styles.alertRow}>
            <Pressable
              onPress={handleNoShow}
              style={({ pressed }) => [
                styles.alertBtn,
                { backgroundColor: colors.danger },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.alertBtnText}>No asistió</Text>
            </Pressable>
            <Pressable
              onPress={handleWhatsApp}
              style={({ pressed }) => [
                styles.alertBtn,
                { backgroundColor: colors.success },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.alertBtnText}>WhatsApp</Text>
            </Pressable>
            <Pressable
              onPress={handleWaitFiveMore}
              style={({ pressed }) => [
                styles.alertBtn,
                { backgroundColor: colors.info },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.alertBtnText}>Esperar 5 min</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === 'in_progress' ? (
        <View style={styles.exceptionsGrid}>
          <ExceptionBtn
            icon="videocam-off"
            label="Estudiante sin cámara"
            active={incidents.has('no_camera')}
            onPress={() => toggleIncident('no_camera', 'Estudiante sin cámara')}
          />
          <ExceptionBtn
            icon="time"
            label="Llegó tarde"
            active={incidents.has('late')}
            onPress={() => toggleIncident('late', 'Estudiante llegó tarde')}
          />
          <ExceptionBtn
            icon="person-remove"
            label="No asistió"
            active={incidents.has('no_show')}
            onPress={handleNoShow}
          />
          <ExceptionBtn
            icon="warning"
            label="Problema técnico"
            active={incidents.has('technical')}
            onPress={() => toggleIncident('technical', 'Problema técnico')}
          />
        </View>
      ) : null}

    </View>
  ) : null;

  const ActionsBlock = pendingReports.length > 0 || pendingBookings.length > 0 ? (
    <View>
      <Text style={styles.section}>Acciones de hoy</Text>
      {pendingReports.length > 0 ? (
        <TeacherHint hint="complete_report" icon="document-text-outline" />
      ) : null}
      <View style={{ gap: spacing.sm }}>
        {pendingReports.map((r) => (
          <View key={`r-${r.id}`} style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="document-text" size={16} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionStudent} numberOfLines={1}>{r.student}</Text>
              <Text style={styles.actionText} numberOfLines={1}>Completar reporte · {r.subject}</Text>
            </View>
            <Pressable
              onPress={() => {
                setCompleted((prev) => new Set(prev).add(`report-${r.id}`));
                markReportSent();
                router.push(`/class/${r.classRecordId}` as any);
              }}
              style={({ pressed }) => [styles.actionCta, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.actionCtaText}>Completar</Text>
            </Pressable>
          </View>
        ))}
        {pendingBookings.map((b) => (
          <View key={`b-${b.id}`} style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="calendar" size={16} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionStudent} numberOfLines={1}>{b.studentName}</Text>
              <Text style={styles.actionText} numberOfLines={1}>Confirmar reserva · {b.subject}</Text>
            </View>
            <Pressable
              onPress={() => {
                setCompleted((prev) => new Set(prev).add(`booking-${b.id}`));
                if (b.classRecordId) router.push(`/class/${b.classRecordId}` as any);
              }}
              style={({ pressed }) => [styles.actionCta, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.actionCtaText}>Confirmar</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  ) : null;

  const UpcomingBlock = upcoming.length > 0 ? (
    <View>
      <Text style={styles.section}>Próximas clases</Text>
      <View style={styles.upcomingWrap}>
        {upcoming.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/class/${c.id}` as any)}
            style={({ pressed }) => [styles.compactRow, pressed && { opacity: 0.85 }]}
          >
            <Avatar name={c.student} uri={c.studentAvatar} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={styles.compactName} numberOfLines={1}>{c.student}</Text>
              <Text style={styles.compactSubject} numberOfLines={1}>{c.subject}</Text>
            </View>
            <Text style={styles.compactTime}>{c.time}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  ) : null;

  const GrowthBlock = (
    <View style={{ marginTop: spacing.lg }}>
      <GrowthCard currentLevel="essential" />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageContainer maxWidth="home">
          {HeaderBlock}

          {isDesktop ? (
            <WebTwoColumn
              leftFlex={7}
              rightFlex={5}
              left={
                <View style={{ gap: spacing.md }}>
                  {!focusMode ? AvailabilityStrip : null}
                  {LiveClassCard}
                </View>
              }
              right={
                <View style={{ gap: spacing.md }}>
                  {!focusMode ? ActionsBlock : null}
                  {!focusMode ? GrowthBlock : null}
                  {!focusMode ? UpcomingBlock : null}
                </View>
              }
            />
          ) : (
            <>
              {!focusMode ? AvailabilityStrip : null}
              {LiveClassCard}
              {!focusMode ? ActionsBlock : null}
              {!focusMode ? GrowthBlock : null}
              {!focusMode ? UpcomingBlock : null}
            </>
          )}
        </PageContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExceptionBtn({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.exceptionBtn,
        active && styles.exceptionBtnActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={13}
        color={active ? colors.textOnPrimary : colors.textSubtle}
      />
      <Text
        style={[styles.exceptionText, active && { color: colors.textOnPrimary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  hello: { fontSize: 19, fontWeight: '600', color: colors.text, letterSpacing: -0.2 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  availabilityStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1,
  },
  availabilityText: { flex: 1, fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
    ...shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  student: { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  subject: { fontSize: 15, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },
  timeMeta: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginTop: 3 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.pill, backgroundColor: colors.successSoft,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  livePillText: { fontSize: 12, fontWeight: '700', color: colors.success },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.sm,
  },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  ssStatus: { fontSize: 14, color: colors.primaryDark, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  ssDone: { fontSize: 14, color: colors.success, fontWeight: '600', marginTop: spacing.sm, textAlign: 'center' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  doneText: { fontSize: 14, color: colors.success, fontWeight: '600', flex: 1 },
  moreToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, marginTop: spacing.sm,
  },
  moreToggleText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  exceptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  exceptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  exceptionBtnActive: { backgroundColor: colors.warning, borderColor: colors.warning },
  exceptionText: { fontSize: 13, fontWeight: '700', color: colors.textSubtle },
  alertBox: {
    marginTop: spacing.md, padding: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.warningSoft,
    borderWidth: 1, borderColor: colors.warning, gap: spacing.sm,
  },
  alertText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  alertRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  alertBtn: { flex: 1, minWidth: 90, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  alertBtnText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  section: { ...typography.h3, fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.sm },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  actionIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  actionStudent: { fontSize: 15, fontWeight: '700', color: colors.text },
  actionText: { fontSize: 13, color: colors.textSubtle, marginTop: 2 },
  actionCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill,
  },
  actionCtaText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  upcomingWrap: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  compactName: { fontSize: 15, fontWeight: '700', color: colors.text },
  compactSubject: { fontSize: 13, color: colors.textSubtle, marginTop: 1 },
  compactTime: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
});
