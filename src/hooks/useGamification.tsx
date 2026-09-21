import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { getVipStatus } from '@/features/vip/vip-state';

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

export type WalletLedgerEntry = {
  id: number;
  delta: number;
  balance_before: number;
  balance_after: number;
  reason: string;
  created_at: string;
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
  { id: 'slot-1', label: '50 Coins', icon: '50', type: 'coins', amount: 50, color: '#00E676' },
  { id: 'slot-2', label: '50 XP', icon: 'XP', type: 'xp', amount: 50, color: '#00D2FF' },
  { id: 'slot-3', label: '1-Day VIP', icon: 'VIP', type: 'vip', amount: 1, color: '#FFD166' },
  { id: 'slot-4', label: '50 Coins', icon: '50', type: 'coins', amount: 50, color: '#8CE99A' },
  { id: 'slot-5', label: '100 XP', icon: 'XP', type: 'xp', amount: 100, color: '#74C0FC' },
  { id: 'slot-6', label: '500 Coins', icon: '500', type: 'coins', amount: 500, color: '#FFB800' },
];

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'weekend-ad-frenzy',
    title: 'Weekend Ad Frenzy',
    subtitle: 'Watch 50 Ads this weekend to unlock the exclusive Inferno Theme!',
    badgeName: 'Ad Master',
    badgeIcon: 'Fire',
    bannerImage: '',
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
        current: 0,
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
        current: 0,
        completed: false,
        claimed: false,
        category: 'event',
      },
    ],
  },
  {
    id: 'golden-ad-hour',
    title: 'Golden Ad Rush',
    subtitle: 'For the next 48 hours, watching ads gives double XP!',
    badgeName: 'Golden Watcher',
    badgeIcon: 'Clock',
    bannerImage: '',
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
        current: 0,
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
    id: 'b-first-watch',
    title: 'First Stream',
    description: 'Streamed your first title on AniFlix',
    icon: 'Film',
    color: '#0356C5',
    isUnlocked: false,
  },
  {
    id: 'b-streak-3',
    title: '3-Day Fire Streak',
    description: 'Logged in for 3 consecutive days',
    icon: 'Flame',
    color: '#FF5722',
    isUnlocked: false,
  },
  {
    id: 'b-critic',
    title: '5-Star Critic',
    description: 'Published a helpful community review',
    icon: 'Star',
    color: '#FFB800',
    isUnlocked: false,
  },
  {
    id: 'b-kurdish-sun',
    title: 'Kurdish Sun Legend',
    description: 'Participated in the Kurdish Cinema Gala',
    icon: 'Sun',
    color: '#FFD700',
    isUnlocked: false,
  },
  {
    id: 'b-vip',
    title: 'AniFlix VIP',
    description: 'Activated an AniFlix VIP membership',
    icon: 'Crown',
    color: '#9C27B0',
    isUnlocked: false,
  },
];

const DEFAULT_MISSIONS: Mission[] = [
  {
    id: 'm-daily-2',
    title: 'Critique & Rate',
    description: 'Rate any movie or write a community review',
    rewardCoins: 15,
    rewardXP: 60,
    target: 1,
    current: 0,
    completed: false,
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
    current: 0,
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
    current: 0,
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
    current: 0,
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
  walletLedger: WalletLedgerEntry[];
  isWalletSyncing: boolean;
  walletSyncError: string | null;
  walletLastVerifiedAt: number | null;
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
  activateVIP: (days: number) => Promise<void>;
  awardWatchTimeReward: (minutes: number) => Promise<{ coins: number; xp: number }>;
  refreshGamification: () => Promise<void>;
  unlockedMediaIds: string[];
  unlockedMediaTimestamps: Record<string, number>;
  isMediaUnlocked: (unlockKey: string | undefined | null) => boolean;
  getUnlockedMediaRemainingDays: (unlockKey: string | undefined | null) => number | null;
  unlockMedia: (mediaId: string, episodeNum: number | undefined) => Promise<boolean>;
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (1 week) in milliseconds
const GAMIFICATION_STORAGE_KEY_PREFIX = '@aniflix_gamification_v3';

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isDeviceSessionReady } = useAuth();
  const [coins, setCoins] = useState(0);
  const [xp, setXp] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [hasClaimedDailyStreak, setHasClaimedDailyStreak] = useState(false);
  const [canSpinWheel, setCanSpinWheel] = useState(true);
  const [isVipFlag, setIsVipFlag] = useState(false);
  const [vipDaysRemaining, setVipDaysRemaining] = useState(0);
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [isWalletSyncing, setIsWalletSyncing] = useState(false);
  const [walletSyncError, setWalletSyncError] = useState<string | null>(null);
  const [walletLastVerifiedAt, setWalletLastVerifiedAt] = useState<number | null>(null);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [activeThemeId, setActiveThemeId] = useState('theme-deep-blue');
  const [unlockedThemeIds, setUnlockedThemeIds] = useState<string[]>(['theme-deep-blue']);
  const [unlockedMediaIds, setUnlockedMediaIds] = useState<string[]>([]);
  const [unlockedMediaTimestamps, setUnlockedMediaTimestamps] = useState<Record<string, number>>({});
  const [badges, setBadges] = useState<UserBadge[]>(DEFAULT_BADGES);
  const [missions, setMissions] = useState<Mission[]>([
    ...DEFAULT_MISSIONS,
    ...SEASONAL_EVENTS[0].eventMissions,
  ]);

  const activeEvent = SEASONAL_EVENTS[activeEventIndex] || SEASONAL_EVENTS[0];
  const isVIP = isVipFlag || vipDaysRemaining > 0;

  const isMediaUnlocked = useCallback(
    (unlockKey: string | undefined | null): boolean => {
      if (isVIP) return true;
      if (!unlockKey) return false;

      const timestamp = unlockedMediaTimestamps[unlockKey];
      if (timestamp && typeof timestamp === 'number') {
        const isStillValid = Date.now() - timestamp < ONE_WEEK_MS;
        return isStillValid;
      }

      return false;
    },
    [isVIP, unlockedMediaTimestamps]
  );

  const getUnlockedMediaRemainingDays = useCallback(
    (unlockKey: string | undefined | null): number | null => {
      if (isVIP) return Infinity;
      if (!unlockKey) return null;

      const timestamp = unlockedMediaTimestamps[unlockKey];
      if (timestamp && typeof timestamp === 'number') {
        const elapsed = Date.now() - timestamp;
        const remaining = ONE_WEEK_MS - elapsed;
        if (remaining <= 0) return 0;
        return Math.max(1, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
      }

      return null;
    },
    [isVIP, unlockedMediaTimestamps]
  );

  const applyVipProfile = useCallback((profile: { is_vip?: boolean | null; vip_expires_at?: string | null }) => {
    const vip = getVipStatus(profile);
    setIsVipFlag(vip.isVIP);
    setVipDaysRemaining(vip.vipDaysRemaining);
    setVipExpiresAt(vip.vipExpiresAt);
  }, []);

  const syncWalletSnapshot = useCallback(async (userId: string) => {
    setIsWalletSyncing(true);
    setWalletSyncError(null);
    try {
      const { data: snapshot, error: snapshotError } = await supabase.rpc('get_wallet_snapshot', {
        p_limit: 20,
      });

      if (snapshotError || !snapshot || typeof snapshot !== 'object') {
        throw snapshotError ?? new Error('Wallet snapshot response was incomplete');
      }

      const wallet = snapshot as {
        coins?: number;
        xp?: number;
        streak_days?: number;
        is_vip?: boolean;
        vip_expires_at?: string | null;
        ledger?: WalletLedgerEntry[];
      };

      if (Number.isFinite(wallet.coins)) setCoins(Number(wallet.coins));
      if (Number.isFinite(wallet.xp)) setXp(Number(wallet.xp));
      if (Number.isFinite(wallet.streak_days)) setStreakDays(Number(wallet.streak_days));
      applyVipProfile(wallet);
      setWalletLedger(Array.isArray(wallet.ledger) ? wallet.ledger : []);
      setWalletLastVerifiedAt(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify wallet state';
      setWalletSyncError(message);
      console.warn('[Gamification] Wallet sync failed:', message);
    } finally {
      setIsWalletSyncing(false);
    }
  }, [applyVipProfile]);

  const syncActiveMediaEntitlements = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('media_entitlements')
      .select('unlock_key, unlocked_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.warn('[Gamification] Could not sync media entitlements:', error.message);
      return;
    }

    const activeIds: string[] = [];
    const activeTimestamps: Record<string, number> = {};
    for (const entitlement of data || []) {
      if (!entitlement.unlock_key) continue;
      const unlockedAt = new Date(entitlement.unlocked_at).getTime();
      if (!Number.isFinite(unlockedAt)) continue;
      activeIds.push(entitlement.unlock_key);
      activeTimestamps[entitlement.unlock_key] = unlockedAt;
    }

    setUnlockedMediaIds(activeIds);
    setUnlockedMediaTimestamps(activeTimestamps);
  }, []);

  const syncMissionEvidence = useCallback(async (userId: string) => {
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, target, reward_coins, reward_xp')
      .eq('code', 'm-daily-3')
      .maybeSingle();

    if (missionError || !mission) return;

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const [{ count, error: favoritesError }, { data: userMission, error: userMissionError }] = await Promise.all([
      supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString()),
      supabase
        .from('user_missions')
        .select('claimed')
        .eq('user_id', userId)
        .eq('mission_id', mission.id)
        .maybeSingle(),
    ]);

    if (favoritesError || userMissionError) return;

    const current = Math.max(0, Number(count ?? 0));
    const target = Math.max(1, Number(mission.target ?? 2));
    setMissions((previous) =>
      previous.map((item) =>
        item.id === 'm-daily-3'
          ? {
              ...item,
              rewardCoins: Number(mission.reward_coins ?? item.rewardCoins),
              rewardXP: Number(mission.reward_xp ?? item.rewardXP),
              target,
              current,
              completed: current >= target,
              claimed: Boolean(userMission?.claimed),
            }
          : item
      )
    );
  }, []);

  const syncDailyRewardAvailability = useCallback(async (userId: string) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const todayStr = start.toISOString().slice(0, 10);

    const [loginResult, spinResult] = await Promise.all([
      supabase
        .from('daily_logins')
        .select('reward_claimed')
        .eq('user_id', userId)
        .eq('login_date', todayStr)
        .maybeSingle(),
      supabase
        .from('spins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString()),
    ]);

    if (loginResult.error) {
      console.warn('[Gamification] Could not verify daily login availability:', loginResult.error.message);
      // Fail open in the UI only. The RPC remains authoritative and will reject
      // a duplicate claim, which is preferable to permanently disabling the CTA.
      setHasClaimedDailyStreak(false);
    } else {
      setHasClaimedDailyStreak(Boolean(loginResult.data?.reward_claimed));
    }

    if (spinResult.error) {
      console.warn('[Gamification] Could not verify spin availability:', spinResult.error.message);
      setCanSpinWheel(true);
    } else {
      setCanSpinWheel((spinResult.count ?? 0) === 0);
    }
  }, []);

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
    setIsVipFlag(false);
    setWalletLedger([]);
    setWalletSyncError(null);
    setWalletLastVerifiedAt(null);
    setHasClaimedDailyStreak(false);
    setCanSpinWheel(true);
    setActiveEventIndex(0);
    setActiveThemeId('theme-deep-blue');
    setUnlockedThemeIds(['theme-deep-blue']);
    setUnlockedMediaIds([]);
    setUnlockedMediaTimestamps({});
    setBadges(DEFAULT_BADGES);
    setMissions([...DEFAULT_MISSIONS, ...SEASONAL_EVENTS[0].eventMissions]);

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
          const isSignedInAccount = Boolean(user?.id && !user.id.startsWith('guest-'));

          // Signed-in economy and entitlement state is never restored as truth
          // from device storage. It stays locked/zero until the server verifies it.
          if (!isSignedInAccount) {
            if (parsed.xp !== undefined) setXp(parsed.xp);
            if (parsed.streakDays !== undefined) setStreakDays(parsed.streakDays);
          }

          if (parsed.activeThemeId) setActiveThemeId(parsed.activeThemeId);
          if (parsed.unlockedThemeIds) setUnlockedThemeIds(parsed.unlockedThemeIds);
          if (!isSignedInAccount) {
            if (parsed.missions) setMissions(parsed.missions);
            if (parsed.badges) setBadges(parsed.badges);
          }
        }

        // Live Supabase Sync — always authoritative over local cache
        if (user?.id && !user.id.startsWith('guest-') && isDeviceSessionReady) {
          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2500));
          const syncPromise = (async () => {
            await syncWalletSnapshot(user.id);
            await syncActiveMediaEntitlements(user.id);
            await syncMissionEvidence(user.id);
            await syncDailyRewardAvailability(user.id);
          })();

          await Promise.race([syncPromise, timeoutPromise]);
        }
      } catch (e) {
        console.warn('Gamification init note:', e);
      }
    }
    loadData();
  }, [isDeviceSessionReady, syncActiveMediaEntitlements, syncDailyRewardAvailability, syncMissionEvidence, syncWalletSnapshot, user]);

  const persist = async (updates: any, _skipDbSync = false) => {
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
        unlockedMediaTimestamps,
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

      // FIX CRITICAL-01: Removed direct UPDATE of coins/xp/level/streak/vip
      // to Supabase profiles. All economic mutations MUST go through
      // SECURITY DEFINER RPCs (claim_daily_login_reward, claim_rewarded_ad,
      // spin_lucky_wheel, claim_mission_reward, deduct_coins, etc.).
      // persist() now only saves to local cache for UI state.
    } catch (err) {
      // FIX MED-03: Log errors instead of silently swallowing them
      console.warn('[Gamification] persist error:', err);
    }
  };

  const addGuestXP = (xpGain: number) => {
    if (user?.id && !user.id.startsWith('guest-')) return;
    const multiplier = activeEvent.bonusMultiplier || 1;
    const finalXP = Math.round(xpGain * multiplier);
    const newXp = xp + finalXP;
    setXp(newXp);
    persist({ xp: newXp }, true);
  };

  // Server-Authoritative Daily Streak Claim (Fixed 15 coins per day)
  const claimDailyStreak = async (): Promise<{ coins: number; xp: number }> => {
    if (hasClaimedDailyStreak) return { coins: 0, xp: 0 };

    if (user?.id && !user.id.startsWith('guest-')) {
      try {
        const { data, error } = await supabase.rpc('claim_daily_login_reward');
        if (!error && data && (data as any).success) {
          const res = data as any;
          const awardedCoins = Number(res.coins_awarded ?? 15);
          const awardedXp = res.xp_awarded || 150;
          const newStreak = res.streak_days || streakDays + 1;

          const updatedCoins = res.new_coins ?? (coins + awardedCoins);
          const updatedXp = res.new_xp ?? (xp + awardedXp);

          setStreakDays(newStreak);
          setCoins(updatedCoins);
          setXp(updatedXp);
          setHasClaimedDailyStreak(true);

          persist({
            coins: updatedCoins,
            xp: updatedXp,
            streakDays: newStreak,
            hasClaimedDailyStreak: true,
          }, true);

          return { coins: awardedCoins, xp: awardedXp };
        }
        if (!error && (data as any)?.reason === 'already_claimed_today') {
          setHasClaimedDailyStreak(true);
        }
      } catch (err) {
        console.warn('claim_daily_login_reward RPC error:', err);
      }

      return { coins: 0, xp: 0 };
    }

    return { coins: 0, xp: 0 };
  };

  // Server-authoritative daily wheel. The visible slots mirror the server pool.
  const spinWheel = async (): Promise<SpinReward> => {
    if (!canSpinWheel) return SPIN_REWARDS[0];

    if (user?.id && !user.id.startsWith('guest-')) {
      try {
        const { data, error } = await supabase.rpc('spin_lucky_wheel');
        if (!error && data && (data as any).success) {
          const res = data as any;
          const serverAmount = Number(res.reward_value ?? 0);
          const serverType: SpinReward['type'] = ['coins', 'xp', 'vip', 'badge'].includes(res.reward_type)
            ? res.reward_type
            : 'coins';
          const baseReward = SPIN_REWARDS.find((reward) => reward.id === res.reward_id)
            ?? SPIN_REWARDS.find((reward) => reward.type === serverType && reward.amount === serverAmount)
            ?? SPIN_REWARDS[0];
          const serverReward: SpinReward = {
            ...baseReward,
            type: serverType,
            amount: serverAmount,
            label: String(res.reward_label ?? baseReward.label),
          };

          const updatedCoins = res.new_coins ?? (serverReward.type === 'coins' ? coins + serverReward.amount : coins);
          const updatedXp = res.new_xp ?? xp;

          setCoins(updatedCoins);
          setXp(updatedXp);
          setCanSpinWheel(false);

          persist({
            coins: updatedCoins,
            xp: updatedXp,
            canSpinWheel: false,
          }, true);

          return serverReward;
        }
        if (!error && (data as any)?.reason === 'already_spun_today') {
          setCanSpinWheel(false);
        }
      } catch (err) {
        console.warn('spin_lucky_wheel RPC error:', err);
      }

      return { ...SPIN_REWARDS[0], amount: 0, label: 'Reward unavailable' };
    }

    return { ...SPIN_REWARDS[0], amount: 0, label: 'Sign in to earn rewards' };
  };

  // FIX CRITICAL-06: Server-Authoritative Mission Claim via RPC with Seamless Fallback
  const claimMission = async (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    if (!mission || !mission.completed || mission.claimed) return;

    if (user?.id && !user.id.startsWith('guest-')) {
      try {
        const { data, error } = await supabase.rpc('claim_mission_reward', {
          p_mission_code: missionId,
        });

        if (!error && data && (data as any).success) {
          const res = data as any;
          const updatedCoins = res.new_coins ?? (coins + mission.rewardCoins);
          const updatedXp = res.new_xp ?? (xp + mission.rewardXP);
          
          setCoins(updatedCoins);
          setXp(updatedXp);
          const updatedMissions = missions.map((m) =>
            m.id === missionId ? { ...m, claimed: true } : m
          );
          setMissions(updatedMissions);
          persist({ coins: updatedCoins, xp: updatedXp, missions: updatedMissions });
          return;
        } else if (data && (data as any).reason === 'already_claimed') {
          // Already claimed server-side — update local state to match
          const updatedMissions = missions.map((m) =>
            m.id === missionId ? { ...m, claimed: true } : m
          );
          setMissions(updatedMissions);
          persist({ missions: updatedMissions });
          return;
        }
      } catch (err) {
        console.warn('claim_mission_reward RPC error:', err);
      }

      return;
    }

    return;
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

      return false;
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

  // Server-authoritative media unlock. Pricing/category are derived entirely in
  // PostgreSQL; the client sends only the media identity and optional episode.
  const unlockMedia = async (mediaId: string, episodeNum: number | undefined): Promise<boolean> => {
    const unlockKey = episodeNum !== undefined ? `${mediaId}_ep_${episodeNum}` : mediaId;
    if (isMediaUnlocked(unlockKey)) return true;
    if (!user?.id || user.id.startsWith('guest-')) return false;

    try {
      const { data, error } = await supabase.rpc('unlock_media_with_coins_v2', {
        p_media_id: mediaId,
        p_episode: episodeNum ?? null,
      });

      if (error || !data || !(data as any).success) {
        console.warn('[unlockMedia] Secure unlock RPC failed:', error?.message, data);
        return false;
      }

      const res = data as any;
      const serverUnlockKey = String(res.unlock_key || unlockKey);
      const remaining = Number(res.remaining_coins ?? coins);
      const unlockedAt = new Date(res.unlocked_at || Date.now()).getTime();
      const newTimestamps = {
        ...unlockedMediaTimestamps,
        [serverUnlockKey]: Number.isFinite(unlockedAt) ? unlockedAt : Date.now(),
      };
      const serverUnlocked = Array.from(new Set([...unlockedMediaIds, serverUnlockKey]));

      setCoins(remaining);
      setUnlockedMediaIds(serverUnlocked);
      setUnlockedMediaTimestamps(newTimestamps);
      persist({ coins: remaining, unlockedMediaIds: serverUnlocked, unlockedMediaTimestamps: newTimestamps }, true);
      return true;
    } catch (err) {
      console.warn('[unlockMedia] Secure unlock exception:', err);
      return false;
    }
  };

  const equipTheme = (themeId: string) => {
    if (!unlockedThemeIds.includes(themeId)) return;
    setActiveThemeId(themeId);
    persist({ activeThemeId: themeId });
  };

  // FIX HIGH-06: Server-Authoritative VIP Activation via RPC
  const activateVIP = async (days: number) => {
    if (user?.id && !user.id.startsWith('guest-')) {
      try {
        const { data, error } = await supabase.rpc('activate_vip_with_coins', {
          p_days: days,
        });

        if (!error && data && (data as any).success) {
          const res = data as any;
          const vipDays = res.vip_days ?? days;
          const expiresAt = res.vip_expires_at;
          const remaining = res.remaining_coins;

          if (remaining !== undefined) setCoins(remaining);
          setVipDaysRemaining(vipDays);
          setVipExpiresAt(expiresAt);
          persist({ coins: remaining, vipDaysRemaining: vipDays, vipExpiresAt: expiresAt });
          return;
        }
        console.warn('activate_vip_with_coins error:', error?.message);
      } catch (err) {
        console.warn('activate_vip_with_coins RPC error:', err);
      }
      return;
    }
  };

  // Signed-in watch rewards stay disabled until trusted playback telemetry can
  // prove elapsed time server-side. Guest XP remains local-only and spendless.
  const awardWatchTimeReward = async (minutes: number): Promise<{ coins: number; xp: number }> => {
    if (user?.id && !user.id.startsWith('guest-')) {
      return { coins: 0, xp: 0 };
    }

    // Guest fallback: disabled coin payout for PPV model, only grant local XP.
    const coinsEarned = 0; 
    const xpEarned = Math.max(10, Math.floor(minutes * 5));
    addGuestXP(xpEarned);
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

  const refreshGamification = useCallback(async () => {
    if (!user?.id || user.id.startsWith('guest-') || !isDeviceSessionReady) return;
    try {
      await syncWalletSnapshot(user.id);
      await syncActiveMediaEntitlements(user.id);
      await syncMissionEvidence(user.id);
      await syncDailyRewardAvailability(user.id);
    } catch (e) {
      console.warn('[useGamification] refreshGamification error:', e);
    }
  }, [isDeviceSessionReady, syncActiveMediaEntitlements, syncDailyRewardAvailability, syncMissionEvidence, syncWalletSnapshot, user]);

  useEffect(() => {
    if (!user?.id || user.id.startsWith('guest-')) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshGamification();
    });
    return () => subscription.remove();
  }, [refreshGamification, user?.id]);

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
        walletLedger,
        isWalletSyncing,
        walletSyncError,
        walletLastVerifiedAt,
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
        refreshGamification,
        unlockedMediaIds,
        unlockedMediaTimestamps,
        isMediaUnlocked,
        getUnlockedMediaRemainingDays,
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
