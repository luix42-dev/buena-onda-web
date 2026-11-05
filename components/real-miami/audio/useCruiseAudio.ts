'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { canPlayCruiseStation, CRUISE_STATIONS, DEFAULT_CRUISE_STATION } from '@/lib/real-miami/stations'
import type Hls from 'hls.js'
import type { CruiseStation } from '@/lib/real-miami/types'
import {parseRadioVolume,RADIO_VOLUME_KEY,radioStatus,type RadioStatus} from '@/lib/cruise/radio-controller'
import type { MusicAudio } from '@/lib/real-miami/music-audio'

type RadioTrack = {
  src: string
  title: string
  artist: string
  sourcePage?: string
}

type CruiseAudio = {
  stations: readonly CruiseStation[]
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
  currentTrack: RadioTrack | null
  available: boolean
  stationId: string
  station: CruiseStation
  selectStation: (id: string) => boolean
  nextTrack: () => void
  previousTrack: () => void
  canSkip: boolean
  tuning: boolean
  status: RadioStatus
}

type TuningVoice = { source: AudioBufferSourceNode; highpass: BiquadFilterNode; lowpass: BiquadFilterNode; envelope: GainNode; output: GainNode }

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

export function useCruiseAudio(music?: MusicAudio, stations: readonly CruiseStation[] = CRUISE_STATIONS): CruiseAudio {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const hlsLoadingRef = useRef(false)
  const tracksRef = useRef<RadioTrack[]>([])
  const trackIndexRef = useRef(0)
  const wantsPlaybackRef = useRef(false)
  const failedTracksRef = useRef(0)
  const corsRetryRef = useRef('')
  const sourceRevisionRef = useRef(0)
  const unlockedRef = useRef(false)
  const unlockPromiseRef = useRef<Promise<void> | null>(null)
  const mountedRef = useRef(false)
  const fetchingRef = useRef(false)
  const fetchControllerRef = useRef<AbortController | null>(null)
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stationRef = useRef<CruiseStation>(DEFAULT_CRUISE_STATION)
  const tuningContextRef = useRef<AudioContext | null>(null)
  const tuningBufferRef = useRef<AudioBuffer | null>(null)
  const tuningVoiceRef = useRef<TuningVoice | null>(null)
  const volumeRef = useRef(DEFAULT_VOLUME)
  const mutedRef = useRef(false)
  const [tuning, setTuning] = useState(false)

  const stopTuningNoise = useCallback(() => {
    const voice = tuningVoiceRef.current
    tuningVoiceRef.current = null
    if (voice) {
      voice.source.onended = null
      try { voice.source.stop() } catch { /* Already ended or not started. */ }
      voice.source.disconnect(); voice.highpass.disconnect(); voice.lowpass.disconnect()
      voice.envelope.disconnect(); voice.output.disconnect()
    }
    if (mountedRef.current) setTuning(false)
  }, [])

  const playTuningNoise = useCallback(() => {
    stopTuningNoise()
    if (!wantsPlaybackRef.current || mutedRef.current || volumeRef.current === 0) return
    try {
      const context = tuningContextRef.current ??= new AudioContext()
      // Generated locally; a brief between-station effect, never a fake station or analyser signal.
      const buffer = tuningBufferRef.current ??= context.createBuffer(1, Math.ceil(context.sampleRate * .38), context.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
      const source = context.createBufferSource(), highpass = context.createBiquadFilter(), lowpass = context.createBiquadFilter()
      const envelope = context.createGain(), output = context.createGain()
      source.buffer = buffer; highpass.type = 'highpass'; highpass.frequency.value = 650
      lowpass.type = 'lowpass'; lowpass.frequency.value = 4200
      output.gain.value = volumeRef.current
      const now = context.currentTime
      envelope.gain.setValueAtTime(0, now)
      envelope.gain.linearRampToValueAtTime(.14, now + .012)
      envelope.gain.linearRampToValueAtTime(.09, now + .10)
      envelope.gain.linearRampToValueAtTime(0, now + .35)
      source.connect(highpass); highpass.connect(lowpass); lowpass.connect(envelope); envelope.connect(output); output.connect(context.destination)
      const voice = { source, highpass, lowpass, envelope, output }
      tuningVoiceRef.current = voice
      source.onended = () => { if (tuningVoiceRef.current === voice) stopTuningNoise() }
      setTuning(true); source.start(now); source.stop(now + .38)
      void context.resume().catch(() => { if (tuningVoiceRef.current === voice) stopTuningNoise() })
    } catch { stopTuningNoise() } // Optional texture must never prevent actual radio playback.
  }, [stopTuningNoise])

  const [playing, setPlaying] = useState(false)
  const [requested, setRequested] = useState(false)
  const setPlaybackIntent = useCallback((value:boolean) => { wantsPlaybackRef.current=value; setRequested(value); if (!value) stopTuningNoise() }, [stopTuningNoise])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME)
  const [muted, setMutedState] = useState(false)
  const [trackTitle, setTrackTitle] = useState('')
  const [currentTrack, setCurrentTrack] = useState<RadioTrack | null>(null)
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
    setCurrentTrack(track)

    if (force || audio.src !== track.src) {
      music?.detach()
      hlsRef.current?.destroy(); hlsRef.current = null; hlsLoadingRef.current = false
      if (music) audio.crossOrigin = 'anonymous'
      sourceRevisionRef.current += 1
      if (stationRef.current.playback === 'hls') {
        const revision = sourceRevisionRef.current
        hlsLoadingRef.current = true
        audio.removeAttribute('src'); audio.load()
        void import('hls.js').then(({ default: HlsPlayer }) => {
          if (!mountedRef.current || revision !== sourceRevisionRef.current) return
          if (!HlsPlayer.isSupported()) {
            if (!audio.canPlayType('application/vnd.apple.mpegurl')) throw new Error('HLS playback is unsupported in this browser')
            // Native HLS remains the fallback on browsers without usable MSE.
            // Prefer hls.js elsewhere so the lowest rendition is deterministic.
            hlsLoadingRef.current = false
            audio.src = track.src; audio.load()
            if (wantsPlaybackRef.current) void audio.play().catch(() => { if (revision === sourceRevisionRef.current) { setLoading(false); setError('Tap play to start the radio.') } })
            return
          }
          const player = new HlsPlayer({ enableWorker: false, startLevel: 0, maxBufferLength: 12, maxMaxBufferLength: 20, backBufferLength: 0 })
          hlsRef.current = player
          player.on(HlsPlayer.Events.MEDIA_ATTACHED, () => player.loadSource(track.src))
          player.on(HlsPlayer.Events.MANIFEST_PARSED, () => {
            if (revision !== sourceRevisionRef.current) return
            // Prefer an audio-only variant; otherwise pin the lowest bandwidth video rendition.
            const audioOnly = player.levels.findIndex(level => !level.videoCodec)
            const cheapest = player.levels.reduce((best, level, i, levels) => level.bitrate < levels[best].bitrate ? i : best, 0)
            player.currentLevel = audioOnly >= 0 ? audioOnly : cheapest
            hlsLoadingRef.current = false
            if (wantsPlaybackRef.current) void audio.play().catch(() => { if (revision === sourceRevisionRef.current) { setLoading(false); setError('Tap play to start the radio.') } })
          })
          player.on(HlsPlayer.Events.ERROR, (_, detail) => {
            if (!detail.fatal || revision !== sourceRevisionRef.current) return
            player.destroy(); hlsRef.current = null; hlsLoadingRef.current = false
            clearLoadingTimeout(); setLoading(false); setPlaying(false); setPlaybackIntent(false)
            setAvailable(false); tracksRef.current = []; setError('Radio signal unavailable. Tap play to retry.')
          })
          player.attachMedia(audio)
        }).catch(() => {
          if (revision !== sourceRevisionRef.current) return
          hlsLoadingRef.current = false; clearLoadingTimeout(); setLoading(false); setAvailable(false)
          tracksRef.current = []; setPlaybackIntent(false); setError('HLS radio unavailable. Try again or visit the station website.')
        })
        return revision
      }
      audio.src = track.src
      audio.load()
    }
    return sourceRevisionRef.current
  }, [music, clearLoadingTimeout])

  const attemptPlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || tracksRef.current.length === 0) return

    if (!audio.src && !hlsLoadingRef.current) prepareTrack(trackIndexRef.current)
    const revision = sourceRevisionRef.current
    // play() on an already-playing element need not emit another playing event.
    // Do not arm a timeout that would later stop a healthy current station.
    const expected = tracksRef.current[trackIndexRef.current]?.src
    if (!hlsLoadingRef.current && !audio.paused && !audio.ended && !audio.error && audio.readyState >= 3 && expected && (hlsRef.current || audio.currentSrc === new URL(expected, window.location.href).href)) {
      clearLoadingTimeout()
      setError(null)
      setLoading(false)
      setPlaying(true)
      return
    }
    setError(null)
    setLoading(true)
    armPlaybackLoadingTimeout(revision)
    if (hlsLoadingRef.current) return

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
  }, [armPlaybackLoadingTimeout, prepareTrack, clearLoadingTimeout])

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
      setCurrentTrack(null)
      setLoading(false)
      setPlaybackIntent(false)
      setError('Radio unavailable. Loading timed out. Tap play to retry.')
    }, RADIO_LOADING_TIMEOUT_MS)

    try {
      let tracks: RadioTrack[]
      if (selectedStation.playback === 'stream' || selectedStation.playback === 'hls') {
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
      trackIndexRef.current = selectedStation.id === 'veridian-club' ? Math.floor(Math.random() * tracks.length) : 0
      failedTracksRef.current = 0
      setAvailable(true)
      setCanSkip(selectedStation.playback === 'playlist' && tracks.length > 1)
      setError(null)
      prepareTrack(trackIndexRef.current, true)

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
      setCurrentTrack(null)
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
    if (audio.error || (audio.ended && stationRef.current.playback !== 'playlist')) {
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
    const nextStation = stations.find(item => item.id === id)
    if (!nextStation || !canPlayCruiseStation(nextStation)) return false
    if (stationRef.current.id === id) return true

    playTuningNoise()

    fetchControllerRef.current?.abort()
    fetchControllerRef.current = null
    fetchingRef.current = false
    sourceRevisionRef.current += 1
    hlsRef.current?.destroy(); hlsRef.current = null; hlsLoadingRef.current = false
    music?.detach()
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
    setCurrentTrack(null)
    if (wantsPlaybackRef.current) unlockMedia()
    void loadPlaylist()
    return true
  }, [clearLoadingTimeout, loadPlaylist, unlockMedia, stations, music, playTuningNoise])

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
    volumeRef.current = normalized
    const context = tuningContextRef.current, voice = tuningVoiceRef.current
    if (context && voice) voice.output.gain.setValueAtTime(mutedRef.current ? 0 : normalized, context.currentTime)
    if (audioRef.current) audioRef.current.volume = normalized
    try { localStorage.setItem(RADIO_VOLUME_KEY,String(normalized)) } catch { /* The current session still has volume control. */ }
  }, [])

  const setMuted = useCallback((nextMuted: boolean) => {
    setMutedState(nextMuted)
    mutedRef.current = nextMuted
    const context = tuningContextRef.current, voice = tuningVoiceRef.current
    if (context && voice) voice.output.gain.setValueAtTime(nextMuted ? 0 : volumeRef.current, context.currentTime)
    if (audioRef.current) audioRef.current.muted = nextMuted
  }, [])

  useEffect(() => {
    mountedRef.current = true
    try { const restored=parseRadioVolume(localStorage.getItem(RADIO_VOLUME_KEY));volumeRef.current=restored;setVolumeState(restored) } catch { /* Storage is optional. */ }
    const audio = new Audio()
    if (music) audio.crossOrigin = 'anonymous'
    audio.preload = 'metadata'
    audio.volume = volumeRef.current
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
      if (!expected || (!hlsRef.current && audio.currentSrc !== new URL(expected, window.location.href).href) || audio.paused) return
      clearLoadingTimeout()
      if (!wantsPlaybackRef.current) {
        audio.pause()
        return
      }
      failedTracksRef.current = 0
      stopTuningNoise()
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
      if (stationRef.current.playback !== 'playlist') {
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
      if (stationRef.current.playback === 'hls') {
        // MSE failures belong to the revision-guarded HLS ERROR handler. A queued
        // media error from the previous station or empty-src transition must not
        // cancel the new station's playback intent while HLS is attaching.
        if (hlsRef.current || hlsLoadingRef.current) return
        // Native HLS errors must belong to the currently selected URL.
        if (!audio.error || !expected || audio.currentSrc !== new URL(expected, window.location.href).href) return
        clearLoadingTimeout(); setPlaybackIntent(false); setPlaying(false); setLoading(false)
        setError('Radio signal unavailable. Tap play to retry.')
        return
      }
      if (!audio.error || !expected || audio.currentSrc !== new URL(expected, window.location.href).href) return
      clearLoadingTimeout()
      // A media error cannot tell CORS from a transient failure (the r2.dev host answers 503 under load).
      // Retry the same file once with CORS kept, so one bad response does not cost live analysis for the visit.
      if (music && audio.crossOrigin === 'anonymous' && corsRetryRef.current !== expected) {
        corsRetryRef.current = expected
        window.setTimeout(() => { if (audio.currentSrc === new URL(expected, window.location.href).href) { audio.load(); if (wantsPlaybackRef.current) attemptPlay() } }, 700)
        return
      }
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
      hlsRef.current?.destroy(); hlsRef.current = null; hlsLoadingRef.current = false
      unlockedRef.current = false
      unlockPromiseRef.current = null
      tracksRef.current = []
      trackIndexRef.current = 0
      audio.pause()
      stopTuningNoise()
      const tuningContext = tuningContextRef.current
      tuningContextRef.current = null; tuningBufferRef.current = null
      if (tuningContext && tuningContext.state !== 'closed') void tuningContext.close().catch(() => {})
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
  }, [armPlaybackLoadingTimeout, attemptPlay, clearLoadingTimeout, loadPlaylist, prepareTrack, music, stopTuningNoise])

  return {
    stations,
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
    currentTrack,
    available,
    stationId: station.id,
    station,
    selectStation,
    nextTrack,
    previousTrack,
    canSkip,
    tuning,
    status:radioStatus({requested,playing,loading,available,error}),
  }
}
