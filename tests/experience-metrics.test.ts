import assert from 'node:assert/strict'
import test from 'node:test'
import { createMetricsStore, MAX_METRIC_DAYS, METRIC_EVENTS, METRICS_CONSENT_KEY, METRICS_KEY, parseMetrics, type MetricEvent, type MetricsStorage } from '../lib/experience/metrics'

const NOW = Date.parse('2026-10-15T14:00:00Z')
function memory() {
  const values = new Map<string, string>()
  let writes = 0
  const storage: MetricsStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); writes++ }, removeItem: key => { values.delete(key); writes++ } }
  return { values, storage, writes: () => writes }
}

test('default-off diagnostics never write counters or consent merely by reading', () => {
  const data = memory(), store = createMetricsStore(data.storage, () => NOW)
  assert.equal(store.isEnabled(), false)
  assert.equal(store.pageView(), false)
  assert.equal(store.startSession(), false)
  assert.equal(store.record('station_change'), false)
  assert.equal(store.addTime(1, 1), false)
  assert.equal(store.report().status, 'empty')
  assert.equal(data.writes(), 0)
})

test('strict event allowlist stores only coarse counts, not station/song/URL payloads', () => {
  const data = memory(), store = createMetricsStore(data.storage, () => NOW)
  store.setEnabled(true)
  for (const event of METRIC_EVENTS) assert.equal(store.record(event), true)
  assert.equal(store.record('artist' as MetricEvent), false)
  const report = store.report()
  for (const event of METRIC_EVENTS) assert.equal(report.totals[event], 1)
  assert.equal(report.days.length, 1)
  assert.equal(report.days[0].day, '2026-10-15')
  assert.ok(!JSON.stringify(report.days).includes('stationId'))
  assert.ok(!JSON.stringify(report.days).includes('https:'))
})

test('measured starts and milestones remain distinct from actions and audience claims', () => {
  const data = memory(), store = createMetricsStore(data.storage, () => NOW)
  store.setEnabled(true); store.pageView(); store.startSession()
  assert.equal(store.report().totals.return_session, 0)
  store.startSession(); store.milestone(15); store.milestone(60)
  const report = store.report()
  assert.equal(report.totals.page_view, 1)
  assert.equal(report.totals.session_start, 2)
  assert.equal(report.totals.return_session, 1)
  assert.equal(report.totals.at_15_seconds, 1)
  assert.equal(report.totals.at_60_seconds, 1)
  assert.ok(report.scope.includes('not audience measurement'))
  assert.ok(report.limitations.some(line => line.includes('seven-day retention')))
})

test('duration excludes invalid, suspended and impossible listening intervals', () => {
  const data = memory(), store = createMetricsStore(data.storage, () => NOW)
  store.setEnabled(true)
  assert.equal(store.addTime(5, 3), true)
  assert.equal(store.addTime(1.2, 1.2), true)
  for (const [session, listening] of [[16, 16], [0, 0], [-1, 0], [Infinity, 0], [NaN, 0], [5, 6], [5, -1], [5, NaN]]) assert.equal(store.addTime(session, listening), false)
  assert.equal(store.report().totals.session_seconds, 6.2)
  assert.equal(store.report().totals.listening_seconds, 4.2)
})

test('thirty-day storage bound rolls forward and removes expired buckets', () => {
  const data = memory(); let now = NOW
  const store = createMetricsStore(data.storage, () => now)
  store.setEnabled(true)
  for (let day = 0; day < 45; day++) { now = NOW + day * 86400000; store.record('share') }
  const report = store.report()
  assert.equal(report.days.length, MAX_METRIC_DAYS)
  assert.equal(report.totals.share, MAX_METRIC_DAYS)
  assert.equal(report.days[0].day, new Date(NOW + 15 * 86400000).toISOString().slice(0, 10))
  assert.ok(data.values.get(METRICS_KEY)!.length < 32768)
})

test('unknown identifiers, corrupt JSON, invalid numbers and oversized storage are denied', () => {
  const cases = [
    '{', 'x'.repeat(32769), JSON.stringify([]), JSON.stringify({ version: 2, days: [] }),
    JSON.stringify({ version: 1, days: [], stationId: 'private-taste' }),
    JSON.stringify({ version: 1, days: [{ day: '2026-10-16', counters: {} }] }),
    JSON.stringify({ version: 1, days: [{ day: '2026-02-30', counters: {} }] }),
    JSON.stringify({ version: 1, days: [{ day: '2026-10-15', counters: { artist: 'private-taste' } }] }),
    JSON.stringify({ version: 1, days: [{ day: '2026-10-15', counters: { share: -1 } }] }),
    JSON.stringify({ version: 1, days: [{ day: '2026-10-15', counters: { at_15_seconds: .5 } }] }),
    JSON.stringify({ version: 1, days: [{ day: '2026-10-15', counters: { share: 10000001 } }] }),
    JSON.stringify({ version: 1, days: Array.from({ length: 31 }, () => ({ day: '2026-10-15', counters: {} })) }),
  ]
  for (const raw of cases) assert.equal(parseMetrics(raw, NOW), null)
})

test('corrupt records cannot be merged or exported as valid; explicit deletion repairs state', () => {
  const data = memory(); data.values.set(METRICS_KEY, '{"stationId":"do-not-export"}')
  const store = createMetricsStore(data.storage, () => NOW)
  assert.throws(() => store.setEnabled(true), /invalid/)
  data.values.set(METRICS_CONSENT_KEY, 'on')
  assert.throws(() => store.record('share'), /invalid/)
  const report = store.report()
  assert.equal(report.status, 'corrupt')
  assert.ok(!JSON.stringify(report).includes('do-not-export'))
  store.deleteReport(); store.setEnabled(true)
  assert.equal(store.record('share'), true)
})

test('revocation from another tab makes stale writers no-ops and preserves music collections', () => {
  const data = memory(), first = createMetricsStore(data.storage, () => NOW), stale = createMetricsStore(data.storage, () => NOW)
  data.values.set('buena-onda:finds:v1', 'preserve finds')
  data.values.set('buena-onda:favorites:v1', 'preserve presets')
  first.setEnabled(true); stale.record('station_save')
  first.setEnabled(false)
  assert.equal(stale.record('station_change'), false)
  assert.equal(stale.startSession(), false)
  assert.equal(stale.addTime(5, 5), false)
  assert.equal(data.values.has(METRICS_KEY), false)
  assert.equal(data.values.get(METRICS_CONSENT_KEY), 'off')
  assert.equal(data.values.get('buena-onda:finds:v1'), 'preserve finds')
  assert.equal(data.values.get('buena-onda:favorites:v1'), 'preserve presets')
})

test('deletion disables collection so another mounted tab cannot resurrect diagnostics', () => {
  const data = memory(), first = createMetricsStore(data.storage, () => NOW), stale = createMetricsStore(data.storage, () => NOW)
  first.setEnabled(true); stale.startSession(); first.deleteReport()
  assert.equal(stale.isEnabled(), false)
  assert.equal(stale.pageView(), false)
  assert.equal(stale.report().status, 'empty')
  assert.equal(stale.report().totals.session_start, 0)
})

test('blocked storage surfaces failure without silently enabling or sending anything', () => {
  const blocked: MetricsStorage = { getItem: () => { throw new Error('storage blocked') }, setItem: () => { throw new Error('storage blocked') }, removeItem: () => { throw new Error('storage blocked') } }
  const store = createMetricsStore(blocked, () => NOW)
  assert.throws(() => store.setEnabled(true), /blocked/)
  assert.throws(() => store.record('share'), /blocked/)
  assert.throws(() => store.report(), /blocked/)
})
