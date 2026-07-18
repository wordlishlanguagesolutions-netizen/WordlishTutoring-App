import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

// ============================================================================
// Skeleton · placeholder animado para estados de carga.
//
// Regla del design system: nunca dejar la pantalla en blanco durante una
// carga. Usar Skeleton para preservar el layout y transmitir progreso.
// Animación: pulse muy sutil (opacity 0.5 → 1) en 900 ms.
// ============================================================================

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radiusToken?: 'sm' | 'md' | 'lg' | 'xl' | 'pill' | 'card' | 'button';
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radiusToken = 'md',
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width: width as any,
          height,
          borderRadius: radius[radiusToken as keyof typeof radius] ?? radius.md,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Compone un bloque tipo tarjeta con líneas y avatar simulados.
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={44} height={44} radiusToken="pill" />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={12} />
      <Skeleton width="80%" height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceAlt,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.card,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconText,
  },
});
