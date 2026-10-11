import { chromium } from '@playwright/test'

const site = process.env.DENG_BASE_URL || 'http://127.0.0.1:4188'
const browser = await chromium.launch({ headless: true })
const problems = []

async function check(condition, description) {
  console.log((condition ? 'PASS' : 'FAIL') + ' ' + description)
  if (!condition) problems.push(description)
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', error => problems.push('Runtime: ' + error.message))

  await page.goto(site + '/#/library', { waitUntil: 'networkidle' })
  await check(await page.locator('.deng-lib__tab-panel:not([hidden]) .deng-lib__ledger-item').count() === 3, 'Three initial books in library')
  await page.getByRole('tab', { name: /RECENTLY PLAYED/i }).click()
  await check(await page.locator('.deng-lib__tab-panel:not([hidden]) .deng-lib__ledger-item').count() === 0 && await page.locator('.deng-lib__empty').isVisible(), 'Recently played empty state')
  await page.getByRole('tab', { name: /SAVED BOOKS/i }).click()
  await page.locator('.deng-lib__ledger-save').first().click()
  await check(await page.locator('.deng-lib__tab-panel:not([hidden]) .deng-lib__ledger-item').count() === 2, 'Remove saved book updates ledger')
  await page.reload({ waitUntil: 'networkidle' })
  await check(await page.locator('.deng-lib__tab-panel:not([hidden]) .deng-lib__ledger-item').count() === 2, 'Library changes persist after reload')
  await page.goto(site + '/#/explore', { waitUntil: 'networkidle' })
  await page.locator('.catalog-views button').last().click()
  await check(await page.locator('.archive-index-entry').count() === 12, 'Index shows all twelve books')
  await page.locator('.archive-index-entry').nth(2).locator('.archive-index-actions button').first().click()
  await page.goto(site + '/#/library', { waitUntil: 'networkidle' })
  await check(await page.locator('.deng-lib__tab-panel:not([hidden]) .deng-lib__ledger-item').count() === 3, 'Catalog saves book into new collection')
  await page.goto(site + '/#/explore', { waitUntil: 'networkidle' })
  await page.locator('.catalog-views button').first().click()
  await check(await page.locator('.catalog-grid .book-tile').count() === 12, 'Gallery view shows all twelve books')
  await page.getByRole('searchbox').fill('Kafka')
  await check(await page.locator('.catalog-grid .book-tile').count() === 1, 'Search filters author')
  await page.getByRole('searchbox').fill('')
  await page.goto(site + '/#/settings', { waitUntil: 'networkidle' })
  await page.getByRole('combobox', { name: 'Default playback speed' }).selectOption('1.25')
  await page.reload({ waitUntil: 'networkidle' })
  await check(await page.getByRole('combobox', { name: 'Default playback speed' }).inputValue() === '1.25', 'Playback speed setting persists')

  await page.goto(site + '/#/discover', { waitUntil: 'networkidle' })
  await page.locator('.deng-ed-feature__listen').click()
  await check(await page.locator('.player-dock').count() === 1, 'Chapter preview creates persistent player')
  await page.getByRole('button', { name: 'Expand player' }).click()
  await check(await page.locator('.full-player-overlay').count() === 1, 'Expanded player is available')
  await page.getByRole('button', { name: 'Minimize player' }).click()
  await page.getByRole('button', { name: 'Close player' }).click()
  await check(await page.locator('.player-dock').count() === 0, 'Player closes cleanly')

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  mobile.on('pageerror', error => problems.push('Mobile runtime: ' + error.message))
  await mobile.goto(site + '/#/library', { waitUntil: 'networkidle' })
  await check(await mobile.locator('.deng-lib__ledger-item').count() === 3, 'Mobile library renders')
  await mobile.getByRole('button', { name: 'Open menu' }).click()
  await mobile.waitForTimeout(350)
  await check(await mobile.locator('.sidebar.sidebar-visible').count() === 1, 'Mobile sidebar opens')
  await mobile.getByRole('button', { name: 'Close menu' }).click()
  await mobile.locator('.mobile-bottom-nav button').nth(1).click()
  await check(await mobile.locator('.explore-page').count() === 1, 'Mobile navigation opens catalog')

  console.log('FUNCTIONAL_ISSUES:', JSON.stringify(problems))
  if (problems.length) process.exitCode = 1
} finally {
  await browser.close()
}
