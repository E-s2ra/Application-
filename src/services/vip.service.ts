import { callAdminOperation } from '@/lib/admin-operations';

/**
 * VipService — Admin VIP grant operations.
 * VIP access is granted manually by the admin after users contact via WhatsApp/Telegram.
 */
export const VipService = {
  /**
   * Invokes Admin Edge Function to grant VIP status to a user by email.
   * Used from the Admin Panel → VIP Approvals tab.
   */
  async grantVipAccess(userEmail: string, durationDays: number): Promise<{ success: boolean; message?: string }> {
    const res = await callAdminOperation<{ success: boolean; message: string }>('grant_vip', {
      user: { email: userEmail, days: durationDays },
    });

    if (res.error) {
      return { success: false, message: res.error };
    }
    return { success: true, message: res.data?.message };
  },
};
