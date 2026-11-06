import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePlaylistPosition, parsePlaylistTrack, playlistTrackId, resolvePlaylistPosition } from '../lib/cruise/cast-playlist'
import { createCastReceiverController, type ReceiverValue } from '../lib/cruise/cast-receiver-state'
import type { CastCommand } from '../lib/cruise/google-cast'

const tracks = [
  { src: 'https://example.test/audio/one.mp3', title: 'One', artist: 'Artist' },
  { src: 'https://example.test/audio/two.mp3', title: 'Two', artist: 'Artist' },
]
const cursor = { trackId: playlistTrackId(tracks[1].src), position: 123.5 }

test('playlist identity resolves the same catalog track after order changes, never an arbitrary URL', () => {
  assert.deepEqual(resolvePlaylistPosition(tracks, cursor), { index: 1, position: 123.5 })
  assert.deepEqual(resolvePlaylistPosition([...tracks].reverse(), cursor), { index: 0, position: 123.5 })
  assert.equal(resolvePlaylistPosition([tracks[0]], cursor), null)
  assert.equal(resolvePlaylistPosition(tracks, { trackId: 'https://evil.test/audio.mp3', position: 0 }), null)
  for (const position of [-1, Infinity, NaN, 86401, '12']) assert.equal(parsePlaylistPosition({ ...cursor, position }), undefined)
})

test('receiver metadata is bounded and must identify the selected catalog track', () => {
  assert.deepEqual(parsePlaylistTrack(tracks[1], cursor), tracks[1])
  assert.equal(parsePlaylistTrack(tracks[0], cursor), null)
  assert.equal(parsePlaylistTrack({ ...tracks[1], title: 'x'.repeat(501) }, cursor), null)
  const unsafe = { ...tracks[1], src: 'https://user:password@example.test/two.mp3' }
  assert.equal(parsePlaylistTrack(unsafe, { ...cursor, trackId: playlistTrackId(unsafe.src) }), null)
})

function receiver(playing: boolean) {
  let currentCursor: typeof cursor | undefined
  const calls: string[] = []
  const audio: ReceiverValue['audio'] = {
    stationId: 'veridian-club', playing: false, requested: false, loading: false,
    volume: .5, muted: false, error: null, currentTrack: null,
    selectStation() { return true }, start() { audio.requested = true; calls.push('play') },
    pause() { audio.requested = false; audio.playing = false; calls.push('pause') },
    setVolume(volume) { audio.volume = volume }, setMuted(muted) { audio.muted = muted },
    restorePlaylistPosition(value) { calls.push(`restore:${value.trackId}`); return true },
    getPlaylistPosition() { return currentCursor },
    getMediaState() { return { currentTime: currentCursor?.position ?? 0, readyState: currentCursor ? 4 : 0, paused: !audio.playing } },
  }
  const value: ReceiverValue = { audio, ready: true, start() {}, scene() {} }
  const controller = createCastReceiverController(() => value, ['veridian-club'])
  const command: CastCommand = { version: 1, sequence: 1, requestId: 'playlist-handoff', type: 'sync',
    station: 'veridian-club', playing, muted: true, volume: .5, playlist: cursor }
  return { audio, calls, controller, command, setCursor(next: typeof cursor) { currentCursor = next } }
}

for (const playing of [false, true]) test(`playlist handoff waits for actual matching seek; playing=${playing}`, () => {
  const h = receiver(playing)
  h.controller.receive(h.command)
  assert.equal(h.controller.tick().ackRequestId, undefined)
  h.audio.playing = playing
  assert.equal(h.controller.tick().ackRequestId, undefined, 'playlist fetch has not finished')
  h.setCursor({ trackId: playlistTrackId(tracks[0].src), position: 123.5 })
  assert.equal(h.controller.tick().ackRequestId, undefined, 'wrong track cannot transfer ownership')
  h.setCursor({ ...cursor, position: 0 })
  assert.equal(h.controller.tick().ackRequestId, undefined, 'track must seek to the selected offset')
  h.setCursor(cursor)
  h.audio.currentTrack = tracks[1]
  const state = h.controller.tick()
  assert.equal(state.ackRequestId, 'playlist-handoff')
  assert.deepEqual(state.playlist, cursor)
  assert.deepEqual(state.track, tracks[1])
  assert.deepEqual(state.media, { currentTime: 123.5, readyState: 4, paused: !playing })
  if (!playing) assert.equal(h.calls.includes('play'), false)
})

test('asynchronous playlist failure identifies the current request without fabricating an acknowledgement', () => {
  const h = receiver(true)
  h.controller.receive(h.command)
  h.controller.tick()
  h.audio.error = 'Selected track is missing'
  const failed = h.controller.tick()
  assert.equal(failed.ackRequestId, undefined)
  assert.equal(failed.errorRequestId, 'playlist-handoff')
  assert.match(failed.error!, /missing/)
})
