import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Header, Avatar, WebTwoColumn } from '@/components/ui';
import { BookingCard } from '@/components/booking';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { useBookings } from '@/hooks/useBookings';
import {
  linkedStudents,
  guardianGroupPayments,
  guardianPaymentsHistory,
  PAYMENT_STATUS,
} from '@/services/mockData';
import { getGroupPaymentStatus } from '@/constants/policies';

// ============================================================================
// Reservas del acudiente · flujo unificado.
//
// Igual que en el estudiante: reservar y pagar viven en una sola pantalla.
// Bloques: CTA reservar → estudiantes vinculados → pagos pendientes por
// estudiante → próximas clases → historial.
// ============================================================================

const TONE_MAP = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  muted: { bg: colors.surfaceAlt, fg: colors.textMuted },
} as const;

export default function GuardianBookHub() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { bookings } = useBookings();

  const linkedIds = new Set(linkedStudents.map((s) => s.id));
  const today = new Date().toISOString().split('T')[0];
  const all = bookings.filter((b) => linkedIds.has(b.studentId));
  const upcoming = all
    .filter((b) => b.date >= today && !['cancelled', 'completed'].includes(b.status))
    .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
    .slice(0, 6);

  const pending = useMemo(() => guardianGroupPayments.filter((g) => !g.paid), []);
  const history = useMemo(() => guardianPaymentsHistory.slice(0, 6), []);

  const [receiptSentIds, setReceiptSentIds] = useState<Set<string>>(new Set());
  const markSent = (id: string) => {
    setReceiptSentIds((prev) => new Set(prev).add(id));
  };

  const openDetail = (id: string) => router.push(`/payments/${id}?kind=guardianPayment` as any);

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

  const StudentsStrip = isDesktop ? (
    <View style={styles.studentsPanel}>
      <Text style={styles.studentsTitle}>Tus estudiantes</Text>
      <View style={{ gap: 6 }}>
        {linkedStudents.map((st) => (
          <View key={st.id} style={styles.studentRow}>
            <Avatar name={st.name} uri={st.avatar} size={26} />
            <Text style={styles.studentRowText}>{st.firstName}</Text>
          </View>
        ))}
      </View>
    </View>
  ) : (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
    >
      {linkedStudents.map((st) => (
        <View key={st.id} style={styles.studentChip}>
          <Avatar name={st.name} uri={st.avatar} size={22} />
          <Text style={styles.studentChipText}>{st.firstName}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const PendingBlock = pending.length > 0 ? (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.sectionLabel}>Pagos pendientes</Text>
      {pending.map((gp) => {
        const st = getGroupPaymentStatus(gp.daysLate, gp.paid);
        const tone = TONE_MAP[st.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
        const total = gp.cycleAmount + st.fee;
        const key = gp.courseId + gp.studentId;
        const sent = receiptSentIds.has(key);
        return (
          <View key={key} style={styles.pendingCard}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingConcept} numberOfLines={1}>{gp.courseName}</Text>
                <View style={styles.pendingMeta}>
                  <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.pendingMetaText}>{gp.studentName}</Text>
                  <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.pendingMetaText}>Vence {gp.paymentDueDate}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: tone.bg, marginTop: 6 }]}>
                  <Text style={[styles.badgeText, { color: tone.fg }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.pendingAmount}>${total}</Text>
            </View>
            {sent ? (
              <View style={styles.receiptSent}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.receiptSentText}>Comprobante enviado · validando</Text>
              </View>
            ) : (
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => Alert.alert('Pagar ahora', 'Se abrirá la pasarela de pago.')}
                  style={({ pressed }) => [styles.payBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.payBtnText}>Pagar ahora</Text>
                </Pressable>
                <Pressable
                  onPress={() => markSent(key)}
                  style={({ pressed }) => [styles.softBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.softBtnText}>Enviar comprobante</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  ) : (
    <View style={styles.emptyPay}>
      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      <Text style={styles.emptyPayText}>Sin pagos pendientes</Text>
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
            <Text style={[styles.thCell, { flex: 1.6 }]}>Estudiante</Text>
            <Text style={[styles.thCell, { flex: 2 }]}>Materia</Text>
            <Text style={[styles.thCell, { flex: 1.4 }]}>Fecha</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Hora</Text>
            <Text style={[styles.thCell, { flex: 0.8, textAlign: 'right' }]}> </Text>
          </View>
          {upcoming.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/booking/${b.id}` as any)}
              style={({ pressed }) => [styles.tableRow, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={[styles.tdCell, { flex: 1.6, fontWeight: '600' }]} numberOfLines={1}>{b.studentName}</Text>
              <Text style={[styles.tdCell, { flex: 2 }]} numberOfLines={1}>{b.subject}</Text>
              <Text style={[styles.tdCell, { flex: 1.4, color: colors.textSubtle }]}>{b.date}</Text>
              <Text style={[styles.tdCell, { flex: 1 }]}>{b.time}</Text>
              <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
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
            <BookingCard key={b.id} booking={b} showStudent compact />
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
      <View style={{ gap: spacing.sm }}>
        {history.map((p) => {
          const info = PAYMENT_STATUS[p.status];
          const tone = TONE_MAP[info.tone as keyof typeof TONE_MAP] ?? TONE_MAP.info;
          return (
            <Pressable
              key={p.id}
              onPress={() => openDetail(p.id)}
              style={({ pressed }) => [styles.movRow, pressed && { opacity: 0.9 }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.movTitle} numberOfLines={1}>{p.concept}</Text>
                <Text style={styles.movMeta} numberOfLines={1}>{p.date}</Text>
                <View style={[styles.badgeSmall, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.badgeText, { color: tone.fg }]}>{info.label}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.movAmount}>${p.amount}</Text>
                <View style={styles.detailBtn}>
                  <Text style={styles.detailBtnText}>Ver detalle</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.primaryDark} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <Screen>
      <Header title="Reservas" subtitle="Clases y pagos de tus estudiantes" />

      {isDesktop ? (
        <WebTwoColumn
          leftFlex={5}
          rightFlex={7}
          left={
            <View style={{ gap: spacing.md }}>
              {ReserveCTA}
              {StudentsStrip}
              {PendingBlock}
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
          {StudentsStrip}
          <View style={{ height: spacing.md }} />
          {PendingBlock}
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

  studentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  studentChipText: { color: colors.textSubtle, fontWeight: '600', fontSize: 12 },
  studentsPanel: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  studentsTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingVertical: 4,
  },
  studentRowText: { fontSize: 13, color: colors.text, fontWeight: '600' },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSubtle,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.xs,
  },
  pendingCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primaryLight,
    padding: spacing.md, gap: spacing.sm,
  },
  pendingConcept: { fontSize: 15, fontWeight: '700', color: colors.text },
  pendingMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, flexWrap: 'wrap',
  },
  pendingMetaText: { fontSize: 12, color: colors.textSubtle, fontWeight: '500' },
  pendingAmount: { fontSize: 22, fontWeight: '700', color: colors.text },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill,
  },
  badgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

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

  emptyPay: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  emptyPayText: { color: colors.text, fontSize: 13, fontWeight: '600' },

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
