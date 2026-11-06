'use client'

import { useEffect, useRef, useState } from 'react'
import { Cast } from 'lucide-react'
import {
  attachCast, castSupported, castDeviceName, castStations, disconnectCast,
  loadCastSdk, requestCast, sendCast, type CastConnectionState,
} from '@/lib/cruise/google-cast'
import type { useCruiseAudio } from '@/components/real-miami/audio/useCruiseAudio'

type Props = {
  params: () => Record<string, string>
  audio: ReturnType<typeof useCruiseAudio>
}

export default function CastButton({ params, audio }: Props) {
  const [available, setAvailable] = useState(false)
  const [connection, setConnection] = useState<CastConnectionState>('disconnected')
  const [error, setError] = useState('')
  const currentAudio = useRef(audio)
  currentAudio.current = audio

  useEffect(() => {
    if (!castSupported()) return
    let cleanup: (() => void) | undefined
    let alive = true
    const report = (event: Event) => setError((event as CustomEvent<string>).detail)
    addEventListener('cruise:cast-error', report)
    void loadCastSdk().then(() => {
      if (!alive) return
      setAvailable(true)
      cleanup = attachCast(
        state => setError(state.error || ''),
        () => {},
        state => { setConnection(state); if (state === 'connected') setError('') },
      )
    }).catch(() => {})
    return () => {
      alive = false
      cleanup?.()
      removeEventListener('cruise:cast-error', report)
    }
  }, [])

  const scene = JSON.stringify(params())
  useEffect(() => { sendCast({ type: 'sync', scene: JSON.parse(scene) }) }, [scene])
  useEffect(() => {
    if (connection !== 'connecting') return
    const timer = setTimeout(() => {
      setError('TV did not confirm playback. Disconnect and retry.')
      disconnectCast()
    }, 120000)
    return () => clearTimeout(timer)
  }, [connection])

  if (!available) return null
  const connect = async () => {
    if (!castStations.includes(audio.stationId)) {
      setError('This station is unavailable on TV. Choose another station.')
      return
    }
    setError('')
    try {
      const stationId = audio.stationId
      await requestCast({
        type: 'sync', station: audio.stationId, playing: audio.requested,
        volume: audio.volume, muted: audio.muted, scene: params(),
      }, () => currentAudio.current.stationId === stationId ? currentAudio.current.getPlaylistPosition() : undefined)
    } catch {
      setError('Could not connect. Check the TV and try again.')
      disconnectCast()
    }
  }
  const active = connection !== 'disconnected'
  const label = connection === 'connected' ? `Disconnect from ${castDeviceName()}`
    : connection === 'connecting' ? 'Cancel TV connection'
    : connection === 'disconnecting' ? 'Disconnecting from TV' : 'Cast to TV'
  return <>
    <button className="dd-icon" aria-label={label} aria-pressed={connection === 'connected'}
      disabled={connection === 'disconnecting'} onClick={() => active ? disconnectCast() : void connect()}>
      <Cast size={20} />
    </button>
    {active && <span role="status">{connection === 'connecting' ? 'Connecting…'
      : connection === 'disconnecting' ? 'Disconnecting…' : castDeviceName()}</span>}
    {error && <button className="dd-cast-error" aria-label={`${error} Dismiss error`}
      onClick={() => { disconnectCast(); setError('') }}>{error} ×</button>}
  </>
}
