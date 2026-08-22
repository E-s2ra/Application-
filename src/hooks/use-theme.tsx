/**
 * Unified Theme Provider & Hook with Dark/Light Mode & Gamification SIM Integration
 */
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Colors, ThemePalette } from '@/constants/theme';
import { useGamification } from '@/hooks/useGamification';

export type ColorMode = 'dark' | 'light';

type ThemeContextType = {
  theme: ThemePalette;
  mode: ColorMode;
  isDark: boolean;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const COLOR_MODE_STORAGE_KEY = 'aniflix_color_mode_preference_v2';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>('dark');
  const gamification = useGamification();

  // Load saved dark/light mode preference
  useEffect(() => {
    async function loadMode() {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          saved = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
        } else {
          saved = await AsyncStorage.getItem(COLOR_MODE_STORAGE_KEY);
        }
        if (saved === 'dark' || saved === 'light') {
          setModeState(saved);
        }
      } catch (_e) {
        // Fallback to default dark
      }
    }
    void loadMode();
  }, []);

  const setColorMode = useCallback(async (newMode: ColorMode) => {
    setModeState(newMode);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, newMode);
      } else {
        await AsyncStorage.setItem(COLOR_MODE_STORAGE_KEY, newMode);
      }
    } catch (_e) {
      // Ignore storage errors
    }
  }, []);

  const toggleColorMode = useCallback(() => {
    const next = mode === 'dark' ? 'light' : 'dark';
    void setColorMode(next);
  }, [mode, setColorMode]);

  // Compute merged theme palette with gamification / SIM colors
  const theme = useMemo<ThemePalette>(() => {
    const base = Colors[mode] || Colors.dark;
    const activeGamificationTheme = gamification?.activeTheme;

    if (activeGamificationTheme) {
      return {
        ...base,
        primary: activeGamificationTheme.primary || base.primary,
        primaryHover: activeGamificationTheme.primary || base.primaryHover,
        primaryGlow: activeGamificationTheme.glow || base.primaryGlow,
        accent: activeGamificationTheme.accent || base.accent,
        badgeBackground: activeGamificationTheme.badgeBg || base.badgeBackground,
        buttonBackground: activeGamificationTheme.primary || base.buttonBackground,
      };
    }

    return base;
  }, [mode, gamification?.activeTheme]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      mode,
      isDark: mode === 'dark',
      toggleColorMode,
      setColorMode,
    }),
    [theme, mode, toggleColorMode, setColorMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemePalette {
  const context = useContext(ThemeContext);
  if (context) {
    return context.theme;
  }
  return Colors.dark;
}

export function useColorMode() {
  const context = useContext(ThemeContext);
  if (context) {
    return {
      mode: context.mode,
      isDark: context.isDark,
      toggleColorMode: context.toggleColorMode,
      setColorMode: context.setColorMode,
    };
  }
  return {
    mode: 'dark' as ColorMode,
    isDark: true,
    toggleColorMode: () => {},
    setColorMode: () => {},
  };
}
