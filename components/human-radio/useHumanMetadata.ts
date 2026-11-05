'use client'

import { useEffect, useState } from 'react'
import { veridianPlaylistMetadata, type HumanRadioMetadata } from '@/lib/human-radio/metadata'
import { parseHumanRadioMetadata } from '@/lib/human-radio/metadata-validation'

export function useHumanMetadata(stationId: string, enabled: boolean, currentTrack: { src: string; title: string; artist: string; sourcePage?: string } | null = null) {
  const [value, setValue] = useState<HumanRadioMetadata | null>(null)
  useEffect(() => {
    setValue(null)
    if (!enabled || stationId === 'veridian-club') return
    let disposed = false, revision = 0
    let timer: ReturnType<typeof setTimeout>
    let controller: AbortController | undefined
    const refresh = async () => {
      const request = ++revision
      clearTimeout(timer)
      controller?.abort()
      const requestController = new AbortController()
      controller = requestController
      const timeout = setTimeout(() => requestController.abort(), 9000)
      let nextDelay = 20000
      try {
        const response = await fetch(`/api/cruise/human-radio/now-playing?station=${encodeURIComponent(stationId)}`, { signal: requestController.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Metadata unavailable')
        const data = parseHumanRadioMetadata(await response.json(), stationId)
        if (data) nextDelay = Math.min(20000, Math.max(1000, Date.parse(data.expiresAt) - Date.now() + 100))
        if (!disposed && request === revision) setValue(data)
      } catch { if (!disposed && request === revision) setValue(null) }
      finally { clearTimeout(timeout); if (!disposed && request === revision) timer = setTimeout(refresh, nextDelay) }
    }
    const visible = () => { if (!document.hidden) { clearTimeout(timer); setValue(null); void refresh() } }
    void refresh()
    document.addEventListener('visibilitychange', visible)
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', visible) }
  }, [stationId, enabled])
  // An old title must disappear even if the next request is slow or suspended.
  const [clock, setClock] = useState(Date.now())
  useEffect(() => { if (!enabled) return; const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer) }, [enabled])
  if (stationId === 'veridian-club') return enabled ? veridianPlaylistMetadata(currentTrack, Math.max(clock, Date.now())) : null
  return enabled && value?.stationId === stationId && Date.parse(value.expiresAt) > Math.max(clock, Date.now()) ? value : null
}
