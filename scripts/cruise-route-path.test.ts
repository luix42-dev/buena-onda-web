import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HERO_X, MODULE_COUNT, MODULE_LENGTH, WORLD_LENGTH, moduleZ } from '../lib/cruise/constants'
import { CRUISE_PLACES } from '../lib/cruise/campaigns'
import { CRUISE_ROUTE, SCENIC_DISTRICTS } from '../lib/cruise/routes'
import { routeCurvature, routeRelativePose } from '../lib/cruise/routePath'

const close = (actual: number, expected: number, tolerance = 1e-8) => assert(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)

test('four sustained scenic runs retain the 36-module bounded loop', () => {
  assert.equal(MODULE_COUNT, 36)
  assert.equal(WORLD_LENGTH, 2304)
  const runs = CRUISE_ROUTE.filter((module, index) => index === 0 || module.district !== CRUISE_ROUTE[index - 1].district)
  assert.deepEqual(runs.map(module => module.district), SCENIC_DISTRICTS.map(district => district.id))
  for (const district of SCENIC_DISTRICTS) {
    assert.equal(CRUISE_ROUTE.filter(module => module.district === district.id).length, 9)
    assert.equal(CRUISE_ROUTE[district.module].district, district.id)
    assert.equal(CRUISE_ROUTE[district.module].transitionTo, undefined)
  }
})

test('sponsor compatibility anchors live in the intended urban districts', () => {
  const expected = { records: ['coastal-approach', 'south-beach'], branches: ['highway-open-20', 'biscayne-midtown'], tideway: ['highway-billboard-run', 'biscayne-midtown'] }
  for (const place of CRUISE_PLACES) {
    const expectation = expected[place.id as keyof typeof expected]
    assert(expectation)
    assert.equal(place.anchor.moduleId, expectation[0])
    const matches = CRUISE_ROUTE.filter(module => module.id === place.anchor.moduleId)
    assert.equal(matches.length, 1)
    assert.equal(matches[0].district, expectation[1])
    assert(place.anchor.x < -12, 'Each dimensional sponsor must remain on the western land parcel')
  }
})

test('hero lane and current road tangent remain driving-local throughout the lap', () => {
  for (let distance = 0; distance < WORLD_LENGTH; distance += 7) {
    const hero = routeRelativePose(distance, 0, HERO_X)
    close(hero.x, HERO_X); close(hero.z, 0); close(hero.yaw, 0)
    const ahead = routeRelativePose(distance, -.001), behind = routeRelativePose(distance, .001)
    close((behind.x - ahead.x) / .002, 0, 1e-7)
    assert(ahead.z < 0 && behind.z > 0)
    assert(Math.abs(routeCurvature(distance)) < .002, 'Turns must stay within a 500m radius')
  }
})

test('position, yaw and curvature repeat through positive and negative lap seams', () => {
  for (let distance = -WORLD_LENGTH; distance < WORLD_LENGTH; distance += 11) {
    for (const z of [-440, -160, -32, 0, 64, 100]) {
      const a = routeRelativePose(distance, z, HERO_X), b = routeRelativePose(distance + WORLD_LENGTH, z, HERO_X)
      close(a.x, b.x); close(a.z, b.z); close(a.yaw, b.yaw)
    }
    close(routeCurvature(distance), routeCurvature(distance + WORLD_LENGTH))
  }
  const a = routeRelativePose(WORLD_LENGTH - .001, -160), b = routeRelativePose(.001, -160)
  assert(Math.hypot(a.x - b.x, a.z - b.z) < .003)
  assert(Math.abs(a.yaw - b.yaw) < .00001)
})

test('module joins and offset assets reproduce one continuous path without 64m corners', () => {
  for (let distance = 0; distance < WORLD_LENGTH; distance += 31) {
    for (let index = 0; index < MODULE_COUNT; index++) {
      const centerZ = moduleZ(index, distance), module = routeRelativePose(distance, centerZ)
      for (const localZ of [-32, -16, 0, 16, 32]) {
        const local = routeRelativePose(index * MODULE_LENGTH, localZ, 7.1)
        const direct = routeRelativePose(distance, centerZ + localZ, 7.1)
        close(module.x + Math.cos(module.yaw) * local.x + Math.sin(module.yaw) * local.z, direct.x)
        close(module.z - Math.sin(module.yaw) * local.x + Math.cos(module.yaw) * local.z, direct.z)
        close(module.yaw + local.yaw, direct.yaw)
      }
    }
  }
})
