import React, { ReactNode, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import {
  colors,
  radius,
  spacing,
  typography,
  shadow,
  controlHeight,
  motion,
} from '@/constants/theme';

// ============================================================================
// Button · componente único del Design System.
//
// Reglas:
//   · Altura por defecto: 52 px (spec oficial).
//   · Border radius: 16 px.
//   · Iconografía minimalista, alineada por Icon component.
//   · Microanimación de scale y opacity al presionar (200 ms).
//   · Estados: default, pressed, disabled, loading.
//   · Variantes: primary | secondary | ghost | danger.
//
// Uso:
//   <Button label="Guardar" onPress={...} />
//   <Button label="Cancelar" variant="ghost" onPress={...} />
//   <Button label="Eliminar" variant="danger" leftIcon="trash-outline" />
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: string;
  rightIcon?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children?: ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  disabled,
  loading,
  fullWidth = true,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration: motion.fast,
      useNativeDriver: true,
    }).start();
  };

  const palette = getPalette(variant);
  const height = size === 'sm' ? controlHeight.buttonSmall : controlHeight.button;
  const paddingH = size === 'sm' ? spacing.lg : spacing.xl;
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={() => animateTo(0.98)}
        onPressOut={() => animateTo(1)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        style={({ pressed }) => [
          styles.base,
          {
            height,
            paddingHorizontal: paddingH,
            backgroundColor: palette.bg,
            borderColor: palette.border,
            borderWidth: palette.borderWidth,
          },
          variant === 'primary' && shadow.sm,
          pressed && { opacity: 0.94 },
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.fg} />
        ) : (
          <View style={styles.inner}>
            {leftIcon ? (
              <Ionicons name={leftIcon as any} size={iconSize} color={palette.fg} />
            ) : null}
            <Text style={[styles.label, { color: palette.fg }, typography.button]}>
              {label}
            </Text>
            {rightIcon ? (
              <Ionicons name={rightIcon as any} size={iconSize} color={palette.fg} />
            ) : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function getPalette(variant: ButtonVariant) {
  switch (variant) {
    case 'secondary':
      return {
        bg: colors.surfaceTinted,
        fg: colors.primary,
        border: 'transparent',
        borderWidth: 0,
      };
    case 'ghost':
      return {
        bg: 'transparent',
        fg: colors.primary,
        border: colors.border,
        borderWidth: 1,
      };
    case 'danger':
      return {
        bg: colors.danger,
        fg: colors.textOnPrimary,
        border: 'transparent',
        borderWidth: 0,
      };
    case 'primary':
    default:
      return {
        bg: colors.primary,
        fg: colors.textOnPrimary,
        border: 'transparent',
        borderWidth: 0,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconText,
  },
  label: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
