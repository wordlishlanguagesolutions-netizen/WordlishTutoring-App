import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, WebTwoColumn } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import {
  paymentsHistory,
  packagesHistory,
  topUpsHistory,
  PAYMENT_STATUS,
  studentAcademic,
  PaymentStatus,
} from '@/services/mockData';

// ============================================================================
// Mi Plan · Fase 3.
// Desktop: dos columnas · izquierda pago pendiente + venta inteligente,
// derecha historial como tabla compacta. Un botón superior "Adquirir nuevo
// plan" abre el catálogo (promos + planes + recargas). Sin duplicaciones.
// Móvil y tablet: layout apilado, contenido idéntico.
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
    tag: 'Recomendado para ti',
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

type Promotion = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  active: boolean;
};

const ACTIVE_PROMOS: Promotion[] = [
  {
    id: 'promo-back-to-class',
    title: 'Regreso a clases',
    subtitle: 'Doble hora en tu próxima recarga esta semana.',
    cta: 'Ver oferta',
    active: true,
  },
];

type Movement = {
  id: string;
  kind: 'payment' | 'package' | 'topup';
  concept: string;
  date: string;
  amount: number;
  status: PaymentStatus;
};

function unifiedMovements(): Movement[] {
  const list: Movement[] = [];
  paymentsHistory.forEach((p) =>
    list.push({
      id: p.id,
      kind: 'payment',
      concept: p.concept,
      date: p.date,
      amount: p.amount,
      status: p.status,
    }),
  );
  packagesHistory.forEach((p) =>
    list.push({
      id: p.id,
      kind: 'package',
      concept: `${p.name} · ${p.totalHours} h`,
      date: p.purchasedAt,
      amount: p.price,
      status: p.status === 'expired' ? 'refunded' : 'paid',
    }),
  );
  topUpsHistory.forEach((t) =>
    list.push({
      id: t.id,
      kind: 'topup',
      concept: `Recarga de ${t.hours} h`,
      date: t.date,
      amount: t.price,
      status: t.status,
    }),
  );
  return list.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export default function StudentMyPlan() {
  const router = useRouter();
  const { isDesktop } = useResponsive();

  const [catalogOpen, setCatalogOpen] = React.useState<boolean>(false);

  const remainingHours = studentAcademic.hoursAvailable;
  const showLowHoursNudge = remainingHours <= 1;

  const featuredPlan = useMemo(
    () => ACTIVE_PLANS.find((p) => p.active && p.featured),
    [],
  );
  const otherPlans = useMemo(
    () => ACTIVE_PLANS.filter((p) => p.active && !p.featured),
    [],
  );
  const promos = useMemo(() => ACTIVE_PROMOS.filter((p) => p.active), []);
  const movements = useMemo(unifiedMovements, []);

  const openDetail = (m: Movement) =>
    router.push(`/payments/${m.id}?kind=${m.kind}` as any);

  const choosePlan = (plan: PlanOffer) =>
    Alert.alert(plan.name, `Confirmarás ${plan.hours} horas por $${plan.price}. Se abrirá la pasarela de pago.`);

  const chooseTopUp = (t: QuickTopUp) =>
    Alert.alert(`Recarga rápida · ${t.hours} h`, `Total $${t.price}. Se abrirá la pasarela de pago.`);

  // ==================== Bloques ====================
  const AcquireButton = (
    <Pressable
      onPress={() => setCatalogOpen((v) => !v)}
      style={({ pressed }) => [
        styles.acquireBtn,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Ionicons
        name={catalogOpen ? 'chevron-up' : 'add-circle'}
        size={16}
        color={colors.textOnPrimary}
      />
      <Text style={styles.acquireText}>
        {catalogOpen ? 'Cerrar catálogo' : 'Adquirir nuevo plan'}
      </Text>
    </Pressable>
  );

  const CatalogPanel = catalogOpen ? (
    <View style={styles.catalog}>
      {promos.map((p) => (
        <View key={p.id} style={styles.promoCard}>
          <View style={styles.promoBadge}>
            <Ionicons name="pricetag" size={11} color={colors.textOnPrimary} />
            <Text style={styles.promoBadgeText}>Solo esta semana</Text>
          </View>
          <Text style={styles.promoTitle}>{p.title}</Text>
          <Text style={styles.promoSubtitle}>{p.subtitle}</Text>
          <Pressable
            onPress={() => Alert.alert(p.title, 'La promoción se aplicará en el checkout.')}
            style={({ pressed }) => [styles.promoBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.promoBtnText}>{p.cta}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.textOnPrimary} />
          </Pressable>
        </View>
      ))}

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

      <View style={styles.topUpsRow}>
        <Text style={styles.topUpsTitle}>Recarga rápida</Text>
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
    </View>
  ) : null;

  const PlanStatusCard = (
    <View style={styles.emptyPayCard}>
      <Ionicons name="hourglass" size={22} color={colors.primaryDark} />
      <View style={{ flex: 1 }}>
        <Text style={styles.emptyPayTitle}>
          {remainingHours} {remainingHours === 1 ? 'hora' : 'horas'} disponibles
        </Text>
        <Text style={styles.emptyPaySubtitle}>Wordlish es prepago: paga y usa cuando quieras.</Text>
      </View>
    </View>
  );

  const NudgeCard = showLowHoursNudge ? (
    <View style={styles.nudgeCard}>
      <View style={styles.nudgeIcon}>
        <Ionicons name="hourglass" size={18} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nudgeTitle}>
          Te queda {remainingHours} {remainingHours === 1 ? 'hora' : 'horas'}.
        </Text>
        <Text style={styles.nudgeSubtitle}>Renueva ahora y continúa sin interrupciones.</Text>
      </View>
      <Pressable
        onPress={() => featuredPlan && choosePlan(featuredPlan)}
        style={({ pressed }) => [styles.nudgeBtn, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.nudgeBtnText}>Renovar plan</Text>
      </Pressable>
    </View>
  ) : null;

  const HistoryBlock = (
    <View>
      <View style={styles.sectionHead}>
        <Text style={typography.h3}>Historial</Text>
      </View>
      {movements.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="time-outline" size={24} color={colors.textMuted} />
          <Text style={typography.caption}>Aquí verás todos tus movimientos.</Text>
        </View>
      ) : isDesktop ? (
        // Tabla compacta desktop
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thCell, { flex: 3 }]}>Concepto</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>Fecha</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>Estado</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>Monto</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}> </Text>
          </View>
          {movements.map((m) => {
            const info = PAYMENT_STATUS[m.status];
            const t = TONE_MAP[info.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
            return (
              <Pressable
                key={m.kind + m.id}
                onPress={() => openDetail(m)}
                style={({ pressed }) => [styles.tableRow, pressed && { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.tdCell, { flex: 3, fontWeight: '600' }]} numberOfLines={1}>
                  {m.concept}
                </Text>
                <Text style={[styles.tdCell, { flex: 1.5, color: colors.textSubtle }]}>{m.date}</Text>
                <View style={{ flex: 1.5 }}>
                  <View style={[styles.badgeSmall, { backgroundColor: t.bg }]}>
                    <Text style={[styles.badgeText, { color: t.fg }]}>{info.label}</Text>
                  </View>
                </View>
                <Text style={[styles.tdCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                  ${m.amount}
                </Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={styles.detailBtn}>
                    <Text style={styles.detailBtnText}>Ver detalle</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.primaryDark} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {movements.map((m) => (
            <MovementRow key={m.kind + m.id} m={m} onPress={() => openDetail(m)} />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Screen>
      <Header
        title="Mi plan"
        subtitle={`Te quedan ${remainingHours} ${remainingHours === 1 ? 'hora' : 'horas'} para seguir estudiando`}
      />

      {AcquireButton}
      {CatalogPanel}

      {isDesktop ? (
        <WebTwoColumn
          leftFlex={5}
          rightFlex={7}
          left={
            <View style={{ gap: spacing.md }}>
              {PlanStatusCard}
              {NudgeCard}
            </View>
          }
          right={HistoryBlock}
        />
      ) : (
        <>
          {PlanStatusCard}
          {NudgeCard}
          {HistoryBlock}
        </>
      )}
    </Screen>
  );
}

function MovementRow({ m, onPress }: { m: Movement; onPress: () => void }) {
  const info = PAYMENT_STATUS[m.status];
  const t = TONE_MAP[info.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{m.concept}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{m.date}</Text>
        <View style={[styles.badgeSmall, { backgroundColor: t.bg }]}>
          <Text style={[styles.badgeText, { color: t.fg }]}>{info.label}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={styles.cardAmount}>${m.amount}</Text>
        <View style={styles.detailBtn}>
          <Text style={styles.detailBtnText}>Ver detalle</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primaryDark} />
        </View>
      </View>
    </Pressable>
  );
}

const TONE_MAP = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  muted: { bg: colors.surfaceAlt, fg: colors.textMuted },
} as const;

const styles = StyleSheet.create({
  // Acquire button
  acquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  acquireText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 },

  // Catalog panel
  catalog: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },

  // Próximo pago
  nextCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  nextLabel: {
    fontSize: 10, color: colors.textMuted, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  nextConcept: { fontSize: 17, fontWeight: '700', color: colors.text },
  nextMetaRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 6,
  },
  nextMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextMetaText: { fontSize: 12, color: colors.textSubtle, fontWeight: '500' },
  nextAmount: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  badge: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  nextActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  payBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.md,
  },
  payBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
  softBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  softBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  receiptSent: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.successSoft, padding: spacing.md,
    borderRadius: radius.md, marginTop: spacing.md,
  },
  receiptTitle: { fontSize: 14, fontWeight: '700', color: colors.success },
  receiptSubtitle: { fontSize: 12, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },

  // Empty pay
  emptyPayCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  emptyPayTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  emptyPaySubtitle: { fontSize: 12, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },

  // Venta inteligente
  nudgeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.primaryLight,
    ...shadow.sm,
  },
  nudgeIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  nudgeTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  nudgeSubtitle: { fontSize: 12, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },
  nudgeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md,
  },
  nudgeBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 12 },

  // Section
  sectionHead: { marginBottom: spacing.md },

  // Promo
  promoCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  promoBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.pill, marginBottom: spacing.sm,
  },
  promoBadgeText: {
    color: colors.textOnPrimary, fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  promoTitle: { color: colors.textOnPrimary, fontSize: 18, fontWeight: '700' },
  promoSubtitle: { color: colors.primarySoft, fontSize: 13, marginTop: 4, lineHeight: 18, fontWeight: '500' },
  promoBtn: {
    marginTop: spacing.md, alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md,
  },
  promoBtnText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },

  // Plan destacado
  featuredCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1.5, borderColor: colors.primary,
  },
  featuredTag: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.pill, marginBottom: spacing.sm,
  },
  featuredTagText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  planName: { fontSize: 18, fontWeight: '700', color: colors.text },
  planHours: { fontSize: 14, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },
  planPriceRow: {
    flexDirection: 'row', alignItems: 'baseline',
    gap: spacing.sm, marginTop: spacing.sm,
  },
  planPrice: { fontSize: 28, fontWeight: '700', color: colors.text },
  planSaves: { fontSize: 13, color: colors.success, fontWeight: '700' },
  planBtn: {
    marginTop: spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.md,
  },
  planBtnText: { color: colors.textOnPrimary, fontSize: 14, fontWeight: '700' },

  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  planHoursSm: { fontSize: 12, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },
  planPriceSm: { fontSize: 18, fontWeight: '700', color: colors.text },
  planBtnSm: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md,
  },
  planBtnSmText: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '700' },

  topUpsRow: {},
  topUpsTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textSubtle, marginBottom: spacing.sm,
  },
  topUpsGrid: { flexDirection: 'row', gap: spacing.sm },
  topUpChip: {
    flex: 1, alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.md, gap: 2,
  },
  topUpHours: { fontSize: 13, fontWeight: '700', color: colors.text },
  topUpPrice: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },

  // Historial fila móvil
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textSubtle },
  cardAmount: { fontSize: 18, fontWeight: '700', color: colors.text },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailBtnText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center', gap: spacing.sm, padding: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },

  // Tabla desktop
  table: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tdCell: {
    fontSize: 13,
    color: colors.text,
    paddingHorizontal: 4,
  },
});
