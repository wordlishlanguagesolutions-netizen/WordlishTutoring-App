import React from 'react';
import { Pressable, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius, shadow } from '@/constants/theme';

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
        <Ionicons name="videocam" size={16} color={colors.primaryDark} />
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
        pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Ionicons name="videocam" size={22} color={colors.textOnPrimary} />
      <Text style={primaryStyles.text}>{label}</Text>
    </Pressable>
  );
}

const primaryStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: radius.lg,
    ...shadow.md,
  },
  text: { color: colors.primaryDark, fontWeight: '700', fontSize: 16 },
});

const secondaryStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  text: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
