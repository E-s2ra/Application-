export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: 'user' | 'admin';
          coins: number;
          xp: number;
          level: number;
          streak_days: number;
          is_vip: boolean;
          vip_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'admin';
          coins?: number;
          xp?: number;
          level?: number;
          streak_days?: number;
          is_vip?: boolean;
          vip_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'user' | 'admin';
          coins?: number;
          xp?: number;
          level?: number;
          streak_days?: number;
          is_vip?: boolean;
          vip_expires_at?: string | null;
          updated_at?: string;
        };
      };
      daily_logins: {
        Row: {
          id: string;
          user_id: string;
          login_date: string;
          reward_claimed: boolean;
          coins_awarded: number;
          xp_awarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          login_date?: string;
          reward_claimed?: boolean;
          coins_awarded?: number;
          xp_awarded?: number;
          created_at?: string;
        };
        Update: {
          reward_claimed?: boolean;
        };
      };
      missions: {
        Row: {
          id: string;
          code: string;
          title: string;
          description: string;
          reward_coins: number;
          reward_xp: number;
          target: number;
          mission_type: 'daily' | 'weekly' | 'event';
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          description: string;
          reward_coins?: number;
          reward_xp?: number;
          target?: number;
          mission_type: 'daily' | 'weekly' | 'event';
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          reward_coins?: number;
          reward_xp?: number;
          target?: number;
        };
      };
      user_missions: {
        Row: {
          id: string;
          user_id: string;
          mission_id: string;
          progress: number;
          completed: boolean;
          claimed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_id: string;
          progress?: number;
          completed?: boolean;
          claimed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          progress?: number;
          completed?: boolean;
          claimed?: boolean;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      spins: {
        Row: {
          id: string;
          user_id: string;
          reward_type: 'coins' | 'xp' | 'vip' | 'badge';
          reward_value: number;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_type: 'coins' | 'xp' | 'vip' | 'badge';
          reward_value: number;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          reward_type?: 'coins' | 'xp' | 'vip' | 'badge';
          reward_value?: number;
          label?: string | null;
        };
      };
      rewarded_ads: {
        Row: {
          id: string;
          user_id: string;
          ad_unit_id: string | null;
          reward_type: string;
          reward_coins: number;
          watched_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ad_unit_id?: string | null;
          reward_type?: string;
          reward_coins?: number;
          watched_at?: string;
        };
        Update: {
          reward_coins?: number;
        };
      };
      comments: {
        Row: {
          id: string;
          movie_id: string;
          user_id: string;
          content: string;
          parent_id: string | null;
          rating: number;
          likes_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          movie_id: string;
          user_id: string;
          content: string;
          parent_id?: string | null;
          rating?: number;
          likes_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          parent_id?: string | null;
          rating?: number;
          likes_count?: number;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: 'product_published' | 'user_mention' | 'comment_reply';
          title: string;
          body: string;
          resource_type: 'anime' | 'comment';
          resource_id: string;
          metadata: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: 'product_published' | 'user_mention' | 'comment_reply';
          title: string;
          body: string;
          resource_type: 'anime' | 'comment';
          resource_id: string;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
      };
      comment_likes: {
        Row: {
          id: string;
          comment_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          comment_id?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
        };
      };
      themes: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          coin_cost: number;
          preview_image: string | null;
          primary_color: string;
          accent_color: string;
          glow_color: string | null;
          badge_bg: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          coin_cost?: number;
          preview_image?: string | null;
          primary_color: string;
          accent_color: string;
          glow_color?: string | null;
          badge_bg?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          coin_cost?: number;
        };
      };
      user_themes: {
        Row: {
          id: string;
          user_id: string;
          theme_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme_id: string;
          unlocked_at?: string;
        };
        Update: {
          theme_id?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          icon: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description: string;
          icon: string;
          color: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
        };
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          unlocked_at?: string;
        };
        Update: {
          badge_id?: string;
        };
      };
      vip_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'ad_reward' | 'coins_purchase' | 'spin_reward' | 'event_bonus' | 'subscription';
          duration: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'ad_reward' | 'coins_purchase' | 'spin_reward' | 'event_bonus' | 'subscription';
          duration: number;
          created_at?: string;
        };
        Update: {
          type?: 'ad_reward' | 'coins_purchase' | 'spin_reward' | 'event_bonus' | 'subscription';
        };
      };
    };
    Functions: {
      claim_daily_login_reward: {
        Args: Record<PropertyKey, never>;
        Returns: {
          success: boolean;
          coins_awarded: number;
          xp_awarded: number;
          streak_days: number;
          new_coins: number;
          new_xp: number;
          new_level: number;
        };
      };
      claim_rewarded_ad: {
        Args: {
          p_ad_unit_id?: string;
          p_reward_type?: string;
          p_verification_token?: string;
        };
        Returns: {
          success: boolean;
          reward_coins: number;
          reward_xp: number;
          new_coins: number;
          new_xp: number;
        };
      };
      spin_lucky_wheel: {
        Args: Record<PropertyKey, never>;
        Returns: {
          success: boolean;
          reward_id: string;
          reward_type: string;
          reward_value: number;
          label: string;
          new_coins: number;
          new_xp: number;
          vip_days_remaining: number;
        };
      };
      unlock_theme_with_coins: {
        Args: {
          p_theme_code: string;
        };
        Returns: {
          success: boolean;
          theme_id: string;
          remaining_coins: number;
        };
      };
      claim_mission_reward: {
        Args: {
          p_mission_code: string;
        };
        Returns: {
          success: boolean;
          reward_coins: number;
          reward_xp: number;
          new_coins: number;
          new_xp: number;
        };
      };
      toggle_comment_like: {
        Args: {
          p_comment_id: string;
        };
        Returns: {
          liked: boolean;
          likes_count: number;
        };
      };
    };
  };
}
