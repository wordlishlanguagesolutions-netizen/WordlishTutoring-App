import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { colors, radius, spacing, shadow } from '@/constants/theme';

// ============================================================================
// GlassCard · variante con glassmorphism sutil.
//
// Cuándo usarla:
//   · Tarjetas de estadísticas destacadas.
//   · Buscador o filtros persistentes.
//   · Tarjetas dentro de calendarios o timelines.
//
// Nunca abusar del efecto: máximo 1 o 2 GlassCard por pantalla.
// ============================================================================

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function GlassCard({ children, style, padded = true }: GlassCardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.glass,
    // En web podemos usar backdropFilter para un blur real.
    ...(Platform.OS === 'web'
      ? // @ts-ignore — RN Web permite propiedades CSS extras
        { backdropFilter: 'blur(20px) saturate(1.1)', WebkitBackdropFilter: 'blur(20px) saturate(1.1)' }
      : {}),
  },
  padded: {
    padding: spacing.card,
  },
});
