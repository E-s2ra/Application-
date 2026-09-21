import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './useAuth';
import { useGamification } from './useGamification';
import { useToast } from './useToast';
import { ADMOB_REWARDS, ADMOB_IDS } from '@/constants/admob';
import { createRewardedAdSession, waitForRewardedAdVerification } from '@/lib/admob';
import { AdMobProxy } from '@/lib/admob-proxy';

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

const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = AdMobProxy;

export function AdMobProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [isAdModalVisible, setIsAdModalVisible] = useState(false);
  const [currentRewardCoins, setCurrentRewardCoins] = useState(ADMOB_REWARDS.rewardedAdCoins);
  const [currentRewardType, setCurrentRewardType] = useState<'coins' | 'xp' | 'spin' | 'vip'>('coins');

  const rewardedAdRef = useRef<any>(null);
  const rewardSessionTokenRef = useRef<string | null>(null);
  const onRewardCallbackRef = useRef<((amount: number) => void) | null>(null);
  const isNativeAdAvailable = Platform.OS !== 'web' && RewardedAd !== null;
  const { refreshGamification, isVIP } = useGamification();
  const { showSuccess } = useToast();

  const finalizeVerifiedReward = useCallback(async (sessionToken: string) => {
    const verification = await waitForRewardedAdVerification(sessionToken);
    if (!verification.verified) {
      console.warn('[AdMob] Reward is pending server-side verification. Balance will refresh when the app resumes.');
      return false;
    }

    await refreshGamification();
    showSuccess(`Earned +${ADMOB_REWARDS.rewardedAdCoins} Coins!`);
    onRewardCallbackRef.current?.(ADMOB_REWARDS.rewardedAdCoins);
    return true;
  }, [refreshGamification, showSuccess]);

  // Pre-load a rewarded ad on native platforms
  const loadRewardedAd = useCallback(async () => {
    if (!isNativeAdAvailable || !user?.id || user.id.startsWith('guest-') || isVIP) return;

    const adUnitId = __DEV__
      ? TestIds?.REWARDED || 'ca-app-pub-3940256099942544/5224354917'
      : ADMOB_IDS.rewardedAdUnitId || '';

    try {
      rewardedAdRef.current?.unsubscribe?.();
      rewardedAdRef.current = null;
      rewardSessionTokenRef.current = null;
      setIsAdLoaded(false);
      setIsLoadingAd(true);

      const sessionResult = await createRewardedAdSession(adUnitId);
      if (!sessionResult.success || !sessionResult.session) {
        console.warn('[AdMob] Could not create verified reward session:', sessionResult.error);
        setIsLoadingAd(false);
        return;
      }

      const sessionToken = sessionResult.session.token;
      rewardSessionTokenRef.current = sessionToken;

      const rewarded = RewardedAd.createForAdRequest(adUnitId, {
        keywords: ['anime', 'movies', 'streaming', 'entertainment'],
        serverSideVerificationOptions: {
          userId: user.id,
          customData: sessionToken,
        },
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
        void loadRewardedAd();
      });

      // User earned reward by watching full ad
      const unsubEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward: any) => {
          console.log('[AdMob] User earned reward:', reward);
          void finalizeVerifiedReward(sessionToken);
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

      rewarded.load();
    } catch (err) {
      console.warn('[AdMob] Error creating rewarded ad:', err);
      setIsLoadingAd(false);
    }
  }, [finalizeVerifiedReward, isNativeAdAvailable, isVIP, user?.id]);

  // Load ad on mount for native
  useEffect(() => {
    if (isNativeAdAvailable) {
      void loadRewardedAd();
    } else if (Platform.OS === 'web') {
      // Web exposes a visual preview only; it never credits spendable rewards.
      setIsAdLoaded(true);
    } else {
      setIsAdLoaded(false);
    }

    return () => {
      rewardedAdRef.current?.unsubscribe?.();
    };
  }, [isNativeAdAvailable, loadRewardedAd]);

  const showRewardedAd = useCallback(
    async (options?: ShowAdOptions): Promise<boolean> => {
      // VIP subscribers do not see ads and cannot claim coins
      if (isVIP) {
        console.log('[AdMob] User is VIP — ads are disabled for VIP plan.');
        return false;
      }

      const coins = options?.rewardCoins ?? ADMOB_REWARDS.rewardedAdCoins;
      const type = options?.rewardType ?? 'coins';

      setCurrentRewardCoins(coins);
      setCurrentRewardType(type);
      if (options?.onRewarded) {
        onRewardCallbackRef.current = options.onRewarded;
      } else {
        onRewardCallbackRef.current = null;
      }

      // Native rewards are only valid when a real Google ad has a server-side
      // verification session. Never fall back to the simulator on native.
      if (isNativeAdAvailable) {
        if (!rewardedAdRef.current?.ad || !isAdLoaded) {
          void loadRewardedAd();
          return false;
        }
        try {
          await rewardedAdRef.current.ad.show();
          return true;
        } catch (err) {
          console.warn('[AdMob] Failed to show verified rewarded ad:', err);
          void loadRewardedAd();
          return false;
        }
      }

      // A native build without the AdMob module must fail closed. Showing the
      // simulator here would imply a verified reward path that does not exist.
      if (Platform.OS !== 'web') {
        console.warn('[AdMob] Rewarded ads are unavailable in this native build.');
        return false;
      }

      // Web can show the existing visual preview, but it never mints
      // spendable coins because there is no provider-signed AdMob callback.
      setIsLoadingAd(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setIsLoadingAd(false);
      setIsAdModalVisible(true);
      return true;
    },
    [isAdLoaded, isNativeAdAvailable, isVIP, loadRewardedAd]
  );

  const onAdCompleted = useCallback(async () => {
    // The fallback modal is only a UI preview. Real coins are credited solely
    // by the signed AdMob SSV callback and then observed by the native client.
    if (Platform.OS !== 'web' && rewardSessionTokenRef.current) {
      await finalizeVerifiedReward(rewardSessionTokenRef.current);
    }
  }, [finalizeVerifiedReward]);

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
