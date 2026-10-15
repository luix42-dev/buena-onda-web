import { createRequire } from 'node:module'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('@playwright/test')) } catch { ({ chromium } = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))('@playwright/test')) }
const base = process.env.HUMAN_RADIO_URL || 'http://127.0.0.1:3074'
const out = 'docs/cruise/human-radio/evidence'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--autoplay-policy=document-user-activation-required'] })
const results = { at: new Date().toISOString(), browser: browser.version(), environment: 'Headless desktop Edge; touch and reduced-motion emulation, no physical mobile validation', fixtures: ['Jolt network request deliberately aborted', 'Metadata endpoint deliberately returns HTTP 503', 'Storage.prototype getItem/setItem deliberately throw'], checks: {}, errors: [], networkTelemetry: [] }
const open = async (options = {}, init) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...options })
  await context.addInitScript(() => {
    window.__resilienceAudio = []
    window.Audio = new Proxy(window.Audio, { construct(target, args) { const audio = Reflect.construct(target, args); window.__resilienceAudio.push(audio); return audio } })
  })
  if (init) await context.addInitScript(init)
  const page = await context.newPage()
  page.on('pageerror', error => results.errors.push(error.message))
  page.on('request', request => { if (page.url().includes('/cruise/human-radio') && /clarity\.ms|connect\.facebook\.net|facebook\.com\/tr|google-analytics|googletagmanager|vitals\.vercel|va\.vercel|vercel-insights/i.test(request.url())) results.networkTelemetry.push(request.url()) })
  return { context, page }
}
const navigate = async page => { await page.goto(`${base}/cruise/human-radio?listen=1`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.getByRole('button', { name: 'Tune & discover', exact: true }).waitFor({ timeout: 90000 }) }
const playback = page => page.evaluate(() => window.__resilienceAudio.map(a => ({ src: a.currentSrc, time: a.currentTime, paused: a.paused, readyState: a.readyState })))
const advances = (before, after) => after.some(a => !a.paused && a.time > (before.find(b => b.src === a.src)?.time ?? a.time))
async function scenario(name, work) {
  try { await work(); results.checks[name] = true }
  catch (error) { results.checks[name] = false; results.errors.push(`${name}: ${error.stack || error}`); process.exitCode = 1 }
}
try {
  await scenario('streamOutageRecoveryAndUnavailableMetadata', async () => {
    const { context, page } = await open()
    try {
      await page.route('**/streamer.radio.co/sd8ab6b5aa/**', route => route.abort('failed'))
      await page.route('**/api/cruise/human-radio/now-playing?station=*', route => route.fulfill({ status: 503, json: { fixture: 'Deliberate metadata outage; no live title claim' } }))
      await navigate(page)
      await page.getByRole('button', { name: 'Start listening', exact: true }).click()
      await page.getByRole('button', { name: 'Tune & discover', exact: true }).click()
      await page.getByRole('button', { name: 'Retry station', exact: true }).waitFor({ timeout: 30000 })
      results.outage = { retryVisible: true, audio: await playback(page) }
      await page.screenshot({ path: `${out}/resilience-outage-FIXTURE.png` })
      await page.getByRole('button', { name: 'Tune NTS 1', exact: true }).click()
      await page.waitForFunction(() => window.__resilienceAudio.some(a => !a.paused && a.currentTime > 1 && !a.currentSrc.startsWith('data:')), null, { timeout: 45000 })
      const before = await playback(page); await page.waitForTimeout(2500); const after = await playback(page)
      results.outage.recovery = { before, after, actualAudioAdvances: advances(before, after), unavailableVisible: await page.getByText('Track information unavailable', { exact: true }).isVisible(), saveDisabled: await page.getByRole('button', { name: 'Save song', exact: true }).isDisabled() }
      if (!results.outage.recovery.actualAudioAdvances || !results.outage.recovery.unavailableVisible || !results.outage.recovery.saveDisabled) throw new Error('Live recovery or metadata fallback failed')
      await page.screenshot({ path: `${out}/resilience-recovered-live-nts.png` })
    } finally { await context.close() }
  })
  await scenario('storageFailureRetainsSessionFavoriteAndExports', async () => {
    const { context, page } = await open({}, () => {
      Storage.prototype.getItem = function () { throw new DOMException('QA fixture: storage denied', 'SecurityError') }
      Storage.prototype.setItem = function () { throw new DOMException('QA fixture: storage denied', 'QuotaExceededError') }
    })
    try {
      await navigate(page)
      await page.getByRole('button', { name: 'Tune & discover', exact: true }).click()
      await page.getByRole('button', { name: 'Favorite NTS 1', exact: true }).click()
      await page.getByRole('button', { name: 'My presets (1)', exact: true }).click()
      results.storage = { favoriteRemainsInSession: await page.locator('.hr-directory ol li strong').allTextContents(), warning: await page.locator('.hr-error').allTextContents() }
      await page.getByRole('button', { name: 'My Finds (0)', exact: true }).click()
      const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export My Finds', exact: true }).click()
      const download = await pending; await download.saveAs(`${out}/resilience-storage-empty-export.json`)
      results.storage.export = JSON.parse(await readFile(`${out}/resilience-storage-empty-export.json`, 'utf8'))
      if (!results.storage.favoriteRemainsInSession.includes('NTS 1') || results.storage.export.version !== 1) throw new Error('Storage failure session state or export failed')
      await page.screenshot({ path: `${out}/resilience-storage-FIXTURE.png` })
    } finally { await context.close() }
  })
  await scenario('touchReducedMotionAndKeyboard', async () => {
    const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
    try {
      await navigate(page)
      results.touch = { hasTouch: await page.evaluate(() => navigator.maxTouchPoints > 0), reducedMotion: await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), profiles: [] }
      for (const [name, width, height] of [['portrait', 390, 844], ['landscape', 844, 390]]) {
        await page.setViewportSize({ width, height })
        await page.getByRole('button', { name: 'Tune & discover', exact: true }).tap()
        await page.getByRole('button', { name: 'Favorite NTS 1', exact: true }).tap()
        const station = page.locator('.hr-directory ul li').filter({ hasText: 'WFMU' }).first()
        await station.scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${out}/resilience-${name}-scrolled-stations.png` })
        const credits = page.locator('.hr-credits summary'); await credits.scrollIntoViewIfNeeded(); if (await page.locator('.hr-credits').getAttribute('open') === null) await credits.tap()
        await page.locator('.hr-credits').scrollIntoViewIfNeeded()
        await page.screenshot({ path: `${out}/resilience-${name}-credits.png` })
        const profile = { name, width, height, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), volumeVisible: await page.getByLabel('Radio volume').isVisible(), creditsOpen: await page.locator('.hr-credits').getAttribute('open') !== null }
        results.touch.profiles.push(profile)
        if (profile.overflow || !profile.volumeVisible || !profile.creditsOpen) throw new Error(`${name} touch viewport failed`)
        await page.getByRole('button', { name: 'Close discovery panel', exact: true }).tap()
      }
      const trigger = page.getByRole('button', { name: 'Tune & discover', exact: true }); await trigger.focus(); await page.keyboard.press('Enter')
      results.touch.keyboardInitialFocus = await page.getByRole('button', { name: 'Close discovery panel' }).evaluate(element => document.activeElement === element)
      await page.keyboard.press('Escape')
      results.touch.keyboardFocusRestored = await trigger.evaluate(element => document.activeElement === element)
      if (!results.touch.keyboardInitialFocus || !results.touch.keyboardFocusRestored) throw new Error('Keyboard focus management failed')
    } finally { await context.close() }
  })
  await scenario('originalCruisePreserved', async () => {
    const { context, page } = await open()
    try {
      await page.goto(`${base}/cruise`, { waitUntil: 'domcontentloaded', timeout: 120000 })
      await page.waitForFunction(() => typeof window.__jeepNight === 'function', null, { timeout: 90000 })
      results.originalCruise = { humanDeckCount: await page.locator('.hr-deck').count(), state: await page.evaluate(() => window.__jeepNight()) }
      if (results.originalCruise.humanDeckCount !== 0 || results.originalCruise.state.timeMode !== 'night') throw new Error('Original route deck or default night changed')
      await page.screenshot({ path: `${out}/resilience-original-cruise.png` })
    } finally { await context.close() }
  })
  results.checks.noListedTelemetryRequests = results.networkTelemetry.length === 0
  if (!results.checks.noListedTelemetryRequests) process.exitCode = 1
} finally {
  await browser.close()
  await writeFile(`${out}/resilience-results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
