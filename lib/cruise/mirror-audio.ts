import { acquireMediaElementAudio } from './media-element-capture'

export type MirrorAudio = {
  stream: MediaStream
  setLocalSilent: (silent: boolean) => void
  dispose: () => void
}

type CapturableAudio = HTMLAudioElement & {
  captureStream?: () => MediaStream
  mozCaptureStream?: () => MediaStream
}
type RadioState = { volume: number; muted: boolean; sourceReady: boolean }

/** A private capture tap: the radio keeps its decoder, playback position and UI.
 * The destination track stays alive when a playlist/station replaces its source. */
export function createMirrorAudioTap(
  audio: CapturableAudio,
  getState: () => RadioState,
  onLocalSilent: (silent: boolean) => void,
  onFailure: (message: string) => void,
): MirrorAudio & { ready: () => Promise<void>; update: () => void; addStream: (stream: MediaStream) => () => void } {
  const capture = audio.captureStream || audio.mozCaptureStream
  if (!capture) throw new Error('This browser cannot share the radio audio. Open Cruise in Chrome to cast.')
  const context = new AudioContext()
  const output = context.createMediaStreamDestination()
  const gain = context.createGain()
  gain.connect(output)
  let captured: MediaStream | null = null
  let captureLease: ReturnType<typeof acquireMediaElementAudio> | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let track: MediaStreamTrack | null = null
  let localSilent = false, disposed = false, fault: Error | null = null
  let missingSince = 0
  let resolveStopped!: () => void
  const stopped = new Promise<void>(resolve => { resolveStopped = resolve })
  const extraSources = new Set<MediaStreamAudioSourceNode>()

  const update = () => {
    if (disposed) return
    const state = getState()
    const volume = Number.isFinite(state.volume) ? Math.min(1, Math.max(0, state.volume)) : 0
    gain.gain.setTargetAtTime(state.muted ? 0 : volume, context.currentTime, .015)
    // This flag distinguishes output routing from the listener's mute intent.
    if (localSilent && !state.muted) audio.dataset.cruiseLocalSilent = 'true'
    else delete audio.dataset.cruiseLocalSilent
    audio.muted = state.muted || localSilent
  }
  const disconnectSource = () => {
    source?.disconnect()
    source = null
    track = null
  }
  const wireTrack = () => {
    if (disposed || !captured) return
    const next = captured.getAudioTracks().find(item => item.readyState === 'live') ?? null
    if (next === track) return
    disconnectSource()
    if (!next) return
    try {
      source = context.createMediaStreamSource(new MediaStream([next]))
      source.connect(gain)
      track = next
    } catch {
      fail('This station cannot share its audio with the TV. Try Nightride FM or another station.')
    }
  }
  const releaseCapture = () => {
    disconnectSource()
    const previous = captured
    captured = null
    previous?.removeEventListener('addtrack', wireTrack)
    previous?.removeEventListener('removetrack', wireTrack)
    captureLease?.release()
    captureLease = null
    missingSince = 0
  }
  const readableSource = () => {
    const url = new URL(audio.currentSrc || audio.src, location.href)
    return url.origin === location.origin || url.protocol === 'data:' || url.protocol === 'blob:' || audio.crossOrigin !== null
  }
  const attach = () => {
    if (disposed || !getState().sourceReady || audio.readyState < 1) return
    if (!readableSource()) {
      fail('This station does not allow audio sharing. Choose Nightride FM or another station to cast.')
      return
    }
    if (!captured) {
      try {
        captureLease = acquireMediaElementAudio(audio)
        captured = captureLease.stream
        captured.addEventListener('addtrack', wireTrack)
        captured.addEventListener('removetrack', wireTrack)
      } catch {
        fail('This station cannot share its audio with the TV. Try another station.')
        return
      }
    }
    wireTrack()
  }
  const sourceChanged = () => { releaseCapture(); attach() }
  const events = ['playing', 'loadedmetadata', 'canplay'] as const
  events.forEach(event => audio.addEventListener(event, attach))
  audio.addEventListener('emptied', sourceChanged)
  audio.addEventListener('loadstart', sourceChanged)
  const timer = setInterval(() => {
    update()
    attach()
    if (disposed) return
    // Paused/garage/loading audio can legitimately have no track or be silent.
    if (!getState().sourceReady || audio.paused || audio.readyState < 3) { missingSince = 0; return }
    if (track?.readyState === 'live' && !track.muted) { missingSince = 0; return }
    missingSince ||= Date.now()
    if (Date.now() - missingSince > 6000) fail('The station audio could not be shared. Try another station and cast again.')
  }, 200)
  function dispose() {
    if (disposed) return
    disposed = true
    resolveStopped()
    clearInterval(timer)
    events.forEach(event => audio.removeEventListener(event, attach))
    audio.removeEventListener('emptied', sourceChanged)
    audio.removeEventListener('loadstart', sourceChanged)
    releaseCapture()
    gain.disconnect()
    extraSources.forEach(node => node.disconnect())
    extraSources.clear()
    output.stream.getTracks().forEach(item => item.stop())
    void context.close().catch(() => {})
    localSilent = false
    onLocalSilent(false)
    delete audio.dataset.cruiseLocalSilent
    audio.muted = getState().muted
  }
  function fail(message: string) {
    if (disposed) return
    fault = new Error(message)
    dispose()
    onFailure(message)
  }
  // resume() is invoked immediately in the Cast button's user gesture.
  const resumed = context.resume().catch(() => { if (!disposed) fail('Tap Cast again to enable audio sharing.') })
  update()
  attach()
  return {
    stream: output.stream,
    update,
    async ready() {
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([resumed, stopped, new Promise<void>(resolve => {
          timeout = setTimeout(() => { fail('Tap Cast again to enable audio sharing.'); resolve() }, 5000)
        })])
      } finally { clearTimeout(timeout) }
      if (fault) throw fault
      if (disposed) throw new Error('Audio sharing was cancelled.')
      if (audio.paused || !getState().sourceReady) return
      const started = Date.now()
      while (!disposed && !audio.paused && getState().sourceReady && (!track || track.readyState !== 'live' || track.muted)) {
        if (Date.now() - started > 6500) {
          fail('The station audio could not be shared. Try another station and cast again.')
          break
        }
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      if (fault) throw fault
      if (disposed) throw new Error('Audio sharing was cancelled.')
    },
    setLocalSilent(silent) {
      if (disposed) return
      localSilent = silent
      onLocalSilent(silent)
      update()
    },
    addStream(stream) {
      if (disposed) return () => {}
      const node = context.createMediaStreamSource(stream)
      // Additional generated audio has its own volume control, unlike radio.
      node.connect(output)
      extraSources.add(node)
      return () => { node.disconnect(); extraSources.delete(node) }
    },
    dispose,
  }
}

