import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  TextInput,
  ScrollView,
} from 'react-native';
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

export default function SettingsScreen() {
  // Re-render reactivo cuando cambia cualquier valor de app_settings.
  const [settingsTick, setSettingsTick] = useState(0);

  useEffect(() => {
    hydrateAppSettings().catch(() => {});
    const unsub = subscribeSettings(() => setSettingsTick((t) => t + 1));
    return unsub;
  }, []);

  // Valor live desde app_settings (nunca cacheado en estado local).
  const waEnabled = paymentConfig.whatsappProofEnabled;

  const toggleWhatsapp = (v: boolean) => {
    // Optimistic + rollback los maneja el servicio; el subscribe repinta.
    setWhatsappProofEnabled(v).catch(() => {});
  };

  return (
    <Screen>
      <Header title="Ajustes" subtitle="Configuración global" />

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

      <Text style={[typography.h3, styles.section]}>Soporte</Text>
      <SupportRow role="admin" screen="Ajustes" />
    </Screen>
  );
}

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
