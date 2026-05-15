export const colors = {
  background: '#FFFFFF',
  surface: '#F4F6F8',
  surfaceMuted: '#E9EDF2',
  border: '#D5DBE2',
  text: '#0E1116',
  textMuted: '#4A5360',
  primary: '#1F6FEB',
  primaryDark: '#1858BD',
  success: '#2E8B57',
  warn: '#B26A00',
  danger: '#B3261E',
  done: '#2E8B57',
  doneSurface: '#E6F3EC',
} as const;

export const fontSizes = {
  xs: 16,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
  xxl: 44,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 9999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

export const minTouch = 56;
