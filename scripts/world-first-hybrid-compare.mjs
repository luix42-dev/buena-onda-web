import path from 'node:path'
import { mkdir, stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { enterDrive, launchBrowser, newSafePage, option, profiles, saveJson, snapshot } from './world-first-baseline.mjs'

const url = option('url', 'http://127.0.0.1:3060/cruise/world-test')
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('This comparison is local only.')
const running = execFileSync('powershell.exe', ['-NoProfile', '-Command', "@(Get-Process UnrealEditor -ErrorAction SilentlyContinue).Count"], { encoding: 'utf8', windowsHide: true }).trim()
if (running !== '0') throw new Error('Do not overlap browser WebGL with the active Unreal render.')
if (await stat('docs/cruise/world-first/qa/browser-hold').then(() => true).catch(() => false)) throw new Error('Lead browser hold is active; do not launch.')
const out = `docs/cruise/world-first/hybrid/browser-${new Date().toISOString().replace(/[:.]/g, '-')}`
await mkdir(out, { recursive: true })
const browser = await launchBrowser(), results = []
try {
  for (const profile of profiles.filter(p => option('profiles', 'desktop,portrait,landscape').split(',').includes(p.name))) {
    const folder = path.join(out, profile.name); await mkdir(folder, { recursive: true })
    const run = await newSafePage(browser, profile, folder), result = { profile, emulated: profile.name !== 'desktop', sources: [], recording: 'Silent page video; no radio/system audio capture.' }
    try {
      await run.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
      await enterDrive(run.page, 'local')
      for (const source of ['unreal', 'hybrid']) {
        await run.page.getByLabel('Visual approach', { exact: true }).selectOption(source)
        const replayMarker = await run.page.evaluate(() => performance.now())
        await run.page.getByRole('button', { name: 'Replay proof', exact: true }).click()
        await run.page.waitForFunction(at => window.__worldQA.events.some(event => event.at >= at && event.type === 'call:load') && window.__worldPlayback?.status === 'playing' && window.__worldPlayback.timelineSeconds < .8, replayMarker, { timeout: 18000 })
        await run.page.getByRole('button', { name: 'Pause cinematic world', exact: true }).click()
        await run.page.waitForFunction(() => window.__worldPlayback?.status === 'paused')
        await run.page.waitForTimeout(150)
        const paused = await snapshot(run.page)
        await run.page.getByRole('button', { name: 'Hide world comparison', exact: true }).click()
        await run.page.screenshot({ path: path.join(folder, `${source}-paused.png`) })
        const calibration = await run.page.evaluate(() => ({ mode: document.querySelector('[data-calibration]')?.getAttribute('data-calibration'), fitted: (() => { const el = document.querySelector('.world-hybrid-fitted'); if (!el) return null; const b = el.getBoundingClientRect(); return { width: b.width, height: b.height, aspect: b.width / b.height } })() }))
        await run.page.getByRole('button', { name: 'Hide world comparison', exact: true }).click()
        await run.page.getByRole('button', { name: 'Resume cinematic world', exact: true }).click()
        await run.page.waitForFunction(() => window.__worldPlayback?.status === 'ended', undefined, { timeout: 15000 })
        const ended = await snapshot(run.page)
        const decoderSlots = await run.page.evaluate(() => {
          const videos = window.__worldQA.media.filter(item => item.el.tagName === 'VIDEO')
          return { connected: videos.filter(item => item.el.isConnected).map(item => { const q = item.el.getVideoPlaybackQuality(); return { id: item.id, width: item.el.videoWidth, height: item.el.videoHeight, totalVideoFrames: q.totalVideoFrames, droppedVideoFrames: q.droppedVideoFrames } }), detached: videos.filter(item => !item.el.isConnected).map(item => ({ id: item.id, paused: item.el.paused, srcCleared: !item.el.getAttribute('src') })) }
        })
        await run.page.getByRole('button', { name: 'Hide world comparison', exact: true }).click()
        await run.page.screenshot({ path: path.join(folder, `${source}-ended.png`) })
        await run.page.getByRole('button', { name: 'Hide world comparison', exact: true }).click()
        result.sources.push({ source, calibration, paused, ended, decoderSlots, checks: { mutedVideo: ended.media.filter(m => m.kind === 'VIDEO').every(m => m.muted), actualNative1080p: ended.media.some(m => m.kind === 'VIDEO' && m.width === 1920 && m.height === 1080), oneObservedTransition: ended.world?.transitions === 1, actualTwoSecondTimeline: Math.abs((ended.world?.timelineSeconds ?? 0) - 2) < .02, noHorizontalOverflow: ended.noHorizontalOverflow, hybridStillUnverified: source !== 'hybrid' || calibration.mode === 'candidate', detachedDecodersReleased: decoderSlots.detached.every(slot => slot.paused && slot.srcCleared) } })
      }
    } catch (error) { result.failure = { name: error.name, message: error.message }; result.failureSnapshot = await snapshot(run.page).catch(() => null); await run.page.screenshot({ path: path.join(folder, 'failure.png') }).catch(() => {}) }
    finally { result.errors = run.errors; result.responses = run.responses; result.blocked = run.blocked; await run.context.close(); await saveJson(path.join(folder, 'result.json'), result); results.push(result) }
  }
} finally { await browser.close(); await saveJson(path.join(out, 'results.json'), results) }
console.log(JSON.stringify({ out, results: results.map(result => ({ profile: result.profile.name, failure: result.failure, errors: result.errors, sources: result.sources.map(source => ({ source: source.source, checks: source.checks, gapMs: source.ended.world?.lastTransitionGapMs })) })) }, null, 2))
