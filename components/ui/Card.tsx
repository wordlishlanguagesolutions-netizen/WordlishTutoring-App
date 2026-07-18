import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, shadow } from '@/constants/theme';

// ============================================================================
// Card · superficie base del Design System.
//
// Reglas:
//   · Border radius 20 px (spec oficial).
//   · Padding interno 20 px.
//   · Sombra `sm` extremadamente suave.
//   · Border 1 px muy tenue para separar sin ruido visual.
// ============================================================================

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'default' | 'soft' | 'primary' | 'tinted';
  padded?: boolean;
  elevated?: boolean;
}

export function Card({
  children,
  style,
  tone = 'default',
  padded = true,
  elevated = true,
}: CardProps) {
  const toneStyle =
    tone === 'primary'
      ? { backgroundColor: colors.primary, borderColor: 'transparent' }
      : tone === 'soft'
      ? { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft }
      : tone === 'tinted'
      ? { backgroundColor: colors.surfaceTinted, borderColor: colors.accent }
      : { backgroundColor: colors.surface, borderColor: colors.border };

  return (
    <View
      style={[
        styles.card,
        toneStyle,
        padded && styles.padded,
        elevated && shadow.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
  },
  padded: {
    padding: spacing.card,
  },
});
