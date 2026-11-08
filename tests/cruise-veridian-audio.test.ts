import test from 'node:test'
import assert from 'node:assert/strict'
import { cruiseAudioSource } from '../lib/cruise/audio-source'
import { GET } from '../app/api/cruise/veridian-audio/route'

test('Veridian playback uses a local resolver while other catalog sources stay intact', () => {
  assert.equal(cruiseAudioSource('https://veridian.club/player/tracks/3773305.mp3?single_feature_id=191192'), '/api/cruise/veridian-audio?track=3773305')
  assert.equal(cruiseAudioSource('https://veridian.club/player/2557936/tracks/3643092.mp3'), '/api/cruise/veridian-audio?track=3643092')
  assert.equal(cruiseAudioSource('https://stream.nightride.fm/nightride.mp3'), 'https://stream.nightride.fm/nightride.mp3')
  assert.equal(cruiseAudioSource('/local.mp3'), '/local.mp3')
})

test('Veridian resolver allows catalog tracks and approved audio hosts only', async () => {
  const original = globalThis.fetch
  let requests = 0, target = 'https://bzglfiles.s3.ca-central-1.amazonaws.com/streaming/test.mp3?signature=temporary'
  globalThis.fetch = async (url, options) => {
    requests++
    assert.match(String(url), /^https:\/\/veridian\.club\/player\//)
    assert.equal(options?.redirect, 'manual')
    return new Response(null, { status: 302, headers: { location: target } })
  }
  try {
    const invalid = await GET(new Request('https://www.buenaondalifestyle.com/api/cruise/veridian-audio?track=999999999999&url=http://127.0.0.1'))
    assert.equal(invalid.status, 404); assert.equal(requests, 0)
    const valid = await GET(new Request('https://www.buenaondalifestyle.com/api/cruise/veridian-audio?track=3773305'))
    assert.equal(valid.status, 307); assert.equal(valid.headers.get('location'), target)
    assert.equal(valid.headers.get('access-control-allow-origin'), '*')
    assert.equal(valid.headers.get('cache-control'), 'no-store')
    target = 'http://127.0.0.1/private'
    assert.equal((await GET(new Request('https://www.buenaondalifestyle.com/api/cruise/veridian-audio?track=3773305'))).status, 502)
  } finally { globalThis.fetch = original }
})
