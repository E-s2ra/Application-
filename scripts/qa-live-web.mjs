import { chromium } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:8083';
const routes = [
  { label: '/', path: '/' },
  { label: '/search', path: '/search' },
  { label: '/favorites', path: '/favorites' },
  { label: '/profile', path: '/profile' },
  { label: '/watch:first-catalog-title', path: '/', openFirstTitle: true },
  { label: '/admin', path: '/admin' },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'failed'}`);
    });

    let navigationError = null;
    try {
      await page.goto(`${baseURL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(4_000);
      if (route.openFirstTitle) {
        const firstTitle = page.locator('[aria-label^="Open details for "]').first();
        if (await firstTitle.count()) {
          await firstTitle.click();
          await page.waitForTimeout(4_000);
        }
      }
    } catch (error) {
      navigationError = error instanceof Error ? error.message : String(error);
    }

    const readSnapshot = () => page.evaluate(() => {
      const body = document.body;
      const root = document.documentElement;
      const buttons = [...document.querySelectorAll('button,[role="button"],[role="tab"],[role="radio"]')]
        .slice(0, 30)
        .map((el) => ({
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
          aria: el.getAttribute('aria-label'),
          role: el.getAttribute('role') || el.tagName.toLowerCase(),
        }));
      const images = [...document.images].map((img) => ({
        src: img.currentSrc || img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));
      return {
        url: location.href,
        title: document.title,
        bodyText: (body?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 1400),
        bodyWidth: body?.scrollWidth ?? 0,
        clientWidth: root.clientWidth,
        bodyHeight: body?.scrollHeight ?? 0,
        buttons,
        brokenImages: images.filter((img) => img.src && (img.naturalWidth === 0 || img.naturalHeight === 0)).slice(0, 15),
      };
    });
    let snapshot;
    try {
      snapshot = await readSnapshot();
    } catch {
      await page.waitForTimeout(1_000);
      snapshot = await readSnapshot();
    }

    results.push({
      viewport: viewport.name,
      route: route.label,
      navigationError,
      ...snapshot,
      horizontalOverflow: snapshot.bodyWidth > snapshot.clientWidth + 2,
      consoleErrors: consoleErrors.slice(0, 12),
      pageErrors: pageErrors.slice(0, 12),
      failedRequests: failedRequests.slice(0, 12),
    });
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
