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

const ASPECT = 3 / 2; // width / height del asset oficial.

export function WordlishLogo({
  width = 240,
  style,
  accessibilityLabel = 'Wordlish Education. Aprende. Conecta. Aplica.',
}: WordlishLogoProps) {
  const height = Math.round(width / ASPECT);
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={require('@/assets/brand/wordlish-logo.png')}
        style={{ width, height }}
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
