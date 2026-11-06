'use client'

import {castIsRemote,castStations,sendCast,type CastStatus} from '@/lib/cruise/google-cast'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { canPlayCruiseStation, CRUISE_STATIONS, DEFAULT_CRUISE_STATION } from '@/lib/real-miami/stations'
import type Hls from 'hls.js'
import type { CruiseStation } from '@/lib/real-miami/types'
import {parseRadioVolume,RADIO_VOLUME_KEY,radioStatus,type RadioStatus} from '@/lib/cruise/radio-controller'
import type { MusicAudio } from '@/lib/real-miami/music-audio'
import { parsePlaylistPosition, parsePlaylistTrack, playlistTrackId, resolvePlaylistPosition, type CastPlaylistPosition } from '@/lib/cruise/cast-playlist'

type RadioTrack = {
  src: string
  title: string
  artist: string
  sourcePage?: string
}

type CruiseAudio = {
  stations: readonly CruiseStation[]
  casting: boolean
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
  stepStation: (direction: number) => void
  nextTrack: () => void
  previousTrack: () => void
  canSkip: boolean
  getPlaylistPosition: () => CastPlaylistPosition | undefined
  restorePlaylistPosition: (position: CastPlaylistPosition) => boolean
  getMediaState: () => { currentTime: number; readyState: number; paused: boolean }
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
  const [casting, setCasting] = useState(castIsRemote)
  const selectableStations = useMemo(() => casting
    ? stations.filter(station => canPlayCruiseStation(station) && castStations.includes(station.id))
    : stations, [casting, stations])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const hlsLoadingRef = useRef(false)
  const tracksRef = useRef<RadioTrack[]>([])
  const trackIndexRef = useRef(0)
  const pendingPlaylistRef = useRef<{ stationId: string; cursor: CastPlaylistPosition } | null>(null)
  const remotePlaylistRef = useRef<CastPlaylistPosition | undefined>()
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
      if (!mountedRef.current || (!wantsPlaybackRef.current && !pendingPlaylistRef.current) || revision !== sourceRevisionRef.current) return
      pendingPlaylistRef.current = null
      setPlaybackIntent(false)
      audio.pause()
      setPlaying(false)
      setLoading(false)
      setError('Radio signal timed out. Tap play to retry.')
    }, RADIO_LOADING_TIMEOUT_MS)
  }, [clearLoadingTimeout])

  const applyPlaylistSeek = useCallback(() => {
    const pending = pendingPlaylistRef.current, audio = audioRef.current
    if (!pending) return true
    const track = tracksRef.current[trackIndexRef.current]
    if (!audio || audio.readyState < 1 || pending.stationId !== stationRef.current.id
      || !track || playlistTrackId(track.src) !== pending.cursor.trackId) return false
    try {
      const position = Number.isFinite(audio.duration)
        ? Math.min(pending.cursor.position, Math.max(0, audio.duration - .05)) : pending.cursor.position
      audio.currentTime = position
      pendingPlaylistRef.current = null
      return true
    } catch { return false }
  }, [])

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
    if (pendingPlaylistRef.current && !applyPlaylistSeek()) {
      setLoading(true)
      armPlaybackLoadingTimeout(revision)
      return
    }
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
  }, [armPlaybackLoadingTimeout, prepareTrack, clearLoadingTimeout, applyPlaylistSeek])

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
      const pending = pendingPlaylistRef.current
      const restored = pending?.stationId === selectedStation.id ? resolvePlaylistPosition(tracks, pending.cursor) : null
      if (pending?.stationId === selectedStation.id && !restored) throw new Error('The selected track is no longer in this station. Choose the station again.')
      trackIndexRef.current = restored?.index ?? (selectedStation.id === 'veridian-club' ? Math.floor(Math.random() * tracks.length) : 0)
      failedTracksRef.current = 0
      setAvailable(true)
      setCanSkip(selectedStation.playback === 'playlist' && tracks.length > 1)
      setError(null)
      prepareTrack(trackIndexRef.current, true)
      applyPlaylistSeek()
      if (pendingPlaylistRef.current) armPlaybackLoadingTimeout(sourceRevisionRef.current)

      if (wantsPlaybackRef.current) {
        attemptPlay()
      } else {
        setLoading(!!pendingPlaylistRef.current)
      }
    } catch (reason) {
      if (!mountedRef.current || controller.signal.aborted) return
      pendingPlaylistRef.current = null
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
        if ((!wantsPlaybackRef.current && !pendingPlaylistRef.current) || controller.signal.aborted) clearLoadingTimeout()
      }
    }
  }, [attemptPlay, clearLoadingTimeout, prepareTrack, applyPlaylistSeek, armPlaybackLoadingTimeout])

  const getPlaylistPosition = useCallback((): CastPlaylistPosition | undefined => {
    if (castIsRemote()) return remotePlaylistRef.current
    if (stationRef.current.playback !== 'playlist' || pendingPlaylistRef.current) return undefined
    const audio = audioRef.current, track = tracksRef.current[trackIndexRef.current]
    if (!audio || !track || audio.readyState < 1 || !Number.isFinite(audio.currentTime)) return undefined
    return { trackId: playlistTrackId(track.src), position: Math.min(86400, Math.max(0, audio.currentTime)) }
  }, [])

  const restorePlaylistPosition = useCallback((value: CastPlaylistPosition) => {
    const cursor = parsePlaylistPosition(value)
    if (!cursor || stationRef.current.playback !== 'playlist') return false
    pendingPlaylistRef.current = { stationId: stationRef.current.id, cursor }
    if (tracksRef.current.length) {
      const restored = resolvePlaylistPosition(tracksRef.current, cursor)
      if (!restored) { pendingPlaylistRef.current = null; setError('The selected track is no longer in this station.'); return false }
      prepareTrack(restored.index, true)
      applyPlaylistSeek()
    }
    return true
  }, [prepareTrack, applyPlaylistSeek])

  const getMediaState = useCallback(() => {
    const audio = audioRef.current
    return { currentTime: audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      readyState: audio?.readyState ?? 0, paused: audio?.paused ?? true }
  }, [])

  const start = useCallback(() => {
    if(sendCast({type:"play"}))return
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
    if(sendCast({type:"pause"}))return
    const audio = audioRef.current
    if (!audio) return
    setPlaybackIntent(false)
    audio.pause()
    // A paused handoff still needs its catalog and metadata to resolve the
    // requested track/offset. Keep that fetch alive without playing audio.
    if (pendingPlaylistRef.current) {
      if (tracksRef.current.length) {
        if (applyPlaylistSeek()) { clearLoadingTimeout(); setLoading(false) }
        else { setLoading(true); armPlaybackLoadingTimeout(sourceRevisionRef.current) }
      } else if (!fetchingRef.current) void loadPlaylist()
      return
    }
    fetchControllerRef.current?.abort()
    fetchControllerRef.current = null
    fetchingRef.current = false
    clearLoadingTimeout()
    setLoading(false)
  }, [clearLoadingTimeout, applyPlaylistSeek, armPlaybackLoadingTimeout, loadPlaylist])

  const toggle = useCallback(() => {
    if (wantsPlaybackRef.current) pause()
    else start()
  }, [pause, start])

  const selectStation = useCallback((id: string) => {
    const nextStation = stations.find(item => item.id === id)
    if (!nextStation || !canPlayCruiseStation(nextStation)) return false
    if (castIsRemote()) {
      if (!castStations.includes(id)) {
        setError('This station is not available on TV yet.')
        return false
      }
      if (!sendCast({ type: 'station', station: id })) return false
      stationRef.current = nextStation
      remotePlaylistRef.current = undefined
      setStation(nextStation)
      setError(null)
      return true
    }
    if (stationRef.current.id === id) return true

    pendingPlaylistRef.current = null

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

  const stepStation = useCallback((direction: number) => {
    // Use the same source order as the picker, restricted to stations that the
    // current output can play. Read ownership now so rapid taps do not rely on
    // a React render catching up with the Cast handoff.
    const remote = castIsRemote()
    const eligible = stations.filter(station => canPlayCruiseStation(station)
      && (!remote || castStations.includes(station.id)))
    if (!eligible.length) return
    // Read the synchronous selection ref so rapid taps cannot reuse a stale render.
    const index = eligible.findIndex(s => s.id === stationRef.current.id)
    const next = index < 0 ? (direction < 0 ? eligible.length - 1 : 0)
      : (index + (direction < 0 ? -1 : 1) + eligible.length) % eligible.length
    selectStation(eligible[next].id)
  }, [stations, selectStation])

  const skipTrack = useCallback((direction: number) => {
    // Station controls remain remote; legacy playlist skip must never restart the phone.
    if (castIsRemote()) return
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
    if(sendCast({type:"volume",volume:nextVolume})){setVolumeState(nextVolume);return}
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
    if(sendCast({type:"volume",muted:nextMuted})){setMutedState(nextMuted);return}
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
      if (wantsPlaybackRef.current || pendingPlaylistRef.current) {
        setLoading(true)
        if (audio.src !== AUDIO_UNLOCK_SRC && tracksRef.current.length > 0) {
          armPlaybackLoadingTimeout(sourceRevisionRef.current)
        }
      }
    }
    const onReady = () => {
      if (audio.src === AUDIO_UNLOCK_SRC) return
      if (pendingPlaylistRef.current && applyPlaylistSeek()) {
        clearLoadingTimeout()
        if (wantsPlaybackRef.current) attemptPlay()
      }
      if (!wantsPlaybackRef.current) setLoading(!!pendingPlaylistRef.current)
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
      if (pendingPlaylistRef.current) {
        pendingPlaylistRef.current = null
        setPlaybackIntent(false)
        setLoading(false)
        setPlaying(false)
        setError('The selected track could not load. Tap play to retry.')
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
    audio.addEventListener('loadedmetadata', onReady)
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
      audio.removeEventListener('loadedmetadata', onReady)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [armPlaybackLoadingTimeout, attemptPlay, clearLoadingTimeout, loadPlaylist, prepareTrack, music, stopTuningNoise, applyPlaylistSeek])

  useEffect(() => {
    const state = (event: Event) => {
      const s = (event as CustomEvent<CastStatus>).detail
      setCasting(true)
      // This listener is synchronous: local audio stops before the sender
      // releases the receiver's temporary handoff mute.
      audioRef.current?.pause()
      fetchControllerRef.current?.abort()
      fetchControllerRef.current = null
      fetchingRef.current = false
      sourceRevisionRef.current++
      hlsRef.current?.destroy()
      hlsRef.current = null
      hlsLoadingRef.current = false
      clearLoadingTimeout()
      stopTuningNoise()
      const requested = s.requested ?? s.playing
      wantsPlaybackRef.current = requested
      setRequested(requested)
      setPlaying(s.playing)
      setLoading(!!s.loading)
      setError(s.error || null)
      setVolumeState(s.volume)
      setMutedState(s.muted)
      volumeRef.current = s.volume
      mutedRef.current = s.muted
      if (audioRef.current) {
        audioRef.current.volume = s.volume
        audioRef.current.muted = s.muted
      }
      const next = stations.find(item => item.id === s.station)
      if (next) { stationRef.current = next; setStation(next) }
      remotePlaylistRef.current = next?.playback === 'playlist' ? parsePlaylistPosition(s.playlist) : undefined
      const receiverTrack = parsePlaylistTrack(s.track, remotePlaylistRef.current)
      setCurrentTrack(receiverTrack)
      setTrackTitle(labelFor(receiverTrack ?? undefined))
      setCanSkip(false)
    }
    const end = () => {
      setCasting(false)
      const requested = wantsPlaybackRef.current
      pendingPlaylistRef.current = remotePlaylistRef.current
        ? { stationId: stationRef.current.id, cursor: remotePlaylistRef.current } : null
      remotePlaylistRef.current = undefined
      tracksRef.current = []
      fetchingRef.current = false
      setPlaybackIntent(requested)
      void loadPlaylist()
    }
    addEventListener('cruise:cast-state', state)
    addEventListener('cruise:cast-ended', end)
    return () => {
      removeEventListener('cruise:cast-state', state)
      removeEventListener('cruise:cast-ended', end)
    }
  }, [stations, loadPlaylist, stopTuningNoise, setPlaybackIntent, clearLoadingTimeout])
  return {
    stations: selectableStations,
    casting,
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
    stepStation,
    nextTrack,
    previousTrack,
    canSkip,
    getPlaylistPosition,
    restorePlaylistPosition,
    getMediaState,
    tuning,
    status:radioStatus({requested,playing,loading,available,error}),
  }
}
