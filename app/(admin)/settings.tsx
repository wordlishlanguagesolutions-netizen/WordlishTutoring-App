import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Card, SupportRow } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import {
  PAYMENT_METHODS,
  paymentConfig,
  setWhatsappProofEnabled,
  type PaymentMethodOption,
} from '@/services/paymentConfig';

// ============================================================================
// Admin · Ajustes globales.
// Añadido: toggles del módulo de pagos. Encender/apagar la opción
// "Ya envié mi comprobante por WhatsApp" y ver el estado de cada método
// (tarjeta, Yappy, ACH, comprobante) sin tocar código.
// ============================================================================

const OPERATIONAL = [
  { icon: 'time-outline', title: 'Tolerancia profesor', value: '5 minutos' },
  { icon: 'time-outline', title: 'Tolerancia estudiante', value: '15 minutos' },
  { icon: 'videocam-outline', title: 'Zoom API', value: 'No configurada' },
];

export default function SettingsScreen() {
  const [waEnabled, setWaEnabled] = useState<boolean>(
    paymentConfig.whatsappProofEnabled,
  );

  const toggleWhatsapp = (v: boolean) => {
    setWhatsappProofEnabled(v);
    setWaEnabled(v);
  };

  return (
    <Screen>
      <Header title="Ajustes" subtitle="Configuración global" />

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

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {PAYMENT_METHODS.map((m) => (
          <MethodRow key={m.id} method={m} />
        ))}
      </View>

      <Text style={[typography.h3, styles.section]}>Soporte</Text>
      <SupportRow role="admin" screen="Ajustes" />
    </Screen>
  );
}

function MethodRow({ method }: { method: PaymentMethodOption }) {
  const active = method.enabled;
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
