'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { useCruiseAudio } from './useCruiseAudio'
import type { CruiseNowPlaying } from '@/lib/real-miami/now-playing'

export type NowPlaying = CruiseNowPlaying
export type SavedRadioItem = { id: string; stationId: string; stationName: string; title: string; artist: string | null; kind: 'track' | 'show'; savedAt: string; source: string | null }
const KEY = 'buena-onda:saved-radio:v1'
const text = (value: unknown, max = 240): string | null => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
function validItem(value: unknown): value is SavedRadioItem {
  if (!value || typeof value !== 'object') return false
  const item = value as SavedRadioItem
  return !!text(item.id) && !!text(item.stationId) && !!text(item.stationName) && !!text(item.title) && (item.artist === null || typeof item.artist === 'string') && (item.kind === 'track' || item.kind === 'show') && typeof item.savedAt === 'string' && (item.source === null || typeof item.source === 'string')
}
export function useRadioLibrary(audio: ReturnType<typeof useCruiseAudio>) {
  const [remote, setRemote] = useState<NowPlaying | null>(null)
  const [saved, setSaved] = useState<SavedRadioItem[]>([])
  const [storageError, setStorageError] = useState('')
  const [metadataRevision, setMetadataRevision] = useState(0)
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') { setRemote(null); setMetadataRevision(value => value + 1) } }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])
  useEffect(() => {
    try { const data: unknown = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(data)) setSaved(data.filter(validItem).slice(0, 200)) }
    catch { setStorageError('Saved songs could not be read in this browser.') }
    const sync = (event: StorageEvent) => { if (event.key !== KEY) return; try { const data: unknown = JSON.parse(event.newValue || '[]'); setSaved(Array.isArray(data) ? data.filter(validItem).slice(0, 200) : []) } catch { /* Keep the existing list on malformed external data. */ } }
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync)
  }, [])
  const persist = useCallback((items: SavedRadioItem[]) => {
    setSaved(items)
    try { localStorage.setItem(KEY, JSON.stringify(items)); setStorageError('') }
    catch { setStorageError('Browser storage is unavailable. This list lasts for this session.') }
  }, [])
  useEffect(() => {
    setRemote(null)
    if (!audio.requested || audio.station.playback === 'playlist') return
    let stopped = false, timer: ReturnType<typeof setTimeout>, controller: AbortController | null = null
    const poll = async () => {
      controller = new AbortController(); const timeout = setTimeout(() => controller?.abort(), 8000)
      try {
        const response = await fetch(`/api/cruise/now-playing?station=${encodeURIComponent(audio.stationId)}`, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Metadata unavailable')
        const data = await response.json()
        if (!stopped && data.stationId === audio.stationId) setRemote({ stationId: audio.stationId, title: text(data.title), artist: text(data.artist), kind: data.kind === 'track' || data.kind === 'show' ? data.kind : 'unavailable', available: data.available === true && !!text(data.title), source: typeof data.source === 'string' && /^https:\/\//.test(data.source) ? data.source : null, observedAt: typeof data.observedAt === 'string' ? data.observedAt : new Date().toISOString() })
      } catch { if (!stopped) setRemote(null) }
      finally { clearTimeout(timeout); if (!stopped) timer = setTimeout(poll, 25000) }
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer); controller?.abort() }
  }, [audio.stationId, audio.station.playback, audio.requested, metadataRevision])
  const nowPlaying = useMemo<NowPlaying>(() => {
    if (audio.station.playback === 'playlist' && audio.trackTitle) return { stationId: audio.stationId, title: audio.trackTitle, artist: null, kind: 'track', available: true, source: null, observedAt: new Date().toISOString() }
    return remote?.stationId === audio.stationId ? remote : { stationId: audio.stationId, title: null, artist: null, kind: 'unavailable', available: false, source: null, observedAt: new Date().toISOString() }
  }, [audio.stationId, audio.station.playback, audio.trackTitle, remote])
  const displayTitle = nowPlaying.available ? [nowPlaying.artist, nowPlaying.title].filter(Boolean).join(' - ') : ''
  const itemId = `${audio.stationId}:${nowPlaying.kind}:${displayTitle.toLocaleLowerCase()}`
  const isSaved = saved.some(item => item.id === itemId)
  const fresh = () => audio.station.playback === 'playlist' || (Date.now() - Date.parse(nowPlaying.observedAt) < 75000 && Date.parse(nowPlaying.observedAt) <= Date.now() + 10000)
  const canSave = audio.playing && !audio.loading && nowPlaying.available && nowPlaying.kind !== 'unavailable' && fresh()
  const toggleSave = () => {
    if (!canSave || !fresh() || !nowPlaying.title || nowPlaying.kind === 'unavailable') return
    if (isSaved) persist(saved.filter(item => item.id !== itemId))
    else persist([{ id: itemId, stationId: audio.stationId, stationName: audio.station.name, title: nowPlaying.title, artist: nowPlaying.artist, kind: nowPlaying.kind, savedAt: new Date().toISOString(), source: nowPlaying.source }, ...saved].slice(0, 200))
  }
  return { nowPlaying, displayTitle, saved, isSaved, canSave, toggleSave, remove: (id: string) => persist(saved.filter(item => item.id !== id)), storageError }
}
