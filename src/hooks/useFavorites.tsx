import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { MediaCategory, AnimeItem } from '@/types';
export { MediaCategory, AnimeItem };

import { useToast } from '@/hooks/useToast';

type FavoritesContextType = {
  favorites: AnimeItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (anime: AnimeItem) => Promise<void>;
  isLoading: boolean;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const LEGACY_STORAGE_KEY = 'user_anime_favorites_v1';
const STORAGE_KEY_PREFIX = 'user_anime_favorites_v2';

const favoritesStorageKey = (userId?: string) =>
  `${STORAGE_KEY_PREFIX}:${userId || 'guest'}`;

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showSuccess, showInfo } = useToast();
  const [favorites, setFavorites] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const saveLocal = async (items: AnimeItem[], storageKey = favoritesStorageKey(user?.id)) => {
    try {
      const json = JSON.stringify(items);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.setItem(storageKey, json);
      } else {
        await AsyncStorage.setItem(storageKey, json);
      }
    } catch (err: any) {
      throw new Error(`Failed to save local favorites: ${err.message || err}`);
    }
  };

  // Load favorites from local storage & Supabase
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const storageKey = favoritesStorageKey(user?.id);
      setIsLoading(true);
      setFavorites([]);

      try {
        const [deletedIds, overrides] = await Promise.all([
          getDeletedMediaIds(),
          getEditedMediaOverrides(),
        ]);

        let storedItems: AnimeItem[] = [];
        if (Platform.OS === 'web') {
          const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
          if (raw) storedItems = JSON.parse(raw);
          if (typeof window !== 'undefined') localStorage.removeItem(LEGACY_STORAGE_KEY);
        } else {
          const raw = await AsyncStorage.getItem(storageKey);
          if (raw) storedItems = JSON.parse(raw);
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
        }

        const validStored = storedItems
          .filter((item) => !deletedIds.includes(item.id))
          .map((item) => ({ ...item, ...(overrides[item.id] || {}) }));
        if (!cancelled) setFavorites(validStored);

        // If user is logged in, try fetching from Supabase favorites table
        if (user) {
          const { data, error } = await supabase
            .from('favorites')
            .select('anime_id, anime(id, title, image_url, episodes, genre, is_featured, description)')
            .eq('user_id', user.id);

          if (!error && data) {
            const remoteAnime = data
              .map((row: any) => row.anime)
              .filter(Boolean)
              .filter((item: any) => !deletedIds.includes(item.id))
              .map((item: any) => ({ ...item, ...(overrides[item.id] || {}) })) as AnimeItem[];
            if (!cancelled) setFavorites(remoteAnime);
            await saveLocal(remoteAnime, storageKey);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load favorites:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isFavorite = (id: string) => {
    return favorites.some((fav) => String(fav.id) === String(id));
  };

  const toggleFavorite = async (anime: AnimeItem) => {
    const exists = isFavorite(anime.id);
    let updated: AnimeItem[];

    if (exists) {
      updated = favorites.filter((fav) => String(fav.id) !== String(anime.id));
      showInfo('Removed from My List');
    } else {
      updated = [anime, ...favorites];
      showSuccess(`Added "${anime.title}" to My List`);
    }

    setFavorites(updated);
    await saveLocal(updated);

    // Sync to Supabase in the background if user is authenticated
    if (user) {
      try {
        if (exists) {
          await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('anime_id', anime.id);
        } else {
          await supabase
            .from('favorites')
            .insert({ user_id: user.id, anime_id: anime.id });
        }
      } catch (err: any) {
        console.warn('Favorite sync error:', err);
      }
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, isLoading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
