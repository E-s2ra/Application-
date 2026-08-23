import { supabase, SUPABASE_URL } from './supabase';
import { Linking, Platform } from 'react-native';

export type RasediPlanId = 'vip_1_month' | 'vip_3_months' | 'vip_6_months' | 'vip_1_year';

export type RasediPlan = {
  id: RasediPlanId;
  durationDays: number;
  durationLabel: string;
  priceIQD: number;
  badge?: string;
  popular?: boolean;
};

export const RASEDI_VIP_PLANS: RasediPlan[] = [
  {
    id: 'vip_1_month',
    durationDays: 30,
    durationLabel: '1 Month',
    priceIQD: 5000,
    badge: 'Starter',
  },
  {
    id: 'vip_3_months',
    durationDays: 90,
    durationLabel: '3 Months',
    priceIQD: 13000,
    badge: 'Popular',
    popular: true,
  },
  {
    id: 'vip_6_months',
    durationDays: 180,
    durationLabel: '6 Months',
    priceIQD: 25000,
    badge: 'Value',
  },
  {
    id: 'vip_1_year',
    durationDays: 365,
    durationLabel: '1 Year',
    priceIQD: 50000,
    badge: 'Best Value',
  },
];

/**
 * Initiates secure checkout session with backend RASEDI Edge Function.
 * The frontend never communicates directly with RASEDI secret credentials.
 */
export async function createRasediCheckout(planId: RasediPlanId): Promise<{
  success: boolean;
  paymentUrl?: string;
  orderId?: string;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Please sign in to subscribe to VIP.' };
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/rasedi-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        planId,
        returnUrl: Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/vip-success`
          : 'aniflix://vip-success',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to initiate payment session with RASEDI.',
      };
    }

    return {
      success: true,
      paymentUrl: data.paymentUrl,
      orderId: data.orderId,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Payment service is currently unavailable.' };
  }
}

/**
 * Backend verification check: Queries RASEDI server-side to confirm payment status.
 */
export async function verifyRasediPayment(orderId: string): Promise<{
  success: boolean;
  status?: string;
  isVIP?: boolean;
  vipExpiresAt?: string;
  error?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'User session not found.' };
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/rasedi-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to verify payment.' };
  }
}
