import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Card, SupportRow, Modal, StatusBadge } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import {
  PAYMENT_METHODS,
  paymentConfig,
  setWhatsappProofEnabled,
  isPaymentMethodEnabled,
  type PaymentMethodOption,
} from '@/services/paymentConfig';
import {
  getSetting,
  hydrateAppSettings,
  subscribeSettings,
} from '@/services/appSettingsService';
import {
  teacherRatesConfig,
  getYearRates,
  listYears,
  upsertRate,
  cloneYear,
  setCurrentYear,
  hydrateTeacherRates,
  subscribeTeacherRates,
  formatAmount,
  TIER_LABEL,
  KIND_LABEL,
  type TeacherTier,
  type ClassKind,
} from '@/services/teacherRatesConfig';
import { CommunicationBlock } from '@/components/admin/CommunicationBlock';
import { ZoomBlock } from '@/components/admin/ZoomBlock';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import {
  pingAllEdgeFunctions,
  type EdgeFunctionHealth,
  type EdgeFunctionStatus,
} from '@/services/edgeFunctionsHealth';
import { CloudIntegrityBlock } from '@/components/admin/CloudIntegrityBlock';

// ============================================================================
// Admin · Ajustes globales.
// Módulos:
//   · Operación (tolerancias, Zoom)
//   · Pagos (WhatsApp toggle + catálogo de métodos)
//   · Tarifas por hora de profesores (variable por año, categoría y modalidad)
// ============================================================================

const OPERATIONAL = [
  { icon: 'time-outline', title: 'Tolerancia profesor', value: '5 minutos' },
  { icon: 'time-outline', title: 'Tolerancia estudiante', value: '15 minutos' },
];

// ---------------------------------------------------------------------------
// Production readiness · claves criticas de app_settings.
// Si alguna falta o queda vacia, se muestra un banner solo al admin.
// No rompe la app: los defaults del service cubren el caso offline.
// ---------------------------------------------------------------------------
interface ReadinessCheck { key: string; label: string; kind: 'string' | 'number' | 'list'; }
const READINESS_CHECKS: ReadinessCheck[] = [
  { key: 'payment.yappy_number',        label: 'Numero Yappy',              kind: 'string' },
  { key: 'payment.ach_account',         label: 'Cuenta ACH',                kind: 'string' },
  { key: 'payment.beneficiary_name',    label: 'Beneficiario',              kind: 'string' },
  { key: 'payment.checkout_url',        label: 'URL checkout (Cuanto)',     kind: 'string' },
  { key: 'payment.price_per_hour_usd',  label: 'Precio por hora (USD)',     kind: 'number' },
  { key: 'payment.methods_enabled',     label: 'Metodos de pago activos',   kind: 'list'   },
  { key: 'whatsapp.official_number',    label: 'WhatsApp oficial',          kind: 'string' },
  { key: 'zoom.official_link',          label: 'Enlace de Zoom',            kind: 'string' },
];

function collectMissingSettings(): ReadinessCheck[] {
  const missing: ReadinessCheck[] = [];
  READINESS_CHECKS.forEach((c) => {
    const v = getSetting<unknown>(c.key, undefined as unknown);
    if (c.kind === 'string') {
      if (typeof v !== 'string' || v.trim().length === 0) missing.push(c);
    } else if (c.kind === 'number') {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n) || n <= 0) missing.push(c);
    } else {
      if (!Array.isArray(v) || v.length === 0) missing.push(c);
    }
  });
  return missing;
}

function ReadinessBanner({ missing }: { missing: ReadinessCheck[] }) {
  if (missing.length === 0) return null;
  return (
    <View style={readinessStyles.wrap}>
      <View style={readinessStyles.head}>
        <Ionicons name="warning" size={18} color={colors.warning} />
        <Text style={readinessStyles.title}>Configuracion pendiente para produccion</Text>
      </View>
      <Text style={readinessStyles.desc}>
        Faltan {missing.length} {missing.length === 1 ? 'ajuste' : 'ajustes'} para habilitar cobros reales. Solo tu (admin) ves este aviso; la app sigue funcionando con valores por defecto.
      </Text>
      <View style={{ gap: 6, marginTop: spacing.sm }}>
        {missing.map((m) => (
          <View key={m.key} style={readinessStyles.row}>
            <Ionicons name="ellipse" size={6} color={colors.warning} />
            <Text style={readinessStyles.rowLabel}>{m.label}</Text>
            <Text style={readinessStyles.rowKey}>{m.key}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  // Re-render reactivo cuando cambia cualquier valor de app_settings.
  const [settingsTick, setSettingsTick] = useState(0);

  useEffect(() => {
    hydrateAppSettings().catch(() => {});
    const unsub = subscribeSettings(() => setSettingsTick((t) => t + 1));
    return unsub;
  }, []);

  // Valor live desde app_settings (nunca cacheado en estado local).
  const waEnabled = paymentConfig.whatsappProofEnabled;
  const missingSettings = useMemo(
    () => collectMissingSettings(),
    // settingsTick fuerza reevaluacion cuando cualquier valor cambia.
    [settingsTick],
  );

  const toggleWhatsapp = (v: boolean) => {
    // Optimistic + rollback los maneja el servicio; el subscribe repinta.
    setWhatsappProofEnabled(v).catch(() => {});
  };

  return (
    <Screen>
      <Header title="Ajustes" subtitle="Configuración global" />

      <ReadinessBanner missing={missingSettings} />

      <Text style={styles.section}>Integridad Cloud</Text>
      <Text style={typography.caption}>
        Snapshot en vivo de las tablas core: admins, profesores, materias
        activas, disponibilidad publicada, reservas, pagos, reportes y
        alertas. Cualquier item en rojo bloquea el beta.
      </Text>
      <CloudIntegrityBlock />

      <Text style={styles.section}>Diagnóstico SMTP</Text>
      <Text style={typography.caption}>
        Verifica que Resend puede entregar correos antes de invitar staff real.
        Envía un correo de recuperación al correo del admin logueado y reporta
        éxito o el error concreto devuelto por el proveedor.
      </Text>
      <SmtpDiagnosticBlock />

      <Text style={styles.section}>Diagnóstico Edge Functions</Text>
      <Text style={typography.caption}>
        Verifica que las 3 edge functions esten desplegadas y respondan.
        Ping no destructivo: no crea usuarios, no envia push, no consume
        tokens de IA.
      </Text>
      <EdgeFunctionsHealthBlock />

      <Text style={styles.section}>Comunicación</Text>
      <Text style={typography.caption}>
        Número oficial de WhatsApp de Wordlish y módulos donde aparece el
        botón de contacto. Toda la app lo lee desde esta configuración;
        no hay número escrito en el código.
      </Text>
      <CommunicationBlock />

      <Text style={styles.section}>Videoconferencia · Zoom</Text>
      <Text style={typography.caption}>
        Enlace único de Zoom para todas las clases de Wordlish. Todos los
        botones "Entrar a Zoom" leen desde esta configuración; no hay URL
        escrita en el código.
      </Text>
      <ZoomBlock />

      <Text style={styles.section}>Operación</Text>
      <View style={{ gap: spacing.sm }}>
        {OPERATIONAL.map((s, i) => (
          <Card key={i}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name={s.icon as any} size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>{s.title}</Text>
                <Text style={typography.caption}>{s.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        ))}
      </View>

      <Text style={styles.section}>Tarifas por hora · Profesores</Text>
      <Text style={typography.caption}>
        Define cuánto se paga al profesor por cada hora dictada. Los valores
        son variables por año, categoría y modalidad. Cuando conectemos la
        nómina real (Fase 3E) estos montos alimentarán el cálculo automático.
      </Text>
      <TeacherRatesBlock />

      <Text style={styles.section}>Módulo de pagos</Text>
      <Text style={typography.caption}>
        Activa o desactiva cada método sin tocar código. Cuando conectemos una
        pasarela real (Stripe, PagueloFacil, Wompi, Yappy) bastará con encender
        el método correspondiente.
      </Text>

      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="logo-whatsapp" size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyStrong}>Comprobante por WhatsApp</Text>
            <Text style={typography.caption}>
              Permite a los estudiantes marcar "Ya envié mi comprobante por
              WhatsApp" durante la reserva.
            </Text>
          </View>
          <Switch
            value={waEnabled}
            onValueChange={toggleWhatsapp}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </Card>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }} key={`methods-${settingsTick}`}>
        {PAYMENT_METHODS.map((m) => (
          <MethodRow key={m.id} method={m} active={isPaymentMethodEnabled(m.id)} />
        ))}
      </View>

      <Text style={styles.section}>Notificaciones</Text>
      <Text style={typography.caption}>
        Cada usuario controla sus canales desde su propio perfil. Como admin
        tambien puedes acceder aqui para revisar tus preferencias.
      </Text>
      <Pressable
        onPress={() => router.push('/settings/notifications' as any)}
        style={({ pressed }) => [notifStyles.entryRow, pressed && { opacity: 0.9 }]}
      >
        <View style={notifStyles.entryIcon}>
          <Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.bodyStrong}>Preferencias de notificaciones</Text>
          <Text style={typography.caption}>
            Push Android, sonido web, correo y WhatsApp (proximamente).
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      <Text style={styles.section}>Tickets de soporte</Text>
      <Text style={typography.caption}>
        Cada vez que un usuario abre soporte (WhatsApp, in-app, correo) se
        registra un ticket en Cloud. Aqui puedes revisarlos y marcarlos como
        resueltos.
      </Text>
      <Pressable
        onPress={() => router.push('/(admin)/support-tickets' as any)}
        style={({ pressed }) => [notifStyles.entryRow, pressed && { opacity: 0.9 }]}
      >
        <View style={notifStyles.entryIcon}>
          <Ionicons name="chatbubbles-outline" size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.bodyStrong}>Ver tickets</Text>
          <Text style={typography.caption}>
            Filtra por estado, marca resueltos o reabre casos cerrados.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      <Text style={[typography.h3, styles.section]}>Soporte</Text>
      <SupportRow role="admin" screen="Ajustes" />
    </Screen>
  );
}

const notifStyles = StyleSheet.create({
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============================================================================
// Tarifas por hora · Profesores
// ============================================================================
type EditingCell = {
  tier: TeacherTier;
  kind: ClassKind;
  amount: string;
  underReview: boolean;
} | null;

function TeacherRatesBlock() {
  const [year, setYear] = useState<number>(teacherRatesConfig.currentYear);
  const [tick, setTick] = useState(0); // repinta tras hydrate / mutación Cloud
  const [editing, setEditing] = useState<EditingCell>(null);
  const [newYearOpen, setNewYearOpen] = useState(false);
  const [newYearValue, setNewYearValue] = useState<string>('');

  // Hidrata desde Cloud al montar y se suscribe a cambios (optimistic +
  // confirmación remota) para repintar automáticamente.
  useEffect(() => {
    hydrateTeacherRates()
      .then(() => {
        setYear(teacherRatesConfig.currentYear);
        setTick((t) => t + 1);
      })
      .catch(() => {});
    const unsub = subscribeTeacherRates(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const years = useMemo(() => listYears(), [tick]);
  const data = useMemo(() => getYearRates(year), [year, tick]);

  const forceRefresh = () => setTick((t) => t + 1);

  const changeYear = (y: number) => {
    setYear(y);
    setCurrentYear(y);
  };

  const openEdit = (tier: TeacherTier, kind: ClassKind) => {
    if (!data) return;
    const cell = data.rates.find((r) => r.tier === tier && r.kind === kind);
    setEditing({
      tier,
      kind,
      amount: cell ? String(cell.amount) : '0',
      underReview: cell?.underReview ?? false,
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const parsed = Number(editing.amount.replace(/[^0-9.]/g, '')) || 0;
    // Optimistic + persistencia Cloud (fire-and-forget con rollback interno).
    upsertRate(year, editing.tier, editing.kind, parsed, editing.underReview).catch(
      (err) => console.warn('[settings.saveEdit] upsertRate error', err),
    );
    setEditing(null);
    forceRefresh();
  };

  const createNewYear = () => {
    const parsed = parseInt(newYearValue, 10);
    if (!parsed || parsed < 2020 || parsed > 2100) return;
    if (getYearRates(parsed)) {
      changeYear(parsed);
    } else {
      cloneYear(year, parsed).catch((err) =>
        console.warn('[settings.createNewYear] cloneYear error', err),
      );
      changeYear(parsed);
    }
    setNewYearOpen(false);
    setNewYearValue('');
    forceRefresh();
  };

  if (!data) return null;

  const tiers: TeacherTier[] = ['essentials', 'specialist'];
  const kinds: ClassKind[] = ['individual', 'group'];

  return (
    <View style={ratesStyles.wrap}>
      {/* Selector de año */}
      <View style={ratesStyles.yearBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}
        >
          {years.map((y) => {
            const active = y === year;
            return (
              <Pressable
                key={y}
                onPress={() => changeYear(y)}
                style={({ pressed }) => [
                  ratesStyles.yearChip,
                  active && ratesStyles.yearChipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    ratesStyles.yearChipText,
                    active && ratesStyles.yearChipTextActive,
                  ]}
                >
                  {y}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={() => setNewYearOpen(true)}
          style={({ pressed }) => [
            ratesStyles.newYearBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="add" size={16} color={colors.textOnPrimary} />
          <Text style={ratesStyles.newYearBtnText}>Nuevo año</Text>
        </Pressable>
      </View>

      {/* Moneda + nota */}
      <View style={ratesStyles.metaRow}>
        <View style={ratesStyles.currencyBadge}>
          <Ionicons name="cash-outline" size={13} color={colors.primaryDark} />
          <Text style={ratesStyles.currencyText}>{data.currency}</Text>
        </View>
        {data.note ? (
          <Text style={ratesStyles.noteText} numberOfLines={2}>
            {data.note}
          </Text>
        ) : null}
      </View>

      {/* Grid de tarifas */}
      <View style={ratesStyles.grid}>
        {tiers.map((tier) => (
          <View key={tier} style={ratesStyles.tierBlock}>
            <View style={ratesStyles.tierHead}>
              <View
                style={[
                  ratesStyles.tierIcon,
                  {
                    backgroundColor:
                      tier === 'specialist'
                        ? colors.surfaceTinted
                        : colors.infoSoft,
                  },
                ]}
              >
                <Ionicons
                  name={tier === 'specialist' ? 'ribbon' : 'school'}
                  size={16}
                  color={tier === 'specialist' ? colors.primary : colors.info}
                />
              </View>
              <Text style={ratesStyles.tierTitle}>{TIER_LABEL[tier]}</Text>
            </View>
            {kinds.map((kind) => {
              const rate = data.rates.find(
                (r) => r.tier === tier && r.kind === kind,
              );
              return (
                <Pressable
                  key={kind}
                  onPress={() => openEdit(tier, kind)}
                  style={({ pressed }) => [
                    ratesStyles.rateRow,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={ratesStyles.kindLabel}>{KIND_LABEL[kind]}</Text>
                    <Text style={ratesStyles.kindHint}>por hora dictada</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={ratesStyles.amountText}>
                      {rate ? formatAmount(rate.amount, data.currency) : '—'}
                    </Text>
                    {rate?.underReview ? (
                      <StatusBadge label="En evaluación" tone="warning" />
                    ) : null}
                  </View>
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={colors.textMuted}
                    style={{ marginLeft: spacing.sm }}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Modal editar tarifa */}
      <Modal
        visible={!!editing}
        onClose={() => setEditing(null)}
        title="Editar tarifa"
        subtitle={
          editing
            ? `${TIER_LABEL[editing.tier]} · ${KIND_LABEL[editing.kind]} · ${year}`
            : ''
        }
        primaryAction={{ label: 'Guardar', onPress: saveEdit }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setEditing(null) }}
      >
        {editing ? (
          <View style={{ gap: spacing.md }}>
            <View>
              <Text style={ratesStyles.inputLabel}>Monto por hora ({data.currency})</Text>
              <TextInput
                value={editing.amount}
                onChangeText={(v) => setEditing({ ...editing, amount: v })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={ratesStyles.input}
              />
              <Text style={ratesStyles.helper}>
                Puedes usar cualquier cifra entera. Ej. 25000.
              </Text>
            </View>

            <View style={ratesStyles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>Marcar en evaluación</Text>
                <Text style={typography.caption}>
                  Se mostrará una etiqueta indicando que la tarifa puede cambiar.
                </Text>
              </View>
              <Switch
                value={editing.underReview}
                onValueChange={(v) => setEditing({ ...editing, underReview: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        ) : null}
      </Modal>

      {/* Modal nuevo año */}
      <Modal
        visible={newYearOpen}
        onClose={() => setNewYearOpen(false)}
        title="Nueva tarifa anual"
        subtitle={`Se copiarán los montos del año ${year} como punto de partida`}
        primaryAction={{ label: 'Crear año', onPress: createNewYear }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setNewYearOpen(false) }}
      >
        <View style={{ gap: spacing.sm }}>
          <Text style={ratesStyles.inputLabel}>Año</Text>
          <TextInput
            value={newYearValue}
            onChangeText={setNewYearValue}
            keyboardType="numeric"
            placeholder="2027"
            placeholderTextColor={colors.textMuted}
            maxLength={4}
            style={ratesStyles.input}
          />
          <Text style={ratesStyles.helper}>
            Después podrás ajustar cada tarifa individualmente.
          </Text>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// Diagnóstico SMTP · envía un correo real (recovery OTP) al admin logueado
// para validar la configuración de Resend antes de invitar staff.
// No cambia contraseña; solo dispara el envío y reporta el resultado.
// ============================================================================
type SmtpTestResult =
  | { kind: 'ok'; email: string; at: string }
  | { kind: 'error'; email: string; message: string; at: string }
  | null;

function SmtpDiagnosticBlock() {
  const { user } = useAuth();
  const email = user?.email ?? '';
  const [sending, setSending] = useState<boolean>(false);
  const [result, setResult] = useState<SmtpTestResult>(null);

  const canSend = !!email && !sending;

  const sendTest = async () => {
    if (!email) return;
    setSending(true);
    setResult(null);
    try {
      if (!authService.isReal()) {
        setResult({
          kind: 'error',
          email,
          message:
            'Autenticación en modo mock. Activa EXPO_PUBLIC_AUTH_MODE=real para probar SMTP.',
          at: new Date().toISOString(),
        });
        return;
      }
      const res = await authService.resetPassword(email);
      const at = new Date().toISOString();
      if (res.ok) {
        setResult({ kind: 'ok', email, at });
      } else {
        setResult({
          kind: 'error',
          email,
          message: res.error || 'Error desconocido al enviar el correo.',
          at,
        });
      }
    } catch (err: any) {
      setResult({
        kind: 'error',
        email,
        message:
          err?.message || 'Fallo inesperado al invocar resetPasswordForEmail.',
        at: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  };

  const formatAt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <View style={smtpStyles.wrap}>
      <View style={smtpStyles.head}>
        <Ionicons name="mail-outline" size={18} color={colors.primaryDark} />
        <Text style={smtpStyles.title}>Envío de prueba</Text>
      </View>
      <Text style={smtpStyles.desc}>
        Dispara un correo real de recuperación al admin logueado usando el SMTP
        configurado (Resend). No cambia tu contraseña; solo valida entrega.
      </Text>

      <View style={smtpStyles.emailRow}>
        <Ionicons name="person-outline" size={14} color={colors.textSubtle} />
        <Text style={smtpStyles.emailText} numberOfLines={1}>
          {email || 'Sin sesión activa'}
        </Text>
      </View>

      <Pressable
        onPress={sendTest}
        disabled={!canSend}
        style={({ pressed }) => [
          smtpStyles.btn,
          !canSend && smtpStyles.btnDisabled,
          pressed && canSend && { opacity: 0.9 },
        ]}
      >
        <Ionicons name="send" size={14} color={colors.textOnPrimary} />
        <Text style={smtpStyles.btnText}>
          {sending ? 'Enviando...' : 'Enviar correo de prueba'}
        </Text>
      </Pressable>

      {result?.kind === 'ok' ? (
        <View style={[smtpStyles.result, smtpStyles.resultOk]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={smtpStyles.resultTitle}>Envío aceptado por Supabase Auth</Text>
            <Text style={smtpStyles.resultDesc}>
              Revisa {result.email} (bandeja principal y spam). Si no llega en
              2 min, verifica SPF/DKIM/CNAME en Resend {'>'} Domains.
            </Text>
            <Text style={smtpStyles.resultMeta}>Enviado: {formatAt(result.at)}</Text>
          </View>
        </View>
      ) : null}

      {result?.kind === 'error' ? (
        <View style={[smtpStyles.result, smtpStyles.resultErr]}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={smtpStyles.resultTitle}>No se pudo enviar</Text>
            <Text style={smtpStyles.resultDesc}>{result.message}</Text>
            <Text style={smtpStyles.resultMeta}>Intento: {formatAt(result.at)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ============================================================================
// Diagnóstico Edge Functions · ping ligero a las 3 functions desplegadas
// para confirmar que responden. No dispara logica destructiva.
// ============================================================================
type EdgeHealthState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ready'; results: EdgeFunctionHealth[]; at: string };

function EdgeFunctionsHealthBlock() {
  const [state, setState] = useState<EdgeHealthState>({ kind: 'idle' });

  const runCheck = async () => {
    setState({ kind: 'checking' });
    try {
      const results = await pingAllEdgeFunctions();
      setState({ kind: 'ready', results, at: new Date().toISOString() });
    } catch (err: any) {
      setState({
        kind: 'ready',
        results: [
          {
            id: 'create-staff-user',
            label: 'Alta de staff',
            status: 'error',
            latencyMs: null,
            message: err?.message || 'Excepcion al invocar el diagnostico.',
          },
        ],
        at: new Date().toISOString(),
      });
    }
  };

  const formatAt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const statusColor = (s: EdgeFunctionStatus) => {
    if (s === 'healthy') return colors.success;
    if (s === 'unauthorized') return colors.warning;
    return colors.danger;
  };
  const statusBg = (s: EdgeFunctionStatus) => {
    if (s === 'healthy') return colors.successSoft;
    if (s === 'unauthorized') return colors.warningSoft;
    return colors.dangerSoft;
  };
  const statusIcon = (s: EdgeFunctionStatus) => {
    if (s === 'healthy') return 'checkmark-circle';
    if (s === 'unauthorized') return 'shield-outline';
    if (s === 'not_deployed') return 'close-circle';
    return 'alert-circle';
  };
  const statusLabel = (s: EdgeFunctionStatus) => {
    if (s === 'healthy') return 'Desplegada';
    if (s === 'unauthorized') return 'Alcanza auth';
    if (s === 'not_deployed') return 'No desplegada';
    return 'Error';
  };

  const checking = state.kind === 'checking';

  return (
    <View style={edgeStyles.wrap}>
      <View style={edgeStyles.head}>
        <Ionicons name="pulse-outline" size={18} color={colors.primaryDark} />
        <Text style={edgeStyles.title}>Estado de despliegue</Text>
      </View>
      <Text style={edgeStyles.desc}>
        Envia un ping invalido a cada function para verificar que responde.
        Cualquier respuesta HTTP (400, 401, 500...) confirma que esta
        desplegada. Un fetch error o 404 indica que falta el deploy.
      </Text>

      <Pressable
        onPress={runCheck}
        disabled={checking}
        style={({ pressed }) => [
          edgeStyles.btn,
          checking && edgeStyles.btnDisabled,
          pressed && !checking && { opacity: 0.9 },
        ]}
      >
        <Ionicons name="flash" size={14} color={colors.textOnPrimary} />
        <Text style={edgeStyles.btnText}>
          {checking ? 'Verificando...' : 'Ejecutar diagnostico'}
        </Text>
      </Pressable>

      {state.kind === 'ready' ? (
        <View style={{ gap: 8 }}>
          {state.results.map((r) => (
            <View key={r.id} style={edgeStyles.row}>
              <View
                style={[
                  edgeStyles.rowIcon,
                  { backgroundColor: statusBg(r.status) },
                ]}
              >
                <Ionicons
                  name={statusIcon(r.status) as any}
                  size={16}
                  color={statusColor(r.status)}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={edgeStyles.rowTitle}>{r.label}</Text>
                <Text style={edgeStyles.rowSub} numberOfLines={1}>
                  {r.id}
                </Text>
                {r.message ? (
                  <Text style={edgeStyles.rowDetail} numberOfLines={2}>
                    {r.message}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View
                  style={[
                    edgeStyles.pill,
                    {
                      backgroundColor: statusBg(r.status),
                      borderColor: statusColor(r.status),
                    },
                  ]}
                >
                  <Text
                    style={[
                      edgeStyles.pillText,
                      { color: statusColor(r.status) },
                    ]}
                  >
                    {statusLabel(r.status)}
                  </Text>
                </View>
                <Text style={edgeStyles.rowMeta}>
                  {r.httpStatus ? `HTTP ${r.httpStatus}` : '—'}
                  {r.latencyMs != null ? ` · ${r.latencyMs}ms` : ''}
                </Text>
              </View>
            </View>
          ))}
          <Text style={edgeStyles.metaText}>
            Verificado: {formatAt(state.at)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function MethodRow({ method, active }: { method: PaymentMethodOption; active: boolean }) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name={method.icon as any} size={20} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.bodyStrong}>{method.label}</Text>
          <Text style={typography.caption} numberOfLines={2}>
            {method.description}
          </Text>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.pill,
                { backgroundColor: active ? colors.successSoft : colors.surfaceAlt },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: active ? colors.success : colors.textMuted },
                ]}
              >
                {active ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            <Text style={styles.provider}>Proveedor · {method.provider}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  provider: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
});

const smtpStyles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontWeight: '700', fontSize: 14 },
  desc: { color: colors.textSubtle, fontSize: 12, lineHeight: 17 },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  emailText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSubtle,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  btnDisabled: { backgroundColor: colors.textMuted, opacity: 0.6 },
  btnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 13 },
  result: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  resultOk: { backgroundColor: colors.successSoft, borderColor: colors.success },
  resultErr: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  resultTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  resultDesc: { fontSize: 12, color: colors.textSubtle, marginTop: 2, lineHeight: 16 },
  resultMeta: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
});

const edgeStyles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontWeight: '700', fontSize: 14 },
  desc: { color: colors.textSubtle, fontSize: 12, lineHeight: 17 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  btnDisabled: { backgroundColor: colors.textMuted, opacity: 0.6 },
  btnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rowDetail: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 4,
    lineHeight: 15,
  },
  rowMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
});

const readinessStyles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: 4,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.warning, fontWeight: '700', fontSize: 14 },
  desc: { color: colors.textSubtle, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  rowKey: { fontSize: 11, color: colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});

const ratesStyles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.md,
  },
  yearBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  yearChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
  },
  yearChipTextActive: { color: colors.textOnPrimary },
  newYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  newYearBtnText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTinted,
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.4,
  },
  noteText: {
    flex: 1,
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },

  grid: {
    gap: spacing.sm,
  },
  tierBlock: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tierHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  tierIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tierTitle: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  kindLabel: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  kindHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  amountText: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.textStrong,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textStrong,
    backgroundColor: colors.surface,
  },
  helper: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
});
