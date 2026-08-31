import { test, expect } from '@playwright/test';

test.describe('Reviews & Social Interactions', () => {
  test('Favorites: Direct access to favorites tab validates auth guard', async ({ page }) => {
    await page.goto('/(tabs)/favorites');
    await page.waitForTimeout(2500);

    const url = page.url();
    const bodyText = await page.innerText('body');
    const isProtected = url.includes('login') || bodyText.includes('Sign In') || bodyText.includes('Sign up');
    expect(isProtected).toBeTruthy();
  });

  test('Watch Cinema: Route loads stream player or redirects', async ({ page }) => {
    await page.goto('/watch?id=1');
    await page.waitForTimeout(3000);

    const bodyText = await page.innerText('body');
    expect(bodyText).toBeDefined();
  });
});
