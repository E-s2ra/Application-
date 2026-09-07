export type VipProfile = {
  is_vip?: boolean | null;
  vip_expires_at?: string | null;
};

export type VipStatus = {
  isVIP: boolean;
  vipDaysRemaining: number;
  vipExpiresAt: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function getVipStatus(profile: VipProfile | null | undefined, now = Date.now()): VipStatus {
  if (!profile) return { isVIP: false, vipDaysRemaining: 0, vipExpiresAt: null };
  if (!profile.vip_expires_at) {
    return profile.is_vip === true
      ? { isVIP: true, vipDaysRemaining: 999, vipExpiresAt: null }
      : { isVIP: false, vipDaysRemaining: 0, vipExpiresAt: null };
  }
  const expiryMs = new Date(profile.vip_expires_at).getTime();
  if (!Number.isFinite(expiryMs) || expiryMs <= now || profile.is_vip === false) {
    return { isVIP: false, vipDaysRemaining: 0, vipExpiresAt: null };
  }
  return {
    isVIP: true,
    vipDaysRemaining: Math.max(1, Math.ceil((expiryMs - now) / DAY_MS)),
    vipExpiresAt: profile.vip_expires_at,
  };
}
