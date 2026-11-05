import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('@playwright/test')) }
catch { ({ chromium } = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))('@playwright/test')) }
const base = process.env.EXPERIENCE_URL || 'http://127.0.0.1:3076/cruise/experience'
const out = 'docs/cruise/experience/evidence/presence'
await mkdir(out, { recursive: true })
const result = { at: new Date().toISOString(), url: base, environment: 'Two isolated desktop headless Edge contexts, low quality, no physical-device or unique-person claim',
  status: 'pending', checks: {}, observations: [], errors: [], socketEvents: [] }
// A boolean hint only; never print credentials or websocket query parameters.
try {
  const local = await readFile('.env.local', 'utf8')
  result.localConfigHint = /^NEXT_PUBLIC_SUPABASE_URL\s*=\s*\S+/m.test(local) && /^NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*\S+/m.test(local)
} catch { result.localConfigHint = false }
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-webgl', '--autoplay-policy=document-user-activation-required'] })
result.browser = browser.version()
const contexts = []
const count = page => page.evaluate(() => {
  const label = document.querySelector('.ex-presence [role="status"]')?.getAttribute('aria-label') || ''
  return { count: /^\d+ opted-in browser sessions active$/.test(label) ? Number(label.split(' ')[0]) : null, label,
    hidden: document.hidden, started: document.querySelector('.jn')?.getAttribute('data-started'),
    visitorStored: !!localStorage.getItem('buena-onda:visitor:v1'), tabStored: !!sessionStorage.getItem('buena-onda:tab:v1') }
})
async function enter(name) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  contexts.push(context)
  const page = await context.newPage()
  page.on('pageerror', error => result.errors.push({ name, message: error.message }))
  page.on('websocket', socket => {
    const event = { name, host: new URL(socket.url()).hostname, framesReceived: 0, errors: [] }
    result.socketEvents.push(event)
    socket.on('framereceived', () => { event.framesReceived++ })
    socket.on('socketerror', error => event.errors.push(String(error).replace(/\?[^\s]*/g, '?[redacted]').slice(0, 240)))
  })
  await page.goto(`${base}?quality=low&diagnostics=1`, { waitUntil: 'domcontentloaded', timeout: 180000 })
  await page.getByRole('button', { name: 'Start Cruising', exact: true }).waitFor({ timeout: 120000 })
  await page.getByRole('button', { name: 'Start Cruising', exact: true }).click()
  await page.waitForFunction(() => window.__jeepNight?.().ready && window.__jeepNight?.().distance > 1, null, { timeout: 90000 })
  assert.equal(await page.locator('.ex-presence [role="status"]').count(), 0, `${name}: presence count appeared before consent`)
  return page
}
async function consent(page, enabled) {
  await page.getByRole('button', { name: 'Tune & discover', exact: true }).click()
  const checkbox = page.getByRole('checkbox', { name: 'Join anonymous cruiser presence', exact: true })
  await checkbox.scrollIntoViewIfNeeded()
  await checkbox.setChecked(enabled)
  await page.getByRole('button', { name: 'Close discovery panel', exact: true }).click()
}
async function waitCount(page, target, timeout = 15000) {
  await page.waitForFunction(expected => {
    const text = document.querySelector('.ex-presence [role="status"]')?.getAttribute('aria-label') || ''
    return Number(text.split(' ')[0]) >= expected
  }, target, { timeout })
  return count(page)
}
try {
  const a = await enter('A')
  result.checks.noCountBeforeConsentA = true
  await consent(a, true)
  let first
  try { first = await waitCount(a, 1, 20000) }
  catch {
    result.status = 'blocked'
    result.blocker = 'Opt-in produced no verified live count. Supabase configuration, connection, subscription or presence publication is unavailable; no count was invented.'
    result.observations.push({ stage: 'first-session-unavailable', ...await count(a) })
    await a.screenshot({ path: `${out}/unavailable.png` })
  }
  if (first) {
    result.observations.push({ stage: 'A-opted-in', ...first })
    const b = await enter('B')
    result.checks.noCountBeforeConsentB = true
    await consent(b, true)
    const [twoA, twoB] = await Promise.all([waitCount(a, 2), waitCount(b, 2)])
    result.observations.push({ stage: 'two-sessions-A', ...twoA }, { stage: 'two-sessions-B', ...twoB })
    assert.ok(!twoA.hidden && !twoB.hidden, 'Headless page visibility prevents a meaningful concurrent-session check')
    result.checks.twoLiveSessions = twoA.count >= 2 && twoB.count >= 2
    assert.ok(result.checks.twoLiveSessions, 'Two opted-in contexts did not observe two sessions')
    await a.screenshot({ path: `${out}/two-sessions.png` })
    await consent(b, false)
    await a.waitForFunction(previous => {
      const text = document.querySelector('.ex-presence [role="status"]')?.getAttribute('aria-label') || ''
      const current = Number(text.split(' ')[0])
      return current >= 1 && current < previous
    }, twoA.count, { timeout: 15000 })
    const afterLeave = await count(a)
    result.observations.push({ stage: 'B-opted-out-A-observes', ...afterLeave })
    result.checks.optOutRemovesSession = afterLeave.count < twoA.count && afterLeave.count >= 1
    assert.ok(result.checks.optOutRemovesSession, 'Opt-out did not remove the second session')
    assert.equal(await b.locator('.ex-presence [role="status"]').count(), 0, 'Opted-out context still displays a count')
    await a.screenshot({ path: `${out}/after-opt-out.png` })
    await consent(a, false)
    await a.waitForFunction(() => !document.querySelector('.ex-presence [role="status"]'), null, { timeout: 5000 })
    const [storedA, storedB] = await Promise.all([count(a), count(b)])
    result.checks.noPersistentPresenceIds = !storedA.visitorStored && !storedA.tabStored && !storedB.visitorStored && !storedB.tabStored
    assert.ok(result.checks.noPersistentPresenceIds, 'Leased presence wrote legacy persistent identity keys')
    assert.equal(result.errors.length, 0, 'Browser page exception during presence test')
    result.status = 'passed'
  }
} catch (error) {
  result.status = 'failed'
  result.failure = error.stack || String(error)
  process.exitCode = 1
} finally {
  result.limitations = ['No audience/unique-person verification; counts describe opted-in browser sessions.', 'No chat/voice or invitations were sent.', '45-second expiry is covered by the pure helper tests; this browser run checks real joins and explicit opt-out, not a simulated server failure.', 'Concurrent unrelated visitors could change counts; raw observations are preserved.']
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2))
  await Promise.all(contexts.map(context => context.close()))
  await browser.close()
  console.log(JSON.stringify({ status: result.status, checks: result.checks, blocker: result.blocker, failure: result.failure }))
}
