import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, shadow } from '@/constants/theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'default' | 'soft' | 'primary';
}

export function Card({ children, style, tone = 'default' }: CardProps) {
  const toneStyle =
    tone === 'primary'
      ? { backgroundColor: colors.primary }
      : tone === 'soft'
      ? { backgroundColor: colors.surfaceAlt }
      : { backgroundColor: colors.surface };

  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
});
