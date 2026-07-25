import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import {
  Screen,
  Header,
  Card,
  GlassCard,
  StatCard,
  Button,
  StatusBadge,
  PageContainer,
} from '@/components/ui';
import { DashboardTable } from '@/components/admin';
import { useResponsive } from '@/hooks/useResponsive';
import {
  colors,
  spacing,
  typography,
  radius,
  shadow,
  motion,
} from '@/constants/theme';
import { adminStats, recentAlerts } from '@/services/mockData';
import {
  dashKpis,
  dashLiveClasses,
  dashUpcoming,
  dashPendingPayments,
  dashNewBookings,
  dashMessages,
  dashSystemAlerts,
  type LiveClassRow,
  type UpcomingRow,
  type PendingPaymentRow,
  type NewBookingRow,
  type MessageRow,
  type SystemAlertRow,
} from '@/services/dashboardMockData';

// ============================================================================
// Dashboard admin · Wordlish Design System v1.0
//
// Desktop  · KPIs arriba, 3 columnas debajo (reservas · en vivo · alertas).
//           Todo respira: mucho blanco, sin líneas divisorias, sombras Apple.
// Mobile   · Layout previo intacto.
// ============================================================================

export default function AdminDashboard() {
  const { isDesktop } = useResponsive();
  if (!isDesktop) {
    return <AdminDashboardMobile />;
  }
  return <AdminDashboardDesktop />;
}

// ============================================================================
// Desktop · SaaS premium
// ============================================================================
function AdminDashboardDesktop() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: motion.base,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <PageContainer maxWidth={1400}>
          <Animated.View style={{ opacity: fade, gap: spacing.block }}>
            {/* ─── Cabecera ─────────────────────────────────────────────── */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={typography.subtitle}>Panel operativo</Text>
                <Text style={typography.h1}>Todo Wordlish en un vistazo</Text>
              </View>
              <View style={styles.headerActions}>
                <Button
                  label="Nuevo profesor"
                  leftIcon="person-add"
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  onPress={() => router.push('/(admin)/users' as any)}
                />
                <Button
                  label="Nueva reserva"
                  leftIcon="calendar"
                  size="sm"
                  fullWidth={false}
                  onPress={() => router.push('/booking/type' as any)}
                />
              </View>
            </View>

            {/* ─── KPIs principales ────────────────────────────────────── */}
            <View style={styles.kpiStrip}>
              <StatCard
                label="Clases hoy"
                value={dashKpis.classesToday}
                icon="calendar-outline"
                tone="primary"
                hint={`${dashKpis.liveNow} en curso ahora`}
              />
              <StatCard
                label="Profesores en línea"
                value={dashKpis.teachersOnline}
                icon="school-outline"
                tone="info"
                hint={`${dashKpis.studentsOnline} estudiantes conectados`}
              />
              <StatCard
                label="Pagos pendientes"
                value={dashKpis.paymentsPending}
                icon="card-outline"
                tone="warning"
                hint="Requieren revisión"
              />
              <StatCard
                label="Incidencias"
                value={dashKpis.incidents}
                icon="warning-outline"
                tone="danger"
                hint={`${dashKpis.screenshotsPending} sin screenshot`}
              />
            </View>

            {/* ─── 3 columnas ──────────────────────────────────────────── */}
            <View style={styles.grid}>
              {/* Col 1 · Reservas (columna principal) */}
              <View style={styles.colMain}>
                <GlassCard>
                  <PanelHead
                    icon="calendar-outline"
                    title="Nuevas reservas"
                    subtitle="Últimas solicitudes recibidas"
                    tone="primary"
                    countLabel={`${dashNewBookings.length} activas`}
                    onSeeAll={() => router.push('/booking/mine' as any)}
                  />
                  <DashboardTable<NewBookingRow>
                    rows={dashNewBookings}
                    keyExtractor={(r) => r.id}
                    searchable={false}
                    columns={[
                      { key: 'student', label: 'Estudiante', flex: 2 },
                      { key: 'teacher', label: 'Profesor', flex: 2 },
                      { key: 'subject', label: 'Materia', flex: 1.4 },
                      { key: 'date', label: 'Fecha', flex: 1 },
                      {
                        key: 'createdAt',
                        label: 'Hace',
                        flex: 1.2,
                        align: 'right',
                        render: (r: NewBookingRow) => (
                          <Text style={[styles.cellMuted, { textAlign: 'right' }]}>
                            {r.createdAt}
                          </Text>
                        ),
                      },
                    ]}
                    emptyText="Sin reservas nuevas"
                  />
                </GlassCard>

                <Card elevated>
                  <PanelHead
                    icon="play-circle"
                    title="Clases en curso"
                    subtitle="Sesiones activas ahora mismo"
                    tone="success"
                    countLabel={`${dashLiveClasses.length} en vivo`}
                  />
                  <DashboardTable<LiveClassRow>
                    rows={dashLiveClasses}
                    keyExtractor={(r) => r.id}
                    searchable={false}
                    columns={[
                      { key: 'teacher', label: 'Profesor', flex: 2 },
                      { key: 'student', label: 'Estudiante', flex: 2 },
                      { key: 'subject', label: 'Materia', flex: 1.6 },
                      {
                        key: 'elapsedMin',
                        label: 'Min',
                        flex: 0.7,
                        align: 'right',
                        render: (r: LiveClassRow) => (
                          <Text style={[styles.mono, { textAlign: 'right' }]}>
                            {r.elapsedMin}′
                          </Text>
                        ),
                      },
                      {
                        key: 'screenshot',
                        label: 'Screenshot',
                        flex: 1.2,
                        render: (r: LiveClassRow) => (
                          <StatusBadge
                            label={
                              r.screenshot === 'ok'
                                ? 'Ok'
                                : r.screenshot === 'pending'
                                ? 'Esperado'
                                : 'Vencido'
                            }
                            tone={
                              r.screenshot === 'ok'
                                ? 'success'
                                : r.screenshot === 'pending'
                                ? 'warning'
                                : 'danger'
                            }
                          />
                        ),
                      },
                    ]}
                    emptyText="Ninguna clase en curso"
                  />
                </Card>

                <Card elevated>
                  <PanelHead
                    icon="stats-chart-outline"
                    title="Actividad semanal"
                    subtitle="Clases impartidas por día"
                    tone="info"
                    countLabel={`${weeklyActivity.reduce((s, d) => s + d.value, 0)} clases`}
                  />
                  <WeeklyActivityChart data={weeklyActivity} />
                </Card>
              </View>

              {/* Col 2 · Próximo & operación */}
              <View style={styles.colMid}>
                <Card elevated>
                  <PanelHead
                    icon="time-outline"
                    title="Próximas clases"
                    subtitle="Comienzan en las próximas horas"
                    tone="info"
                    countLabel={`${dashUpcoming.length}`}
                  />
                  <DashboardTable<UpcomingRow>
                    rows={dashUpcoming}
                    keyExtractor={(r) => r.id}
                    searchable={false}
                    columns={[
                      { key: 'time', label: 'Hora', flex: 0.9 },
                      { key: 'teacher', label: 'Profesor', flex: 2 },
                      { key: 'student', label: 'Estudiante', flex: 2 },
                      {
                        key: 'in',
                        label: 'Empieza',
                        flex: 1.2,
                        align: 'right',
                        render: (r: UpcomingRow) => (
                          <Text style={[styles.cellMuted, { textAlign: 'right' }]}>
                            {r.in}
                          </Text>
                        ),
                      },
                    ]}
                    emptyText="Sin próximas clases"
                  />
                </Card>

                <Card elevated>
                  <PanelHead
                    icon="card-outline"
                    title="Pagos pendientes"
                    subtitle="Concilia pronto para no bloquear reservas"
                    tone="warning"
                    countLabel={`${dashPendingPayments.length}`}
                    onSeeAll={() => router.push('/(admin)/finance' as any)}
                  />
                  <View style={{ gap: spacing.sm }}>
                    {dashPendingPayments.slice(0, 5).map((p) => (
                      <PaymentRow key={p.id} payment={p} />
                    ))}
                  </View>
                </Card>

                <Card elevated>
                  <PanelHead
                    icon="trending-up-outline"
                    title="Progreso del mes"
                    subtitle="Meta operativa · Julio"
                    tone="primary"
                    countLabel={`${Math.round((monthlyProgress.delivered / monthlyProgress.target) * 100)}%`}
                  />
                  <MonthlyProgressBlock data={monthlyProgress} />
                </Card>
              </View>

              {/* Col 3 · Alertas a la derecha */}
              <View style={styles.colSide}>
                <Card elevated tone="default">
                  <PanelHead
                    icon="warning-outline"
                    title="Alertas del sistema"
                    subtitle="Últimos eventos críticos"
                    tone="danger"
                    countLabel={`${dashSystemAlerts.length}`}
                  />
                  <View style={{ gap: spacing.md }}>
                    {dashSystemAlerts.slice(0, 6).map((a) => (
                      <AlertRow key={a.id} alert={a} />
                    ))}
                  </View>
                </Card>

                <Card elevated>
                  <PanelHead
                    icon="chatbubble-ellipses-outline"
                    title="Mensajes importantes"
                    subtitle="Requieren atención hoy"
                    tone="info"
                    countLabel={`${dashMessages.length}`}
                  />
                  <View style={{ gap: spacing.md }}>
                    {dashMessages.slice(0, 5).map((m) => (
                      <MessageRowItem key={m.id} message={m} />
                    ))}
                  </View>
                </Card>

                <Card elevated>
                  <PanelHead
                    icon="flag-outline"
                    title="Próximos eventos"
                    subtitle="Fechas clave de la operación"
                    tone="primary"
                    countLabel={`${upcomingEvents.length}`}
                  />
                  <View style={{ gap: spacing.md }}>
                    {upcomingEvents.map((e) => (
                      <EventRow key={e.id} event={e} />
                    ))}
                  </View>
                </Card>
              </View>
            </View>

            <View style={{ height: spacing.xxl }} />
          </Animated.View>
        </PageContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Piezas visuales · uso interno del dashboard
// ============================================================================

function PanelHead({
  icon,
  title,
  subtitle,
  tone,
  countLabel,
  onSeeAll,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  countLabel?: string;
  onSeeAll?: () => void;
}) {
  const TONE: Record<string, { bg: string; fg: string }> = {
    primary: { bg: colors.surfaceTinted, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
  };
  const t = TONE[tone];
  return (
    <View style={panelHeadStyles.wrap}>
      <View style={[panelHeadStyles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon as any} size={18} color={t.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={panelHeadStyles.titleRow}>
          <Text style={typography.h3} numberOfLines={1}>
            {title}
          </Text>
          {countLabel ? (
            <StatusBadge label={countLabel} tone={tone as any} />
          ) : null}
        </View>
        {subtitle ? (
          <Text style={[typography.caption, { marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          style={({ pressed }) => [
            panelHeadStyles.seeAll,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={panelHeadStyles.seeAllText}>Ver todo</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function AlertRow({ alert }: { alert: SystemAlertRow }) {
  const tone =
    alert.severity === 'danger'
      ? { bg: colors.dangerSoft, fg: colors.danger }
      : alert.severity === 'warning'
      ? { bg: colors.warningSoft, fg: colors.warning }
      : { bg: colors.infoSoft, fg: colors.info };
  return (
    <View style={rowStyles.wrap}>
      <View style={[rowStyles.dot, { backgroundColor: tone.fg }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={rowStyles.title} numberOfLines={1}>
          {alert.title}
        </Text>
        <Text style={rowStyles.detail} numberOfLines={2}>
          {alert.detail}
        </Text>
      </View>
      <Text style={rowStyles.time}>{alert.ts}</Text>
    </View>
  );
}

function MessageRowItem({ message }: { message: MessageRow }) {
  const roleColor =
    message.role === 'teacher'
      ? colors.primary
      : message.role === 'guardian'
      ? colors.info
      : colors.success;
  return (
    <View style={rowStyles.wrap}>
      <View style={[rowStyles.dot, { backgroundColor: roleColor }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={rowStyles.title} numberOfLines={1}>
          {message.from}
        </Text>
        <Text style={rowStyles.detail} numberOfLines={2}>
          {message.subject}
        </Text>
      </View>
      <Text style={rowStyles.time}>{message.createdAt}</Text>
    </View>
  );
}

// ─── Datos derivados para las tarjetas informativas ────────────────────────
// Nota: son locales al dashboard admin, dependen de mockDb y desaparecerán
// cuando conectemos las series reales de OnSpace en Fase 3B.
type WeeklyBar = { day: string; value: number };
const weeklyActivity: WeeklyBar[] = [
  { day: 'Lun', value: 42 },
  { day: 'Mar', value: 51 },
  { day: 'Mié', value: 48 },
  { day: 'Jue', value: 55 },
  { day: 'Vie', value: 61 },
  { day: 'Sáb', value: 34 },
  { day: 'Dom', value: 12 },
];

const monthlyProgress = {
  delivered: 812,
  target: 1100,
  reportsCompleted: 794,
  reportsTotal: 812,
  newStudents: 38,
  newStudentsTarget: 50,
};

type UpcomingEvent = {
  id: string;
  title: string;
  detail: string;
  when: string;
  icon: string;
  tone: 'primary' | 'warning' | 'info' | 'success';
};
const upcomingEvents: UpcomingEvent[] = [
  {
    id: 'e1',
    title: 'Cierre de nómina',
    detail: 'Revisa ajustes antes del corte',
    when: 'Vie · 25 jul',
    icon: 'cash-outline',
    tone: 'warning',
  },
  {
    id: 'e2',
    title: 'Publicación de horarios',
    detail: 'Profesores agenda de agosto',
    when: 'Lun · 28 jul',
    icon: 'calendar-outline',
    tone: 'primary',
  },
  {
    id: 'e3',
    title: 'Reporte mensual',
    detail: 'Métricas y estados de cuenta',
    when: 'Jue · 31 jul',
    icon: 'document-text-outline',
    tone: 'info',
  },
  {
    id: 'e4',
    title: 'Vencimiento de planes',
    detail: '9 estudiantes por renovar',
    when: 'Sáb · 2 ago',
    icon: 'refresh-outline',
    tone: 'success',
  },
];

function WeeklyActivityChart({ data }: { data: WeeklyBar[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={chartStyles.wrap}>
      {data.map((d) => {
        const h = Math.max(6, Math.round((d.value / max) * 96));
        return (
          <View key={d.day} style={chartStyles.col}>
            <View style={chartStyles.trackWrap}>
              <View style={[chartStyles.bar, { height: h }]} />
            </View>
            <Text style={chartStyles.dayLabel}>{d.day}</Text>
            <Text style={chartStyles.dayValue}>{d.value}</Text>
          </View>
        );
      })}
    </View>
  );
}

function MonthlyProgressBlock({ data }: { data: typeof monthlyProgress }) {
  const items = [
    {
      label: 'Clases entregadas',
      current: data.delivered,
      target: data.target,
      suffix: 'h',
      tone: colors.primary,
    },
    {
      label: 'Reportes completados',
      current: data.reportsCompleted,
      target: data.reportsTotal,
      suffix: '',
      tone: colors.info,
    },
    {
      label: 'Nuevos estudiantes',
      current: data.newStudents,
      target: data.newStudentsTarget,
      suffix: '',
      tone: colors.success,
    },
  ];
  return (
    <View style={{ gap: spacing.md }}>
      {items.map((it) => {
        const pct = Math.min(1, it.current / it.target);
        return (
          <View key={it.label} style={{ gap: 6 }}>
            <View style={progressStyles.headerRow}>
              <Text style={progressStyles.label}>{it.label}</Text>
              <Text style={progressStyles.value}>
                {it.current}
                {it.suffix} <Text style={progressStyles.target}>/ {it.target}{it.suffix}</Text>
              </Text>
            </View>
            <View style={progressStyles.track}>
              <View
                style={[
                  progressStyles.fill,
                  { width: `${pct * 100}%`, backgroundColor: it.tone },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function EventRow({ event }: { event: UpcomingEvent }) {
  const TONE: Record<string, { bg: string; fg: string }> = {
    primary: { bg: colors.surfaceTinted, fg: colors.primary },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
  };
  const t = TONE[event.tone];
  return (
    <View style={eventStyles.wrap}>
      <View style={[eventStyles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name={event.icon as any} size={16} color={t.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={eventStyles.title} numberOfLines={1}>{event.title}</Text>
        <Text style={eventStyles.detail} numberOfLines={1}>{event.detail}</Text>
      </View>
      <Text style={[eventStyles.when, { color: t.fg }]}>{event.when}</Text>
    </View>
  );
}

function PaymentRow({ payment }: { payment: PendingPaymentRow }) {
  const late = payment.daysLate > 0;
  return (
    <View style={rowStyles.wrap}>
      <View
        style={[
          rowStyles.dot,
          { backgroundColor: late ? colors.danger : colors.warning },
        ]}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={rowStyles.title} numberOfLines={1}>
          {payment.student}
        </Text>
        <Text style={rowStyles.detail} numberOfLines={1}>
          {payment.concept}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={rowStyles.amount}>${payment.amount}</Text>
        <Text
          style={[
            rowStyles.time,
            { color: late ? colors.danger : colors.textMuted },
          ]}
        >
          {late ? `${payment.daysLate}d atraso` : 'A tiempo'}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// Mobile · layout previo intacto
// ============================================================================
function AdminDashboardMobile() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Dashboard" subtitle="Panel de Administración" />

      <Text style={styles.section}>Operativos hoy</Text>
      <View style={styles.grid2}>
        <MiniStat
          icon="calendar"
          value={adminStats.todayClasses}
          label="Clases del día"
          tone="primary"
        />
        <MiniStat
          icon="play-circle"
          value={adminStats.activeClasses}
          label="En curso"
          tone="success"
        />
        <MiniStat
          icon="school"
          value={adminStats.availableTeachers}
          label="Profes disponibles"
          tone="info"
        />
        <MiniStat
          icon="hourglass"
          value={adminStats.pendingBookings}
          label="Reservas pendientes"
          tone="warning"
        />
      </View>

      <Text style={styles.section}>Financiero y calidad</Text>
      <View style={styles.hoursSoldCard}>
        <View style={styles.hoursSoldHeader}>
          <View style={styles.hoursSoldIcon}>
            <Ionicons name="cart" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hoursSoldTitle}>Horas vendidas</Text>
            <Text style={styles.hoursSoldHint}>Individual + grupales</Text>
          </View>
        </View>
        <View style={styles.hoursSoldRow}>
          <View style={styles.hoursSoldCol}>
            <Text style={styles.hoursSoldValue}>
              {adminStats.soldHoursMonth}
            </Text>
            <Text style={styles.hoursSoldLabel}>Este mes</Text>
          </View>
          <View style={styles.hoursSoldCol}>
            <Text style={styles.hoursSoldValue}>
              {adminStats.soldHoursYear.toLocaleString()}
            </Text>
            <Text style={styles.hoursSoldLabel}>Acumulado anual</Text>
          </View>
        </View>
      </View>
      <View style={styles.grid2}>
        <MiniStat
          icon="card"
          value={adminStats.pendingPayments}
          label="Pagos pendientes"
          tone="warning"
        />
        <MiniStat
          icon="document-text"
          value={adminStats.pendingReports}
          label="Reportes pendientes"
          tone="warning"
        />
      </View>

      <View style={styles.incidentCard}>
        <View style={styles.incidentLeft}>
          <Ionicons name="warning" size={22} color={colors.danger} />
          <Text style={styles.incidentText}>
            {adminStats.incidents} incidencias activas
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.danger} />
      </View>

      <Text style={styles.section}>Alertas recientes</Text>
      <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        {recentAlerts.map((a) => {
          const t =
            a.tone === 'danger'
              ? { bg: colors.dangerSoft, fg: colors.danger }
              : { bg: colors.warningSoft, fg: colors.warning };
          return (
            <Card key={a.id}>
              <View style={styles.alertRow}>
                <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
                  <Ionicons name={a.icon as any} size={18} color={t.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={typography.bodyStrong}>{a.type}</Text>
                  <Text style={typography.caption}>{a.detail}</Text>
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      <Text style={styles.section}>Módulos</Text>
      <View style={{ gap: spacing.md }}>
        <Module
          icon="people"
          title="Estudiantes y Acudientes"
          description="Perfiles y vínculos"
          onPress={() => router.push('/(admin)/users' as any)}
        />
        <Module
          icon="school"
          title="Profesores"
          description="Materias, disponibilidad, pagos"
          onPress={() => router.push('/(admin)/users' as any)}
        />
        <Module
          icon="cube"
          title="Paquetes"
          description="Catálogo y precios"
          onPress={() => router.push('/(admin)/packages' as any)}
        />
        <Module
          icon="card"
          title="Pagos"
          description="Ingresos, gastos, nómina y utilidad"
          onPress={() => router.push('/(admin)/finance' as any)}
        />
        <Module
          icon="pricetag"
          title="Promociones"
          description="Descuentos y campañas"
          onPress={() =>
            Alert.alert('Promociones', 'Módulo en construcción.')
          }
        />
        <Module
          icon="settings"
          title="Configuración"
          description="Políticas y APIs"
          onPress={() => router.push('/(admin)/settings' as any)}
        />
      </View>
    </Screen>
  );
}

function MiniStat({
  icon,
  value,
  label,
  tone,
}: {
  icon: string;
  value: number;
  label: string;
  tone: 'primary' | 'success' | 'warning' | 'info';
}) {
  const TONES = {
    primary: { bg: colors.surfaceTinted, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info },
  };
  const t = TONES[tone];
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <Ionicons name={icon as any} size={18} color={t.fg} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Module({
  icon,
  title,
  description,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.moduleCard,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyStrong}>{title}</Text>
        <Text style={typography.caption}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  // Desktop
  scroll: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  kpiStrip: {
    flexDirection: 'row',
    gap: spacing.betweenCards,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.betweenCards,
    alignItems: 'flex-start',
  },
  colMain: {
    flex: 2,
    minWidth: 0,
    gap: spacing.betweenCards,
  },
  colMid: {
    flex: 1.6,
    minWidth: 0,
    gap: spacing.betweenCards,
  },
  colSide: {
    flex: 1.2,
    minWidth: 0,
    gap: spacing.betweenCards,
  },
  mono: {
    ...typography.numericSmall,
    fontSize: 15,
  },
  cellMuted: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 14,
  },

  // Mobile (idéntico al layout previo)
  section: {
    ...typography.h3,
    fontSize: 18,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'flex-start',
    ...shadow.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTinted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.numericSmall,
    marginBottom: 2,
  },
  statLabel: { ...typography.caption, fontSize: 14, fontWeight: '600' },
  incidentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.card,
    padding: spacing.card,
    marginTop: spacing.lg,
  },
  incidentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  incidentText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 16,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconText,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconText,
    backgroundColor: colors.surface,
    padding: spacing.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
  },
  hoursSoldCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  hoursSoldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconText,
    marginBottom: spacing.md,
  },
  hoursSoldIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTinted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursSoldTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  hoursSoldHint: {
    ...typography.caption,
    fontSize: 14,
    color: colors.textMuted,
  },
  hoursSoldRow: { flexDirection: 'row', gap: spacing.lg },
  hoursSoldCol: { flex: 1 },
  hoursSoldValue: {
    ...typography.numericSmall,
  },
  hoursSoldLabel: {
    ...typography.caption,
    fontSize: 14,
    marginTop: 2,
  },
});

const panelHeadStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconText,
    marginBottom: spacing.lg,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  seeAllText: {
    ...typography.button,
    fontSize: 14,
    color: colors.primary,
  },
});

const chartStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  trackWrap: {
    height: 104,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    opacity: 0.85,
  },
  dayLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dayValue: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textStrong,
  },
});

const progressStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    ...typography.caption,
    fontSize: 14,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  value: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.textStrong,
  },
  target: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});

const eventStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconText,
    paddingVertical: 4,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  detail: {
    ...typography.caption,
    fontSize: 14,
    marginTop: 2,
  },
  when: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
});

const rowStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.iconText,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  title: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  detail: {
    ...typography.caption,
    fontSize: 14,
    marginTop: 2,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: spacing.sm,
  },
  amount: {
    ...typography.bodyStrong,
    fontSize: 17,
    color: colors.textStrong,
  },
});
