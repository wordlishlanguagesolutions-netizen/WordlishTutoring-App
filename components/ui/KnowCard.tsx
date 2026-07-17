import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '@/constants/theme';

// ============================================================================
// KnowCard · tarjeta inline "💡 Lo que debes saber".
// Reemplaza los modales largos con reglas cortas en el momento en que el
// usuario las necesita. El copy proviene siempre de POLICY_COPY
// (constants/policies.ts) para que sea configurable desde el admin.
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
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    ...shadow.sm,
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rules: { gap: spacing.sm },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primaryDark,
    marginTop: 8,
  },
  ruleText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    ...typography.body,
  },
});
