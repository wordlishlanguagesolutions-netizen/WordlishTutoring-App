import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, StatusBadge } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import {
  paymentsHistory,
  guardianPaymentsHistory,
  packagesHistory,
  topUpsHistory,
  PAYMENT_STATUS,
  type PaymentStatus,
} from '@/services/mockData';

// ============================================================================
// Detalle de un movimiento de pago. Punto único donde el usuario ve la
// información completa (factura, recibo, soporte, método, monto, estado).
// La pantalla principal solo lleva un "Ver detalle" discreto hasta acá.
// ============================================================================

type Kind = 'payment' | 'guardianPayment' | 'package' | 'topup';

interface Detail {
  concept: string;
  date: string;
  method: string;
  amount: number;
  status: PaymentStatus;
  extra?: Array<{ label: string; value: string }>;
}

function findDetail(id: string, kind: Kind): Detail | null {
  if (kind === 'payment') {
    const p = paymentsHistory.find((x) => x.id === id);
    if (!p) return null;
    return {
      concept: p.concept,
      date: p.date,
      method: p.method,
      amount: p.amount,
      status: p.status,
    };
  }
  if (kind === 'guardianPayment') {
    const p = guardianPaymentsHistory.find((x) => x.id === id);
    if (!p) return null;
    return {
      concept: p.concept,
      date: p.date,
      method: p.method,
      amount: p.amount,
      status: p.status,
    };
  }
  if (kind === 'package') {
    const p = packagesHistory.find((x) => x.id === id);
    if (!p) return null;
    const statusMap: Record<string, PaymentStatus> = {
      active: 'paid',
      used: 'paid',
      expired: 'refunded',
    };
    return {
      concept: p.name,
      date: p.purchasedAt,
      method: 'Compra directa',
      amount: p.price,
      status: statusMap[p.status] ?? 'paid',
      extra: [
        { label: 'Horas totales', value: `${p.totalHours} h` },
        { label: 'Vence', value: p.expiresAt },
      ],
    };
  }
  const t = topUpsHistory.find((x) => x.id === id);
  if (!t) return null;
  return {
    concept: `Recarga de ${t.hours} horas`,
    date: t.date,
    method: t.method,
    amount: t.price,
    status: t.status,
    extra: [{ label: 'Horas recargadas', value: `${t.hours} h` }],
  };
}

export default function PaymentDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; kind?: string }>();
  const id = String(params.id ?? '');
  const kind = (params.kind ?? 'payment') as Kind;

  const detail = findDetail(id, kind);

  if (!detail) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.primaryDark} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <View style={styles.empty}>
          <Text style={typography.h3}>Movimiento no encontrado</Text>
          <Text style={typography.caption}>
            El registro solicitado ya no está disponible.
          </Text>
        </View>
      </Screen>
    );
  }

  const st = PAYMENT_STATUS[detail.status];

  const notReady = (label: string) =>
    Alert.alert(
      label,
      'La descarga estará disponible al conectar el almacenamiento real.',
    );

  const sendSupport = () =>
    Alert.alert(
      'Enviar soporte de pago',
      'Aquí podrás adjuntar el comprobante cuando conectemos el almacenamiento.',
    );

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
        <Ionicons name="chevron-back" size={20} color={colors.primaryDark} />
        <Text style={styles.backText}>Volver</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.concept}>{detail.concept}</Text>
        <Text style={styles.amount}>${detail.amount.toFixed(2)}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <StatusBadge tone={st.tone} label={st.label} icon={st.icon} />
        </View>
      </View>

      <View style={styles.card}>
        <Row label="Fecha" value={detail.date} />
        <Row label="Método" value={detail.method} />
        <Row label="Monto" value={`$${detail.amount.toFixed(2)}`} />
        <Row label="Estado" value={st.label} />
        {detail.extra?.map((e) => (
          <Row key={e.label} label={e.label} value={e.value} />
        ))}
      </View>

      <Text style={styles.section}>Documentos</Text>
      <View style={styles.docsCol}>
        <DocRow
          icon="document-text-outline"
          label="Factura"
          onPress={() => notReady('Factura')}
        />
        <DocRow
          icon="receipt-outline"
          label="Recibo"
          onPress={() => notReady('Recibo')}
        />
        {detail.status === 'pending' || detail.status === 'failed' ? (
          <DocRow
            icon="cloud-upload-outline"
            label="Enviar soporte de pago"
            onPress={sendSupport}
          />
        ) : (
          <DocRow
            icon="image-outline"
            label="Soporte de pago"
            onPress={() => notReady('Soporte de pago')}
          />
        )}
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function DocRow({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.docRow, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.docIcon}>
        <Ionicons name={icon as any} size={16} color={colors.primaryDark} />
      </View>
      <Text style={styles.docLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },

  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  concept: {
    ...typography.h3,
    fontSize: 15,
    color: colors.textSubtle,
    marginBottom: 4,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: '700' },

  section: {
    ...typography.h3,
    fontSize: 14,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  docsCol: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },

  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
