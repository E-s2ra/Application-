import { test, expect } from '@playwright/test';

test.describe('Authentication & Protected Routes', () => {
  test('Login: Validates empty input fields', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.waitForTimeout(1500);

    const signInBtn = page.getByRole('button', { name: /sign in/i }).or(page.locator('text=Sign In').last());
    await signInBtn.click();
    await page.waitForTimeout(1000);

    const bodyText = await page.innerText('body');
    expect(bodyText).toMatch(/enter your email|required|please/i);
  });

  test('Login: Displays error for invalid credentials', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.waitForTimeout(1500);

    const inputs = page.locator('input');
    if ((await inputs.count()) >= 2) {
      await inputs.nth(0).fill('non_existent_test_user@example.com');
      await inputs.nth(1).fill('wrongpass123');

      const signInBtn = page.getByRole('button', { name: /sign in/i }).or(page.locator('text=Sign In').last());
      await signInBtn.click();
      await page.waitForTimeout(2000);

      const bodyText = await page.innerText('body');
      expect(bodyText).toMatch(/invalid|error|credentials/i);
    }
  });

  test('Registration: Direct navigation to signup screen loads form', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForTimeout(1500);

    const bodyText = await page.innerText('body');
    expect(bodyText).toMatch(/Sign Up|Create Account|Register/i);
  });

  test('Protected Route Guard: Direct access to /profile redirects unauthenticated user', async ({ page }) => {
    await page.goto('/(tabs)/profile');
    await page.waitForTimeout(2500);

    const url = page.url();
    const bodyText = await page.innerText('body');
    const isProtected = url.includes('login') || bodyText.includes('Sign In') || bodyText.includes('Sign up');
    expect(isProtected).toBeTruthy();
  });
});
