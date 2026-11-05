/** Local technical counters only. This module has no network capability. */
export const METRICS_KEY = 'buena-onda:experience:metrics:v1'
export const METRICS_CONSENT_KEY = 'buena-onda:experience:metrics-consent:v1'
export const MAX_METRIC_DAYS = 30
const MAX_BYTES = 32768
const MAX_COUNT = 10_000_000
const DAY_MS = 86_400_000

export const METRIC_EVENTS = ['station_change', 'station_save', 'verified_song_save', 'share', 'postcard_share', 'playback_failure'] as const
export type MetricEvent = typeof METRIC_EVENTS[number]
const COUNTERS = ['page_view', 'session_start', 'at_15_seconds', 'at_60_seconds', 'session_seconds', 'listening_seconds', 'return_session', ...METRIC_EVENTS] as const
export type MetricCounter = typeof COUNTERS[number]
export type MetricTotals = Record<MetricCounter, number>
export type MetricDay = { day: string; counters: Partial<MetricTotals> }
export type MetricsData = { version: 1; days: MetricDay[] }
export type MetricsStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type MetricsReport = {
  version: 1
  scope: 'This browser only — opt-in diagnostics, includes testing; not audience measurement'
  capturedAt: string
  collectionEnabled: boolean
  status: 'empty' | 'valid' | 'corrupt'
  totals: MetricTotals
  days: MetricDay[]
  limitations: string[]
}

const empty = (): MetricsData => ({ version: 1, days: [] })
const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10)
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every(key => keys.includes(key))
const counterName = (value: string): value is MetricCounter => (COUNTERS as readonly string[]).includes(value)

/** Strict schema: unknown fields, identifiers, future buckets and bad numbers are rejected. */
export function parseMetrics(raw: string | null, now = Date.now()): MetricsData | null {
  if (raw === null) return empty()
  if (raw.length > MAX_BYTES) return null
  try {
    const data: unknown = JSON.parse(raw)
    if (!plain(data) || !onlyKeys(data, ['version', 'days']) || data.version !== 1 || !Array.isArray(data.days) || data.days.length > MAX_METRIC_DAYS) return null
    const days: MetricDay[] = [], seen = new Set<string>(), today = utcDay(now)
    for (const item of data.days) {
      if (!plain(item) || !onlyKeys(item, ['day', 'counters']) || typeof item.day !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(item.day) || !Number.isFinite(Date.parse(item.day)) || utcDay(Date.parse(item.day)) !== item.day || item.day > today || seen.has(item.day) || !plain(item.counters)) return null
      const counters: Partial<MetricTotals> = {}
      for (const [key, value] of Object.entries(item.counters)) {
        if (!counterName(key) || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_COUNT || (key !== 'session_seconds' && key !== 'listening_seconds' && !Number.isInteger(value))) return null
        counters[key] = value
      }
      seen.add(item.day)
      if (Date.parse(item.day) >= Date.parse(today) - (MAX_METRIC_DAYS - 1) * DAY_MS) days.push({ day: item.day, counters })
    }
    return { version: 1, days: days.sort((a, b) => a.day.localeCompare(b.day)) }
  } catch { return null }
}

export function metricTotals(data: MetricsData): MetricTotals {
  const totals = Object.fromEntries(COUNTERS.map(name => [name, 0])) as MetricTotals
  for (const item of data.days) for (const name of COUNTERS) totals[name] += item.counters[name] || 0
  return totals
}

export function createMetricsStore(storage: MetricsStorage, now: () => number = Date.now) {
  const isEnabled = () => storage.getItem(METRICS_CONSENT_KEY) === 'on'
  const read = () => parseMetrics(storage.getItem(METRICS_KEY), now())
  const update = (change: (totals: MetricTotals) => Partial<MetricTotals>) => {
    // Recheck shared consent immediately before each synchronous write. A stale
    // tab cannot resurrect data after another tab revokes/deletes it.
    if (!isEnabled()) return false
    const data = read()
    if (!data) throw new Error('Saved diagnostics are invalid. Delete them before collecting again.')
    const additions = change(metricTotals(data)), day = utcDay(now())
    let bucket = data.days.find(item => item.day === day)
    if (!bucket) { bucket = { day, counters: {} }; data.days.push(bucket) }
    for (const [name, amount] of Object.entries(additions)) {
      if (!counterName(name) || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error('Invalid metric counter')
      bucket.counters[name] = Math.min(MAX_COUNT, Math.round(((bucket.counters[name] || 0) + amount) * 10) / 10)
    }
    data.days = data.days.slice(-MAX_METRIC_DAYS)
    if (!isEnabled()) return false
    storage.setItem(METRICS_KEY, JSON.stringify(data))
    return true
  }
  const deleteReport = () => {
    storage.setItem(METRICS_CONSENT_KEY, 'off')
    storage.removeItem(METRICS_KEY)
  }
  return {
    isEnabled,
    setEnabled(enabled: boolean) {
      if (!enabled) { deleteReport(); return }
      if (!read()) throw new Error('Saved diagnostics are invalid. Delete them before collecting again.')
      storage.setItem(METRICS_CONSENT_KEY, 'on')
    },
    deleteReport,
    pageView: () => update(() => ({ page_view: 1 })),
    startSession: () => update(totals => ({ session_start: 1, ...(totals.session_start > 0 ? { return_session: 1 } : {}) })),
    milestone: (seconds: 15 | 60) => seconds === 15 || seconds === 60 ? update(() => ({ [seconds === 15 ? 'at_15_seconds' : 'at_60_seconds']: 1 })) : false,
    record(event: MetricEvent) {
      if (!(METRIC_EVENTS as readonly string[]).includes(event)) return false
      return update(() => ({ [event]: 1 }))
    },
    addTime(sessionSeconds: number, listeningSeconds: number) {
      // Large or invalid timer gaps are unknown, never backfilled as listening.
      if (!Number.isFinite(sessionSeconds) || !Number.isFinite(listeningSeconds) || sessionSeconds <= 0 || sessionSeconds > 15 || listeningSeconds < 0 || listeningSeconds > sessionSeconds) return false
      return update(() => ({ session_seconds: sessionSeconds, listening_seconds: listeningSeconds }))
    },
    report(): MetricsReport {
      const raw = storage.getItem(METRICS_KEY), parsed = parseMetrics(raw, now()), data = parsed || empty()
      return {
        version: 1,
        scope: 'This browser only — opt-in diagnostics, includes testing; not audience measurement',
        capturedAt: new Date(now()).toISOString(), collectionEnabled: isEnabled(), status: parsed ? raw === null ? 'empty' : 'valid' : 'corrupt', totals: metricTotals(data), days: data.days,
        limitations: [
          'No data is sent by these counters. This report cannot measure audience size, unique visitors, visitor conversion or seven-day retention.',
          'Seconds are observed eligible intervals, not verified human attention. Suspended or delayed timer gaps over 15 seconds are excluded; background playback may be undercounted.',
          '15/60-second milestones refer to observed experience time after a measured start, not elapsed page age. Open sessions are included and may be incomplete.',
          'Return sessions are subsequent measured starts in the retained browser data, including reloads and tests; they are not returning people.',
          'Multiple tabs can overwrite concurrent localStorage increments. Counts are diagnostic estimates; devices, profiles, private windows and cleared storage are separate.',
          'Only the latest 30 UTC calendar days are retained. Session seconds include parked experience time; listening requires playing, unmuted and volume above zero.',
        ],
      }
    },
  }
}
