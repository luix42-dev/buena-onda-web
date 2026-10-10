/** Unit tests for the Avenue: pricing, owner validation, merge/pending, rate limiter, phase, studio auth. TEST data only. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BUYOUT_MULTIPLIER, FLOOR_CENTS, MAX_PLOT, PENDING_OWNER, SEED_PLOTS, avenuePhase, cleanOwner, isHousePlot, isSeedPlot, mergePlots, priceCents,
} from '../components/cruise/master/plots'
import { createRateLimiter, clientIp, driveByClientHash } from '../lib/cruise/rate-limit'
import { hasCruiseStudioAccess, isSameOrigin, timingSafeEqualString } from '../lib/cruise/studio-auth'

function withEnv(env: Record<string, string | undefined>, fn: () => void | Promise<void>) {
  const saved: Record<string, string | undefined> = {}
  for (const k of Object.keys(env)) { saved[k] = process.env[k]; if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k] }
  const restore = () => { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v } }
  try { const r = fn(); if (r instanceof Promise) return r.finally(restore); restore() } catch (e) { restore(); throw e }
}

test('pricing: open plots at floor, house plots not for sale', () => {
  assert.equal(priceCents({ kind: 'billboard', status: 'open', valueCents: 0 }), 25_000)
  assert.equal(priceCents({ kind: 'lamp', status: 'open', valueCents: 99_999 }), FLOOR_CENTS.lamp)
  assert.equal(priceCents({ kind: 'storefront', status: 'house', valueCents: 0 }), null)
})

test('pricing: buyout is 1.5× value rounded up to the next whole dollar, never below floor', () => {
  assert.equal(BUYOUT_MULTIPLIER, 1.5)
  assert.equal(priceCents({ kind: 'lamp', status: 'claimed', valueCents: 500 }), 800) // 750 → 800
  assert.equal(priceCents({ kind: 'lamp', status: 'claimed', valueCents: 800 }), 1200)
  assert.equal(priceCents({ kind: 'billboard', status: 'claimed', valueCents: 25_000 }), 37_500)
  assert.equal(priceCents({ kind: 'bench', status: 'claimed', valueCents: 1_533 }), 2_300) // 2299.5 → 2300
  assert.equal(priceCents({ kind: 'billboard', status: 'claimed', valueCents: 100 }), 25_000) // floor wins
})

test('cleanOwner: validates and trims, rejects bad url/colour/short names', () => {
  assert.deepEqual(cleanOwner({ name: '  TEST Brand ', tagline: 'Loud\u0007', url: 'https://example.test', color: '#AbCdEf' }), { name: 'TEST Brand', tagline: 'Loud', url: 'https://example.test', color: '#AbCdEf' })
  assert.equal(cleanOwner({ name: 'x' }), null)
  assert.equal(cleanOwner({ name: 'TEST', url: 'http://insecure.test' }), null)
  assert.equal(cleanOwner({ name: 'TEST', url: 'javascript:alert(1)' }), null)
  assert.equal(cleanOwner({ name: 'TEST', color: 'red' }), null)
  assert.equal(cleanOwner(null), null)
  assert.equal(cleanOwner({ name: 'A'.repeat(50) })!.name.length, 32)
  assert.equal(cleanOwner({ name: 'TEST', tagline: 'T'.repeat(80) })!.tagline!.length, 48)
})

test('mergePlots: pending/pulled claims are claimed with owner content withheld; approved show owner; legacy rows count as approved', () => {
  const base = { status: 'claimed', owner_name: 'TEST Secret Brand', owner_tagline: 'TEST', owner_url: 'https://example.test', owner_color: '#123456', value_cents: 500 }
  const [p7, p8, p9, p10] = [7, 8, 9, 10].map(n => mergePlots([
    { number: 7, ...base, review_state: 'pending' }, { number: 8, ...base, review_state: 'pulled' },
    { number: 9, ...base, review_state: 'approved' }, { number: 10, ...base },
  ] as never).find(p => p.number === n)!)
  for (const p of [p7, p8]) {
    assert.equal(p.status, 'claimed'); assert.equal(p.pending, true)
    assert.deepEqual(p.owner, { ...PENDING_OWNER }); assert.equal(p.owner?.url, undefined)
    assert.equal(priceCents(p), 800)
  }
  assert.equal(p9.owner?.name, 'TEST Secret Brand'); assert.equal(p9.pending, undefined)
  assert.equal(p10.owner?.name, 'TEST Secret Brand')
  // House plots ignore DB ownership but take drive-bys.
  const house = mergePlots([{ number: 2, status: 'claimed', owner_name: 'TEST hijack', visits: 42 } as never]).find(p => p.number === 2)!
  assert.equal(house.status, 'house'); assert.equal(house.owner?.name, 'Buena Onda Record Store'); assert.equal(house.visits, 42)
})

test('seed/house helpers and MAX_PLOT agree with the seed', () => {
  assert.equal(SEED_PLOTS.length, MAX_PLOT)
  assert.ok(isSeedPlot(1) && isSeedPlot(30) && !isSeedPlot(0) && !isSeedPlot(31))
  assert.deepEqual([1, 2, 6, 7].map(isHousePlot), [false, true, true, false])
})

test('avenuePhase: hidden by default, preview via query, env open/preview', () => {
  withEnv({ NEXT_PUBLIC_CRUISE_AVENUE: undefined }, () => {
    assert.equal(avenuePhase(''), 'hidden')
    assert.equal(avenuePhase('?avenue=preview'), 'preview')
    assert.equal(avenuePhase('?avenue=1'), 'preview')
    assert.equal(avenuePhase('?avenue=open'), 'hidden') // the query can never open claims
  })
  withEnv({ NEXT_PUBLIC_CRUISE_AVENUE: 'open' }, () => assert.equal(avenuePhase(''), 'open'))
  withEnv({ NEXT_PUBLIC_CRUISE_AVENUE: 'preview' }, () => assert.equal(avenuePhase(''), 'preview'))
  withEnv({ NEXT_PUBLIC_CRUISE_AVENUE: 'garbage' }, () => assert.equal(avenuePhase(''), 'hidden'))
})

test('rate limiter: token bucket per key, refills over time, bounded key count', () => {
  const rl = createRateLimiter({ capacity: 5, refillPerMinute: 5, maxKeys: 3 })
  const t0 = 1_000_000
  for (let i = 0; i < 5; i++) assert.equal(rl.take('ip-a', t0), true)
  assert.equal(rl.take('ip-a', t0), false)
  assert.equal(rl.take('ip-b', t0), true) // independent key
  assert.equal(rl.take('ip-a', t0 + 11_000), false) // 0.92 tokens
  assert.equal(rl.take('ip-a', t0 + 12_100), true) // ≥ 1 token after 12 s
  rl.take('ip-c', t0); rl.take('ip-d', t0)
  assert.equal(rl.size(), 3)
})

test('clientIp: first x-forwarded-for hop, then x-real-ip, else unknown', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' })), '203.0.113.9')
  assert.equal(clientIp(new Headers({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2')
  assert.equal(clientIp(new Headers()), 'unknown')
})

test('driveByClientHash: salted, daily rotating, no raw IP; null without a secret', async () => {
  await withEnv({ CRUISE_DRIVEBY_SALT: 'TEST-salt', SUPABASE_SERVICE_ROLE_KEY: undefined }, async () => {
    const d = new Date('2026-10-09T12:00:00Z')
    const a = await driveByClientHash('203.0.113.9', 'TEST-UA', d)
    assert.match(a!, /^[0-9a-f]{64}$/)
    assert.ok(!a!.includes('203'))
    assert.equal(await driveByClientHash('203.0.113.9', 'TEST-UA', d), a)
    assert.notEqual(await driveByClientHash('203.0.113.9', 'TEST-UA', new Date('2026-10-10T12:00:00Z')), a)
    assert.notEqual(await driveByClientHash('203.0.113.10', 'TEST-UA', d), a)
  })
  await withEnv({ CRUISE_DRIVEBY_SALT: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined }, async () => {
    assert.equal(await driveByClientHash('203.0.113.9', 'TEST-UA'), null)
  })
})

test('cruise studio auth fails closed in every environment', () => {
  for (const NODE_ENV of ['development', 'production', 'test']) {
    withEnv({ STUDIO_PASSWORD: undefined, NODE_ENV }, () => {
      assert.equal(hasCruiseStudioAccess(undefined), false)
      assert.equal(hasCruiseStudioAccess('anything'), false)
      assert.equal(hasCruiseStudioAccess(''), false)
    })
    withEnv({ STUDIO_PASSWORD: '   ', NODE_ENV }, () => assert.equal(hasCruiseStudioAccess('   '), false))
    withEnv({ STUDIO_PASSWORD: 'TEST-pass', NODE_ENV }, () => {
      assert.equal(hasCruiseStudioAccess('TEST-pass'), true)
      assert.equal(hasCruiseStudioAccess('TEST-pas'), false)
      assert.equal(hasCruiseStudioAccess('TEST-pass '), false)
      assert.equal(hasCruiseStudioAccess(undefined), false)
    })
  }
  assert.equal(timingSafeEqualString('abc', 'abc'), true)
  assert.equal(timingSafeEqualString('abc', 'abd'), false)
  assert.equal(timingSafeEqualString('abc', 'abcd'), false)
  assert.equal(timingSafeEqualString('', ''), true)
})

test('isSameOrigin: requires matching Origin', () => {
  assert.equal(isSameOrigin(new Headers({ host: 'localhost:3040', origin: 'http://localhost:3040' }), 'http://localhost:3040/x'), true)
  assert.equal(isSameOrigin(new Headers({ host: 'localhost:3040', origin: 'https://evil.test' }), 'http://localhost:3040/x'), false)
  assert.equal(isSameOrigin(new Headers({ host: 'localhost:3040' }), 'http://localhost:3040/x'), false)
})
