'use client'

import { useEffect, useRef, useState } from 'react'
import './live-cast-viewport.css'
import { registerLiveCastSource } from '@/lib/cruise/live-cast'
import { createMirrorVideo } from '@/lib/cruise/mirror-video'
import type { MirrorAudio } from '@/lib/cruise/mirror-audio'

type Radio = { station: { name: string }; trackTitle: string; createMirrorAudio: () => Promise<MirrorAudio & { addStream: (stream: MediaStream) => () => void }> }
type Engine = { createMirrorAudio: () => Promise<MirrorAudio> }

/** Keep capture attached to the persistent drive/audio owner, not a menu or camera. */
export function useLiveCastSource(radio: Radio, engine: Engine, receiver: boolean, listeningOnly: boolean) {
  const [active, setActive] = useState(false)
  const viewportOwner = useRef<object | null>(null)
  const [height, setHeight] = useState(720)
  useEffect(() => {
    const resize = () => setHeight(Math.max(innerHeight, innerWidth * 9 / 16))
    resize(); addEventListener('resize', resize)
    return () => removeEventListener('resize', resize)
  }, [])
  const current = useRef({ radio, engine, listeningOnly }); current.current = { radio, engine, listeningOnly }
  useEffect(() => {
    if (receiver) return
    return registerLiveCastSource(async () => {
      const owner = {}; viewportOwner.current = owner
      setActive(true); document.documentElement.dataset.cruiseTv = 'true'
      const restoreViewport = () => {
        if (viewportOwner.current !== owner) return
        viewportOwner.current = null; delete document.documentElement.dataset.cruiseTv; setActive(false)
      }
      let video: ReturnType<typeof createMirrorVideo>
      try { video = createMirrorVideo(() => current.current.listeningOnly
        ? { station: current.current.radio.station.name, track: current.current.radio.trackTitle } : null)
      } catch (error) { restoreViewport(); throw error }
      // Both audio contexts resume in the original Cast tap, before any await.
      const captures = await Promise.allSettled([
        current.current.radio.createMirrorAudio(), current.current.engine.createMirrorAudio(),
      ])
      const [radioResult, engineResult] = captures
      if (radioResult.status === 'rejected') {
        video.dispose(); restoreViewport()
        for (const result of captures) if (result.status === 'fulfilled') result.value.dispose()
        throw radioResult.reason
      }
      // Optional engine audio must never cancel the TV's main picture/radio stream.
      const radioAudio = radioResult.value, engineAudio = engineResult.status === 'fulfilled' ? engineResult.value : null
      let removeEngine: (() => void) | undefined, disposed = false
      try { if (engineAudio) removeEngine = radioAudio.addStream(engineAudio.stream) }
      catch (error) { video.dispose(); restoreViewport(); radioAudio.dispose(); engineAudio?.dispose(); throw error }
      return {
        stream: new MediaStream([...video.stream.getVideoTracks(), ...radioAudio.stream.getAudioTracks()]),
        setLocalSilent(silent: boolean) { radioAudio.setLocalSilent(silent); engineAudio?.setLocalSilent(silent) },
        dispose() {
          if (disposed) return
          disposed = true
          removeEngine?.(); video.dispose(); restoreViewport(); radioAudio.dispose(); engineAudio?.dispose()
        },
      }
    })
  }, [receiver])
  return { active, dpr: Math.min(1, 720 / height) }
}
