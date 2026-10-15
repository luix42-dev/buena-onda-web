import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePostcardDetails, postcardAttribution, postcardDimensions, postcardUrl } from '../lib/experience/postcard'

test('postcard metadata is bounded text, records only supplied verified track and keeps attribution', () => {
  const item = normalizePostcardDetails({ carLabel: 'Wrangler\n2012', location: 'Ocean Drive', station: 'Jolt Radio', verifiedTrack: null, url: 'https://example.com/cruise/experience?station=jolt-radio' })
  assert.equal(item.carLabel, 'Wrangler 2012'); assert.equal(item.verifiedTrack, null)
  assert.ok(item.attribution?.includes('funassets')); assert.ok(item.attribution?.includes('OpenStreetMap')); assert.ok(item.attribution?.includes('Poly Haven'))
  assert.equal(normalizePostcardDetails({ ...item, verifiedTrack: 'a'.repeat(400) }).verifiedTrack?.length, 240)
})
test('postcard links permit public HTTPS and local preview but reject unsafe URLs and credentials', () => {
  assert.ok(postcardUrl('https://example.com/cruise/experience?station=nts-radio').includes('station=nts-radio'))
  assert.ok(postcardUrl('http://127.0.0.1:3076/cruise/experience'))
  for (const value of ['javascript:alert(1)', 'data:text/html,hi', 'http://external.example/', 'https://name:secret@example.com/', 'not a url']) assert.equal(postcardUrl(value), '')
})
test('postcard dimensions bound native capture and reserve readable caption space', () => {
  assert.deepEqual(postcardDimensions(1280, 720), { width: 1280, sceneHeight: 720, footerHeight: 320, height: 1040 })
  assert.equal(postcardDimensions(3840, 2160).width, 1920)
  assert.equal(postcardDimensions(390, 844).width, 720)
  assert.throws(() => postcardDimensions(0, 1)); assert.throws(() => postcardDimensions(NaN, 100))
})
test('each supported vehicle receives matching attribution rather than invented ownership', () => {
  for (const [car, author] of [['Countach', 'Randomness'], ['Fiero GT', 'loadversus'], ['Cadillac', 'DisneyCars'], ['DeLorean', 'fuunv.se'], ['Wrangler', 'funassets']]) assert.ok(postcardAttribution(car).includes(author))
})
