// VESPER evidence: wait for each holographic appearance in Neon Run and capture it from the chase
// camera and from the static Director flyby, recording the caption the page actually shows.
// Usage: node scripts/opus-neon-host.mjs --url http://127.0.0.1:3067 --label neon-host [--count 3]
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback }
const base = arg('url', 'http://127.0.0.1:3067'), label = arg('label', 'neon-host'), count = Number(arg('count', '3')), out = `docs/cruise/opus/${label}`
await mkdir(out, { recursive: true })
const result = { label, url: base, date: new Date().toISOString(), method: 'Headless Edge, D3D11, 1280x720, ?world=neon&hostFirst=3. Speech synthesis is not audible in headless runs; only the caption is recorded.', appearances: [] }
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const snap = page => page.evaluate(() => window.__jeepNight?.() || {})
const until = async (page, fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await page.waitForTimeout(150) } return false }
try {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${base}/cruise?world=neon&hostFirst=3&diagnostics=1&directorSeed=7`, { timeout: 240000 })
  await until(page, async () => (await snap(page)).ready, 120000)
  await page.getByRole('button', { name: 'Start the drive', exact: true }).click()
  await until(page, async () => (await snap(page)).playing, 20000)
  if ((await snap(page)).camera !== 'chase') await page.getByRole('button', { name: 'Switch cockpit and chase camera' }).click()
  for (let n = 0; n < count; n++) {
    const appeared = await until(page, async () => (await page.locator('.jn-host').count()) > 0, 90000)
    if (!appeared) { result.appearances.push({ n, appeared: false }); break }
    const caption = await page.locator('.jn-host p').innerText()
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${out}/${n}-chase.png` })
    // Same appearance from the static flyby camera planted ahead on the barrier.
    await page.getByRole('button', { name: 'Director camera' }).click()
    await page.evaluate(() => window.__directorForce?.('flyby'))
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${out}/${n}-flyby.png` })
    await page.evaluate(() => window.__directorForce?.(null))
    await page.getByRole('button', { name: 'Director camera' }).click()
    if ((await snap(page)).camera !== 'chase') await page.getByRole('button', { name: 'Switch cockpit and chase camera' }).click()
    const gone = await until(page, async () => (await page.locator('.jn-host').count()) === 0, 20000)
    result.appearances.push({ n, appeared: true, caption, gone, files: [`${out}/${n}-chase.png`, `${out}/${n}-flyby.png`] })
    console.log(JSON.stringify({ n, caption, gone }))
  }
  result.errors = errors
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 1))
  await browser.close()
}
