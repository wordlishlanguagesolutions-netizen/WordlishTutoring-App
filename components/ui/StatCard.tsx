import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, radius, spacing, typography, shadow } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  hint?: string;
}

const TONES = {
  primary: { bg: colors.surfaceTinted, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  info: { bg: colors.infoSoft, fg: colors.info },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export function StatCard({ label, value, icon, tone = 'primary', hint }: StatCardProps) {
  const t = TONES[tone];
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={20} color={t.fg} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.sm,
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    ...typography.numericSmall,
  },
  label: {
    ...typography.caption,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
});
