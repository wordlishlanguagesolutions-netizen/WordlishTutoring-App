import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing } from '@/constants/theme';

// ============================================================================
// WebTwoColumn · helper visual para distribuir contenido en dos columnas
// exclusivamente en desktop (≥ 1024 px). En móvil y tablet apila las
// secciones en el orden original (left → right) sin cambios.
//
// USO EXCLUSIVAMENTE VISUAL:
//   · No modifica lógica, contextos, servicios ni rutas.
//   · Sólo redistribuye la posición de los bloques.
//   · Preserva estados internos porque no desmonta/remonta subárboles.
// ============================================================================

interface WebTwoColumnProps {
  left: ReactNode;
  right: ReactNode;
  leftFlex?: number;
  rightFlex?: number;
  gap?: number;
  align?: 'flex-start' | 'stretch';
}

export function WebTwoColumn({
  left,
  right,
  leftFlex = 1,
  rightFlex = 1,
  gap = spacing.xl,
  align = 'flex-start',
}: WebTwoColumnProps) {
  const { isDesktop } = useResponsive();

  if (!isDesktop) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }

  return (
    <View style={[styles.row, { gap, alignItems: align }]}>
      <View style={[styles.col, { flex: leftFlex }]}>{left}</View>
      <View style={[styles.col, { flex: rightFlex }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  col: {
    minWidth: 0,
  },
});
