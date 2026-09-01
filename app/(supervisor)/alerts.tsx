import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Card } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';

const ALERTS = [
  { id: '1', type: 'Screenshot faltante', when: 'Hace 3 min', icon: 'camera-outline', tone: 'warning' },
  { id: '2', type: 'Profesor tarde', when: 'Hace 6 min', icon: 'time-outline', tone: 'danger' },
  { id: '3', type: 'Estudiante sin cámara', when: 'Hace 12 min', icon: 'videocam-off-outline', tone: 'warning' },
];

const TONES: Record<string, { bg: string; fg: string }> = {
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export default function AlertsScreen() {
  return (
    <Screen>
      <Header title="Alertas" />
      <View style={{ gap: spacing.md }}>
        {ALERTS.map((a) => {
          const t = TONES[a.tone];
          return (
            <Card key={a.id}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: t.bg }]}>
                  <Ionicons name={a.icon as any} size={20} color={t.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={typography.bodyStrong}>{a.type}</Text>
                  <Text style={typography.caption}>{a.when}</Text>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
