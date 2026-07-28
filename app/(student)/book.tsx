import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Header, WebTwoColumn } from '@/components/ui';
import { BookingCard } from '@/components/booking';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { useBookings } from '@/hooks/useBookings';
import {
  currentStudent,
  studentAcademic,
  paymentsHistory,
  packagesHistory,
  topUpsHistory,
  PAYMENT_STATUS,
  PaymentStatus,
} from '@/services/mockData';

// ============================================================================
// Reservas del estudiante · flujo unificado.
//
// Filosofía: "una necesidad = un solo flujo". Reservar clase y pagar dejan
// de ser módulos separados. Todo vive en esta pantalla:
//   1. CTA "Reservar clase" (inicia el wizard de 3 pasos con pago inline).
//   2. Estado del plan: horas disponibles + pago pendiente (si aplica) +
//      catálogo colapsable para adquirir plan / recarga.
//   3. Próximas clases.
//   4. Historial unificado (reservas + pagos + paquetes + recargas).
// ============================================================================

type PlanOffer = { id: string; name: string; hours: number; price: number; saves?: number; featured?: boolean };
const ACTIVE_PLANS: PlanOffer[] = [
  { id: 'plan-extend-8', name: 'Plan Extend', hours: 8, price: 100, saves: 20, featured: true },
  { id: 'plan-regular-4', name: 'Plan Regular', hours: 4, price: 55 },
];
const ACTIVE_TOPUPS = [
  { hours: 1, price: 14 },
  { hours: 2, price: 27 },
  { hours: 3, price: 40 },
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
    list.push({ id: p.id, kind: 'payment', concept: p.concept, date: p.date, amount: p.amount, status: p.status }),
  );
  packagesHistory.forEach((p) =>
    list.push({
      id: p.id, kind: 'package',
      concept: `${p.name} · ${p.totalHours} h`,
      date: p.purchasedAt, amount: p.price,
      status: p.status === 'expired' ? 'refunded' : 'paid',
    }),
  );
  topUpsHistory.forEach((t) =>
    list.push({ id: t.id, kind: 'topup', concept: `Recarga de ${t.hours} h`, date: t.date, amount: t.price, status: t.status }),
  );
  return list.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
}

const TONE_MAP = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  muted: { bg: colors.surfaceAlt, fg: colors.textMuted },
} as const;

export default function StudentBookHub() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { getForStudent } = useBookings();

  const today = new Date().toISOString().split('T')[0];
  const all = getForStudent(currentStudent.id);
  const upcoming = all
    .filter((b) => b.date >= today && !['cancelled', 'completed'].includes(b.status))
    .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
    .slice(0, 6);

  const hoursLeft = studentAcademic.hoursAvailable;

  const [catalogOpen, setCatalogOpen] = useState(false);
  const featuredPlan = useMemo(() => ACTIVE_PLANS.find((p) => p.featured), []);
  const otherPlans = useMemo(() => ACTIVE_PLANS.filter((p) => !p.featured), []);
  const movements = useMemo(unifiedMovements, []);

  const openDetail = (m: Movement) => router.push(`/payments/${m.id}?kind=${m.kind}` as any);

  // Wordlish tiene un único flujo de pago: dentro de la reserva. Los planes
  // y recargas aquí son catálogo informativo. Al elegir uno, mandamos al
  // usuario a reservar; si no le alcanzan las horas, el Paso 4 del wizard
  // ofrece Yappy, ACH o Cuanto sin duplicar checkout.
  const choosePlan = (_plan: PlanOffer) => router.push('/booking/type' as any);
  const chooseTopUp = (_t: (typeof ACTIVE_TOPUPS)[number]) =>
    router.push('/booking/type' as any);

  // ═════════════ Bloques ═════════════
  const ReserveCTA = (
    <Pressable
      onPress={() => router.push('/booking/type' as any)}
      style={({ pressed }) => [styles.hero, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.heroIcon}>
        <Ionicons name="add-circle" size={26} color={colors.textOnPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.heroTitle}>Reservar clase</Text>
        <Text style={styles.heroSubtitle}>3 pasos · el pago va incluido</Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color={colors.textOnPrimary} />
    </Pressable>
  );

  const PlanBlock = (
    <View style={styles.planCard}>
      <View style={styles.planHead}>
        <View style={styles.hoursBadge}>
          <Ionicons name="hourglass" size={14} color={colors.primaryDark} />
          <Text style={styles.hoursBadgeText}>
            {hoursLeft} {hoursLeft === 1 ? 'hora' : 'horas'}
          </Text>
        </View>
        <Text style={styles.planLabel}>disponibles en tu plan</Text>
      </View>

      <Pressable
        onPress={() => setCatalogOpen((v) => !v)}
        style={({ pressed }) => [styles.catalogToggle, pressed && { opacity: 0.85 }]}
        hitSlop={6}
      >
        <Ionicons
          name={catalogOpen ? 'chevron-up' : 'add-circle-outline'}
          size={16}
          color={colors.primaryDark}
        />
        <Text style={styles.catalogToggleText}>
          {catalogOpen ? 'Cerrar catálogo' : 'Adquirir plan o recarga'}
        </Text>
      </Pressable>

      {catalogOpen ? (
        <View style={styles.catalog}>
          {featuredPlan ? (
            <View style={styles.featured}>
              <View style={styles.featuredTag}>
                <Ionicons name="star" size={11} color={colors.primaryDark} />
                <Text style={styles.featuredTagText}>Recomendado</Text>
              </View>
              <Text style={styles.planName}>{featuredPlan.name}</Text>
              <Text style={styles.planHours}>{featuredPlan.hours} horas</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceBig}>${featuredPlan.price}</Text>
                {featuredPlan.saves ? (
                  <Text style={styles.saves}>Ahorra ${featuredPlan.saves}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => choosePlan(featuredPlan)}
                style={({ pressed }) => [styles.chooseBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.chooseBtnText}>Reservar y pagar</Text>
              </Pressable>
            </View>
          ) : null}

          {otherPlans.map((p) => (
            <View key={p.id} style={styles.planRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{p.name}</Text>
                <Text style={styles.planHoursSm}>{p.hours} horas</Text>
              </View>
              <Text style={styles.priceSm}>${p.price}</Text>
              <Pressable
                onPress={() => choosePlan(p)}
                style={({ pressed }) => [styles.chooseBtnSm, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.chooseBtnSmText}>Reservar</Text>
              </Pressable>
            </View>
          ))}

          <View>
            <Text style={styles.subhead}>Recarga rápida</Text>
            <View style={styles.topUps}>
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
      ) : null}
    </View>
  );

  const UpcomingBlock = (
    <View>
      <View style={styles.sectionRow}>
        <Text style={typography.h3}>Próximas clases</Text>
      </View>
      {upcoming.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={26} color={colors.textMuted} />
          <Text style={typography.caption}>Sin clases próximas</Text>
        </View>
      ) : isDesktop ? (
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thCell, { flex: 2 }]}>Materia</Text>
            <Text style={[styles.thCell, { flex: 2 }]}>Profesor</Text>
            <Text style={[styles.thCell, { flex: 1.4 }]}>Fecha</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Hora</Text>
            <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}> </Text>
          </View>
          {upcoming.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/booking/${b.id}` as any)}
              style={({ pressed }) => [styles.tableRow, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={[styles.tdCell, { flex: 2, fontWeight: '700' }]} numberOfLines={1}>{b.subject}</Text>
              <Text style={[styles.tdCell, { flex: 2, color: colors.textSubtle }]} numberOfLines={1}>{b.teacherName}</Text>
              <Text style={[styles.tdCell, { flex: 1.4 }]}>{b.date}</Text>
              <Text style={[styles.tdCell, { flex: 1 }]}>{b.time}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={styles.detailBtn}>
                  <Text style={styles.detailBtnText}>Ver</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.primaryDark} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {upcoming.map((b) => (
            <BookingCard key={b.id} booking={b} compact />
          ))}
        </View>
      )}

      <Pressable
        onPress={() => router.push('/booking/mine' as any)}
        style={({ pressed }) => [styles.historyLink, pressed && { opacity: 0.7 }]}
        hitSlop={8}
      >
        <Text style={styles.historyLinkText}>Ver todas las reservas</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
      </Pressable>
    </View>
  );

  const HistoryBlock = (
    <View style={{ marginTop: spacing.lg }}>
      <View style={styles.sectionRow}>
        <Text style={typography.h3}>Historial de pagos</Text>
      </View>
      {movements.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={24} color={colors.textMuted} />
          <Text style={typography.caption}>Aquí verás todos tus movimientos.</Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {movements.map((m) => {
            const info = PAYMENT_STATUS[m.status];
            const tone = TONE_MAP[info.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
            return (
              <Pressable
                key={m.kind + m.id}
                onPress={() => openDetail(m)}
                style={({ pressed }) => [styles.movRow, pressed && { opacity: 0.9 }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.movTitle} numberOfLines={1}>{m.concept}</Text>
                  <Text style={styles.movMeta} numberOfLines={1}>{m.date}</Text>
                  <View style={[styles.badgeSmall, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.badgeText, { color: tone.fg }]}>{info.label}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.movAmount}>${m.amount}</Text>
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
      <Header
        title="Reservas"
        subtitle={`Te quedan ${hoursLeft} ${hoursLeft === 1 ? 'hora' : 'horas'} de estudio · Pago dentro de la reserva`}
      />

      {isDesktop ? (
        <WebTwoColumn
          leftFlex={5}
          rightFlex={7}
          left={
            <View style={{ gap: spacing.md }}>
              {ReserveCTA}
              {PlanBlock}
            </View>
          }
          right={
            <>
              {UpcomingBlock}
              {HistoryBlock}
            </>
          }
        />
      ) : (
        <>
          {ReserveCTA}
          <View style={{ height: spacing.md }} />
          {PlanBlock}
          <View style={{ height: spacing.md }} />
          {UpcomingBlock}
          {HistoryBlock}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: radius.lg, ...shadow.sm,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { color: colors.textOnPrimary, fontSize: 17, fontWeight: '700' },
  heroSubtitle: { color: colors.primarySoft, fontSize: 12, marginTop: 2, fontWeight: '500' },

  planCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.md,
  },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hoursBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  hoursBadgeText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  planLabel: { color: colors.textSubtle, fontSize: 13, fontWeight: '500' },

  pendingRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  pendingLabel: {
    fontSize: 10, color: colors.textMuted, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  pendingConcept: { fontSize: 15, fontWeight: '700', color: colors.text },
  pendingMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, flexWrap: 'wrap',
  },
  pendingMetaText: { fontSize: 12, color: colors.textSubtle, fontWeight: '500' },
  pendingAmount: { fontSize: 22, fontWeight: '700', color: colors.text },

  actionsRow: { flexDirection: 'row', gap: spacing.sm },
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
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.successSoft, padding: spacing.sm, borderRadius: radius.md,
  },
  receiptSentText: { color: colors.success, fontWeight: '700', fontSize: 12 },

  catalogToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm,
  },
  catalogToggleText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },

  catalog: { gap: spacing.md },
  featured: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1.5, borderColor: colors.primary,
  },
  featuredTag: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.pill, marginBottom: spacing.sm,
  },
  featuredTagText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  planName: { fontSize: 16, fontWeight: '700', color: colors.text },
  planHours: { fontSize: 13, color: colors.textSubtle, marginTop: 2 },
  planHoursSm: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  priceRow: {
    flexDirection: 'row', alignItems: 'baseline',
    gap: spacing.sm, marginTop: spacing.sm,
  },
  priceBig: { fontSize: 24, fontWeight: '700', color: colors.text },
  saves: { fontSize: 12, color: colors.success, fontWeight: '700' },
  chooseBtn: {
    marginTop: spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: 11, borderRadius: radius.md,
  },
  chooseBtnText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  planRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  priceSm: { fontSize: 16, fontWeight: '700', color: colors.text },
  chooseBtnSm: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md,
  },
  chooseBtnSmText: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '700' },
  subhead: {
    fontSize: 12, fontWeight: '700', color: colors.textSubtle,
    marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  topUps: { flexDirection: 'row', gap: spacing.sm },
  topUpChip: {
    flex: 1, alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.md, gap: 2,
  },
  topUpHours: { fontSize: 12, fontWeight: '700', color: colors.text },
  topUpPrice: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },

  badge: {
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill,
  },
  badgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  sectionRow: { marginBottom: spacing.md },
  empty: {
    alignItems: 'center', gap: spacing.sm, padding: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  historyLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: spacing.lg, paddingVertical: spacing.md,
  },
  historyLinkText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },

  table: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  thCell: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  tdCell: { fontSize: 13, color: colors.text, paddingHorizontal: 4 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailBtnText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },

  movRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  movTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  movMeta: { fontSize: 12, color: colors.textSubtle },
  movAmount: { fontSize: 17, fontWeight: '700', color: colors.text },
});
