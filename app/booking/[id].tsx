import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, Alert, Modal } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Avatar, StatusBadge, ZoomButton } from '@/components/ui';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { BOOKING_STATUS, dateUtils, Booking } from '@/services/mockData';
import {
  canCancel, canReschedule, getTeacherAvailableSlots, generateNextDays,
} from '@/services/bookingService';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { getZoomUrlForBooking, getMeetingIdDisplay } from '@/services/zoomService';

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getById, cancelBooking, rescheduleBooking, markPaid, remainingHours, bookings, holds, paymentProofs } = useBookings();
  const { user } = useAuth();
  const b = getById(id ?? '');
  const [rOpen, setROpen] = useState(false);

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

  function handlePay() {
    Alert.alert('Simulación de pago', 'Se marcará como confirmada. La pasarela real vendrá luego.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Pagar', onPress: () => markPaid(b!.id) },
    ]);
  }

  const role = (user as any)?.role ?? 'student';
  const isReviewer = role === 'admin' || role === 'supervisor';
  const proof = paymentProofs[b.id];
  const canApprovePayment =
    isReviewer && b.status === 'pending_payment' && !!proof && proof.status !== 'approved';

  function handleApprovePayment() {
    if (!b) return;
    Alert.alert(
      'Aprobar pago',
      `Confirmas que recibiste el pago de ${b.studentName} por ${b.subject}? Se marcara la reserva como confirmada y se cerrara la revision.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: () => {
            markPaid(b.id);
            Alert.alert('Pago aprobado', 'La reserva quedo confirmada y el estudiante fue notificado.');
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

        {canApprovePayment ? (
          <View style={s.reviewCard}>
            <View style={s.reviewHeader}>
              <Ionicons name="receipt" size={18} color={colors.warning} />
              <Text style={s.reviewTitle}>Comprobante en revisión</Text>
            </View>
            <Text style={s.reviewMeta}>
              {proof!.name} · enviado {new Date(proof!.at).toLocaleString('es-PA')}
            </Text>
            <Text style={s.reviewHint}>
              Verifica en Yappy o el banco antes de aprobar. Al aprobar, la reserva pasa a Confirmada y se notifica al estudiante.
            </Text>
            <Pressable
              onPress={handleApprovePayment}
              style={({ pressed }) => [s.approveBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.textOnPrimary} />
              <Text style={s.approveText}>Aprobar pago</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {b.status === 'pending_payment' && !isReviewer && (
            <Pressable onPress={handlePay} style={s.primaryBtn}>
              <Ionicons name="card" size={18} color={colors.textOnPrimary} />
              <Text style={s.primaryText}>Pagar (simulación)</Text>
            </Pressable>
          )}
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
    marginTop: spacing.sm,
  },
  approveText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
});
