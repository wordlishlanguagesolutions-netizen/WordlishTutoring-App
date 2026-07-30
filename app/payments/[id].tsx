import React, { useMemo } from 'react';
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
import { buildClientSoporte, type ClientSoporte } from '@/services/soporteService';

// ============================================================================
// Detalle de un movimiento de pago + Soporte de Pago del Cliente.
//
// Cuando el registro tiene su Payment (Cloud) aprobado, el bloque de
// Soporte de Pago se genera automaticamente a partir de los datos ya
// existentes (Payment + Booking) via `soporteService`. No hay nueva
// entidad ni tabla: es una vista derivada.
//
// Nomenclatura obligatoria: "Soporte de Pago" (nunca Factura).
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
  // Intento de armar el Soporte de Pago (Cliente) desde el Payment real.
  // Si el id corresponde a un Payment Cloud, buildClientSoporte lo
  // resuelve; si no, devuelve null y la pantalla muestra solo el detalle
  // legacy (mock).
  const soporte: ClientSoporte | null = useMemo(
    () => buildClientSoporte(id),
    [id],
  );

  if (!detail && !soporte) {
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

  // Fuente principal: si el Soporte de Pago (Cloud) esta disponible lo
  // usamos, en caso contrario caemos al detail legacy (mock).
  const concept = soporte?.concept ?? detail!.concept;
  const amount = soporte?.total ?? detail!.amount;
  const status: PaymentStatus = soporte?.status ?? detail!.status;
  const st = PAYMENT_STATUS[status];
  const showSoporte = !!soporte && status === 'paid';

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

  const downloadSoporte = () =>
    Alert.alert(
      'Soporte de Pago',
      'La exportación a PDF estará disponible en la siguiente fase.',
    );

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
        <Ionicons name="chevron-back" size={20} color={colors.primaryDark} />
        <Text style={styles.backText}>Volver</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.concept}>{concept}</Text>
        <Text style={styles.amount}>${amount.toFixed(2)}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <StatusBadge tone={st.tone} label={st.label} icon={st.icon} />
        </View>
      </View>

      {showSoporte ? (
        <View style={styles.soporteCard}>
          <View style={styles.soporteHead}>
            <View style={styles.soporteIcon}>
              <Ionicons name="ribbon-outline" size={16} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.soporteLabel}>Soporte de Pago</Text>
              <Text style={styles.soporteNumber}>{soporte!.number}</Text>
            </View>
            <View style={[styles.paidPill, { backgroundColor: colors.successSoft }]}>
              <Text style={[styles.paidPillText, { color: colors.success }]}>
                {soporte!.statusLabel}
              </Text>
            </View>
          </View>
          <View style={styles.soporteRows}>
            <Row label="Fecha" value={formatDate(soporte!.date)} />
            {soporte!.studentName ? (
              <Row label="Estudiante" value={soporte!.studentName} />
            ) : null}
            {soporte!.guardianName ? (
              <Row label="Acudiente" value={soporte!.guardianName} />
            ) : null}
            {soporte!.teacherName ? (
              <Row label="Profesor" value={soporte!.teacherName} />
            ) : null}
            {soporte!.subject ? (
              <Row label="Materia" value={soporte!.subject} />
            ) : null}
            <Row label="Concepto" value={soporte!.concept} />
            {soporte!.hours !== null ? (
              <Row label="Horas" value={`${soporte!.hours} h`} />
            ) : null}
            {soporte!.hourlyRate !== null ? (
              <Row
                label="Valor por hora"
                value={`${soporte!.currency} ${soporte!.hourlyRate.toFixed(2)}`}
              />
            ) : null}
            <Row
              label="Total pagado"
              value={`${soporte!.currency} ${soporte!.total.toFixed(2)}`}
            />
            <Row label="Método" value={soporte!.method} />
          </View>
          <Pressable
            onPress={downloadSoporte}
            style={({ pressed }) => [styles.downloadBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="download-outline" size={14} color={colors.textOnPrimary} />
            <Text style={styles.downloadText}>Descargar soporte</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Row label="Fecha" value={detail?.date ?? formatDate(soporte?.date ?? '')} />
          <Row label="Método" value={detail?.method ?? (soporte?.method ?? '')} />
          <Row label="Monto" value={`$${amount.toFixed(2)}`} />
          <Row label="Estado" value={st.label} />
          {detail?.extra?.map((e) => (
            <Row key={e.label} label={e.label} value={e.value} />
          ))}
        </View>
      )}

      <Text style={styles.section}>Documentos</Text>
      <View style={styles.docsCol}>
        {showSoporte ? (
          <DocRow
            icon="ribbon-outline"
            label="Soporte de Pago"
            hint={soporte!.number}
            onPress={downloadSoporte}
          />
        ) : null}
        {status === 'pending' || status === 'failed' ? (
          <DocRow
            icon="cloud-upload-outline"
            label="Enviar soporte de pago"
            onPress={sendSupport}
          />
        ) : (
          <DocRow
            icon="image-outline"
            label="Comprobante"
            onPress={() => notReady('Comprobante')}
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
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function DocRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: string;
  label: string;
  hint?: string;
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
      <View style={{ flex: 1 }}>
        <Text style={styles.docLabel}>{label}</Text>
        {hint ? <Text style={styles.docHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_ES[d.getMonth()] ?? '';
  const y = d.getFullYear();
  return `${day} ${mon} ${y}`;
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

  // Soporte de Pago card
  soporteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  soporteHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  soporteIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soporteLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  soporteNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  paidPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  paidPillText: { fontSize: 11, fontWeight: '700' },
  soporteRows: {
    gap: 0,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  downloadText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
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
    gap: spacing.md,
  },
  rowLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  rowValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },

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
  docLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  docHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

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
