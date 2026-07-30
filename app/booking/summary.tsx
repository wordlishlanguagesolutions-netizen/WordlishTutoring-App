import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { Avatar, KnowCard } from '@/components/ui';
import { WizardHeader } from '@/components/booking';
import { useDraftBooking } from '@/hooks/useDraftBooking';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { dateUtils } from '@/services/mockData';
import { policiesAck } from '@/services/policiesAck';
import { POLICY_COPY } from '@/constants/policies';
import { getSetting } from '@/services/appSettingsService';


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

export default function BookingSummary() {
  const router = useRouter();
  const { user } = useAuth();
  const { draft, setHoldId, reset } = useDraftBooking();
  const { holds, createBooking, releaseHold, remainingHours } = useBookings();

  const hold = holds.find((h) => h.id === draft.holdId);
  const hoursLeft = remainingHours[draft.studentId] ?? 0;
  const requiresPayment = hoursLeft === 0;
  const PRICE_PER_HOUR = getSetting<number>('payment.price_per_hour_usd', 18);

  const role = (user as any)?.role ?? 'student';
  const homeRoute = (): string => {
    switch (role) {
      case 'guardian':
        return '/(guardian)';
      case 'teacher':
        return '/(teacher)';
      case 'supervisor':
        return '/(supervisor)';
      case 'admin':
        return '/(admin)';
      default:
        return '/(student)';
    }
  };

  const [remaining, setRemaining] = useState<number>(() =>
    hold ? Math.max(0, Math.floor((hold.expiresAt - Date.now()) / 1000)) : 0,
  );
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [policiesViewed, setPoliciesViewed] = useState<boolean>(
    policiesAck.hasViewed(draft.studentId),
  );
  const [policiesAccepted, setPoliciesAccepted] = useState<boolean>(false);

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

  const canConfirm = useMemo(() => {
    if (busy) return false;
    if (hold && remaining === 0) return false;
    if (!policiesViewed) return false;
    if (!policiesAccepted) return false;
    return true;
  }, [busy, hold, remaining, policiesViewed, policiesAccepted]);

  const onConfirm = () => {
    if (!canConfirm) {
      if (!policiesViewed) setError('Revisa las políticas antes de confirmar.');
      else if (!policiesAccepted) setError('Debes aceptar las políticas para continuar.');
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
    // Flujo unificado: si requiere pago, va al Paso 4 (success como pantalla
    // de pago). Si ya tiene horas, la reserva queda confirmada y volvemos
    // directamente al home; el estado se muestra dentro de la reserva.
    if (requiresPayment) {
      router.replace(`/booking/success?id=${id}` as any);
    } else {
      router.replace(homeRoute() as any);
    }
    setTimeout(() => reset(), 200);
  };

  const holdExpired = hold ? remaining === 0 : false;

  const primaryLabel = requiresPayment
    ? 'Continuar al pago'
    : 'Confirmar reserva';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <WizardHeader step={2} title="Resumen" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
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

        {requiresPayment ? null : (
          <View style={s.planBox}>
            <Ionicons name="hourglass" size={18} color={colors.success} />
            <Text style={s.planBoxText}>
              Se descontara 1 hora de tu plan · Te quedan {hoursLeft} h disponibles.
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
            name={policiesViewed ? 'checkmark-circle' : 'document-text-outline'}
            size={18}
            color={policiesViewed ? colors.success : colors.primaryDark}
          />
          <Text style={s.policyBtnText}>
            {policiesViewed ? 'Políticas revisadas · Ver de nuevo' : 'Ver políticas'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
        </Pressable>

        <Pressable
          onPress={() => {
            if (!policiesViewed) {
              setError('Primero revisa las políticas.');
              return;
            }
            setPoliciesAccepted((v) => !v);
            setError('');
          }}
          style={({ pressed }) => [
            s.acceptRow,
            !policiesViewed && { opacity: 0.6 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[s.checkbox, policiesAccepted && s.checkboxOn]}>
            {policiesAccepted ? (
              <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
            ) : null}
          </View>
          <Text style={s.acceptText}>
            He leído y acepto las políticas de Wordlish.
          </Text>
        </Pressable>

        <Pressable
          onPress={onConfirm}
          disabled={!canConfirm}
          style={({ pressed }) => [
            s.primaryBtn,
            !canConfirm && { opacity: 0.5 },
            pressed && canConfirm && { opacity: 0.9 },
          ]}
        >
          <Ionicons
            name={requiresPayment ? 'arrow-forward' : 'checkmark-circle'}
            size={20}
            color={colors.textOnPrimary}
          />
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

function StepDotsUnused() {
  return null;
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
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
  pendingBox: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  pendingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
    lineHeight: 18,
  },
  payTitleInline: {
    ...typography.h3,
    marginTop: spacing.lg,
  },
  payHintInline: {
    ...typography.caption,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  methodValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  methodHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  cardMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  cardMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMethodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  cardMethodHint: {
    fontSize: 12,
    color: colors.primarySoft,
    marginTop: 2,
  },
  payFooterHint: {
    ...typography.caption,
    marginTop: spacing.sm,
    fontStyle: 'italic',
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
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  acceptText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
