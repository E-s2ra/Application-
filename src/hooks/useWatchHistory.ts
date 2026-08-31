import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimeItem } from './useFavorites';

const WATCH_HISTORY_STORAGE_KEY = '@aniflix_watch_history_v1';

export interface WatchHistoryItem {
  animeId: string;
  title: string;
  title_ku?: string;
  image_url: string;
  category?: string;
  genre?: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  episodeNumber?: number;
  lastWatchedAt: string;
}

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load history from AsyncStorage
  const loadHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed: WatchHistoryItem[] = JSON.parse(stored);
        // Sort by most recently watched
        parsed.sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
        setHistory(parsed);
      }
    } catch (e) {
      console.warn('[useWatchHistory] Error loading history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Save or update playback progress
  const updateProgress = useCallback(
    async (
      anime: AnimeItem,
      currentTime: number,
      duration: number,
      episodeNumber = 1
    ) => {
      if (!anime || !anime.id || duration <= 0) return;

      const progressPercent = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));

      // Don't save if progress is < 2% or video just started
      if (currentTime < 5 && progressPercent < 2) return;

      try {
        const newItem: WatchHistoryItem = {
          animeId: String(anime.id),
          title: anime.title,
          title_ku: anime.title_ku,
          image_url: anime.image_url || '',
          category: anime.category,
          genre: anime.genre,
          currentTime: Math.floor(currentTime),
          duration: Math.floor(duration),
          progressPercent,
          episodeNumber,
          lastWatchedAt: new Date().toISOString(),
        };

        setHistory((prev) => {
          // Remove existing entry for this animeId
          const filtered = prev.filter((item) => item.animeId !== String(anime.id));
          const updated = [newItem, ...filtered];
          AsyncStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
          return updated;
        });
      } catch (e) {
        console.warn('[useWatchHistory] Error updating progress:', e);
      }
    },
    []
  );

  // Remove single item from history
  const removeFromHistory = useCallback(async (animeId: string) => {
    try {
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.animeId !== String(animeId));
        AsyncStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(filtered)).catch(() => {});
        return filtered;
      });
    } catch (e) {
      console.warn('[useWatchHistory] Error removing item:', e);
    }
  }, []);

  // Clear entire watch history
  const clearHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(WATCH_HISTORY_STORAGE_KEY);
      setHistory([]);
    } catch (e) {
      console.warn('[useWatchHistory] Error clearing history:', e);
    }
  }, []);

  // Get specific progress for an animeId
  const getProgress = useCallback(
    (animeId: string): WatchHistoryItem | undefined => {
      return history.find((item) => item.animeId === String(animeId));
    },
    [history]
  );

  return {
    history,
    loading,
    updateProgress,
    removeFromHistory,
    clearHistory,
    getProgress,
    reloadHistory: loadHistory,
  };
}
