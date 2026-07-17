import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Card, PageContainer } from '@/components/ui';
import {
  DashboardTopBar,
  DashboardPanel,
  DashboardTable,
  type Column,
  type QuickAction,
} from '@/components/admin';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { adminStats, recentAlerts } from '@/services/mockData';
import {
  dashKpis,
  dashLiveClasses,
  dashUpcoming,
  dashConnectedTeachers,
  dashConnectedStudents,
  dashPendingScreenshots,
  dashPendingReports,
  dashPendingMaterials,
  dashStudentsWaiting,
  dashTeachersOffline,
  dashPendingPayments,
  dashNewBookings,
  dashMessages,
  dashSystemAlerts,
  type LiveClassRow,
  type UpcomingRow,
  type ConnectedTeacherRow,
  type ConnectedStudentRow,
  type PendingScreenshotRow,
  type PendingReportRow,
  type PendingMaterialRow,
  type StudentWaitingRow,
  type TeacherOfflineRow,
  type PendingPaymentRow,
  type NewBookingRow,
  type MessageRow,
  type SystemAlertRow,
} from '@/services/dashboardMockData';

// ============================================================================
// Dashboard admin · Fase 4.
// Desktop: SaaS profesional en 3 columnas con topbar, KPIs, tablas
// compactas ordenables, buscables y filtrables.
// Móvil y tablet: layout original (adminStats + Módulos), sin cambios.
// ============================================================================

export default function AdminDashboard() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [globalQuery, setGlobalQuery] = useState('');

  if (!isDesktop) {
    return <AdminDashboardMobile />;
  }

  const quickActions: QuickAction[] = [
    { key: 'booking', label: 'Nueva reserva', icon: 'calendar', onPress: () => router.push('/booking/type' as any) },
    { key: 'teacher', label: 'Nuevo profesor', icon: 'person-add', onPress: () => router.push('/(admin)/users' as any) },
    { key: 'package', label: 'Nuevo paquete', icon: 'cube', onPress: () => router.push('/(admin)/packages' as any) },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <PageContainer maxWidth={1400}>
          <DashboardTopBar
            query={globalQuery}
            onQueryChange={setGlobalQuery}
            notificationsCount={dashKpis.incidents + dashKpis.screenshotsPending}
            onNotificationsPress={() => Alert.alert('Notificaciones', 'Bandeja en construcción.')}
            quickActions={quickActions}
          />

          {/* Title + KPI strip */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Panel operativo</Text>
              <Text style={styles.subtitle}>
                Todo lo que ocurre en Wordlish, en tiempo real
              </Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <Kpi label="Clases hoy" value={dashKpis.classesToday} icon="calendar-outline" />
            <Kpi label="En curso" value={dashKpis.liveNow} icon="play-circle" tone="success" />
            <Kpi label="Profesores en línea" value={dashKpis.teachersOnline} icon="school-outline" tone="info" />
            <Kpi label="Estudiantes conectados" value={dashKpis.studentsOnline} icon="people-outline" tone="info" />
            <Kpi label="Screenshots pendientes" value={dashKpis.screenshotsPending} icon="camera-outline" tone="warning" />
            <Kpi label="Reportes pendientes" value={dashKpis.reportsPending} icon="document-text-outline" tone="warning" />
            <Kpi label="Pagos pendientes" value={dashKpis.paymentsPending} icon="card-outline" tone="warning" />
            <Kpi label="Incidencias" value={dashKpis.incidents} icon="warning" tone="danger" />
          </View>

          {/* 3 columnas */}
          <View style={styles.columns}>
            {/* Columna 1 · Operativo en vivo */}
            <View style={styles.col}>
              <ColumnHeader label="En vivo" />

              <DashboardPanel
                title="Clases en curso"
                count={dashLiveClasses.length}
                icon="play-circle"
                tone="success"
                onSeeAll={() => router.push('/(supervisor)' as any)}
              >
                <DashboardTable<LiveClassRow>
                  rows={dashLiveClasses}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  filters={[
                    { key: 'incidents', label: 'Incidencias', predicate: (r: LiveClassRow) => r.status !== 'ok' || r.screenshot !== 'ok' },
                  ]}
                  columns={[
                    { key: 'teacher', label: 'Profesor', flex: 2 },
                    { key: 'student', label: 'Estudiante', flex: 2 },
                    { key: 'subject', label: 'Materia', flex: 2 },
                    {
                      key: 'elapsedMin',
                      label: 'Min',
                      flex: 0.7,
                      align: 'right',
                      render: (r: LiveClassRow) => (
                        <Text style={styles.mono}>{r.elapsedMin}′</Text>
                      ),
                    },
                    {
                      key: 'screenshot',
                      label: 'SS',
                      flex: 1,
                      render: (r: LiveClassRow) => <StatusPill kind={r.screenshot} />,
                    },
                  ]}
                  emptyText="Sin clases en curso"
                />
              </DashboardPanel>

              <DashboardPanel
                title="Próximas clases"
                count={dashUpcoming.length}
                icon="time-outline"
                onSeeAll={() => router.push('/(supervisor)' as any)}
              >
                <DashboardTable<UpcomingRow>
                  rows={dashUpcoming}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  filters={[
                    { key: 'ind', label: 'Individual', predicate: (r: UpcomingRow) => r.kind === 'individual' },
                    { key: 'grp', label: 'Grupal',    predicate: (r: UpcomingRow) => r.kind === 'group' },
                  ]}
                  columns={[
                    { key: 'time',    label: 'Hora',      flex: 0.8 },
                    { key: 'teacher', label: 'Profesor',  flex: 2 },
                    { key: 'student', label: 'Estudiante', flex: 2 },
                    { key: 'subject', label: 'Materia',   flex: 1.6 },
                    {
                      key: 'in',
                      label: 'Empieza',
                      flex: 1.2,
                      align: 'right',
                      render: (r: UpcomingRow) => (
                        <Text style={[styles.cellMuted, { textAlign: 'right' }]}>{r.in}</Text>
                      ),
                    },
                  ]}
                />
              </DashboardPanel>

              <DashboardPanel
                title="Profesores conectados"
                count={dashConnectedTeachers.length}
                icon="school-outline"
                tone="info"
              >
                <DashboardTable<ConnectedTeacherRow>
                  rows={dashConnectedTeachers}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  filters={[
                    { key: 'special', label: 'Special', predicate: (r: ConnectedTeacherRow) => r.tier === 'special' },
                  ]}
                  columns={[
                    { key: 'name',      label: 'Profesor',     flex: 2 },
                    { key: 'since',     label: 'Desde',        flex: 0.9 },
                    { key: 'nextClass', label: 'Próxima clase', flex: 2 },
                    {
                      key: 'tier',
                      label: 'Nivel',
                      flex: 1,
                      render: (r: ConnectedTeacherRow) => <TierPill tier={r.tier} />,
                    },
                  ]}
                />
              </DashboardPanel>

              <DashboardPanel
                title="Estudiantes conectados"
                count={dashConnectedStudents.length}
                icon="people-outline"
                tone="info"
              >
                <DashboardTable<ConnectedStudentRow>
                  rows={dashConnectedStudents}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  columns={[
                    { key: 'name',       label: 'Estudiante', flex: 2 },
                    { key: 'waitingFor', label: 'Con',        flex: 2 },
                    {
                      key: 'since',
                      label: 'Estado',
                      flex: 1.2,
                      align: 'right',
                      render: (r: ConnectedStudentRow) => (
                        <Text style={[styles.cellMuted, { textAlign: 'right' }]}>{r.since}</Text>
                      ),
                    },
                  ]}
                />
              </DashboardPanel>
            </View>

            {/* Columna 2 · Pendientes operativos */}
            <View style={styles.col}>
              <ColumnHeader label="Pendientes" />

              <DashboardPanel
                title="Screenshots pendientes"
                count={dashPendingScreenshots.length}
                tone="warning"
                icon="camera-outline"
              >
                <DashboardTable<PendingScreenshotRow>
                  rows={dashPendingScreenshots}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  columns={[
                    { key: 'teacher', label: 'Profesor', flex: 2 },
                    { key: 'student', label: 'Estudiante', flex: 2 },
                    {
                      key: 'minutesLate',
                      label: 'Retraso',
                      flex: 1,
                      align: 'right',
                      render: (r: PendingScreenshotRow) => (
                        <Text
                          style={[
                            styles.mono,
                            { color: r.minutesLate > 10 ? colors.danger : colors.warning, textAlign: 'right' },
                          ]}
                        >
                          {r.minutesLate}′
                        </Text>
                      ),
                    },
                  ]}
                  emptyText="Todo al día"
                />
              </DashboardPanel>

              <DashboardPanel
                title="Reportes pendientes"
                count={dashPendingReports.length}
                tone="warning"
                icon="document-text-outline"
              >
                <DashboardTable<PendingReportRow>
                  rows={dashPendingReports}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  filters={[
                    { key: 'over24', label: '+24h', predicate: (r: PendingReportRow) => r.hoursOverdue >= 24 },
                  ]}
                  columns={[
                    { key: 'teacher',    label: 'Profesor',    flex: 2 },
                    { key: 'student',    label: 'Estudiante',  flex: 2 },
                    { key: 'finishedAt', label: 'Finalizó',    flex: 2 },
                    {
                      key: 'hoursOverdue',
                      label: 'Retraso',
                      flex: 1,
                      align: 'right',
                      render: (r: PendingReportRow) => (
                        <Text
                          style={[
                            styles.mono,
                            { color: r.hoursOverdue >= 24 ? colors.danger : colors.warning, textAlign: 'right' },
                          ]}
                        >
                          {r.hoursOverdue}h
                        </Text>
                      ),
                    },
                  ]}
                  emptyText="Todo al día"
                />
              </DashboardPanel>

              <DashboardPanel
                title="Material pendiente"
                count={dashPendingMaterials.length}
                tone="warning"
                icon="library-outline"
              >
                <DashboardTable<PendingMaterialRow>
                  rows={dashPendingMaterials}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  columns={[
                    { key: 'teacher', label: 'Profesor',   flex: 2 },
                    { key: 'student', label: 'Estudiante', flex: 2 },
                    { key: 'subject', label: 'Materia',    flex: 1.6 },
                    {
                      key: 'due',
                      label: 'Vence',
                      flex: 1,
                      align: 'right',
                      render: (r: PendingMaterialRow) => (
                        <Text style={[styles.cellMuted, { textAlign: 'right' }]}>{r.due}</Text>
                      ),
                    },
                  ]}
                  emptyText="Sin pendientes"
                />
              </DashboardPanel>

              <DashboardPanel
                title="Estudiantes esperando profesor"
                count={dashStudentsWaiting.length}
                tone={dashStudentsWaiting.length > 0 ? 'danger' : 'success'}
                icon="hourglass-outline"
              >
                <DashboardTable<StudentWaitingRow>
                  rows={dashStudentsWaiting}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  columns={[
                    { key: 'student', label: 'Estudiante', flex: 2 },
                    { key: 'teacher', label: 'Profesor',   flex: 2 },
                    { key: 'since',   label: 'Desde',      flex: 1 },
                    {
                      key: 'minutes',
                      label: 'Espera',
                      flex: 1,
                      align: 'right',
                      render: (r: StudentWaitingRow) => (
                        <Text style={[styles.mono, { color: colors.danger, textAlign: 'right' }]}>{r.minutes}′</Text>
                      ),
                    },
                  ]}
                  emptyText="Nadie está esperando"
                />
              </DashboardPanel>

              <DashboardPanel
                title="Profesores aún no ingresan"
                count={dashTeachersOffline.length}
                tone={dashTeachersOffline.length > 0 ? 'warning' : 'success'}
                icon="person-outline"
              >
                <DashboardTable<TeacherOfflineRow>
                  rows={dashTeachersOffline}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  columns={[
                    { key: 'teacher',  label: 'Profesor',    flex: 2 },
                    { key: 'student',  label: 'Estudiante',  flex: 2 },
                    { key: 'subject',  label: 'Materia',     flex: 1.6 },
                    { key: 'startsIn', label: 'Inicia',      flex: 1, align: 'right' },
                  ]}
                  emptyText="Todos conectados"
                />
              </DashboardPanel>
            </View>

            {/* Columna 3 · Negocio · Mensajes · Alertas */}
            <View style={styles.col}>
              <ColumnHeader label="Negocio y alertas" />

              <DashboardPanel
                title="Pagos pendientes"
                count={dashPendingPayments.length}
                tone="warning"
                icon="card-outline"
                onSeeAll={() => Alert.alert('Pagos', 'Módulo en construcción.')}
              >
                <DashboardTable<PendingPaymentRow>
                  rows={dashPendingPayments}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  filters={[
                    { key: 'late', label: 'Vencidos', predicate: (r: PendingPaymentRow) => r.daysLate > 0 },
                  ]}
                  columns={[
                    { key: 'student', label: 'Estudiante', flex: 2 },
                    { key: 'concept', label: 'Concepto',   flex: 2 },
                    {
                      key: 'amount',
                      label: 'Monto',
                      flex: 1,
                      align: 'right',
                      render: (r: PendingPaymentRow) => (
                        <Text style={[styles.mono, { textAlign: 'right', fontWeight: '700' }]}>${r.amount}</Text>
                      ),
                    },
                    {
                      key: 'daysLate',
                      label: 'Retraso',
                      flex: 1,
                      align: 'right',
                      render: (r: PendingPaymentRow) => (
                        <Text
                          style={[
                            styles.mono,
                            { textAlign: 'right', color: r.daysLate > 0 ? colors.danger : colors.textMuted },
                          ]}
                        >
                          {r.daysLate > 0 ? `${r.daysLate}d` : '—'}
                        </Text>
                      ),
                    },
                  ]}
                  emptyText="Sin pagos vencidos"
                />
              </DashboardPanel>

              <DashboardPanel
                title="Nuevas reservas"
                count={dashNewBookings.length}
                tone="primary"
                icon="calendar-outline"
                onSeeAll={() => router.push('/booking/mine' as any)}
              >
                <DashboardTable<NewBookingRow>
                  rows={dashNewBookings}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  columns={[
                    { key: 'student',   label: 'Estudiante', flex: 2 },
                    { key: 'teacher',   label: 'Profesor',   flex: 2 },
                    { key: 'subject',   label: 'Materia',    flex: 1.6 },
                    { key: 'date',      label: 'Fecha',      flex: 1 },
                    {
                      key: 'createdAt',
                      label: 'Hace',
                      flex: 1.2,
                      align: 'right',
                      render: (r: NewBookingRow) => (
                        <Text style={[styles.cellMuted, { textAlign: 'right' }]}>{r.createdAt}</Text>
                      ),
                    },
                  ]}
                />
              </DashboardPanel>

              <DashboardPanel
                title="Mensajes importantes"
                count={dashMessages.length}
                tone="info"
                icon="chatbubble-ellipses-outline"
              >
                <DashboardTable<MessageRow>
                  rows={dashMessages}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  filters={[
                    { key: 'danger',  label: 'Urgente',    predicate: (r: MessageRow) => r.severity === 'danger' },
                    { key: 'warning', label: 'Importante', predicate: (r: MessageRow) => r.severity === 'warning' },
                  ]}
                  columns={[
                    {
                      key: 'from',
                      label: 'De',
                      flex: 2,
                      render: (r: MessageRow) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <RoleDot role={r.role} />
                          <Text style={styles.cellText} numberOfLines={1}>{r.from}</Text>
                        </View>
                      ),
                    },
                    { key: 'subject', label: 'Asunto', flex: 3 },
                    {
                      key: 'severity',
                      label: 'Prioridad',
                      flex: 1.2,
                      render: (r: MessageRow) => <SeverityPill s={r.severity} />,
                    },
                    {
                      key: 'createdAt',
                      label: 'Hace',
                      flex: 1.2,
                      align: 'right',
                      render: (r: MessageRow) => (
                        <Text style={[styles.cellMuted, { textAlign: 'right' }]}>{r.createdAt}</Text>
                      ),
                    },
                  ]}
                />
              </DashboardPanel>

              <DashboardPanel
                title="Alertas del sistema"
                count={dashSystemAlerts.length}
                tone="danger"
                icon="warning-outline"
              >
                <DashboardTable<SystemAlertRow>
                  rows={dashSystemAlerts}
                  keyExtractor={(r) => r.id}
                  externalQuery={globalQuery}
                  searchable={false}
                  filters={[
                    { key: 'crit', label: 'Crítica', predicate: (r: SystemAlertRow) => r.severity === 'danger' },
                    { key: 'warn', label: 'Aviso',   predicate: (r: SystemAlertRow) => r.severity === 'warning' },
                  ]}
                  columns={[
                    {
                      key: 'title',
                      label: 'Alerta',
                      flex: 2,
                      render: (r: SystemAlertRow) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <SeverityDot s={r.severity} />
                          <Text style={styles.cellText} numberOfLines={1}>{r.title}</Text>
                        </View>
                      ),
                    },
                    { key: 'detail', label: 'Detalle', flex: 3 },
                    {
                      key: 'ts',
                      label: 'Hora',
                      flex: 0.9,
                      align: 'right',
                      render: (r: SystemAlertRow) => (
                        <Text style={[styles.cellMuted, { textAlign: 'right' }]}>{r.ts}</Text>
                      ),
                    },
                  ]}
                />
              </DashboardPanel>
            </View>
          </View>

          <View style={{ height: spacing.xxl }} />
        </PageContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

// ================== Piezas visuales ==================

function ColumnHeader({ label }: { label: string }) {
  return (
    <View style={styles.colHead}>
      <Text style={styles.colHeadText}>{label}</Text>
    </View>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}) {
  const TONES: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textSubtle },
    info:    { bg: colors.infoSoft,    fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger:  { bg: colors.dangerSoft,  fg: colors.danger },
  };
  const t = TONES[tone];
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon as any} size={14} color={t.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

function StatusPill({ kind }: { kind: 'ok' | 'pending' | 'late' }) {
  const map = {
    ok:      { label: 'Ok',       bg: colors.successSoft, fg: colors.success },
    pending: { label: 'Esperado', bg: colors.warningSoft, fg: colors.warning },
    late:    { label: 'Vencido',  bg: colors.dangerSoft,  fg: colors.danger },
  } as const;
  const m = map[kind];
  return (
    <View style={[styles.pill, { backgroundColor: m.bg }]}>
      <Text style={[styles.pillText, { color: m.fg }]}>{m.label}</Text>
    </View>
  );
}

function TierPill({ tier }: { tier: 'essential' | 'special' }) {
  const m = tier === 'special'
    ? { label: 'Special',   bg: colors.primarySoft, fg: colors.primaryDark }
    : { label: 'Essential', bg: colors.surfaceAlt,  fg: colors.textSubtle };
  return (
    <View style={[styles.pill, { backgroundColor: m.bg }]}>
      <Text style={[styles.pillText, { color: m.fg }]}>{m.label}</Text>
    </View>
  );
}

function SeverityPill({ s }: { s: 'info' | 'warning' | 'danger' | 'success' }) {
  const map = {
    info:    { label: 'Normal',  bg: colors.infoSoft,    fg: colors.info },
    warning: { label: 'Aviso',   bg: colors.warningSoft, fg: colors.warning },
    danger:  { label: 'Urgente', bg: colors.dangerSoft,  fg: colors.danger },
    success: { label: 'Ok',      bg: colors.successSoft, fg: colors.success },
  } as const;
  const m = map[s];
  return (
    <View style={[styles.pill, { backgroundColor: m.bg }]}>
      <Text style={[styles.pillText, { color: m.fg }]}>{m.label}</Text>
    </View>
  );
}

function SeverityDot({ s }: { s: 'info' | 'warning' | 'danger' | 'success' }) {
  const bg =
    s === 'danger' ? colors.danger :
    s === 'warning' ? colors.warning :
    s === 'success' ? colors.success : colors.info;
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bg }} />;
}

function RoleDot({ role }: { role: 'student' | 'guardian' | 'teacher' }) {
  const bg =
    role === 'teacher' ? colors.primaryDark :
    role === 'guardian' ? colors.info : colors.success;
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bg }} />;
}

// ================== Mobile (layout previo intacto) ==================

function AdminDashboardMobile() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Dashboard" subtitle="Panel de Administración" />

      <Text style={styles.section}>Operativos hoy</Text>
      <View style={styles.grid}>
        <MiniStat icon="calendar" value={adminStats.todayClasses} label="Clases del día" tone="primary" />
        <MiniStat icon="play-circle" value={adminStats.activeClasses} label="En curso" tone="success" />
        <MiniStat icon="school" value={adminStats.availableTeachers} label="Profes disponibles" tone="info" />
        <MiniStat icon="hourglass" value={adminStats.pendingBookings} label="Reservas pendientes" tone="warning" />
      </View>

      <Text style={styles.section}>Financiero y calidad</Text>
      <View style={styles.hoursSoldCard}>
        <View style={styles.hoursSoldHeader}>
          <View style={styles.hoursSoldIcon}>
            <Ionicons name="cart" size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hoursSoldTitle}>Horas vendidas</Text>
            <Text style={styles.hoursSoldHint}>Individual + grupales</Text>
          </View>
        </View>
        <View style={styles.hoursSoldRow}>
          <View style={styles.hoursSoldCol}>
            <Text style={styles.hoursSoldValue}>{adminStats.soldHoursMonth}</Text>
            <Text style={styles.hoursSoldLabel}>Este mes</Text>
          </View>
          <View style={styles.hoursSoldDivider} />
          <View style={styles.hoursSoldCol}>
            <Text style={styles.hoursSoldValue}>{adminStats.soldHoursYear.toLocaleString()}</Text>
            <Text style={styles.hoursSoldLabel}>Acumulado anual</Text>
          </View>
        </View>
      </View>
      <View style={styles.grid}>
        <MiniStat icon="card" value={adminStats.pendingPayments} label="Pagos pendientes" tone="warning" />
        <MiniStat icon="hourglass-outline" value={adminStats.consumedHours} label="Horas consumidas" tone="info" />
        <MiniStat icon="document-text" value={adminStats.pendingReports} label="Reportes pendientes" tone="warning" />
      </View>

      <View style={styles.incidentCard}>
        <View style={styles.incidentLeft}>
          <Ionicons name="warning" size={22} color={colors.danger} />
          <Text style={styles.incidentText}>{adminStats.incidents} incidencias activas</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.danger} />
      </View>

      <Text style={styles.section}>Alertas recientes</Text>
      <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        {recentAlerts.map((a) => {
          const t = a.tone === 'danger' ? { bg: colors.dangerSoft, fg: colors.danger } : { bg: colors.warningSoft, fg: colors.warning };
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
        <Module icon="people" title="Estudiantes y Acudientes" description="Perfiles y vínculos" onPress={() => router.push('/(admin)/users' as any)} />
        <Module icon="school" title="Profesores" description="Materias, disponibilidad, pagos" onPress={() => router.push('/(admin)/users' as any)} />
        <Module icon="cube" title="Paquetes" description="Catálogo y precios" onPress={() => router.push('/(admin)/packages' as any)} />
        <Module icon="card" title="Pagos" description="Órdenes, cobros, reembolsos" onPress={() => Alert.alert('Pagos', 'Módulo en construcción.')} />
        <Module icon="pricetag" title="Promociones" description="Descuentos y campañas" onPress={() => Alert.alert('Promociones', 'Módulo en construcción.')} />
        <Module icon="settings" title="Configuración" description="Políticas y APIs" onPress={() => router.push('/(admin)/settings' as any)} />
      </View>
    </Screen>
  );
}

function MiniStat({ icon, value, label, tone }: { icon: string; value: number; label: string; tone: 'primary' | 'success' | 'warning' | 'info' }) {
  const TONES = {
    primary: { bg: colors.primarySoft, fg: colors.primaryDark },
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

function Module({ icon, title, description, onPress }: { icon: string; title: string; description: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.moduleCard, pressed && { opacity: 0.85 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon as any} size={20} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyStrong}>{title}</Text>
        <Text style={typography.caption}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Desktop
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSubtle,
    fontWeight: '500',
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  kpi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  columns: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
  },
  colHead: {
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  colHeadText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  mono: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  cellText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  cellMuted: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Mobile (idéntico al layout previo)
  section: { ...typography.h3, marginTop: spacing.lg, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start' },
  iconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: 12, color: colors.textSubtle, fontWeight: '600' },
  incidentCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.danger },
  incidentLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  incidentText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  moduleCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  hoursSoldCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  hoursSoldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  hoursSoldIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursSoldTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  hoursSoldHint: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  hoursSoldRow: { flexDirection: 'row', gap: spacing.md },
  hoursSoldCol: { flex: 1 },
  hoursSoldDivider: { width: 1, backgroundColor: colors.border },
  hoursSoldValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  hoursSoldLabel: {
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: '600',
    marginTop: 2,
  },
});
