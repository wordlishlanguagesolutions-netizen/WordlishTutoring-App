import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Card, SupportRow } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';

const SETTINGS = [
  { icon: 'time-outline', title: 'Tolerancia profesor', value: '5 minutos' },
  { icon: 'time-outline', title: 'Tolerancia estudiante', value: '15 minutos' },
  { icon: 'logo-whatsapp', title: 'WhatsApp API', value: 'No configurada' },
  { icon: 'videocam-outline', title: 'Zoom API', value: 'No configurada' },
  { icon: 'card-outline', title: 'Cuanto API', value: 'No configurada' },
  { icon: 'card-outline', title: 'Yappy API', value: 'No configurada' },
];

const sectionStyle = { marginTop: spacing.lg, marginBottom: spacing.md };

export default function SettingsScreen() {
  return (
    <Screen>
      <Header title="Ajustes" subtitle="Configuración global" />
      <View style={{ gap: spacing.sm }}>
        {SETTINGS.map((s, i) => (
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

      <Text style={[typography.h3, sectionStyle]}>Soporte</Text>
      <SupportRow role="admin" screen="Ajustes" />
    </Screen>
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
});
