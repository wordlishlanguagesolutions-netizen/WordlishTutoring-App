import React from 'react';
import { Pressable, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import {
  colors,
  spacing,
  radius,
  shadow,
  typography,
  controlHeight,
} from '@/constants/theme';

interface ZoomButtonProps {
  onPress?: () => void;
  label?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function ZoomButton({
  onPress,
  label = 'Entrar a Zoom',
  disabled,
  variant = 'primary',
}: ZoomButtonProps) {
  const handlePress =
    onPress ??
    (() =>
      Alert.alert(
        'Zoom',
        'Simulación · el enlace se abrirá cuando conectemos la integración con Zoom.'
      ));

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          secondaryStyles.btn,
          pressed && { opacity: 0.9 },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Ionicons name="videocam" size={16} color={colors.primary} />
        <Text style={secondaryStyles.text}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        primaryStyles.btn,
        pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Ionicons name="videocam" size={20} color={colors.textOnPrimary} />
      <Text style={primaryStyles.text}>{label}</Text>
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
