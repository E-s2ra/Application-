/**
 * AniFlix Production Design Tokens & Theme Palette (Dark & Light Mode)
 * Human-designed, accessible, native mobile design system.
 */
import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  dark: {
    mode: 'dark' as const,
    background: '#07090D',
    backgroundElement: '#0D1118',
    backgroundCard: '#121722',
    backgroundSelected: '#192235',
    backgroundElevated: '#161D2A',
    backgroundSunken: '#05070A',
    border: '#202735',
    borderStrong: '#303A4C',
    borderFocus: '#4D7CFE',
    text: '#F6F8FC',
    textSecondary: '#9AA5B5',
    textMuted: '#667085',
    primary: '#4D7CFE',
    primaryHover: '#6E93FF',
    primaryPressed: '#3E67DC',
    primarySoft: 'rgba(77, 124, 254, 0.12)',
    primaryGlow: 'rgba(77, 124, 254, 0.20)',
    accent: '#4D7CFE',
    accentCyan: '#4D7CFE',
    success: '#32C48D',
    successSoft: 'rgba(50, 196, 141, 0.12)',
    warning: '#F6B73C',
    warningSoft: 'rgba(246, 183, 60, 0.12)',
    error: '#F06464',
    errorSoft: 'rgba(240, 100, 100, 0.12)',
    scrim: 'rgba(2, 4, 8, 0.72)',
    badgeBackground: 'rgba(13, 17, 24, 0.92)',
    cardOverlay: 'rgba(7, 9, 13, 0.88)',
    buttonBackground: '#4D7CFE',
    buttonText: '#FFFFFF',
    inputBackground: '#0D1118',
    inputBorder: '#252D3C',
  },
  light: {
    mode: 'light' as const,
    background: '#F5F7FA',
    backgroundElement: '#FFFFFF',
    backgroundCard: '#FFFFFF',
    backgroundSelected: '#EAF0FF',
    backgroundElevated: '#FFFFFF',
    backgroundSunken: '#EEF2F7',
    border: '#DDE3EC',
    borderStrong: '#C8D0DC',
    borderFocus: '#315FEA',
    text: '#111827',
    textSecondary: '#596579',
    textMuted: '#7A8699',
    primary: '#315FEA',
    primaryHover: '#254CC4',
    primaryPressed: '#2142AB',
    primarySoft: 'rgba(49, 95, 234, 0.10)',
    primaryGlow: 'rgba(49, 95, 234, 0.14)',
    accent: '#315FEA',
    accentCyan: '#315FEA',
    success: '#168A63',
    successSoft: 'rgba(22, 138, 99, 0.10)',
    warning: '#B7791F',
    warningSoft: 'rgba(183, 121, 31, 0.10)',
    error: '#D14343',
    errorSoft: 'rgba(209, 67, 67, 0.10)',
    scrim: 'rgba(15, 23, 42, 0.48)',
    badgeBackground: 'rgba(255, 255, 255, 0.94)',
    cardOverlay: 'rgba(255, 255, 255, 0.92)',
    buttonBackground: '#315FEA',
    buttonText: '#FFFFFF',
    inputBackground: '#FFFFFF',
    inputBorder: '#D5DCE6',
  },
} as const;

export type ThemePalette = {
  mode: 'dark' | 'light';
  background: string;
  backgroundElement: string;
  backgroundCard: string;
  backgroundSelected: string;
  backgroundElevated: string;
  backgroundSunken: string;
  border: string;
  borderStrong: string;
  borderFocus: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  primarySoft: string;
  primaryGlow: string;
  accent: string;
  accentCyan: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  scrim: string;
  badgeBackground: string;
  cardOverlay: string;
  buttonBackground: string;
  buttonText: string;
  inputBackground: string;
  inputBorder: string;
};

export type ThemeColor = keyof ThemePalette;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  // Retain legacy keys for backward compatibility
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  full: 9999,
} as const;

export const ControlHeight = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

export const IconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
} as const;

export const Typography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.35,
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  button: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.05,
  },
} as const;

export const Motion = {
  press: 120,
  state: 180,
  surface: 260,
} as const;

export const Shadows = {
  card: '0 1px 2px rgba(0, 0, 0, 0.08)',
  raised: '0 10px 32px rgba(0, 0, 0, 0.14)',
  overlay: '0 20px 60px rgba(0, 0, 0, 0.24)',
} as const;

export const Interaction = {
  pressedOpacity: 0.78,
  disabledOpacity: 0.48,
  hoverOpacity: 0.92,
} as const;

export const Layout = {
  mobilePagePadding: 16,
  desktopPagePadding: 32,
  maxContentWidth: 1440,
  navbarHeight: 58,
  compactContentWidth: 720,
  readingContentWidth: 760,
  formContentWidth: 560,
} as const;
