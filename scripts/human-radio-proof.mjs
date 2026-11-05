import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('@playwright/test')) } catch { ({ chromium } = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))('@playwright/test')) }
const base = process.env.HUMAN_RADIO_URL || 'http://127.0.0.1:3074'
const out = 'docs/cruise/human-radio/evidence'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-webgl', '--autoplay-policy=document-user-activation-required'] })
const results = { at: new Date().toISOString(), browser: browser.version(), environment: 'Windows desktop, headless Edge; mobile/tablet emulation only', checks: {}, errors: [], profiles: [] }
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true })
await context.addInitScript(() => {
  window.__humanAudio = []
  window.Audio = new Proxy(window.Audio, { construct(target, args) { const audio = Reflect.construct(target, args); window.__humanAudio.push(audio); return audio } })
})
const page = await context.newPage()
page.on('pageerror', error => results.errors.push(error.message))
const shot = name => page.screenshot({ path: `${out}/${name}.png` })
const state = () => page.evaluate(() => ({ audio: window.__humanAudio.map((a, id) => ({ id, src: a.currentSrc, time: a.currentTime, paused: a.paused, muted: a.muted, volume: a.volume, ready: a.readyState })), drive: window.__jeepNight?.(), width: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
try {
  await page.goto(`${base}/cruise/human-radio?listen=1`, { waitUntil: 'domcontentloaded', timeout: 240000 })
  await page.getByRole('button', { name: 'Start listening', exact: true }).waitFor({ timeout: 180000 })
  results.checks.noAutoplay = (await state()).audio.every(a => a.paused)
  await page.getByRole('button', { name: 'Start listening', exact: true }).click()
  await page.waitForFunction(() => window.__humanAudio.some(a => !a.paused && a.currentTime > 1), null, { timeout: 30000 })
  const liveA = await state(); await page.waitForTimeout(3500); const liveB = await state()
  results.realPlayback = { before: liveA, after: liveB }
  results.checks.liveJoltAdvances = liveB.audio.some(a => a.src.includes('streamer.radio.co') && a.time > (liveA.audio.find(b => b.id === a.id)?.time || 0))
  await shot('desktop-radio-first-live')
  await page.getByRole('button', { name: 'Tune & discover', exact: true }).click()
  results.checks.panelFocus = await page.getByRole('button', { name: 'Close discovery panel' }).evaluate(el => document.activeElement === el)
  await page.getByRole('button', { name: 'Favorite Jolt Radio', exact: true }).click()
  await page.getByRole('button', { name: 'Favorite NTS 1', exact: true }).click()
  await page.getByRole('button', { name: 'My presets (2)', exact: true }).click()
  await page.getByRole('button', { name: 'Move NTS 1 up', exact: true }).click()
  results.checks.manualOrder = await page.locator('.hr-directory ol li strong').allTextContents()
  await page.getByRole('button', { name: 'Close discovery panel' }).click()
  await page.getByRole('button', { name: 'Return to scenery', exact: true }).click()
  await page.waitForTimeout(5000)
  results.sceneryRestore = await state()
  results.checks.sameAudioAfterSceneToggle = results.sceneryRestore.audio.length === liveB.audio.length && results.sceneryRestore.audio.some(a=>!a.paused&&a.time>(liveB.audio.find(b=>b.id===a.id)?.time||0))
  await page.waitForFunction(() => window.__jeepNight?.().ready, null, { timeout: 120000 })
  await shot('desktop-garage')
  await page.getByRole('button', { name: 'Start the drive', exact: true }).click()
  await page.waitForTimeout(15000)
  await shot('desktop-cockpit')
  results.performance = await page.evaluate(async () => {
    const frames = []; let last = performance.now(); const start = last
    await new Promise(resolve => { function frame(now) { frames.push(now - last); last = now; if (now - start < 15000) requestAnimationFrame(frame); else resolve() } requestAnimationFrame(frame) })
    const seconds = (last - start) / 1000
    return { sampleSeconds: seconds, averageRafFps: frames.length / seconds, longestFrameMs: Math.max(...frames), drive: window.__jeepNight?.(), gl: (() => { const gl = document.querySelector('canvas')?.getContext('webgl2'); if (!gl) return null; const info = gl.getExtension('WEBGL_debug_renderer_info'); return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) })(), heap: performance.memory?.usedJSHeapSize }
  })
  await page.getByRole('button', { name: 'Listen without 3D', exact: true }).first().click()
  const beforeMode = await state(); await page.waitForTimeout(2000); const afterMode = await state()
  results.checks.canvasRemoved = await page.locator('.jn-world').count() === 0
  results.checks.audioContinuesWithout3D = afterMode.audio.some(a => !a.paused && a.time > (beforeMode.audio.find(b => b.id === a.id)?.time || 0))
  // Explicit test fixture: this tests save/export behavior, never live song identification.
  await page.route('**/api/cruise/human-radio/now-playing?station=*', async route => {
    const id = new URL(route.request().url()).searchParams.get('station'), now = Date.now()
    await route.fulfill({ json: { stationId: id, kind: 'track', title: 'QA fixture — not a live identification', artist: 'Test artist', show: 'Fixture program', dj: null, available: true, confidence: 'provider', source: 'https://dublab.airtime.pro/api/live-info', provenance: { type: 'official-metadata', url: 'https://dublab.airtime.pro/api/live-info', verifiedAt: new Date(now).toISOString() }, observedAt: new Date(now).toISOString(), expiresAt: new Date(now + 20000).toISOString(), message: 'QA fixture' } })
  })
  await page.getByRole('button', { name: 'Tune & discover', exact: true }).click()
  await page.getByRole('button', { name: 'Stations', exact: true }).click()
  await page.getByRole('button', { name: 'Tune dublab', exact: true }).click()
  await page.getByRole('button', { name: 'Save song', exact: true }).waitFor()
  await page.waitForFunction(() => !document.querySelector('.hr-program button')?.disabled, null, { timeout: 30000 })
  await page.getByRole('button', { name: 'Save song', exact: true }).click()
  await page.getByRole('button', { name: 'My Finds (1)', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export My Finds', exact: true }).click()
  const download = await downloadPromise; await download.saveAs(`${out}/fixture-export.json`)
  results.checks.fixtureSaveAndExport = await page.locator('.hr-finds li').count() === 1
  await shot('my-finds-FIXTURE')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Tune & discover', exact: true }).click()
  await page.getByRole('button', { name: 'My Finds (1)', exact: true }).click()
  results.checks.persistence = await page.locator('.hr-finds li').count() === 1
  await page.getByRole('button', { name: 'Stations', exact: true }).click()
  await page.getByLabel('Station category').selectOption('Miami')
  results.checks.categoryFilter = await page.locator('.hr-directory ul li strong').allTextContents()
  await page.getByRole('button', { name: 'Close discovery panel' }).click()
  for (const [name, width, height] of [['portrait',390,844],['landscape',844,390],['tablet',1024,768]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(400)
    await shot(`${name}-radio`)
    await page.getByRole('button', { name: 'Tune & discover', exact: true }).click()
    await shot(`${name}-directory`)
    results.profiles.push({ name, width, height, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), volumeVisible: await page.getByLabel('Radio volume').isVisible(), credits: await page.locator('.hr-credits').count() === 1 })
    await page.getByRole('button', { name: 'Close discovery panel' }).click()
  }
  await page.route('**/api/cruise/human-radio/now-playing?station=*', route => route.fulfill({ status: 503, json: { error: 'Deliberate metadata outage fixture' } }))
  await page.getByRole('button', { name: 'Tune & discover', exact: true }).click()
  await page.getByRole('button', { name: 'Stations', exact: true }).click()
  await page.getByLabel('Station category').selectOption('All stations')
  await page.getByRole('button', { name: 'Tune NTS 1', exact: true }).click()
  await page.waitForTimeout(2000)
  results.checks.metadataOutageShowsUnavailable = await page.getByText('Track information unavailable', { exact: true }).isVisible()
  results.checks.metadataOutageDisablesSave = await page.getByRole('button', { name: 'Save song', exact: true }).isDisabled()
  results.final = await state()
} catch (error) {
  results.failure = error.stack || String(error)
  await shot('failure').catch(() => {})
  process.exitCode = 1
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  await browser.close()
  console.log(JSON.stringify(results, null, 2))
}
