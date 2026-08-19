/**
 * Modern Anime Streaming Theme Palette
 */
import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  dark: {
    background: '#07070A',
    backgroundElement: '#12121A',
    backgroundCard: '#181824',
    backgroundSelected: '#242436',
    border: '#2A2A3E',
    text: '#FFFFFF',
    textSecondary: '#9A9AA8',
    textMuted: '#636375',
    primary: '#E50914', // Netflix/Crunchyroll vibrant crimson
    primaryHover: '#FF1F2E',
    primaryGlow: 'rgba(229, 9, 20, 0.4)',
    accent: '#FFB800', // Gold stars
    accentCyan: '#00D2FF',
    badgeBackground: 'rgba(0, 0, 0, 0.75)',
    cardOverlay: 'rgba(7, 7, 10, 0.85)',
    buttonBackground: '#E50914',
  },
  light: {
    background: '#07070A',
    backgroundElement: '#12121A',
    backgroundCard: '#181824',
    backgroundSelected: '#242436',
    border: '#2A2A3E',
    text: '#FFFFFF',
    textSecondary: '#9A9AA8',
    textMuted: '#636375',
    primary: '#E50914',
    primaryHover: '#FF1F2E',
    primaryGlow: 'rgba(229, 9, 20, 0.4)',
    accent: '#FFB800',
    accentCyan: '#00D2FF',
    badgeBackground: 'rgba(0, 0, 0, 0.75)',
    cardOverlay: 'rgba(7, 7, 10, 0.85)',
    buttonBackground: '#E50914',
  },
} as const;

export type ThemeColor = keyof typeof Colors.dark;

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
