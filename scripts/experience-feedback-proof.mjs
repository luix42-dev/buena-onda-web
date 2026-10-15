import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
let chromium
try { ({ chromium } = require('@playwright/test')) }
catch { ({ chromium } = createRequire(new URL('../../cruise-master-20261005/package.json', import.meta.url))('@playwright/test')) }
const base = process.env.EXPERIENCE_FEEDBACK_URL || 'http://127.0.0.1:3076/real-miami/experience/playtest-feedback.html'
const out = 'docs/cruise/experience/evidence/phase5-feedback'
await mkdir(out, { recursive: true })
const result = { at: new Date().toISOString(), url: base, environment: 'Automated QA fixtures in headless Edge; desktop and mobile viewport emulation, NOT real playtest feedback or physical-device validation', checks: {}, requests: [], errors: [], status: 'pending' }
const browser = await chromium.launch({ channel: 'msedge', headless: true })
result.browser = browser.version()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] })
const page = await context.newPage()
page.on('pageerror', error => result.errors.push(error.message))
page.on('request', request => result.requests.push({ url: request.url(), method: request.method(), type: request.resourceType() }))
await page.addInitScript(() => {
  window.__qaStorageWrites = []
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method]
    Storage.prototype[method] = function (...args) { window.__qaStorageWrites.push(method); return original.apply(this, args) }
  }
})
try {
  await page.goto(base, { waitUntil: 'networkidle', timeout: 45000 })
  await page.getByRole('heading', { name: 'What stayed with you?' }).waitFor()
  assert.equal(await page.locator('#memorable').getAttribute('maxlength'), '1000')
  assert.equal(await page.locator('#blocked').getAttribute('maxlength'), '1000')
  result.checks.accessibleQuestionsAndBounds = true
  await page.getByRole('button', { name: 'Download feedback JSON' }).click()
  assert.equal(await page.locator('input[name="return"]:checked').count(), 0)
  assert.equal(await page.locator('#status').textContent(), '')
  result.checks.returnChoiceRequired = true
  await page.getByLabel('Which moment stayed with you?').fill('QA FIXTURE ONLY — the skyline reveal.')
  await page.getByLabel('What got in your way?').fill('QA FIXTURE ONLY — testing this local form, not a person’s assessment.')
  await page.getByRole('radio', { name: 'Maybe', exact: true }).check()
  await page.getByLabel('What did you use?').selectOption('desktop-laptop')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download feedback JSON' }).click()
  const download = await downloading
  assert.equal(download.suggestedFilename(), 'buena-onda-playtest-feedback.json')
  await download.saveAs(`${out}/qa-fixture-feedback.json`)
  const feedback = JSON.parse(await readFile(`${out}/qa-fixture-feedback.json`, 'utf8'))
  assert.deepEqual(Object.keys(feedback).sort(), ['feedback', 'kind', 'version'])
  assert.equal(feedback.feedback.wouldReturn, 'maybe')
  assert.equal(feedback.feedback.deviceClass, 'desktop-laptop')
  assert.ok(feedback.feedback.memorableMoment.startsWith('QA FIXTURE ONLY'))
  assert.ok(!JSON.stringify(feedback).includes('timestamp'))
  result.checks.explicitDownloadSafeSchema = true
  await page.getByRole('button', { name: 'Copy feedback', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Feedback copied.' }).waitFor()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  assert.deepEqual(JSON.parse(copied), feedback)
  result.checks.explicitClipboard = true
  await page.evaluate(() => { document.getElementById('memorable').value = 'x'.repeat(1200) })
  const longDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download feedback JSON' }).click()
  await (await longDownload).saveAs(`${out}/qa-bounded-feedback.json`)
  assert.equal(JSON.parse(await readFile(`${out}/qa-bounded-feedback.json`, 'utf8')).feedback.memorableMoment.length, 1000)
  result.checks.exportClampsProgrammaticOverflow = true
  await page.getByLabel('Which moment stayed with you?').fill('QA FIXTURE ONLY — the skyline reveal.')
  const link = page.getByRole('link', { name: 'Open Cruise in another tab' })
  assert.equal(await link.getAttribute('href'), '/cruise/experience')
  assert.equal(await link.getAttribute('target'), '_blank')
  assert.ok((await link.getAttribute('rel')).includes('noreferrer'))
  result.checks.cruiseLinkPreservesCurrentTab = true
  await page.screenshot({ path: `${out}/desktop.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: `${out}/mobile-portrait.png`, fullPage: true })
  await page.setViewportSize({ width: 844, height: 390 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: `${out}/mobile-landscape.png`, fullPage: true })
  result.checks.mobileViewportNoOverflow = true
  assert.equal(await page.evaluate(() => window.__qaStorageWrites.length), 0)
  result.checks.noAutomaticStorage = true
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await page.locator('#memorable').inputValue(), '')
  assert.equal(await page.locator('#blocked').inputValue(), '')
  result.checks.answersNotAutomaticallyRestored = true
  assert.ok(result.requests.every(request => request.url === base && request.method === 'GET' && request.type === 'document'))
  assert.equal(result.errors.length, 0)
  result.checks.noSubmissionOrExternalNetwork = true
  result.status = 'passed'
} catch (error) {
  result.status = 'failed'; result.failure = error.stack || String(error)
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {})
  process.exitCode = 1
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2))
  await context.close(); await browser.close()
}
console.log(JSON.stringify(result, null, 2))
