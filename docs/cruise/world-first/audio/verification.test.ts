import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { authoredMotion } from '../../../../components/cruise/world-test/WorldAmbience'
import { NightAmbience, type AmbienceInput } from '../../../../components/cruise/nightdrive/NightAmbience'

const contract = JSON.parse(readFileSync(new URL('../world-art/scene-contract.json', import.meta.url), 'utf8'))

test('audio motion follows the authoritative scene phases, including integrated displacement', () => {
  for (let seconds = 0; seconds <= 60; seconds += .25) {
    let distance = 0, speed = contract.timeline.speedPhases[0].startMps
    for (const phase of contract.timeline.speedPhases) {
      const duration = phase.endSeconds - phase.startSeconds
      const u = Math.max(0, Math.min(1, (seconds - phase.startSeconds) / duration))
      distance += duration * (phase.startMps * u + (phase.endMps - phase.startMps) * (u ** 3 - .5 * u ** 4))
      if (seconds >= phase.startSeconds) speed = phase.startMps + (phase.endMps - phase.startMps) * (3 * u * u - 2 * u ** 3)
    }
    assert.deepEqual(authoredMotion(seconds), { speed, distance })
  }
  assert.equal(authoredMotion(60).distance, contract.timeline.longitudinalTravelMeters)
  assert.deepEqual(authoredMotion(-1), authoredMotion(0))
  assert.deepEqual(authoredMotion(Infinity), authoredMotion(0))
  assert.deepEqual(authoredMotion(61), authoredMotion(60))
})

class Param {
  value = 0
  cancelScheduledValues() {}
  setTargetAtTime(value: number) { this.value = value }
}
class Node {
  gain = new Param(); frequency = new Param(); pan = new Param(); Q = new Param()
  disconnected = false; stopped = false; connections: unknown[] = []
  connect(destination: unknown) { this.connections.push(destination) }
  disconnect() { this.disconnected = true; this.connections = [] }
  start() {}
  stop() { this.stopped = true }
}
class Context {
  static instances: Context[] = []
  state = 'suspended'; sampleRate = 100; currentTime = 0; destination = {}; nodes: Node[] = []
  constructor() { Context.instances.push(this) }
  node() { const node = new Node(); this.nodes.push(node); return node }
  createGain() { return this.node() }
  createStereoPanner() { return this.node() }
  createBufferSource() { return this.node() }
  createBiquadFilter() { return this.node() }
  createOscillator() { return this.node() }
  createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) } }
  async resume() { this.state = 'running' }
  async suspend() { this.state = 'suspended' }
  async close() { this.state = 'closed' }
}
const moving: AmbienceInput = { speed: 12, distance: 110, moving: true, visible: true,
  musicPlaying: true, musicMuted: false, camera: 'driver', districtMix: 0, reduced: false, traffic: [] }

test('generated graph unlocks once, silences every lifecycle gate, suspends and fully disposes', async () => {
  const original = globalThis.AudioContext
  globalThis.AudioContext = Context as unknown as typeof AudioContext
  const ambience = new NightAmbience()
  try {
    ambience.setEnabled(false); ambience.setGain(.12); ambience.update(moving)
    assert.equal(ambience.snapshot().nodeCount, 0)
    await ambience.unlock(); await ambience.unlock()
    assert.equal(Context.instances.length, 1)
    assert.equal(ambience.snapshot().targetGain, 0)
    ambience.setEnabled(true)
    assert.equal(ambience.snapshot().targetGain, .12 * .25 * .72)
    for (const input of [{ ...moving, moving: false }, { ...moving, visible: false },
      { ...moving, musicPlaying: false }, { ...moving, musicMuted: true }]) {
      ambience.update(input)
      assert.equal(ambience.snapshot().targetGain, 0)
      ambience.update(moving)
      assert.ok(ambience.snapshot().targetGain > 0)
    }
    ambience.setEnabled(false)
    await new Promise(resolve => setTimeout(resolve, 450))
    assert.equal(Context.instances[0].state, 'suspended')
    assert.equal(Context.instances[0].nodes[0].gain.value, 0)
    ambience.dispose(); ambience.dispose()
    assert.equal(Context.instances[0].state, 'closed')
    assert.ok(Context.instances[0].nodes.every(node => node.disconnected))
    assert.equal(ambience.snapshot().nodeCount, 0)
  } finally { ambience.dispose(); globalThis.AudioContext = original }
})
