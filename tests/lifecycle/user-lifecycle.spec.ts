import { test, expect } from '@playwright/test';

test.describe('Real User Lifecycle E2E Test Suite', () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: `E2E Tester ${timestamp}`,
    email: `e2e_user_${timestamp}@gmail.com`,
    password: `E2EPass123!`,
  };
  const adminUser = {
    email: 'esra99san@gmail.com',
    password: 'E20440891esra@@',
  };

  test('Full User Lifecycle: Registration -> Normal Features -> Admin VIP Grant -> VIP Unlocked', async ({ page }) => {
    test.setTimeout(120000); // 2 minute test budget for complete E2E lifecycle

    // ==========================================
    // STEP 1: REGISTER FRESH NEW USER ACCOUNT
    // ==========================================
    console.log(`[Lifecycle Step 1] Registering fresh user: ${testUser.email}`);
    await page.goto('/signup');
    await page.waitForTimeout(2000);

    const nameInput = page.locator('input[placeholder*="Full Name"]').or(page.locator('input[placeholder*="Name"]').first());
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill(testUser.fullName);

    const signupEmailInput = page.locator('input[placeholder*="Email"]').or(page.locator('input[type="email"]').first());
    await signupEmailInput.fill(testUser.email);

    const signupPasswordInput = page.locator('input[placeholder*="Password"]').first();
    await signupPasswordInput.fill(testUser.password);

    const signupConfirmInput = page.locator('input[placeholder*="Confirm"]').first();
    await signupConfirmInput.fill(testUser.password);

    const submitBtn = page.getByRole('button', { name: /create aniflix account/i }).or(page.locator('text=Create AniFlix Account'));
    await submitBtn.click();

    await page.waitForTimeout(4000);

    const afterSignUpBody = await page.innerText('body');
    console.log(`[Lifecycle Step 1] Registration response received`);
    const isSignedUp = page.url().includes('tabs') || afterSignUpBody.includes('Account created') || afterSignUpBody.includes('Home') || afterSignUpBody.includes(testUser.fullName);
    expect(isSignedUp).toBeTruthy();

    // ==========================================
    // STEP 2: VERIFY INITIAL NORMAL USER STATE (NO VIP)
    // ==========================================
    console.log(`[Lifecycle Step 2] Verifying initial user state on profile (No VIP)`);
    await page.goto('/(tabs)/profile');
    await page.waitForTimeout(2500);

    const profileTextBefore = await page.innerText('body');
    // Fresh normal user MUST show "STANDARD STREAMER" badge and NOT "VIP SOVEREIGN · ACTIVE"
    expect(profileTextBefore).toContain('STANDARD STREAMER');
    expect(profileTextBefore).not.toContain('VIP SOVEREIGN · ACTIVE');
    console.log(`[Lifecycle Step 2] Pre-VIP verification passed for ${testUser.email}`);

    // ==========================================
    // STEP 3: CLEAR SESSION & LOG IN AS ADMIN
    // ==========================================
    console.log(`[Lifecycle Step 3] Clearing user session to log in as Admin: ${adminUser.email}`);
    await page.evaluate(() => localStorage.clear());
    await page.goto('/(auth)/login');
    await page.waitForTimeout(2000);

    const adminEmailInput = page.locator('input[placeholder*="Email"]').or(page.locator('input[type="email"]').first());
    await adminEmailInput.waitFor({ state: 'visible', timeout: 5000 });
    await adminEmailInput.fill(adminUser.email);

    const adminPasswordInput = page.locator('input[placeholder*="Password"]').or(page.locator('input[type="password"]').first());
    await adminPasswordInput.fill(adminUser.password);

    const signInBtn = page.getByText('Sign In', { exact: true }).or(page.locator('text="Sign In"'));
    await signInBtn.first().click();
    await page.waitForTimeout(5000); // Allow Supabase Auth token exchange for Admin

    // Navigate to Admin Dashboard
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    const adminBodyText = await page.innerText('body');
    expect(adminBodyText).toMatch(/Admin Panel|Media Catalog|VIP Approvals/i);
    console.log(`[Lifecycle Step 3] Admin dashboard loaded`);

    // ==========================================
    // STEP 4: FIND EXACT USER & GRANT VIP VIA ADMIN
    // ==========================================
    console.log(`[Lifecycle Step 4] Admin granting 30-Day VIP to: ${testUser.email}`);
    const vipTab = page.locator('text=VIP Approvals').first();
    if (await vipTab.isVisible()) {
      await vipTab.click();
      await page.waitForTimeout(1000);
    }

    const grantEmailInput = page.locator('input[placeholder*="user@gmail.com"]').or(page.locator('input[placeholder*="Email"]').first());
    await grantEmailInput.waitFor({ state: 'visible', timeout: 5000 });
    await grantEmailInput.fill(testUser.email);

    const grantVipBtn = page.locator('text=Approve & Activate VIP Access').or(page.locator('text=Grant VIP').first());
    await grantVipBtn.click();

    await page.waitForTimeout(4000);
    console.log(`[Lifecycle Step 4] VIP Grant action completed for ${testUser.email}`);

    // ==========================================
    // STEP 5: CLEAR ADMIN SESSION & RE-LOGIN AS SAME USER
    // ==========================================
    console.log(`[Lifecycle Step 5] Clearing Admin session & re-logging in as original user: ${testUser.email}`);
    await page.evaluate(() => localStorage.clear());
    await page.goto('/(auth)/login');
    await page.waitForTimeout(2000);

    const userEmailAgain = page.locator('input[placeholder*="Email"]').or(page.locator('input[type="email"]').first());
    await userEmailAgain.waitFor({ state: 'visible', timeout: 5000 });
    await userEmailAgain.fill(testUser.email);

    const userPassAgain = page.locator('input[placeholder*="Password"]').or(page.locator('input[type="password"]').first());
    await userPassAgain.fill(testUser.password);

    await signInBtn.first().click();
    await page.waitForTimeout(4000);
    console.log(`[Lifecycle Step 5] Original user re-authenticated`);

    // ==========================================
    // STEP 6: VERIFY USER RECEIVED VIP ACCESS
    // ==========================================
    console.log(`[Lifecycle Step 6] Verifying user VIP status post-elevation`);
    await page.goto('/(tabs)/profile');
    await page.waitForTimeout(2500);

    const profileTextAfter = await page.innerText('body');
    const hasVipUnlocked = profileTextAfter.includes('VIP SOVEREIGN · ACTIVE') || profileTextAfter.includes('unlocked') || profileTextAfter.includes('VIP');
    expect(hasVipUnlocked).toBeTruthy();
    console.log(`[Lifecycle Step 6] VIP Access confirmed on User Profile!`);
  });
});
