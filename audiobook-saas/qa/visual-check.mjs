import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const address = 'http://127.0.0.1:4188'
const errors = []
const browser = await chromium.launch({ headless: true })
await mkdir(new URL('./screens/', import.meta.url), { recursive: true })

async function visit(page, pathname, name) {
  await page.goto(address + '/#' + pathname, { waitUntil: 'networkidle' })
  await page.screenshot({ path: fileURLToPath(new URL('./screens/' + name + '.png', import.meta.url)), fullPage: true })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)
  const heading = await page.locator('h1').first().textContent().catch(() => '')
  console.log(name + ' | heading=' + heading?.replace(/\s+/g, ' ').slice(0, 100) + ' | overflow=' + overflow)
  if (!heading?.trim()) errors.push(name + ' missing heading')
  if (overflow) errors.push(name + ' horizontal overflow')
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  page.on('pageerror', error => errors.push('desktop: ' + error.message))
  await visit(page, '/', 'landing-desktop')
  await visit(page, '/discover', 'discover-desktop')
  await visit(page, '/explore', 'explore-desktop')
  await visit(page, '/book/great-gatsby', 'detail-desktop')
  await visit(page, '/library', 'library-desktop')
  await visit(page, '/pricing', 'pricing-desktop')
  await visit(page, '/settings', 'settings-desktop')
  await page.goto(address + '/#/explore')
  await page.getByRole('searchbox').fill('Jane Austen')
  if (await page.locator('.book-tile').count() !== 1) errors.push('Search filtering failed')
  await page.getByRole('searchbox').fill('')
  await page.getByRole('button', { name: 'Save to library' }).first().click()
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem('deng-reading-v1') || '{}').saved?.length)
  console.log('Saved library count after interaction:', count)
  await page.reload({ waitUntil: 'networkidle' })
  if (await page.evaluate(() => JSON.parse(localStorage.getItem('deng-reading-v1') || '{}').saved?.length) !== count) errors.push('Saved library persistence failed')
  await page.getByRole('button', { name: 'Preview The Great Gatsby' }).first().click()
  await page.waitForTimeout(2500)
  console.log('Player present:', await page.locator('.player-dock').count())
  await page.getByRole('button', { name: 'Close player' }).first().click()
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  mobile.on('pageerror', error => errors.push('mobile: ' + error.message))
  await visit(mobile, '/', 'landing-mobile')
  await visit(mobile, '/discover', 'discover-mobile')
  await visit(mobile, '/explore', 'explore-mobile')
  await visit(mobile, '/book/pride-prejudice', 'detail-mobile')
  await visit(mobile, '/library', 'library-mobile')
  await visit(mobile, '/pricing', 'pricing-mobile')
  await mobile.getByRole('button', { name: 'Explore', exact: true }).last().click().catch(() => {})
  console.log('Found mobile bottom navigation:', await mobile.locator('.mobile-bottom-nav').count())
  console.log('ERRORS:', JSON.stringify(errors, null, 2))
  if (errors.length) process.exitCode = 1
} finally {
  await browser.close()
}
