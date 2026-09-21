
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

export type RewardedAdSession = {
  token: string;
  expiresAt: string;
};

/**
 * Creates a short-lived, one-time server session before a real rewarded ad is
 * loaded. The token is attached to Google AdMob SSV custom data; only Google's
 * signed server callback can consume it and credit the user's real balance.
 */
export async function createRewardedAdSession(
  adUnitId = ADMOB_IDS.rewardedAdUnitId || 'admob-rewarded'
): Promise<{ success: boolean; session?: RewardedAdSession; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('create_rewarded_ad_session', {
      p_ad_unit_id: adUnitId,
    });

    if (error || !data || !(data as any).success) {
      return { success: false, error: error?.message || 'Could not create a verified ad session.' };
    }

    const token = String((data as any).session_token || '');
    const expiresAt = String((data as any).expires_at || '');
    if (!token || !expiresAt) {
      return { success: false, error: 'Reward session response was incomplete.' };
    }

    return { success: true, session: { token, expiresAt } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Could not create a verified ad session.',
    };
  }
}

/**
 * Waits briefly for the signed AdMob SSV callback to consume a reward session.
 * This never grants coins itself; it only observes the server-owned session.
 */
export async function waitForRewardedAdVerification(
  sessionToken: string,
  attempts = 8,
  delayMs = 900
): Promise<{ verified: boolean; transactionId?: string }> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data, error } = await supabase
      .from('rewarded_ad_sessions')
      .select('status, verified_transaction_id')
      .eq('id', sessionToken)
      .maybeSingle();

    if (!error && data?.status === 'credited') {
      return {
        verified: true,
        transactionId: data.verified_transaction_id || undefined,
      };
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { verified: false };
}

