/**
 * Applies supabase/migrations/20261009120000_cruise_avenue_plots.sql to an in-process Postgres
 * (@electric-sql/pglite) and exercises the Avenue RPCs. All data is TEST data.
 * Shim: Supabase's anon/authenticated/service_role roles are created first so the grants/revokes apply.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { SEED_PLOTS, FLOOR_CENTS, priceCents, mergePlots } from '../components/cruise/master/plots'

const MIGRATION = join(__dirname, '..', 'supabase', 'migrations', '20261009120000_cruise_avenue_plots.sql')
let db: PGlite

async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const r = await db.query<T>(sql, params); return r.rows[0]
}
const claim = (session: string, plot: number, paid: number, prior: number, name = 'TEST Owner') =>
  one<{ r: string }>(`select public.cruise_plot_apply_claim($1,$2,$3,$4,$5,$6,$7,$8,$9,'usd') as r`,
    [session, plot, paid, prior, name, 'TEST tagline', 'https://example.test', '#ff4f9a', 'test@example.test']).then(x => x.r)
const moderate = (plot: number, action: string, expected: string | null = null) =>
  one<{ r: string }>(`select public.cruise_plot_moderate($1,$2,'TEST operator','TEST reason',$3) as r`, [plot, action, expected]).then(x => x.r)
const plotRow = (n: number) => one<{ status: string; review_state: string; approved: boolean; value_cents: number; owner_name: string | null; visits: string; claim_session_id: string | null }>(
  `select status, review_state, approved, value_cents, owner_name, visits, claim_session_id from public.cruise_plots where number = $1`, [n])

before(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;`)
  await db.exec(readFileSync(MIGRATION, 'utf8'))
})

test('migration seeds open plots 1, 7–9 and 11–30, house plots 2–6 and 10', async () => {
  const r = await db.query<{ status: string; n: number }>(`select status, count(*)::int as n from public.cruise_plots group by status order by status`)
  assert.deepEqual(r.rows, [{ status: 'house', n: 6 }, { status: 'open', n: 24 }])
  const seedHouse = SEED_PLOTS.filter(p => p.status === 'house').map(p => p.number)
  assert.deepEqual(seedHouse, [2, 3, 4, 5, 6])
  assert.equal(SEED_PLOTS.some(p => p.number === 10), false) // retired: no geometry, never sold
})

test('TEST claim of plot 7 lands pending (not approved) and is hidden on the street', async () => {
  const floor = FLOOR_CENTS.lamp
  assert.equal(await claim('cs_test_claim_7', 7, floor, 0), 'applied')
  const row = await plotRow(7)
  assert.equal(row.status, 'claimed'); assert.equal(row.review_state, 'pending'); assert.equal(row.approved, false)
  assert.equal(row.value_cents, floor)
  const ev = await one<{ type: string; name_approved: boolean }>(`select type, name_approved from public.cruise_plot_events where stripe_session_id = 'cs_test_claim_7'`)
  assert.deepEqual(ev, { type: 'claimed', name_approved: false })
  // Public merge: claimed but owner content withheld; priced as a buyout, never at floor.
  const merged = mergePlots([{ number: 7, status: 'claimed', owner_name: row.owner_name!, value_cents: row.value_cents, review_state: row.review_state } as never]).find(p => p.number === 7)!
  assert.equal(merged.status, 'claimed'); assert.equal(merged.pending, true)
  assert.notEqual(merged.owner?.name, 'TEST Owner')
  assert.equal(priceCents(merged), 800)
})

test('duplicate Stripe session returns duplicate and changes nothing', async () => {
  assert.equal(await claim('cs_test_claim_7', 7, FLOOR_CENTS.lamp, 0), 'duplicate')
  const n = await one<{ n: number }>(`select count(*)::int as n from public.cruise_plot_events where plot = 7`)
  assert.equal(n.n, 1)
})

test('moderation: approve, pull, restore, note — all audited; stale session guard', async () => {
  assert.equal(await moderate(7, 'approve', 'cs_wrong_session'), 'stale')
  assert.equal(await moderate(7, 'restore'), 'invalid_state')
  assert.equal(await moderate(7, 'approve', 'cs_test_claim_7'), 'ok')
  assert.equal((await plotRow(7)).approved, true)
  assert.equal((await one<{ a: boolean }>(`select name_approved as a from public.cruise_plot_events where stripe_session_id = 'cs_test_claim_7'`)).a, true)
  assert.equal(await moderate(7, 'pull'), 'ok')
  const pulled = await plotRow(7)
  assert.equal(pulled.review_state, 'pulled'); assert.equal(pulled.approved, false)
  assert.equal(await moderate(7, 'restore'), 'ok')
  assert.equal(await moderate(7, 'note'), 'ok')
  assert.equal(await moderate(3, 'approve'), 'not_found') // house plot
  assert.equal(await moderate(8, 'approve'), 'not_claimed')
  assert.equal(await moderate(7, 'delete'), 'invalid_action')
  const audit = await db.query<{ action: string; actor: string }>(`select action, actor from public.cruise_plot_moderation where plot = 7 order by id`)
  assert.deepEqual(audit.rows.map(r => r.action), ['approve', 'pull', 'restore', 'note'])
  assert.ok(audit.rows.every(r => r.actor === 'TEST operator'))
})

test('stale buyout race: second buyer at the old price gets stale_price + durable refund record', async () => {
  // Both buyers saw value 500 and were quoted 800. Buyer A pays first.
  assert.equal(await claim('cs_test_buyout_a', 7, 800, 500, 'TEST Buyer A'), 'applied')
  const a = await plotRow(7)
  assert.equal(a.value_cents, 800); assert.equal(a.review_state, 'pending'); assert.equal(a.owner_name, 'TEST Buyer A')
  const ev = await one<{ type: string }>(`select type from public.cruise_plot_events where stripe_session_id = 'cs_test_buyout_a'`)
  assert.equal(ev.type, 'bought_out')
  assert.equal(await claim('cs_test_buyout_b', 7, 800, 500, 'TEST Buyer B'), 'stale_price')
  const b = await plotRow(7)
  assert.equal(b.owner_name, 'TEST Buyer A')
  const refund = await one<{ reason: string; amount_cents: number; resolved_at: string | null }>(`select reason, amount_cents, resolved_at from public.cruise_plot_refunds_needed where stripe_session_id = 'cs_test_buyout_b'`)
  assert.deepEqual(refund, { reason: 'stale_price', amount_cents: 800, resolved_at: null })
  // Replay of the losing session stays a duplicate (no second refund row, no overwrite).
  assert.equal(await claim('cs_test_buyout_b', 7, 800, 500, 'TEST Buyer B'), 'duplicate')
})

test('a pulled plot keeps its value: buyout is priced from value_cents, never the floor', async () => {
  assert.equal(await moderate(7, 'pull'), 'ok')
  const row = await plotRow(7)
  const merged = mergePlots([{ number: 7, status: row.status, owner_name: row.owner_name, value_cents: row.value_cents, review_state: row.review_state } as never]).find(p => p.number === 7)!
  assert.equal(merged.status, 'claimed')
  assert.equal(priceCents(merged), 1200) // 1.5 × 800
  // A floor-priced claim against it is a stale price.
  assert.equal(await claim('cs_test_floor_on_pulled', 7, 500, 0), 'stale_price')
})

test('house plots and unknown plots are not claimable and are flagged for refund', async () => {
  assert.equal(await claim('cs_test_house', 2, 15000, 0), 'not_claimable')
  assert.equal(await claim('cs_test_unknown', 99, 500, 0), 'not_claimable')
  const r = await db.query<{ reason: string }>(`select reason from public.cruise_plot_refunds_needed where stripe_session_id in ('cs_test_house','cs_test_unknown')`)
  assert.deepEqual(r.rows.map(x => x.reason), ['not_claimable', 'not_claimable'])
  assert.equal((await plotRow(2)).status, 'house')
})

test('owner content violating DB constraints is invalid_claim (permanent) not an exception', async () => {
  const r = await one<{ r: string }>(`select public.cruise_plot_apply_claim('cs_test_bad', 8, 500, 0, 'x', null, 'http://insecure.test', '#ff4f9a', null, 'usd') as r`)
  assert.equal(r.r, 'invalid_claim')
  assert.equal((await plotRow(8)).status, 'open')
  assert.equal((await one<{ reason: string }>(`select reason from public.cruise_plot_refunds_needed where stripe_session_id = 'cs_test_bad'`)).reason, 'invalid_claim')
})

test('refund resolution is audited', async () => {
  assert.equal((await one<{ r: string }>(`select public.cruise_plot_resolve_refund('cs_test_buyout_b', 'TEST operator', 'TEST refunded in Stripe') as r`)).r, 'ok')
  assert.equal((await one<{ r: string }>(`select public.cruise_plot_resolve_refund('cs_test_buyout_b', 'TEST operator', null) as r`)).r, 'not_found')
  const m = await one<{ action: string; plot: number }>(`select action, plot from public.cruise_plot_moderation where action = 'refund_resolved'`)
  assert.deepEqual(m, { action: 'refund_resolved', plot: 7 })
})

test('drive-bys: deduped per client hash per plot per window; unknown plots ignored', async () => {
  const hashA = 'a'.repeat(64), hashB = 'b'.repeat(64)
  const before = Number((await plotRow(9)).visits)
  const first = await one<{ n: number }>(`select public.cruise_plot_drive_bys($1, $2, 30) as n`, [[9, 10, 9, 2, 99, 500], hashA])
  assert.equal(first.n, 3) // 9, 10 and house plot 2; 99/500 do not exist
  const repeat = await one<{ n: number }>(`select public.cruise_plot_drive_bys($1, $2, 30) as n`, [[9, 10], hashA])
  assert.equal(repeat.n, 0)
  const other = await one<{ n: number }>(`select public.cruise_plot_drive_bys($1, $2, 30) as n`, [[9], hashB])
  assert.equal(other.n, 1)
  assert.equal(Number((await plotRow(9)).visits), before + 2)
  // After the window passes the same client counts again.
  await db.query(`update public.cruise_plot_drive_by_seen set last_at = now() - interval '31 minutes' where client_hash = $1`, [hashA])
  assert.equal((await one<{ n: number }>(`select public.cruise_plot_drive_bys($1, $2, 30) as n`, [[9], hashA])).n, 1)
  // Missing/short hash is refused.
  assert.equal((await one<{ n: number }>(`select public.cruise_plot_drive_bys($1, $2, 30) as n`, [[9], 'short'])).n, 0)
  assert.equal((await one<{ n: number }>(`select public.cruise_plot_drive_bys($1, null, 30) as n`, [[9]])).n, 0)
})

test('anon and authenticated cannot execute the RPCs or read the tables', async () => {
  const r = await db.query<{ anon_exec: boolean; auth_exec: boolean; svc_exec: boolean; anon_select: boolean }>(`select
    has_function_privilege('anon', 'public.cruise_plot_apply_claim(text,int,int,int,text,text,text,text,text,text)', 'execute') as anon_exec,
    has_function_privilege('authenticated', 'public.cruise_plot_moderate(int,text,text,text,text)', 'execute') as auth_exec,
    has_function_privilege('service_role', 'public.cruise_plot_apply_claim(text,int,int,int,text,text,text,text,text,text)', 'execute') as svc_exec,
    has_table_privilege('anon', 'public.cruise_plots', 'select') as anon_select`)
  assert.deepEqual(r.rows[0], { anon_exec: false, auth_exec: false, svc_exec: true, anon_select: false })
})
