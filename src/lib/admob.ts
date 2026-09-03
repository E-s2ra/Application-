
import { supabase } from './supabase';
import {
  ADMOB_IDS,
  ANDROID_BANNER_ID,
  ANDROID_REWARDED_ID,
  IOS_BANNER_ID,
  IOS_REWARDED_ID,
  ADMOB_REWARDS,
} from '@/constants/admob';

export {
  ADMOB_IDS,
  ANDROID_BANNER_ID,
  ANDROID_REWARDED_ID,
  IOS_BANNER_ID,
  IOS_REWARDED_ID,
  ADMOB_REWARDS,
};

export type RewardedAdResult = {
  success: boolean;
  rewardType: 'coins' | 'xp' | 'spin' | 'vip';
  rewardCoins: number;
  rewardXP: number;
  newCoins?: number;
  newXP?: number;
  newLevel?: number;
  adUnitId: string;
};

/**
 * Securely records a completed rewarded ad session via the server-side
 * 'claim_rewarded_ad' SECURITY DEFINER RPC.
 * 
 * FIX CRITICAL-04: Removed the fallback direct-UPDATE path that bypassed
 * server validation and was vulnerable to TOCTOU race conditions.
 * The RPC is the single authoritative reward path.
 */
export async function recordRewardedAdToSupabase(
  userId: string,
  rewardCoins = ADMOB_REWARDS.rewardedAdCoins,
  rewardType = 'coins',
  adUnitId = ADMOB_IDS.rewardedAdUnitId || 'admob-rewarded'
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!userId || userId.startsWith('guest-')) {
      return {
        success: true,
        data: { reward_coins: rewardCoins, reward_xp: ADMOB_REWARDS.rewardedAdXP },
      };
    }

    // Use the secure SECURITY DEFINER RPC as the single authoritative path
    const { data: rpcData, error: rpcError } = await supabase.rpc('claim_rewarded_ad', {
      p_ad_unit_id: adUnitId,
      p_reward_type: rewardType,
    });

    if (rpcError) {
      console.warn('[AdMob] claim_rewarded_ad RPC error:', rpcError.message);
      return { success: false, error: rpcError.message };
    }

    if (rpcData && (rpcData as any).success) {
      return { success: true, data: rpcData };
    }

    // RPC returned but without success flag
    return { success: false, error: 'Reward claim was not granted by server.' };
  } catch (err: any) {
    console.warn('Error recording rewarded ad in Supabase:', err);
    return { success: false, error: err.message };
  }
}

