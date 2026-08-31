import { supabase } from '@/lib/supabase';
import { ReviewItem } from '@/types';

/**
 * ReviewsService — Encapsulates ratings and review comment operations against Cloud Supabase.
 */
export const ReviewsService = {
  /**
   * Fetches reviews for a given anime ID sorted by date descending.
   */
  async getReviewsForAnime(animeId: string): Promise<ReviewItem[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('anime_id', animeId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        animeId: row.anime_id,
        userId: row.user_id,
        userName: row.user_name || 'Anonymous Fan',
        userAvatar: row.user_avatar,
        rating: row.rating || 5,
        comment: row.comment || '',
        createdAt: row.created_at,
        isVip: row.is_vip || false,
        isVerified: row.is_verified || false,
      }));
    } catch (err) {
      console.warn('[ReviewsService] Error fetching reviews:', err);
      return [];
    }
  },

  /**
   * Submits or updates a review.
   */
  async submitReview(review: Omit<ReviewItem, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('reviews').insert({
        anime_id: review.animeId,
        user_id: review.userId,
        user_name: review.userName,
        user_avatar: review.userAvatar,
        rating: review.rating,
        comment: review.comment,
        is_vip: review.isVip,
        is_verified: review.isVerified,
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit review.' };
    }
  },

  /**
   * Deletes a review by ID.
   */
  async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },
};
