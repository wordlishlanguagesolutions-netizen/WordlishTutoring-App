import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Modal, StatusBadge, Avatar } from '@/components/ui';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import {
  expenses,
  payrollEntries,
  revenues,
  expenseSummary,
  payrollSummary,
  revenueSummary,
  profitSummary,
  expensesByCategory,
  revenueBySubject,
  revenueByTeacher,
  revenueByPackage,
  monthlyRevenueSeries,
  monthlyExpenseSeries,
  cashFlowSeries,
  listPayrollMonths,
  payrollListByMonth,
  formatMoney,
  formatMonthLabel,
  humanDaysToNext,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_ICON,
  EXPENSE_FREQUENCY_LABEL,
  type Expense,
  type PayrollEntry,
  type RevenueEntry,
  type ExpenseCategory,
} from '@/services/financeService';

// ============================================================================
// Admin · Pagos (centro financiero de Wordlish).
//
// Estructura:
//   0. Resumen ejecutivo (ingresos, gastos, utilidad, próximos cobros, cashflow)
//   1. Gastos (expenses)
//   2. Nómina (payroll)
//   3. Ingresos (revenue)
//
// Diseño minimalista, tarjetas de resumen, gráficos con barras nativas,
// filtros rápidos por sección. Sin dependencias externas.
// ============================================================================

type Tab = 'summary' | 'expenses' | 'payroll' | 'revenue';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'summary',  label: 'Resumen',  icon: 'stats-chart-outline' },
  { key: 'expenses', label: 'Gastos',   icon: 'trending-down-outline' },
  { key: 'payroll',  label: 'Nómina',   icon: 'people-outline' },
  { key: 'revenue',  label: 'Ingresos', icon: 'trending-up-outline' },
];

export default function FinanceScreen() {
  const [tab, setTab] = useState<Tab>('summary');

  return (
    <Screen>
      <Header
        title="Pagos"
        subtitle="Centro financiero · ingresos, gastos, nómina y utilidad"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={({ pressed }) => [
                styles.tabChip,
                active && styles.tabChipActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons
                name={t.icon as any}
                size={14}
                color={active ? colors.textOnPrimary : colors.textSubtle}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ marginTop: spacing.md, gap: spacing.md }}>
        {tab === 'summary'  ? <SummarySection />  : null}
        {tab === 'expenses' ? <ExpensesSection /> : null}
        {tab === 'payroll'  ? <PayrollSection />  : null}
        {tab === 'revenue'  ? <RevenueSection />  : null}
      </View>
    </Screen>
  );
}

// ============================================================================
// 0 · RESUMEN EJECUTIVO
// ============================================================================
function SummarySection() {
  const rev = revenueSummary();
  const exp = expenseSummary();
  const pay = payrollSummary();
  const pro = profitSummary();
  const flow = cashFlowSeries();

  const upcomingCharges = exp.upcoming.slice(0, 5);
  const expiring = exp.upcoming.filter((e) => e.frequency === 'annual').slice(0, 3);

  return (
    <View style={{ gap: spacing.md }}>
      <SectionLabel>Ingresos</SectionLabel>
      <View style={styles.kpiGrid}>
        <KpiCard tone="success" icon="today-outline" label="Hoy" value={formatMoney(rev.day)} />
        <KpiCard tone="success" icon="calendar-outline" label="Mes actual" value={formatMoney(rev.month)} />
        <KpiCard tone="info" icon="pie-chart-outline" label="Año" value={formatMoney(rev.year)} />
      </View>

      <SectionLabel>Gastos</SectionLabel>
      <View style={styles.kpiGrid}>
        <KpiCard tone="warning" icon="trending-down-outline" label="Mes" value={formatMoney(exp.month)} />
        <KpiCard tone="warning" icon="calendar-outline" label="Año" value={formatMoney(exp.year)} />
      </View>

      <SectionLabel>Utilidad</SectionLabel>
      <View style={styles.kpiGrid}>
        <KpiCard
          tone={pro.month >= 0 ? 'primary' : 'danger'}
          icon="cash-outline"
          label="Utilidad del mes"
          value={formatMoney(pro.month)}
          hint={`Ingresos ${formatMoney(pro.revenueMonth)} − Gastos ${formatMoney(pro.expenseMonth)} − Nómina ${formatMoney(pro.payrollMonth)}`}
        />
        <KpiCard
          tone={pro.year >= 0 ? 'primary' : 'danger'}
          icon="analytics-outline"
          label="Utilidad anual"
          value={formatMoney(pro.year)}
          hint={`Ingresos ${formatMoney(pro.revenueYear)} − Gastos ${formatMoney(pro.expenseYear)}`}
        />
      </View>

      <SectionLabel>Nómina pendiente</SectionLabel>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyStrong}>{formatMoney(pay.pending, 'COP')}</Text>
            <Text style={typography.caption}>
              {pay.teachers} profesor{pay.teachers === 1 ? '' : 'es'} · {pay.hoursDelivered} h dictadas
            </Text>
          </View>
          <StatusBadge label="Por pagar" tone="warning" />
        </View>
      </View>

      <SectionLabel>Próximos cobros automáticos</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {upcomingCharges.length === 0 ? (
          <Text style={typography.caption}>Sin cobros programados en los próximos 14 días.</Text>
        ) : upcomingCharges.map((e) => (
          <View key={e.id} style={styles.chargeRow}>
            <View style={styles.chargeIcon}>
              <Ionicons name={EXPENSE_CATEGORY_ICON[e.category] as any} size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{e.name}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {EXPENSE_CATEGORY_LABEL[e.category]} · {e.method}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.rowAmount}>{formatMoney(e.amount, e.currency)}</Text>
              <Text style={styles.rowMeta}>{humanDaysToNext(e.nextBillingDate)}</Text>
            </View>
          </View>
        ))}
      </View>

      <SectionLabel>Suscripciones por vencer</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {expiring.length === 0 ? (
          <Text style={typography.caption}>Sin renovaciones anuales próximas.</Text>
        ) : expiring.map((e) => (
          <View key={e.id} style={styles.chargeRow}>
            <View style={[styles.chargeIcon, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="alarm-outline" size={16} color={colors.warning} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{e.name}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>Renovación anual</Text>
            </View>
            <Text style={[styles.rowMeta, { color: colors.warning, fontWeight: '700' }]}>
              {humanDaysToNext(e.nextBillingDate)}
            </Text>
          </View>
        ))}
      </View>

      <SectionLabel>Flujo de caja · 12 meses</SectionLabel>
      <View style={styles.card}>
        <CashFlowChart data={flow} />
        <View style={styles.legendRow}>
          <LegendDot color={colors.success} label="Ingresos" />
          <LegendDot color={colors.warning} label="Egresos" />
          <LegendDot color={colors.primary} label="Utilidad" />
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// 1 · GASTOS
// ============================================================================
function ExpensesSection() {
  const exp = expenseSummary();
  const byCategory = expensesByCategory();
  const series = monthlyExpenseSeries();
  const [selected, setSelected] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<ExpenseCategory | 'all'>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? expenses : expenses.filter((e) => e.category === filter)),
    [filter],
  );

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.kpiGrid}>
        <KpiCard tone="warning" icon="trending-down-outline" label="Gasto mensual" value={formatMoney(exp.month)} />
        <KpiCard tone="warning" icon="pie-chart-outline" label="Gasto anual" value={formatMoney(exp.year)} />
        <KpiCard tone="info" icon="time-outline" label="Cobros en 14 d" value={`${exp.upcoming.length}`} />
      </View>

      <SectionLabel>Evolución mensual</SectionLabel>
      <View style={styles.card}>
        <BarChart data={series} color={colors.warning} formatter={(v) => formatMoney(v)} />
      </View>

      <SectionLabel>Gastos por categoría</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {byCategory.map((c) => {
          const max = byCategory[0]?.amount ?? 1;
          const pct = c.amount / max;
          return (
            <View key={c.category} style={styles.categoryRow}>
              <View style={styles.chargeIcon}>
                <Ionicons name={EXPENSE_CATEGORY_ICON[c.category] as any} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowTitle}>{EXPENSE_CATEGORY_LABEL[c.category]}</Text>
                  <Text style={styles.rowAmount}>{formatMoney(c.amount)}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(6, pct * 100)}%`, backgroundColor: colors.warning },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <SectionLabel>Filtro</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <FilterChip active={filter === 'all'} label="Todos" onPress={() => setFilter('all')} />
        {(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((c) => (
          <FilterChip
            key={c}
            active={filter === c}
            label={EXPENSE_CATEGORY_LABEL[c]}
            onPress={() => setFilter(c)}
          />
        ))}
      </ScrollView>

      <SectionLabel>Suscripciones y gastos</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {filtered.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => setSelected(e)}
            style={({ pressed }) => [
              styles.expenseRow,
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={styles.chargeIcon}>
              <Ionicons name={EXPENSE_CATEGORY_ICON[e.category] as any} size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{e.name}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {EXPENSE_CATEGORY_LABEL[e.category]} · {EXPENSE_FREQUENCY_LABEL[e.frequency]}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.rowAmount}>{formatMoney(e.amount, e.currency)}</Text>
              <StatusBadge
                label={e.status === 'active' ? humanDaysToNext(e.nextBillingDate) : 'Cancelado'}
                tone={e.status === 'active' ? 'info' : 'muted'}
              />
            </View>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle={selected ? EXPENSE_CATEGORY_LABEL[selected.category] : ''}
        scrollable
      >
        {selected ? <ExpenseDetail expense={selected} /> : null}
      </Modal>
    </View>
  );
}

function ExpenseDetail({ expense }: { expense: Expense }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <DetailRow label="Valor" value={formatMoney(expense.amount, expense.currency)} />
      <DetailRow label="Moneda" value={expense.currency} />
      <DetailRow label="Frecuencia" value={EXPENSE_FREQUENCY_LABEL[expense.frequency]} />
      <DetailRow label="Último cobro" value={new Date(expense.billingDate).toLocaleDateString('es-CO')} />
      <DetailRow label="Próximo cobro" value={new Date(expense.nextBillingDate).toLocaleDateString('es-CO')} />
      <DetailRow label="Método" value={expense.method} />
      <DetailRow
        label="Estado"
        value={expense.status === 'active' ? 'Activo' : 'Cancelado'}
      />
      {expense.notes ? <DetailRow label="Observaciones" value={expense.notes} /> : null}
    </View>
  );
}

// ============================================================================
// 2 · NÓMINA
// ============================================================================
function PayrollSection() {
  const sum = payrollSummary();
  const months = listPayrollMonths();
  const [month, setMonth] = useState<string>(months[0] ?? sum.cm);
  const list = payrollListByMonth(month);
  const paidTotal = list.filter((p) => p.status === 'paid').reduce((s, p) => s + p.total, 0);
  const pendingTotal = list.filter((p) => p.status === 'pending').reduce((s, p) => s + p.total, 0);
  const totalHours = list.reduce((s, p) => s + p.hoursIndividual + p.hoursGroup, 0);
  const avg = list.length ? Math.round((paidTotal + pendingTotal) / list.length) : 0;
  const [selected, setSelected] = useState<PayrollEntry | null>(null);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.kpiGrid}>
        <KpiCard tone="warning" icon="hourglass-outline" label="Por pagar" value={formatMoney(pendingTotal, 'COP')} />
        <KpiCard tone="success" icon="checkmark-circle-outline" label="Pagado" value={formatMoney(paidTotal, 'COP')} />
        <KpiCard tone="info" icon="people-outline" label="Profesores" value={`${list.length}`} hint={`${totalHours} h dictadas`} />
        <KpiCard tone="primary" icon="stats-chart-outline" label="Promedio" value={formatMoney(avg, 'COP')} />
      </View>

      <SectionLabel>Periodo</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {months.map((m) => (
          <FilterChip
            key={m}
            active={m === month}
            label={formatMonthLabel(m)}
            onPress={() => setMonth(m)}
          />
        ))}
      </ScrollView>

      <SectionLabel>Detalle por profesor</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {list.length === 0 ? (
          <Text style={typography.caption}>Sin registros para este periodo.</Text>
        ) : list.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setSelected(p)}
            style={({ pressed }) => [styles.payrollRow, pressed && { opacity: 0.9 }]}
          >
            <Avatar name={p.teacherName} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{p.teacherName}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {p.hoursIndividual} h ind · {p.hoursGroup} h grupal · {p.tier === 'specialist' ? 'Specialist' : 'Essentials'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.rowAmount}>{formatMoney(p.total, 'COP')}</Text>
              <StatusBadge
                label={p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                tone={p.status === 'paid' ? 'success' : 'warning'}
              />
            </View>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.teacherName}
        subtitle={selected ? formatMonthLabel(selected.month) : ''}
        scrollable
      >
        {selected ? <PayrollDetail entry={selected} /> : null}
      </Modal>
    </View>
  );
}

function PayrollDetail({ entry }: { entry: PayrollEntry }) {
  const gross = entry.hoursIndividual * entry.hourlyIndividual + entry.hoursGroup * entry.hourlyGroup;
  return (
    <View style={{ gap: spacing.sm }}>
      <DetailRow label="Categoría" value={entry.tier === 'specialist' ? 'Specialist' : 'Essentials'} />
      <DetailRow label="Horas individuales" value={`${entry.hoursIndividual} h × ${formatMoney(entry.hourlyIndividual, 'COP')}`} />
      <DetailRow label="Horas grupales" value={`${entry.hoursGroup} h × ${formatMoney(entry.hourlyGroup, 'COP')}`} />
      <DetailRow label="Subtotal" value={formatMoney(gross, 'COP')} />
      {entry.bonuses > 0 ? <DetailRow label="Bonificaciones" value={`+ ${formatMoney(entry.bonuses, 'COP')}`} /> : null}
      {entry.deductions > 0 ? <DetailRow label="Descuentos" value={`− ${formatMoney(entry.deductions, 'COP')}`} /> : null}
      <View style={styles.totalRow}>
        <Text style={typography.bodyStrong}>Total</Text>
        <Text style={styles.totalAmount}>{formatMoney(entry.total, 'COP')}</Text>
      </View>
      <DetailRow
        label="Estado"
        value={entry.status === 'paid' ? `Pagado · ${entry.paidAt ? new Date(entry.paidAt).toLocaleDateString('es-CO') : ''}` : 'Pendiente'}
      />
    </View>
  );
}

// ============================================================================
// 3 · INGRESOS
// ============================================================================
function RevenueSection() {
  const sum = revenueSummary();
  const series = monthlyRevenueSeries();
  const bySubject = revenueBySubject();
  const byTeacher = revenueByTeacher();
  const byPackage = revenueByPackage();
  const [selected, setSelected] = useState<RevenueEntry | null>(null);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.kpiGrid}>
        <KpiCard tone="success" icon="today-outline" label="Hoy" value={formatMoney(sum.day)} />
        <KpiCard tone="success" icon="calendar-outline" label="Semana" value={formatMoney(sum.week)} />
        <KpiCard tone="info" icon="stats-chart-outline" label="Mes" value={formatMoney(sum.month)} />
        <KpiCard tone="primary" icon="trending-up-outline" label="Año" value={formatMoney(sum.year)} />
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard tone="info" icon="pricetags-outline" label="Ticket promedio" value={formatMoney(sum.averageTicket)} />
        <KpiCard tone="primary" icon="people-outline" label="Estudiantes activos" value={`${sum.activeStudents}`} />
        <KpiCard tone="info" icon="hourglass-outline" label="Horas vendidas" value={`${sum.totalHoursBought}`} hint={`${sum.totalHoursConsumed} consumidas`} />
        <KpiCard tone="warning" icon="alarm-outline" label="Horas pendientes" value={`${sum.hoursPending}`} />
      </View>

      <SectionLabel>Ingresos mensuales · 12 meses</SectionLabel>
      <View style={styles.card}>
        <BarChart data={series} color={colors.success} formatter={(v) => formatMoney(v)} />
      </View>

      <SectionLabel>Por materia</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {bySubject.map((s) => {
          const max = bySubject[0]?.amount ?? 1;
          const pct = s.amount / max;
          return (
            <View key={s.subject} style={styles.categoryRow}>
              <View style={[styles.chargeIcon, { backgroundColor: colors.infoSoft }]}>
                <Ionicons name="book-outline" size={16} color={colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowTitle}>{s.subject}</Text>
                  <Text style={styles.rowAmount}>{formatMoney(s.amount)}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(6, pct * 100)}%`, backgroundColor: colors.info },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <SectionLabel>Por profesor</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {byTeacher.map((t) => {
          const max = byTeacher[0]?.amount ?? 1;
          const pct = t.amount / max;
          return (
            <View key={t.teacher} style={styles.categoryRow}>
              <Avatar name={t.teacher} size={32} />
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowTitle}>{t.teacher}</Text>
                  <Text style={styles.rowAmount}>{formatMoney(t.amount)}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(6, pct * 100)}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <SectionLabel>Por paquete</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {byPackage.map((p) => (
          <View key={p.pkg} style={styles.packageRow}>
            <View style={styles.chargeIcon}>
              <Ionicons name="cube-outline" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle}>{p.pkg}</Text>
              <Text style={styles.rowMeta}>{p.units} venta{p.units === 1 ? '' : 's'}</Text>
            </View>
            <Text style={styles.rowAmount}>{formatMoney(p.amount)}</Text>
          </View>
        ))}
      </View>

      <SectionLabel>Últimos pagos recibidos</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {revenues
          .slice()
          .sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1))
          .slice(0, 8)
          .map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setSelected(r)}
              style={({ pressed }) => [styles.expenseRow, pressed && { opacity: 0.9 }]}
            >
              <Avatar name={r.studentName} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{r.studentName}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {r.packageName} · {r.method}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.rowAmount}>{formatMoney(r.amount, r.currency)}</Text>
                <StatusBadge
                  label={
                    r.status === 'paid' ? 'Pagado' :
                    r.status === 'refunded' ? 'Reembolsado' : 'Expirado'
                  }
                  tone={
                    r.status === 'paid' ? 'success' :
                    r.status === 'refunded' ? 'muted' : 'danger'
                  }
                />
              </View>
            </Pressable>
          ))}
      </View>

      <Modal
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.studentName}
        subtitle={selected?.packageName}
        scrollable
      >
        {selected ? <RevenueDetail entry={selected} /> : null}
      </Modal>
    </View>
  );
}

function RevenueDetail({ entry }: { entry: RevenueEntry }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {entry.guardianName ? <DetailRow label="Acudiente" value={entry.guardianName} /> : null}
      <DetailRow label="Paquete" value={entry.packageName} />
      <DetailRow label="Horas compradas" value={`${entry.hoursBought}`} />
      <DetailRow label="Horas consumidas" value={`${entry.hoursConsumed}`} />
      <DetailRow label="Horas pendientes" value={`${entry.hoursBought - entry.hoursConsumed}`} />
      <DetailRow label="Valor" value={formatMoney(entry.amount, entry.currency)} />
      <DetailRow label="Método" value={entry.method} />
      <DetailRow label="Fecha" value={new Date(entry.paidAt).toLocaleDateString('es-CO')} />
      {entry.subject ? <DetailRow label="Materia" value={entry.subject} /> : null}
      {entry.teacherName ? <DetailRow label="Profesor" value={entry.teacherName} /> : null}
    </View>
  );
}

// ============================================================================
// Piezas reutilizables
// ============================================================================
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function KpiCard({
  icon, label, value, tone = 'primary', hint,
}: {
  icon: string; label: string; value: string;
  tone?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  hint?: string;
}) {
  const TONES = {
    primary: { bg: colors.surfaceTinted, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const t = TONES[tone];
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon as any} size={16} color={t.fg} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text style={styles.kpiHint} numberOfLines={2}>{hint}</Text> : null}
    </View>
  );
}

function FilterChip({
  active, label, onPress,
}: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendDotWrap}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ─── Gráfico de barras verticales simple ────────────────────────────────────
function BarChart({
  data, color, formatter,
}: {
  data: { label: string; value: number }[];
  color: string;
  formatter?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={chartStyles.wrap}>
      {data.map((d, i) => {
        const h = Math.max(6, Math.round((d.value / max) * 120));
        return (
          <View key={`${d.label}-${i}`} style={chartStyles.col}>
            <View style={chartStyles.trackWrap}>
              <View style={[chartStyles.bar, { height: h, backgroundColor: color }]} />
            </View>
            <Text style={chartStyles.dayLabel}>{d.label}</Text>
            <Text style={chartStyles.dayValue} numberOfLines={1}>
              {formatter ? formatter(d.value).replace(/,\d+/, '') : d.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Cash flow (barras apiladas simples) ────────────────────────────────────
function CashFlowChart({ data }: { data: { label: string; revenue: number; expense: number; profit: number }[] }) {
  const max = Math.max(...data.map((d) => Math.max(d.revenue, d.expense)), 1);
  return (
    <View style={chartStyles.wrap}>
      {data.map((d, i) => {
        const rh = Math.max(4, Math.round((d.revenue / max) * 110));
        const eh = Math.max(4, Math.round((d.expense / max) * 110));
        const profitPositive = d.profit >= 0;
        return (
          <View key={`${d.label}-${i}`} style={chartStyles.col}>
            <View style={cashStyles.pair}>
              <View style={[cashStyles.bar, { height: rh, backgroundColor: colors.success }]} />
              <View style={[cashStyles.bar, { height: eh, backgroundColor: colors.warning }]} />
            </View>
            <Text style={chartStyles.dayLabel}>{d.label}</Text>
            <Text
              style={[
                chartStyles.dayValue,
                { color: profitPositive ? colors.primary : colors.danger },
              ]}
              numberOfLines={1}
            >
              {profitPositive ? '+' : ''}{d.profit >= 1000 ? `${Math.round(d.profit / 100) / 10}k` : d.profit}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ============================================================================
const styles = StyleSheet.create({
  tabsRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSubtle,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    ...shadow.xs,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 4,
    ...shadow.xs,
  },
  kpiIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  kpiValue: {
    ...typography.bodyStrong,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textStrong,
  },
  kpiLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSubtle,
  },
  kpiHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  rowMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowAmount: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textStrong,
  },

  chargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  chargeIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceTinted,
  },

  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  progressTrack: {
    height: 6,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
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
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSubtle,
  },
  filterChipTextActive: { color: colors.textOnPrimary },

  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.xs,
  },

  payrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.xs,
  },

  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  detailLabel: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSubtle,
    flex: 1,
  },
  detailValue: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.textStrong,
    textAlign: 'right',
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTinted,
    marginTop: spacing.sm,
  },
  totalAmount: {
    ...typography.bodyStrong,
    fontSize: 18,
    color: colors.primary,
  },

  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    justifyContent: 'center',
  },
  legendDotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSubtle,
  },
});

const chartStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    paddingTop: spacing.sm,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  trackWrap: {
    height: 130,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: 6,
    opacity: 0.9,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  dayValue: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textStrong,
  },
});

const cashStyles = StyleSheet.create({
  pair: {
    height: 130,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    opacity: 0.9,
  },
});
