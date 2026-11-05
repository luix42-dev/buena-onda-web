// Speed profile: km/h every second for N seconds on the real route. Usage: --url --seconds 120 --pace night-drive|midnight-run|cruise
import { createRequire } from 'node:module'
import { writeFile, mkdir } from 'node:fs/promises'
const require = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d }
const base = arg('url', 'http://127.0.0.1:3067'), seconds = Number(arg('seconds', '120')), pace = arg('pace', 'night-drive'), label = arg('label', 'speed')
await mkdir('docs/cruise/opus/speed', { recursive: true })
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage()
await p.goto(`${base}/cruise`, { timeout: 120000 })
for (let i = 0; i < 300 && !(await p.evaluate(() => window.__jeepNight?.()?.ready)); i++) await p.waitForTimeout(300)
await p.getByRole('button', { name: 'Start the drive', exact: true }).click()
await p.getByLabel('Driving pace').selectOption(pace)
const samples = []
for (let i = 0; i < seconds; i++) { await p.waitForTimeout(1000); samples.push(await p.evaluate(() => { const j = window.__jeepNight(), g = window.__miamiGeo(); return { kmh: Math.round(j.speed), fps: Math.round(j.fps), street: g.street } })) }
const k = samples.map(s => s.kmh), f = samples.map(s => s.fps)
const summary = { label, url: base, pace, seconds, meanKmh: +(k.reduce((a, b) => a + b, 0) / k.length).toFixed(1), maxKmh: Math.max(...k), p90Kmh: [...k].sort((a, b) => a - b)[Math.floor(k.length * .9)], below30s: k.filter(v => v < 30).length, above60s: k.filter(v => v >= 60).length, meanFps: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1), minFps: Math.min(...f) }
console.log(JSON.stringify(summary))
await writeFile(`docs/cruise/opus/speed/${label}.json`, JSON.stringify({ summary, samples }, null, 1))
await b.close()
