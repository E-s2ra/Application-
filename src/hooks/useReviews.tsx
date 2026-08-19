import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuth } from './useAuth';

export type Review = {
  id: string;
  mediaId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  helpfulCount: number;
  isVerified?: boolean;
};

type RatingStats = {
  average: number;
  count: number;
  breakdown: { [stars: number]: number };
};

type ReviewsContextType = {
  reviews: Review[];
  getReviewsForMedia: (mediaId: string) => Review[];
  getStatsForMedia: (mediaId: string) => RatingStats;
  getUserReview: (mediaId: string) => Review | undefined;
  addReview: (mediaId: string, rating: number, comment: string) => Promise<void>;
  toggleHelpful: (reviewId: string) => Promise<void>;
};

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);
const REVIEWS_STORAGE_KEY = 'aniflix_community_reviews_v1';
const HELPFUL_STORAGE_KEY = 'aniflix_helpful_reviews_v1';

// Seed Initial Reviews for Top Titles
const DEFAULT_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    mediaId: 'movie-1', // Inception
    userId: 'user-101',
    userName: 'CinemaGeek99',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&q=80',
    rating: 5,
    comment: 'An absolute masterpiece of sci-fi cinema! The dream within a dream concept and Hans Zimmer soundtrack give me goosebumps every single watch.',
    createdAt: '2 hours ago',
    helpfulCount: 42,
    isVerified: true,
  },
  {
    id: 'rev-2',
    mediaId: 'movie-1',
    userId: 'user-102',
    userName: 'Sarah Miller',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
    rating: 5,
    comment: 'The visual effects and mind-bending story are unmatched. 10/10 streaming experience on AniFlix!',
    createdAt: '1 day ago',
    helpfulCount: 19,
    isVerified: true,
  },
  {
    id: 'rev-3',
    mediaId: 'anime-1', // Attack on Titan
    userId: 'user-103',
    userName: 'LeviAckermanFan',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&q=80',
    rating: 5,
    comment: 'Greatest plot twists in anime history. The animation quality and character development are on another level!',
    createdAt: '3 hours ago',
    helpfulCount: 56,
    isVerified: true,
  },
  {
    id: 'rev-4',
    mediaId: 'amovie-1', // Your Name
    userId: 'user-104',
    userName: 'AnimeAesthetic',
    userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&q=80',
    rating: 5,
    comment: 'Makoto Shinkai does not miss. The art, the music by RADWIMPS, the emotions... brought tears to my eyes.',
    createdAt: '5 hours ago',
    helpfulCount: 31,
    isVerified: true,
  },
  {
    id: 'rev-5',
    mediaId: 'anime-2', // Demon Slayer
    userId: 'user-105',
    userName: 'Tanjiro_Official',
    userAvatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=120&q=80',
    rating: 5,
    comment: 'Ufotable animation is peak cinema. Episode 19 is unforgettable!',
    createdAt: '1 day ago',
    helpfulCount: 48,
    isVerified: true,
  },
  {
    id: 'rev-6',
    mediaId: 'drama-1', // Breaking Bad
    userId: 'user-106',
    userName: 'WalterWhite99',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
    rating: 5,
    comment: 'The pinnacle of modern television drama. Incredible writing from pilot to finale.',
    createdAt: '2 days ago',
    helpfulCount: 65,
    isVerified: true,
  },
  {
    id: 'rev-7',
    mediaId: 'anime-4', // Solo Leveling
    userId: 'user-107',
    userName: 'ShadowMonarch',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80',
    rating: 5,
    comment: 'ARRISE! The hype around Sung Jinwoo is completely justified. Outstanding pacing and fight choreography.',
    createdAt: '4 hours ago',
    helpfulCount: 29,
    isVerified: true,
  },
];

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(DEFAULT_REVIEWS);
  const [helpfulIds, setHelpfulIds] = useState<string[]>([]);

  // Load reviews from persistent storage
  useEffect(() => {
    async function load() {
      try {
        let storedReviews: Review[] = [];
        let storedHelpful: string[] = [];

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
          if (raw) storedReviews = JSON.parse(raw);
          const rawH = localStorage.getItem(HELPFUL_STORAGE_KEY);
          if (rawH) storedHelpful = JSON.parse(rawH);
        } else {
          const raw = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY);
          if (raw) storedReviews = JSON.parse(raw);
          const rawH = await AsyncStorage.getItem(HELPFUL_STORAGE_KEY);
          if (rawH) storedHelpful = JSON.parse(rawH);
        }

        if (storedReviews && storedReviews.length > 0) {
          // Merge unique reviews
          const merged = [...storedReviews];
          DEFAULT_REVIEWS.forEach((def) => {
            if (!merged.some((r) => r.id === def.id)) {
              merged.push(def);
            }
          });
          setReviews(merged);
        } else {
          setReviews(DEFAULT_REVIEWS);
        }

        if (storedHelpful) setHelpfulIds(storedHelpful);
      } catch (err) {
        console.warn('Error loading reviews:', err);
      }
    }
    load();
  }, []);

  const saveReviews = async (newReviews: Review[]) => {
    setReviews(newReviews);
    try {
      const json = JSON.stringify(newReviews);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(REVIEWS_STORAGE_KEY, json);
      } else {
        await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, json);
      }
    } catch (e) {
      console.warn('Error saving reviews:', e);
    }
  };

  const getReviewsForMedia = (mediaId: string): Review[] => {
    return reviews.filter((r) => String(r.mediaId) === String(mediaId));
  };

  const getStatsForMedia = (mediaId: string): RatingStats => {
    const list = getReviewsForMedia(mediaId);
    const breakdown: { [stars: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (list.length === 0) {
      // Default baseline rating 4.8 for pristine catalog display
      return {
        average: 4.8,
        count: 14,
        breakdown: { 5: 11, 4: 2, 3: 1, 2: 0, 1: 0 },
      };
    }

    let sum = 0;
    list.forEach((r) => {
      sum += r.rating;
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      breakdown[star] = (breakdown[star] || 0) + 1;
    });

    const average = Math.round((sum / list.length) * 10) / 10;
    return { average, count: list.length, breakdown };
  };

  const getUserReview = (mediaId: string): Review | undefined => {
    const currentUserId = user?.id || 'guest-user';
    return reviews.find(
      (r) => String(r.mediaId) === String(mediaId) && r.userId === currentUserId
    );
  };

  const addReview = async (mediaId: string, rating: number, comment: string) => {
    const authorName = profile?.full_name || user?.email?.split('@')[0] || 'AniFlix Streamer';
    const authorId = user?.id || 'guest-' + Date.now();

    const existingIndex = reviews.findIndex(
      (r) => String(r.mediaId) === String(mediaId) && r.userId === authorId
    );

    let updated: Review[];

    if (existingIndex >= 0) {
      // Update existing review
      updated = [...reviews];
      updated[existingIndex] = {
        ...updated[existingIndex],
        rating,
        comment,
        createdAt: 'Just now',
      };
    } else {
      const newReview: Review = {
        id: 'rev-' + Date.now(),
        mediaId: String(mediaId),
        userId: authorId,
        userName: authorName,
        rating,
        comment,
        createdAt: 'Just now',
        helpfulCount: 0,
        isVerified: true,
      };
      updated = [newReview, ...reviews];
    }

    await saveReviews(updated);
  };

  const toggleHelpful = async (reviewId: string) => {
    const isAlreadyHelpful = helpfulIds.includes(reviewId);
    const updatedHelpful = isAlreadyHelpful
      ? helpfulIds.filter((id) => id !== reviewId)
      : [...helpfulIds, reviewId];

    setHelpfulIds(updatedHelpful);

    const updatedReviews = reviews.map((r) => {
      if (r.id === reviewId) {
        return {
          ...r,
          helpfulCount: isAlreadyHelpful ? Math.max(0, r.helpfulCount - 1) : r.helpfulCount + 1,
        };
      }
      return r;
    });

    await saveReviews(updatedReviews);

    try {
      const json = JSON.stringify(updatedHelpful);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(HELPFUL_STORAGE_KEY, json);
      } else {
        await AsyncStorage.setItem(HELPFUL_STORAGE_KEY, json);
      }
    } catch {}
  };

  return (
    <ReviewsContext.Provider
      value={{
        reviews,
        getReviewsForMedia,
        getStatsForMedia,
        getUserReview,
        addReview,
        toggleHelpful,
      }}
    >
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews() {
  const context = useContext(ReviewsContext);
  if (!context) {
    throw new Error('useReviews must be used within a ReviewsProvider');
  }
  return context;
}
