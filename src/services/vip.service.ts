import { grantVipUser } from '@/lib/admin-operations';

/**
 * VipService — Admin VIP grant operations.
 * VIP access is granted manually by the admin after users contact via WhatsApp/Telegram.
 */
export const VipService = {
  /**
   * Invokes Admin Edge Function (with DB fallback) to grant VIP status to a user by email/username.
   * Used from the Admin Panel → VIP Approvals tab.
   */
  async grantVipAccess(userEmail: string, durationDays: number): Promise<{ success: boolean; message?: string }> {
    const res = await grantVipUser(userEmail, durationDays);

    if (res.error) {
      return { success: false, message: res.error };
    }
    return { success: true, message: res.data?.message || `VIP granted to ${userEmail} (${durationDays} days)` };
  },
};
