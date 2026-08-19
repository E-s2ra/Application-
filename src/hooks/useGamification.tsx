import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

export const SPIN_REWARDS: SpinReward[] = [
  { id: '1', label: '50 Coins', icon: '💰', type: 'coins', amount: 50, color: '#FFB800' },
  { id: '2', label: '100 XP', icon: '⚡', type: 'xp', amount: 100, color: '#00D2FF' },
  { id: '3', label: '1-Day VIP', icon: '👑', type: 'vip', amount: 1, color: '#9C27B0' },
  { id: '4', label: '150 Coins', icon: '💰', type: 'coins', amount: 150, color: '#FF9800' },
  { id: '5', label: '250 XP', icon: '⚡', type: 'xp', amount: 250, color: '#00E676' },
  { id: '6', label: '500 Coins (Jackpot!)', icon: '💎', type: 'coins', amount: 500, color: '#E50914' },
];

const CURRENT_SEASONAL_EVENT: SeasonalEvent = {
  id: 'kurdish-cinema-fest',
  title: '🎉 Kurdish Cinema & Summer Festival',
  subtitle: 'Earn 2x Coins & Unlock Special Gold Festival Badges!',
  bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
  themeColor: '#FFB800',
  endDate: 'Aug 31, 2026',
  bonusMultiplier: 2,
  eventMissions: [
    {
      id: 'event-1',
      title: 'Festival Watcher',
      description: 'Watch 3 different movie titles during the festival',
      rewardCoins: 200,
      rewardXP: 300,
      target: 3,
      current: 1,
      completed: false,
      claimed: false,
      category: 'event',
    },
    {
      id: 'event-2',
      title: 'Community Voice',
      description: 'Leave a 5-star review on your favorite festival anime',
      rewardCoins: 150,
      rewardXP: 200,
      target: 1,
      current: 1,
      completed: true,
      claimed: false,
      category: 'event',
    },
  ],
};

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
  activeEvent: SeasonalEvent;
  missions: Mission[];
  claimDailyStreak: () => { coins: number; xp: number };
  spinWheel: () => SpinReward;
  claimMission: (missionId: string) => void;
  addXPAndCoins: (xpGain: number, coinsGain: number) => void;
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);
const GAMIFICATION_STORAGE_KEY = 'aniflix_gamification_v1';

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState(350);
  const [xp, setXp] = useState(480);
  const [streakDays, setStreakDays] = useState(4);
  const [hasClaimedDailyStreak, setHasClaimedDailyStreak] = useState(false);
  const [canSpinWheel, setCanSpinWheel] = useState(true);
  const [missions, setMissions] = useState<Mission[]>([
    ...DEFAULT_MISSIONS,
    ...CURRENT_SEASONAL_EVENT.eventMissions,
  ]);

  // Compute Level details: Every 300 XP = 1 Level
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

  // Load saved gamification data
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
          if (parsed.missions) setMissions(parsed.missions);
        }
      } catch (e) {
        console.warn('Error loading gamification:', e);
      }
    }
    loadData();
  }, []);

  const saveData = async (data: any) => {
    try {
      const json = JSON.stringify(data);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(GAMIFICATION_STORAGE_KEY, json);
      } else {
        await AsyncStorage.setItem(GAMIFICATION_STORAGE_KEY, json);
      }
    } catch {}
  };

  const addXPAndCoins = (xpGain: number, coinsGain: number) => {
    const newCoins = coins + coinsGain;
    const newXp = xp + xpGain;
    setCoins(newCoins);
    setXp(newXp);
    saveData({
      coins: newCoins,
      xp: newXp,
      streakDays,
      hasClaimedDailyStreak,
      canSpinWheel,
      missions,
    });
  };

  const claimDailyStreak = () => {
    if (hasClaimedDailyStreak) return { coins: 0, xp: 0 };
    const rewardCoins = 50 + streakDays * 10;
    const rewardXP = 80 + streakDays * 15;
    const newStreak = streakDays + 1;
    const newCoins = coins + rewardCoins;
    const newXp = xp + rewardXP;

    setStreakDays(newStreak);
    setCoins(newCoins);
    setXp(newXp);
    setHasClaimedDailyStreak(true);

    saveData({
      coins: newCoins,
      xp: newXp,
      streakDays: newStreak,
      hasClaimedDailyStreak: true,
      canSpinWheel,
      missions,
    });

    return { coins: rewardCoins, xp: rewardXP };
  };

  const spinWheel = (): SpinReward => {
    const randomIndex = Math.floor(Math.random() * SPIN_REWARDS.length);
    const reward = SPIN_REWARDS[randomIndex];

    let newCoins = coins;
    let newXp = xp;

    if (reward.type === 'coins') newCoins += reward.amount;
    if (reward.type === 'xp') newXp += reward.amount;

    setCoins(newCoins);
    setXp(newXp);
    setCanSpinWheel(false);

    saveData({
      coins: newCoins,
      xp: newXp,
      streakDays,
      hasClaimedDailyStreak,
      canSpinWheel: false,
      missions,
    });

    return reward;
  };

  const claimMission = (missionId: string) => {
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

    saveData({
      coins: newCoins,
      xp: newXp,
      streakDays,
      hasClaimedDailyStreak,
      canSpinWheel,
      missions: updatedMissions,
    });
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
        activeEvent: CURRENT_SEASONAL_EVENT,
        missions,
        claimDailyStreak,
        spinWheel,
        claimMission,
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
