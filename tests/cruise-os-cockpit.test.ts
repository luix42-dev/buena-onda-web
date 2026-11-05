import test from 'node:test'
import assert from 'node:assert/strict'
import { cruiseCockpitProfile } from '../lib/cruise-os/cockpit'
import { WRANGLER_CAMERA_PROFILE } from '../lib/real-miami/ride-vehicles'

test('seat adjustment is opt-in; radio focus and chase remain independent', () => {
  const source = { ...WRANGLER_CAMERA_PROFILE, driver: [-.34,.79,.15] as [number,number,number] }
  const before = JSON.stringify(source)
  assert.equal(cruiseCockpitProfile(source,'countach'), source)
  assert.equal(cruiseCockpitProfile(source,'wrangler',true), source)
  const adjusted = cruiseCockpitProfile(source,'countach',true)
  assert.equal(JSON.stringify(source),before)
  assert.ok(adjusted.driver[1]>source.driver[1])
  assert.ok(adjusted.driver.every(Number.isFinite))
  assert.ok(adjusted.driverFov!>=62)
  assert.ok(adjusted.target[1]<adjusted.driver[1])
  assert.equal(adjusted.radioPosition,source.radioPosition)
  assert.equal(adjusted.radioTarget,source.radioTarget)
  assert.equal(adjusted.chase,source.chase)
})
