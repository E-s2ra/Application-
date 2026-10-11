import { chromium } from '@playwright/test'

const base = process.env.DENG_BASE_URL || 'http://127.0.0.1:4188'
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
})
const failures = []
async function assert(ok, label) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label)
  if (!ok) failures.push(label)
}
try {
  for (const width of [1440, 390, 360]) {
    const context = await browser.newContext({ viewport: { width, height: width > 600 ? 920 : 800 } })
    const page = await context.newPage()
    page.on('pageerror', e => failures.push(width + 'px runtime: ' + e.message))
    await page.goto(base + '/#/library', { waitUntil: 'networkidle' })
    await assert(await page.locator('.deng-lib__room-canvas canvas').count() === 1, width + 'px WebGL room visible')
    await assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)), width + 'px no horizontal overflow')
    const getLayout = () => page.evaluate(() => {
      const r = document.querySelector('.deng-lib__room-canvas')?.getBoundingClientRect()
      return { scroll: window.scrollY, x: r?.x ?? 0, y: r?.y ?? 0, w: r?.width ?? 0, h: r?.height ?? 0 }
    })
    const firstBook = page.locator('.deng-lib__panel:not([hidden]) .deng-lib__row-book').first()
    await firstBook.scrollIntoViewIfNeeded()
    const before = await getLayout()
    await firstBook.click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible' })
    await assert(await dialog.locator('h2, h3').first().isVisible(), width + 'px selected book title visible')
    await assert(await dialog.getByRole('button', { name: /play preview/i }).count() === 1, width + 'px playable title has working preview control')
    const cover = dialog.locator('.deng-lib__book-dialog-cover')
    await assert(await cover.isVisible(), width + 'px expanded book artwork visible')
    // A busy software WebGL renderer can block JS for the entire 780ms morph.
    // Test the compositor timeline itself in addition to sampled geometry.
    const hasRealMorph = await cover.evaluate(element => element.getAnimations().some(animation => {
      const frames = animation.effect?.getKeyframes() || []
      const first = frames[0]?.transform
      const last = frames[frames.length - 1]?.transform
      return typeof first === 'string' && typeof last === 'string' && first !== last
    }))
    await page.waitForTimeout(105)
    const early = await cover.boundingBox()
    await page.waitForTimeout(740)
    const rect = await cover.boundingBox()
    await assert(hasRealMorph && Boolean(early && rect && early.width <= rect.width + 1),
      width + 'px opening uses distinct source and destination animation frames')
    await assert(Boolean(rect && rect.width > 120 && rect.height > 190), width + 'px book grows to reading size')
    await assert(Boolean(rect && rect.x >= -1 && rect.x + rect.width <= width + 1), width + 'px cover fits viewport')
    await assert(Boolean(rect && Math.abs(rect.x + rect.width / 2 - width / 2) <= width * .12), width + 'px book is centered horizontally')
    const backdrop = await page.locator('.deng-lib__book-dialog-backdrop').first().evaluate(el => {
      const css = getComputedStyle(el)
      return css.backdropFilter || css.webkitBackdropFilter || ''
    }).catch(() => '')
    await assert(backdrop.includes('blur('), width + 'px backdrop blur is enabled')
    await page.mouse.move(width - 20, 440)
    await page.mouse.wheel(0, 560)
    await page.waitForTimeout(100)
    await assert(Math.abs((await getLayout()).scroll - before.scroll) <= 1, width + 'px scroll does not leak behind open modal')
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden', timeout: 6500 })
    await assert(await page.getByRole('dialog').count() === 0, width + 'px Escape closes book')
    const after = await getLayout()
    await assert(Math.abs(after.scroll - before.scroll) <= 1 &&
      Math.abs(after.x - before.x) <= 1 && Math.abs(after.y - before.y) <= 1 &&
      Math.abs(after.w - before.w) <= 1 && Math.abs(after.h - before.h) <= 1,
      width + 'px page scroll and WebGL geometry restore exactly')
    // Repeated interactions reveal stale focus/scroll locks and dropped animations.
    for (let pass = 0; pass < 2; pass++) {
      await firstBook.click()
      await dialog.waitFor({ state: 'visible' })
      await page.getByRole('button', { name: 'Close book' }).click()
      await dialog.waitFor({ state: 'hidden', timeout: 6500 })
      const repeated = await getLayout()
      await assert(Math.abs(repeated.scroll - before.scroll) <= 1 &&
        Math.abs(repeated.w - before.w) <= 1 &&
        Math.abs(repeated.x - before.x) <= 1,
        width + 'px layout remains stable after close cycle ' + (pass + 2))
    }
    await page.locator('.deng-lib__panel:not([hidden]) .deng-lib__row-book').nth(1).click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await assert(await page.getByRole('dialog').getByRole('button', { name: /play preview/i }).count() === 0, width + 'px no play button for book without audio')
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 6500 })
    await context.close()
  }

  // Verify a pointer selection on the genuine 3D covers, independently of
  // the accessible list used above. These coordinates hit the middle shelf
  // in the intentionally front-facing 1280px composition.
  const scene = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await scene.goto(base + '/#/library', { waitUntil: 'networkidle' })
  const canvas = scene.locator('.deng-lib__room-canvas canvas')
  const rect = await canvas.boundingBox()
  if (rect) {
    await scene.mouse.move(rect.x + 470, rect.y + 315)
    await scene.waitForTimeout(250)
    await canvas.click({ position: { x: 470, y: 315 } })
    await scene.getByRole('dialog').waitFor({ state: 'visible' })
    await assert(await scene.getByRole('dialog').getByRole('heading', { name: 'Pride and Prejudice' }).count() === 1, '3D book click selects correct actual cover')
    await scene.getByRole('dialog').getByRole('button', { name: /play preview/i }).click()
    await scene.getByRole('dialog').waitFor({ state: 'hidden', timeout: 6500 })
    await assert(await scene.locator('.player-dock').count() === 1, '3D book Play button starts the real audio player')
  } else {
    await assert(false, '3D room available for direct book selection')
  }
  await scene.close()
  console.log('MOTION_ISSUES:', JSON.stringify(failures))
  if (failures.length) process.exitCode = 1
} finally {
  await browser.close()
}
