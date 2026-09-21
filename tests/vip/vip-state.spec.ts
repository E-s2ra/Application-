import { expect, test } from '@playwright/test';
import { getVipStatus } from '../../src/features/vip/vip-state';

const NOW = Date.UTC(2026, 8, 19, 12, 0, 0);

test('active VIP requires both the flag and a future expiry', () => {
  const status = getVipStatus(
    { is_vip: true, vip_expires_at: new Date(NOW + 3 * 24 * 60 * 60 * 1000).toISOString() },
    NOW,
  );

  expect(status.isVIP).toBe(true);
  expect(status.vipDaysRemaining).toBe(3);
});

test('expired VIP is inactive even when the stored flag is still true', () => {
  const status = getVipStatus(
    { is_vip: true, vip_expires_at: new Date(NOW - 1).toISOString() },
    NOW,
  );

  expect(status).toEqual({ isVIP: false, vipDaysRemaining: 0, vipExpiresAt: null });
});

test('flag-only legacy VIP is not treated as a lifetime subscription', () => {
  const status = getVipStatus({ is_vip: true, vip_expires_at: null }, NOW);

  expect(status).toEqual({ isVIP: false, vipDaysRemaining: 0, vipExpiresAt: null });
});
