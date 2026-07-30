import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, WebTwoColumn, Avatar } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import {
  guardianPaymentsHistory,
  PAYMENT_STATUS,
  linkedStudents,
} from '@/services/mockData';
import { useBookings } from '@/hooks/useBookings';

// ============================================================================
// Mi plan · dashboard del acudiente (P2 · MVP Ready).
//
// Único punto de administración financiera por estudiante:
//   · Resumen (plan activo, estado, horas, próximo vencimiento)
//   · Acciones rápidas (comprar plan / banco / recarga / métodos de pago)
//   · Último pago + historial de pagos e "invoice" (recibo por pago)
//
// Reutiliza el catálogo mock existente (mismos precios que estudiante)
// y filtra el historial por el estudiante seleccionado. Cambia según
// el selector superior si el acudiente tiene varios estudiantes. Todo
// vive en una sola pantalla, con dos columnas en desktop.
//
// Compatibilidad Cloud: la fuente de datos hoy son mocks (linkedStudents +
// guardianPaymentsHistory + useBookings.remainingHours); cuando se migre
// Payments a Cloud basta con inyectar los mismos shapes desde el servicio,
// sin cambios en la UI.
// ============================================================================

type PlanOffer = {
  id: string;
  name: string;
  hours: number;
  price: number;
  saves?: number;
  tag?: string;
  featured?: boolean;
  active: boolean;
};

const ACTIVE_PLANS: PlanOffer[] = [
  {
    id: 'plan-extend-8',
    name: 'Plan Extend',
    hours: 8,
    price: 100,
    saves: 20,
    tag: 'Mejor precio por hora',
    featured: true,
    active: true,
  },
  {
    id: 'plan-regular-4',
    name: 'Plan Regular',
    hours: 4,
    price: 55,
    active: true,
  },
];

type QuickTopUp = { hours: number; price: number };
const ACTIVE_TOPUPS: QuickTopUp[] = [
  { hours: 1, price: 14 },
  { hours: 2, price: 27 },
  { hours: 3, price: 40 },
];

const TONE_MAP = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  muted: { bg: colors.surfaceAlt, fg: colors.textMuted },
} as const;

// Modo del panel de catálogo. El botón de accion rápida abre el panel
// directamente en la sección elegida, sin crear pantallas nuevas.
type CatalogMode = 'plans' | 'bank' | 'topup' | 'methods' | null;

export default function GuardianMyPlan() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { remainingHours } = useBookings();

  const [activeStudentId, setActiveStudentId] = useState<string>(
    linkedStudents[0]?.id ?? '',
  );
  const [catalogMode, setCatalogMode] = useState<CatalogMode>(null);

  const activeStudent =
    linkedStudents.find((s) => s.id === activeStudentId) ?? linkedStudents[0];

  // ─── Datos derivados del estudiante activo ─────────────────────────
  const remaining = remainingHours[activeStudent.id] ?? activeStudent.remaining;
  const total = activeStudent.total;
  const consumed = Math.max(0, total - remaining);
  const planName = `Paquete ${total} horas`;
  const isLow = remaining > 0 && remaining <= 2;
  const isEmpty = remaining === 0;
  const nextRenewal = '15 Ago 2026'; // Mock · reemplazable por Cloud

  // Historial filtrado por el estudiante activo. Filtra por firstName
  // dentro del concepto (patrón "Paquete X horas · Lucía").
  const studentHistory = useMemo(
    () =>
      guardianPaymentsHistory.filter((p) =>
        p.concept.toLowerCase().includes(activeStudent.firstName.toLowerCase()),
      ),
    [activeStudent.id],
  );
  const lastPayment = studentHistory[0];

  const featuredPlan = useMemo(
    () => ACTIVE_PLANS.find((p) => p.active && p.featured),
    [],
  );
  const otherPlans = useMemo(
    () => ACTIVE_PLANS.filter((p) => p.active && !p.featured),
    [],
  );

  const openDetail = (id: string) =>
    router.push(`/payments/${id}?kind=guardianPayment` as any);

  const choosePlan = (plan: PlanOffer) => {
    Alert.alert(
      plan.name,
      `Confirmarás ${plan.hours} horas por $${plan.price} para ${activeStudent.firstName}. Se abrirá la pasarela de pago.`,
    );
  };

  const chooseTopUp = (t: QuickTopUp) => {
    Alert.alert(
      `Recarga rápida · ${t.hours} h`,
      `Total $${t.price} para ${activeStudent.firstName}. Se abrirá la pasarela de pago.`,
    );
  };

  const openCatalog = (mode: CatalogMode) => {
    setCatalogMode((prev) => (prev === mode ? null : mode));
  };

  // ══════════════════ Bloques ══════════════════
  const StudentSelector = linkedStudents.length > 1 ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
      style={{ marginBottom: spacing.md }}
    >
      {linkedStudents.map((st) => {
        const on = st.id === activeStudentId;
        const hrs = remainingHours[st.id] ?? st.remaining;
        return (
          <Pressable
            key={st.id}
            onPress={() => {
              setActiveStudentId(st.id);
              setCatalogMode(null);
            }}
            style={[styles.studentChip, on && styles.studentChipOn]}
          >
            <Avatar name={st.name} uri={st.avatar} size={22} />
            <Text
              style={[
                styles.studentChipText,
                on && { color: colors.textOnPrimary },
              ]}
            >
              {st.firstName}
            </Text>
            <Text
              style={[
                styles.studentChipHours,
                on && { color: colors.primarySoft },
              ]}
            >
              {hrs} h
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  ) : null;

  const SummaryCard = (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHead}>
        <Avatar
          name={activeStudent.name}
          uri={activeStudent.avatar}
          size={44}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryName}>{activeStudent.name}</Text>
          <Text style={styles.summaryPlan}>{planName}</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            isEmpty
              ? { backgroundColor: colors.dangerSoft }
              : isLow
              ? { backgroundColor: colors.warningSoft }
              : { backgroundColor: colors.successSoft },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isEmpty
                  ? colors.danger
                  : isLow
                  ? colors.warning
                  : colors.success,
              },
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              {
                color: isEmpty
                  ? colors.danger
                  : isLow
                  ? colors.warning
                  : colors.success,
              },
            ]}
          >
            {isEmpty ? 'Sin horas' : isLow ? 'Saldo bajo' : 'Activo'}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{remaining}</Text>
          <Text style={styles.metricLabel}>disponibles</Text>
        </View>
        <View style={styles.metricSep} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.textSubtle }]}>
            {consumed}
          </Text>
          <Text style={styles.metricLabel}>consumidas</Text>
        </View>
        <View style={styles.metricSep} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.textSubtle }]}>
            {total}
          </Text>
          <Text style={styles.metricLabel}>totales</Text>
        </View>
      </View>

      <View style={styles.renewalRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
        <Text style={styles.renewalText}>Próxima renovación · {nextRenewal}</Text>
      </View>
    </View>
  );

  const QuickActions = (
    <View style={styles.actionsGrid}>
      <ActionBtn
        icon="pricetags"
        label="Comprar plan"
        active={catalogMode === 'plans'}
        onPress={() => openCatalog('plans')}
      />
      <ActionBtn
        icon="library"
        label="Banco de horas"
        active={catalogMode === 'bank'}
        onPress={() => openCatalog('bank')}
      />
      <ActionBtn
        icon="add-circle"
        label="Horas adicionales"
        active={catalogMode === 'topup'}
        onPress={() => openCatalog('topup')}
      />
      <ActionBtn
        icon="card"
        label="Métodos de pago"
        active={catalogMode === 'methods'}
        onPress={() => openCatalog('methods')}
      />
    </View>
  );

  const CatalogPanel = catalogMode ? (
    <View style={styles.catalog}>
      {catalogMode === 'plans' || catalogMode === 'bank' ? (
        <>
          {featuredPlan ? (
            <View style={styles.featuredCard}>
              {featuredPlan.tag ? (
                <View style={styles.featuredTag}>
                  <Ionicons name="star" size={11} color={colors.primaryDark} />
                  <Text style={styles.featuredTagText}>{featuredPlan.tag}</Text>
                </View>
              ) : null}
              <Text style={styles.planName}>{featuredPlan.name}</Text>
              <Text style={styles.planHours}>{featuredPlan.hours} horas</Text>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>${featuredPlan.price}</Text>
                {featuredPlan.saves ? (
                  <Text style={styles.planSaves}>Ahorra ${featuredPlan.saves}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => choosePlan(featuredPlan)}
                style={({ pressed }) => [styles.planBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.planBtnText}>Elegir plan</Text>
              </Pressable>
            </View>
          ) : null}

          {otherPlans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planHoursSm}>{plan.hours} horas</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Text style={styles.planPriceSm}>${plan.price}</Text>
                <Pressable
                  onPress={() => choosePlan(plan)}
                  style={({ pressed }) => [styles.planBtnSm, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.planBtnSmText}>Elegir</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {catalogMode === 'topup' ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.topUpsTitle}>Horas adicionales</Text>
          <View style={styles.topUpsGrid}>
            {ACTIVE_TOPUPS.map((t) => (
              <Pressable
                key={t.hours}
                onPress={() => chooseTopUp(t)}
                style={({ pressed }) => [styles.topUpChip, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.topUpHours}>
                  {t.hours} {t.hours === 1 ? 'hora' : 'horas'}
                </Text>
                <Text style={styles.topUpPrice}>${t.price}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {catalogMode === 'methods' ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.topUpsTitle}>Métodos aceptados</Text>
          <MethodRow icon="phone-portrait" label="Yappy" hint="Pago instantáneo" />
          <MethodRow icon="business" label="ACH" hint="Transferencia bancaria" />
          <MethodRow icon="card" label="Tarjeta" hint="Débito o crédito" />
          <Text style={styles.methodsFoot}>
            Los métodos se aplican al confirmar la reserva o la compra.
          </Text>
        </View>
      ) : null}

      <Text style={styles.catalogFoot}>
        Las horas se acreditan a {activeStudent.firstName}. Wordlish es prepago.
      </Text>
    </View>
  ) : null;

  const LastPaymentCard = lastPayment ? (
    (() => {
      const st = PAYMENT_STATUS[lastPayment.status];
      const t = TONE_MAP[st.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
      return (
        <Pressable
          onPress={() => openDetail(lastPayment.id)}
          style={({ pressed }) => [styles.lastPayCard, pressed && { opacity: 0.95 }]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.lastPayLabel}>Último pago</Text>
            <Text style={styles.lastPayConcept} numberOfLines={1}>
              {lastPayment.concept}
            </Text>
            <Text style={styles.lastPayMeta}>{lastPayment.date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={styles.lastPayAmount}>${lastPayment.amount}</Text>
            <View style={[styles.badgeSmall, { backgroundColor: t.bg }]}>
              <Text style={[styles.badgeText, { color: t.fg }]}>{st.label}</Text>
            </View>
          </View>
        </Pressable>
      );
    })()
  ) : (
    <View style={styles.emptyPay}>
      <Ionicons name="time-outline" size={22} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.emptyPayTitle}>Sin pagos registrados</Text>
        <Text style={styles.emptyPaySubtitle}>
          Al comprar un plan aparecerá aquí.
        </Text>
      </View>
    </View>
  );

  const HistoryBlock = (
    <View>
      <View style={styles.sectionHead}>
        <Text style={typography.h3}>Historial</Text>
        <Text style={styles.sectionCount}>{studentHistory.length}</Text>
      </View>
      {studentHistory.length === 0 ? (
        <View style={styles.emptyHistory}>
          <Text style={typography.caption}>
            Aún no hay pagos para {activeStudent.firstName}.
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {studentHistory.map((p) => {
            const st = PAYMENT_STATUS[p.status];
            const t = TONE_MAP[st.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
            return (
              <Pressable
                key={p.id}
                onPress={() => openDetail(p.id)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{p.concept}</Text>
                  <Text style={styles.cardMeta}>{p.date} · {p.method}</Text>
                  <View style={[styles.badgeSmall, { backgroundColor: t.bg }]}>
                    <Text style={[styles.badgeText, { color: t.fg }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.cardAmount}>${p.amount}</Text>
                  <View style={styles.detailBtn}>
                    <Ionicons name="receipt-outline" size={12} color={colors.primaryDark} />
                    <Text style={styles.detailBtnText}>Recibo</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <Screen>
      <Header
        title="Mi plan"
        subtitle={
          linkedStudents.length > 1
            ? `Administra el plan de ${activeStudent.firstName}`
            : 'Plan, horas y pagos'
        }
      />

      {StudentSelector}

      {isDesktop ? (
        <WebTwoColumn
          leftFlex={5}
          rightFlex={7}
          left={
            <View style={{ gap: spacing.md }}>
              {SummaryCard}
              {QuickActions}
              {CatalogPanel}
            </View>
          }
          right={
            <View style={{ gap: spacing.md }}>
              {LastPaymentCard}
              {HistoryBlock}
            </View>
          }
        />
      ) : (
        <>
          {SummaryCard}
          <View style={{ height: spacing.md }} />
          {QuickActions}
          {CatalogPanel ? (
            <>
              <View style={{ height: spacing.md }} />
              {CatalogPanel}
            </>
          ) : null}
          <View style={{ height: spacing.lg }} />
          {LastPaymentCard}
          <View style={{ height: spacing.lg }} />
          {HistoryBlock}
        </>
      )}
    </Screen>
  );
}

function ActionBtn({
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
        styles.actionBtn,
        active && styles.actionBtnOn,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          active && { backgroundColor: colors.primary },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={16}
          color={active ? colors.textOnPrimary : colors.primaryDark}
        />
      </View>
      <Text
        style={[
          styles.actionLabel,
          active && { color: colors.primaryDark },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MethodRow({
  icon,
  label,
  hint,
}: {
  icon: string;
  label: string;
  hint: string;
}) {
  return (
    <View style={styles.methodRow}>
      <View style={styles.methodIcon}>
        <Ionicons name={icon as any} size={16} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.methodLabel}>{label}</Text>
        <Text style={styles.methodHint}>{hint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Selector estudiante ────────────────────────────────────────────
  studentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  studentChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  studentChipText: {
    color: colors.textSubtle,
    fontWeight: '700',
    fontSize: 13,
  },
  studentChipHours: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // ─── Summary Card ───────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  summaryPlan: {
    fontSize: 13,
    color: colors.textSubtle,
    marginTop: 2,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: -0.4,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  metricSep: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },

  renewalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  renewalText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // ─── Quick actions ──────────────────────────────────────────────────
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionBtnOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },

  // ─── Catalog panel ──────────────────────────────────────────────────
  catalog: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  catalogFoot: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 17,
  },

  // Plan destacado
  featuredCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  featuredTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  featuredTagText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  planName: { fontSize: 18, fontWeight: '700', color: colors.text },
  planHours: { fontSize: 14, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  planPrice: { fontSize: 28, fontWeight: '700', color: colors.text },
  planSaves: { fontSize: 13, color: colors.success, fontWeight: '700' },
  planBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  planBtnText: { color: colors.textOnPrimary, fontSize: 14, fontWeight: '700' },

  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHoursSm: { fontSize: 12, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },
  planPriceSm: { fontSize: 18, fontWeight: '700', color: colors.text },
  planBtnSm: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  planBtnSmText: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '700' },

  topUpsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
  },
  topUpsGrid: { flexDirection: 'row', gap: spacing.sm },
  topUpChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    gap: 2,
  },
  topUpHours: { fontSize: 13, fontWeight: '700', color: colors.text },
  topUpPrice: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },

  // Methods
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  methodIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  methodHint: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  methodsFoot: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // ─── Último pago + historial ────────────────────────────────────────
  lastPayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  lastPayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  lastPayConcept: { fontSize: 15, fontWeight: '700', color: colors.text },
  lastPayMeta: { fontSize: 12, color: colors.textSubtle, fontWeight: '500' },
  lastPayAmount: { fontSize: 22, fontWeight: '700', color: colors.text },

  emptyPay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyPayTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  emptyPaySubtitle: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  emptyHistory: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textSubtle, fontWeight: '500' },
  cardAmount: { fontSize: 17, fontWeight: '700', color: colors.text },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailBtnText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },

  badgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
