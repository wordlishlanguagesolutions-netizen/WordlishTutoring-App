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
// Mi plan · acudiente (P1 · MVP Ready).
//
// Wordlish es 100% prepago. El acudiente es el cliente comercial: aquí
// puede comprar plan, banco de horas o clase individual SIN necesidad
// de iniciar una reserva. El resultado es un dashboard con:
//   · Boton "Adquirir plan" → catálogo (plan destacado + planes + recargas)
//   · Selector del estudiante al que se le acreditan las horas
//   · Estado por estudiante (horas disponibles)
//   · Historial de movimientos
//
// Reutiliza los mismos precios del catalogo mock del rol estudiante para
// no introducir nuevas reglas comerciales.
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

export default function GuardianMyPlan() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { remainingHours } = useBookings();

  const [catalogOpen, setCatalogOpen] = useState<boolean>(false);
  const [activeStudentId, setActiveStudentId] = useState<string>(
    linkedStudents[0]?.id ?? '',
  );

  const activeStudent =
    linkedStudents.find((s) => s.id === activeStudentId) ?? linkedStudents[0];
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
    if (!activeStudent) return;
    Alert.alert(
      plan.name,
      `Confirmarás ${plan.hours} horas por $${plan.price} para ${activeStudent.firstName}. Se abrirá la pasarela de pago.`,
    );
  };

  const chooseTopUp = (t: QuickTopUp) => {
    if (!activeStudent) return;
    Alert.alert(
      `Recarga rápida · ${t.hours} h`,
      `Total $${t.price} para ${activeStudent.firstName}. Se abrirá la pasarela de pago.`,
    );
  };

  // ═════════════ Bloques ═════════════
  const AcquireButton = (
    <Pressable
      onPress={() => setCatalogOpen((v) => !v)}
      style={({ pressed }) => [styles.acquireBtn, pressed && { opacity: 0.9 }]}
    >
      <Ionicons
        name={catalogOpen ? 'chevron-up' : 'add-circle'}
        size={16}
        color={colors.textOnPrimary}
      />
      <Text style={styles.acquireText}>
        {catalogOpen ? 'Cerrar catálogo' : 'Adquirir plan o recarga'}
      </Text>
    </Pressable>
  );

  const StudentSelector = linkedStudents.length > 1 ? (
    <View style={styles.selectorWrap}>
      <Text style={styles.selectorLabel}>Para</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {linkedStudents.map((st) => {
          const on = st.id === activeStudentId;
          return (
            <Pressable
              key={st.id}
              onPress={() => setActiveStudentId(st.id)}
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
                {remainingHours[st.id] ?? 0} h
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  const CatalogPanel = catalogOpen ? (
    <View style={styles.catalog}>
      {StudentSelector}

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

      <Text style={styles.catalogFoot}>
        Wordlish es prepago. Las horas se acreditan al estudiante seleccionado
        y no vencen mientras el plan esté activo.
      </Text>
    </View>
  ) : null;

  const StatusBlock = (
    <View style={styles.statusCard}>
      <View style={styles.statusHead}>
        <Ionicons name="hourglass" size={20} color={colors.primaryDark} />
        <Text style={styles.statusTitle}>Horas disponibles</Text>
      </View>
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        {linkedStudents.map((st) => {
          const hrs = remainingHours[st.id] ?? 0;
          const low = hrs > 0 && hrs <= 2;
          const empty = hrs === 0;
          return (
            <View key={st.id} style={styles.statusRow}>
              <Avatar name={st.name} uri={st.avatar} size={26} />
              <Text style={styles.statusName} numberOfLines={1}>
                {st.firstName}
              </Text>
              <Text
                style={[
                  styles.statusHours,
                  empty && { color: colors.danger },
                  low && { color: colors.warning },
                ]}
              >
                {hrs} {hrs === 1 ? 'hora' : 'horas'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const HistoryBlock = (
    <View>
      <View style={styles.sectionHead}>
        <Text style={typography.h3}>Historial</Text>
      </View>
      {isDesktop ? (
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thCell, { flex: 3 }]}>Concepto</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>Fecha</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>Estado</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>Monto</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}> </Text>
          </View>
          {guardianPaymentsHistory.map((p) => {
            const s = PAYMENT_STATUS[p.status];
            const t = TONE_MAP[s.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
            return (
              <Pressable
                key={p.id}
                onPress={() => openDetail(p.id)}
                style={({ pressed }) => [
                  styles.tableRow,
                  pressed && { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Text style={[styles.tdCell, { flex: 3, fontWeight: '600' }]} numberOfLines={1}>
                  {p.concept}
                </Text>
                <Text style={[styles.tdCell, { flex: 1.5, color: colors.textSubtle }]}>
                  {p.date}
                </Text>
                <View style={{ flex: 1.5 }}>
                  <View style={[styles.badgeSmall, { backgroundColor: t.bg }]}>
                    <Text style={[styles.badgeText, { color: t.fg }]}>{s.label}</Text>
                  </View>
                </View>
                <Text style={[styles.tdCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                  ${p.amount}
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
          {guardianPaymentsHistory.map((p) => {
            const s = PAYMENT_STATUS[p.status];
            const t = TONE_MAP[s.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
            return (
              <Pressable
                key={p.id}
                onPress={() => openDetail(p.id)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{p.concept}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>{p.date}</Text>
                  <View style={[styles.badgeSmall, { backgroundColor: t.bg }]}>
                    <Text style={[styles.badgeText, { color: t.fg }]}>{s.label}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.cardAmount}>${p.amount}</Text>
                  <View style={styles.detailBtn}>
                    <Text style={styles.detailBtnText}>Ver detalle</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.primaryDark} />
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
      <Header title="Mi plan" subtitle="Compra planes y recarga horas" />

      {AcquireButton}
      {CatalogPanel}

      {isDesktop ? (
        <WebTwoColumn
          leftFlex={5}
          rightFlex={7}
          left={StatusBlock}
          right={HistoryBlock}
        />
      ) : (
        <>
          {StatusBlock}
          <View style={{ height: spacing.lg }} />
          {HistoryBlock}
        </>
      )}
    </Screen>
  );
}

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
  catalogFoot: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 17,
  },

  // Selector estudiante
  selectorWrap: { gap: spacing.sm },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
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

  // Estado por estudiante
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  statusName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  statusHours: { fontSize: 14, fontWeight: '700', color: colors.textSubtle },

  // Sección
  sectionHead: { marginBottom: spacing.md },

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

  topUpsRow: {},
  topUpsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
    marginBottom: spacing.sm,
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

  // Historial fila móvil
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
  cardMeta: { fontSize: 12, color: colors.textSubtle },
  cardAmount: { fontSize: 18, fontWeight: '700', color: colors.text },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailBtnText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },

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
  tdCell: { fontSize: 13, color: colors.text, paddingHorizontal: 4 },

  badgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
