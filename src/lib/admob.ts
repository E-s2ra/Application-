import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Google AdMob Configuration & Production / Test Ad Unit IDs
 */
export const ADMOB_CONFIG = {
  // Official Google AdMob Test Ad Unit IDs
  testAdUnits: {
    banner: Platform.select({
      ios: 'ca-app-pub-3940256099942544/2934735716',
      android: 'ca-app-pub-3940256099942544/6300978111',
      default: 'ca-app-pub-3940256099942544/6300978111',
    }),
    interstitial: Platform.select({
      ios: 'ca-app-pub-3940256099942544/4411468910',
      android: 'ca-app-pub-3940256099942544/1033173712',
      default: 'ca-app-pub-3940256099942544/1033173712',
    }),
    rewarded: Platform.select({
      ios: 'ca-app-pub-3940256099942544/1712485313',
      android: 'ca-app-pub-3940256099942544/5224354917',
      default: 'ca-app-pub-3940256099942544/5224354917',
    }),
  },
  // Default Coin and XP Rewards for watching Ads
  rewards: {
    defaultCoins: 100,
    defaultXP: 150,
    bonusMultiplier: 1.5,
  },
};

export type RewardedAdResult = {
  success: boolean;
  rewardType: 'coins' | 'xp' | 'spin' | 'vip';
  amount: number;
  adUnitId: string;
};

/**
 * Records a completed rewarded ad session into Supabase 'rewarded_ads' table
 * and increments user coins in Supabase 'profiles' table.
 */
export async function recordRewardedAdToSupabase(
  userId: string,
  rewardCoins: number,
  rewardType = 'coins',
  adUnitId = ADMOB_CONFIG.testAdUnits.rewarded || 'admob-rewarded-test'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || userId.startsWith('guest-')) {
      return { success: true };
    }

    // 1. Insert into rewarded_ads ledger
    const { error: insertError } = await supabase.from('rewarded_ads').insert({
      user_id: userId,
      ad_unit_id: adUnitId,
      reward_type: rewardType,
      reward_coins: rewardCoins,
      watched_at: new Date().toISOString(),
    });

    if (insertError) {
      console.warn('Supabase rewarded_ads insert note:', insertError.message);
    }

    // 2. Fetch & update user profile coins
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins, xp')
      .eq('id', userId)
      .single();

    if (profile) {
      const currentCoins = profile.coins || 0;
      await supabase
        .from('profiles')
        .update({
          coins: currentCoins + rewardCoins,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Error recording rewarded ad in Supabase:', err);
    return { success: false, error: err.message };
  }
}
