import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '@/constants/theme';

// ============================================================================
// KnowCard · tarjeta inline "Lo que debes saber".
// Reemplaza los modales largos con reglas cortas en el momento en que el
// usuario las necesita. El copy proviene siempre de POLICY_COPY.
// ============================================================================

interface KnowCardProps {
  title?: string;
  rules: string[];
  style?: StyleProp<ViewStyle>;
}

export function KnowCard({
  title = 'Lo que debes saber',
  rules,
  style,
}: KnowCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.bulb}>💡</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.rules}>
        {rules.map((r, i) => (
          <View key={i} style={styles.ruleRow}>
            <View style={styles.bullet} />
            <Text style={styles.ruleText}>{r}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceTinted,
    borderRadius: radius.card,
    padding: spacing.card,
    borderWidth: 1,
    borderColor: colors.accent,
    ...shadow.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  bulb: {
    fontSize: 16,
  },
  title: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rules: {
    gap: spacing.sm,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  ruleText: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
});
