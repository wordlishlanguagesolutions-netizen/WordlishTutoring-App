// ============================================================================
// Wordlish Design System · v1.0
// ----------------------------------------------------------------------------
// Fuente ÚNICA de verdad de la identidad visual. Todo componente debe leer sus
// colores, radios, sombras, tipografías y espacios desde aquí. No se permite
// hard-coding de hex o pixel values fuera de este archivo.
//
// Personalidad: Premium · Moderna · Tecnológica · Elegante · Minimalista.
// Referencias: Notion, Stripe, Linear, Calm — adaptado al sector educativo.
// ============================================================================

// ----------------------------------------------------------------------------
// PALETA OFICIAL
// ----------------------------------------------------------------------------
// El morado se reserva para acciones principales y elementos destacados.
// El grueso de la interfaz debe ser claro, con mucho blanco y espacio.

const brand = {
  primary: '#5B2C83',       // acciones principales, CTAs, elementos destacados
  primaryDark: '#3F1D5C',   // hover / pressed del primario
  primaryLight: '#7C4EAF',  // acentos del primario
  secondary: '#A78BFA',     // acciones secundarias, ilustraciones, gradientes
  secondaryDark: '#8B6EF0', // hover del secundario
  accent: '#E9D5FF',        // pills, tags, hovers muy suaves
  accentSoft: '#F5EBFF',    // superficies teñidas mínimas
};

export const colors = {
  // Marca
  primary: brand.primary,
  primaryDark: brand.primaryDark,
  primaryLight: brand.primaryLight,
  secondary: brand.secondary,
  secondaryDark: brand.secondaryDark,
  accent: brand.accent,

  // Alias de compatibilidad — el resto de la app ya consume estos nombres.
  // Se mapean a los tonos oficiales para propagar la nueva identidad sin
  // requerir cambios masivos en cada consumidor.
  primarySoft: brand.accent,

  // Superficies · mayoritariamente claras
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceMuted: '#E2E8F0',
  surfaceTinted: brand.accentSoft,
  glass: 'rgba(255, 255, 255, 0.65)',
  glassBorder: 'rgba(15, 23, 42, 0.06)',
  overlay: 'rgba(15, 23, 42, 0.45)',

  // Texto · slate (cálido, moderno, alta legibilidad)
  text: '#334155',
  textStrong: '#0F172A',
  textSubtle: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  // Bordes · muy suaves
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  borderSoft: '#F1F5F9',

  // Semánticos · matices claros, no saturados
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',
};

// ----------------------------------------------------------------------------
// ESPACIADO · escala 4pt con alias semánticos
// ----------------------------------------------------------------------------
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  // Alias semánticos del Design System
  card: 20,          // padding interno de tarjetas
  betweenCards: 24,  // gap entre tarjetas
  iconText: 12,      // gap entre icono y texto
  block: 32,         // separación entre bloques grandes
};

// ----------------------------------------------------------------------------
// RADIOS · consistencia obligatoria
// ----------------------------------------------------------------------------
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,

  // Alias semánticos del Design System
  button: 16,
  input: 16,
  card: 20,
  modal: 24,
};

// ----------------------------------------------------------------------------
// TIPOGRAFÍA
// ----------------------------------------------------------------------------
// Logo:   Poppins SemiBold
// Todo lo demás: Manrope (Regular, Medium, SemiBold).
// Si las familias no están cargadas en runtime, React Native cae al system UI
// font (SF Pro en iOS, Roboto en Android, system-ui en Web) — igualmente
// premium y legible. Los `fontWeight` garantizan la jerarquía visual.
export const fonts = {
  display: 'Poppins_600SemiBold',
  sans: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansSemi: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
};

export const typography = {
  // Logotipo · Poppins SemiBold
  logo: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: colors.textStrong,
  },

  // Títulos · Manrope SemiBold
  h1: {
    fontFamily: fonts.sansSemi,
    fontSize: 28,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  h2: {
    fontFamily: fonts.sansSemi,
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  h3: {
    fontFamily: fonts.sansSemi,
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.2,
    lineHeight: 24,
  },

  // Subtítulos · Manrope Medium
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.textSubtle,
    lineHeight: 22,
  },

  // Texto · Manrope Regular
  body: {
    fontFamily: fonts.sans,
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textStrong,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textSubtle,
    lineHeight: 18,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 20,
  },

  // Botones · Manrope Medium/SemiBold
  button: {
    fontFamily: fonts.sansSemi,
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },

  // Números importantes · Manrope SemiBold
  numeric: {
    fontFamily: fonts.sansSemi,
    fontSize: 32,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  numericSmall: {
    fontFamily: fonts.sansSemi,
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
};

// ----------------------------------------------------------------------------
// SOMBRAS · muy suaves, inspiradas en Apple
// ----------------------------------------------------------------------------
// Regla: nunca sombras negras fuertes. La profundidad debe sentirse elegante,
// no llamativa. En Android se usa `elevation` bajo para no saturar.
export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  // Sombra teñida para tarjetas destacadas con glassmorphism
  glass: {
    shadowColor: '#5B2C83',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
};

// ----------------------------------------------------------------------------
// MOTION · duraciones canon para todas las animaciones
// ----------------------------------------------------------------------------
export const motion = {
  fast: 150,
  base: 220,
  slow: 300,
  easing: 'ease-out' as const,
};

// ----------------------------------------------------------------------------
// LAYOUT · alturas canónicas de controles interactivos
// ----------------------------------------------------------------------------
export const controlHeight = {
  button: 52,       // spec oficial del design system
  buttonSmall: 40,
  input: 52,
  chip: 36,
};
