import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

// ============================================================================
// WordlishLogo · marca institucional de Wordlish Education.
// "Aprende. Conecta. Aplica."
//
// Renderiza la version oficial del logotipo (laptop + W ascendente + target,
// wordmark WORDLISH EDUCATION y tagline). Reemplaza los placeholders
// anteriores del login y del sidebar web. Cualquier variante futura
// (icono suelto, monocromo, animado) debe agregarse aqui, no duplicarse
// en pantallas.
//
// USO EXCLUSIVAMENTE VISUAL:
//   · No modifica rutas, contextos, servicios ni logica.
//   · Preserva aspect ratio original (~3:2) via expo-image + contentFit.
//   · Ancho controlable por prop `width`; alto se calcula automaticamente.
// ============================================================================

interface WordlishLogoProps {
  width?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

// Aspect ratio original del asset (~3:2). Recortamos verticalmente para
// mostrar solo hasta "WORDLISH EDUCATION" y ocultar la fila de iconos y
// tagline inferior (esa info ya se comunica en el footer/tagline propios).
const FULL_ASPECT = 3 / 2;
const CROP_RATIO = 0.72; // porcion visible desde el borde superior.

export function WordlishLogo({
  width = 240,
  style,
  accessibilityLabel = 'Wordlish Education',
}: WordlishLogoProps) {
  const fullHeight = Math.round(width / FULL_ASPECT);
  const visibleHeight = Math.round(fullHeight * CROP_RATIO);
  return (
    <View
      style={[
        styles.wrap,
        { width, height: visibleHeight, overflow: 'hidden' },
        style,
      ]}
    >
      <Image
        source={require('@/assets/brand/wordlish-logo.png')}
        style={{ width, height: fullHeight }}
        contentFit="contain"
        transition={150}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
