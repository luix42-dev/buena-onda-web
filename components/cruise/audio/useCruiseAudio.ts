'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { canPlayCruiseStation, DEFAULT_CRUISE_STATION, getCruiseStation } from '@/lib/cruise/stations'
import type { CruiseStation } from '@/lib/cruise/types'
import type { MusicAudio } from '@/lib/cruise/music-audio'

type RadioTrack = {
  src: string
  title: string
  artist: string
}

type CruiseAudio = {
  start: () => void
  toggle: () => void
  pause: () => void
  playing: boolean
  requested: boolean
  loading: boolean
  error: string | null
  volume: number
  setVolume: (volume: number) => void
  muted: boolean
  setMuted: (muted: boolean) => void
  trackTitle: string
  available: boolean
  stationId: string
  station: CruiseStation
  selectStation: (id: string) => boolean
  nextTrack: () => void
  previousTrack: () => void
  canSkip: boolean
}

const DEFAULT_VOLUME = 0.82
const RADIO_LOADING_TIMEOUT_MS = 12_000
// A short 8 kHz mono WAV lets the first gesture unlock this media element even
// when the radio manifest is still in flight. The fetched track reuses it.
const AUDIO_UNLOCK_SRC = 'data:audio/wav;base64,UklGRqQCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYACAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA'

function isTrack(value: unknown): value is RadioTrack {
  if (!value || typeof value !== 'object') return false
  const track = value as Partial<RadioTrack>
  return (
    typeof track.src === 'string' &&
    track.src.length > 0 &&
    typeof track.title === 'string' &&
    typeof track.artist === 'string'
  )
}

function labelFor(track: RadioTrack | undefined) {
  if (!track) return ''
  return track.artist ? `${track.artist} - ${track.title}` : track.title
}

function isBlockedPlayback(error: unknown) {
  return error instanceof DOMException && error.name === 'NotAllowedError'
}

export function useCruiseAudio(music?: MusicAudio): CruiseAudio {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const tracksRef = useRef<RadioTrack[]>([])
  const trackIndexRef = useRef(0)
  const wantsPlaybackRef = useRef(false)
  const failedTracksRef = useRef(0)
  const sourceRevisionRef = useRef(0)
  const unlockedRef = useRef(false)
  const unlockPromiseRef = useRef<Promise<void> | null>(null)
  const mountedRef = useRef(false)
  const fetchingRef = useRef(false)
  const fetchControllerRef = useRef<AbortController | null>(null)
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stationRef = useRef<CruiseStation>(DEFAULT_CRUISE_STATION)

  const [playing, setPlaying] = useState(false)
  const [requested, setRequested] = useState(false)
  const setPlaybackIntent = useCallback((value:boolean) => { wantsPlaybackRef.current=value; setRequested(value) }, [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME)
  const [muted, setMutedState] = useState(false)
  const [trackTitle, setTrackTitle] = useState('')
  const [available, setAvailable] = useState(false)
  const [station, setStation] = useState<CruiseStation>(DEFAULT_CRUISE_STATION)
  const [canSkip, setCanSkip] = useState(false)

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current !== null) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
  }, [])

  const armPlaybackLoadingTimeout = useCallback((revision: number) => {
    const audio = audioRef.current
    if (!audio) return
    clearLoadingTimeout()
    loadingTimeoutRef.current = setTimeout(() => {
      loadingTimeoutRef.current = null
      if (!mountedRef.current || !wantsPlaybackRef.current || revision !== sourceRevisionRef.current) return
      setPlaybackIntent(false)
      audio.pause()
      setPlaying(false)
      setLoading(false)
      setError('Radio signal timed out. Tap play to retry.')
    }, RADIO_LOADING_TIMEOUT_MS)
  }, [clearLoadingTimeout])

  const prepareTrack = useCallback((index: number, force = false) => {
    const audio = audioRef.current
    const tracks = tracksRef.current
    if (!audio || tracks.length === 0) return null

    const normalizedIndex = ((index % tracks.length) + tracks.length) % tracks.length
    const track = tracks[normalizedIndex]
    trackIndexRef.current = normalizedIndex
    setTrackTitle(labelFor(track))

    if (force || audio.src !== track.src) {
      music?.detach()
      if (music) audio.crossOrigin = 'anonymous'
      sourceRevisionRef.current += 1
      audio.src = track.src
      audio.load()
    }
    return sourceRevisionRef.current
  }, [music])

  const attemptPlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || tracksRef.current.length === 0) return

    if (!audio.src) prepareTrack(trackIndexRef.current)
    const revision = sourceRevisionRef.current
    setError(null)
    setLoading(true)
    armPlaybackLoadingTimeout(revision)

    // Keep play() in the gesture call stack when start/toggle invokes this.
    const result = audio.play()
    void result.catch(reason => {
      if (
        !mountedRef.current ||
        revision !== sourceRevisionRef.current ||
        !wantsPlaybackRef.current ||
        (reason instanceof DOMException && reason.name === 'AbortError')
      ) return

      if (isBlockedPlayback(reason)) {
        clearLoadingTimeout()
        setPlaybackIntent(false)
        setPlaying(false)
        setLoading(false)
        setError('Tap play to start the radio.')
        return
      }

      // Media failures also raise the element error event, which owns track skipping.
      if (!audio.error) {
        clearLoadingTimeout()
        setPlaying(false)
        setLoading(false)
        setError('Radio signal unavailable. Try again.')
      }
    })
  }, [armPlaybackLoadingTimeout, prepareTrack])

  const unlockMedia = useCallback(() => {
    const audio = audioRef.current
    if (!audio || unlockedRef.current || unlockPromiseRef.current) return

    if (audio.src !== AUDIO_UNLOCK_SRC) {
      sourceRevisionRef.current += 1
      audio.src = AUDIO_UNLOCK_SRC
      audio.load()
    }
    if (audio.ended) audio.currentTime = 0

    // This call must remain directly inside the pointer/click gesture. Once the
    // element is allowed to play, the resolved manifest can replace its source.
    unlockPromiseRef.current = audio.play()
      .then(() => { unlockedRef.current = true })
      .catch(reason => {
        unlockedRef.current = false
        unlockPromiseRef.current = null
        if (!mountedRef.current || !isBlockedPlayback(reason)) return
        setPlaybackIntent(false)
        setLoading(false)
        setError('Tap play to start the radio.')
      })
  }, [])

  const loadPlaylist = useCallback(async () => {
    if (fetchingRef.current) return

    const controller = new AbortController()
    const selectedStation = stationRef.current
    if (!canPlayCruiseStation(selectedStation) || !selectedStation.source) return
    fetchControllerRef.current?.abort()
    fetchControllerRef.current = controller
    fetchingRef.current = true
    setLoading(true)
    setError(null)
    clearLoadingTimeout()
    loadingTimeoutRef.current = setTimeout(() => {
      loadingTimeoutRef.current = null
      if (!mountedRef.current || fetchControllerRef.current !== controller) return
      controller.abort()
      tracksRef.current = []
      setAvailable(false)
      setCanSkip(false)
      setTrackTitle('')
      setLoading(false)
      setPlaybackIntent(false)
      setError('Radio unavailable. Loading timed out. Tap play to retry.')
    }, RADIO_LOADING_TIMEOUT_MS)

    try {
      let tracks: RadioTrack[]
      if (selectedStation.playback === 'stream') {
        tracks = [{ src: selectedStation.source, title: selectedStation.name, artist: '' }]
      } else {
        const response = await fetch(selectedStation.source, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Radio returned ${response.status}`)
        const payload: unknown = await response.json()
        tracks = Array.isArray(payload) ? payload.filter(isTrack) : []
      }
      if (tracks.length === 0) throw new Error('Radio playlist is empty')
      if (!mountedRef.current || controller.signal.aborted) return

      if (wantsPlaybackRef.current && unlockPromiseRef.current) {
        await unlockPromiseRef.current
      }
      if (!mountedRef.current || controller.signal.aborted) return

      clearLoadingTimeout()
      tracksRef.current = tracks
      trackIndexRef.current = 0
      failedTracksRef.current = 0
      setAvailable(true)
      setCanSkip(selectedStation.playback === 'playlist' && tracks.length > 1)
      setError(null)
      prepareTrack(0, true)

      if (wantsPlaybackRef.current) {
        attemptPlay()
      } else {
        setLoading(false)
      }
    } catch (reason) {
      if (!mountedRef.current || controller.signal.aborted) return
      tracksRef.current = []
      setAvailable(false)
      setCanSkip(false)
      setTrackTitle('')
      setLoading(false)
      setPlaybackIntent(false)
      const detail = reason instanceof Error ? ` ${reason.message}` : ''
      setError(`Radio unavailable.${detail} Tap play to retry.`)
    } finally {
      if (fetchControllerRef.current === controller) {
        fetchControllerRef.current = null
        fetchingRef.current = false
        // A successful load may have armed playback's timer; do not cancel it.
        if (!wantsPlaybackRef.current || controller.signal.aborted) clearLoadingTimeout()
      }
    }
  }, [attemptPlay, clearLoadingTimeout, prepareTrack])

  const start = useCallback(() => {
    music?.unlock()
    setPlaybackIntent(true)
    setError(null)

    const audio = audioRef.current
    if (!audio || tracksRef.current.length === 0) {
      setLoading(true)
      unlockMedia()
      void loadPlaylist()
      return
    }

    failedTracksRef.current = 0
    if (audio.error || (audio.ended && stationRef.current.playback === 'stream')) {
      prepareTrack(trackIndexRef.current, true)
    }
    attemptPlay()
  }, [attemptPlay, loadPlaylist, prepareTrack, unlockMedia, music])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setPlaybackIntent(false)
    audio.pause()
    fetchControllerRef.current?.abort()
    fetchControllerRef.current = null
    fetchingRef.current = false
    clearLoadingTimeout()
    setLoading(false)
  }, [clearLoadingTimeout])

  const toggle = useCallback(() => {
    if (wantsPlaybackRef.current) pause()
    else start()
  }, [pause, start])

  const selectStation = useCallback((id: string) => {
    const nextStation = getCruiseStation(id)
    if (!nextStation || !canPlayCruiseStation(nextStation)) return false
    if (stationRef.current.id === id) return true

    fetchControllerRef.current?.abort()
    fetchControllerRef.current = null
    fetchingRef.current = false
    sourceRevisionRef.current += 1
    audioRef.current?.pause()
    clearLoadingTimeout()
    tracksRef.current = []
    trackIndexRef.current = 0
    failedTracksRef.current = 0
    stationRef.current = nextStation
    setStation(nextStation)
    setAvailable(false)
    setCanSkip(false)
    setPlaying(false)
    setTrackTitle('')
    if (wantsPlaybackRef.current) unlockMedia()
    void loadPlaylist()
    return true
  }, [clearLoadingTimeout, loadPlaylist, unlockMedia])

  const skipTrack = useCallback((direction: number) => {
    if (stationRef.current.playback !== 'playlist' || tracksRef.current.length < 2) return
    failedTracksRef.current = 0
    setError(null)
    prepareTrack(trackIndexRef.current + direction, true)
    if (wantsPlaybackRef.current) attemptPlay()
    else setLoading(false)
  }, [attemptPlay, prepareTrack])

  const nextTrack = useCallback(() => skipTrack(1), [skipTrack])
  const previousTrack = useCallback(() => skipTrack(-1), [skipTrack])

  const setVolume = useCallback((nextVolume: number) => {
    const normalized = Number.isFinite(nextVolume)
      ? Math.min(1, Math.max(0, nextVolume))
      : 0
    setVolumeState(normalized)
    if (audioRef.current) audioRef.current.volume = normalized
  }, [])

  const setMuted = useCallback((nextMuted: boolean) => {
    setMutedState(nextMuted)
    if (audioRef.current) audioRef.current.muted = nextMuted
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const audio = new Audio()
    if (music) audio.crossOrigin = 'anonymous'
    audio.preload = 'metadata'
    audio.volume = DEFAULT_VOLUME
    audio.src = AUDIO_UNLOCK_SRC
    audio.load()
    audioRef.current = audio

    const onPlay = () => {
      if (wantsPlaybackRef.current) setLoading(true)
    }
    const onPlaying = () => {
      if (audio.src === AUDIO_UNLOCK_SRC) {
        setPlaying(false)
        setLoading(true)
        return
      }
      const expected = tracksRef.current[trackIndexRef.current]?.src
      if (!expected || audio.currentSrc !== new URL(expected, window.location.href).href || audio.paused) return
      clearLoadingTimeout()
      if (!wantsPlaybackRef.current) {
        audio.pause()
        return
      }
      failedTracksRef.current = 0
      setPlaying(true)
      setLoading(false)
      setError(null)
      music?.attach(audio)
    }
    const onPause = () => setPlaying(false)
    const onWaiting = () => {
      if (wantsPlaybackRef.current) {
        setLoading(true)
        if (audio.src !== AUDIO_UNLOCK_SRC && tracksRef.current.length > 0) {
          armPlaybackLoadingTimeout(sourceRevisionRef.current)
        }
      }
    }
    const onReady = () => {
      if (audio.src === AUDIO_UNLOCK_SRC) return
      if (!wantsPlaybackRef.current) setLoading(false)
    }
    const onEnded = () => {
      if (!wantsPlaybackRef.current) return
      if (stationRef.current.playback === 'stream') {
        setPlaybackIntent(false)
        setPlaying(false)
        setLoading(false)
        setError('Radio signal ended. Tap play to retry.')
        return
      }
      const tracks = tracksRef.current
      if (tracks.length === 0) {
        setPlaying(false)
        if (wantsPlaybackRef.current) setLoading(true)
        return
      }
      if (tracks.length === 1) {
        audio.currentTime = 0
      } else {
        prepareTrack(trackIndexRef.current + 1, true)
      }
      attemptPlay()
    }
    const onError = () => {
      const expected = tracksRef.current[trackIndexRef.current]?.src
      if (!audio.error || !expected || audio.currentSrc !== new URL(expected, window.location.href).href) return
      clearLoadingTimeout()
      // Capture is optional. A CORS failure retries ordinary radio on the same element.
      if (music && audio.crossOrigin === 'anonymous') {
        music.detach(); music.status = 'CORS unavailable; ordinary radio playback'
        audio.removeAttribute('crossorigin'); audio.load()
        if (wantsPlaybackRef.current) attemptPlay()
        return
      }
      if (!wantsPlaybackRef.current) return
      const tracks = tracksRef.current
      if (tracks.length > 1 && failedTracksRef.current < tracks.length - 1) {
        failedTracksRef.current += 1
        prepareTrack(trackIndexRef.current + 1, true)
        attemptPlay()
        return
      }
      setPlaybackIntent(false)
      setPlaying(false)
      setLoading(false)
      setError('Radio signal unavailable. Tap play to retry.')
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('loadstart', onWaiting)
    audio.addEventListener('canplay', onReady)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    void loadPlaylist()

    return () => {
      mountedRef.current = false
      clearLoadingTimeout()
      fetchControllerRef.current?.abort()
      fetchControllerRef.current = null
      fetchingRef.current = false
      setPlaybackIntent(false)
      failedTracksRef.current = 0
      sourceRevisionRef.current += 1
      unlockedRef.current = false
      unlockPromiseRef.current = null
      tracksRef.current = []
      trackIndexRef.current = 0
      audio.pause()
      music?.dispose()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('loadstart', onWaiting)
      audio.removeEventListener('canplay', onReady)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [armPlaybackLoadingTimeout, attemptPlay, clearLoadingTimeout, loadPlaylist, prepareTrack, music])

  return {
    start,
    toggle,
    pause,
    playing,
    requested,
    loading,
    error,
    volume,
    setVolume,
    muted,
    setMuted,
    trackTitle,
    available,
    stationId: station.id,
    station,
    selectStation,
    nextTrack,
    previousTrack,
    canSkip,
  }
}
