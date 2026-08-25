import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Language, translations, TranslationKey } from '@/lib/i18n/translations';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = 'aniflix_language_preference_v2';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    async function loadSavedLanguage() {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        } else {
          saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        }
        if (saved === 'en' || saved === 'ku') {
          setLanguageState(saved);
        }
      } catch (_e) {
        // Fallback to default en
      }
    }
    void loadSavedLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang: Language) => {
    setLanguageState(newLang);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
        // Set document dir for accessibility
        document.documentElement.dir = newLang === 'ku' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
      } else {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      }
    } catch (_e) {
      // Ignore storage errors
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const next: Language = language === 'en' ? 'ku' : 'en';
    void setLanguage(next);
  }, [language, setLanguage]);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const dict = translations[language] || translations.en;
      return (dict as any)[key] || (translations.en as any)[key] || fallback || key;
    },
    [language]
  );

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      isRTL: language === 'ku',
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context) {
    return context;
  }
  return {
    language: 'en',
    isRTL: false,
    setLanguage: () => {},
    toggleLanguage: () => {},
    t: (key: TranslationKey, fallback?: string) => (translations.en as any)[key] || fallback || key,
  };
}

export function useTranslation() {
  const { t, language, isRTL } = useLanguage();
  return { t, language, isRTL };
}
