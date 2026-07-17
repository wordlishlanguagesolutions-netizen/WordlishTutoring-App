import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Header, Card } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';

const HISTORY = [
  { id: '1', title: 'Clase impartida', detail: 'Carlos · Lucía · 09:00', tone: 'success' },
  { id: '2', title: 'Estudiante ausente', detail: 'María · Diego · 08:30', tone: 'danger' },
  { id: '3', title: 'Reprogramada', detail: 'Ana · Sara · 08:00', tone: 'warning' },
  { id: '4', title: 'Clase impartida', detail: 'Carlos · Pablo · 07:00', tone: 'success' },
];

const TONES: Record<string, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export default function HistoryScreen() {
  return (
    <Screen>
      <Header title="Historial" />
      <View style={{ gap: spacing.sm }}>
        {HISTORY.map((h) => {
          const t = TONES[h.tone];
          return (
            <Card key={h.id}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={typography.bodyStrong}>{h.title}</Text>
                  <Text style={typography.caption}>{h.detail}</Text>
                </View>
                <View style={[styles.dot, { backgroundColor: t.bg }]}>
                  <View style={[styles.dotInner, { backgroundColor: t.fg }]} />
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
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: { width: 10, height: 10, borderRadius: 5 },
});
