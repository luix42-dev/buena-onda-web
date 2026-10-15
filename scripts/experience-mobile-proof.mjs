import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('@playwright/test')) }
catch { ({ chromium } = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))('@playwright/test')) }

const base = process.env.EXPERIENCE_URL || 'http://127.0.0.1:3076/cruise/experience'
const out = process.env.EXPERIENCE_MOBILE_OUT || 'docs/cruise/experience/evidence/mobile'
const selected = process.env.EXPERIENCE_PROFILES?.split(',').map(value => value.trim())
const holdAfterTune = Number(process.env.EXPERIENCE_SAME_STATION_HOLD_MS || 2000)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-webgl', '--autoplay-policy=document-user-activation-required'] })
const result = { at: new Date().toISOString(), browser: browser.version(), url: base,
  environment: 'Windows headless Edge; viewport/touch/reduced-motion emulation only, no physical device or FPS benchmark', profiles: [], delayedMap: null }
let failed = false

async function instrument(context) {
  await context.addInitScript(() => {
    window.__experienceMobileMedia = []
    window.Audio = new Proxy(window.Audio, { construct(target, args) {
      const audio = Reflect.construct(target, args)
      window.__experienceMobileMedia.push(audio)
      return audio
    } })
  })
}
const snapshot = page => page.evaluate(() => ({
  drive: window.__jeepNight?.(), geo: window.__miamiGeo?.(), reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
  overflow: document.documentElement.scrollWidth > innerWidth,
  radio: { text: document.querySelector('.hr-deck')?.textContent, powerLabel: document.querySelector('.hr-deck-power')?.getAttribute('aria-label'), error: document.querySelector('.hr-error')?.textContent },
  media: window.__experienceMobileMedia.map((audio, id) => ({ id, src: audio.currentSrc, time: audio.currentTime, paused: audio.paused, ready: audio.readyState })),
}))
async function control(page, locator, name) {
  assert.equal(await locator.count(), 1, `${name}: one control expected`)
  assert.equal(await locator.isVisible(), true, `${name}: hidden`)
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  assert.ok(box && box.width >= 24 && box.height >= 24, `${name}: target smaller than 24 CSS pixels`)
  assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, `${name}: outside viewport`)
  const hit = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
    return !!top && (element === top || element.contains(top))
  })
  assert.ok(hit, `${name}: center obscured by another surface`)
  return { name, box, centerHit: hit, recommended44px: box.width >= 44 && box.height >= 44 }
}
async function start(page) {
  await page.getByRole('button', { name: 'Start Cruising', exact: true }).waitFor({ timeout: 120000 })
  await page.getByRole('button', { name: 'Start Cruising', exact: true }).tap()
  await page.waitForFunction(() => window.__jeepNight?.().ready && window.__jeepNight?.().distance > 3 && window.__jeepNight?.().playing,
    null, { timeout: 90000 })
}

try {
  for (const profile of [
    { name: 'portrait', width: 390, height: 844, manualCamera: true },
    { name: 'landscape', width: 844, height: 390 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'reduced-motion', width: 390, height: 844, reduced: true },
  ].filter(profile => !selected || selected.includes(profile.name))) {
    const report = { ...profile, checks: {}, controls: [], errors: [], consoleErrors: [], notes: [] }
    result.profiles.push(report)
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 1,
      isMobile: true, hasTouch: true, reducedMotion: profile.reduced ? 'reduce' : 'no-preference' })
    await instrument(context)
    const page = await context.newPage()
    page.on('pageerror', error => report.errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && report.consoleErrors.length < 40) report.consoleErrors.push(message.text().slice(0, 300)) })
    try {
      await page.goto(`${base}?diagnostics=1`, { waitUntil: 'domcontentloaded', timeout: 180000 })
      await page.getByRole('button', { name: 'Start Cruising', exact: true }).waitFor({ timeout: 120000 })
      report.entry = await snapshot(page)
      report.checks.noAutoplay = report.entry.media.every(audio => audio.paused)
      assert.ok(report.checks.noAutoplay, 'Audio started without entry gesture')
      report.controls.push(await control(page, page.getByRole('button', { name: 'Start Cruising', exact: true }), 'start'))
      await page.screenshot({ path: `${out}/${profile.name}-entry.png` })
      await start(page)
      report.started = await snapshot(page)
      report.checks.readyMovingPlaying = !!report.started.drive?.ready && report.started.drive.distance > 3 && report.started.drive.playing
      for (const [name, locator] of [
        ['power', page.getByRole('button', { name: 'Pause listening', exact: true })],
        ['volume', page.getByLabel('Radio volume', { exact: true })],
        ['mute', page.locator('.hr-deck').getByRole('button', { name: 'Mute', exact: true })],
        ['tune', page.getByRole('button', { name: 'Tune & discover', exact: true })],
        ['camera', page.getByRole('button', { name: 'Camera', exact: true })],
        ['options', page.getByRole('button', { name: 'Cruise options', exact: true })],
      ]) report.controls.push(await control(page, locator, name))
      report.checks.controlsReachable = true
      assert.equal(report.started.overflow, false, 'Horizontal viewport overflow')
      report.checks.noOverflow = true
      await page.screenshot({ path: `${out}/${profile.name}-drive.png` })

      if (profile.manualCamera && process.env.EXPERIENCE_SKIP_CAMERA_HOLD !== '1') {
        await page.getByRole('button', { name: 'Camera', exact: true }).tap()
        await page.locator('#opening-camera').getByRole('button', { name: 'Coastal view', exact: true }).tap()
        await page.locator('#opening-camera').getByRole('button', { name: 'Done', exact: true }).tap()
        await page.waitForFunction(() => window.__miamiGeo?.().elapsed >= 15, null, { timeout: 60000 })
        report.cameraAfter15 = await snapshot(page)
        report.checks.manualCameraOverridesIntro = report.cameraAfter15.drive?.camera === 'chase'
        assert.ok(report.checks.manualCameraOverridesIntro, 'Automatic intro overrode a manual camera choice')
      }
      if (profile.reduced) {
        await page.waitForFunction(() => window.__miamiGeo?.().elapsed >= 15, null, { timeout: 60000 })
        report.after15 = await snapshot(page)
        report.checks.reducedMotionRespected = report.after15.reduced && report.after15.drive?.camera === 'chase'
        assert.ok(report.checks.reducedMotionRespected, 'Reduced motion received automatic cockpit camera change')
      }

      await page.getByRole('button', { name: 'Cruise options', exact: true }).tap()
      await page.locator('#opening-options').getByRole('combobox').first().waitFor({ state: 'visible', timeout: 10000 })
      await page.screenshot({ path: `${out}/${profile.name}-options.png` })
      await page.locator('#opening-options').getByRole('button', { name: 'Done', exact: true }).tap()
      report.checks.settingsAccessible = true
      await page.getByRole('button', { name: 'Tune & discover', exact: true }).tap()
      const search = page.locator('#human-radio-panel').getByRole('searchbox')
      if (await search.count()) {
        await search.first().fill('Jolt')
        await page.getByRole('button', { name: 'Tune Jolt Radio', exact: true }).waitFor({ state: 'visible', timeout: 10000 })
        report.checks.stationSearch = true
        await search.first().fill('')
      } else report.notes.push('Optional station search not present in this build; not counted as tested.')
      await page.getByRole('button', { name: 'Tune Jolt Radio', exact: true }).scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: 'Tune Jolt Radio', exact: true }).tap()
      assert.equal((await snapshot(page)).drive?.station, 'jolt-radio', 'Tuning action did not select Jolt')
      report.checks.stationSelection = true
      await page.screenshot({ path: `${out}/${profile.name}-directory.png` })
      await page.getByRole('button', { name: 'Close discovery panel', exact: true }).tap()
      const before = await snapshot(page)
      await page.waitForTimeout(holdAfterTune)
      report.final = await snapshot(page)
      report.checks.audioAdvances = report.final.media.some(audio => !audio.paused && audio.time > (before.media.find(prior => prior.id === audio.id)?.time || 0) + .2)
      assert.ok(report.checks.audioAdvances, 'Real station playback did not advance')
      assert.equal(report.errors.length, 0, 'Page exception recorded')
      report.checks.noPageErrors = true
      await page.screenshot({ path: `${out}/${profile.name}-final.png` })
    } catch (error) {
      failed = true; report.failure = error.stack || String(error)
      report.failureState = await snapshot(page).catch(() => null)
      await page.screenshot({ path: `${out}/${profile.name}-failure.png` }).catch(() => {})
    } finally { await context.close() }
    console.log(JSON.stringify({ profile: profile.name, checks: report.checks, failure: report.failure }))
  }

  if (!selected || selected.includes('delayed-map')) {
  const slow = { checks: {}, errors: [] }
  result.delayedMap = slow
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, hasTouch: true })
  await instrument(context)
  const page = await context.newPage()
  page.on('pageerror', error => slow.errors.push(error.message))
  let release, intercepted = false
  const held = new Promise(resolve => { release = resolve })
  // Delay only the existing map request; all audio and vehicle responses remain real.
  await page.route('**/real-miami/miami/world.json', async route => { intercepted = true; await held; await route.continue().catch(() => {}) })
  try {
    await page.goto(`${base}?diagnostics=1`, { waitUntil: 'domcontentloaded', timeout: 180000 })
    await page.getByRole('button', { name: 'Start Cruising', exact: true }).waitFor({ timeout: 120000 })
    await page.getByRole('button', { name: 'Start Cruising', exact: true }).tap()
    await page.waitForFunction(() => window.__jeepNight?.().ready && window.__experienceMobileMedia.some(audio => !audio.paused && audio.currentTime > .5), null, { timeout: 60000 })
    slow.held = await snapshot(page)
    slow.checks.mapIntercepted = intercepted
    slow.checks.audioPlaysBeforeMap = slow.held.media.some(audio => !audio.paused && audio.time > .5)
    slow.checks.drivePausedUntilMap = !!slow.held.drive?.ready && slow.held.drive.paused && slow.held.drive.distance < .01 && !slow.held.geo
    assert.ok(slow.checks.mapIntercepted && slow.checks.audioPlaysBeforeMap && slow.checks.drivePausedUntilMap, 'Delayed map did not preserve independent radio and paused driving')
    await page.screenshot({ path: `${out}/delayed-map-held.png` })
    release()
    await page.waitForFunction(() => window.__miamiGeo && window.__jeepNight?.().distance > 3 && window.__jeepNight?.().playing, null, { timeout: 90000 })
    slow.released = await snapshot(page)
    slow.checks.resumesAfterMap = !!slow.released.geo && slow.released.drive.distance > 3 && !slow.released.drive.paused
    slow.checks.sameAudioAfterMap = slow.released.media.some(audio => !audio.paused && audio.src && audio.src === slow.held.media.find(prior => prior.id === audio.id)?.src && audio.time > slow.held.media.find(prior => prior.id === audio.id).time)
    assert.ok(slow.checks.resumesAfterMap && slow.checks.sameAudioAfterMap, 'Map arrival interrupted audio or did not resume cruising')
    assert.equal(slow.errors.length, 0, 'Delayed-map page exception')
    await page.screenshot({ path: `${out}/delayed-map-released.png` })
  } catch (error) {
    failed = true; slow.failure = error.stack || String(error); slow.failureState = await snapshot(page).catch(() => null)
    await page.screenshot({ path: `${out}/delayed-map-failure.png` }).catch(() => {})
  } finally { release(); await context.close() }
  console.log(JSON.stringify({ delayedMap: slow.checks, failure: slow.failure }))
  }
} catch (error) {
  failed = true
  result.failure = error.stack || String(error)
} finally {
  result.passed = !failed
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2))
  await browser.close()
}
if (failed) process.exitCode = 1
