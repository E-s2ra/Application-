import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './useAuth';
import { useGamification } from './useGamification';
import { useToast } from './useToast';
import { ADMOB_REWARDS, ADMOB_IDS } from '@/constants/admob';
import { recordRewardedAdToSupabase } from '@/lib/admob';

type ShowAdOptions = {
  rewardCoins?: number;
  rewardType?: 'coins' | 'xp' | 'spin' | 'vip';
  onRewarded?: (rewardAmount: number) => void;
};

type AdMobContextType = {
  isAdLoaded: boolean;
  isLoadingAd: boolean;
  isAdModalVisible: boolean;
  currentRewardCoins: number;
  currentRewardType: string;
  showRewardedAd: (options?: ShowAdOptions) => Promise<boolean>;
  onAdCompleted: () => Promise<void>;
  closeAdModal: () => void;
};

const AdMobContext = createContext<AdMobContextType | undefined>(undefined);

import { AdMobProxy } from '@/lib/admob-proxy';

const { RewardedAd, RewardedAdEventType, AdEventType, TestIds, isAvailable } = AdMobProxy;

if (!isAvailable) {
  console.log('[AdMob] react-native-google-mobile-ads not available (web/dev), using fallback modal');
}

export function AdMobProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [isAdModalVisible, setIsAdModalVisible] = useState(false);
  const [currentRewardCoins, setCurrentRewardCoins] = useState(ADMOB_REWARDS.rewardedAdCoins);
  const [currentRewardType, setCurrentRewardType] = useState<'coins' | 'xp' | 'spin' | 'vip'>('coins');
  const [onRewardCallback, setOnRewardCallback] = useState<((amount: number) => void) | null>(null);

  const rewardedAdRef = useRef<any>(null);
  const isNativeAdAvailable = Platform.OS !== 'web' && RewardedAd !== null;

  // Pre-load a rewarded ad on native platforms
  const loadRewardedAd = useCallback(() => {
    if (!isNativeAdAvailable) return;

    const adUnitId = __DEV__
      ? TestIds?.REWARDED || 'ca-app-pub-3940256099942544/5224354917'
      : ADMOB_IDS.rewardedAdUnitId || '';

    try {
      const rewarded = RewardedAd.createForAdRequest(adUnitId, {
        keywords: ['anime', 'movies', 'streaming', 'entertainment'],
      });

      // Ad loaded successfully
      const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setIsAdLoaded(true);
        setIsLoadingAd(false);
      });

      // Ad failed to load
      const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.warn('[AdMob] Ad failed to load:', error);
        setIsAdLoaded(false);
        setIsLoadingAd(false);
      });

      // Ad was closed by user
      const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        // Preload the next ad
        loadRewardedAd();
      });

      // User earned reward by watching full ad
      const unsubEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward: any) => {
          console.log('[AdMob] User earned reward:', reward);
          // Reward is credited via the onAdCompleted callback
        }
      );

      rewardedAdRef.current = {
        ad: rewarded,
        unsubscribe: () => {
          unsubLoaded();
          unsubError();
          unsubClosed();
          unsubEarned();
        },
      };

      setIsLoadingAd(true);
      rewarded.load();
    } catch (err) {
      console.warn('[AdMob] Error creating rewarded ad:', err);
    }
  }, [isNativeAdAvailable]);

  // Load ad on mount for native
  useEffect(() => {
    if (isNativeAdAvailable) {
      loadRewardedAd();
    } else {
      // Web/dev fallback — always "loaded"
      setIsAdLoaded(true);
    }

    return () => {
      rewardedAdRef.current?.unsubscribe?.();
    };
  }, [isNativeAdAvailable, loadRewardedAd]);

  const { profile } = useAuth();
  const { addXPAndCoins } = useGamification();
  const { showSuccess } = useToast();

  const showRewardedAd = useCallback(
    async (options?: ShowAdOptions): Promise<boolean> => {
      // VIP subscribers do not see ads and cannot claim coins
      if (profile?.is_vip) {
        console.log('[AdMob] User is VIP — ads are disabled for VIP plan.');
        return false;
      }

      const coins = options?.rewardCoins ?? ADMOB_REWARDS.rewardedAdCoins;
      const type = options?.rewardType ?? 'coins';

      setCurrentRewardCoins(coins);
      setCurrentRewardType(type);
      if (options?.onRewarded) {
        setOnRewardCallback(() => options.onRewarded);
      } else {
        setOnRewardCallback(null);
      }

      // NATIVE PATH: Show real Google ad
      if (isNativeAdAvailable && rewardedAdRef.current?.ad) {
        try {
          await rewardedAdRef.current.ad.show();
          return true;
        } catch (err) {
          console.warn('[AdMob] Failed to show ad, falling back to modal:', err);
          // Fall through to modal fallback
        }
      }

      // WEB/FALLBACK PATH: Show the simulated ad modal
      setIsLoadingAd(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setIsLoadingAd(false);
      setIsAdModalVisible(true);
      return true;
    },
    [isNativeAdAvailable, profile?.is_vip]
  );

  const onAdCompleted = useCallback(async () => {
    const userId = user?.id || 'guest-user';
    
    // Record to Supabase
    await recordRewardedAdToSupabase(userId, currentRewardCoins, currentRewardType);

    // Universally credit coins & XP for any completed ad across the app
    if (currentRewardType === 'coins' && currentRewardCoins > 0) {
      addXPAndCoins(50, currentRewardCoins, true);
      showSuccess(`Earned +${currentRewardCoins} Coins! 💰`);
    }

    // Trigger custom local callback if provided
    if (onRewardCallback) {
      onRewardCallback(currentRewardCoins);
    }
  }, [user, currentRewardCoins, currentRewardType, onRewardCallback, addXPAndCoins, showSuccess]);

  const closeAdModal = useCallback(() => {
    setIsAdModalVisible(false);
  }, []);

  return (
    <AdMobContext.Provider
      value={{
        isAdLoaded,
        isLoadingAd,
        isAdModalVisible,
        currentRewardCoins,
        currentRewardType,
        showRewardedAd,
        onAdCompleted,
        closeAdModal,
      }}
    >
      {children}
    </AdMobContext.Provider>
  );
}

export function useAdMob() {
  const ctx = useContext(AdMobContext);
  if (!ctx) {
    throw new Error('useAdMob must be used within an AdMobProvider');
  }
  return ctx;
}
