import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('@playwright/test')) } catch { ({ chromium } = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))('@playwright/test')) }
const baseline = process.argv.includes('--baseline')
const phase = process.env.EXPERIENCE_PHASE || (baseline ? 'baseline' : 'phase1')
const base = process.env.EXPERIENCE_URL || (baseline ? 'http://127.0.0.1:3074/cruise/human-radio' : 'http://127.0.0.1:3076/cruise/experience')
const seconds = Math.min(300, Math.max(60, Number(process.env.EXPERIENCE_SECONDS) || 90))
const out = `docs/cruise/experience/evidence/${phase}`
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-webgl', '--autoplay-policy=document-user-activation-required'] })
const result = { at: new Date().toISOString(), phase, url: base, browser: browser.version(), viewport: { width: 1280, height: 720 }, dpr: 1, mode: 'development server; desktop Windows, no physical mobile', errors: [], consoleErrors: [], samples: [], checks: {} }
const context = await browser.newContext({ viewport: result.viewport, deviceScaleFactor: 1, acceptDownloads: true })
await context.addInitScript(() => {
  window.__experienceMedia = []
  window.Audio = new Proxy(window.Audio, { construct(target, args) { const audio = Reflect.construct(target, args); window.__experienceMedia.push(audio); return audio } })
})
const page = await context.newPage()
page.on('pageerror', e => result.errors.push(e.message))
page.on('console', msg => { if (msg.type() === 'error') result.consoleErrors.push(msg.text().slice(0, 400)) })
const state = () => page.evaluate(() => ({ drive: window.__jeepNight?.(), geo: window.__miamiGeo?.(), media: window.__experienceMedia.map((a,id)=>({id,src:a.currentSrc,time:a.currentTime,paused:a.paused,ready:a.readyState})), heap: performance.memory?.usedJSHeapSize, scene: document.querySelector('canvas')?.getBoundingClientRect().toJSON(), overflow: document.documentElement.scrollWidth > innerWidth }))
try {
  const nav = Date.now()
  await page.goto(`${base}?diagnostics=1`, { waitUntil: 'domcontentloaded', timeout: 240000 })
  result.domReadyMs = Date.now() - nav
  await page.screenshot({ path: `${out}/entry.png` })
  const start = page.getByRole('button', { name: baseline ? 'Start the drive' : 'Start Cruising', exact: true })
  await start.waitFor({ timeout: 180000 })
  await page.waitForFunction(() => !document.querySelector('[aria-label="Start the drive"], [aria-label="Start Cruising"]')?.disabled, null, { timeout: 120000 })
  result.startReadyMs = Date.now() - nav
  await page.screenshot({ path: `${out}/ready.png` })
  const launched = Date.now()
  await start.click()
  for (let second = 1; second <= seconds; second++) {
    await page.waitForTimeout(1000)
    const sample = await state(); sample.wallSeconds = (Date.now() - launched) / 1000
    result.samples.push(sample)
    if ([5,15,30,45,60,90,seconds].includes(second)) await page.screenshot({ path: `${out}/drive-${second}s.png` })
  }
  const first = result.samples[0], last = result.samples.at(-1)
  result.firstVehicleReadySeconds = result.samples.find(s=>s.drive?.ready)?.wallSeconds ?? null
  result.checks.vehicleReadyWithin60 = result.firstVehicleReadySeconds !== null && result.firstVehicleReadySeconds <= 60
  result.checks.cockpitRevealed = result.samples.some(s=>s.drive?.ready&&s.drive?.camera==='driver')
  result.checks.actuallyMoved = last.drive?.distance > (first.drive?.distance || 0) + 100
  result.checks.audioAdvanced = last.media.some(a => !a.paused && a.time > 5)
  result.checks.noPageErrors = result.errors.length === 0
  result.checks.noOverflow = result.samples.every(s => !s.overflow)
  const fps = result.samples.slice(10).filter(s=>s.drive?.ready).map(s => s.drive?.fps).filter(v => Number.isFinite(v) && v > 0)
  const sorted = [...fps].sort((a,b)=>a-b)
  result.performance = { averageSceneFps: fps.reduce((a,b)=>a+b,0)/fps.length, minSceneFps: sorted[0], p5SceneFps: sorted[Math.floor(sorted.length*.05)], below30Samples: fps.filter(v=>v<30).length, samples:fps.length, maxHeapBytes: Math.max(...result.samples.map(s=>s.heap||0)), renderer: await page.evaluate(()=>{const gl=document.querySelector('canvas')?.getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null}) }
  if (!baseline) {
    await page.getByRole('button', { name: 'Tune & discover', exact: true }).click()
    await page.getByRole('button', { name: 'Favorite Jolt Radio', exact: true }).click()
    await page.getByRole('button', { name: 'Tune NTS 1', exact: true }).click()
    await page.waitForTimeout(6000)
    result.checks.stationSwitch = (await state()).drive?.station === 'nts-radio'
    await page.getByRole('button', { name: 'Close discovery panel', exact: true }).click()
    const before = await state()
    await page.getByRole('button', { name: 'Cruise options', exact: true }).click()
    await page.locator('#opening-options').getByRole('button', { name: 'Listen without 3D', exact: true }).click()
    await page.waitForTimeout(2000)
    const after = await state()
    result.checks.audioPersistsWithout3D = after.media.some(a=>!a.paused&&a.time>(before.media.find(b=>b.id===a.id)?.time||0))
    result.checks.canvasRemoved = await page.locator('.jn-world').count() === 0
  }
  if (Object.values(result.checks).some(value => value !== true)) { result.failure = 'One or more critical assertions failed'; process.exitCode = 1 }
} catch (error) { result.failure = error.stack || String(error); process.exitCode = 1; await page.screenshot({ path: `${out}/failure.png` }).catch(()=>{}) }
finally { await writeFile(`${out}/results.json`, JSON.stringify(result,null,2)); await browser.close(); console.log(JSON.stringify({phase,checks:result.checks,performance:result.performance,failure:result.failure,errors:result.errors},null,2)) }
