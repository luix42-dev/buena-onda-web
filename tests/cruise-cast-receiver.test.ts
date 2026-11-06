import test from 'node:test'
import assert from 'node:assert/strict'
import { createCastReceiverController, type ReceiverValue } from '../lib/cruise/cast-receiver-state'
import type { CastCommand } from '../lib/cruise/google-cast'

function harness() {
  const calls: string[] = []
  const audio: ReceiverValue['audio'] = {
    stationId: 'jolt', playing: false, requested: false, loading: false,
    volume: .8, muted: false, error: null,
    selectStation(id) { calls.push(`station:${id}`); audio.stationId = id; audio.playing = false; return true },
    start() { calls.push('play'); audio.requested = true; audio.loading = true },
    pause() { calls.push('pause'); audio.requested = false; audio.playing = false; audio.loading = false },
    setVolume(volume) { calls.push(`volume:${volume}`); audio.volume = volume },
    setMuted(muted) { calls.push(`muted:${muted}`); audio.muted = muted },
  }
  const value: ReceiverValue = {
    audio, ready: false, sceneState: { drive: 'highway', car: 'countach', time: 'night', mood: 'night-drive' },
    start() { calls.push('drive') },
    scene(scene) { calls.push(`scene:${scene.drive ?? ''}`) },
  }
  const controller = createCastReceiverController(() => value, ['jolt', 'nightride'])
  let sequence = 0
  const receive = (command: Omit<CastCommand, 'version' | 'sequence'>) => controller.receive({ ...command, version: 1, sequence: ++sequence })
  return { audio, value, calls, controller, receive }
}

test('receiver begins muted and retains launch sync through status/volume probes during warmup', () => {
  const h = harness()
  assert.deepEqual(h.calls, ['muted:true'])
  h.receive({ type: 'sync', station: 'nightride', playing: true, muted: true, requestId: 'launch' })
  h.receive({ type: 'status' })
  h.receive({ type: 'volume', volume: .4 })
  assert.equal(h.controller.tick().ackRequestId, undefined)
  assert.equal(h.audio.requested, false)
  h.value.ready = true
  const starting = h.controller.tick()
  assert.equal(h.audio.stationId, 'nightride')
  assert.equal(h.audio.requested, true)
  assert.equal(h.audio.volume, .4)
  assert.ok(h.calls.indexOf('muted:true') < h.calls.indexOf('station:nightride'))
  assert.equal(starting.ackRequestId, undefined)
  h.audio.playing = true
  h.audio.loading = false
  assert.equal(h.controller.tick().ackRequestId, 'launch')
})

test('handoff acknowledgement waits for scene, selected station, actual playing and mute state', () => {
  const h = harness()
  h.value.ready = true
  h.receive({ type: 'sync', station: 'nightride', playing: true, muted: true,
    volume: .7, scene: { drive: 'retrowave' }, requestId: 'launch' })
  assert.equal(h.controller.tick().ackRequestId, undefined)
  h.audio.playing = true
  h.audio.loading = false
  assert.equal(h.controller.tick().ackRequestId, undefined, 'old world must not acknowledge new scene')
  h.value.sceneState = { ...h.value.sceneState, drive: 'retrowave' }
  h.value.ready = false
  assert.equal(h.controller.tick().ackRequestId, undefined, 'world still warming')
  h.value.ready = true
  h.audio.stationId = 'jolt'
  assert.equal(h.controller.tick().ackRequestId, undefined, 'stale station must not acknowledge')
  h.audio.stationId = 'nightride'
  h.audio.muted = false
  assert.equal(h.controller.tick().ackRequestId, undefined, 'receiver must confirm handoff mute')
  h.audio.muted = true
  assert.equal(h.controller.tick().ackRequestId, 'launch')
  h.receive({ type: 'volume', muted: false, volume: .5 })
  h.receive({ type: 'status' })
  assert.equal(h.controller.tick().ackRequestId, 'launch', 'ack survives volume restore and status probes')
})

test('paused launch stays paused and station changes retain paused state and volume', () => {
  const h = harness()
  h.value.ready = true
  h.receive({ type: 'sync', station: 'nightride', playing: false, volume: .6, muted: true, requestId: 'paused' })
  assert.equal(h.controller.tick().ackRequestId, undefined, 'never acknowledge the same tick that starts the scene')
  const state = h.controller.tick()
  assert.equal(state.ackRequestId, 'paused')
  assert.equal(state.playing, false)
  assert.equal(state.requested, false)
  assert.equal(h.calls.includes('play'), false)
  h.receive({ type: 'station', station: 'jolt', requestId: 'next' })
  h.controller.tick()
  assert.equal(h.controller.tick().ackRequestId, 'next')
  assert.equal(h.audio.requested, false)
  assert.equal(h.audio.volume, .6)
  assert.equal(h.audio.muted, true)
})

test('after launch, pause and volume work while the next world is warming', () => {
  const h = harness()
  h.value.ready = true
  h.receive({ type: 'sync', playing: true, muted: true })
  h.controller.tick()
  h.audio.playing = true
  h.audio.loading = false
  h.value.ready = false
  h.receive({ type: 'pause' })
  h.receive({ type: 'volume', volume: .2 })
  h.controller.tick()
  assert.equal(h.audio.playing, false)
  assert.equal(h.audio.requested, false)
  assert.equal(h.audio.volume, .2)
})

test('unvalidated stations and invalid scene choices never reach playback', () => {
  const h = harness()
  h.value.ready = true
  h.receive({ type: 'sync', station: 'unknown', playing: true, requestId: 'invalid' })
  assert.match(h.controller.tick().error!, /Station not validated/)
  assert.equal(h.calls.includes('play'), false)
  h.receive({ type: 'sync', scene: { drive: 'unknown' }, playing: true, requestId: 'invalid-scene' })
  assert.match(h.controller.tick().error!, /scene is not available/)
  assert.equal(h.calls.includes('play'), false)
  h.receive({ type: 'sync', station: 'jolt', playing: false, muted: true, requestId: 'valid' })
  h.controller.tick()
  assert.equal(h.controller.tick().ackRequestId, 'valid')
})
