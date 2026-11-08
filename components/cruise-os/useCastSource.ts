'use client'

import { useEffect, useRef } from 'react'
import type { useCruiseAudio } from '@/components/real-miami/audio/useCruiseAudio'
import { registerCastSource } from '@/lib/cruise/cast-source'
import { sendCast } from '@/lib/cruise/google-cast'
import { useCastSenderConnection } from './useCastSenderConnection'

/** Hand over state, then leave rendering and playback entirely on the TV. */
export function useCastSource(audio: ReturnType<typeof useCruiseAudio>, scene: Record<string, string>) {
  const current = useRef({ audio, scene }); current.current = { audio, scene }
  useCastSenderConnection()
  useEffect(() => registerCastSource(() => {
    const { audio, scene } = current.current
    const station = audio.stationId
    return {
      command: { type: 'sync', station, playing: audio.requested, volume: audio.volume, muted: audio.muted, scene },
      playlist: () => current.current.audio.stationId === station ? current.current.audio.getPlaylistPosition() : undefined,
    }
  }), [])
  const sceneKey = JSON.stringify(scene)
  useEffect(() => { sendCast({ type: 'sync', scene: JSON.parse(sceneKey) }) }, [sceneKey])
}
