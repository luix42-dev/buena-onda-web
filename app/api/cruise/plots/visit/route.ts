import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { clientIp, createRateLimiter, driveByClientHash } from '@/lib/cruise/rate-limit'
import { MAX_PLOT, isSeedPlot } from '@/components/cruise/master/plots'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const MAX_DRIVE_BY_BODY_BYTES = 1_024
const DRIVE_BY_WINDOW_MINUTES = 30
// The client flushes about every 15 s plus on tab hide: 8 beacons per IP per minute is generous.
const limiter = createRateLimiter({ capacity: 8, refillPerMinute: 8 })

/**
 * Drive-by beacon. Drive-bys are an anonymous, unverified counter: a plot passed on the street
 * while driving with the tab visible. They are not verified human views and are counted in every
 * Avenue phase, including hidden.
 *
 * Abuse limits (best effort, none of them stop a distributed attacker):
 *  - body ≤ 1 KB, ≤ MAX_PLOT plot numbers, only plot numbers that exist in SEED_PLOTS;
 *  - in-memory per-IP token bucket (per isolate only);
 *  - DB-side dedupe: each plot counts at most once per client per 30 minutes, keyed by a salted
 *    daily HMAC of IP + user agent (no raw IP or user agent is stored).
 */
export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_DRIVE_BY_BODY_BYTES) return new NextResponse(null, { status: 413 })
  const ip = clientIp(request.headers)
  if (!limiter.take(ip)) return new NextResponse(null, { status: 429, headers: { 'retry-after': '60' } })

  let raw = ''
  try { raw = await request.text() } catch { return new NextResponse(null, { status: 400 }) }
  if (raw.length > MAX_DRIVE_BY_BODY_BYTES) return new NextResponse(null, { status: 413 })
  let list: unknown
  try { list = (JSON.parse(raw) as { plots?: unknown })?.plots } catch { return new NextResponse(null, { status: 400 }) }
  if (!Array.isArray(list) || list.length > MAX_PLOT * 2) return new NextResponse(null, { status: 400 })
  const plots = [...new Set(list.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && isSeedPlot(n)))].slice(0, MAX_PLOT)
  if (!plots.length) return new NextResponse(null, { status: 204 })

  try {
    const hash = await driveByClientHash(ip, request.headers.get('user-agent') ?? '')
    if (hash) await createServiceRoleClient().rpc('cruise_plot_drive_bys', { plot_numbers: plots, p_client_hash: hash, p_window_minutes: DRIVE_BY_WINDOW_MINUTES })
  } catch { /* table not set up yet or env missing: drive-bys are best effort */ }
  return new NextResponse(null, { status: 204 })
}
