/**
 * Unified Theme Hook with Gamification & SIM Theme Integration
 */
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGamification } from '@/hooks/useGamification';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;
  const baseColors = Colors[theme] || Colors.dark;

  try {
    const gamification = useGamification();
    if (gamification?.activeTheme) {
      return {
        ...baseColors,
        primary: gamification.activeTheme.primary || baseColors.primary,
        primaryHover: gamification.activeTheme.primary || baseColors.primaryHover,
        primaryGlow: gamification.activeTheme.glow || baseColors.primaryGlow,
        accent: gamification.activeTheme.accent || baseColors.accent,
        badgeBackground: gamification.activeTheme.badgeBg || baseColors.badgeBackground,
        buttonBackground: gamification.activeTheme.primary || baseColors.buttonBackground,
      };
    }
  } catch (_err) {
    // Outside GamificationProvider fallback
  }

  return baseColors;
}
