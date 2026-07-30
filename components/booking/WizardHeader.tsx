import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing } from '@/constants/theme';

// ============================================================================
// WizardHeader · Header unificado para los 3 pasos del wizard de reserva.
// Contiene boton back (opcional), etiqueta "Paso X de N", titulo y dots.
// Reutilizado por app/booking/new.tsx, schedule.tsx y summary.tsx.
// success.tsx ya NO forma parte del wizard: el pago vive dentro del Paso 3.
// ============================================================================

interface Props {
  step: number; // 0..(totalSteps-1)
  title: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  totalSteps?: number;
}

export function WizardHeader({
  step,
  title,
  onBack,
  rightSlot,
  totalSteps = 3,
}: Props) {
  return (
    <>
      <View style={s.header}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={s.stepLabel}>
            Paso {step + 1} de {totalSteps}
          </Text>
          <Text style={s.stepTitle}>{title}</Text>
        </View>
        {rightSlot ?? null}
      </View>
      <View style={s.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[s.dot, i === step && s.dotActive, i < step && s.dotDone]}
          />
        ))}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.primaryDark },
});
