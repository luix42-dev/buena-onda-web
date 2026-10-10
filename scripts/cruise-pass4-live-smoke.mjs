import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const out = 'docs/cruise/pass4'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const result = { date: new Date().toISOString(), browser: browser.version(), physicalDevices: false, audibleOutputVerified: false, errors: [] }
try {
  for (const tv of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    page.on('pageerror', e => result.errors.push({ tv, error: e.message }))
    const response = await page.goto('https://buenaondalifestyle.com/cruise/miami-test' + (tv ? '?tv=1' : ''), { timeout: 120000 })
    await page.waitForFunction(() => document.querySelector('main')?.dataset.ready === 'true', undefined, { timeout: 120000 })
    const state = () => page.evaluate(() => window.__cruise())
    const run = { status: response.status(), initial: await state() }
    result[tv ? 'tv' : 'desktop'] = run
    if (tv) {
      run.gateFocused = await page.locator('.mm-tvgate').evaluate(e => e === document.activeElement)
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => !document.querySelector('.mm-tvgate'), undefined, { timeout: 15000 })
    } else {
      await page.locator('.mm-go').click()
      await page.getByRole('button', { name: 'Radio', exact: true }).click()
      await page.getByRole('button', { name: 'Play radio', exact: true }).click()
      await page.getByRole('button', { name: 'Close radio', exact: true }).click()
    }
    await page.waitForTimeout(12000)
    run.started = await state()
    run.r2Live = run.started.station === 'buena-onda-radio' && run.started.playing && run.started.source === 'live'
    if (!tv) {
      run.cameras = []
      for (let i = 0; i < 6; i++) {
        await page.getByRole('button', { name: 'Change camera', exact: true }).click()
        await page.waitForTimeout(700)
        run.cameras.push(await state())
      }
    }
    await page.screenshot({ path: `${out}/live-${tv ? 'tv' : 'desktop'}.png` })
    await context.close()
  }
  result.passed = result.errors.length === 0 && result.desktop.status === 200 && result.tv.status === 200 &&
    result.desktop.started.distance > 0 && result.tv.started.distance > 0 &&
    result.desktop.r2Live && result.tv.r2Live && result.tv.gateFocused &&
    new Set(result.desktop.cameras.map(s => s.camera)).size === 6 &&
    result.desktop.cameras.every(s => s.playing && s.source === 'live')
  if (!result.passed) process.exitCode = 1
} catch (error) {
  result.failure = error.message
  process.exitCode = 1
} finally {
  await browser.close()
  await writeFile(`${out}/live-smoke.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
