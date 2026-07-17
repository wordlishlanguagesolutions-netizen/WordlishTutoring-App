// Wordlish design tokens — Lavender palette
export const colors = {
  // Brand
  primary: '#9B7EDE',
  primaryDark: '#7B5FBF',
  primaryLight: '#C4B0F0',
  primarySoft: '#EFE7FB',

  // Surfaces
  background: '#FAF7FF',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EDFB',
  surfaceMuted: '#EAE1F5',

  // Text
  text: '#2D2438',
  textSubtle: '#6B5F7A',
  textMuted: '#9C93A8',
  textOnPrimary: '#FFFFFF',

  // Borders
  border: '#E5DDF0',
  borderStrong: '#CFC2E4',

  // Semantic
  success: '#6FBF7B',
  successSoft: '#E4F5E6',
  warning: '#E6A85C',
  warningSoft: '#FBEFDD',
  danger: '#E67B8B',
  dangerSoft: '#FBE1E6',
  info: '#7EAFDE',
  infoSoft: '#E1EFFB',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: '400' as const, color: colors.textSubtle },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  button: { fontSize: 16, fontWeight: '600' as const },
};

export const shadow = {
  sm: {
    shadowColor: '#7B5FBF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#7B5FBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
};
