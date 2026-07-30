import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, Alert, Modal, Linking } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Avatar, StatusBadge, ZoomButton } from '@/components/ui';
import { PaymentMethods } from '@/components/booking/PaymentMethods';
import type { PaymentMethod } from '@/types';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { BOOKING_STATUS, dateUtils, Booking } from '@/services/mockData';
import {
  canCancel, canReschedule, getTeacherAvailableSlots, generateNextDays,
} from '@/services/bookingService';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { getZoomUrlForBooking, getMeetingIdDisplay } from '@/services/zoomService';
import { getSetting } from '@/services/appSettingsService';
import {
  getPaymentsForBooking,
  getReceiptSignedUrl,
  paymentMethodLabel,
  subscribePayments,
  getPaymentsVersion,
} from '@/services/paymentsService';

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getById, cancelBooking, rescheduleBooking, markPaid, rejectPayment, remainingHours, bookings, holds, paymentProofs, submitPaymentProof } = useBookings();
  const { user } = useAuth();
  const b = getById(id ?? '');
  const [rOpen, setROpen] = useState(false);
  // Cierre final MVP: al aprobar manualmente sin comprobante previo,
  // el admin elige el metodo real (yappy/transfer/card/cuanto/other)
  // en vez de que el sistema fuerce 'other'.
  const [methodOpen, setMethodOpen] = useState(false);
  const [methodBusy, setMethodBusy] = useState<PaymentMethod | null>(null);

  // Refresco reactivo del cache de payments (aprobar/rechazar sin recargar).
  const [paymentsVersion, setPaymentsVersion] = useState<number>(getPaymentsVersion());
  useEffect(() => subscribePayments(() => setPaymentsVersion(getPaymentsVersion())), []);

  if (!b) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ padding: spacing.xl }}>
          <Text style={typography.h2}>Reserva no encontrada</Text>
          <Pressable onPress={() => router.back()} style={s.primaryBtn}>
            <Text style={s.primaryText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const st = BOOKING_STATUS[b.status];
  const canR = canReschedule(b);
  const canC = canCancel(b);
  const hours = remainingHours[b.studentId] ?? 0;

  function handleCancel() {
    Alert.alert('Cancelar clase', '¿Seguro? Si consumió una hora, se restaurará al saldo.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar', style: 'destructive',
        onPress: () => { cancelBooking(b!.id); router.back(); },
      },
    ]);
  }

  const role = (user as any)?.role ?? 'student';
  const isReviewer = role === 'admin' || role === 'supervisor';
  const proof = paymentProofs[b.id];

  // Pagos Cloud vinculados a esta reserva. Fuente de verdad para admin.
  const linkedPayments = getPaymentsForBooking(b.id);
  void paymentsVersion;
  const pendingPayment = linkedPayments.find((p) => p.status === 'pending');
  const failedPayment = linkedPayments.find((p) => p.status === 'failed');

  const isRejectedForPayer = proof?.status === 'rejected';
  const canApprovePayment =
    isReviewer && b.status === 'pending_payment' && !!pendingPayment;
  const canRejectPayment = canApprovePayment;
  const showPaymentPanel = b.status === 'pending_payment' && !isReviewer;
  const priceUsd = getSetting<number>('payment.price_per_hour_usd', 18);

  async function openReceipt() {
    if (!pendingPayment?.receiptUrl) {
      Alert.alert('Sin comprobante', 'Este pago aun no tiene comprobante adjunto.');
      return;
    }
    const url = await getReceiptSignedUrl(pendingPayment.receiptUrl);
    if (!url) {
      Alert.alert('Comprobante', 'No se pudo generar el enlace del comprobante.');
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Comprobante', 'No se pudo abrir el archivo.'),
    );
  }

  function handleApprovePayment() {
    if (!b) return;
    // Si el pagador ya subio comprobante con metodo, mantenemos ese.
    if (pendingPayment && pendingPayment.method && pendingPayment.method !== 'other') {
      Alert.alert(
        'Aprobar pago',
        `Confirmas que recibiste el pago de ${b.studentName} por ${b.subject}? Se marcara la reserva como confirmada.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Aprobar',
            onPress: () => {
              markPaid(b.id, pendingPayment.method);
              Alert.alert('Pago aprobado', 'La reserva quedo confirmada y el estudiante fue notificado.');
            },
          },
        ],
      );
      return;
    }
    // Sin comprobante previo o metodo generico: pedimos el metodo real.
    setMethodOpen(true);
  }

  function confirmMethod(method: PaymentMethod) {
    if (!b || methodBusy) return;
    setMethodBusy(method);
    markPaid(b.id, method);
    setMethodOpen(false);
    setTimeout(() => setMethodBusy(null), 1500);
    Alert.alert('Pago aprobado', `Registrado como ${method}. Estudiante notificado.`);
  }

  function handleRejectPayment() {
    if (!b) return;
    Alert.alert(
      'Rechazar comprobante',
      'El pago quedara marcado como rechazado y se pedira al pagador subir un nuevo comprobante. No se acreditaran horas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () => {
            rejectPayment(b.id, 'Comprobante no valido');
            Alert.alert('Comprobante rechazado', 'El pagador fue notificado para reintentar.');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <Text style={typography.h2}>Detalle</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: spacing.md }}>
          <StatusBadge tone={st.tone} label={st.label} icon={st.icon} />
        </View>

        <View style={s.hero}>
          <Text style={s.heroSubject}>{b.subject}</Text>
          <Text style={s.heroTime}>{dateUtils.formatDisplay(b.date)} · {b.time}</Text>
          <View style={s.chipRow}>
            <View style={s.chip}>
              <Ionicons name="time-outline" size={14} color={colors.primarySoft} />
              <Text style={s.chipText}>{b.durationMin} min</Text>
            </View>
          </View>
          {b.status === 'confirmed' && (
            <View style={{ marginTop: spacing.lg }}>
              <ZoomButton url={getZoomUrlForBooking(b.zoomUrl)} />
            </View>
          )}
        </View>

        {b.classRecordId ? (
          <Pressable
            onPress={() => router.push(`/class/${b.classRecordId}` as any)}
            style={({ pressed }) => [s.secondaryBtn, { marginTop: spacing.md }, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="folder-open" size={18} color={colors.primaryDark} />
            <Text style={s.secondaryText}>Ver expediente de clase</Text>
          </Pressable>
        ) : null}

        <Text style={s.section}>Profesor</Text>
        <Card>
          <View style={s.personRow}>
            <Avatar name={b.teacherName} uri={b.teacherAvatar} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyStrong}>{b.teacherName}</Text>
              <Text style={typography.caption}>Profesor principal</Text>
            </View>
          </View>
          <View style={s.subRow}>
            <View style={s.subDot} />
            <Text style={typography.caption}>
              Suplente: {b.substituteName ?? 'sin asignar'}
            </Text>
          </View>
        </Card>

        <Text style={s.section}>Estudiante</Text>
        <Card>
          <View style={s.personRow}>
            <Avatar name={b.studentName} uri={b.studentAvatar} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyStrong}>{b.studentName}</Text>
              <Text style={typography.caption}>Saldo: {hours} horas</Text>
            </View>
          </View>
        </Card>

        <Text style={s.section}>Enlace de Zoom</Text>
        <Card>
          <View style={s.zoomBox}>
            <Ionicons name="videocam" size={18} color={colors.primaryDark} />
            <Text style={s.zoomUrl} numberOfLines={1}>{getZoomUrlForBooking(b.zoomUrl)}</Text>
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <Text style={typography.caption}>ID de reunión: {getMeetingIdDisplay()}</Text>
            <Text style={[typography.caption, { marginTop: 2 }]}>
              Sala oficial de Wordlish. Usa este mismo enlace para todas tus clases.
            </Text>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <ZoomButton variant="secondary" url={getZoomUrlForBooking(b.zoomUrl)} />
          </View>
        </Card>

        <Text style={s.section}>Información</Text>
        <Card>
          <Info label="ID de reserva" value={b.id} />
          <Info label="Creada" value={new Date(b.createdAt).toLocaleDateString('es-PA')} />
          <Info label="Duración" value={`${b.durationMin} minutos`} />
          <Info label="Hora consumida" value={b.hourConsumed ? 'Sí' : 'No'} last />
        </Card>

        {showPaymentPanel ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Text style={typography.h3}>
              {isRejectedForPayer
                ? 'Comprobante rechazado'
                : proof
                ? 'Pago en revisión'
                : 'Completar pago'}
            </Text>
            <Text style={typography.caption}>
              {isRejectedForPayer
                ? 'Tu comprobante fue rechazado. Sube uno nuevo para reactivar la reserva.'
                : proof
                ? 'Recibimos tu comprobante. Te avisaremos apenas el equipo Wordlish lo valide.'
                : `Sin horas disponibles · Valor $${priceUsd.toFixed(2)}. Elige un método y sube tu comprobante.`}
            </Text>
            <PaymentMethods
              amount={priceUsd}
              receiptPathPrefix={`bookings/${b.id}`}
              onUploadProof={(payload) =>
                submitPaymentProof(b.id, {
                  name: payload.name,
                  method: payload.method,
                  receiptPath: payload.receiptPath,
                })
              }
              uploadedProof={
                proof
                  ? { name: proof.name, at: proof.at, status: proof.status }
                  : null
              }
              onReplaceProof={() => submitPaymentProof(b.id, { name: '' })}
            />
          </View>
        ) : null}

        {canApprovePayment || canRejectPayment ? (
          <View style={s.reviewCard}>
            <View style={s.reviewHeader}>
              <Ionicons name="receipt" size={18} color={colors.warning} />
              <Text style={s.reviewTitle}>Comprobante en revisión</Text>
            </View>
            {pendingPayment ? (
              <>
                <Text style={s.reviewMeta}>
                  Método: {paymentMethodLabel(pendingPayment.method)}
                  {pendingPayment.externalReference
                    ? ` · ${pendingPayment.externalReference}`
                    : ''}
                </Text>
                <Text style={s.reviewMeta}>
                  Actualizado: {new Date(pendingPayment.updatedAt).toLocaleString('es-PA')}
                </Text>
              </>
            ) : null}
            <Text style={s.reviewHint}>
              Verifica en Yappy o el banco antes de aprobar. Al aprobar, la reserva pasa a Confirmada y se notifica al estudiante.
            </Text>
            {pendingPayment?.receiptUrl ? (
              <Pressable
                onPress={openReceipt}
                style={({ pressed }) => [s.receiptBtn, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="document-attach" size={16} color={colors.primaryDark} />
                <Text style={s.receiptBtnText}>Ver comprobante</Text>
              </Pressable>
            ) : (
              <Text style={s.reviewHint}>Sin comprobante adjunto en Cloud.</Text>
            )}
            <View style={s.reviewActionsRow}>
              {canRejectPayment ? (
                <Pressable
                  onPress={handleRejectPayment}
                  style={({ pressed }) => [s.rejectBtn, pressed && { opacity: 0.9 }]}
                >
                  <Ionicons name="close-circle" size={18} color={colors.danger} />
                  <Text style={s.rejectText}>Rechazar</Text>
                </Pressable>
              ) : null}
              {canApprovePayment ? (
                <Pressable
                  onPress={handleApprovePayment}
                  style={({ pressed }) => [s.approveBtn, pressed && { opacity: 0.9 }]}
                >
                  <Ionicons name="checkmark-circle" size={18} color={colors.textOnPrimary} />
                  <Text style={s.approveText}>Aprobar pago</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {isReviewer && failedPayment && !pendingPayment ? (
          <View style={[s.reviewCard, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
            <View style={s.reviewHeader}>
              <Ionicons name="close-circle" size={18} color={colors.danger} />
              <Text style={[s.reviewTitle, { color: colors.danger }]}>Pago rechazado</Text>
            </View>
            <Text style={s.reviewMeta}>
              El pagador debe subir un nuevo comprobante para reactivar la reserva.
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {canR && (
            <Pressable onPress={() => setROpen(true)} style={s.secondaryBtn}>
              <Ionicons name="refresh" size={18} color={colors.primaryDark} />
              <Text style={s.secondaryText}>Reprogramar</Text>
            </Pressable>
          )}
          {canC && (
            <Pressable onPress={handleCancel} style={s.dangerBtn}>
              <Ionicons name="close-circle" size={18} color={colors.danger} />
              <Text style={s.dangerText}>Cancelar clase</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <PaymentMethodPickerModal
        visible={methodOpen}
        busy={methodBusy}
        onClose={() => setMethodOpen(false)}
        onPick={confirmMethod}
      />

      <RescheduleModal
        visible={rOpen}
        booking={b}
        bookings={bookings}
        holds={holds}
        onClose={() => setROpen(false)}
        onConfirm={(d, t) => {
          const r = rescheduleBooking(b!.id, d, t);
          if (r.ok) {
            setROpen(false);
            Alert.alert('Reprogramada', 'La clase se movió correctamente.');
          } else {
            Alert.alert('No se pudo', r.error ?? 'Intenta otro horario.');
          }
        }}
      />
    </SafeAreaView>
  );
}

interface RModalProps {
  visible: boolean;
  booking: Booking;
  bookings: Booking[];
  holds: any[];
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
}

function RescheduleModal({ visible, booking, bookings, holds, onClose, onConfirm }: RModalProps) {
  const [date, setDate] = useState<string>(booking.date);
  const [time, setTime] = useState<string>('');
  const days = generateNextDays(7);
  const slots = getTeacherAvailableSlots(booking.teacherId, date, bookings, holds, Date.now());

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBg}>
        <View style={s.modalCard}>
          <View style={s.modalHead}>
            <Text style={typography.h2}>Reprogramar</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <Text style={s.section}>Nueva fecha</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
          >
            {days.map((d) => (
              <Pressable
                key={d}
                onPress={() => { setDate(d); setTime(''); }}
                style={[s.dateChip, d === date && s.dateChipOn]}
              >
                <Text style={[s.dateText, d === date && { color: colors.textOnPrimary }]}>
                  {dateUtils.formatDisplay(d)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={s.section}>Nueva hora</Text>
          {slots.length === 0 ? (
            <Text style={typography.caption}>
              El profesor no tiene horarios en esta fecha.
            </Text>
          ) : (
            <View style={s.slotsGrid}>
              {slots.map((x) => (
                <Pressable
                  key={x}
                  onPress={() => setTime(x)}
                  style={[s.slot, x === time && s.slotOn]}
                >
                  <Text style={[s.slotText, x === time && { color: colors.textOnPrimary }]}>{x}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            onPress={() => time && onConfirm(date, time)}
            disabled={!time}
            style={[s.primaryBtn, { marginTop: spacing.lg }, !time && { opacity: 0.5 }]}
          >
            <Text style={s.primaryText}>Confirmar cambio</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PaymentMethodPickerModal({
  visible,
  busy,
  onClose,
  onPick,
}: {
  visible: boolean;
  busy: PaymentMethod | null;
  onClose: () => void;
  onPick: (m: PaymentMethod) => void;
}) {
  const OPTIONS: Array<{ key: PaymentMethod; label: string; icon: string }> = [
    { key: 'yappy', label: 'Yappy', icon: 'phone-portrait' },
    { key: 'transfer', label: 'Transferencia ACH', icon: 'business' },
    { key: 'card', label: 'Tarjeta / Cuanto', icon: 'card' },
    { key: 'cuanto', label: 'Efectivo', icon: 'cash' },
    { key: 'other', label: 'Otro', icon: 'ellipsis-horizontal' },
  ];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBg}>
        <View style={s.modalCard}>
          <View style={s.modalHead}>
            <Text style={typography.h2}>Metodo de pago</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <Text style={[typography.caption, { marginTop: spacing.sm }]}>
            Selecciona como recibiste el pago para dejar trazabilidad real.
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                disabled={busy !== null}
                onPress={() => onPick(opt.key)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: busy === opt.key ? colors.primary : colors.border,
                    backgroundColor: busy === opt.key ? colors.primarySoft : colors.surface,
                  },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name={opt.icon as any} size={20} color={colors.primaryDark} />
                <Text style={{ flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 }}>{opt.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Info({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={typography.bodyStrong}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { ...typography.h3, marginTop: spacing.lg, marginBottom: spacing.md },
  hero: {
    backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg,
    ...shadow.md,
  },
  heroSubject: { color: colors.textOnPrimary, fontSize: 22, fontWeight: '700' },
  heroTime: { color: colors.primarySoft, fontSize: 14, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill,
  },
  chipText: { color: colors.primarySoft, fontSize: 12, fontWeight: '600' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  subDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted },
  zoomBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md,
  },
  zoomUrl: { color: colors.primaryDark, fontWeight: '600', flex: 1, fontSize: 13 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.md,
  },
  primaryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primarySoft, paddingVertical: 14, borderRadius: radius.md,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.dangerSoft, paddingVertical: 14, borderRadius: radius.md,
  },
  dangerText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, maxHeight: '80%',
  },
  modalHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  dateChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateText: { fontWeight: '600', fontSize: 13, color: colors.textSubtle },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    minWidth: 72, paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center',
  },
  slotOn: { backgroundColor: colors.primary },
  slotText: { fontWeight: '700', color: colors.primaryDark },
  reviewCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: spacing.sm,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewTitle: { color: colors.warning, fontWeight: '700', fontSize: 15 },
  reviewMeta: { color: colors.textSubtle, fontSize: 12, fontWeight: '600' },
  reviewHint: { color: colors.textSubtle, fontSize: 12, lineHeight: 17 },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.success, paddingVertical: 14, borderRadius: radius.md,
    marginTop: spacing.sm, flex: 1,
  },
  approveText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.dangerSoft, paddingVertical: 14, borderRadius: radius.md,
    marginTop: spacing.sm, flex: 1,
    borderWidth: 1, borderColor: colors.danger,
  },
  rejectText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  reviewActionsRow: { flexDirection: 'row', gap: spacing.sm },
  receiptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  receiptBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
