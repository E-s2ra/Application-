import { Platform } from 'react-native';

/**
 * Google AdMob Platform-Specific Configuration
 * 
 * Android App ID: ca-app-pub-6508988701499376~6377749194
 * iOS App ID:     ca-app-pub-6508988701499376~4682307965
 */

export const ANDROID_APP_ID = 'ca-app-pub-6508988701499376~6377749194';
export const ANDROID_BANNER_ID = 'ca-app-pub-6508988701499376/8868181169';
export const ANDROID_REWARDED_ID = 'ca-app-pub-6508988701499376/4443363765';

export const IOS_APP_ID = 'ca-app-pub-6508988701499376~4682307965';
export const IOS_BANNER_ID = 'ca-app-pub-6508988701499376/5312079535';
export const IOS_REWARDED_ID = 'ca-app-pub-6508988701499376/3978816560';

// Web / Dev Fallback Test IDs
export const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
export const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

/**
 * Automatically resolved AdMob configuration based on current runtime platform
 */
export const ADMOB_IDS = {
  appId: Platform.select({
    android: ANDROID_APP_ID,
    ios: IOS_APP_ID,
    default: ANDROID_APP_ID,
  }),
  bannerAdUnitId: Platform.select({
    android: ANDROID_BANNER_ID,
    ios: IOS_BANNER_ID,
    default: TEST_BANNER_ID,
  }),
  rewardedAdUnitId: Platform.select({
    android: ANDROID_REWARDED_ID,
    ios: IOS_REWARDED_ID,
    default: TEST_REWARDED_ID,
  }),
};

export const ADMOB_REWARDS = {
  rewardedAdCoins: 12,
  rewardedAdXP: 50,
  minCooldownSeconds: 15,
};
