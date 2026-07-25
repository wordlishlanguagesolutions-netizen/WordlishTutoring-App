import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { Avatar, KnowCard } from '@/components/ui';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { useBookings } from '@/hooks/useBookings';
import { dateUtils } from '@/services/mockData';
import { policiesAck } from '@/services/policiesAck';
import { POLICY_COPY } from '@/constants/policies';
import {
  getActivePaymentMethods,
  type PaymentMethodOption,
} from '@/services/paymentConfig';

// ============================================================================
// Reserva · Paso 3 de 3: resumen + método de pago inline.
//
// Filosofía "una necesidad = un solo flujo": el estudiante no sale a otra
// pantalla para pagar. Si tiene horas disponibles, se salta el bloque de
// pagos y confirma directamente. Si no, elige un método (tarjeta, Yappy,
// ACH, comprobante, WhatsApp) sin abandonar el resumen.
//
// La arquitectura de pagos es 100% escalable: el catálogo vive en
// `services/paymentConfig.ts`. Cuando se conecte una pasarela real
// (Stripe / PagueloFacil / Wompi / Yappy) basta con marcar `enabled: true`
// y proveer credenciales — la UI no cambia.
// ============================================================================

const PRICE_PER_HOUR = 18; // USD, dato mock para mostrar precio cuando no hay plan

export default function BookingSummary() {
  const router = useRouter();
  const { draft, setHoldId, reset } = useDraftBooking();
  const { holds, createBooking, releaseHold, remainingHours } = useBookings();

  const hold = holds.find((h) => h.id === draft.holdId);
  const hoursLeft = remainingHours[draft.studentId] ?? 0;
  const requiresPayment = hoursLeft === 0;

  const paymentMethods = useMemo(() => getActivePaymentMethods(), []);
  const [methodId, setMethodId] = useState<string | null>(
    paymentMethods[0]?.id ?? null,
  );
  const [proofName, setProofName] = useState<string | null>(null);

  const [remaining, setRemaining] = useState<number>(() =>
    hold ? Math.max(0, Math.floor((hold.expiresAt - Date.now()) / 1000)) : 0,
  );
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [policiesViewed, setPoliciesViewed] = useState<boolean>(
    policiesAck.hasViewed(draft.studentId),
  );

  useEffect(() => {
    if (
      !draft.date ||
      !draft.time ||
      !draft.teacherId ||
      !draft.subject ||
      !draft.studentId
    ) {
      router.replace('/booking/new' as any);
    }
  }, [draft.date, draft.time, draft.teacherId, draft.subject, draft.studentId]);

  useFocusEffect(
    useCallback(() => {
      setPoliciesViewed(policiesAck.hasViewed(draft.studentId));
    }, [draft.studentId]),
  );

  useEffect(() => {
    if (!hold) return;
    const t = setInterval(() => {
      const r = Math.max(0, Math.floor((hold.expiresAt - Date.now()) / 1000));
      setRemaining(r);
      if (r === 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [hold?.id, hold?.expiresAt]);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  const onChangeSchedule = () => {
    if (draft.holdId) releaseHold(draft.holdId);
    setHoldId(null);
    router.back();
  };

  const openPolicies = () => {
    router.push(`/class/policies?studentId=${draft.studentId}` as any);
  };

  const method = paymentMethods.find((m) => m.id === methodId) ?? null;

  const handleUploadProof = () => {
    // La carga real de imagen/PDF se implementará con expo-document-picker
    // cuando conectemos el bucket `payment-receipts`. Por ahora simulamos
    // la selección para mantener el flujo unificado.
    Alert.alert('Comprobante', 'Selecciona un archivo', [
      {
        text: 'Imagen',
        onPress: () => setProofName('comprobante.jpg'),
      },
      {
        text: 'PDF',
        onPress: () => setProofName('comprobante.pdf'),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const canConfirm = useMemo(() => {
    if (busy) return false;
    if (hold && remaining === 0) return false;
    if (!policiesViewed) return false;
    if (requiresPayment) {
      if (!method) return false;
      if (method.requiresProof && !proofName) return false;
    }
    return true;
  }, [busy, hold, remaining, policiesViewed, requiresPayment, method, proofName]);

  const onConfirm = () => {
    if (!canConfirm) {
      if (!policiesViewed) setError('Revisa las políticas antes de confirmar.');
      else if (requiresPayment && !method) setError('Elige un método de pago.');
      else if (requiresPayment && method?.requiresProof && !proofName)
        setError('Adjunta tu comprobante para continuar.');
      return;
    }
    setBusy(true);
    setError('');
    const result = createBooking(
      {
        studentId: draft.studentId,
        studentName: draft.studentName,
        studentAvatar: draft.studentAvatar,
        teacherId: draft.teacherId,
        teacherName: draft.teacherName,
        teacherAvatar: draft.teacherAvatar,
        subject: draft.subject,
        date: draft.date,
        time: draft.time,
      },
      draft.holdId ?? undefined,
    );
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setHoldId(null);
    const id = result.booking.id;
    router.replace(`/booking/success?id=${id}` as any);
    setTimeout(() => reset(), 200);
  };

  const holdExpired = hold ? remaining === 0 : false;

  const primaryLabel = requiresPayment
    ? method?.kind === 'gateway'
      ? 'Pagar y confirmar'
      : method?.requiresProof && proofName
      ? 'Enviar y confirmar'
      : 'Confirmar reserva'
    : 'Confirmar reserva';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Paso 3 de 3</Text>
          <Text style={typography.h2}>Resumen</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <StepDots current={2} />

        {hold && !holdExpired && (
          <View style={s.holdBanner}>
            <Ionicons name="lock-closed" size={16} color={colors.primaryDark} />
            <Text style={s.holdText}>
              Horario reservado · {mm}:{ss}
            </Text>
          </View>
        )}
        {hold && holdExpired && (
          <View style={[s.holdBanner, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[s.holdText, { color: colors.danger }]}>
              La reserva temporal expiró. Vuelve al horario.
            </Text>
          </View>
        )}

        <View style={s.hero}>
          <View style={s.serviceTag}>
            <Ionicons name="person" size={11} color={colors.primaryDark} />
            <Text style={s.serviceTagText}>Tutoría individual</Text>
          </View>
          <Text style={s.heroSubject}>{draft.subject}</Text>
          <Text style={s.heroDate}>
            {dateUtils.formatDisplay(draft.date)} · {draft.time}
          </Text>
        </View>

        <View style={s.card}>
          <Row
            avatar={draft.teacherAvatar}
            name={
              draft.teacherId === 'any' ? 'Auto-asignación' : draft.teacherName
            }
            role="Profesor"
          />
          <Divider />
          <Row avatar={draft.studentAvatar} name={draft.studentName} role="Estudiante" />
        </View>

        <View style={s.card}>
          <InfoLine icon="time-outline" label="Duración" value="60 minutos" />
          <InfoLine
            icon="hourglass-outline"
            label="Horas disponibles"
            value={`${hoursLeft} h`}
          />
          {requiresPayment ? (
            <InfoLine
              icon="pricetag-outline"
              label="Precio"
              value={`$${PRICE_PER_HOUR.toFixed(2)}`}
            />
          ) : null}
          <InfoLine
            icon={requiresPayment ? 'card-outline' : 'checkmark-circle'}
            label="Estado inicial"
            value={requiresPayment ? 'Pendiente de pago' : 'Confirmada'}
            tone={requiresPayment ? 'warning' : 'success'}
            last
          />
        </View>

        {/* ═════════════ Método de pago (inline) ═════════════ */}
        {requiresPayment ? (
          <View style={s.paySection}>
            <Text style={s.payTitle}>Método de pago</Text>
            <Text style={s.paySubtitle}>
              Elige cómo quieres pagar esta reserva.
            </Text>

            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {paymentMethods.map((m) => (
                <PaymentOptionRow
                  key={m.id}
                  option={m}
                  selected={methodId === m.id}
                  onPress={() => {
                    setMethodId(m.id);
                    setError('');
                    if (!m.requiresProof) setProofName(null);
                  }}
                />
              ))}
              {paymentMethods.length === 0 ? (
                <View style={s.emptyPay}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                  <Text style={s.emptyPayText}>
                    No hay métodos de pago activos. Contacta al administrador.
                  </Text>
                </View>
              ) : null}
            </View>

            {method?.requiresProof && !method.whatsappOnly ? (
              <Pressable
                onPress={handleUploadProof}
                style={({ pressed }) => [
                  s.uploadBox,
                  proofName ? s.uploadBoxDone : null,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons
                  name={proofName ? 'checkmark-circle' : 'cloud-upload-outline'}
                  size={20}
                  color={proofName ? colors.success : colors.primaryDark}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.uploadLabel}>
                    {proofName ? 'Comprobante adjunto' : 'Adjuntar comprobante'}
                  </Text>
                  <Text style={s.uploadHint} numberOfLines={1}>
                    {proofName ?? 'Imagen o PDF · queda pendiente de validación'}
                  </Text>
                </View>
                {proofName ? (
                  <Text style={s.uploadReplace}>Cambiar</Text>
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.primaryDark}
                  />
                )}
              </Pressable>
            ) : null}

            {method && method.kind !== 'gateway' ? (
              <View style={s.payHint}>
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={colors.textMuted}
                />
                <Text style={s.payHintText}>
                  El supervisor validará tu pago en las próximas horas.
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={s.planBox}>
            <Ionicons name="hourglass" size={18} color={colors.success} />
            <Text style={s.planBoxText}>
              Esta reserva utilizará horas disponibles de tu plan.
            </Text>
          </View>
        )}

        {/* Reglas */}
        <KnowCard
          rules={POLICY_COPY.bookingSummary}
          style={{ marginTop: spacing.lg }}
        />

        {error !== '' && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={openPolicies}
          style={({ pressed }) => [s.policyBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={colors.primaryDark}
          />
          <Text style={s.policyBtnText}>Ver políticas</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
        </Pressable>

        {policiesViewed ? (
          <View style={s.policyStatus}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[s.policyStatusText, { color: colors.success }]}>
              Políticas revisadas
            </Text>
          </View>
        ) : (
          <View style={s.policyStatus}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
            <Text style={[s.policyStatusText, { color: colors.warning }]}>
              Revisa las políticas antes de confirmar
            </Text>
          </View>
        )}

        <Pressable
          onPress={onConfirm}
          disabled={!canConfirm}
          style={({ pressed }) => [
            s.primaryBtn,
            !canConfirm && { opacity: 0.5 },
            pressed && canConfirm && { opacity: 0.9 },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.textOnPrimary} />
          <Text style={s.primaryText}>{primaryLabel}</Text>
        </Pressable>

        <Pressable onPress={onChangeSchedule} style={s.secondaryBtn}>
          <Text style={s.secondaryText}>Cambiar horario</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Componentes internos
// ══════════════════════════════════════════════════════════════════════════

function PaymentOptionRow({
  option,
  selected,
  onPress,
}: {
  option: PaymentMethodOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.payOption,
        selected && s.payOptionOn,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[s.payIcon, selected && s.payIconOn]}>
        <Ionicons
          name={option.icon as any}
          size={18}
          color={selected ? colors.textOnPrimary : colors.primaryDark}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.payOptionLabel}>{option.label}</Text>
        <Text style={s.payOptionDesc} numberOfLines={2}>
          {option.description}
        </Text>
      </View>
      <View style={[s.radio, selected && s.radioOn]}>
        {selected ? <View style={s.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

function Row({ avatar, name, role }: { avatar: string; name: string; role: string }) {
  return (
    <View style={s.row}>
      <Avatar name={name} uri={avatar} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyStrong}>{name}</Text>
        <Text style={typography.caption}>{role}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }}
    />
  );
}

function InfoLine({
  icon,
  label,
  value,
  tone,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger' | 'default';
  last?: boolean;
}) {
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
      ? colors.warning
      : tone === 'danger'
      ? colors.danger
      : colors.text;
  return (
    <View
      style={[
        s.infoLine,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={s.infoIcon}>
        <Ionicons name={icon as any} size={16} color={colors.primaryDark} />
      </View>
      <Text style={typography.caption}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={[typography.bodyStrong, { color }]}>{value}</Text>
    </View>
  );
}

function StepDots({ current }: { current: number }) {
  return (
    <View style={s.dotsRow}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[s.dot, i === current && s.dotActive, i < current && s.dotDone]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryDark },

  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  holdText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },

  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.md,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  serviceTagText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 11,
  },
  heroSubject: { color: colors.textOnPrimary, fontSize: 22, fontWeight: '700' },
  heroDate: { color: colors.primarySoft, fontSize: 14, marginTop: 6 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Método de pago ───────────────────────────────────────────────
  paySection: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.sm,
  },
  payTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  paySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  payOptionOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  payIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payIconOn: {
    backgroundColor: colors.primary,
  },
  payOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  payOptionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  emptyPay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  emptyPayText: { flex: 1, fontSize: 12, color: colors.textSubtle },

  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  uploadBoxDone: {
    borderStyle: 'solid',
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  uploadHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  uploadReplace: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    textDecorationLine: 'underline',
  },

  payHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  payHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },

  planBox: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },
  planBoxText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  errorText: { color: colors.danger, fontWeight: '600', fontSize: 13, flex: 1 },

  policyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  policyBtnText: {
    flex: 1,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
  },
  policyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  policyStatusText: { fontWeight: '700', fontSize: 12 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  primaryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },

  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
