import { supabase } from '@/lib/supabase';
import { callAdminOperation } from '@/lib/admin-operations';
import { PendingPayment, VipPlan } from '@/types';

export const RASEDI_VIP_PLANS: VipPlan[] = [
  { id: 'aniflix-vip-1m', durationDays: 30, priceIQD: 5000, popular: false },
  { id: 'aniflix-vip-3m', durationDays: 90, priceIQD: 12000, popular: true, badge: 'Save 20%' },
  { id: 'aniflix-vip-6m', durationDays: 180, priceIQD: 22000, popular: false, badge: 'Popular' },
  { id: 'aniflix-vip-1y', durationDays: 365, priceIQD: 40000, popular: false, badge: 'Best Value' },
];

/**
 * VipService — Encapsulates VIP subscription, manual transfer processing, and Admin VIP elevations.
 */
export const VipService = {
  /**
   * Fetches pending payment proofs for Admin review.
   */
  async getPendingPayments(): Promise<PendingPayment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data as PendingPayment[];
    } catch {
      return [];
    }
  },

  /**
   * Invokes Admin Edge Function to grant VIP status to a user.
   */
  async grantVipAccess(userEmail: string, durationDays: number): Promise<{ success: boolean; message?: string }> {
    const res = await callAdminOperation<{ success: boolean; message: string }>('grant_vip', {
      user_email: userEmail,
      days: durationDays,
    });

    if (res.error) {
      return { success: false, message: res.error };
    }
    return { success: true, message: res.data?.message };
  },

  /**
   * Submits payment transfer proof.
   */
  async submitPaymentProof(payload: {
    userId: string;
    userEmail: string;
    planId: string;
    amountIQD: number;
    method: 'zaincash' | 'fastpay' | 'fib' | 'rasedi';
    referenceNumber: string;
    senderPhone?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('payments').insert({
        user_id: payload.userId,
        plan_id: payload.planId,
        amount_iqd: payload.amountIQD,
        status: 'pending',
        metadata: {
          user_email: payload.userEmail,
          method: payload.method,
          transaction_ref: payload.referenceNumber,
          sender_phone: payload.senderPhone || null,
        },
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit payment proof.' };
    }
  },
};
