// Ads v2 evidence: park the chase camera a fixed lead before chosen placements and record what the
// running Cruise reports (placement roster by surface, live samples, which projection is playing).
// Usage: node scripts/opus-ads.mjs --url http://127.0.0.1:3067 --label ads-v2 [--lead 45] [--per 2] [--fps 15]
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback }
const base = arg('url', 'http://127.0.0.1:3067'), label = arg('label', 'ads-v2'), lead = Number(arg('lead', '45')), per = Number(arg('per', '2')), fpsSeconds = Number(arg('fps', '0')), query = arg('query', '')
const out = `docs/cruise/opus/${label}`
await mkdir(out, { recursive: true })
const result = { label, url: base, lead, date: new Date().toISOString(), method: 'Headless Edge, --use-angle=d3d11 GPU, 1280x720, night, chase camera, drive paused at routeMeters - lead.', shots: [] }
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const snap = page => page.evaluate(() => window.__jeepNight?.() || {})
const until = async (page, fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await page.waitForTimeout(250) } return false }
const ads = page => page.evaluate(() => { const a = window.__miamiAds?.(); if (!a) return null; return { placements: a.placements.map(p => ({ id: p.id, surface: p.surface, campaign: p.campaign.id, street: p.street, routeMeters: p.routeMeters })), samples: a.samples.filter(s => s.visible).map(s => ({ id: s.placement.id, surface: s.placement.surface, distance: +s.distance.toFixed(1), viewable: s.viewable, readable: s.readable, occlusion: s.occlusion, px: [Math.round(s.pixelWidth), Math.round(s.pixelHeight)] })), performance: a.performance } })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 400)) })
  await page.goto(`${base}/cruise?diagnostics=1&directorSeed=7${query ? '&' + query : ''}`, { timeout: 240000 })
  await until(page, async () => (await snap(page)).ready, 120000)
  await page.getByRole('button', { name: 'Start the drive', exact: true }).click()
  await until(page, async () => (await snap(page)).playing, 20000)
  if ((await snap(page)).camera !== 'chase') await page.getByRole('button', { name: 'Switch cockpit and chase camera' }).click()
  await until(page, async () => (await ads(page)) !== null, 20000)
  const roster = (await ads(page)).placements
  result.roster = { total: roster.length, bySurface: roster.reduce((m, p) => ({ ...m, [p.surface]: (m[p.surface] || 0) + 1 }), {}), byCampaign: roster.reduce((m, p) => ({ ...m, [p.campaign]: (m[p.campaign] || 0) + 1 }), {}) }
  console.log(JSON.stringify(result.roster))
  const targets = ['projection', 'blade', 'billboard'].flatMap(surface => roster.filter(p => p.surface === surface && /Ocean Drive|Collins/.test(p.street)).slice(0, per))
  for (const target of targets) {
    await page.evaluate(m => window.__miamiInspect(m), target.routeMeters - lead)
    const paused = (await snap(page)).paused
    if (paused) await page.getByRole('button', { name: 'Resume drive', exact: true }).click().catch(() => {})
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: 'Pause drive', exact: true }).click().catch(() => {})
    await page.evaluate(m => window.__miamiInspect(m), target.routeMeters - lead)
    await page.waitForTimeout(2500)
    const file = `${out}/${target.surface}-${target.id}.png`
    await page.screenshot({ path: file })
    const state = await ads(page)
    const shot = { target, file, visible: state.samples, night: (await page.evaluate(() => window.__miamiGeo?.()?.nightBlend)) ?? null }
    result.shots.push(shot)
    console.log(JSON.stringify({ id: target.id, campaign: target.campaign, visible: shot.visible.map(s => `${s.id}:${s.viewable ? 'V' : '-'}${s.readable ? 'R' : '-'}`) }))
  }
  if (fpsSeconds > 0) {
    // Driving FPS with ads v2 live, from the first projection onward.
    await page.evaluate(m => window.__miamiInspect(m), targets[0].routeMeters - 150)
    await page.getByRole('button', { name: 'Resume drive', exact: true }).click().catch(() => {})
    const samples = []
    for (let i = 0; i < fpsSeconds; i++) { await page.waitForTimeout(1000); samples.push((await snap(page)).fps) }
    result.fps = { samples, mean: samples.reduce((a, b) => a + b, 0) / samples.length, min: Math.min(...samples), below30: samples.filter(f => f < 30).length, adMeasurement: (await ads(page)).performance }
    console.log(JSON.stringify({ fps: result.fps.mean.toFixed(1), min: result.fps.min }))
  }
  result.errors = errors
  if (errors.length) console.log('errors', errors.slice(0, 5))
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 1))
  await browser.close()
}
