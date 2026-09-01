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
// CoachBanner · mensaje cálido, no un aviso operativo.
// Selecciona automáticamente el momento adecuado. Si no hay mensaje, no
// renderiza nada (silencio = respeto por el tiempo del profesor).
// ============================================================================

export function CoachBanner({ ctx }: { ctx: CoachContext }) {
  const moment = pickCoachMoment(ctx);
  if (!moment) return null;
  const msg = coachMessage(moment);
  if (!msg) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name="sparkles" size={14} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{msg.title}</Text>
        {msg.subtitle ? (
          <Text style={styles.subtitle}>{msg.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 1,
    fontWeight: '500',
  },
});
