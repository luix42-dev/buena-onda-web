// 10-minute stability run (per camera mode) in portrait mobile EMULATION. Not a physical-device test.
// Usage: node scripts/opus-stability.mjs --url http://127.0.0.1:3067 --minutes 10 --modes director,driver
import { createRequire } from 'node:module'
import { writeFile, mkdir } from 'node:fs/promises'
const require = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d }
const base = arg('url', 'http://127.0.0.1:3067'), minutes = Number(arg('minutes', '10')), modes = arg('modes', 'director,driver').split(',')
await mkdir('docs/cruise/opus/stability', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] })
const result = { url: base, minutes, viewport: '390x844 isMobile emulation', date: new Date().toISOString(), runs: [] }
try {
  for (const mode of modes) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage(), run = { mode, errors: [], samples: [] }; result.runs.push(run)
    page.on('pageerror', e => run.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) run.errors.push(m.text().slice(0, 300)) })
    await page.goto(`${base}/cruise?cam=${mode}`, { timeout: 180000 })
    const end0 = Date.now() + 120000; while (Date.now() < end0 && !(await page.evaluate(() => window.__jeepNight?.()?.ready))) await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Start the drive', exact: true }).click()
    const end = Date.now() + minutes * 60000
    while (Date.now() < end) {
      await page.waitForTimeout(5000)
      run.samples.push(await page.evaluate(() => { const j = window.__jeepNight?.() || {}, g = window.__miamiGeo?.() || {}, d = window.__director?.() || null, m = performance.memory; return { t: Math.round(performance.now() / 1000), fps: j.fps, camera: j.camera, playing: j.playing, street: g.street, routeMeters: Math.round(g.routeMeters || 0), shot: d?.shot ?? null, heapMB: m ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null, crowd: window.__miamiCrowd?.()?.visible ?? null } }))
    }
    const director = await page.evaluate(() => window.__director?.() || null)
    const fps = run.samples.map(s => s.fps).filter(Number.isFinite)
    run.summary = { samples: fps.length, meanFps: +(fps.reduce((a, b) => a + b, 0) / fps.length).toFixed(2), minFps: Math.min(...fps), below30: fps.filter(f => f < 30).length, heapStartMB: run.samples[0]?.heapMB, heapEndMB: run.samples.at(-1)?.heapMB, heapMaxMB: Math.max(...run.samples.map(s => s.heapMB || 0)), playingThroughout: run.samples.every(s => s.playing), cameraHeld: run.samples.every(s => s.camera === mode), cuts: director?.totals?.cuts ?? null, totals: director?.totals ?? null, cutHistory: director?.history ?? null, errors: run.errors.length }
    console.log(JSON.stringify({ mode, ...run.summary, cutHistory: undefined }))
    await ctx.close()
  }
} finally { await writeFile('docs/cruise/opus/stability/results.json', JSON.stringify(result, null, 1)); await browser.close() }
