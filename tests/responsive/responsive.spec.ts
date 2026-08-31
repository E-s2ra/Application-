import { test, expect } from '@playwright/test';

test.describe('Multi-Viewport Responsive Integrity', () => {
  const viewports = [
    { width: 375, height: 667, name: '375x667 (Small Mobile)' },
    { width: 390, height: 844, name: '390x844 (Standard Mobile)' },
    { width: 768, height: 1024, name: '768x1024 (Tablet)' },
    { width: 1440, height: 900, name: '1440x900 (Desktop)' },
  ];

  for (const vp of viewports) {
    test(`Responsive Viewport: ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForTimeout(4500);

      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Check horizontal overflow safety
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 2);
    });
  }
});
