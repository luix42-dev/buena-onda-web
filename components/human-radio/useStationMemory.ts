'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { parseStationPreference, STATION_MEMORY_KEY } from '@/lib/human-radio/station-memory'

/** Preference only. The parent owns initial station restoration and audio. */
export function useStationMemory(active: boolean, stationId: string, eligibleIds: readonly string[]) {
  const [enabled, setEnabled] = useState(false), [error, setError] = useState('')
  const hydrated = useRef(false), lastWritten = useRef<string | null>(null)
  useEffect(() => {
    if (!active) return
    try {
      const preference = parseStationPreference(localStorage.getItem(STATION_MEMORY_KEY), eligibleIds)
      lastWritten.current = preference?.stationId || null
      setEnabled(!!preference)
    } catch { setError('Station memory could not be read. Radio still works for this visit.') }
    hydrated.current = true
  }, [active, eligibleIds])
  useEffect(() => {
    if (!active || !hydrated.current || !enabled || !eligibleIds.includes(stationId) || stationId === lastWritten.current) return
    try {
      localStorage.setItem(STATION_MEMORY_KEY, JSON.stringify({ version: 1, enabled: true, stationId }))
      lastWritten.current = stationId; setError('')
    } catch { setError('Station memory could not be saved. Your current station still works for this visit.') }
  }, [active, enabled, stationId, eligibleIds])
  const toggle = useCallback(() => {
    if (!active) return
    const next = !enabled; setEnabled(next)
    try {
      if (next && eligibleIds.includes(stationId)) {
        localStorage.setItem(STATION_MEMORY_KEY, JSON.stringify({ version: 1, enabled: true, stationId })); lastWritten.current = stationId
      } else if (!next) { localStorage.removeItem(STATION_MEMORY_KEY); lastWritten.current = null }
      setError('')
    } catch { setError('This browser could not keep the station preference. Radio remains available.') }
  }, [active, enabled, eligibleIds, stationId])
  return { enabled, toggle, error }
}
