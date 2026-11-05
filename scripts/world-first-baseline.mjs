import { createRequire } from 'node:module'
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'portrait', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  { name: 'landscape', viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
]
const originals = {
  'app/(site)/cruise/page.tsx': '1b558244f80bf6ca6147e9167b0e5fa76df13b2e',
  'app/(site)/cruise/CruiseClient.tsx': '0c1130e4c065102195d715b255a364f5ca5e99ec',
  'components/cruise/LaunchExperience.tsx': '97931445cc60c1318272b9fefbe520431d9e2dfb',
  'components/cruise/CruiseScene.tsx': '9f1daa80ae178a1374b79866f1a9b2345b72909f',
  'components/cruise/audio/useCruiseAudio.ts': '40a4d5a213f6391ca3e802975162e2af9797eae5',
  'middleware.ts': '3ce137612e443ad07386cdeb39303b16f50c3ad1',
}
export function option(name, fallback) { return process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback }
export function safeUrl(value) { try { const u = new URL(value); return u.origin + u.pathname } catch { return '(non-URL source)' } }
export function requestPolicy(method, rawUrl) {
  const u = new URL(rawUrl)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) return 'mutation'
  if (/google-analytics|googletagmanager|doubleclick|segment\.io|sentry\.io|vercel-insights|analytics\.vercel|posthog|amplitude|mixpanel/i.test(u.hostname)
    || /(?:\/api\/(?:cruise\/(?:events|session|analytics|viewability)|analytics|avenue)|\/_vercel\/(?:insights|speed-insights)|\/collect$)/i.test(u.pathname)) return 'analytics-or-avenue'
  return null
}
export async function preflight() {
  const preservation = Object.entries(originals).map(([file, expected]) => {
    const actual = execFileSync('git', ['hash-object', '--', file], { cwd: root, encoding: 'utf8' }).trim()
    return { file, expected, actual, pass: actual === expected }
  })
  const stagedPaths = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)
  const media = []
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (/\.(mp4|webm|mov|wav|ogg|mp3)$/i.test(entry.name)) media.push({ file: path.relative(root, full).replaceAll('\\', '/'), bytes: (await stat(full)).size })
    }
  }
  await walk(path.join(root, 'public/cruise/experiments/world-first'))
  return { at: new Date().toISOString(), browserLaunched: false, preservation, stagedPaths, media,
    releaseBlocker: 'Previously leaked Supabase key retirement is unverified. No credentials inspected or modified.' }
}
export async function makeOutput(kind) {
  const out = path.join(root, 'docs/cruise/world-first/qa', kind, new Date().toISOString().replace(/[:.]/g, '-'))
  await mkdir(out, { recursive: true }); return out
}
export async function launchBrowser() {
  const require = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))
  const { chromium } = require('@playwright/test')
  return chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-webgl'] })
}
export async function newSafePage(browser, profile, out) {
  // Playwright's page recording is silent; no tab/system audio capture or MediaRecorder is used.
  const context = await browser.newContext({ ...profile, recordVideo: { dir: path.join(out, 'silent-video'), size: profile.viewport }, serviceWorkers: 'block' })
  const blocked = [], errors = [], responses = []
  await context.route('**/*', async route => {
    const req = route.request(), reason = requestPolicy(req.method(), req.url())
    if (reason) { blocked.push({ method: req.method(), url: safeUrl(req.url()), reason }); await route.abort('blockedbyclient') }
    else await route.continue()
  })
  await context.addInitScript(() => {
    const qa = window.__worldQA = { renderers: [], media: [], events: [], raf: [], decoded: [], worldSamples: [], start: performance.now() }
    const ids = new WeakMap(); let next = 0
    const register = el => { if (!ids.has(el)) { const id = ++next; ids.set(el, id); qa.media.push({ id, el }); for (const type of ['loadstart', 'loadeddata', 'playing', 'pause', 'waiting', 'stalled', 'ended', 'error', 'seeking']) el.addEventListener(type, () => qa.events.push({ id, type, at: performance.now(), time: el.currentTime })) } return ids.get(el) }
    for (const method of ['play', 'pause', 'load']) {
      const original = HTMLMediaElement.prototype[method]
      HTMLMediaElement.prototype[method] = function(...args) { const id = register(this); qa.events.push({ id, type: `call:${method}`, at: performance.now(), time: this.currentTime }); return original.apply(this, args) }
    }
    const originalContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(...args) {
      const gl = originalContext.apply(this, args)
      if (gl && /webgl/.test(args[0])) { const ext = gl.getExtension('WEBGL_debug_renderer_info'); const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); if (!qa.renderers.some(r => r.renderer === renderer)) qa.renderers.push({ renderer, vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), context: args[0] }) }
      return gl
    }
    let count = 0, began = performance.now(), previous = began, longest = 0
    function tick(now) { count++; longest = Math.max(longest, now - previous); previous = now; if (now - began >= 1000) { qa.raf.push({ at: now, seconds: (now - began) / 1000, callbacks: count, longestGapMs: longest }); if (window.__worldPlayback) qa.worldSamples.push({ at: now, ...window.__worldPlayback }); began = now; count = 0; longest = 0 } requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    setInterval(() => {
      for (const el of document.querySelectorAll('audio,video')) register(el)
      for (const item of qa.media) if (item.el.tagName === 'VIDEO' && item.el.requestVideoFrameCallback && !item.tracked) {
        item.tracked = true
        const watch = (now, metadata) => { qa.decoded.push({ id: item.id, at: now, mediaTime: metadata.mediaTime, presentedFrames: metadata.presentedFrames, expectedDisplayTime: metadata.expectedDisplayTime, visible: item.el.classList.contains('visible'), processingDuration: metadata.processingDuration }); item.el.requestVideoFrameCallback(watch) }
        item.el.requestVideoFrameCallback(watch)
      }
    }, 250)
    localStorage.setItem('buena-onda-radio-help-v1', 'seen')
  })
  const page = await context.newPage()
  page.setDefaultTimeout(18000)
  page.on('pageerror', e => errors.push({ name: e.name, message: e.message.replace(/https?:\/\/[^\s"')]+/g, '(URL removed)').replace(/[A-Za-z0-9_\-]{60,}/g, '(long token removed)') }))
  page.on('response', r => { if (/\.(glb|mp4|webm|ogg|wav)(?:\?|$)/i.test(r.url())) responses.push({ url: safeUrl(r.url()), status: r.status() }) })
  return { context, page, blocked, errors, responses }
}
export async function snapshot(page) {
  return page.evaluate(() => {
    const q = window.__worldQA
    const source = value => { try { const u = new URL(value, location.href); return u.origin + u.pathname } catch { return '(non-URL source)' } }
    const media = (q?.media ?? []).map(({ id, el }) => ({ id, kind: el.tagName, source: source(el.currentSrc || el.src), time: el.currentTime, duration: Number.isFinite(el.duration) ? el.duration : null, paused: el.paused, muted: el.muted, volume: el.volume, ready: el.readyState, width: el.videoWidth, height: el.videoHeight, visible: el.classList.contains('visible'), error: el.error?.code ?? null, playbackQuality: el.getVideoPlaybackQuality?.().toJSON?.() ?? (() => { const v = el.getVideoPlaybackQuality?.(); return v ? { totalVideoFrames: v.totalVideoFrames, droppedVideoFrames: v.droppedVideoFrames, corruptedVideoFrames: v.corruptedVideoFrames } : null })() }))
    return { at: performance.now(), viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, userAgent: navigator.userAgent, renderer: q?.renderers, raf: q?.raf, events: q?.events, decoded: q?.decoded, media,
      world: window.__worldPlayback ?? null, worldFirst: window.__worldFirst?.() ?? null, worldSamples: q?.worldSamples,
      jeepNight: window.__jeepNight?.() ?? null,
      ambience: (() => { try { return JSON.parse(document.documentElement.dataset.worldAmbience || 'null') } catch { return null } })(),
      hybridStatus: document.querySelector('[data-hybrid-status]')?.getAttribute('data-hybrid-status'),
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth,
      buttons: [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0).map(b => ({ label: b.getAttribute('aria-label') || b.textContent?.trim(), disabled: b.disabled, pressed: b.getAttribute('aria-pressed') })),
      resources: performance.getEntriesByType('resource').filter(r => /\.(mp4|webm|glb|ogg|wav)(?:\?|$)/i.test(r.name)).map(r => ({ url: source(r.name), durationMs: r.duration, transferSize: r.transferSize, encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize })) }
  })
}
export async function enterDrive(page, target) {
  if (target === 'jeepNight') { await page.getByRole('button', { name: /Start the drive/ }).click({ timeout: 120000 }); await page.waitForSelector('[data-started="true"]') }
  else if (target === 'miamiTest') {
    // The live Miami deployment is the earlier Sunset Study; its gate differs from local MiamiStreet.
    const gate = page.getByRole('button', { name: /^(?:Start the cruise|[▶\s]*Cruise)$/ }).first()
    await gate.click({ timeout: 120000 })
    await page.locator('canvas').first().waitFor({ state: 'visible' })
    for (let i = 0; i < 3; i++) { const time = page.getByRole('button', { name: /^Time of day:/ }); if (!(await time.count()) || (await time.getAttribute('aria-label'))?.includes('night')) break; await time.click() }
    const oldSunset = page.getByRole('button', { name: 'Sunset', exact: true }); if (await oldSunset.count()) await oldSunset.click()
  }
  else {
    const night = page.getByRole('button', { name: 'Night Drive', exact: true }); if (await night.count()) await night.click()
    await page.getByRole('button', { name: /LET.S CRUISE/ }).click({ timeout: 120000 })
    await page.waitForSelector('[data-garage="false"]')
    await page.waitForSelector('[data-ready="true"]', { timeout: 120000 })
  }
}
export async function saveJson(file, value) { await writeFile(file, JSON.stringify(value, null, 2) + '\n') }
export async function baselineMain() {
  const out = await makeOutput('baseline'), check = await preflight(); await saveJson(path.join(out, 'preflight.json'), check)
  if (!process.argv.includes('--run')) { console.log(JSON.stringify({ out, browserLaunched: false, preservationPass: check.preservation.every(x => x.pass) })); return }
  const browser = await launchBrowser(), results = [], seconds = Number(option('seconds', 12))
  const targets = [ { name: 'originalCruise', url: 'https://www.buenaondalifestyle.com/cruise' }, { name: 'miamiTest', url: 'https://www.buenaondalifestyle.com/cruise/miami-test' }, { name: 'jeepNight', url: 'https://buena-onda-jeep-night.vercel.app' } ]
  try {
    for (const target of targets.filter(t => option('targets', targets.map(t => t.name).join(',')).split(',').includes(t.name))) for (const profile of profiles.filter(p => option('profiles', 'desktop,portrait,landscape').split(',').includes(p.name))) {
      if (await stat(path.join(root, 'docs/cruise/world-first/qa/browser-hold')).then(() => true).catch(() => false)) { console.log('Browser hold detected; preserving completed captures and closing browser'); return }
      const folder = path.join(out, `${target.name}-${profile.name}`); await mkdir(folder, { recursive: true })
      const run = await newSafePage(browser, profile, folder), began = Date.now(); let result = { target, profile, emulation: profile.name !== 'desktop', recording: 'Silent Playwright page video; radio not recorded' }
      console.log(`Capturing ${target.name} ${profile.name}`)
      try {
        await run.page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await run.page.waitForTimeout(1500)
        if (target.name === 'originalCruise') await run.page.waitForSelector('[data-vehicle-ready="true"]', { timeout: 120000 })
        if (target.name === 'jeepNight') await run.page.waitForSelector('[data-ready="true"]', { timeout: 120000 })
        await run.page.screenshot({ path: path.join(folder, 'garage.png') }); await enterDrive(run.page, target.name); result.readyMs = Date.now() - began
        await run.page.waitForTimeout(2000); await run.page.screenshot({ path: path.join(folder, 'drive.png') })
        if (target.name === 'originalCruise') { await run.page.keyboard.press('c'); await run.page.waitForTimeout(1000); await run.page.screenshot({ path: path.join(folder, 'interior.png') }) }
        if (target.name === 'jeepNight') { await run.page.keyboard.press('v'); await run.page.waitForTimeout(1000); await run.page.screenshot({ path: path.join(folder, 'exterior.png') }); await run.page.keyboard.press('v') }
        await run.page.waitForTimeout(seconds * 1000); result.metrics = await snapshot(run.page); result.pass = !run.errors.length
      }
      catch (e) { result.pass = false; result.failure = e.name; result.metrics = await snapshot(run.page).catch(() => null); await run.page.screenshot({ path: path.join(folder, 'failure.png') }).catch(() => {}) }
      finally { result.blocked = run.blocked; result.errors = run.errors; result.responses = run.responses; await run.context.close(); await saveJson(path.join(folder, 'result.json'), result); results.push(result) }
    }
  } finally { await browser.close(); await saveJson(path.join(out, 'results.json'), results) }
  console.log(JSON.stringify({ out, captures: results.length, completed: results.filter(r => r.pass).length }))
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await baselineMain()
