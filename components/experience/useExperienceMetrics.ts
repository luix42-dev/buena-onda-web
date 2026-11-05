'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createMetricsStore, METRICS_CONSENT_KEY, METRICS_KEY, type MetricEvent, type MetricsReport } from '@/lib/experience/metrics'

type Inputs = { started: boolean; playing: boolean; muted: boolean; volume: number; elapsed: number; active?: boolean }
type Store = ReturnType<typeof createMetricsStore>
export type ExperienceMetricsController = {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  record: (event: MetricEvent) => void
  report: MetricsReport | null
  exportReport: () => void
  deleteReport: () => void
  error: string
}

/** Local only. The caller supplies player state; no song/station data is accepted. */
export function useExperienceMetrics(inputs: Inputs): ExperienceMetricsController {
  const latest = useRef(inputs); latest.current = inputs
  const store = useRef<Store | null>(null)
  const halted = useRef(false)
  const [enabled, setEnabledState] = useState(false), [report, setReport] = useState<MetricsReport | null>(null), [error, setError] = useState('')
  const marks = useRef({ page: false, start: false, seconds: 0, fifteen: false, sixty: false })
  const previous = useRef<{ at: number; inputs: Inputs } | null>(null)
  const reset = useCallback(() => { marks.current = { page: false, start: false, seconds: 0, fifteen: false, sixty: false }; previous.current = null }, [])
  const refresh = useCallback(() => {
    if (!store.current || latest.current.active === false) return
    setEnabledState(store.current.isEnabled()); setReport(store.current.report())
  }, [])
  const failed = useCallback((failure: unknown) => {
    setError(failure instanceof Error ? failure.message : 'Browser diagnostics storage is unavailable.')
    halted.current = true; setEnabledState(false); previous.current = null
  }, [])

  useEffect(() => {
    if (inputs.active === false) { store.current = null; setEnabledState(false); setReport(null); reset(); return }
    halted.current = false
    try { store.current = createMetricsStore(window.localStorage); refresh() } catch (failure) { failed(failure) }
    const tick = () => {
      const currentStore = store.current
      if (!currentStore || halted.current || latest.current.active === false) return
      try {
        if (!currentStore.isEnabled()) { previous.current = null; setEnabledState(false); return }
        const current = latest.current, at = performance.now(), prior = previous.current
        previous.current = { at, inputs: { ...current } }
        if (!marks.current.page && currentStore.pageView()) marks.current.page = true
        if (current.started && !marks.current.start && currentStore.startSession()) marks.current.start = true
        if (prior && prior.inputs.started && current.started && marks.current.start && current.elapsed >= prior.inputs.elapsed) {
          const seconds = (at - prior.at) / 1000
          const audible = current.playing && !current.muted && current.volume > 0 && prior.inputs.playing && !prior.inputs.muted && prior.inputs.volume > 0
          if (currentStore.addTime(seconds, audible ? seconds : 0)) marks.current.seconds += seconds
        }
        if (marks.current.seconds >= 15 && !marks.current.fifteen && currentStore.milestone(15)) marks.current.fifteen = true
        if (marks.current.seconds >= 60 && !marks.current.sixty && currentStore.milestone(60)) marks.current.sixty = true
        refresh()
      } catch (failure) { failed(failure) }
    }
    const changed = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return
      if (event.key !== null && event.key !== METRICS_KEY && event.key !== METRICS_CONSENT_KEY) return
      try {
        if (!store.current?.isEnabled()) reset()
        refresh()
      } catch (failure) { failed(failure) }
    }
    const timer = setInterval(tick, 1000)
    window.addEventListener('storage', changed)
    return () => { clearInterval(timer); window.removeEventListener('storage', changed); store.current = null }
  }, [inputs.active, failed, refresh, reset])

  const setEnabled = useCallback((next: boolean) => {
    if (latest.current.active === false) return
    try {
      store.current?.setEnabled(next); halted.current = false; reset(); refresh(); setError('')
    } catch (failure) { failed(failure) }
  }, [failed, refresh, reset])
  const record = useCallback((event: MetricEvent) => {
    if (latest.current.active === false || halted.current) return
    try { if (store.current?.record(event)) refresh() } catch (failure) { failed(failure) }
  }, [failed, refresh])
  const deleteReport = useCallback(() => {
    if (latest.current.active === false) return
    try { store.current?.deleteReport(); halted.current = false; reset(); refresh(); setError('') } catch (failure) { failed(failure) }
  }, [failed, refresh, reset])
  const exportReport = useCallback(() => {
    try {
      if (!store.current || latest.current.active === false) return
      downloadExperienceReport(store.current.report())
    } catch (failure) { failed(failure) }
  }, [failed])
  return { enabled, setEnabled, record, report, exportReport, deleteReport, error }
}

export function downloadExperienceReport(report: MetricsReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = 'buena-onda-browser-diagnostics.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
