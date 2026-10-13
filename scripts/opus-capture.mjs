// Matched-position captures + real-time FPS samples for before/after evidence.
// Usage: node scripts/opus-capture.mjs --url http://127.0.0.1:3067 --label after --views driver,chase,director:aerial
//        [--route 17.5] [--viewports 1280x720,390x844] [--fps 20] [--settle 2500] [--night|--sunset]
// FPS = the app's own 1 s frame counter (window.__jeepNight().fps) plus RAF intervals, headless Edge D3D11.
// Fixed-step screenshots are NOT FPS evidence; only the sampled runs are.
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback }
const base = arg('url', 'http://127.0.0.1:3067'), label = arg('label', 'capture'), route = Number(arg('route', '17.5'))
const views = arg('views', 'driver,chase').split(','), fpsSeconds = Number(arg('fps', '0')), settle = Number(arg('settle', '2500'))
const viewports = arg('viewports', '1280x720,390x844').split(',').map(v => { const [width, height] = v.split('x').map(Number); return { width, height } })
const clean = process.argv.includes('--clean'), park = process.argv.includes('--park'), query = arg('query', ''), seed = arg('seed', '7'), out = `docs/cruise/opus/${label}`, sunset = process.argv.includes('--sunset')
await mkdir(out, { recursive: true })
const result = { label, url: base, query, park, route, seed, date: new Date().toISOString(), method: 'Headless Edge, --use-angle=d3d11 GPU. Portrait is viewport emulation, not a physical phone.', runs: [] }
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const snap = page => page.evaluate(() => window.__jeepNight?.() || {})
const until = async (page, fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await page.waitForTimeout(250) } return false }
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, ...(viewport.width < viewport.height ? { isMobile: true, hasTouch: true } : {}) })
    const page = await context.newPage(), run = { viewport, errors: [], views: [] }
    result.runs.push(run); page.on('pageerror', e => run.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') run.errors.push('console: ' + m.text().slice(0, 600)) })
    const t0 = Date.now()
    await page.goto(`${base}/cruise?diagnostics=1&directorSeed=${seed}${query ? '&' + query : ''}`, { timeout: 240000 })
    await until(page, async () => (await snap(page)).ready, 120000); run.readyMs = Date.now() - t0
    if (sunset) await page.getByRole('button', { name: /sunset|night/i }).first().click().catch(() => {})
    await page.getByRole('button', { name: 'Start the drive', exact: true }).click()
    run.playing = await until(page, async () => (await snap(page)).playing, 20000)
    for (const view of views) {
      const [mode, shot] = view.split(':'), file = `${out}/${viewport.width}x${viewport.height}-${view.replace(':', '-')}.png`
      const current = async () => (await snap(page)).camera
      await page.evaluate(m => window.__miamiInspect(m), route)
      if (mode === 'director') {
        if (await current() !== 'director') await page.getByRole('button', { name: 'Director camera' }).click()
        await page.evaluate(s => window.__directorForce?.(s || null), shot)
      } else {
        if (await current() === 'director') await page.getByRole('button', { name: 'Director camera' }).click()
        if (await current() !== mode) await page.getByRole('button', { name: 'Switch cockpit and chase camera' }).click()
      }
      const paused = (await snap(page)).paused
      if (paused) await page.getByRole('button', { name: 'Resume drive', exact: true }).click().catch(() => {})
      await page.waitForTimeout(settle)
      if (park) { await page.getByRole('button', { name: 'Pause drive', exact: true }).click().catch(() => {}); await page.evaluate(m => window.__miamiInspect(m), route); await page.waitForTimeout(800) }
      if (clean) await page.addStyleTag({ content: '.jn>*:not(.jn-world){display:none!important}' })
      await page.screenshot({ path: file })
      const entry = { view, file, director: await page.evaluate(() => window.__director?.() || null), chunks: await page.evaluate(() => document.documentElement.dataset.miamiChunks || null) }
      if (fpsSeconds > 0) {
        await page.evaluate(() => { window.__opRaf = { frames: [], previous: null, active: true }; const step = t => { const r = window.__opRaf; if (!r.active) return; if (r.previous !== null) r.frames.push(t - r.previous); r.previous = t; requestAnimationFrame(step) }; requestAnimationFrame(step) })
        const samples = []
        for (let i = 0; i < fpsSeconds; i++) { await page.waitForTimeout(1000); samples.push((await snap(page)).fps) }
        const frames = await page.evaluate(() => { window.__opRaf.active = false; return window.__opRaf.frames })
        const sorted = [...frames].sort((a, b) => a - b)
        entry.fps = { samples, mean: samples.reduce((a, b) => a + b, 0) / samples.length, min: Math.min(...samples), below30: samples.filter(f => f < 30).length, rafMeanMs: frames.reduce((a, b) => a + b, 0) / frames.length, rafP95Ms: sorted[Math.floor(sorted.length * .95)], rafMaxMs: sorted.at(-1) }
        entry.directorAfter = await page.evaluate(() => window.__director?.() || null)
        entry.crowd = await page.evaluate(() => window.__miamiCrowd?.() || null)
      }
      run.views.push(entry)
      console.log(JSON.stringify({ viewport: `${viewport.width}x${viewport.height}`, view, fps: entry.fps && { mean: +entry.fps.mean.toFixed(2), min: +entry.fps.min.toFixed(2), p95: entry.fps.rafP95Ms }, shot: entry.director?.shot }))
    }
    await context.close()
  }
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 1))
  await browser.close()
}
