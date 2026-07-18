import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius, typography } from '@/constants/theme';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: string;
}

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  muted: { bg: colors.surfaceAlt, fg: colors.textSubtle },
  primary: { bg: colors.surfaceTinted, fg: colors.primary },
};

export function StatusBadge({ label, tone = 'info', icon }: StatusBadgeProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon as any} size={12} color={t.fg} /> : null}
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
