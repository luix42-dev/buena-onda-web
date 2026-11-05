'use client'

import { useEffect, useState } from 'react'
import { createMetricsStore, METRICS_CONSENT_KEY, METRICS_KEY, type MetricCounter, type MetricsReport } from '@/lib/experience/metrics'
import { downloadExperienceReport } from './useExperienceMetrics'

const LABELS: Record<MetricCounter, string> = {
  page_view: 'Measured experience page entries', session_start: 'Measured session starts', at_15_seconds: 'Sessions reaching 15 observed seconds', at_60_seconds: 'Sessions reaching 60 observed seconds', session_seconds: 'Observed experience seconds', listening_seconds: 'Observed eligible playback seconds', return_session: 'Subsequent measured starts in this browser', station_change: 'Station change actions', station_save: 'Station favorite actions', verified_song_save: 'Verified song-save actions', share: 'Completed link shares', postcard_share: 'Postcard shares or copied links', playback_failure: 'Playback failures',
}

export default function ExperienceReport() {
  const [report, setReport] = useState<MetricsReport | null>(null), [error, setError] = useState('')
  useEffect(() => {
    const refresh = () => { try { setReport(createMetricsStore(localStorage).report()); setError('') } catch { setError('Browser storage is unavailable. No report can be read.') } }
    const sync = (event: StorageEvent) => { if (event.key === null || event.key === METRICS_KEY || event.key === METRICS_CONSENT_KEY) refresh() }
    refresh(); window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const remove = () => { try { const store = createMetricsStore(localStorage); store.deleteReport(); setReport(store.report()); setError('') } catch { setError('Diagnostics could not be deleted from this browser.') } }
  return <main style={{ minHeight: '100vh', padding: '48px 24px', background: '#101719', color: '#f0e7d1', fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <a href="/cruise/experience" style={{ color: '#b7d6ca' }}>Back to Cruise</a>
      <h1>This browser’s diagnostics</h1>
      <p><strong>This browser only · opt-in · includes testing · not audience measurement</strong></p>
      <p>No account, station, track or location identifiers are recorded. These counters do not leave this browser unless you export and share them yourself.</p>
      {error && <p role="status">{error}</p>}
      {!report && !error && <p role="status">Reading local diagnostics…</p>}
      {report && <>
        <p>Collection: <strong>{report.collectionEnabled ? 'On' : 'Off'}</strong>. Retention: latest 30 UTC calendar days.</p>
        {report.status === 'corrupt' && <p role="alert">Saved data failed validation. It was excluded from this report. Delete it before enabling collection again.</p>}
        <p><button type="button" onClick={() => downloadExperienceReport(report)}>Export JSON</button>{' '}<button type="button" onClick={remove}>Delete diagnostics and turn collection off</button></p>
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '24px 0' }}><caption style={{ textAlign: 'left', marginBottom: 12 }}>Local counters; no unique-person or seven-day retention figures</caption><tbody>{Object.entries(report.totals).map(([name, value]) => <tr key={name}><th scope="row" style={{ textAlign: 'left', fontWeight: 400, padding: '8px 4px', borderBottom: '1px solid #364346' }}>{LABELS[name as MetricCounter]}</th><td style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #364346' }}>{Math.round(value * 10) / 10}</td></tr>)}</tbody></table>
        <h2>How to read this</h2>
        <ul>{report.limitations.map(line => <li key={line} style={{ marginBottom: 10 }}>{line}</li>)}</ul>
        <p>Visitor save-rate, audience session duration and seven-day return targets remain unmeasured. A deployment-wide collector and a defined consented cohort would require a separate decision.</p>
      </>}
    </div>
  </main>
}
