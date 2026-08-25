/**
 * Modern Anime Streaming Theme Palette (Dark & Light Mode)
 */
import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  dark: {
    mode: 'dark' as const,
    background: '#09090E', // Deeper black background
    backgroundElement: '#161622', // Elements and navigation
    backgroundCard: '#1C1C26', // Cards and modals
    backgroundSelected: '#242436',
    border: '#222232', // Ultra subtle border
    text: '#FFFFFF',
    textSecondary: '#8A8A9D', // Cool grey
    textMuted: '#636375',
    primary: '#0356C5', // Deep blue
    primaryHover: '#0D47A1',
    primaryGlow: 'rgba(3, 86, 197, 0.4)',
    accent: '#FFB800',
    accentCyan: '#00D2FF',
    badgeBackground: 'rgba(0, 0, 0, 0.75)',
    cardOverlay: 'rgba(9, 9, 14, 0.85)',
    buttonBackground: '#0356C5',
    buttonText: '#FFFFFF',
    inputBackground: '#1C1C26',
    inputBorder: '#222232',
  },
  light: {
    mode: 'light' as const,
    background: '#F3F4F6',
    backgroundElement: '#FFFFFF',
    backgroundCard: '#FFFFFF',
    backgroundSelected: '#E5E7EB',
    border: '#E5E7EB',
    text: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',
    primary: '#0356C5', // Deep blue
    primaryHover: '#0D47A1',
    primaryGlow: 'rgba(3, 86, 197, 0.18)',
    accent: '#D97706',
    accentCyan: '#0284C7',
    badgeBackground: 'rgba(0, 0, 0, 0.06)',
    cardOverlay: 'rgba(255, 255, 255, 0.92)',
    buttonBackground: '#0356C5',
    buttonText: '#FFFFFF',
    inputBackground: '#F9FAFB',
    inputBorder: '#D1D5DB',
  },
} as const;

export type ThemePalette = {
  mode: 'dark' | 'light';
  background: string;
  backgroundElement: string;
  backgroundCard: string;
  backgroundSelected: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  primaryGlow: string;
  accent: string;
  accentCyan: string;
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
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
