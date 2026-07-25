import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import {
  colors,
  spacing,
  radius,
  shadow,
  typography,
  controlHeight,
} from '@/constants/theme';
import { openZoom, getZoomLabel, isZoomEnabled } from '@/services/zoomService';

// ============================================================================
// Botón único para abrir Zoom. Todas las pantallas lo usan.
// URL: viene de `services/zoomService` (única fuente de verdad, leída
// desde `public.app_settings.zoom.official_link`). Cuando se pase la
// prop `url` (p.ej. reserva OAuth en el futuro), se prioriza.
// ============================================================================

interface ZoomButtonProps {
  url?: string | null;
  onPress?: () => void;
  label?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function ZoomButton({
  url,
  onPress,
  label,
  disabled,
  variant = 'primary',
}: ZoomButtonProps) {
  const finalLabel = label ?? getZoomLabel();
  const enabled = isZoomEnabled();

  const handlePress =
    onPress ?? (() => openZoom(url ?? undefined));

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || !enabled}
        style={({ pressed }) => [
          secondaryStyles.btn,
          pressed && { opacity: 0.9 },
          (disabled || !enabled) && { opacity: 0.5 },
        ]}
      >
        <Ionicons name="videocam" size={16} color={colors.primary} />
        <Text style={secondaryStyles.text}>{finalLabel}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || !enabled}
      style={({ pressed }) => [
        primaryStyles.btn,
        pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
        (disabled || !enabled) && { opacity: 0.5 },
      ]}
    >
      <Ionicons name="videocam" size={20} color={colors.textOnPrimary} />
      <Text style={primaryStyles.text}>{finalLabel}</Text>
    </Pressable>
  );
}

const primaryStyles = StyleSheet.create({
  btn: {
    height: controlHeight.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.iconText,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.button,
    ...shadow.sm,
  },
  text: {
    ...typography.button,
    color: colors.textOnPrimary,
    fontSize: 15,
  },
});

const secondaryStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceTinted,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  text: {
    ...typography.button,
    color: colors.primary,
    fontSize: 13,
  },
});
