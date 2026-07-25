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
  addExpense,
  updateExpense,
  deleteExpense,
  hydrateExpenses,
  markPayrollPaid,
  markPayrollPending,
  listPayrollTeachers,
  payrollBySubject,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_ICON,
  EXPENSE_FREQUENCY_LABEL,
  type Expense,
  type ExpenseFrequency,
  type ExpenseStatus,
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
  const [, setCloudTick] = useState(0);

  React.useEffect(() => {
    // Sincroniza gastos desde OnSpace Cloud al montar el panel.
    let mounted = true;
    hydrateExpenses()
      .then(() => { if (mounted) setCloudTick((t) => t + 1); })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

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
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const exp = useMemo(() => expenseSummary(), [tick]);
  const byCategory = useMemo(() => expensesByCategory(), [tick]);
  const series = useMemo(() => monthlyExpenseSeries(), [tick]);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<ExpenseCategory | 'all'>('all');
  const [formMode, setFormMode] = useState<
    | null
    | { mode: 'create' }
    | { mode: 'edit'; expense: Expense }
  >(null);

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? expenses.slice()
        : expenses.filter((e) => e.category === filter),
    [filter, tick],
  );

  const handleSaved = () => {
    setFormMode(null);
    refresh();
  };

  const handleDelete = (id: string) => {
    void deleteExpense(id);
    setSelected(null);
    refresh();
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.kpiGrid}>
        <KpiCard tone="warning" icon="trending-down-outline" label="Gasto mensual" value={formatMoney(exp.month)} />
        <KpiCard tone="warning" icon="pie-chart-outline" label="Gasto anual" value={formatMoney(exp.year)} />
        <KpiCard tone="info" icon="time-outline" label="Cobros en 14 d" value={`${exp.upcoming.length}`} />
      </View>

      <Pressable
        onPress={() => setFormMode({ mode: 'create' })}
        style={({ pressed }) => [styles.primaryCta, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="add-circle" size={18} color={colors.textOnPrimary} />
        <Text style={styles.primaryCtaText}>Nuevo gasto</Text>
      </Pressable>

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
        {selected ? (
          <View style={{ gap: spacing.md }}>
            <ExpenseDetail expense={selected} />
            <View style={styles.detailActions}>
              <Pressable
                onPress={() => {
                  const target = selected;
                  setSelected(null);
                  setFormMode({ mode: 'edit', expense: target });
                }}
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="create-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.secondaryBtnText}>Editar</Text>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(selected.id)}
                style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.dangerBtnText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Modal>

      <ExpenseFormModal
        mode={formMode}
        onClose={() => setFormMode(null)}
        onSaved={handleSaved}
      />
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
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const sum = useMemo(() => payrollSummary(), [tick]);
  const months = useMemo(() => listPayrollMonths(), [tick]);
  const [month, setMonth] = useState<string>(months[0] ?? sum.cm);
  const teachers = useMemo(() => listPayrollTeachers(), [tick]);
  const [teacherFilter, setTeacherFilter] = useState<string | 'all'>('all');

  const list = useMemo(() => {
    const base = payrollListByMonth(month);
    return teacherFilter === 'all'
      ? base
      : base.filter((p) => p.teacherId === teacherFilter);
  }, [month, teacherFilter, tick]);

  const bySubject = useMemo(() => payrollBySubject(month), [month, tick]);

  const paidTotal = list.filter((p) => p.status === 'paid').reduce((s, p) => s + p.total, 0);
  const pendingTotal = list.filter((p) => p.status === 'pending').reduce((s, p) => s + p.total, 0);
  const totalHours = list.reduce((s, p) => s + p.hoursIndividual + p.hoursGroup, 0);
  const avg = list.length ? Math.round((paidTotal + pendingTotal) / list.length) : 0;
  const [selected, setSelected] = useState<PayrollEntry | null>(null);

  const handleTogglePaid = (entry: PayrollEntry) => {
    if (entry.status === 'pending') markPayrollPaid(entry.id);
    else markPayrollPending(entry.id);
    refresh();
    setSelected(null);
  };

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

      <SectionLabel>Profesor</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <FilterChip
          active={teacherFilter === 'all'}
          label="Todos"
          onPress={() => setTeacherFilter('all')}
        />
        {teachers.map((t) => (
          <FilterChip
            key={t.id}
            active={teacherFilter === t.id}
            label={t.name.replace('Prof. ', '')}
            onPress={() => setTeacherFilter(t.id)}
          />
        ))}
      </ScrollView>

      <SectionLabel>Detalle por profesor</SectionLabel>
      <View style={{ gap: spacing.sm }}>
        {list.length === 0 ? (
          <Text style={typography.caption}>Sin registros para este periodo.</Text>
        ) : list.map((p) => (
          <View key={p.id} style={styles.payrollRow}>
            <Pressable
              onPress={() => setSelected(p)}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
                pressed && { opacity: 0.85 },
              ]}
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
            {p.status === 'pending' ? (
              <Pressable
                onPress={() => handleTogglePaid(p)}
                style={({ pressed }) => [styles.payAction, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
                <Text style={styles.payActionText}>Pagar</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <SectionLabel>Costo por materia</SectionLabel>
      {bySubject.length === 0 ? (
        <Text style={typography.caption}>Sin datos suficientes para distribuir por materia.</Text>
      ) : (
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
                    <Text style={styles.rowAmount}>{formatMoney(s.amount, 'COP')}</Text>
                  </View>
                  <Text style={styles.rowMeta}>{s.hours} h estimadas</Text>
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
      )}

      <Modal
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.teacherName}
        subtitle={selected ? formatMonthLabel(selected.month) : ''}
        scrollable
        primaryAction={
          selected
            ? {
                label: selected.status === 'paid' ? 'Marcar pendiente' : 'Marcar pagado',
                onPress: () => handleTogglePaid(selected),
              }
            : undefined
        }
        secondaryAction={
          selected
            ? { label: 'Cerrar', onPress: () => setSelected(null) }
            : undefined
        }
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

// ─── Formulario de gasto (crear / editar) ───────────────────────────────────
function ExpenseFormModal({
  mode,
  onClose,
  onSaved,
}: {
  mode: null | { mode: 'create' } | { mode: 'edit'; expense: Expense };
  onClose: () => void;
  onSaved: () => void;
}) {
  const visible = !!mode;
  const editing = mode?.mode === 'edit' ? mode.expense : null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('software');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [frequency, setFrequency] = useState<ExpenseFrequency>('monthly');
  const [billingDate, setBillingDate] = useState('');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [method, setMethod] = useState('Tarjeta');
  const [status, setStatus] = useState<ExpenseStatus>('active');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    if (editing) {
      setName(editing.name);
      setCategory(editing.category);
      setAmount(String(editing.amount));
      setCurrency(editing.currency);
      setFrequency(editing.frequency);
      setBillingDate(editing.billingDate);
      setNextBillingDate(editing.nextBillingDate);
      setMethod(editing.method);
      setStatus(editing.status);
      setNotes(editing.notes ?? '');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      setName('');
      setCategory('software');
      setAmount('');
      setCurrency('USD');
      setFrequency('monthly');
      setBillingDate(today);
      setNextBillingDate(next.toISOString().slice(0, 10));
      setMethod('Tarjeta');
      setStatus('active');
      setNotes('');
    }
  }, [visible, editing]);

  const handleSave = () => {
    const parsed = Number(amount.replace(/[^0-9.]/g, '')) || 0;
    const payload = {
      name: name.trim() || 'Sin nombre',
      category,
      amount: parsed,
      currency: currency.trim().toUpperCase() || 'USD',
      frequency,
      billingDate: billingDate || new Date().toISOString().slice(0, 10),
      nextBillingDate: nextBillingDate || billingDate || new Date().toISOString().slice(0, 10),
      method: method.trim() || 'Tarjeta',
      status,
      notes: notes.trim() || undefined,
    };
    if (editing) void updateExpense(editing.id, payload);
    else void addExpense(payload);
    onSaved();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar gasto' : 'Nuevo gasto'}
      subtitle={editing ? EXPENSE_CATEGORY_LABEL[editing.category] : 'Registrar un costo operativo'}
      scrollable
      primaryAction={{ label: 'Guardar', onPress: handleSave }}
      secondaryAction={{ label: 'Cancelar', onPress: onClose }}
    >
      <View style={{ gap: spacing.md }}>
        <FormField label="Nombre">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Zoom Pro"
            placeholderTextColor={colors.textMuted}
            style={formStyles.input}
          />
        </FormField>

        <FormField label="Categoría">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((c) => (
              <FilterChip
                key={c}
                active={category === c}
                label={EXPENSE_CATEGORY_LABEL[c]}
                onPress={() => setCategory(c)}
              />
            ))}
          </ScrollView>
        </FormField>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 2 }}>
            <FormField label="Valor">
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={formStyles.input}
              />
            </FormField>
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Moneda">
              <TextInput
                value={currency}
                onChangeText={setCurrency}
                autoCapitalize="characters"
                maxLength={4}
                placeholder="USD"
                placeholderTextColor={colors.textMuted}
                style={formStyles.input}
              />
            </FormField>
          </View>
        </View>

        <FormField label="Frecuencia">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(Object.keys(EXPENSE_FREQUENCY_LABEL) as ExpenseFrequency[]).map((f) => (
              <FilterChip
                key={f}
                active={frequency === f}
                label={EXPENSE_FREQUENCY_LABEL[f]}
                onPress={() => setFrequency(f)}
              />
            ))}
          </ScrollView>
        </FormField>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <FormField label="Fecha de cobro">
              <TextInput
                value={billingDate}
                onChangeText={setBillingDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={formStyles.input}
              />
            </FormField>
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Próximo cobro">
              <TextInput
                value={nextBillingDate}
                onChangeText={setNextBillingDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={formStyles.input}
              />
            </FormField>
          </View>
        </View>

        <FormField label="Método de pago">
          <TextInput
            value={method}
            onChangeText={setMethod}
            placeholder="Tarjeta, PayPal, Transferencia…"
            placeholderTextColor={colors.textMuted}
            style={formStyles.input}
          />
        </FormField>

        <FormField label="Estado">
          <View style={styles.filterRow}>
            <FilterChip
              active={status === 'active'}
              label="Activo"
              onPress={() => setStatus('active')}
            />
            <FilterChip
              active={status === 'cancelled'}
              label="Cancelado"
              onPress={() => setStatus('cancelled')}
            />
          </View>
        </FormField>

        <FormField label="Observaciones">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas internas (opcional)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            style={[formStyles.input, formStyles.textarea]}
          />
        </FormField>
      </View>
    </Modal>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={formStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ============================================================================
const formStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textStrong,
    backgroundColor: colors.surface,
  },
  textarea: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
});

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
    flexDirection: 'column',
    gap: spacing.sm,
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

  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.pill,
    ...shadow.sm,
  },
  primaryCtaText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  detailActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  dangerBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },

  payAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  payActionText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
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
