/**
 * Domain Models & Shared Application Types for AniFlix
 */

export type MediaCategory =
  | 'Movies'
  | 'Anime Movies'
  | 'K-Drama'
  | 'Drama'
  | 'Anime Series';

export interface EpisodeLink {
  episode: number;
  url: string;
}

export interface AnimeItem {
  id: string;
  title: string;
  image_url: string | null;
  video_url?: string | null;
  video_asset_key?: string | null;
  episodes: number;
  genre: string | null;
  category?: MediaCategory | string;
  is_featured: boolean;
  description?: string | null;
  description_ku?: string | null;
  title_ku?: string | null;
  published_at?: string | null;
  episode_links?: EpisodeLink[];
}

export interface ReviewItem {
  id: string;
  animeId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  isVip?: boolean;
  isVerified?: boolean;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_vip: boolean;
  role: 'user' | 'admin';
  vip_until?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VipPlan {
  id: string;
  durationDays: number;
  priceIQD: number;
  popular?: boolean;
  badge?: string;
}

export interface PendingPayment {
  id: string;
  user_id: string;
  plan_id: string;
  amount_iqd: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  metadata?: {
    user_email?: string;
    plan_title?: string;
    method?: string;
    transaction_ref?: string;
    voucher_pin?: string;
    sender_phone?: string;
  };
}
