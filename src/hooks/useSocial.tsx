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
};

const SocialContext = React.createContext<SocialContextType | undefined>(undefined);
const SOCIAL_STORAGE_KEY = 'aniflix_social_follows_v1';

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = React.useState<string[]>([]);
  const [followersCount] = React.useState(128);
  const [followingCount, setFollowingCount] = React.useState(42);

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
          setFollowingIds(JSON.parse(raw));
        }

        if (user?.id && !user.id.startsWith('guest-')) {
          const timeout = new Promise((resolve) => setTimeout(resolve, 2000));
          const fetchPromise = supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          const res = (await Promise.race([fetchPromise, timeout])) as any;
          if (res && res.data) {
            const ids = res.data.map((f: any) => f.following_id);
            setFollowingIds(ids);
            setFollowingCount(ids.length);
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

  return (
    <SocialContext.Provider
      value={{
        followingIds,
        followersCount,
        followingCount,
        isFollowing,
        toggleFollow,
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
