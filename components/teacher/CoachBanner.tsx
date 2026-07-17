import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius } from '@/constants/theme';
import {
  CoachContext,
  coachMessage,
  pickCoachMoment,
} from '@/constants/teacherCulture';

// ============================================================================
// CoachBanner · mensaje cálido de una sola línea.
// Selecciona automáticamente el momento adecuado. Si no hay mensaje, no
// renderiza nada (silencio = respeto por el tiempo del profesor).
// Nunca operativo, nunca sancionador. Máximo 8 palabras.
// ============================================================================

export function CoachBanner({ ctx }: { ctx: CoachContext }) {
  const moment = pickCoachMoment(ctx);
  if (!moment) return null;
  const msg = coachMessage(moment);
  if (!msg) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name="sparkles" size={12} color={colors.primaryDark} />
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {msg.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
});
