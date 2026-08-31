import { test, expect, Page } from '@playwright/test';

/**
 * Real User Lifecycle E2E Test Suite
 *
 * Tests the full manual VIP grant flow:
 *   1. Register a new user
 *   2. Verify they start with no VIP
 *   3. Admin logs in and grants VIP via the admin panel
 *   4. User logs back in and VIP is visible on their profile
 *
 * Prerequisites:
 *   Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD in your .env.test file.
 *   Run: PLAYWRIGHT_ADMIN_EMAIL=... PLAYWRIGHT_ADMIN_PASSWORD=... npx playwright test
 */

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || '';

/** Fills a form input that matches any of the provided placeholders */
async function fillInput(page: Page, placeholders: string[], value: string, timeout = 8000): Promise<void> {
  const selectors = placeholders.map((p) => `input[placeholder*="${p}"]`).join(', ');
  const input = page.locator(selectors).first();
  await input.waitFor({ state: 'visible', timeout });
  await input.fill(value);
}

/** Clears auth state stored in localStorage and reloads to a given path */
async function clearSessionAndGoto(page: Page, path: string): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(path);
}

test.describe('Real User Lifecycle E2E', () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: `E2E Tester ${timestamp}`,
    email: `e2e_user_${timestamp}@gmail.com`,
    password: 'E2EPass123!',
  };

  test.beforeAll(() => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.warn(
        '[Lifecycle] Skipping: Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD env vars to run this test.'
      );
    }
  });

  test('Full lifecycle: Register → verify no-VIP → admin grants VIP → user sees VIP', async ({ page }) => {
    test.setTimeout(150_000);

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      test.skip(true, 'Admin credentials not set in env vars.');
      return;
    }

    // ──────────────────────────────────────────────────────────────
    // STEP 1: Register a fresh user
    // ──────────────────────────────────────────────────────────────
    console.log(`[Step 1] Registering: ${testUser.email}`);
    await page.goto('/signup');

    await fillInput(page, ['Full Name', 'Name'], testUser.fullName);
    await fillInput(page, ['Email'], testUser.email);

    // Fill password fields (first = password, second = confirm)
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(testUser.password);
    await passwordInputs.nth(1).fill(testUser.password);

    await page.getByRole('button', { name: /create aniflix account/i }).click();

    // Wait for navigation to the home/tabs screen (not a timeout)
    await page.waitForURL(/tabs|home/, { timeout: 15_000 });
    console.log(`[Step 1] ✅ Registration successful, URL: ${page.url()}`);

    // ──────────────────────────────────────────────────────────────
    // STEP 2: Verify user starts without VIP
    // ──────────────────────────────────────────────────────────────
    console.log('[Step 2] Checking initial user state (should have no VIP)');
    await page.goto('/(tabs)/profile');
    await page.waitForLoadState('networkidle');

    const profileBodyBefore = await page.locator('body').innerText();
    expect(profileBodyBefore).toContain('STANDARD STREAMER');
    expect(profileBodyBefore).not.toContain('VIP SOVEREIGN');
    console.log('[Step 2] ✅ No VIP confirmed for new user');

    // ──────────────────────────────────────────────────────────────
    // STEP 3: Switch to admin session
    // ──────────────────────────────────────────────────────────────
    console.log(`[Step 3] Logging in as admin: ${ADMIN_EMAIL}`);
    await clearSessionAndGoto(page, '/(auth)/login');

    await fillInput(page, ['Email'], ADMIN_EMAIL);
    await fillInput(page, ['Password'], ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for the admin panel to load (confirms admin auth worked)
    await page.goto('/admin');
    await page.waitForSelector('text=/Admin Panel|Media Catalog|VIP Approvals/i', { timeout: 15_000 });
    console.log('[Step 3] ✅ Admin panel loaded');

    // ──────────────────────────────────────────────────────────────
    // STEP 4: Grant VIP to the test user
    // ──────────────────────────────────────────────────────────────
    console.log(`[Step 4] Granting 30-day VIP to: ${testUser.email}`);

    // Click into VIP Approvals tab if visible
    const vipTab = page.locator('text=VIP Approvals').first();
    if (await vipTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vipTab.click();
    }

    await fillInput(page, ['user@gmail.com', 'Email', 'email'], testUser.email);

    const grantBtn = page.locator('text=/Approve.*VIP|Grant VIP/i').first();
    await grantBtn.waitFor({ state: 'visible', timeout: 8000 });
    await grantBtn.click();

    // Wait for success feedback (alert text or banner)
    await page.waitForSelector('text=/VIP activated|success/i', { timeout: 15_000 });
    console.log('[Step 4] ✅ VIP grant confirmed');

    // ──────────────────────────────────────────────────────────────
    // STEP 5: Switch back to the test user's session
    // ──────────────────────────────────────────────────────────────
    console.log(`[Step 5] Re-logging in as: ${testUser.email}`);
    await clearSessionAndGoto(page, '/(auth)/login');

    await fillInput(page, ['Email'], testUser.email);
    await fillInput(page, ['Password'], testUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/tabs|home/, { timeout: 15_000 });
    console.log('[Step 5] ✅ User re-authenticated');

    // ──────────────────────────────────────────────────────────────
    // STEP 6: Confirm VIP is visible on the user's profile
    // ──────────────────────────────────────────────────────────────
    console.log('[Step 6] Verifying VIP status on profile');
    await page.goto('/(tabs)/profile');
    await page.waitForLoadState('networkidle');

    const profileBodyAfter = await page.locator('body').innerText();
    const hasVip =
      profileBodyAfter.includes('VIP SOVEREIGN') ||
      profileBodyAfter.includes('VIP · ACTIVE') ||
      profileBodyAfter.includes('VIP Sovereign');
    expect(hasVip).toBeTruthy();
    console.log('[Step 6] ✅ VIP access confirmed on user profile!');

    // ──────────────────────────────────────────────────────────────
    // STEP 7: Persistence check — reload and confirm VIP is still active
    // ──────────────────────────────────────────────────────────────
    console.log('[Step 7] Reloading page to verify VIP persists across refresh');
    await page.reload();
    await page.waitForLoadState('networkidle');

    const profileBodyReloaded = await page.locator('body').innerText();
    const vipPersisted =
      profileBodyReloaded.includes('VIP SOVEREIGN') ||
      profileBodyReloaded.includes('VIP · ACTIVE') ||
      profileBodyReloaded.includes('VIP Sovereign');
    expect(vipPersisted).toBeTruthy();
    console.log('[Step 7] ✅ VIP status persists after page reload');
  });
});
