import test from 'node:test'
import assert from 'node:assert/strict'
import { NightAmbience, ambienceTargets, type AmbienceInput } from '../components/cruise/nightdrive/NightAmbience'

const moving: AmbienceInput = { speed: 14, moving: true, visible: true, musicPlaying: true, musicMuted: false, camera: 'chase', districtMix: .5, reduced: false, traffic: [{ distance: 105, lateral: -2, speed: 10 }], distance: 100 }

test('ambience stays silent before unlock and respects every independent silence gate', () => {
  const ambience = new NightAmbience()
  ambience.update(moving)
  assert.equal(ambience.snapshot().state, 'locked')
  assert.equal(ambience.snapshot().nodeCount, 0)
  assert.equal(ambience.recordingStream(), null)
  for (const input of [{ ...moving, moving: false }, { ...moving, visible: false }, { ...moving, musicPlaying: false }, { ...moving, musicMuted: true }]) assert.equal(ambienceTargets(input, true, .2).master, 0)
  assert.equal(ambienceTargets(moving, false, .2).master, 0)
  assert.equal(ambienceTargets(moving, true, 0).master, 0)
  ambience.dispose(); ambience.dispose()
  assert.equal(ambience.snapshot().nodeCount, 0)
})

test('ambience gain is bounded, cockpit quieter, traffic proximity and reduced motion respected', () => {
  const targets = ambienceTargets(moving, true, 100)
  assert.equal(targets.master, .25)
  assert.equal(ambienceTargets(moving, true, NaN).master, 0)
  assert.ok(ambienceTargets({ ...moving, camera: 'driver' }, true, 1).master < targets.master)
  assert.ok(targets.traffic > 0)
  assert.ok(targets.pan < 0)
  assert.equal(ambienceTargets({ ...moving, traffic: [] }, true, 1).traffic, 0)
  assert.equal(ambienceTargets({ ...moving, distance: 300 }, true, 1).traffic, 0)
  assert.equal(ambienceTargets({ ...moving, reduced: true }, true, 1).pan, 0)
  assert.ok(Object.values(ambienceTargets({ ...moving, speed: Infinity, districtMix: NaN }, true, .2)).every(Number.isFinite))
})
