import { test, expect } from '@playwright/test';

test.describe('Admin Management Panel & RBAC', () => {
  test('Admin Auth Guard: Non-admin access to /admin is restricted', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2500);

    const url = page.url();
    const bodyText = await page.innerText('body');
    const isRestricted = !url.endsWith('/admin') || bodyText.includes('Sign In') || bodyText.includes('Forbidden') || bodyText.includes('Access Denied');
    expect(isRestricted).toBeTruthy();
  });

  test('Admin Add Media Form: Direct access to /admin/add-anime requires admin authorization', async ({ page }) => {
    await page.goto('/admin/add-anime');
    await page.waitForTimeout(2500);

    const url = page.url();
    const bodyText = await page.innerText('body');
    const isRestricted = !url.endsWith('/add-anime') || bodyText.includes('Sign In') || bodyText.includes('Forbidden') || bodyText.includes('Access Denied');
    expect(isRestricted).toBeTruthy();
  });
});
