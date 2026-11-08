'use client'

import { useEffect, useRef } from 'react'
import { registerLiveCastSource } from '@/lib/cruise/live-cast'
import { createMirrorVideo } from '@/lib/cruise/mirror-video'
import type { MirrorAudio } from '@/lib/cruise/mirror-audio'

type Radio = { station: { name: string }; trackTitle: string; createMirrorAudio: () => Promise<MirrorAudio & { addStream: (stream: MediaStream) => () => void }> }
type Engine = { createMirrorAudio: () => Promise<MirrorAudio> }

/** Keep capture attached to the persistent drive/audio owner, not a menu or camera. */
export function useLiveCastSource(radio: Radio, engine: Engine, receiver: boolean, listeningOnly: boolean) {
  const current = useRef({ radio, engine, listeningOnly }); current.current = { radio, engine, listeningOnly }
  useEffect(() => {
    if (receiver) return
    return registerLiveCastSource(async () => {
      const video = createMirrorVideo(() => current.current.listeningOnly
        ? { station: current.current.radio.station.name, track: current.current.radio.trackTitle } : null)
      // Both audio contexts resume in the original Cast tap, before any await.
      const captures = await Promise.allSettled([
        current.current.radio.createMirrorAudio(), current.current.engine.createMirrorAudio(),
      ])
      const [radioResult, engineResult] = captures
      if (radioResult.status === 'rejected' || engineResult.status === 'rejected') {
        video.dispose()
        for (const result of captures) if (result.status === 'fulfilled') result.value.dispose()
        throw radioResult.status === 'rejected' ? radioResult.reason : (engineResult as PromiseRejectedResult).reason
      }
      const radioAudio = radioResult.value, engineAudio = engineResult.value
      let removeEngine: (() => void) | undefined, disposed = false
      try { removeEngine = radioAudio.addStream(engineAudio.stream) }
      catch (error) { video.dispose(); radioAudio.dispose(); engineAudio.dispose(); throw error }
      return {
        stream: new MediaStream([...video.stream.getVideoTracks(), ...radioAudio.stream.getAudioTracks()]),
        setLocalSilent(silent: boolean) { radioAudio.setLocalSilent(silent); engineAudio.setLocalSilent(silent) },
        dispose() {
          if (disposed) return
          disposed = true
          removeEngine?.(); video.dispose(); radioAudio.dispose(); engineAudio.dispose()
        },
      }
    })
  }, [receiver])
}
