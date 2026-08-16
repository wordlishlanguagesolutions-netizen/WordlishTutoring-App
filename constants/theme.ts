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
// PALETA OFICIAL · Wordlish Education v2
// ----------------------------------------------------------------------------
// Regla de uso (Aprende. Conecta. Aplica.):
//   · #1F1A4D (indigo-900) → titulos y texto principal.
//   · #4B3DBD (violet-700) + #7B6CF6 (violet-500) → botones y elementos activos.
//   · #D8C9FF (lavender-100) + #B79CFF (lavender-300) → fondos suaves,
//     tarjetas y detalles.
//   · Degradados → reservados a logo, CTAs y elementos importantes.
//   · Predominio de blanco + espacios amplios; evitar saturar con morado.

const brand = {
  lavender100: '#D8C9FF', // fondos suaves, tarjetas, detalles
  lavender300: '#B79CFF', // acentos suaves, ilustraciones
  violet500: '#7B6CF6',   // acciones secundarias, hover del primario
  violet700: '#4B3DBD',   // acciones principales, CTAs
  indigo900: '#1F1A4D',   // titulos, texto principal, hover de CTAs
  pinkLavender: '#E7C6FF',// acento opcional
  goldSoft: '#E8C77A',    // acento opcional (metricas premium, badges)
  bgSoft: '#F7F5FB',      // fondo general y superficies tenues
};

export const colors = {
  // Marca
  primary: brand.violet700,
  primaryDark: brand.indigo900,
  primaryLight: brand.violet500,
  secondary: brand.lavender300,
  secondaryDark: brand.violet500,
  accent: brand.lavender100,

  // Alias directos a los tokens oficiales.
  lavender100: brand.lavender100,
  lavender300: brand.lavender300,
  violet500: brand.violet500,
  violet700: brand.violet700,
  indigo900: brand.indigo900,
  pinkLavender: brand.pinkLavender,
  goldSoft: brand.goldSoft,

  // Alias de compatibilidad — el resto de la app ya consume estos nombres.
  // Se mapean a los tonos oficiales para propagar la nueva identidad sin
  // requerir cambios masivos en cada consumidor.
  primarySoft: brand.lavender100,

  // Superficies · mayoritariamente claras, con bg suave lavanda-blanco.
  background: brand.bgSoft,
  surface: '#FFFFFF',
  surfaceAlt: brand.bgSoft,
  surfaceMuted: '#EDE7F6',
  surfaceTinted: brand.lavender100,
  glass: 'rgba(255, 255, 255, 0.65)',
  glassBorder: 'rgba(31, 26, 77, 0.06)',
  overlay: 'rgba(31, 26, 77, 0.45)',

  // Texto · indigo profundo + gris lavanda secundario.
  text: '#3C3652',
  textStrong: brand.indigo900,
  textSubtle: '#6E6A7A',
  textMuted: '#9A94A8',
  textOnPrimary: '#FFFFFF',

  // Bordes · muy suaves, ligeramente teñidos hacia lavanda.
  border: '#E4DEF0',
  borderStrong: '#C9BEE4',
  borderSoft: '#F1EDF9',

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
// GRADIENTES OFICIALES · uso reservado a logo, CTAs y elementos destacados.
// Se exportan como arrays (compatibles con expo-linear-gradient) y como
// string CSS (util para web o componentes con `background`).
// ----------------------------------------------------------------------------
export const gradients = {
  main: {
    colors: ['#D8C9FF', '#B79CFF', '#7B6CF6', '#4B3DBD', '#1F1A4D'] as const,
    locations: [0, 0.25, 0.5, 0.75, 1] as const,
    css: 'linear-gradient(135deg, #D8C9FF 0%, #B79CFF 25%, #7B6CF6 50%, #4B3DBD 75%, #1F1A4D 100%)',
  },
  soft: {
    colors: ['#F7F5FB', '#D8C9FF'] as const,
    locations: [0, 1] as const,
    css: 'linear-gradient(135deg, #F7F5FB 0%, #D8C9FF 100%)',
  },
  button: {
    colors: ['#7B6CF6', '#4B3DBD'] as const,
    locations: [0, 1] as const,
    css: 'linear-gradient(135deg, #7B6CF6 0%, #4B3DBD 100%)',
  },
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
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: colors.textStrong,
  },

  // Títulos · Manrope SemiBold · escala ampliada v1.1 para reducir contrastes
  // bruscos y llenar mejor las tarjetas de todos los roles.
  h1: {
    fontFamily: fonts.sansSemi,
    fontSize: 30,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.4,
    lineHeight: 38,
  },
  h2: {
    fontFamily: fonts.sansSemi,
    fontSize: 24,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  h3: {
    fontFamily: fonts.sansSemi,
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.2,
    lineHeight: 28,
  },

  // Subtítulos · Manrope Medium
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 17,
    fontWeight: '500' as const,
    color: colors.textSubtle,
    lineHeight: 26,
  },

  // Texto · Manrope Regular
  body: {
    fontFamily: fonts.sans,
    fontSize: 17,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 26,
  },
  bodyStrong: {
    fontFamily: fonts.sansSemi,
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.textStrong,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSubtle,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    fontWeight: '500' as const,
    color: colors.text,
    lineHeight: 22,
  },

  // Botones · Manrope Medium/SemiBold
  button: {
    fontFamily: fonts.sansSemi,
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },

  // Números importantes · Manrope SemiBold
  numeric: {
    fontFamily: fonts.sansSemi,
    fontSize: 36,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  numericSmall: {
    fontFamily: fonts.sansSemi,
    fontSize: 26,
    fontWeight: '600' as const,
    color: colors.textStrong,
    letterSpacing: -0.3,
    lineHeight: 32,
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
    shadowColor: '#1F1A4D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1F1A4D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#1F1A4D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1F1A4D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  // Sombra teñida para tarjetas destacadas con glassmorphism
  glass: {
    shadowColor: '#4B3DBD',
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
