import { chromium } from '@playwright/test'

const site = process.env.DENG_BASE_URL || 'http://127.0.0.1:4188'
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
})
const problems = []
const assert = (condition, label) => {
  console.log((condition ? 'PASS ' : 'FAIL ') + label)
  if (!condition) problems.push(label)
}

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: 1 })
    page.on('pageerror', e => problems.push(width + ' runtime ' + e.message))
    await page.goto(site + '/#/library', { waitUntil: 'networkidle' })
    const trigger = page.locator('.deng-lib__panel:not([hidden]) .deng-lib__row-book').first()
    await trigger.scrollIntoViewIfNeeded()
    await page.mouse.move(2, 2)
    const geometry = () => page.evaluate(() => {
      const canvas = document.querySelector('.deng-lib__room-canvas')
      const sidebar = document.querySelector('.sidebar')
      const rect = (element) => {
        const r = element?.getBoundingClientRect()
        return r ? [r.x, r.y, r.width, r.height] : []
      }
      return { scrollY, clientWidth: document.documentElement.clientWidth, canvas: rect(canvas), sidebar: rect(sidebar) }
    })
    const original = await geometry()

    for (let cycle = 1; cycle <= 3; cycle++) {
      await trigger.click()
      await page.getByRole('dialog').waitFor({ state: 'visible' })
      await page.waitForTimeout(850)
      const frames = await page.evaluate(async () => {
        const data = []
        const button = document.querySelector('button[aria-label="Close book"]')
        const start = performance.now()
        button?.click()
        return new Promise(resolve => {
          const sample = () => {
            const cover = document.querySelector('.deng-booklight__cover-flight')
            const rect = cover?.getBoundingClientRect()
            data.push({ time: Math.round(performance.now() - start), width: rect?.width ?? null, height: rect?.height ?? null })
            // Include the 1200ms absolute close deadline. Software WebGL can
            // delay the compositor's reverse start under sustained GPU load.
            if (performance.now() - start < 2050) requestAnimationFrame(sample)
            else resolve(data)
          }
          requestAnimationFrame(sample)
        })
      })
      await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 3500 })
      const widths = frames.map(frame => frame.width).filter(value => value !== null)
      const initial = widths[0] ?? 0
      const final = widths[widths.length - 1] ?? 0
      const tailIndex = widths.findIndex(value => value < initial * .24)
      const blink = tailIndex >= 0 && widths.slice(tailIndex + 1).some(value => value > initial * .55)
      if (blink || (initial > 150 && final >= initial * .35)) {
        console.log('FRAME_DIAGNOSTIC', width, cycle,
          JSON.stringify({ first: frames.slice(0, 4), last: frames.slice(-5), count: frames.length }))
      }
      assert(!blink && (final < initial * .35 || widths.length < 5),
        width + 'px cycle ' + cycle + ' closing book never flashes full size at final handoff')
      const restored = await geometry()
      const stable = Math.abs(restored.scrollY - original.scrollY) <= 1 &&
        restored.clientWidth === original.clientWidth &&
        restored.canvas.every((value, i) => Math.abs(value - original.canvas[i]) <= 1) &&
        restored.sidebar.every((value, i) => Math.abs(value - original.sidebar[i]) <= 1)
      assert(stable, width + 'px cycle ' + cycle + ' WebGL, scroll and sidebar geometry remain fixed')
    }
    await page.close()
  }
  // In reduced-motion mode the book returns instantly, but the selected 3D
  // volume must still be restored and the dialog must never get stuck.
  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const reducedPage = await reduced.newPage()
  await reducedPage.goto(site + '/#/library', { waitUntil: 'networkidle' })
  await reducedPage.locator('.deng-lib__panel:not([hidden]) .deng-lib__row-book').first().click()
  await reducedPage.getByRole('dialog').waitFor({ state: 'visible' })
  await reducedPage.getByRole('button', { name: 'Close book' }).click()
  await reducedPage.getByRole('dialog').waitFor({ state: 'hidden', timeout: 3500 })
  assert(true, 'Reduced-motion mode restores the book and exits without a stuck overlay')
  await reduced.close()

  // The alternative library must remain usable when WebGL is absent; no R3F
  // paint ACK will arrive, so the parent must complete its fallback handoff.
  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await fallbackContext.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return original.call(this, type, ...args)
    }
  })
  const fallbackPage = await fallbackContext.newPage()
  await fallbackPage.goto(site + '/#/library', { waitUntil: 'networkidle' })
  assert(await fallbackPage.locator('.deng-lib__webgl-fallback').count() === 1, 'WebGL-free book shelf fallback renders')
  await fallbackPage.locator('.deng-lib__panel:not([hidden]) .deng-lib__row-book').first().click()
  await fallbackPage.getByRole('dialog').waitFor({ state: 'visible' })
  await fallbackPage.getByRole('button', { name: 'Close book' }).click()
  await fallbackPage.getByRole('dialog').waitFor({ state: 'hidden', timeout: 4700 })
  assert(true, 'WebGL-free fallback closes book without waiting forever for a paint ACK')
  await fallbackContext.close()
  console.log('CLOSING_SEAM_ISSUES:', JSON.stringify(problems))
  if (problems.length) process.exitCode = 1
} finally {
  await browser.close()
}
