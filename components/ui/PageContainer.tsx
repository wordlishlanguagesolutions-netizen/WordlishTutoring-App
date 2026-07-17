import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { CONTENT_MAX_WIDTH } from '@/constants/breakpoints';
import { spacing } from '@/constants/theme';

// ============================================================================
// PageContainer · centra y limita el ancho del contenido en tablet y desktop.
// En móvil es totalmente transparente (no cambia el layout actual).
// En tablet/desktop aplica maxWidth y padding lateral generoso.
// Uso EXCLUSIVAMENTE visual: no toca lógica, rutas ni datos.
// ============================================================================

export type PageWidth = 'auth' | 'home' | 'form' | 'reading' | number;

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: PageWidth;
  center?: boolean;         // centrar verticalmente (login en desktop)
  style?: StyleProp<ViewStyle>;
}

function resolveMax(w: PageWidth | undefined): number {
  if (typeof w === 'number') return w;
  if (w === 'auth') return CONTENT_MAX_WIDTH.auth;
  if (w === 'form') return CONTENT_MAX_WIDTH.form;
  if (w === 'reading') return CONTENT_MAX_WIDTH.reading;
  return CONTENT_MAX_WIDTH.home;
}

export function PageContainer({
  children,
  maxWidth = 'home',
  center = false,
  style,
}: PageContainerProps) {
  const { isPhone, isDesktop, isTablet } = useResponsive();

  // En móvil: totalmente transparente. Mantiene el diseño aprobado.
  if (isPhone) {
    return <View style={[styles.phone, style]}>{children}</View>;
  }

  const max = resolveMax(maxWidth);
  const horizontalPadding = isDesktop ? spacing.xxl : spacing.xl;

  return (
    <View
      style={[
        styles.outer,
        center && styles.outerCenter,
        { paddingHorizontal: horizontalPadding },
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          { maxWidth: max, width: '100%' },
          isTablet && { maxWidth: Math.min(max, 720) },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: { flex: 1, width: '100%' },
  outer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  outerCenter: {
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
});
