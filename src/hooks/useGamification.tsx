import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { dockerDb } from '@/lib/docker-db';
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
  { id: '1', label: '50 Coins', icon: '💰', type: 'coins', amount: 50, color: '#FFB800' },
  { id: '2', label: '100 XP', icon: '⚡', type: 'xp', amount: 100, color: '#00D2FF' },
  { id: '3', label: '1-Day VIP Pass', icon: '👑', type: 'vip', amount: 1, color: '#9C27B0' },
  { id: '4', label: '150 Coins', icon: '💰', type: 'coins', amount: 150, color: '#FF9800' },
  { id: '5', label: '250 XP', icon: '⚡', type: 'xp', amount: 250, color: '#00E676' },
  { id: '6', label: '500 Coins (Jackpot!)', icon: '💎', type: 'coins', amount: 500, color: '#0356C5' },
];

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'kurdish-cinema-fest',
    title: '☀️ Kurdish Festival Cinema Gala',
    subtitle: 'Earn 2x Coins, unlock the Kurdish Sun Badge & Gold Theme!',
    badgeName: 'Kurdish Sun Legend',
    badgeIcon: '☀️',
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
    themeColor: '#FFB800',
    endDate: 'Aug 31, 2026',
    bonusMultiplier: 2,
    eventMissions: [
      {
        id: 'event-kurd-1',
        title: 'Festival Streamer',
        description: 'Watch 3 different titles during the Kurdish Festival',
        rewardCoins: 250,
        rewardXP: 350,
        target: 3,
        current: 1,
        completed: false,
        claimed: false,
        category: 'event',
      },
      {
        id: 'event-kurd-2',
        title: 'Golden Critique',
        description: 'Leave a 5-star review on any festival movie',
        rewardCoins: 180,
        rewardXP: 250,
        target: 1,
        current: 1,
        completed: true,
        claimed: false,
        category: 'event',
      },
    ],
  },
  {
    id: 'ramadan-nights',
    title: '🌙 Ramadan Midnight Cinema',
    subtitle: 'Stream after sunset to earn Night Owl XP & Emerald Theme!',
    badgeName: 'Crescent Night Owl',
    badgeIcon: '🌙',
    bannerImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
    themeColor: '#00E676',
    endDate: 'Sep 30, 2026',
    bonusMultiplier: 2.5,
    eventMissions: [
      {
        id: 'event-ram-1',
        title: 'Midnight Binge',
        description: 'Stream 4 episodes during evening hours',
        rewardCoins: 300,
        rewardXP: 400,
        target: 4,
        current: 2,
        completed: false,
        claimed: false,
        category: 'event',
      },
      {
        id: 'event-ram-2',
        title: 'Family Watchlist',
        description: 'Add 5 wholesome dramas to your favorites',
        rewardCoins: 200,
        rewardXP: 250,
        target: 5,
        current: 3,
        completed: false,
        claimed: false,
        category: 'event',
      },
    ],
  },
  {
    id: 'new-year-gala',
    title: '🎆 New Year Cinema Premiere',
    subtitle: 'Celebrate the new year with double spins & Neon Cyberpunk theme!',
    badgeName: 'New Year Luminary',
    badgeIcon: '🎆',
    bannerImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80',
    themeColor: '#9D4EDD',
    endDate: 'Jan 15, 2027',
    bonusMultiplier: 2,
    eventMissions: [
      {
        id: 'event-ny-1',
        title: 'New Year Countdown Stream',
        description: 'Watch the #1 Top Ranked Movie of the Year',
        rewardCoins: 350,
        rewardXP: 500,
        target: 1,
        current: 1,
        completed: true,
        claimed: false,
        category: 'event',
      },
    ],
  },
  {
    id: 'summer-cinema-blockbuster',
    title: '🏖️ Summer Cinema Blockbuster',
    subtitle: 'Beat the heat with action movies and earn Sunset Coral Theme!',
    badgeName: 'Summer Wave Master',
    badgeIcon: '🏖️',
    bannerImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&q=80',
    themeColor: '#FF6D00',
    endDate: 'Jul 31, 2026',
    bonusMultiplier: 1.5,
    eventMissions: [
      {
        id: 'event-sum-1',
        title: 'Action Marathon',
        description: 'Watch 2 blockbuster action movies',
        rewardCoins: 220,
        rewardXP: 300,
        target: 2,
        current: 1,
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
    rewardCoins: 30,
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
    rewardCoins: 40,
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
    rewardCoins: 25,
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
  claimDailyStreak: () => { coins: number; xp: number };
  spinWheel: () => SpinReward;
  claimMission: (missionId: string) => void;
  unlockTheme: (themeId: string) => boolean;
  equipTheme: (themeId: string) => void;
  activateVIP: (days: number) => void;
  awardWatchTimeReward: (minutes: number) => { coins: number; xp: number };
  addXPAndCoins: (xpGain: number, coinsGain: number, skipDbSync?: boolean) => void;
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);
const GAMIFICATION_STORAGE_KEY = 'aniflix_gamification_v3';

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [coins, setCoins] = useState(450);
  const [xp, setXp] = useState(580);
  const [streakDays, setStreakDays] = useState(4);
  const [hasClaimedDailyStreak, setHasClaimedDailyStreak] = useState(false);
  const [canSpinWheel, setCanSpinWheel] = useState(true);
  const [vipDaysRemaining, setVipDaysRemaining] = useState(0);
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [activeThemeId, setActiveThemeId] = useState('theme-deep-blue');
  const [unlockedThemeIds, setUnlockedThemeIds] = useState<string[]>(['theme-deep-blue']);
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
    if (lvl >= 20) return 'Legendary Cinephile 👑';
    if (lvl >= 10) return 'Master Streamer ⚡';
    if (lvl >= 5) return 'Anime VIP 🌟';
    if (lvl >= 3) return 'Cinema Enthusiast 🎬';
    return 'Novice Watcher 🍿';
  };

  const themes: AppTheme[] = THEMES_LIST.map((t) => ({
    ...t,
    isUnlocked: unlockedThemeIds.includes(t.id),
  }));

  const activeTheme = themes.find((t) => t.id === activeThemeId) || themes[0];

  // Sync with Supabase on user sign-in & load cached state
  useEffect(() => {
    async function loadData() {
      try {
        let raw: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          raw = localStorage.getItem(GAMIFICATION_STORAGE_KEY);
        } else {
          raw = await AsyncStorage.getItem(GAMIFICATION_STORAGE_KEY);
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.coins !== undefined) setCoins(parsed.coins);
          if (parsed.xp !== undefined) setXp(parsed.xp);
          if (parsed.streakDays !== undefined) setStreakDays(parsed.streakDays);
          if (parsed.hasClaimedDailyStreak !== undefined)
            setHasClaimedDailyStreak(parsed.hasClaimedDailyStreak);
          if (parsed.canSpinWheel !== undefined) setCanSpinWheel(parsed.canSpinWheel);
          
          let loadedExpiresAt = parsed.vipExpiresAt;
          if (loadedExpiresAt) {
            const diffMs = new Date(loadedExpiresAt).getTime() - Date.now();
            const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            setVipDaysRemaining(days);
            setVipExpiresAt(loadedExpiresAt);
          } else if (parsed.vipDaysRemaining) {
            const exp = new Date();
            exp.setDate(exp.getDate() + parsed.vipDaysRemaining);
            const expString = exp.toISOString();
            setVipExpiresAt(expString);
            setVipDaysRemaining(parsed.vipDaysRemaining);
          }

          if (parsed.activeThemeId) setActiveThemeId(parsed.activeThemeId);
          if (parsed.unlockedThemeIds) setUnlockedThemeIds(parsed.unlockedThemeIds);
          if (parsed.missions) setMissions(parsed.missions);
          if (parsed.badges) setBadges(parsed.badges);
        }

        // Live Docker Postgres Sync
        if (user?.id && !user.id.startsWith('guest-') && Platform.OS !== 'web') {
          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
          const syncPromise = (async () => {
            // 1. Fetch Profile from local Docker Postgres
            const { data: profile } = await dockerDb
              .from('profiles')
              .select('coins, xp, level, streak_days, is_vip, vip_expires_at')
              .eq('id', user.id)
              .single();

            if (profile) {
              if (profile.coins !== undefined && profile.coins !== null) setCoins(profile.coins);
              if (profile.xp !== undefined && profile.xp !== null) setXp(profile.xp);
              if (profile.streak_days !== undefined && profile.streak_days !== null)
                setStreakDays(profile.streak_days);
              if (profile.is_vip !== undefined && profile.is_vip !== null) {
                // Calculate remaining days from vip_expires_at
                if (profile.vip_expires_at) {
                  const diffMs = new Date(profile.vip_expires_at).getTime() - Date.now();
                  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                  setVipDaysRemaining(days);
                }
              }
            }

            // 2. Check Daily Logins for today
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: loginData } = await dockerDb
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
        missions,
        badges,
        ...updates,
      };
      const json = JSON.stringify(stateToSave);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(GAMIFICATION_STORAGE_KEY, json);
      } else {
        await AsyncStorage.setItem(GAMIFICATION_STORAGE_KEY, json);
      }

      // Sync to Docker Postgres profiles in background
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
        await dockerDb.from('profiles').update(payload).eq('id', user.id);
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

  const claimDailyStreak = () => {
    if (hasClaimedDailyStreak) return { coins: 0, xp: 0 };
    const rewardCoins = 60 + streakDays * 15;
    const rewardXP = 90 + streakDays * 20;
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
    });

    // Call secure RPC 'claim_daily_login_reward'
    if (user?.id && !user.id.startsWith('guest-')) {
      dockerDb.rpc('claim_daily_login_reward').then(({ data, error }) => {
        if (!error && data && (data as any).success) {
          const res = data as any;
          if (res.new_coins !== undefined) setCoins(res.new_coins);
          if (res.new_xp !== undefined) setXp(res.new_xp);
          if (res.streak_days !== undefined) setStreakDays(res.streak_days);
        }
      });
    }

    return { coins: rewardCoins, xp: rewardXP };
  };

  const spinWheel = (): SpinReward => {
    const randomIndex = Math.floor(Math.random() * SPIN_REWARDS.length);
    const reward = SPIN_REWARDS[randomIndex];

    let newCoins = coins;
    let newXp = xp;
    let newVipDays = vipDaysRemaining;
    let newExpiresAt = vipExpiresAt;

    if (reward.type === 'coins') newCoins += reward.amount;
    if (reward.type === 'xp') newXp += reward.amount;
    if (reward.type === 'vip') {
      const currentExp = (newExpiresAt && new Date(newExpiresAt).getTime() > Date.now()) 
          ? new Date(newExpiresAt) 
          : new Date();
      currentExp.setDate(currentExp.getDate() + reward.amount);
      newExpiresAt = currentExp.toISOString();
      const diffMs = currentExp.getTime() - Date.now();
      newVipDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    setCoins(newCoins);
    setXp(newXp);
    if (reward.type === 'vip') {
      setVipDaysRemaining(newVipDays);
      setVipExpiresAt(newExpiresAt);
    }
    setCanSpinWheel(false);

    persist({
      coins: newCoins,
      xp: newXp,
      ...(reward.type === 'vip' ? { vipDaysRemaining: newVipDays, vipExpiresAt: newExpiresAt } : {}),
      canSpinWheel: false,
    });

    // Call secure RPC 'spin_lucky_wheel'
    if (user?.id && !user.id.startsWith('guest-')) {
      dockerDb.rpc('spin_lucky_wheel').then(({ data, error }) => {
        if (!error && data && (data as any).success) {
          const res = data as any;
          if (res.new_coins !== undefined) setCoins(res.new_coins);
          if (res.new_xp !== undefined) setXp(res.new_xp);
        }
      });
    }

    return reward;
  };

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

    // Sync to Docker Postgres user_missions
    if (user?.id && !user.id.startsWith('guest-')) {
      try {
        const { data: mData } = await dockerDb
          .from('missions')
          .select('id')
          .eq('code', missionId)
          .maybeSingle();

        if (mData?.id) {
          await dockerDb.from('user_missions').upsert({
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

  const unlockTheme = (themeId: string): boolean => {
    const targetTheme = THEMES_LIST.find((t) => t.id === themeId);
    if (!targetTheme || unlockedThemeIds.includes(themeId)) return false;
    if (coins < targetTheme.costCoins) return false;

    const newCoins = coins - targetTheme.costCoins;
    const newUnlocked = [...unlockedThemeIds, themeId];

    setCoins(newCoins);
    setUnlockedThemeIds(newUnlocked);
    setActiveThemeId(themeId);

    persist({
      coins: newCoins,
      unlockedThemeIds: newUnlocked,
      activeThemeId: themeId,
    });

    // Call secure RPC 'unlock_theme_with_coins'
    if (user?.id && !user.id.startsWith('guest-')) {
      dockerDb
        .rpc('unlock_theme_with_coins', { p_theme_code: themeId })
        .then(({ data, error }) => {
          if (!error && data && (data as any).success) {
            const res = data as any;
            if (res.remaining_coins !== undefined) setCoins(res.remaining_coins);
          }
        });
    }

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

    // Record in Docker Postgres vip_transactions
    if (user?.id && !user.id.startsWith('guest-')) {
      dockerDb
        .from('vip_transactions')
        .insert({
          user_id: user.id,
          type: 'coins_purchase',
          duration: days,
        })
        .then(() => {});
    }
  };

  const awardWatchTimeReward = (minutes: number) => {
    const coinsEarned = Math.max(10, Math.floor(minutes * 5));
    const xpEarned = Math.max(20, Math.floor(minutes * 10));
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
