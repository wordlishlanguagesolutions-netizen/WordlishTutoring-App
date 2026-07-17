// ============================================================================
// Breakpoints Wordlish · una sola app para iOS, Android y Web.
// Estos valores son EXCLUSIVAMENTE visuales: se usan para adaptar layouts,
// nunca para bifurcar lógica de negocio, servicios ni base de datos.
// ============================================================================

export const BREAKPOINTS = {
  phone: 600,     // < 600 px → phone
  tablet: 1024,   // 600–1023 px → tablet
  // ≥ 1024 px → desktop
} as const;

export const CONTENT_MAX_WIDTH = {
  auth: 480,      // login, selector de perfil
  home: 960,      // homes de cada rol
  form: 720,      // formularios y wizards
  reading: 720,   // documentos, políticas, standards
} as const;

export const SIDEBAR_WIDTH = 240;

export type Viewport = 'phone' | 'tablet' | 'desktop';

export function viewportFor(width: number): Viewport {
  if (width < BREAKPOINTS.phone) return 'phone';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}
