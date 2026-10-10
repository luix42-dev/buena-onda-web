# Gate 4 evidence: Avenue commerce and security (Agent D)

Date: 2026-10-09 · Branch: `experiment/cruise-miami-master` (uncommitted, not deployed) · Agent: Agent D (Claude Opus 5.5, `claude-opus-5-5`).
All data used below is TEST data: `cs_test_TEST_*` sessions, `TEST Owner` names and `example.test` emails. No live keys were used, and nothing touched production Supabase.

## Status summary

| Area | Status |
|---|---|
| Migration (pending review, moderation audit, refunds-needed, drive-by dedupe) | **Built and verified** in pglite |
| Webhook cruise branch (signature, amount/currency, async, expired, retry semantics) | **Built and verified** with route handlers in a test process and locally signed TEST events |
| Public GET hides unapproved owner content, no floor price for pending/pulled | **Built and verified** |
| Claim route: house/range/rate limit/expires_at/server price | **Built and verified**, except the success path to Stripe (blocked, see below) |
| Visit (drive-by) limits + DB dedupe | **Built and verified** (tests + dev server smoke) |
| Studio moderation page + API (fails closed) | **Built**. API verified by tests. Page verified only as 404-when-unauthorised on the dev server; it has not been rendered with data. |
| Full Stripe TEST end-to-end (Checkout 4242 → webhook → DB → GET → buyout quote) | **BLOCKED**: the dev server has no Stripe or Supabase env |
| Real local Supabase | See "Local Supabase" below |

## Commands and results

### 1. Unit, migration and route tests

```
node --import tsx --test tests/cruise-avenue-migration.test.ts
→ tests 11 · pass 11 · fail 0
node --import tsx --test tests/cruise-avenue-unit.test.ts tests/cruise-avenue-routes.test.ts
→ tests 22 · pass 22 · fail 0
npm test   (node --import tsx --test "tests/**/*.test.ts", whole repo)
→ tests 60 · pass 60 · fail 0
npx tsc --noEmit
→ exit 0, no errors (incremental; the new files are in the program per --listFilesOnly)
```

`tests/cruise-avenue-migration.test.ts` applies the real migration to `@electric-sql/pglite`. Shim: `create role anon; create role authenticated; create role service_role;` runs first. Each test below passed:
- the seed has open plots 1 and 7–30, and house plots 2–6;
- claiming plot 7 as TEST returns `applied` with `review_state='pending'` and `approved=false`. The public merge shows `claimed`, `pending: true` and the placeholder owner. The buyout price is $8, not the $5 floor;
- replaying the same session returns `duplicate`, with one event row;
- moderation: approve with the wrong session returns `stale`. Approve, pull, restore and note all return `ok`, and all four are in `cruise_plot_moderation` with the actor recorded. A house plot returns `not_found`, an open plot `not_claimed`, and a bad action `invalid_action`;
- buyout race: buyer A applies a `bought_out` at $8. Buyer B at the same prior value gets `stale_price`, a row in `cruise_plot_refunds_needed` and no overwrite. A replay of B returns `duplicate`;
- a pulled plot keeps its value. Its quote is $12 (1.5 × 800), and a floor-priced payment returns `stale_price`;
- a house plot (2) and an unknown plot (99) return `not_claimable`, and a refund-needed row is recorded;
- an owner that breaks a DB constraint (http URL, 1-char name) returns `invalid_claim` without raising, and a refund row is recorded;
- resolving a refund is audited (`refund_resolved`);
- drive-bys: duplicate plots and non-existent plots are ignored, and house plots count. Each plot counts once per client hash per 30 min, a different hash counts, the same client counts again after the window, and a missing or short hash counts nothing;
- privileges: anon and authenticated cannot execute the RPCs or select from `cruise_plots`, and service_role can execute.

`tests/cruise-avenue-routes.test.ts` imports and runs the real route handlers in a test process. It uses a small PostgREST stand-in backed by pglite and the real migration. Stripe events are signed with `stripe.webhooks.generateTestHeaderString` and a throwaway secret that exists only in that process. The tests make no Stripe network calls and do not use the dev server. Each test below passed:
- the webhook returns 400 for a missing or invalid signature;
- a paid `checkout.session.completed` returns `applied` (pending), and a replay returns `duplicate`. Every DB request went to `cruise_plot*` tables or RPCs, never to items or orders;
- an `amount_total` that differs from `expected_cents` returns `amount_mismatch`, and currency `eur` returns `currency_mismatch`. Both return 200, write a refund-needed row and leave ownership unchanged;
- a stale buyout returns 200 `stale_price` and writes a refund row. A house plot returns 200 `not_claimable`. These are permanent outcomes, so Stripe does not retry;
- an async payment: `completed` while unpaid returns `awaiting_payment`, then `async_payment_succeeded` returns `applied`;
- `checkout.session.expired` and `async_payment_failed` for a cruise session return 200 `ignored` with no state change;
- a transient DB failure (Supabase URL pointed at a dead port) returns 500, so Stripe retries;
- GET `/api/cruise/plots` shows a pending claim as `claimed`, `pending`, "Sign in review". The response contains no owner name, no `@`, no `cs_test` and no owner URL, and ticker names are masked;
- moderation API: with no `STUDIO_PASSWORD`, a cookie returns 401. A wrong cookie returns 401, a missing or foreign Origin returns 403, and a stale session returns 409. Approve returns 200, writes an audit row (`studio:TEST op`), and GET then shows the owner. Pull and refund resolution return 200;
- claim API: returns 503 when disabled. A house plot returns 409, plot 31 returns 400, and a bad URL returns 400. A stale price returns 409 with the server price ($8 for a pulled plot worth $5, never the floor). The 6th request from one IP within a minute returns 429;
- visit API: an oversized body returns 413, more than 60 entries returns 400, and malformed JSON returns 400. Only seed plot numbers count (strings are ignored), dedupe applies per client, and a burst gives 8× 204 then 429. The stored hashes are 64-hex HMACs with no IP.

### 2. Running dev server smoke test (http://127.0.0.1:3040, no Supabase/Stripe env)

```
GET  /api/cruise/plots                      → live=false plots=30   (seed fallback, edge runtime compiles)
POST /api/cruise/plots/visit {plots:[7,8]}  → 204
POST /api/cruise/plots/visit (1500 B body)  → 413
POST /api/cruise/plots/visit ×10 same IP    → 204 ×8, 429 ×2
POST /api/cruise/plots/claim                → 503 {"error":"Claims are not open yet"}
POST /api/cruise/plots/moderate (bad cookie)→ 401
GET  /studio/cruise/avenue                  → 404 (fails closed: STUDIO_PASSWORD unset in this dev server)
GET  /studio/cruise                         → 200 (middleware fails open when STUDIO_PASSWORD is unset — finding, see below)
POST /api/webhooks/stripe (bad sig)         → 500 "STRIPE_WEBHOOK_SECRET is required" (no secret configured; with a secret, bad sig → 400 per route test)
```

Edge runtime: the GET and visit routes stay on `runtime='edge'`. They compile and serve on the dev server. supabase-js 2 is fetch-based, but against a real database it has only been exercised in Node (tests), **not on edge**. The claim and moderation routes now use `nodejs` (Stripe SDK, cookies).

## BLOCKED: full Stripe TEST end-to-end

The dev server process has none of the env vars below, and per instructions I did not add secrets to `.env.local`. To run Gate 4 end to end, the user adds these to `.env.local` themselves, using TEST values only, and restarts the dev server on 3040:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The **local** Supabase API URL (from `npx supabase status`), never production |
| `SUPABASE_SERVICE_ROLE_KEY` | The local service-role key (from `npx supabase status`) |
| `STRIPE_SECRET_KEY` | A Stripe **test** secret key (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | The `whsec_…` printed by `stripe listen` |
| `CRUISE_PLOTS_ENABLED` | `1` |
| `STUDIO_PASSWORD` | Any local value, for the moderation page/API |
| `CRUISE_DRIVEBY_SALT` | Optional, any random string |

Steps:
1. Run `npx supabase start` and `npx supabase migration up`, or `db reset` on the **local** DB only, to apply `20261009120000_cruise_avenue_plots.sql`.
2. Run `stripe listen --forward-to http://127.0.0.1:3040/api/webhooks/stripe` and copy the whsec value into `.env.local` yourself. Do not paste it into chat.
3. Open `/cruise/miami-test?avenue=preview`, claim plot 7, and pay with 4242 4242 4242 4242.
4. Expect the webhook to log 200 `cruise_plot: applied`. `GET /api/cruise/plots` should show plot 7 as "Sign in review".
5. Go to `/studio/cruise/avenue`, log in, and approve. GET should now show the TEST owner, and the buyout quote should be $8 (1.5 × $5 rounded up).
6. Optional race test: open two buyout checkouts at the same price, pay both, and the second should appear under "Refunds needed".

## Security findings not fixed (outside my file ownership)

1. **`middleware.ts` fails open.** When `STUDIO_PASSWORD` is unset, `ok = true` and every `/studio` page is served. This was confirmed on the dev server: `/studio/cruise` returned 200 with no cookie. The middleware also does not cover `/api/*`, and it compares the cookie with `===`, which is not constant-time. The Avenue page and API use `lib/cruise/studio-auth.ts`, which fails closed, but other studio pages rely on the middleware.
2. **`lib/studio-auth.ts`:** `isStudioAuthorized` returns true when the password is unset, and `hasStudioAccess` allows access outside production. Any `/api/studio/*` route using the former fails open.
3. **The studio cookie value is the password itself**, set at `app/studio/auth/start/route.ts`. A stolen cookie is the password, and it cannot be rotated per session.
4. The in-memory rate limits are per instance only. Drive-bys **cannot be protected against a distributed attacker**. They are an anonymous, unverified counter: the DB dedupe bounds each client hash to one count per plot per 30 minutes, but rotating IPs or user agents defeats it. On non-Vercel hosts `x-forwarded-for` is client-controlled.
5. In the hidden phase, any claimed plot shows the neutral "SIGN IN REVIEW" owner art instead of house art. Claims are off in hidden, so this only matters if rows exist. That rendering lives in client files I don't own.

## Local Supabase: failed, so I used a plain Postgres 16 container instead

I started Docker Desktop and ran `npx supabase start -x studio,imgproxy,…` (CLI 2.120.0) in a scratch project, not the repo, with only this migration. It failed twice with `DbSetupError: error running container: exit 125`. `--debug` shows `docker: Error response from daemon: unable to find user nobody: no matching entries in passwd file`. This looks like a Docker Desktop / CLI incompatibility, and I did not pursue it further. The supabase-js-on-edge path against a real PostgREST is therefore **not verified**.

Fallback: a throwaway `postgres:16-alpine` container (PostgreSQL 16.13), with the same role shim, the real migration applied via `psql -f`, and the container removed afterwards. Every check matched pglite:

```
claim_7 = applied → plot 7: claimed / pending / approved=f / 500
replay = duplicate · buyout_a = applied · buyout_b = stale_price
events: claimed TEST Owner 500 · bought_out TEST Buyer A 800
refunds_needed: cs_test_pg_3 stale_price
approve (expected session cs_test_pg_2) = ok
drive_bys first = 3 (7, 8, house 2; dup 7 and unknown 99 ignored) · repeat = 0
anon_exec = f · svc_exec = t
```

I left Docker Desktop running. The failed `supabase start` may have left cached images and volumes for project `cruise-avenue-test`. To remove them, run `npx supabase stop --no-backup` in the scratch dir, or prune them in Docker Desktop.

## Addendum (lead): two-connection webhook race, real PostgreSQL

`bash scripts/cruise-avenue-race-test.sh` runs against a throwaway local `postgres:16-alpine` container (PostgreSQL 16.13), which is removed on exit. It applies the real migration, then simulates Stripe delivering the same `checkout.session.completed` twice at once. Delivery A holds its transaction open for 3 s, and delivery B arrives 1 s later on a second connection.

```
With the advisory lock (expected: A applied, B duplicate, 0 refunds):
  A: applied
  B: duplicate
  refunds_needed: 0
Control, lock removed (shows the bug: B stale_price, 1 false refund):
  A: applied
  B: stale_price
  refunds_needed: 1
```

Without `pg_advisory_xact_lock`, the duplicate delivery waits on the row lock, then sees the new price and flags a paid customer for a refund. With the lock it waits, sees the committed event and returns `duplicate`.

The migration also applied cleanly on this server: 6 house plots and 24 open, because plot 10 is now house-owned.
