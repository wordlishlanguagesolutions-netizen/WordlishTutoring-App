import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { BREAKPOINTS, viewportFor, type Viewport } from '@/constants/breakpoints';

// ============================================================================
// useResponsive · hook seguro para Web SSR e iOS/Android.
// Usa Dimensions.get + useState + useEffect en lugar de useWindowDimensions
// para evitar valores inválidos durante el SSR estático de Expo Web.
// SIEMPRE devuelve dimensiones válidas (mínimo 320x568 como fallback).
// No altera lógica de negocio: solo describe el viewport actual.
// ============================================================================

export interface Responsive {
  width: number;
  height: number;
  viewport: Viewport;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

function readDimensions(): { width: number; height: number } {
  try {
    const d = Dimensions.get('window');
    const w = Math.max(320, d.width || 375);
    const h = Math.max(568, d.height || 667);
    return { width: w, height: h };
  } catch {
    return { width: 375, height: 667 };
  }
}

export function useResponsive(): Responsive {
  const [dims, setDims] = useState<{ width: number; height: number }>(() =>
    readDimensions(),
  );

  useEffect(() => {
    const update = () => setDims(readDimensions());
    update();
    const sub = Dimensions.addEventListener('change', update);
    return () => {
      try {
        sub?.remove();
      } catch {
        // no-op
      }
    };
  }, []);

  const viewport = viewportFor(dims.width);

  return {
    width: dims.width,
    height: dims.height,
    viewport,
    isPhone: viewport === 'phone',
    isTablet: viewport === 'tablet',
    isDesktop: viewport === 'desktop',
  };
}

export { BREAKPOINTS };
