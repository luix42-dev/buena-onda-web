'use client'

import type { ExperienceMetricsController } from './useExperienceMetrics'

export default function ExperienceMetricsControls({ metrics }: { metrics: ExperienceMetricsController }) {
  return <details className="experience-metrics" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.5 }}>
    <summary>Optional browser diagnostics</summary>
    <label style={{ display: 'block', marginTop: 8 }}><input type="checkbox" checked={metrics.enabled} onChange={event => metrics.setEnabled(event.target.checked)} /> Save technical counters in this browser</label>
    <p>Nothing is sent by these counters. No station or song names are saved. Turning this off deletes these diagnostics; your finds stay.</p>
    <p><a href="/cruise/experience/report" target="_blank" rel="noreferrer">View this browser’s report</a></p>
    <button type="button" onClick={metrics.exportReport}>Export diagnostics</button>{' '}
    <button type="button" onClick={metrics.deleteReport}>Delete diagnostics and turn off</button>
    {metrics.error && <p role="status">{metrics.error}</p>}
  </details>
}
