import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type Mission = {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXP: number;
  target: number;
  current: number;
  completed: boolean;
  claimed: boolean;
  category: 'daily' | 'weekly' | 'event';
};

export type SeasonalEvent = {
  id: string;
  title: string;
  subtitle: string;
  badgeName: string;
  badgeIcon: string;
  bannerImage: string;
  themeColor: string;
  endDate: string;
  bonusMultiplier: number;
  eventMissions: Mission[];
};

export type SpinReward = {
  id: string;
  label: string;
  icon: string;
  type: 'coins' | 'xp' | 'vip' | 'badge';
  amount: number;
  color: string;
};

export type AppTheme = {
  id: string;
  name: string;
  description: string;
  primary: string;
  glow: string;
  accent: string;
  badgeBg: string;
  costCoins: number;
  isUnlocked: boolean;
};

export type UserBadge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt?: string;
  isUnlocked: boolean;
};

export const SPIN_REWARDS: SpinReward[] = [
  { id: '1', label: '10 Coins', icon: '💰', type: 'coins', amount: 10, color: '#FFB800' },
  { id: '2', label: '50 XP', icon: '⚡', type: 'xp', amount: 50, color: '#00D2FF' },
  { id: '3', label: '1-Day VIP Pass', icon: '👑', type: 'vip', amount: 1, color: '#9C27B0' },
  { id: '4', label: '20 Coins', icon: '💰', type: 'coins', amount: 20, color: '#FF9800' },
  { id: '5', label: '100 XP', icon: '⚡', type: 'xp', amount: 100, color: '#00E676' },
  { id: '6', label: '50 Coins (Jackpot!)', icon: '💎', type: 'coins', amount: 50, color: '#0356C5' },
];

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'weekend-ad-frenzy',
    title: '🔥 Weekend Ad Frenzy',
    subtitle: 'Watch 50 Ads this weekend to unlock the exclusive Inferno Theme!',
    badgeName: 'Ad Master',
    badgeIcon: '🔥',
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
    themeColor: '#FF3D00',
    endDate: 'Oct 31, 2026',
    bonusMultiplier: 1, // No free coin multiplier, protecting the economy
    eventMissions: [
      {
        id: 'event-ad-1',
        title: 'Ad Grinder',
        description: 'Watch 50 Sponsored Ads',
        rewardCoins: 0, // No free coins given
        rewardXP: 500,  // Only XP to level up
        target: 50,
        current: 12,
        completed: false,
        claimed: false,
        category: 'event',
      },
      {
        id: 'event-ad-2',
        title: 'Daily Ad Streak',
        description: 'Watch at least 5 ads today',
        rewardCoins: 0, // No free coins given
        rewardXP: 100,
        target: 5,
        current: 5,
        completed: true,
        claimed: false,
        category: 'event',
      },
    ],
  },
  {
    id: 'golden-ad-hour',
    title: '⏳ Golden Ad Rush',
    subtitle: 'For the next 48 hours, watching ads gives double XP!',
    badgeName: 'Golden Watcher',
    badgeIcon: '⏳',
    bannerImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80',
    themeColor: '#FFB800',
    endDate: 'Nov 15, 2026',
    bonusMultiplier: 1, // Again, no free coin multiplier
    eventMissions: [
      {
        id: 'event-gold-1',
        title: 'Gold Rush',
        description: 'Watch 20 Ads before the timer runs out',
        rewardCoins: 0, 
        rewardXP: 300,
        target: 20,
        current: 5,
        completed: false,
        claimed: false,
        category: 'event',
      },
    ],
  },
];

export const THEMES_LIST: AppTheme[] = [
  {
    id: 'theme-deep-blue',
    name: 'AniFlix Deep Blue (Default)',
    description: 'Glossy deep blue gradient with dark base and light reflections.',
    primary: '#0356C5',
    glow: 'rgba(3, 86, 197, 0.4)',
    accent: '#0D47A1',
    badgeBg: '#02060E',
    costCoins: 0,
    isUnlocked: true,
  },
  {
    id: 'theme-gold-sun',
    name: 'Kurdish Sun Golden',
    description: 'Vibrant solar gold celebrating Kurdish cinema culture.',
    primary: '#FFB800',
    glow: 'rgba(255, 184, 0, 0.45)',
    accent: '#00D2FF',
    badgeBg: '#262010',
    costCoins: 200,
    isUnlocked: false,
  },
  {
    id: 'theme-emerald-night',
    name: 'Ramadan Midnight Emerald',
    description: 'Lush glowing emerald with gold crescent accents.',
    primary: '#00E676',
    glow: 'rgba(0, 230, 118, 0.45)',
    accent: '#FFD700',
    badgeBg: '#0F2618',
    costCoins: 250,
    isUnlocked: false,
  },
  {
    id: 'theme-cyberpunk-violet',
    name: 'New Year Neon Cyberpunk',
    description: 'Electric neon violet with hyper-modern anime styling.',
    primary: '#9D4EDD',
    glow: 'rgba(157, 78, 221, 0.5)',
    accent: '#FF007F',
    badgeBg: '#221133',
    costCoins: 300,
    isUnlocked: false,
  },
  {
    id: 'theme-sunset-coral',
    name: 'Summer Sunset Coral',
    description: 'Warm tropical orange with crystal cyan highlights.',
    primary: '#FF6D00',
    glow: 'rgba(255, 109, 0, 0.45)',
    accent: '#00E5FF',
    badgeBg: '#2A1608',
    costCoins: 200,
    isUnlocked: false,
  },
];

export const DEFAULT_BADGES: UserBadge[] = [
  {
    id: 'b-novice',
    title: 'First Stream',
    description: 'Streamed your first title on AniFlix',
    icon: '🎬',
    color: '#0356C5',
    isUnlocked: true,
    unlockedAt: 'Aug 19, 2026',
  },
  {
    id: 'b-streak-3',
    title: '3-Day Fire Streak',
    description: 'Logged in for 3 consecutive days',
    icon: '🔥',
    color: '#FF5722',
    isUnlocked: true,
    unlockedAt: 'Aug 18, 2026',
  },
  {
    id: 'b-critic',
    title: '5-Star Critic',
    description: 'Published a helpful community review',
    icon: '⭐',
    color: '#FFB800',
    isUnlocked: true,
    unlockedAt: 'Aug 19, 2026',
  },
  {
    id: 'b-kurdish-sun',
    title: 'Kurdish Sun Legend',
    description: 'Participated in the Kurdish Cinema Gala',
    icon: '☀️',
    color: '#FFD700',
    isUnlocked: false,
  },
  {
    id: 'b-vip',
    title: 'AniFlix VIP Sovereign',
    description: 'Unlocked active VIP Ultra HD status',
    icon: '👑',
    color: '#9C27B0',
    isUnlocked: false,
  },
];

const DEFAULT_MISSIONS: Mission[] = [
  {
    id: 'm-daily-1',
    title: 'Daily Cinema Explorer',
    description: 'Stream any movie or anime for 10+ minutes',
    rewardCoins: 20,
    rewardXP: 50,
    target: 1,
    current: 1,
    completed: true,
    claimed: false,
    category: 'daily',
  },
  {
    id: 'm-daily-2',
    title: 'Critique & Rate',
    description: 'Rate any movie or write a community review',
    rewardCoins: 25,
    rewardXP: 60,
    target: 1,
    current: 1,
    completed: true,
    claimed: false,
    category: 'daily',
  },
  {
    id: 'm-daily-3',
    title: 'Curator',
    description: 'Add 2 new titles to your watchlist',
    rewardCoins: 15,
    rewardXP: 40,
    target: 2,
    current: 1,
    completed: false,
    claimed: false,
    category: 'daily',
  },
  {
    id: 'm-weekly-1',
    title: 'Weekend Binge Master',
    description: 'Watch 5 full episodes across any series',
    rewardCoins: 120,
    rewardXP: 250,
    target: 5,
    current: 3,
    completed: false,
    claimed: false,
    category: 'weekly',
  },
  {
    id: 'm-weekly-2',
    title: 'Genre Explorer',
    description: 'Explore at least 3 different categories (K-Drama, Anime, Movies)',
    rewardCoins: 100,
    rewardXP: 200,
    target: 3,
    current: 2,
    completed: false,
    claimed: false,
    category: 'weekly',
  },
];

type GamificationContextType = {
  coins: number;
  xp: number;
  level: number;
  levelTitle: string;
  nextLevelXP: number;
  currentLevelBaseXP: number;
  streakDays: number;
  hasClaimedDailyStreak: boolean;
  canSpinWheel: boolean;
  vipDaysRemaining: number;
  isVIP: boolean;
  activeEvent: SeasonalEvent;
  allEvents: SeasonalEvent[];
  missions: Mission[];
  themes: AppTheme[];
  activeTheme: AppTheme;
  badges: UserBadge[];
  selectSeasonalEvent: (eventId: string) => void;
  claimDailyStreak: () => Promise<{ coins: number; xp: number }>;
  spinWheel: () => Promise<SpinReward>;
  claimMission: (missionId: string) => Promise<void>;
  unlockTheme: (themeId: string) => Promise<boolean>;
  equipTheme: (themeId: string) => void;
  activateVIP: (days: number) => void;
  awardWatchTimeReward: (minutes: number) => Promise<{ coins: number; xp: number }>;
  addXPAndCoins: (xpGain: number, coinsGain: number, skipDbSync?: boolean) => void;
  unlockedMediaIds: string[];
  unlockMedia: (mediaId: string, episodeNum: number | undefined, cost: number) => Promise<boolean>;
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);
const GAMIFICATION_STORAGE_KEY_PREFIX = 'aniflix_gamification_v3';

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [coins, setCoins] = useState(0);
  const [xp, setXp] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [hasClaimedDailyStreak, setHasClaimedDailyStreak] = useState(false);
  const [canSpinWheel, setCanSpinWheel] = useState(true);
  const [vipDaysRemaining, setVipDaysRemaining] = useState(0);
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [activeThemeId, setActiveThemeId] = useState('theme-deep-blue');
  const [unlockedThemeIds, setUnlockedThemeIds] = useState<string[]>(['theme-deep-blue']);
  const [unlockedMediaIds, setUnlockedMediaIds] = useState<string[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>(DEFAULT_BADGES);
  const [missions, setMissions] = useState<Mission[]>([
    ...DEFAULT_MISSIONS,
    ...SEASONAL_EVENTS[0].eventMissions,
  ]);

  const activeEvent = SEASONAL_EVENTS[activeEventIndex] || SEASONAL_EVENTS[0];
  const isVIP = vipDaysRemaining > 0;

  // Level Computation: Every 300 XP = 1 Level
  const level = Math.floor(xp / 300) + 1;
  const currentLevelBaseXP = (level - 1) * 300;
  const nextLevelXP = level * 300;

  const getLevelTitle = (lvl: number) => {
    if (lvl >= 20) return 'Legendary Cinephile';
    if (lvl >= 10) return 'Master Streamer';
    if (lvl >= 5) return 'Anime VIP';
    if (lvl >= 3) return 'Cinema Enthusiast';
    return 'Novice Watcher';
  };

  const themes: AppTheme[] = THEMES_LIST.map((t) => ({
    ...t,
    isUnlocked: unlockedThemeIds.includes(t.id),
  }));

  const activeTheme = themes.find((t) => t.id === activeThemeId) || themes[0];

  // Sync with Supabase on user sign-in & load cached state
  useEffect(() => {
    // Reset all state when user changes (prevents old session leaking into new account)
    setCoins(0);
    setXp(0);
    setStreakDays(0);
    setVipDaysRemaining(0);
    setVipExpiresAt(null);
    setHasClaimedDailyStreak(false);
    setCanSpinWheel(true);

    async function loadData() {
      try {
        // Use a per-user storage key so accounts never share cached VIP state
        const storageKey = user?.id
          ? `${GAMIFICATION_STORAGE_KEY_PREFIX}_${user.id}`
          : GAMIFICATION_STORAGE_KEY_PREFIX;

        let raw: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          raw = localStorage.getItem(storageKey);
        } else {
          raw = await AsyncStorage.getItem(storageKey);
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.coins !== undefined) setCoins(parsed.coins);
          if (parsed.xp !== undefined) setXp(parsed.xp);
          if (parsed.streakDays !== undefined) setStreakDays(parsed.streakDays);
          if (parsed.hasClaimedDailyStreak !== undefined)
            setHasClaimedDailyStreak(parsed.hasClaimedDailyStreak);
          if (parsed.canSpinWheel !== undefined) setCanSpinWheel(parsed.canSpinWheel);

          // Only restore VIP from cache if the expiry is in the future
          const loadedExpiresAt = parsed.vipExpiresAt;
          if (loadedExpiresAt) {
            const diffMs = new Date(loadedExpiresAt).getTime() - Date.now();
            const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            // Treat as VIP only if still valid
            if (days > 0) {
              setVipDaysRemaining(days);
              setVipExpiresAt(loadedExpiresAt);
            } else {
              // Expired — clear it
              setVipDaysRemaining(0);
              setVipExpiresAt(null);
            }
          }
          // Note: legacy vipDaysRemaining without expiry is intentionally ignored
          // to avoid permanently granting VIP with no expiration date.

          if (parsed.activeThemeId) setActiveThemeId(parsed.activeThemeId);
          if (parsed.unlockedThemeIds) setUnlockedThemeIds(parsed.unlockedThemeIds);
          if (parsed.unlockedMediaIds) setUnlockedMediaIds(parsed.unlockedMediaIds);
          if (parsed.missions) setMissions(parsed.missions);
          if (parsed.badges) setBadges(parsed.badges);
        }

        // Live Supabase Sync — always authoritative over local cache
        if (user?.id && !user.id.startsWith('guest-')) {
          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2500));
          const syncPromise = (async () => {
            // Fetch Profile from Supabase
            const { data: profile } = await supabase
              .from('profiles')
              .select('coins, xp, level, streak_days, is_vip, vip_expires_at')
              .eq('id', user.id)
              .maybeSingle();

            if (profile) {
              if (profile.coins !== undefined && profile.coins !== null) setCoins(profile.coins);
              if (profile.xp !== undefined && profile.xp !== null) setXp(profile.xp);
              if (profile.streak_days !== undefined && profile.streak_days !== null)
                setStreakDays(profile.streak_days);

              // Always authoritatively set VIP based on DB — even if is_vip=false
              if (profile.is_vip === true && profile.vip_expires_at) {
                const diffMs = new Date(profile.vip_expires_at).getTime() - Date.now();
                const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                setVipDaysRemaining(days);
                setVipExpiresAt(days > 0 ? profile.vip_expires_at : null);
              } else {
                // Not VIP or no expiry — clear any stale local state
                setVipDaysRemaining(0);
                setVipExpiresAt(null);
              }
            }

            // Check Daily Logins for today
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: loginData } = await supabase
              .from('daily_logins')
              .select('id, reward_claimed')
              .eq('user_id', user.id)
              .eq('login_date', todayStr)
              .maybeSingle();

            if (loginData) {
              setHasClaimedDailyStreak(loginData.reward_claimed);
            }
          })();

          await Promise.race([syncPromise, timeoutPromise]);
        }
      } catch (e) {
        console.warn('Gamification init note:', e);
      }
    }
    loadData();
  }, [user]);

  const persist = async (updates: any, skipDbSync = false) => {
    try {
      // Always store under the per-user key so accounts don't share state
      const storageKey = user?.id
        ? `${GAMIFICATION_STORAGE_KEY_PREFIX}_${user.id}`
        : GAMIFICATION_STORAGE_KEY_PREFIX;

      const stateToSave = {
        coins,
        xp,
        streakDays,
        hasClaimedDailyStreak,
        canSpinWheel,
        vipDaysRemaining,
        vipExpiresAt,
        activeThemeId,
        unlockedThemeIds,
        unlockedMediaIds,
        missions,
        badges,
        ...updates,
      };
      const json = JSON.stringify(stateToSave);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, json);
      } else {
        await AsyncStorage.setItem(storageKey, json);
      }

      // Sync to Supabase profiles in background
      if (!skipDbSync && user?.id && !user.id.startsWith('guest-')) {
        const payload: any = { updated_at: new Date().toISOString() };
        if (updates.coins !== undefined) payload.coins = updates.coins;
        if (updates.xp !== undefined) {
          payload.xp = updates.xp;
          payload.level = Math.floor(updates.xp / 300) + 1;
        }
        if (updates.streakDays !== undefined) payload.streak_days = updates.streakDays;
        if (updates.vipDaysRemaining !== undefined) {
          payload.is_vip = updates.vipDaysRemaining > 0;
          if (updates.vipDaysRemaining > 0) {
            const exp = new Date();
            exp.setDate(exp.getDate() + updates.vipDaysRemaining);
            payload.vip_expires_at = exp.toISOString();
          }
        }
        await supabase.from('profiles').update(payload).eq('id', user.id);
      }
    } catch {}
  };

  const addXPAndCoins = (xpGain: number, coinsGain: number, skipDbSync = false) => {
    const multiplier = activeEvent.bonusMultiplier || 1;
    const finalCoins = Math.round(coinsGain * multiplier);
    const finalXP = Math.round(xpGain * multiplier);
    const newCoins = coins + finalCoins;
    const newXp = xp + finalXP;
    setCoins(newCoins);
    setXp(newXp);
    persist({ coins: newCoins, xp: newXp }, skipDbSync);
  };

  // Server-Authoritative Daily Streak Claim
  const claimDailyStreak = async (): Promise<{ coins: number; xp: number }> => {
    if (hasClaimedDailyStreak) return { coins: 0, xp: 0 };

    if (user?.id && !user.id.startsWith('guest-')) {
      try {
        const { data, error } = await supabase.rpc('claim_daily_login_reward');
        if (!error && data && (data as any).success) {
          const res = data as any;
          const awardedCoins = res.coins_awarded || 0;
          const awardedXp = res.xp_awarded || 0;
          const newStreak = res.streak_days || streakDays + 1;

          setCoins(res.new_coins);
          setXp(res.new_xp);
          setStreakDays(newStreak);
          setHasClaimedDailyStreak(true);

          persist({
            coins: res.new_coins,
            xp: res.new_xp,
            streakDays: newStreak,
            hasClaimedDailyStreak: true,
          }, true);

          return { coins: awardedCoins, xp: awardedXp };
        }
      } catch (err) {
        console.warn('claim_daily_login_reward RPC error:', err);
      }
    }

    // Guest fallback
    const rewardCoins = Math.min(30, 10 + streakDays * 10);
    const rewardXP = Math.min(100, 50 + streakDays * 10);
    const newStreak = streakDays + 1;
    const newCoins = coins + rewardCoins;
    const newXp = xp + rewardXP;

    setStreakDays(newStreak);
    setCoins(newCoins);
    setXp(newXp);
    setHasClaimedDailyStreak(true);

    persist({
      coins: newCoins,
      xp: newXp,
      streakDays: newStreak,
      hasClaimedDailyStreak: true,
    }, true);

    return { coins: rewardCoins, xp: rewardXP };
  };

  // Server-Authoritative Spin Wheel
  const spinWheel = async (): Promise<SpinReward> => {
    if (!canSpinWheel) return SPIN_REWARDS[0];

    if (user?.id && !user.id.startsWith('guest-')) {
      try {
        const { data, error } = await supabase.rpc('spin_lucky_wheel');
        if (!error && data && (data as any).success) {
          const res = data as any;
          const rewardId = String(res.reward_id || '1');
          const serverReward = SPIN_REWARDS.find((r) => r.id === rewardId) || SPIN_REWARDS[0];

          setCoins(res.new_coins ?? coins);
          setXp(res.new_xp ?? xp);
          setCanSpinWheel(false);

          persist({
            coins: res.new_coins ?? coins,
            xp: res.new_xp ?? xp,
            canSpinWheel: false,
          }, true);

          return serverReward;
        }
      } catch (err) {
        console.warn('spin_lucky_wheel RPC error:', err);
      }
    }

    // Guest fallback
    const randomIndex = Math.floor(Math.random() * SPIN_REWARDS.length);
    const reward = SPIN_REWARDS[randomIndex];

    let newCoins = coins;
    let newXp = xp;
    if (reward.type === 'coins') newCoins += reward.amount;
    if (reward.type === 'xp') newXp += reward.amount;

    setCoins(newCoins);
    setXp(newXp);
    setCanSpinWheel(false);

    persist({
      coins: newCoins,
      xp: newXp,
      canSpinWheel: false,
    }, true);

    return reward;
  };

  // Server-Authoritative Mission Claim
  const claimMission = async (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    if (!mission || !mission.completed || mission.claimed) return;

    const newCoins = coins + mission.rewardCoins;
    const newXp = xp + mission.rewardXP;
    const updatedMissions = missions.map((m) =>
      m.id === missionId ? { ...m, claimed: true } : m
    );

    setCoins(newCoins);
    setXp(newXp);
    setMissions(updatedMissions);

    persist({
      coins: newCoins,
      xp: newXp,
      missions: updatedMissions,
    });

    if (user?.id && !user.id.startsWith('guest-')) {
      try {
        const { data: mData } = await supabase
          .from('missions')
          .select('id')
          .eq('code', missionId)
          .maybeSingle();

        if (mData?.id) {
          await supabase.from('user_missions').upsert({
            user_id: user.id,
            mission_id: mData.id,
            progress: mission.target,
            completed: true,
            claimed: true,
            claimed_at: new Date().toISOString(),
          });
        }
      } catch {}
    }
  };

  // Server-Authoritative Theme Unlock
  const unlockTheme = async (themeId: string): Promise<boolean> => {
    const targetTheme = THEMES_LIST.find((t) => t.id === themeId);
    if (!targetTheme || unlockedThemeIds.includes(themeId)) return false;
    if (coins < targetTheme.costCoins) return false;

    if (user?.id && !user.id.startsWith('guest-')) {
      try {
        const { data, error } = await supabase.rpc('unlock_theme_with_coins', { p_theme_code: themeId });
        if (!error && data && (data as any).success) {
          const res = data as any;
          const remaining = res.remaining_coins ?? (coins - targetTheme.costCoins);
          const newUnlocked = [...unlockedThemeIds, themeId];

          setCoins(remaining);
          setUnlockedThemeIds(newUnlocked);
          setActiveThemeId(themeId);
          persist({ coins: remaining, unlockedThemeIds: newUnlocked, activeThemeId: themeId }, true);
          return true;
        }
      } catch (err) {
        console.warn('unlock_theme_with_coins error:', err);
      }
    }

    // Guest fallback
    const newCoins = coins - targetTheme.costCoins;
    const newUnlocked = [...unlockedThemeIds, themeId];

    setCoins(newCoins);
    setUnlockedThemeIds(newUnlocked);
    setActiveThemeId(themeId);

    persist({
      coins: newCoins,
      unlockedThemeIds: newUnlocked,
      activeThemeId: themeId,
    }, true);

    return true;
  };

  // Server-Authoritative Media Unlock
  const unlockMedia = async (mediaId: string, episodeNum: number | undefined, cost: number): Promise<boolean> => {
    if (coins < cost) return false;
    const unlockKey = episodeNum !== undefined ? `${mediaId}_ep_${episodeNum}` : mediaId;
    if (unlockedMediaIds.includes(unlockKey)) return true;

    if (user?.id && !user.id.startsWith('guest-')) {
      // In a full production setup, this would be an RPC call like `unlock_theme_with_coins`
      // For now, we update coins in profiles and sync local cache.
      try {
        const { data, error } = await supabase.rpc('deduct_coins', { p_amount: cost });
        if (!error && data && (data as any).success) {
          const res = data as any;
          const remaining = res.remaining_coins ?? (coins - cost);
          const newUnlocked = [...unlockedMediaIds, unlockKey];
          
          setCoins(remaining);
          setUnlockedMediaIds(newUnlocked);
          persist({ coins: remaining, unlockedMediaIds: newUnlocked }, true);
          return true;
        }
      } catch (err) {
        console.warn('deduct_coins error (falling back to local):', err);
      }
    }

    // Guest fallback / Offline fallback
    const newCoins = Math.max(0, coins - cost);
    const newUnlocked = [...unlockedMediaIds, unlockKey];

    setCoins(newCoins);
    setUnlockedMediaIds(newUnlocked);
    persist({
      coins: newCoins,
      unlockedMediaIds: newUnlocked,
    }, false); // allows background sync of coins

    return true;
  };

  const equipTheme = (themeId: string) => {
    if (!unlockedThemeIds.includes(themeId)) return;
    setActiveThemeId(themeId);
    persist({ activeThemeId: themeId });
  };

  const activateVIP = (days: number) => {
    const currentExp = (vipExpiresAt && new Date(vipExpiresAt).getTime() > Date.now()) 
        ? new Date(vipExpiresAt) 
        : new Date();
    currentExp.setDate(currentExp.getDate() + days);
    const newExpiresAt = currentExp.toISOString();
    
    const diffMs = currentExp.getTime() - Date.now();
    const newVipDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    setVipDaysRemaining(newVipDays);
    setVipExpiresAt(newExpiresAt);
    persist({ vipDaysRemaining: newVipDays, vipExpiresAt: newExpiresAt });

    if (user?.id && !user.id.startsWith('guest-')) {
      supabase
        .from('vip_transactions')
        .insert({
          user_id: user.id,
          type: 'coins_purchase',
          duration: days,
        })
        .then(() => {});
    }
  };

  // Server-Authoritative Watch Time Reward
  const awardWatchTimeReward = async (minutes: number): Promise<{ coins: number; xp: number }> => {
    // Disabled coin payout for Pay-Per-View model so users don't instantly earn back their cost.
    const coinsEarned = 0; 
    const xpEarned = Math.max(10, Math.floor(minutes * 5));
    addXPAndCoins(xpEarned, coinsEarned);
    return { coins: coinsEarned, xp: xpEarned };
  };

  const selectSeasonalEvent = (eventId: string) => {
    const idx = SEASONAL_EVENTS.findIndex((e) => e.id === eventId);
    if (idx >= 0) {
      setActiveEventIndex(idx);
      const eventMissions = SEASONAL_EVENTS[idx].eventMissions;
      const otherMissions = missions.filter((m) => m.category !== 'event');
      const updated = [...otherMissions, ...eventMissions];
      setMissions(updated);
      persist({ missions: updated });
    }
  };

  return (
    <GamificationContext.Provider
      value={{
        coins,
        xp,
        level,
        levelTitle: getLevelTitle(level),
        nextLevelXP,
        currentLevelBaseXP,
        streakDays,
        hasClaimedDailyStreak,
        canSpinWheel,
        vipDaysRemaining,
        isVIP,
        activeEvent,
        allEvents: SEASONAL_EVENTS,
        missions,
        themes,
        activeTheme,
        badges,
        selectSeasonalEvent,
        claimDailyStreak,
        spinWheel,
        claimMission,
        unlockTheme,
        equipTheme,
        activateVIP,
        awardWatchTimeReward,
        addXPAndCoins,
        unlockedMediaIds,
        unlockMedia,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}
