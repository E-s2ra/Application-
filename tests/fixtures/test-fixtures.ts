import { test as base, Page } from '@playwright/test';

export interface TestFixtures {
  guestPage: Page;
  adminCredentials: { email: string };
}

export const test = base.extend<TestFixtures>({
  guestPage: async ({ page }, use) => {
    await page.goto('/');
    await page.waitForTimeout(4500); // Bypass splash screen
    await use(page);
  },
  adminCredentials: async ({}, use) => {
    await use({ email: 'esra99san@gmail.com' });
  },
});

export { expect } from '@playwright/test';
