type CapturableMedia = HTMLMediaElement & {
  captureStream?: () => MediaStream
  mozCaptureStream?: () => MediaStream
}

type Lease = { stream: MediaStream; clones: Map<MediaStreamTrack, MediaStreamTrack> }
type Entry = {
  raw: MediaStream | null; leases: Set<Lease>; sync: () => void
  reset: () => void; refresh: () => void; playing: () => void; watched: Set<MediaStreamTrack>
  fault: unknown; disposed: boolean
}
const captures = new WeakMap<HTMLMediaElement, Entry>()

/** Chrome can redirect a media element's audio to its most recent captureStream
 * call. Share one raw capture and give each consumer independently owned clones. */
export function acquireMediaElementAudio(audio: CapturableMedia): { stream: MediaStream; release: () => void } {
  let entry = captures.get(audio)
  if (!entry) {
    const capture = audio.captureStream || audio.mozCaptureStream
    if (!capture) throw new Error('Audio capture is unavailable in this browser.')
    const created: Entry = { raw: null, leases: new Set(), watched: new Set(), sync: () => {}, reset: () => {}, refresh: () => {}, playing: () => {}, fault: null, disposed: false }
    created.sync = () => {
      const tracks = new Set(created.raw?.getAudioTracks().filter(track => track.readyState === 'live') ?? [])
      for (const track of created.watched) if (!tracks.has(track)) {
        track.removeEventListener('ended', created.sync)
        created.watched.delete(track)
      }
      for (const track of tracks) if (!created.watched.has(track)) {
        created.watched.add(track)
        track.addEventListener('ended', created.sync)
      }
      for (const lease of created.leases) {
        for (const [original, clone] of lease.clones) if (!tracks.has(original)) {
          lease.clones.delete(original)
          lease.stream.removeTrack(clone)
          clone.stop()
          // Programmatic addTrack/removeTrack do not dispatch stream events.
          lease.stream.dispatchEvent(new Event('removetrack'))
        }
        for (const original of tracks) if (!lease.clones.has(original)) {
          const clone = original.clone()
          lease.clones.set(original, clone)
          lease.stream.addTrack(clone)
          lease.stream.dispatchEvent(new Event('addtrack'))
        }
      }
    }
    created.reset = () => {
      const previous = created.raw
      created.raw = null
      previous?.removeEventListener('addtrack', created.sync)
      previous?.removeEventListener('removetrack', created.sync)
      previous?.getTracks().forEach(track => track.stop())
      created.fault = null
      created.sync()
    }
    created.refresh = () => {
      // Metadata can precede the replacement decoder's audio provider. Binding
      // there can produce permanently silent tracks after a station change.
      if (created.disposed || audio.readyState < 3 || audio.paused) return
      try {
        if (!created.raw) {
          created.raw = capture.call(audio)
          created.raw.addEventListener('addtrack', created.sync)
          created.raw.addEventListener('removetrack', created.sync)
        }
        created.fault = null
        created.sync()
      } catch (error) { created.fault = error }
    }
    created.playing = () => {
      // canplay/readyState can precede the new decoder's actual output. Reopen
      // the one shared capture when playback really starts, refreshing all leases.
      if (created.raw) created.reset()
      created.refresh()
    }
    // Reusing the element preserves playback controls; Chrome's capture provider
    // must be reopened for a replacement decoder, even if old tracks look live.
    audio.addEventListener('emptied', created.reset)
    audio.addEventListener('loadstart', created.reset)
    audio.addEventListener('loadedmetadata', created.refresh)
    audio.addEventListener('playing', created.playing)
    captures.set(audio, created)
    entry = created
  }
  const current = entry
  const lease: Lease = { stream: new MediaStream(), clones: new Map() }
  current.leases.add(lease)
  let released = false
  const release = () => {
    if (released) return
    released = true
    current.leases.delete(lease)
    lease.clones.forEach(track => track.stop())
    lease.clones.clear()
    if (current.leases.size) return
    current.disposed = true
    audio.removeEventListener('emptied', current.reset)
    audio.removeEventListener('loadstart', current.reset)
    audio.removeEventListener('loadedmetadata', current.refresh)
    audio.removeEventListener('playing', current.playing)
    current.reset()
    if (captures.get(audio) === current) captures.delete(audio)
  }
  try { current.refresh(); if (current.fault) throw current.fault; current.sync() }
  catch (error) { release(); throw error }
  return { stream: lease.stream, release }
}
