'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { HUMAN_RADIO_STATIONS } from '@/lib/human-radio/stations'
import { currentDiscovery, discoveryId, exportFinds as serializeFinds, FAVORITES_KEY, FINDS_KEY, LEGACY_FINDS_KEY, MAX_FINDS, moveFavorite as reorderFavorite, parseFavorites, parseFinds, readCollections, type Discovery, type DiscoveryMetadata } from '@/lib/human-radio/finds'

const stationIds = HUMAN_RADIO_STATIONS.map(station => station.id)
export function useDiscoveries({ metadata, stationName, playing, loading }: { metadata: DiscoveryMetadata | null; stationName: string; playing: boolean; loading: boolean }) {
  const [saved, setSaved] = useState<Discovery[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [storageError, setStorageError] = useState('')
  const [clock, setClock] = useState(Date.now())
  const savedRef = useRef(saved), favoritesRef = useRef(favorites)
  const setFinds = useCallback((items: Discovery[]) => { savedRef.current = items; setSaved(items) }, [])
  const setPresets = useCallback((items: string[]) => { favoritesRef.current = items; setFavorites(items) }, [])
  useEffect(() => {
    try {
      const values = readCollections(localStorage, stationIds)
      setFinds(values.saved); setPresets(values.favorites)
      // Preserve the legacy key and never overwrite an existing new collection.
      if (values.migrated) localStorage.setItem(FINDS_KEY, JSON.stringify(values.saved))
    } catch { setStorageError('Browser storage could not be read. Changes remain available for this session.') }
    const sync = (event: StorageEvent) => {
      try {
        if (event.storageArea && event.storageArea !== localStorage) return
        if (event.key === FINDS_KEY || event.key === null) setFinds(parseFinds(event.key === null ? null : event.newValue, stationIds))
        if (event.key === FAVORITES_KEY || event.key === null) setPresets(parseFavorites(event.key === null ? null : event.newValue, stationIds))
        if (event.key === LEGACY_FINDS_KEY && localStorage.getItem(FINDS_KEY) === null) setFinds(parseFinds(event.newValue, stationIds))
      } catch { setStorageError('Another tab supplied invalid saved data. Your current list was kept.') }
    }
    window.addEventListener('storage', sync)
    const timer = setInterval(() => setClock(Date.now()), 5000)
    return () => { window.removeEventListener('storage', sync); clearInterval(timer) }
  }, [setFinds, setPresets])
  const persist = useCallback((key: string, value: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(value)); setStorageError('') }
    catch { setStorageError('Browser storage is unavailable. These changes last for this session; export your finds to keep them.') }
  }, [])
  const current = currentDiscovery(metadata, stationName, playing, loading, stationIds, Math.max(clock, Date.now()))
  const isSaved = !!current && saved.some(item => item.id === current.id)
  const toggleSave = useCallback(() => {
    // Recheck freshness at the action, including if the screen has been idle.
    const item = currentDiscovery(metadata, stationName, playing, loading, stationIds)
    if (!item) return
    const prior = savedRef.current
    const next = prior.some(entry => entry.id === discoveryId(item)) ? prior.filter(entry => entry.id !== item.id) : [item, ...prior].slice(0, MAX_FINDS)
    setFinds(next); persist(FINDS_KEY, next)
  }, [metadata, stationName, playing, loading, persist, setFinds])
  const remove = useCallback((id: string) => { const next = savedRef.current.filter(item => item.id !== id); setFinds(next); persist(FINDS_KEY, next) }, [persist, setFinds])
  const toggleFavorite = useCallback((id: string) => {
    if (!stationIds.includes(id)) return
    const prior = favoritesRef.current, next = prior.includes(id) ? prior.filter(value => value !== id) : [...prior, id]
    setPresets(next); persist(FAVORITES_KEY, next)
  }, [persist, setPresets])
  const moveFavorite = useCallback((id: string, direction: 'up' | 'down') => {
    const next = reorderFavorite(favoritesRef.current, id, direction)
    setPresets(next); persist(FAVORITES_KEY, next)
  }, [persist, setPresets])
  const exportFinds = useCallback(() => serializeFinds(savedRef.current, stationIds), [])
  return { saved, canSave: !!current, isSaved, toggleSave, remove, exportFinds, storageError, favorites, toggleFavorite, moveFavorite }
}
