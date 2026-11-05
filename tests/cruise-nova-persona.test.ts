/** NOVA persona rules: rhythm per chattiness, greeting once, no repeats, gaps, discovery gating. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createNovaState, decide, spoke, RHYTHM, LINES } from '../lib/cruise/nova/persona'

const on = (now: number) => ({ playing: true, stable: true, now })

test('off never speaks; quiet only greets', () => {
  assert.equal(decide(createNovaState('off'), 'first_encounter', on(100)), null)
  const quiet = createNovaState('quiet')
  assert.equal(decide(quiet, 'discovery', on(100), () => 0), null)
  assert.equal(decide(quiet, 'first_encounter', on(100))?.id, 'first_encounter')
})

test('silent while the radio is not playing or not settled', () => {
  const s = createNovaState()
  assert.equal(decide(s, 'first_encounter', { playing: false, stable: true, now: 50 }), null)
  assert.equal(decide(s, 'first_encounter', { playing: true, stable: false, now: 50 }), null)
})

test('greets once per session', () => {
  let s = createNovaState()
  const line = decide(s, 'first_encounter', on(40))!
  s = spoke(s, line, 40)
  assert.equal(decide(s, 'welcome_back', on(41)), null)
  assert.equal(decide(s, 'first_encounter', on(5000)), null)
})

test('occasional keeps a six-minute gap and never repeats a line', () => {
  let s = createNovaState('occasional')
  s = spoke(s, decide(s, 'first_encounter', on(40))!, 40)
  assert.equal(decide(s, 'discovery', on(40 + 120), () => 0), null, 'too soon after the greeting')
  const first = decide(s, 'discovery', on(40 + RHYTHM.occasional.minGapSec + 1), () => 0)!
  assert.ok(first)
  s = spoke(s, first, 40 + RHYTHM.occasional.minGapSec + 1)
  const later = decide(s, 'discovery', on(4000), () => 0)!
  assert.notEqual(later.id, first.id)
})

test('discovery is a coin flip at the configured chance, and runs dry rather than repeating', () => {
  let s = createNovaState('chatty')
  assert.equal(decide(s, 'discovery', on(1000), () => .95), null)
  let t = 1000
  for (let i = 0; i < LINES.filter(line=>line.moment==='discovery').length; i++) { const l = decide(s, 'discovery', on(t), () => 0)!; assert.ok(l); s = spoke(s, l, t); t += 400 }
  assert.equal(decide(s, 'discovery', on(t), () => 0), null)
})

test('hourly cap holds even when gaps allow', () => {
  let s = createNovaState('chatty')
  let t = 0, count = 0
  for (const m of ['sunset', 'late_night', 'save_offer', 'quiet', 'tease', 'discovery', 'discovery', 'discovery'] as const) {
    const l = decide(s, m, on(t), () => 0); if (l) { s = spoke(s, l, t); count++ } t += 151
  }
  assert.ok(count <= RHYTHM.chatty.perHour)
  assert.ok(count >= 6)
})
