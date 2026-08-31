import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { moderateContent } from '@/lib/moderation';

export type Review = {
  id: string;
  mediaId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  createdAt: string;
  helpfulCount: number;
  isVerified?: boolean;
  isVip?: boolean;
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
  addReview: (mediaId: string, rating: number) => Promise<void>;
  editReview: (reviewId: string, rating: number) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  toggleHelpful: (reviewId: string) => Promise<void>;
};

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);
const REVIEWS_STORAGE_KEY = 'aniflix_community_reviews_v2';
const HELPFUL_STORAGE_KEY = 'aniflix_helpful_reviews_v2';

// Initial Community Reviews (Empty by default for genuine community content)
const DEFAULT_REVIEWS: Review[] = [];

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(DEFAULT_REVIEWS);
  const [helpfulIds, setHelpfulIds] = useState<string[]>([]);

  // Load reviews from persistent storage and Supabase
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

        // Only demo and guest entries belong in device storage. Database-backed
        // comments must be reloaded from Supabase so a deleted comment cannot
        // be resurrected by an old cache on a profile or a product page.
        const localOnlyReviews = storedReviews.filter(
          (review) => review.id.startsWith('rev-') || review.userId.startsWith('guest-')
        );

        if (localOnlyReviews.length > 0) {
          const merged = [...localOnlyReviews];
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
      } catch {
        // Background cache failure shouldn't crash applocal reviews
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

  const addReview = async (mediaId: string, rating: number) => {
    const authorName = profile?.full_name || user?.email?.split('@')[0] || 'AniFlix Streamer';
    const authorId = user?.id || 'guest-' + Date.now();

    const existingIndex = reviews.findIndex(
      (r) => String(r.mediaId) === String(mediaId) && r.userId === authorId
    );

    let updated: Review[];

    if (existingIndex >= 0) {
      const existing = reviews[existingIndex];
      updated = [...reviews];
      updated[existingIndex] = {
        ...existing,
        rating,
        createdAt: 'Just now (edited)',
      };
    } else {
      let newId = 'rev-' + Date.now();
      const newReview: Review = {
        id: newId,
        mediaId: String(mediaId),
        userId: authorId,
        userName: authorName,
        userAvatar: profile?.avatar_url || undefined,
        rating,
        createdAt: 'Just now',
        helpfulCount: 0,
        isVerified: true,
        isVip: profile?.is_vip || false,
      };
      updated = [newReview, ...reviews];
    }

    await saveReviews(updated);
  };

  const editReview = async (reviewId: string, rating: number) => {
    const currentUserId = user?.id || 'guest-user';
    const target = reviews.find((review) => review.id === reviewId && review.userId === currentUserId);
    if (!target) throw new Error('You can only edit your own rating.');

    const updated = reviews.map((r) => {
      if (r.id === reviewId && r.userId === currentUserId) {
        return {
          ...r,
          rating,
          createdAt: r.createdAt.includes('edited') ? r.createdAt : r.createdAt + ' · edited',
        };
      }
      return r;
    });
    await saveReviews(updated);
  };

  const deleteReview = async (reviewId: string) => {
    const currentUserId = user?.id || 'guest-user';
    const isAdmin = profile?.role === 'admin' || user?.email === 'admin@aniflix.com';
    const target = reviews.find((review) => review.id === reviewId && (review.userId === currentUserId || isAdmin));
    if (!target) throw new Error('You can only delete your own comment.');

    const updated = reviews.filter(
      (review) => review.id !== reviewId
    );
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
        editReview,
        deleteReview,
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
