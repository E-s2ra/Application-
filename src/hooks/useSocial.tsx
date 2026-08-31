import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

type SocialContextType = {
  followingIds: string[];
  followersCount: number;
  followingCount: number;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (targetUserId: string) => Promise<boolean>;
  getFollowersCount: (targetUserId?: string) => Promise<number>;
  getFollowingCount: (targetUserId?: string) => Promise<number>;
};

const SocialContext = React.createContext<SocialContextType | undefined>(undefined);
const SOCIAL_STORAGE_KEY = 'aniflix_social_follows_v1';

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = React.useState<string[]>([]);
  const [followersCount, setFollowersCount] = React.useState(0);
  const [followingCount, setFollowingCount] = React.useState(0);

  // Load follows on startup & sync with Supabase
  React.useEffect(() => {
    async function loadFollows() {
      try {
        let raw: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          raw = localStorage.getItem(SOCIAL_STORAGE_KEY);
        } else {
          raw = await AsyncStorage.getItem(SOCIAL_STORAGE_KEY);
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          setFollowingIds(parsed);
          setFollowingCount(parsed.length);
        }

        if (user?.id && !user.id.startsWith('guest-')) {
          // 1. Fetch user's following IDs
          const { data: followings } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (followings) {
            const ids = followings.map((f: any) => f.following_id);
            setFollowingIds(ids);
            setFollowingCount(ids.length);
          }

          // 2. Fetch user's real follower count
          const { count: fCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', user.id);

          if (typeof fCount === 'number') {
            setFollowersCount(fCount);
          }
        }
      } catch (err) {
        console.warn('Social load note:', err);
      }
    }
    loadFollows();
  }, [user]);

  const saveFollows = async (ids: string[]) => {
    setFollowingIds(ids);
    setFollowingCount(ids.length);
    try {
      const json = JSON.stringify(ids);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(SOCIAL_STORAGE_KEY, json);
      } else {
        await AsyncStorage.setItem(SOCIAL_STORAGE_KEY, json);
      }
    } catch {}
  };

  const isFollowing = React.useCallback(
    (targetUserId: string) => followingIds.includes(targetUserId),
    [followingIds]
  );

  const toggleFollow = React.useCallback(
    async (targetUserId: string): Promise<boolean> => {
      const already = followingIds.includes(targetUserId);
      const updated = already
        ? followingIds.filter((id) => id !== targetUserId)
        : [...followingIds, targetUserId];

      await saveFollows(updated);

      if (user?.id && !user.id.startsWith('guest-')) {
        if (already) {
          await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId);
        } else {
          await supabase.from('follows').insert({
            follower_id: user.id,
            following_id: targetUserId,
          });
        }
      }

      return !already;
    },
    [followingIds, user]
  );

  const getFollowersCount = React.useCallback(
    async (targetUserId?: string): Promise<number> => {
      const target = targetUserId || user?.id;
      if (!target || target.startsWith('guest-')) return 0;
      try {
        const { count } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', target);
        return count ?? 0;
      } catch {
        return 0;
      }
    },
    [user]
  );

  const getFollowingCount = React.useCallback(
    async (targetUserId?: string): Promise<number> => {
      const target = targetUserId || user?.id;
      if (!target || target.startsWith('guest-')) return 0;
      try {
        const { count } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', target);
        return count ?? 0;
      } catch {
        return 0;
      }
    },
    [user]
  );

  return (
    <SocialContext.Provider
      value={{
        followingIds,
        followersCount,
        followingCount,
        isFollowing,
        toggleFollow,
        getFollowersCount,
        getFollowingCount,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const context = React.useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
