/**
 * AniFlix Production Design Tokens & Theme Palette (Dark & Light Mode)
 * Human-designed, accessible, native mobile design system.
 */
import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  dark: {
    mode: 'dark' as const,
    background: '#0B0D14', // Deep midnight base
    backgroundElement: '#141724', // Surface container
    backgroundCard: '#1C2030', // Elevated card / sheet
    backgroundSelected: '#282E44', // Active selection
    border: '#262C40', // Crisp subtle border
    borderFocus: '#0356C5',
    text: '#F8FAFC', // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    textMuted: '#64748B', // Slate 500
    primary: '#0356C5', // Premium Deep Blue
    primaryHover: '#024299',
    primaryGlow: 'rgba(3, 86, 197, 0.25)',
    accent: '#F59E0B', // Amber 500
    accentCyan: '#06B6D4', // Cyan 500
    success: '#10B981', // Emerald 500
    warning: '#F59E0B',
    error: '#EF4444', // Red 500
    badgeBackground: 'rgba(15, 23, 42, 0.85)',
    cardOverlay: 'rgba(11, 13, 20, 0.90)',
    buttonBackground: '#0356C5',
    buttonText: '#FFFFFF',
    inputBackground: '#141724',
    inputBorder: '#262C40',
  },
  light: {
    mode: 'light' as const,
    background: '#F8FAFC', // Slate 50
    backgroundElement: '#F1F5F9', // Slate 100 crisp inner surface
    backgroundCard: '#FFFFFF', // Pure white elevated card
    backgroundSelected: '#E2E8F0', // Slate 200
    border: '#E2E8F0',
    borderFocus: '#0356C5',
    text: '#0F172A', // Slate 900 (High contrast black-slate)
    textSecondary: '#334155', // Slate 700 (High legibility dark slate)
    textMuted: '#64748B', // Slate 500
    primary: '#0356C5',
    primaryHover: '#024299',
    primaryGlow: 'rgba(3, 86, 197, 0.15)',
    accent: '#D97706',
    accentCyan: '#0891B2',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    badgeBackground: 'rgba(241, 245, 249, 0.95)',
    cardOverlay: 'rgba(255, 255, 255, 0.94)',
    buttonBackground: '#0356C5',
    buttonText: '#FFFFFF',
    inputBackground: '#F1F5F9',
    inputBorder: '#CBD5E1',
  },
} as const;

export type ThemePalette = {
  mode: 'dark' | 'light';
  background: string;
  backgroundElement: string;
  backgroundCard: string;
  backgroundSelected: string;
  border: string;
  borderFocus: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  primaryGlow: string;
  accent: string;
  accentCyan: string;
  success: string;
  warning: string;
  error: string;
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
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
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
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
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
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  h3: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
  },
} as const;
