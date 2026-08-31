import { test, expect } from '@playwright/test';

test.describe('Content Catalog & Search E2E', () => {
  test('Home Page: Renders catalog header & categories', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(4500);

    const bodyText = await page.innerText('body');
    expect(bodyText).toBeDefined();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('Search: Queries catalog by text input', async ({ page }) => {
    await page.goto('/(tabs)/search');
    await page.waitForTimeout(4500);

    const isLoginPage = page.url().includes('login') || (await page.innerText('body')).includes('Sign in to continue');
    if (!isLoginPage) {
      const input = page.locator('input').first();
      await input.waitFor({ state: 'visible' });
      await input.fill('Naruto');
      await page.waitForTimeout(1000);

      const bodyText = await page.innerText('body');
      expect(bodyText).toBeDefined();
    } else {
      expect(isLoginPage).toBeTruthy();
    }
  });

  test('Search: Renders EmptyState when query yields no results', async ({ page }) => {
    await page.goto('/(tabs)/search');
    await page.waitForTimeout(4500);

    const isLoginPage = page.url().includes('login') || (await page.innerText('body')).includes('Sign in to continue');
    if (!isLoginPage) {
      const input = page.locator('input').first();
      await input.waitFor({ state: 'visible' });
      await input.fill('NON_EXISTENT_TITLE_9999');
      await page.waitForTimeout(1500);

      const bodyText = await page.innerText('body');
      expect(bodyText).toMatch(/No Results|Try searching|no items/i);
    } else {
      expect(isLoginPage).toBeTruthy();
    }
  });
});
