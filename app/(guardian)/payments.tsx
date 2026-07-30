import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, WebTwoColumn, Avatar } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import {
  PAYMENT_STATUS,
  linkedStudents,
  reportsHistory,
  BOOKING_STATUS,
} from '@/services/mockData';
import {
  getGuardianPaymentsHistory,
  paymentsRepo,
  subscribePayments,
  getPaymentsVersion,
} from '@/services/paymentsService';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import {
  getGuardianByUserId,
  hydrateGuardians,
  subscribeGuardians,
} from '@/services/guardiansService';

// ============================================================================
// Dashboard del Acudiente · centro de gestión del estudiante.
//
// Un único lugar desde donde el acudiente puede administrar completamente
// a cada estudiante: estado, plan, horas, próxima clase, pagos, reportes
// y compras. Toda la información de otras pantallas confluye aquí.
//
// Estructura:
//   1. Selector de estudiante (si >1)
//   2. Tarjeta perfil: foto, nombre, plan, estado, horas, renovación, próx.
//   3. Acciones rápidas: Reservar · Plan · Banco · Adicional · Facturas
//   4. Info: último pago · próximas clases · último reporte
//   5. Historial de pagos (compacto)
//
// Cambia por completo según el estudiante seleccionado. Todo el catálogo
// vive en un panel colapsable (compra sin reservar). Compatible con
// futuras migraciones Payments → Cloud y Notifications → Cloud sin
// cambios en la UI (solo se inyecta la fuente de datos).
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
  primary: { bg: colors.primarySoft, fg: colors.primaryDark },
} as const;

type CatalogMode = 'plans' | 'bank' | 'topup' | 'invoices' | null;

export default function GuardianDashboard() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { remainingHours, bookings } = useBookings();
  const { user } = useAuth();

  const [activeStudentId, setActiveStudentId] = useState<string>(
    linkedStudents[0]?.id ?? '',
  );
  const [catalogMode, setCatalogMode] = useState<CatalogMode>(null);
  // QA fix: bloquea doble clic accidental en compras (plan/topup) para
  // evitar Payments duplicados. Se libera automaticamente tras 2s.
  const [purchaseBusy, setPurchaseBusy] = useState<boolean>(false);

  // QA fix: reactivo al cache de payments (compras/aprobaciones
  // deben aparecer sin recargar). subscribePayments dispara un
  // re-render que fuerza a useMemo(studentHistory) a re-ejecutarse.
  const [paymentsVersion, setPaymentsVersion] = useState<number>(
    getPaymentsVersion(),
  );
  useEffect(() => {
    const unsub = subscribePayments(() => {
      setPaymentsVersion(getPaymentsVersion());
    });
    return unsub;
  }, []);

  // Hidrata acudientes para resolver el guardianId real (UUID) del
  // usuario logueado. Sin esto, las compras se persistian con
  // guardianId=null (bug reportado en el QA de Payments -> Cloud).
  const [guardiansVersion, setGuardiansVersion] = useState<number>(0);
  useEffect(() => {
    hydrateGuardians().catch(() => undefined);
    const unsub = subscribeGuardians(() => setGuardiansVersion((v) => v + 1));
    return unsub;
  }, []);

  const currentGuardianId = useMemo<string | null>(() => {
    void guardiansVersion;
    if (!user) return null;
    return getGuardianByUserId(user.id)?.id ?? null;
  }, [user, guardiansVersion]);

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

  // Historial filtrado por el estudiante activo (búsqueda por firstName).
  // Cloud-ready: consumimos la lista desde el service facade, que
  // hoy sirve el mock y mañana servirá datos hidratados desde Cloud
  // manteniendo la misma forma legacy.
  const studentHistory = useMemo(
    () =>
      getGuardianPaymentsHistory().filter((p) =>
        p.concept.toLowerCase().includes(activeStudent.firstName.toLowerCase()),
      ),
    [activeStudent.id, paymentsVersion],
  );
  const lastPayment = studentHistory[0];

  // Próximas clases del estudiante seleccionado.
  const today = new Date().toISOString().split('T')[0];
  const upcomingClasses = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            b.studentId === activeStudent.id &&
            b.date >= today &&
            !['cancelled', 'completed'].includes(b.status),
        )
        .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
        .slice(0, 3),
    [bookings, activeStudent.id],
  );

  // Último reporte del estudiante (mock global · reportsHistory[0]).
  const lastReport = reportsHistory[0];

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
    if (purchaseBusy) return;
    setPurchaseBusy(true);
    setTimeout(() => setPurchaseBusy(false), 2000);
    // QA fix (Payments Cloud): persistir la compra como Payment
    // 'pending' con guardianId REAL resuelto desde Auth (no null) y
    // createdBy = user.id para trazabilidad.
    paymentsRepo.create({
      studentId: activeStudent.id,
      guardianId: currentGuardianId,
      packageId: null,
      bookingId: null,
      concept: `${plan.name} · ${plan.hours} h para ${activeStudent.firstName}`,
      amount: plan.price,
      currency: 'USD',
      status: 'pending',
      method: 'card',
      paidAt: null,
      externalReference: null,
      receiptUrl: null,
      createdBy: user?.id ?? null,
    } as any);
    Alert.alert(
      plan.name,
      `Confirmarás ${plan.hours} horas por $${plan.price} para ${activeStudent.firstName}. Se abrirá la pasarela de pago.`,
    );
  };

  const chooseTopUp = (t: QuickTopUp) => {
    if (purchaseBusy) return;
    setPurchaseBusy(true);
    setTimeout(() => setPurchaseBusy(false), 2000);
    // QA fix (Payments Cloud): idem para recargas.
    paymentsRepo.create({
      studentId: activeStudent.id,
      guardianId: currentGuardianId,
      packageId: null,
      bookingId: null,
      concept: `Recarga de ${t.hours} h para ${activeStudent.firstName}`,
      amount: t.price,
      currency: 'USD',
      status: 'pending',
      method: 'card',
      paidAt: null,
      externalReference: null,
      receiptUrl: null,
      createdBy: user?.id ?? null,
    } as any);
    Alert.alert(
      `Recarga rápida · ${t.hours} h`,
      `Total $${t.price} para ${activeStudent.firstName}. Se abrirá la pasarela de pago.`,
    );
  };

  const openCatalog = (mode: CatalogMode) => {
    setCatalogMode((prev) => (prev === mode ? null : mode));
  };

  const goReserve = () => router.push('/booking/type' as any);

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

  const ProfileCard = (
    <View style={styles.profileCard}>
      <View style={styles.profileHead}>
        <Avatar
          name={activeStudent.name}
          uri={activeStudent.avatar}
          size={64}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{activeStudent.name}</Text>
          <Text style={styles.profileGrade}>
            {activeStudent.grade} · {activeStudent.school}
          </Text>
          <View style={styles.profileBadges}>
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
                {isEmpty ? 'Sin horas' : isLow ? 'Saldo bajo' : 'Plan activo'}
              </Text>
            </View>
            <View style={styles.planBadge}>
              <Ionicons name="pricetag" size={10} color={colors.primaryDark} />
              <Text style={styles.planBadgeText}>{planName}</Text>
            </View>
          </View>
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

      <View style={styles.profileFoot}>
        <View style={styles.footRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={styles.footText}>Renovación · {nextRenewal}</Text>
        </View>
        {activeStudent.next ? (
          <View style={styles.footRow}>
            <Ionicons name="time-outline" size={13} color={colors.primaryDark} />
            <Text style={[styles.footText, { color: colors.primaryDark, fontWeight: '700' }]}>
              Próxima · {activeStudent.next}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const QuickActions = (
    <View style={styles.actionsGrid}>
      <ActionBtn
        icon="add-circle"
        label="Reservar clase"
        emphasis
        onPress={goReserve}
      />
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
        icon="flash"
        label="Horas adicionales"
        active={catalogMode === 'topup'}
        onPress={() => openCatalog('topup')}
      />
      <ActionBtn
        icon="receipt"
        label="Facturas"
        active={catalogMode === 'invoices'}
        onPress={() => openCatalog('invoices')}
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

      {catalogMode === 'invoices' ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.topUpsTitle}>Facturas de {activeStudent.firstName}</Text>
          {studentHistory.length === 0 ? (
            <Text style={styles.methodsFoot}>
              Aún no hay facturas emitidas.
            </Text>
          ) : (
            studentHistory.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => openDetail(p.id)}
                style={({ pressed }) => [styles.invoiceRow, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.invoiceIcon}>
                  <Ionicons name="receipt-outline" size={14} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invoiceTitle} numberOfLines={1}>{p.concept}</Text>
                  <Text style={styles.invoiceMeta}>{p.date} · ${p.amount}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))
          )}
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
          style={({ pressed }) => [styles.infoCard, pressed && { opacity: 0.95 }]}
        >
          <View style={styles.infoHead}>
            <Text style={styles.infoLabel}>Último pago</Text>
            <View style={[styles.badgeSmall, { backgroundColor: t.bg }]}>
              <Text style={[styles.badgeText, { color: t.fg }]}>{st.label}</Text>
            </View>
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.infoConcept} numberOfLines={1}>
              {lastPayment.concept}
            </Text>
            <Text style={styles.infoMeta}>
              {lastPayment.date} · {lastPayment.method}
            </Text>
          </View>
          <Text style={styles.infoAmount}>${lastPayment.amount}</Text>
        </Pressable>
      );
    })()
  ) : (
    <View style={styles.infoEmpty}>
      <Ionicons name="time-outline" size={20} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>Último pago</Text>
        <Text style={styles.infoEmptyText}>Sin pagos registrados</Text>
      </View>
    </View>
  );

  const UpcomingCard = (
    <View style={styles.infoCard}>
      <View style={styles.infoHead}>
        <Text style={styles.infoLabel}>Próximas clases</Text>
        <Text style={styles.infoCount}>{upcomingClasses.length}</Text>
      </View>
      {upcomingClasses.length === 0 ? (
        <Text style={styles.infoEmptyText}>Sin clases próximas</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {upcomingClasses.map((b) => {
            const info = BOOKING_STATUS[b.status];
            const t = TONE_MAP[info.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
            return (
              <Pressable
                key={b.id}
                onPress={() => router.push(`/booking/${b.id}` as any)}
                style={({ pressed }) => [styles.upcomingRow, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.upcomingDate}>
                  <Text style={styles.upcomingDateText}>{b.date.slice(5)}</Text>
                  <Text style={styles.upcomingTime}>{b.time}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upcomingSubject} numberOfLines={1}>{b.subject}</Text>
                  <Text style={styles.upcomingTeacher} numberOfLines={1}>{b.teacherName}</Text>
                </View>
                <View style={[styles.badgeSmall, { backgroundColor: t.bg }]}>
                  <Text style={[styles.badgeText, { color: t.fg }]}>{info.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  const LastReportCard = lastReport ? (
    <Pressable
      onPress={() => router.push(`/reports/${lastReport.id}` as any)}
      style={({ pressed }) => [styles.infoCard, pressed && { opacity: 0.95 }]}
    >
      <View style={styles.infoHead}>
        <Text style={styles.infoLabel}>Último reporte</Text>
        <View style={styles.reportBadge}>
          <Ionicons name="document-text" size={10} color={colors.primaryDark} />
          <Text style={styles.reportBadgeText}>Disponible</Text>
        </View>
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoConcept} numberOfLines={1}>{lastReport.topic}</Text>
        <Text style={styles.infoMeta}>
          {lastReport.teacher} · {lastReport.date}
        </Text>
        <Text style={styles.reportSummary} numberOfLines={2}>
          {lastReport.progress}
        </Text>
      </View>
      <View style={styles.reportOpen}>
        <Text style={styles.reportOpenText}>Ver bitácora</Text>
        <Ionicons name="chevron-forward" size={13} color={colors.primaryDark} />
      </View>
    </Pressable>
  ) : (
    <View style={styles.infoEmpty}>
      <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>Último reporte</Text>
        <Text style={styles.infoEmptyText}>Sin reportes aún</Text>
      </View>
    </View>
  );

  const HistoryBlock = (
    <View>
      <View style={styles.sectionHead}>
        <Text style={typography.h3}>Historial de pagos</Text>
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
            ? `Gestión de ${activeStudent.firstName}`
            : 'Centro de gestión del estudiante'
        }
      />

      {StudentSelector}

      {isDesktop ? (
        <WebTwoColumn
          leftFlex={5}
          rightFlex={7}
          left={
            <View style={{ gap: spacing.md }}>
              {ProfileCard}
              {QuickActions}
              {CatalogPanel}
            </View>
          }
          right={
            <View style={{ gap: spacing.md }}>
              {LastPaymentCard}
              {UpcomingCard}
              {LastReportCard}
              {HistoryBlock}
            </View>
          }
        />
      ) : (
        <>
          {ProfileCard}
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
          <View style={{ height: spacing.md }} />
          {UpcomingCard}
          <View style={{ height: spacing.md }} />
          {LastReportCard}
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
  emphasis,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  emphasis?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        active && styles.actionBtnOn,
        emphasis && styles.actionBtnEmphasis,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          active && { backgroundColor: colors.primary },
          emphasis && { backgroundColor: colors.textOnPrimary },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={16}
          color={
            emphasis
              ? colors.primary
              : active
              ? colors.textOnPrimary
              : colors.primaryDark
          }
        />
      </View>
      <Text
        style={[
          styles.actionLabel,
          active && { color: colors.primaryDark },
          emphasis && { color: colors.textOnPrimary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
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

  // ─── Profile Card ────────────────────────────────────────────────────
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  profileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  profileGrade: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
    fontWeight: '500',
  },
  profileBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
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
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  planBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },

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

  profileFoot: {
    marginTop: spacing.md,
    gap: 6,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footText: {
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
  actionBtnEmphasis: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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

  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  invoiceIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  invoiceMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  methodsFoot: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // ─── Info cards (último pago · próximas · reporte) ──────────────────
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  infoEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  infoBody: { gap: 2 },
  infoConcept: { fontSize: 15, fontWeight: '700', color: colors.text },
  infoMeta: { fontSize: 12, color: colors.textSubtle, fontWeight: '500' },
  infoAmount: { fontSize: 22, fontWeight: '700', color: colors.text },
  infoEmptyText: { fontSize: 13, color: colors.textSubtle, fontWeight: '500', marginTop: 2 },

  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  upcomingDate: {
    width: 52,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: 4,
  },
  upcomingDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  upcomingTime: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  upcomingSubject: { fontSize: 13, fontWeight: '700', color: colors.text },
  upcomingTeacher: { fontSize: 11, color: colors.textSubtle, marginTop: 1 },

  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  reportBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primaryDark },
  reportSummary: {
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 17,
    marginTop: 6,
  },
  reportOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  reportOpenText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },

  // ─── Historial ──────────────────────────────────────────────────────
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
