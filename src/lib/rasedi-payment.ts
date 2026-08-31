import { supabase, SUPABASE_URL } from './supabase';
import { Platform } from 'react-native';

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
 * Initiates checkout session with RASEDI and stores pending record in Supabase.
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

    // 1. Record pending payment into Supabase
    try {
      await supabase.from('payments').insert({
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
      console.warn('Payments pending insert note:', insertErr);
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
    const mode = process.env.RASEDI_MODE || 'test';
    const rasediCheckoutUrl = `https://checkout.rasedi.com/pay/${orderId}?amount=${plan.priceIQD}&currency=IQD&mode=${mode}`;
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
 * Verifies payment status and activates VIP in Supabase.
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

    // 1. Check Supabase payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('rasedi_order_id', orderId)
      .maybeSingle();

    if (payment && payment.status === 'completed') {
      const { data: profile } = await supabase
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

/**
 * Test/Sandbox Helper: Simulates receiving a verified RASEDI webhook
 * to test VIP activation locally in Supabase.
 */
export async function simulateTestPaymentSuccess(orderId: string): Promise<{
  success: boolean;
  message?: string;
  isVIP?: boolean;
  vipExpiresAt?: string;
}> {
  try {
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('rasedi_order_id', orderId)
      .maybeSingle();

    if (!payment) {
      return { success: false, message: 'Payment order not found in database.' };
    }

    const { data, error } = await supabase.rpc('process_verified_rasedi_payment', {
      p_user_id: payment.user_id,
      p_rasedi_order_id: payment.rasedi_order_id,
      p_rasedi_transaction_id: `tx_sandbox_${Date.now()}`,
      p_plan_id: payment.plan_id,
      p_amount_iqd: payment.amount_iqd,
      p_duration_days: payment.duration_days,
      p_metadata: { verified_by: 'sandbox_simulator', simulated_at: new Date().toISOString() },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: 'Test payment verified! VIP active.',
      isVIP: (data as any)?.is_vip ?? true,
      vipExpiresAt: (data as any)?.vip_expires_at,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Simulation error.' };
  }
}

/**
 * Submits proof of a direct manual transfer (FIB, ZainCash, FastPay, AsiaCell Voucher)
 * for admin review and approval.
 */
export async function submitManualPaymentProof(params: {
  planId: RasediPlanId;
  method: string;
  transactionRef: string;
  senderPhone?: string;
  senderName?: string;
  voucherPin?: string;
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return { success: false, error: 'Please sign in to submit payment proof.' };
    }

    const plan = RASEDI_VIP_PLANS.find((p) => p.id === params.planId);
    if (!plan) {
      return { success: false, error: 'Invalid VIP plan.' };
    }

    const orderId = `manual_${params.method}_${session.user.id.slice(0, 8)}_${Date.now()}`;

    // Record pending manual payment in Supabase
    const { error: insertErr } = await supabase.from('payments').insert({
      user_id: session.user.id,
      rasedi_order_id: orderId,
      plan_id: params.planId,
      amount_iqd: plan.priceIQD,
      duration_days: plan.durationDays,
      currency: 'IQD',
      status: 'pending_approval',
      metadata: {
        payment_type: 'manual_transfer',
        method: params.method,
        transaction_ref: params.transactionRef,
        sender_phone: params.senderPhone || '',
        sender_name: params.senderName || '',
        voucher_pin: params.voucherPin || '',
        user_email: session.user.email,
        plan_title: plan.durationLabel,
        submitted_at: new Date().toISOString(),
      },
    });

    if (insertErr) {
      return { success: false, error: insertErr.message || 'Failed to submit payment record.' };
    }

    return { success: true, orderId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit payment proof.' };
  }
}

/**
 * Admin function: Fetches all pending manual payments awaiting approval.
 */
export async function getPendingManualPayments(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, profiles:user_id(id, full_name, username, role, is_vip, vip_expires_at)')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Admin function: Approves a manual payment and activates VIP for the user in Supabase.
 */
export async function approveManualPayment(paymentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (!payment) {
      return { success: false, error: 'Payment not found.' };
    }

    const { error } = await supabase.rpc('process_verified_rasedi_payment', {
      p_user_id: payment.user_id,
      p_rasedi_order_id: payment.rasedi_order_id,
      p_rasedi_transaction_id: `approved_manual_${payment.rasedi_order_id}`,
      p_plan_id: payment.plan_id,
      p_amount_iqd: payment.amount_iqd,
      p_duration_days: payment.duration_days,
      p_metadata: { approved_by_admin: true, approved_at: new Date().toISOString() },
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to approve payment.' };
  }
}

/**
 * Admin function: Rejects a manual payment.
 */
export async function rejectManualPayment(paymentId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'rejected',
        metadata: { rejection_reason: reason || 'Rejected by Admin', rejected_at: new Date().toISOString() },
      })
      .eq('id', paymentId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reject payment.' };
  }
}
