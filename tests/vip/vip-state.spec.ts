import { expect, test } from '@playwright/test';
import { getVipStatus } from '../../src/features/vip/vip-state';

test.describe('VIP state calculation', () => {
  const now = Date.parse('2026-09-07T00:00:00.000Z');

  test('recognizes an active timed VIP pass', () => {
    const status = getVipStatus(
      { is_vip: true, vip_expires_at: '2026-09-10T00:00:00.000Z' },
      now,
    );
    expect(status.isVIP).toBe(true);
    expect(status.vipDaysRemaining).toBe(3);
  });

  test('rejects an expired pass', () => {
    expect(getVipStatus({ is_vip: true, vip_expires_at: '2026-09-06T23:59:59.000Z' }, now).isVIP).toBe(false);
  });

  test('does not trust an expiry when the server flag is disabled', () => {
    expect(getVipStatus({ is_vip: false, vip_expires_at: '2026-09-10T00:00:00.000Z' }, now).isVIP).toBe(false);
  });

  test('supports lifetime VIP profiles', () => {
    const status = getVipStatus({ is_vip: true, vip_expires_at: null }, now);
    expect(status).toEqual({ isVIP: true, vipDaysRemaining: 999, vipExpiresAt: null });
  });
});
