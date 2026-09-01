import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Header, Card } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { adminStats, recentAlerts } from '@/services/mockData';

export default function AdminDashboard() {
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
      {/* Horas vendidas · tarjeta ancha con mes y acumulado anual.
          El desglose por materia/profesor se consulta en reportes internos. */}
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
            <Text style={styles.hoursSoldValue}>
              {adminStats.soldHoursYear.toLocaleString()}
            </Text>
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
