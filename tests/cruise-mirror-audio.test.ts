import test from 'node:test'
import assert from 'node:assert/strict'
import { createMirrorAudioTap } from '../lib/cruise/mirror-audio'
import { acquireMediaElementAudio } from '../lib/cruise/media-element-capture'

class Track extends EventTarget {
  readyState = 'live'
  muted = false
  stops = 0
  stop() { this.stops++; this.readyState = 'ended' }
  clone() { return new Track() }
}
class Stream extends EventTarget {
  constructor(public tracks: Track[] = []) { super() }
  getAudioTracks() { return this.tracks }
  getTracks() { return this.tracks }
  addTrack(track: Track) { this.tracks.push(track) }
  removeTrack(track: Track) { this.tracks = this.tracks.filter(item => item !== track) }
}
class Node {
  connected = new Set<Node>()
  connect(node: Node) { this.connected.add(node); return node }
  disconnect(node?: Node) { if (node) this.connected.delete(node); else this.connected.clear() }
}
class Gain extends Node {
  gain = { value: 1, setTargetAtTime: (value: number) => { this.gain.value = value } }
}
class Context {
  static latest: Context
  static resumeGate: Promise<void> | null = null
  currentTime = 0
  state = 'running'
  gain = new Gain()
  sources: Node[] = []
  constructor() { Context.latest = this }
  createGain() { return this.gain }
  createMediaStreamDestination() { return Object.assign(new Node(), { stream: new Stream([new Track()]) }) }
  createMediaStreamSource() { const node = new Node(); this.sources.push(node); return node }
  resume() { return Context.resumeGate ?? Promise.resolve() }
  close() { this.state = 'closed'; return Promise.resolve() }
}
class Audio extends EventTarget {
  src = 'https://radio.example/live'
  currentSrc = this.src
  crossOrigin: string | null = 'anonymous'
  readyState = 4
  paused = false
  muted = false
  dataset: Record<string, string> = {}
  captures: Stream[] = []
  nextTracks: Track[] = [new Track()]
  captureStream() { const stream = new Stream(this.nextTracks); this.captures.push(stream); return stream }
}

test('mirror audio preserves its output track and local intent through station changes', async () => {
  const originals = ['AudioContext', 'MediaStream', 'location'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
  Object.defineProperties(globalThis, {
    AudioContext: { configurable: true, value: Context },
    MediaStream: { configurable: true, value: Stream },
    location: { configurable: true, value: new URL('https://cruise.example/cruise') },
  })
  const audio = new Audio(), state = { volume: .7, muted: false, sourceReady: true }
  const errors: string[] = [], suppression: boolean[] = []
  const make = () => createMirrorAudioTap(audio as unknown as HTMLAudioElement, () => state, value => suppression.push(value), error => errors.push(error))
  try {
    const musicLease = acquireMediaElementAudio(audio as unknown as HTMLAudioElement)
    const mirrorLease = acquireMediaElementAudio(audio as unknown as HTMLAudioElement)
    assert.equal(audio.captures.length, 1, 'music and mirror share a single browser capture')
    assert.notEqual(musicLease.stream.getAudioTracks()[0], mirrorLease.stream.getAudioTracks()[0])
    const raw = audio.captures[0], rawTrack = raw.tracks[0], mirrorTrack = mirrorLease.stream.getAudioTracks()[0]
    musicLease.release()
    assert.equal(rawTrack.readyState, 'live', 'restarting music analysis cannot stop mirror capture')
    assert.equal(mirrorTrack.readyState, 'live')
    const resumedMusic = acquireMediaElementAudio(audio as unknown as HTMLAudioElement)
    assert.equal(audio.captures.length, 1)
    let additions = 0, removals = 0
    mirrorLease.stream.addEventListener('addtrack', () => additions++)
    mirrorLease.stream.addEventListener('removetrack', () => removals++)
    const switchedTrack = new Track()
    raw.tracks = [switchedTrack]; raw.dispatchEvent(new Event('addtrack'))
    assert.equal(additions, 1); assert.equal(removals, 1)
    assert.equal(mirrorTrack.readyState, 'ended')
    assert.notEqual(mirrorLease.stream.getAudioTracks()[0], resumedMusic.stream.getAudioTracks()[0])
    audio.readyState = 0; audio.dispatchEvent(new Event('emptied'))
    assert.equal(switchedTrack.readyState, 'ended')
    assert.equal(mirrorLease.stream.getAudioTracks().length, 0)
    audio.nextTracks = [new Track()]; audio.readyState = 1
    audio.dispatchEvent(new Event('loadedmetadata'))
    assert.equal(audio.captures.length, 1, 'metadata alone must not bind the replacement audio provider')
    audio.readyState = 4; audio.dispatchEvent(new Event('playing'))
    assert.equal(audio.captures.length, 2, 'replacement source opens exactly one raw capture once playing')
    assert.equal(mirrorLease.stream.getAudioTracks()[0].readyState, 'live')
    assert.equal(resumedMusic.stream.getAudioTracks()[0].readyState, 'live')
    mirrorLease.release(); mirrorLease.release()
    assert.equal(audio.nextTracks[0].readyState, 'live')
    resumedMusic.release()
    assert.equal(audio.nextTracks[0].stops, 1, 'raw capture stops only after its last consumer releases')
    audio.captures = []; audio.nextTracks = [new Track()]

    const earlyMusic = acquireMediaElementAudio(audio as unknown as HTMLAudioElement)
    const earlyTv = acquireMediaElementAudio(audio as unknown as HTMLAudioElement)
    const earlyTrack = earlyTv.stream.getAudioTracks()[0]
    audio.nextTracks = [new Track()]
    audio.dispatchEvent(new Event('playing'))
    assert.equal(audio.captures.length, 2, 'playing replaces an early capture with the active decoder')
    assert.equal(earlyTrack.readyState, 'ended')
    assert.equal(earlyMusic.stream.getAudioTracks()[0].readyState, 'live')
    assert.equal(earlyTv.stream.getAudioTracks()[0].readyState, 'live')
    earlyMusic.release(); earlyTv.release()
    audio.captures = []; audio.nextTracks = [new Track()]

    const tap = make()
    try {
      await tap.ready()
      const output = tap.stream.getAudioTracks()[0]
      const firstSourceTrack = audio.captures[0].tracks[0]
      assert.equal(Context.latest.gain.gain.value, .7)
      tap.setLocalSilent(true)
      assert.equal(audio.muted, true)
      assert.equal(audio.dataset.cruiseLocalSilent, 'true')
      assert.equal(Context.latest.gain.gain.value, .7, 'local suppression must not mute TV')
      state.volume = .3; state.muted = true; tap.update()
      assert.equal(Context.latest.gain.gain.value, 0)
      assert.equal(audio.dataset.cruiseLocalSilent, undefined, 'UI mute still disables scene analysis')
      state.muted = false; tap.update()
      assert.equal(Context.latest.gain.gain.value, .3)
      assert.equal(audio.muted, true, 'phone stays suppressed after listener unmutes')

      audio.readyState = 0; audio.dispatchEvent(new Event('emptied'))
      assert.equal(firstSourceTrack.readyState, 'ended')
      audio.nextTracks = []; audio.readyState = 4; audio.dispatchEvent(new Event('playing'))
      const replacement = audio.captures.at(-1)!, secondSourceTrack = new Track()
      replacement.tracks.push(secondSourceTrack); replacement.dispatchEvent(new Event('addtrack'))
      assert.equal(tap.stream.getAudioTracks()[0], output, 'station changes preserve the peer audio track')
      assert.equal(Context.latest.sources.at(-1)!.connected.size, 1)
      assert.equal(output.readyState, 'live')
      const engine = new Stream([new Track()])
      const removeEngine = tap.addStream(engine as unknown as MediaStream)
      const engineSource = Context.latest.sources.at(-1)!
      assert.equal(engineSource.connected.size, 1)
      removeEngine(); assert.equal(engineSource.connected.size, 0)
      tap.dispose(); tap.dispose()
      assert.equal(audio.muted, false, 'disconnect restores current UI mute intent')
      assert.equal(output.readyState, 'ended')
      assert.equal(secondSourceTrack.stops, 1)
      assert.equal(engine.tracks[0].stops, 0, 'mixer does not own external engine track')
      assert.deepEqual(errors, [])
    } finally { tap.dispose() }

    audio.paused = true; audio.readyState = 0; state.sourceReady = false
    const garageTap = make()
    try {
      await garageTap.ready()
      assert.equal(garageTap.stream.getAudioTracks()[0].readyState, 'live')
      state.sourceReady = true; audio.paused = false; audio.readyState = 4; audio.nextTracks = [new Track()]
      audio.dispatchEvent(new Event('playing'))
      assert.equal(Context.latest.sources.length, 1, 'garage stream binds radio when the drive starts')
      state.muted = true
      garageTap.setLocalSilent(true)
    } finally { garageTap.dispose() }
    assert.equal(audio.muted, true, 'disconnect preserves a listener mute made during casting')
    state.muted = false

    audio.crossOrigin = null
    const blocked = make()
    await assert.rejects(blocked.ready(), /does not allow audio sharing/)
    assert.equal(audio.muted, false)
    assert.equal(blocked.stream.getAudioTracks()[0].readyState, 'ended')
    assert.equal(errors.length, 1)

    const warnings: string[] = []
    audio.paused = false; audio.readyState = 4; state.sourceReady = true
    audio.nextTracks = [new Track()]
    const recoverable = createMirrorAudioTap(audio as unknown as HTMLAudioElement, () => state, () => {}, message => (errors as string[]).push(message), message => warnings.push(message))
    try {
      await recoverable.ready()
      assert.equal(recoverable.stream.getAudioTracks()[0].readyState, 'live', 'initial blocked station must still allow TV startup')
      assert.match(warnings.at(-1)!, /unavailable on TV/)
      audio.crossOrigin = 'anonymous'; audio.dispatchEvent(new Event('playing'))
      assert.equal(warnings.at(-1), '')
      recoverable.setLocalSilent(true)
      const output = recoverable.stream.getAudioTracks()[0]
      audio.crossOrigin = null
      audio.dispatchEvent(new Event('loadstart'))
      assert.equal(output.readyState, 'live', 'a blocked station must not terminate the TV audio track')
      assert.match(warnings.at(-1)!, /unavailable on TV/)
      assert.equal(errors.length, 1, 'a station warning must not become a cast failure')
      audio.crossOrigin = 'anonymous'; audio.nextTracks = [new Track()]
      audio.dispatchEvent(new Event('playing'))
      assert.equal(recoverable.stream.getAudioTracks()[0], output)
      assert.equal(warnings.at(-1), '', 'a playable station clears the warning')
    } finally { recoverable.dispose() }

    let resume!: () => void
    Context.resumeGate = new Promise(resolve => { resume = resolve })
    const focusPending = createMirrorAudioTap(audio as unknown as HTMLAudioElement, () => state, () => {}, () => {}, () => {})
    await focusPending.ready()
    assert.equal(focusPending.stream.getAudioTracks()[0].readyState, 'live', 'TV startup must not wait for Android audio focus')
    focusPending.dispose()
    const pending = make(), ready = pending.ready()
    pending.dispose()
    await assert.rejects(ready, /cancelled/)
    resume()
    assert.equal(audio.muted, false)
  } finally {
    Context.resumeGate = null
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
