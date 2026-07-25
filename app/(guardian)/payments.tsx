import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, WebTwoColumn } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius } from '@/constants/theme';
import {
  guardianPaymentsHistory,
  PAYMENT_STATUS,
} from '@/services/mockData';

// ============================================================================
// Mi plan · acudiente. Wordlish es prepago: no hay pagos pendientes ni
// vencimientos. La pantalla muestra únicamente historial de movimientos.
// ============================================================================

const TONE_MAP = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
} as const;

export default function GuardianMyPlan() {
  const router = useRouter();
  const { isDesktop } = useResponsive();

  const openDetail = (id: string) =>
    router.push(`/payments/${id}?kind=guardianPayment` as any);

  const StatusBlock = (
    <View style={styles.emptyPayCard}>
      <Ionicons name="hourglass" size={22} color={colors.primaryDark} />
      <View style={{ flex: 1 }}>
        <Text style={styles.emptyPayTitle}>Servicios prepago</Text>
        <Text style={styles.emptyPaySubtitle}>Aquí verás los pagos ya realizados de tus estudiantes.</Text>
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
                style={({ pressed }) => [styles.tableRow, pressed && { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.tdCell, { flex: 3, fontWeight: '600' }]} numberOfLines={1}>{p.concept}</Text>
                <Text style={[styles.tdCell, { flex: 1.5, color: colors.textSubtle }]}>{p.date}</Text>
                <View style={{ flex: 1.5 }}>
                  <View style={[styles.badgeSmall, { backgroundColor: t.bg }]}>
                    <Text style={[styles.badgeText, { color: t.fg }]}>{s.label}</Text>
                  </View>
                </View>
                <Text style={[styles.tdCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>${p.amount}</Text>
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
      <Header title="Mi plan" subtitle="De tus estudiantes" />

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
  nextCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.primaryLight,
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
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill,
  },
  badgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill,
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

  emptyPayCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  emptyPayTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  emptyPaySubtitle: { fontSize: 12, color: colors.textSubtle, marginTop: 2, fontWeight: '500' },

  sectionHead: { marginBottom: spacing.md },

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
});
