import path from 'node:path'
import { mkdir, stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { root, option, profiles, preflight, saveJson, launchBrowser, newSafePage, snapshot } from './world-first-baseline.mjs'

const storageKey = 'buena-onda-world-test-songs-v1'
const out = path.join(root, 'docs/cruise/world-first/restoration-qa', new Date().toISOString().replace(/[:.]/g, '-'))
await mkdir(out, { recursive: true })
const preservation = await preflight()
await saveJson(path.join(out, 'preflight.json'), preservation)
if (!process.argv.includes('--run')) {
  console.log(JSON.stringify({ out, browserLaunched: false, preservationPass: preservation.preservation.every(row => row.pass) }))
} else {
  const url = option('url', 'http://127.0.0.1:3060/cruise/world-test')
  if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Restoration proof is local only')
  const editors = execFileSync('powershell.exe', ['-NoProfile', '-Command', '@(Get-Process UnrealEditor -ErrorAction SilentlyContinue).Count'], { encoding: 'utf8', windowsHide: true }).trim()
  if (editors !== '0') throw new Error('Unreal is active. Browser restoration checks remain held.')
  if (await stat(path.join(root, 'docs/cruise/world-first/qa/browser-hold')).then(() => true).catch(() => false)) throw new Error('Lead browser hold remains active')
  const browser = await launchBrowser(), results = []
  const fixtureMode = process.argv.includes('--fixture')
  // An optional clearly identified silent local catalog fixture tests persistence, never song recognition.
  const fixtureLabel = 'LOCAL QA FIXTURE — saved-label persistence only'
  const fixtureUrl = new URL('/__world-qa__/silent-catalog.wav', url).href
  const fixtureWave = () => {
    const rate = 8000, samples = rate * 120, wave = Buffer.alloc(44 + samples * 2)
    wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVE', 8); wave.write('fmt ', 12); wave.writeUInt32LE(16, 16)
    wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22); wave.writeUInt32LE(rate, 24); wave.writeUInt32LE(rate * 2, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34)
    wave.write('data', 36); wave.writeUInt32LE(samples * 2, 40); return wave
  }
  const snap = async page => ({ ...await snapshot(page), restoration: await page.evaluate(key => {
    const el = document.querySelector('[data-interactive-world]')
    return { interactive: el ? { ready: el.getAttribute('data-interactive-ready'), camera: el.getAttribute('data-interactive-camera'), shot: el.getAttribute('data-interactive-shot'), paused: el.getAttribute('data-interactive-paused') } : null,
      songStorage: localStorage.getItem(key), libraryText: document.querySelector('[aria-label="Song library"]')?.textContent?.trim() ?? null,
      telemetry: window.__worldRestoration?.() ?? window.__worldFirst?.() ?? null, source: document.querySelector('[data-world-source]')?.getAttribute('data-world-source'),
      failedWorld: [...document.querySelectorAll('[role="alert"]')].map(el => el.textContent?.trim()).filter(text => /could not|couldn.t|failed/i.test(text || '')) }
  }, storageKey) })
  const activeRadio = state => state.media.find(media => media.kind === 'AUDIO' && !media.paused && media.time > 0)
  const enterDrive = async page => {
    await page.getByRole('button', { name: /LET.*CRUISE/i }).first().click({ timeout: 45000 })
    await page.waitForSelector('[data-garage="false"]', { timeout: 30000 })
    await page.waitForSelector('[data-ready="true"]', { timeout: 30000 })
  }
  const unchangedRadio = (before, after) => {
    const a = activeRadio(before), b = after.media.find(media => media.id === a?.id)
    const events = after.events.filter(event => event.at > before.at && event.id === a?.id && ['loadstart', 'seeking', 'call:load', 'call:pause'].includes(event.type))
    return { idBefore: a?.id ?? null, idAfter: b?.id ?? null, timeBefore: a?.time ?? null, timeAfter: b?.time ?? null, disruptiveEvents: events,
      pass: !!a && !!b && a.source === b.source && b.time > a.time && !events.length }
  }
  try {
    for (const profile of profiles.filter(profile => option('profiles', 'desktop,portrait,landscape').split(',').includes(profile.name))) {
      if (await stat(path.join(root, 'docs/cruise/world-first/qa/browser-hold')).then(() => true).catch(() => false)) break
      const folder = path.join(out, profile.name); await mkdir(folder, { recursive: true })
      console.log(`Restoration ${profile.name}: loading local garage`)
      const run = await newSafePage(browser, profile, folder), result = { profile, emulated: profile.name !== 'desktop', fixtureMode, recording: 'Silent page pixels only; no radio/system/microphone capture.', phases: {}, checks: {} }
      if (fixtureMode) {
        await run.context.route('**/api/radio/tracks', route => route.request().method() === 'GET' ? route.fulfill({ json: [{ src: fixtureUrl, title: fixtureLabel, artist: '' }] }) : route.abort('blockedbyclient'))
        await run.context.route(fixtureUrl, route => route.request().method() === 'GET' ? route.fulfill({ contentType: 'audio/wav', body: fixtureWave() }) : route.abort('blockedbyclient'))
      }
      const selectedPhases = option('phases', 'all').split(',')
      const phase = async (name, test) => {
        if (!selectedPhases.includes('all') && !selectedPhases.includes(name)) return
        if (process.argv.includes('--desktop-native-only') && profile.name === 'desktop' && name !== 'native-director-cut') return
        console.log(`Restoration ${profile.name}: ${name}`)
        try { result.phases[name] = await test() } catch (error) { result.phases[name] = { failure: error.name }; await run.page.screenshot({ path: path.join(folder, `${name}-failure.png`) }).catch(() => {}) }
      }
      const button = name => run.page.getByRole('button', { name, exact: true }).first()
      const openRadio = async () => { if (!(await run.page.getByRole('region', { name: 'Dashboard radio controls', exact: true }).count())) await button(option('radio-label', 'Open radio')).click() }
      const closeRadio = async () => { const back = run.page.getByRole('button', { name: /Back to drive/ }).first(); if (await back.count()) await back.click() }
      try {
        await run.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); await enterDrive(run.page, 'local')
        await run.page.waitForTimeout(1200); result.initial = await snap(run.page); await run.page.screenshot({ path: path.join(folder, 'initial-cockpit.png') })
        await phase('persistent-controls', async () => {
          const names = ['Cockpit view', 'Open radio', 'City director cut', 'Live director camera', 'Billboard view'], present = {}
          for (const name of names) present[name] = await button(name).isVisible().catch(() => false)
          return { present, pass: Object.values(present).every(Boolean) }
        })
        await phase('song-save', async () => {
          await openRadio(); const preset = run.page.getByRole('button', { name: /^Preset 1:/ }).first(); if (await preset.count()) await preset.click()
          const save = button('Save song'); await save.waitFor({ state: 'visible' }); await run.page.waitForFunction(() => { const el = [...document.querySelectorAll('button')].find(el => el.textContent?.trim() === 'Save song'); return el && !el.disabled }, undefined, { timeout: 20000 })
          const before = await snap(run.page); await save.click(); await run.page.waitForTimeout(400); const after = await snap(run.page)
          await run.page.getByRole('button', { name: /^Saved songs \(/ }).first().click(); await run.page.screenshot({ path: path.join(folder, 'radio-saved-song.png') })
          const library = JSON.parse(after.restoration.songStorage || 'null'), songs = library?.songs ?? []
          const allowed = ['label', 'stationId', 'stationName', 'metadataSource', 'savedAt']
          return { before, after, songs, metadataOnly: songs.length > 0 && songs.every(song => Object.keys(song).every(key => allowed.includes(key)) && song.stationId === 'buena-onda-radio' && song.metadataSource === '/api/radio/tracks'), radio: unchangedRadio(before, after), fixtureClearlyLabeled: !fixtureMode || songs[0]?.label === fixtureLabel }
        })
        await phase('song-reload-remove', async () => {
          await run.page.reload({ waitUntil: 'domcontentloaded' }); await enterDrive(run.page, 'local'); await openRadio()
          await run.page.getByRole('button', { name: /^Saved songs \(/ }).first().click(); const persisted = await run.page.locator('#world-saved-songs li').count()
          const before = await snap(run.page); await run.page.getByRole('button', { name: /^Remove .* from saved songs$/ }).first().click(); await run.page.waitForTimeout(300); const removed = await snap(run.page)
          await run.page.screenshot({ path: path.join(folder, 'saved-library-removed.png') }); await run.page.reload({ waitUntil: 'domcontentloaded' }); await enterDrive(run.page, 'local'); await openRadio()
          const final = await snap(run.page); return { persisted, removedStorage: removed.restoration.songStorage, finalStorage: final.restoration.songStorage, removalPersists: persisted > 0 && JSON.parse(final.restoration.songStorage || 'null')?.songs?.length === 0, radio: unchangedRadio(before, removed) }
        })
        await phase('unknown-live-track', async () => {
          const second = run.page.getByRole('button', { name: /^Preset 2:/ }).first(); await second.click(); await run.page.waitForTimeout(1200)
          const state = await snap(run.page), disabled = await button('Save song').isDisabled(); await run.page.screenshot({ path: path.join(folder, 'unknown-live-track.png') })
          return { state, disabled, unavailableLabel: state.restoration.libraryText?.includes('Track information unavailable'), noLiveTrackSaved: JSON.parse(state.restoration.songStorage || '{"songs":[]}').songs.length === 0 }
        })
        // External stream availability is a separate check. Camera independence requires a stable playing owner.
        console.log(`Restoration ${profile.name}: stabilize owned catalog radio`)
        await openRadio()
        await run.page.getByRole('button', { name: /^Preset 1:/ }).first().click()
        await run.page.waitForFunction(() => window.__worldQA.media.some(item => item.el.tagName === 'AUDIO' && !item.el.paused && item.el.currentTime > .25), undefined, { timeout: 20000 })
        result.cameraRadioBaseline = await snap(run.page)
        await closeRadio()
        for (const [name, imageName] of [['Cockpit view', 'cockpit'], ['Live director camera', 'live-director'], ['Billboard view', 'billboards']]) await phase(imageName, async () => {
          const before = await snap(run.page); await button(name).click(); await run.page.waitForTimeout(1400); const after = await snap(run.page); await run.page.screenshot({ path: path.join(folder, `${imageName}.png`) })
          const shots = []
          if (name === 'Live director camera') for (let index = 0; index < Number(option('director-seconds', 20)); index++) { await run.page.waitForTimeout(1000); const s = await snap(run.page); shots.push({ at: s.at, shot: s.restoration.interactive?.shot ?? s.restoration.telemetry?.shot, telemetry: s.restoration.telemetry }); if (index === 9) await run.page.screenshot({ path: path.join(folder, 'live-director-later.png') }) }
          const final = await snap(run.page); return { before, after: final, radio: unchangedRadio(before, final), shots, shotVariety: new Set(shots.map(s => s.shot).filter(Boolean)).size }
        })
        await phase('native-director-cut', async () => {
          const before = await snap(run.page); await button('City director cut').click(); await run.page.waitForTimeout(300)
          const replay = button('Replay proof'); if (await replay.isVisible().catch(() => false)) await replay.click()
          await run.page.waitForFunction(() => window.__worldPlayback?.status === 'playing', undefined, { timeout: 18000 })
          await run.page.waitForTimeout(600); await run.page.screenshot({ path: path.join(folder, 'native-director-early.png') }); const first = await snap(run.page)
          await run.page.waitForFunction(() => window.__worldPlayback?.timelineSeconds >= 2.35 && window.__worldPlayback?.timelineSeconds < 3.7, undefined, { timeout: 5000 })
          await run.page.screenshot({ path: path.join(folder, 'native-billboard-shot-2.png') }); const billboard2 = await snap(run.page)
          await run.page.waitForFunction(() => window.__worldPlayback?.timelineSeconds >= 4.6 && window.__worldPlayback?.timelineSeconds < 5.8, undefined, { timeout: 5000 })
          await run.page.screenshot({ path: path.join(folder, 'native-director-later.png') }); const later = await snap(run.page)
          await run.page.waitForFunction(() => window.__worldPlayback?.timelineSeconds >= 6.35 && window.__worldPlayback?.timelineSeconds < 7.7, undefined, { timeout: 5000 })
          await run.page.screenshot({ path: path.join(folder, 'native-billboard-shot-4.png') }); const billboard4 = await snap(run.page)
          await run.page.waitForFunction(() => window.__worldPlayback?.status === 'ended', undefined, { timeout: 18000 }); const after = await snap(run.page)
          return { before, first, billboard2, later, billboard4, after, radio: unchangedRadio(before, after), eightSecondTimeline: Math.abs((after.world?.timelineSeconds ?? 0) - 8) < .05, muted1080p: after.media.some(media => media.kind === 'VIDEO' && media.width === 1920 && media.height === 1080 && media.muted), transitions: after.world?.transitions ?? null }
        })
        result.final = await snap(run.page)
        result.checks = { preservation: preservation.preservation.every(row => row.pass), persistentControls: result.phases['persistent-controls']?.pass ?? null,
          metadataOnlySave: result.phases['song-save']?.metadataOnly ?? null, saveKeepsRadio: result.phases['song-save']?.radio?.pass ?? null,
          savedSongReloadRemove: result.phases['song-reload-remove']?.removalPersists ?? null, unknownLiveSavingDisabled: result.phases['unknown-live-track']?.disabled ?? null,
          cockpitKeepsRadio: result.phases.cockpit?.radio?.pass ?? null, liveDirectorKeepsRadio: result.phases['live-director']?.radio?.pass ?? null,
          billboardViewKeepsRadio: result.phases.billboards?.radio?.pass ?? null, liveDirectorChangesShots: result.phases['live-director'] ? result.phases['live-director'].shotVariety >= 2 : null,
          nativeDirectorKeepsRadio: result.phases['native-director-cut']?.radio?.pass ?? false, nativeEightSeconds: result.phases['native-director-cut']?.eightSecondTimeline ?? false,
          noSourceSwitchFailure: !result.final.restoration.failedWorld.length, noHorizontalOverflow: result.final.noHorizontalOverflow, noPageErrors: !run.errors.length }
      } catch (error) { result.failure = error.name; result.final = await snap(run.page).catch(() => null); await run.page.screenshot({ path: path.join(folder, 'failure.png') }).catch(() => {}) }
      finally { result.errors = run.errors; result.blocked = run.blocked; result.responses = run.responses; await run.context.close(); await saveJson(path.join(folder, 'result.json'), result); results.push(result) }
    }
  } finally { await browser.close(); await saveJson(path.join(out, 'results.json'), results) }
  console.log(JSON.stringify({ out, fixtureMode, profiles: results.map(result => ({ profile: result.profile.name, checks: result.checks, failure: result.failure })) }))
}
