import { chromium } from '@playwright/test'

const site = process.env.DENG_BASE_URL || 'http://127.0.0.1:4188'
const browser = await chromium.launch({ headless: true })
const issues = []
const paths = ['/', '/discover', '/explore', '/library', '/book/great-gatsby', '/pricing', '/settings']

try {
  for (const width of [1440, 1024, 768, 390, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 850 }, deviceScaleFactor: 1 })
    page.on('pageerror', error => issues.push(width + 'px runtime error: ' + error.message))

    for (const path of paths) {
      await page.goto(site + '/#' + path, { waitUntil: 'networkidle' })
      const headline = await page.locator('h1').first().textContent().catch(() => null)
      if (!headline?.trim()) issues.push(width + 'px ' + path + ' missing heading / app did not render')
      const audit = await page.evaluate(() => {
        const container = document.documentElement
        const viewport = window.innerWidth
        const overflows = [...document.querySelectorAll('body *')]
          .filter(element => {
            if (element.closest('.dl-typeband')) return false // designed horizontal marquee
            const style = window.getComputedStyle(element)
            if (style.position === 'fixed' || style.position === 'absolute') return false
            const rect = element.getBoundingClientRect()
            return rect.right > viewport + 6 && rect.width > 0 && style.visibility !== 'hidden'
          })
          .slice(0, 5)
          .map(element => ({ element: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className.slice(0, 80) : '' }))
        return { overflow: container.scrollWidth > viewport + 2, overflows }
      })
      console.log(width + 'px ' + path + ': overflow=' + audit.overflow + (audit.overflows.length ? ' suspects=' + JSON.stringify(audit.overflows) : ''))
      if (audit.overflow) issues.push(width + 'px ' + path + ' horizontal overflow')
    }

    if (width <= 768) {
      await page.goto(site + '/#/discover', { waitUntil: 'networkidle' })
      const openMenu = page.getByRole('button', { name: 'Open menu' })
      if (await openMenu.count() === 0) {
        issues.push(width + 'px mobile menu trigger missing')
        await page.close()
        continue
      }
      await openMenu.click({ timeout: 6000 })
      const sidebar = page.locator('.sidebar')
      await page.waitForTimeout(350) // CSS slide-in must settle before hit-testing.
      const obscured = await sidebar.evaluate(el => {
        const rect = el.getBoundingClientRect()
        const x = Math.max(40, rect.left + 42)
        const y = Math.max(140, rect.top + 140)
        const hit = document.elementFromPoint(x, y)
        return !!hit && !el.contains(hit)
      })
      console.log(width + 'px mobile menu obstructed=' + obscured)
      if (obscured) issues.push(width + 'px mobile menu obscured')
      await page.getByRole('button', { name: 'Close menu' }).click({ timeout: 6000 })
    }
    await page.goto(site + '/#/explore', { waitUntil: 'networkidle' })
    const viewButton = page.locator('.catalog-views button').last()
    if (await viewButton.count() === 0) {
      const snapshot = await page.locator('body').innerText()
      issues.push(width + 'px missing catalog view controls. Body: ' + snapshot.slice(0, 150))
      await page.close()
      continue
    }
    await viewButton.click({ timeout: 6000 })
    const rowCount = await page.locator('.archive-index-entry').count()
    if (rowCount !== 12) issues.push(width + 'px archive index count ' + rowCount)
    console.log(width + 'px archive-index rows=' + rowCount)
    await page.close()
  }
  console.log('AUDIT_ISSUES:', JSON.stringify(issues))
  if (issues.length) process.exitCode = 1
} finally {
  await browser.close()
}
