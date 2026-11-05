import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { makeOutput, preflight, saveJson, option, profiles, launchBrowser, newSafePage, enterDrive, snapshot } from './world-first-baseline.mjs'

const out = await makeOutput('local'), check = await preflight()
await saveJson(path.join(out, 'preflight.json'), check)
if (!process.argv.includes('--run')) {
  console.log(JSON.stringify({ out, browserLaunched: false, preservationPass: check.preservation.every(x => x.pass) }))
} else {
  const url = option('url', 'http://127.0.0.1:3060/cruise/world-test')
  if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Local proof requires a localhost URL')
  const browser = await launchBrowser(), results = [], seconds = Number(option('seconds', 10))
  try {
    for (const profile of profiles.filter(p => option('profiles', 'desktop,portrait,landscape').split(',').includes(p.name))) {
      const folder = path.join(out, profile.name); await mkdir(folder, { recursive: true })
      const run = await newSafePage(browser, profile, folder), began = Date.now()
      const result = { profile, emulation: profile.name !== 'desktop', recording: 'Silent Playwright page video; radio not recorded', checks: {} }
      console.log(`Testing local world ${profile.name}`)
      try {
        await run.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); await run.page.waitForTimeout(2000)
        await run.page.screenshot({ path: path.join(folder, 'garage.png') }); result.garage = await snapshot(run.page)
        await enterDrive(run.page, 'local'); result.readyMs = Date.now() - began
        result.source = option('source', 'unreal')
        await run.page.getByLabel('Visual approach', { exact: true }).selectOption(result.source)
        await run.page.waitForFunction(() => window.__worldPlayback?.status === 'playing', undefined, { timeout: 18000 })
        await run.page.screenshot({ path: path.join(folder, 'drive.png') })
        const phase = async (name, test) => { try { await test() } catch (e) { (result.phaseFailures ??= []).push({ phase: name, error: e.name }); await run.page.screenshot({ path: path.join(folder, `${name}-failure.png`) }).catch(() => {}) } }
        const replay = async () => {
          const marker = await run.page.evaluate(() => performance.now())
          await run.page.getByRole('button', { name: 'Replay proof', exact: true }).click()
          await run.page.waitForFunction(at => window.__worldQA.events.some(e => e.at >= at && e.type === 'call:load') && window.__worldPlayback?.status === 'playing' && window.__worldPlayback?.timelineSeconds < 1.5, marker)
          await run.page.waitForTimeout(250)
        }
        await phase('station-switch', async () => {
          await replay()
          await run.page.getByRole('button', { name: 'Radio stations', exact: true }).click()
          const nextStation = run.page.locator('#cruise-radio-panel .cruise-station-list button[aria-pressed="false"]:not([disabled])').first()
          result.stationAvailable = await nextStation.count() > 0
          const before = await snapshot(run.page)
          if (result.stationAvailable) await nextStation.click()
          await run.page.waitForTimeout(1200); const after = await snapshot(run.page)
          const activeBefore = before.media.find(m => m.kind === 'VIDEO' && m.visible), activeAfter = after.media.find(m => m.id === activeBefore?.id)
          const disruptive = after.events.filter(e => e.at > before.at && e.id === activeBefore?.id && ['loadstart', 'seeking', 'call:load', 'call:pause'].includes(e.type))
          const transitionDuringSwitch = after.world?.transitions > before.world?.transitions
          result.radioSwitch = { before, after, disruptive, transitionDuringSwitch, stationChanged: before.worldFirst?.radio.station !== after.worldFirst?.radio.station,
            pass: transitionDuringSwitch ? null : result.stationAvailable && !!activeBefore && !!activeAfter && after.world?.timelineSeconds > before.world?.timelineSeconds && !disruptive.length && before.worldFirst?.radio.station !== after.worldFirst?.radio.station }
          await run.page.getByRole('button', { name: 'Close radio stations', exact: true }).click()
        })
        const close = run.page.getByRole('button', { name: 'Close radio stations', exact: true }); if (await close.count()) await close.click()
        await phase('radio-pause', async () => {
          await replay(); const pause = run.page.getByRole('button', { name: 'Pause radio', exact: true })
          if (!(await pause.count())) { result.radioPause = { unavailable: 'No playing radio state observed' }; return }
          const before = await snapshot(run.page); await pause.click(); await run.page.waitForTimeout(1000); const after = await snapshot(run.page)
          result.radioPause = { before, after, videoContinues: after.world?.timelineSeconds > before.world?.timelineSeconds, radioStopped: !after.worldFirst?.radio.playing }
        })
        await phase('ambience', async () => {
          await replay(); const ambience = run.page.getByRole('button', { name: 'Toggle driving ambience', exact: true })
          const a = await snapshot(run.page); await ambience.click(); await run.page.waitForTimeout(1000); const b = await snapshot(run.page)
          result.ambience = { before: a.ambience, after: b.ambience, radioBefore: a.worldFirst?.radio, radioAfter: b.worldFirst?.radio, radioStateUnchanged: a.worldFirst?.radio?.station === b.worldFirst?.radio?.station && a.worldFirst?.radio?.playing === b.worldFirst?.radio?.playing, videoContinues: b.world?.timelineSeconds > a.world?.timelineSeconds }
          await ambience.click()
        })
        await phase('world-pause', async () => {
          const play = run.page.getByRole('button', { name: 'Play radio', exact: true }); if (await play.count()) await play.click()
          await run.page.waitForTimeout(1500); await replay()
          await run.page.getByRole('button', { name: 'Pause cinematic world', exact: true }).click(); await run.page.waitForTimeout(350)
          const before = await snapshot(run.page); await run.page.waitForTimeout(1000); const after = await snapshot(run.page)
          result.worldPause = { before, after, videoStopped: Math.abs((after.world?.timelineSeconds ?? Infinity) - (before.world?.timelineSeconds ?? 0)) < .05,
            radioTimeContinues: after.media.some(m => m.kind === 'AUDIO' && !m.paused && m.time > (before.media.find(v => v.id === m.id)?.time ?? Infinity)) }
          await run.page.getByRole('button', { name: 'Resume cinematic world', exact: true }).click()
        })
        await phase('dashboard-controls', async () => {
          await replay()
          await run.page.getByRole('button', { name: 'Focus radio', exact: true }).click()
          const before = await snapshot(run.page), knob = run.page.getByRole('slider', { name: 'Volume knob', exact: true })
          await knob.press('Home'); await run.page.waitForTimeout(200); const low = await snapshot(run.page)
          await knob.press('ArrowRight'); await run.page.waitForTimeout(200); const raised = await snapshot(run.page)
          const slider = run.page.getByRole('slider', { name: 'Dashboard volume', exact: true })
          await slider.press('ArrowRight'); await run.page.waitForTimeout(200); const sliderRaised = await snapshot(run.page)
          const presets = await run.page.getByRole('button', { name: /^Preset \d:/ }).count()
          const eqControls = await run.page.getByRole('slider', { name: /equalizer|bass|treble|EQ/i }).count()
          result.dashboard = { before, low, raised, sliderRaised, presets, eqControls,
            knobControlsVolume: low.worldFirst?.radio.volume === 0 && raised.worldFirst?.radio.volume > 0,
            sliderControlsVolume: sliderRaised.worldFirst?.radio.volume > raised.worldFirst?.radio.volume,
            videoContinues: sliderRaised.world?.timelineSeconds > before.world?.timelineSeconds,
            eqFinding: eqControls ? 'Equalizer controls present' : 'Original dashboard has no adjustable equalizer control; no EQ behavior claimed' }
          await run.page.getByRole('button', { name: /Back to drive/ }).click()
          await run.page.screenshot({ path: path.join(folder, 'radio-controls-return.png') })
        })
        await phase('transition-and-end', async () => {
          await replay(); result.measurementStart = await snapshot(run.page)
          await run.page.waitForTimeout(Math.min(seconds, 5) * 1000); await run.page.screenshot({ path: path.join(folder, 'segment-join.png') })
          await run.page.waitForTimeout(Math.max(0, seconds - 5) * 1000); result.metrics = await snapshot(run.page)
          result.transition = { observedTransitions: result.metrics.world?.transitions ?? null, gapMs: result.metrics.world?.lastTransitionGapMs ?? null, finalStatus: result.metrics.world?.status, timelineSeconds: result.metrics.world?.timelineSeconds, firstFrameMs: result.metrics.world?.firstFrameMs }
        })
        result.metrics ??= await snapshot(run.page)
        await run.page.screenshot({ path: path.join(folder, 'end.png') })
        result.checks = { preservation: check.preservation.every(x => x.pass), noHorizontalOverflow: result.metrics.noHorizontalOverflow, videoPresent: result.metrics.media.some(m => m.kind === 'VIDEO' && m.width > 0), mutedWorldVideo: result.metrics.media.filter(m => m.kind === 'VIDEO').every(m => m.muted), radioDoesNotRestartVideo: result.radioSwitch?.pass ?? null, radioPauseKeepsVideo: result.radioPause?.videoContinues ?? null, ambienceLeavesRadioState: result.ambience?.radioStateUnchanged ?? null, worldPauseStopsVideo: result.worldPause?.videoStopped ?? null, worldPauseKeepsRadio: result.worldPause?.radioTimeContinues ?? null, fourPresetsPreserved: result.dashboard?.presets === 4, volumeKnobWorks: result.dashboard?.knobControlsVolume ?? null, volumeSliderWorks: result.dashboard?.sliderControlsVolume ?? null, noPageErrors: !run.errors.length }
      } catch (e) { result.failure = e.name; await run.page.screenshot({ path: path.join(folder, 'failure.png') }).catch(() => {}) }
      finally { result.blocked = run.blocked; result.errors = run.errors; result.responses = run.responses; await run.context.close(); await saveJson(path.join(folder, 'result.json'), result); results.push(result) }
    }
  } finally { await browser.close(); await saveJson(path.join(out, 'results.json'), results) }
  console.log(JSON.stringify({ out, profiles: results.map(r => ({ name: r.profile.name, checks: r.checks, failure: r.failure })) }))
}
