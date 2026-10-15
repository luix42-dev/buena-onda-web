import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_SUNSET_SECONDS, experienceCameraProfile, nightBlend, sunsetDurationSeconds } from '../lib/experience/atmosphere'
import { WRANGLER_CAMERA_PROFILE, type RideCameraProfile, type RideVehicleId } from '../lib/real-miami/ride-vehicles'

test('URL sunset duration accepts only plain decimal minutes in the 30–45 range', () => {
  assert.equal(sunsetDurationSeconds('30'), 1800)
  assert.equal(sunsetDurationSeconds('45'), 2700)
  assert.equal(sunsetDurationSeconds(' 37.5 '), 2250)
  for (const raw of [undefined, null, '', ' ', '-30', '29.99', '45.01', 'Infinity', 'NaN', '40minutes', '0x28', '4e1', '40&station=jolt-radio']) assert.equal(sunsetDurationSeconds(raw), DEFAULT_SUNSET_SECONDS)
})

test('sunset blend uses elapsed simulation time and clamps reset/start/end correctly', () => {
  assert.equal(nightBlend(100, 100, false), 0)
  assert.equal(nightBlend(1300, 100, false), .5)
  assert.equal(nightBlend(2500, 100, false), 1)
  assert.equal(nightBlend(9000, 100, false), 1)
  assert.equal(nightBlend(50, 100, false), 0)
  assert.equal(nightBlend(1000, 100, false, 1800), .5)
  assert.equal(nightBlend(1450, 100, false, 2700), .5)
  for (const invalid of [0, -1, Infinity, NaN, 1799, 2701]) assert.equal(nightBlend(1300, 100, false, invalid), .5)
})

test('night mode is immediate and invalid simulation times fail closed', () => {
  assert.equal(nightBlend(0, 0, true), 1)
  assert.equal(nightBlend(NaN, Infinity, true), 1)
  assert.equal(nightBlend(NaN, 0, false), 0)
  assert.equal(nightBlend(100, Infinity, false), 0)
})

test('camera adjustment is opt-in and restricted to Wrangler and Countach', () => {
  assert.equal(experienceCameraProfile(WRANGLER_CAMERA_PROFILE, 'wrangler'), WRANGLER_CAMERA_PROFILE)
  for (const id of ['cadillac', 'eighties', 'delorean'] as RideVehicleId[]) assert.equal(experienceCameraProfile(WRANGLER_CAMERA_PROFILE, id, true), WRANGLER_CAMERA_PROFILE)
})

test('Wrangler gaze rises modestly while original input, eye, radio and chase stay exact', () => {
  const original = structuredClone(WRANGLER_CAMERA_PROFILE)
  const adjusted = experienceCameraProfile(WRANGLER_CAMERA_PROFILE, 'wrangler', true)
  assert.deepEqual(WRANGLER_CAMERA_PROFILE, original)
  assert.notEqual(adjusted, WRANGLER_CAMERA_PROFILE)
  assert.ok(adjusted.target[1] > original.target[1])
  assert.ok(adjusted.target[1] - original.target[1] <= .280000001)
  assert.ok(adjusted.targetPortrait![1] > original.targetPortrait![1])
  assert.equal(adjusted.target[0], original.target[0])
  assert.equal(adjusted.target[2], original.target[2])
  for (const key of ['driver', 'driverPortrait', 'radioPosition', 'radioTarget', 'radioFov', 'radioPortraitFov', 'chase', 'chasePortrait', 'chaseTarget'] as const) assert.equal(adjusted[key], WRANGLER_CAMERA_PROFILE[key])
})

test('Countach gets a smaller rise and the gaze never rises above the eye', () => {
  // Pure profile fixture mirrors the existing Countach camera dimensions;
  // importing the vehicle component would unnecessarily load its render stack.
  const profile: RideCameraProfile = { ...WRANGLER_CAMERA_PROFILE, driver: [-.34, .79, .15], driverPortrait: [-.27, .80, .22], target: [-.34, .59, -3.2], targetPortrait: [-.27, .57, -3.2] }
  const original = structuredClone(profile), adjusted = experienceCameraProfile(profile, 'countach', true)
  assert.deepEqual(profile, original)
  assert.ok(adjusted.target[1] > profile.target[1] && adjusted.target[1] < profile.driver[1])
  assert.ok(adjusted.target[1] - profile.target[1] <= .110000001)
  assert.ok(adjusted.targetPortrait![1] <= profile.driverPortrait![1])
  const alreadyUp: RideCameraProfile = { ...profile, target: [0, 2, -3], targetPortrait: undefined }
  assert.deepEqual(experienceCameraProfile(alreadyUp, 'countach', true).target, alreadyUp.target)
  assert.equal(experienceCameraProfile(alreadyUp, 'countach', true).targetPortrait, undefined)
})
