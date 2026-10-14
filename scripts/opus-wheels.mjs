// Rolling-wheel evidence: per car, the wheel rig found at load (radius, centre, parts) and the wheel
// angle actually advancing while driving in Director sideTrack / frontLow shots.
// Usage: node scripts/opus-wheels.mjs --url http://127.0.0.1:3067 --label wheels
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback }
const base = arg('url', 'http://127.0.0.1:3067'), label = arg('label', 'wheels'), out = `docs/cruise/opus/${label}`
await mkdir(out, { recursive: true })
const result = { label, url: base, date: new Date().toISOString(), method: 'Headless Edge, D3D11, 1280x720, Director forced shots while driving.', cars: [] }
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const snap = page => page.evaluate(() => window.__jeepNight?.() || {})
const until = async (page, fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await page.waitForTimeout(250) } return false }
try {
  for (const car of arg('cars', 'countach,eighties,cadillac').split(',')) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } }), page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`${base}/cruise?diagnostics=1&directorSeed=7`, { timeout: 240000 })
    await until(page, async () => (await snap(page)).ready, 120000)
    const name = { countach: 'Countach', eighties: 'Fiero', cadillac: 'Eldorado' }[car]
    await page.getByRole('button', { name: new RegExp(`^Choose .*${name}`, 'i') }).first().click().catch(e => errors.push('pick: ' + e.message))
    await page.waitForTimeout(1500)
    await until(page, async () => (await snap(page)).ready, 60000)
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${out}/${car}-garage.png` })
    await page.getByRole('button', { name: 'Start the drive', exact: true }).click()
    await until(page, async () => (await snap(page)).playing, 20000)
    await until(page, async () => !!(await page.evaluate(() => window.__wheels?.())), 20000)
    const entry = { car, rig: await page.evaluate(() => window.__wheels?.() || null), shots: [], errors }
    if ((await snap(page)).camera !== 'director') await page.getByRole('button', { name: 'Director camera' }).click()
    for (const shot of ['sideTrack', 'frontLow']) {
      await page.evaluate(s => window.__directorForce?.(s), shot)
      await page.waitForTimeout(2500)
      const a = await page.evaluate(() => ({ wheels: window.__wheels?.(), speed: window.__jeepNight?.().speed, metres: window.__miamiGeo?.().routeMeters }))
      await page.screenshot({ path: `${out}/${car}-${shot}.png` })
      await page.waitForTimeout(500)
      const b = await page.evaluate(() => ({ wheels: window.__wheels?.(), metres: window.__miamiGeo?.().routeMeters }))
      entry.shots.push({ shot, file: `${out}/${car}-${shot}.png`, speed: a.speed, metres: [a.metres, b.metres], angles: [a.wheels?.map(w => w.angle), b.wheels?.map(w => w.angle)], director: (await page.evaluate(() => window.__director?.()))?.shot ?? null })
    }
    result.cars.push(entry)
    console.log(JSON.stringify({ car, wheels: entry.rig?.length ?? 0, radius: entry.rig?.map(w => w.radius), tris: entry.rig?.map(w => w.triangles), angles: entry.shots.map(s => s.angles), errors: errors.length }))
    await context.close()
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 1))
  await browser.close()
}
