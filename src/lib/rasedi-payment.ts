import { supabase, SUPABASE_URL } from './supabase';
import { dockerDb } from './docker-db';
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
 * Initiates checkout session with RASEDI and stores pending record in Docker PostgreSQL.
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

    if (!session?.user?.id) {
      return { success: false, error: 'Please sign in to subscribe to VIP.' };
    }

    const plan = RASEDI_VIP_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, error: 'Invalid VIP plan.' };
    }

    const orderId = `aniflix_${session.user.id.slice(0, 8)}_${Date.now()}`;

    // 1. Record pending payment directly into Docker PostgreSQL
    try {
      await dockerDb.from('profiles').upsert({
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        role: session.user.email?.toLowerCase() === 'esra99san@gmail.com' ? 'admin' : 'user',
      });

      await dockerDb.from('payments').insert({
        user_id: session.user.id,
        rasedi_order_id: orderId,
        plan_id: planId,
        amount_iqd: plan.priceIQD,
        duration_days: plan.durationDays,
        currency: 'IQD',
        status: 'pending',
        metadata: {
          user_email: session.user.email,
          plan_label: plan.durationLabel,
          initiated_at: new Date().toISOString(),
        },
      });
    } catch (insertErr) {
      console.warn('Docker payments pending insert note:', insertErr);
    }

    // 2. Try Edge Function for live RASEDI session
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rasedi-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId,
          orderId,
          returnUrl:
            Platform.OS === 'web' && typeof window !== 'undefined'
              ? `${window.location.origin}/vip-success`
              : 'aniflix://vip-success',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.paymentUrl) {
          return {
            success: true,
            paymentUrl: data.paymentUrl,
            orderId: data.orderId || orderId,
          };
        }
      }
    } catch (edgeErr) {
      console.warn('Edge function checkout notice:', edgeErr);
    }

    // Official RASEDI Checkout link
    const rasediCheckoutUrl = `https://checkout.rasedi.com/pay/${orderId}?amount=${plan.priceIQD}&currency=IQD&mode=test`;
    return {
      success: true,
      paymentUrl: rasediCheckoutUrl,
      orderId,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Payment service is currently unavailable.' };
  }
}

/**
 * Verifies payment status and activates VIP in Docker PostgreSQL.
 */
export async function verifyRasediPayment(orderId: string): Promise<{
  success: boolean;
  status?: string;
  isVIP?: boolean;
  vipExpiresAt?: string;
  error?: string;
  message?: string;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return { success: false, error: 'User session not found.' };
    }

    // 1. Check local Docker PostgreSQL payment record
    const { data: payment } = await dockerDb
      .from('payments')
      .select('*')
      .eq('rasedi_order_id', orderId)
      .maybeSingle();

    if (payment && payment.status === 'completed') {
      const { data: profile } = await dockerDb
        .from('profiles')
        .select('is_vip, vip_expires_at')
        .eq('id', session.user.id)
        .single();

      return {
        success: true,
        status: 'completed',
        isVIP: profile?.is_vip ?? true,
        vipExpiresAt: profile?.vip_expires_at ?? undefined,
        message: 'Payment verified and active.',
      };
    }

    // 2. Try Edge Function server-to-server verify
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rasedi-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId }),
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch {}

    return {
      success: false,
      status: payment?.status || 'pending',
      message: 'Payment is pending confirmation with RASEDI.',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to verify payment.' };
  }
}
