# Pass 3 — Independent review (Agent F)

Reviewer: **Fable 5.1 (claude-fable-5-1), running as a Claude Code subagent.** I did not write any of this code. This was a read-only review of branch `experiment/cruise-miami-master`, HEAD `9f172e8`, with the uncommitted working tree as of 2026-10-09. The only file I wrote is this one.

What I did: read the diff and the new files, looked at the before/after cockpit PNGs, ran `node --import tsx --test tests/cruise-avenue-*.test.ts` once (**33/33 pass**, 14.6 s), and scanned tracked and untracked text files for secret patterns. I printed paths only, never values. I did not start a browser or dev server and did not run `tsc`.

## Verdict per priority

| # | Priority | Verdict | Evidence |
|---|---|---|---|
| 1 | Relaxing Miami sunset cruise with music | **PARTIAL** | The chase view is atmospheric and clean (`docs/cruise/pass3/cockpit/after-desktop-chase-sunset-mobile.png`, `Claude outputs/h-hidden.png`). The only perf number on disk is 0.57 FPS mean (headless Edge, run in progress, `docs/cruise/pass3/perf/run.log`), and the lead reports 3–22 FPS in dev. At those rates the drive is not relaxing yet. Not verified on a production build. |
| 2 | City reacts to radio, honest live/groove label | **PASS (code)** | `pulse.ts` sets `'live'` only when `music.analysisActive`. The labels are "LIVE SPECTRUM" or "AUTO RHYTHM" (`CockpitRadio.tsx:299`) and "live spectrum" or "auto rhythm" (`MiamiStreet.tsx:266`). I did not verify the runtime source per station (Jolt live, NTS/R2 groove). |
| 3 | Cockpit: road visible, dash radio enjoyable | **PARTIAL** | The radio is larger and readable (`after-vfd-tuning-sweep.png`), and more road is visible than before. Problems: the A-pillar still crosses plot #1, the HUD overlaps the gauges on phone, and the measurement JSON is broken (findings 6, 7, 8). |
| 4 | The Avenue: plots, pricing, phases, wording | **PARTIAL** | Pricing is correct and tested (floor; `ceil(1.5×value)` to whole dollar). Hidden phase has no ticker, no Avenue button and no TV QR. **But the hidden phase leaks a claim/buyout card through clicks on pending, pulled or claimed plots** (finding 2). The word "impressions" appears in the terms (finding 10). House businesses say "On Ocean Drive". |
| 5 | Safety: webhook only writer, fail-closed moderation, /cruise untouched | **PARTIAL / FAIL on secrets** | The webhook is the only writer, metadata is set server-side, replays are idempotent, and moderation fails closed. **A Supabase service_role JWT is committed and pushed** (finding 1). There is also a concurrency race that creates false "refund needed" rows (finding 3). The original `/cruise` is untouched (only a harmless `bins` visibility change in `lib/cruise/music-audio.ts`). |
| 6 | Performance | **UNVERIFIED** | `docs/cruise/pass3/perf/RESULTS.md` was **not available** when I finished. Only one in-progress sample exists (`perf/a-desktop-chase-sunset-mobile.json`, 0.57 FPS, headless, with R2 CORS and 404 errors). Draw calls in the cockpit fell from about 352 to about 302 (mobile) per the before/after JSON. |

## Findings, ranked by severity

### 1. CRITICAL — Supabase service_role JWT committed to git and pushed
- **Where:** `.claude/settings.local.json`. The file is tracked and not ignored. It contains 2 JWTs whose decoded `role` claim is `service_role`. It was last committed in `b024a25`, which is on `origin` (github.com/luix42-dev/buena-onda-web) on several branches. This predates pass 3, but it is live now.
- **Failure scenario:** anyone with repo read access has full DB access, bypassing RLS. That includes the `cruise_plots` ownership, `owner_email`, refunds and orders. It also leaks the drive-by HMAC salt (`lib/cruise/rate-limit.ts:50`), which falls back to this key.
- **Fix:** rotate the service-role key (and JWT secret) in Supabase now. Then `git rm --cached .claude/settings.local.json`, add `.claude/settings.local.json` to `.gitignore`, and purge it from history if the repo is or was ever public. Set `CRUISE_DRIVEBY_SALT` so the salt no longer depends on the service key.
- No `sk_live_`, `sk_test_`, `whsec_` or R2 secret-key patterns were found in tracked or untracked text files. `.env.local` is git-ignored (`.gitignore:55`).

### 2. HIGH — The hidden phase still shows prices and the claim/buyout UI through plot clicks
- **Where:** `components/cruise/master/StreetEnvironment.tsx:695`. In the hidden phase a click passes through `if (avenue !== 'hidden' || p?.owner)`. Pending and pulled plots have `owner = PENDING_OWNER` (`plots.ts:94`), and approved claimed plots have an owner. `MiamiStreet.tsx:296` renders `<PlotCard>` without checking `showAds`.
- **Failure scenario:** the phase goes back to hidden after any claim exists (or a claim is pending or pulled). A visitor clicks what looks like a "BUENA ONDA" house flag (pending plots render house art in hidden, `StreetEnvironment.tsx:533`) and gets a "Sign in review · Value $X · **Buy out for $Y**" dialog with the claim form. That breaks the hidden-phase rules in LAUNCH-PHASES ("no prices… no claim cards"). An approved plot also opens a buyout card in hidden.
- **Fix:** in hidden, allow the click only for `p.owner && !p.pending`, and in that case open a price-free "owner" card (a Visit link only). Also gate `{plot && <PlotCard/>}` on `showAds || !priceCents(...)`. Add a unit test for this.
- **Related (low):** in hidden, `TvLowerThird` (`MiamiStreet.tsx:307`) shows approved claimed plots tagged `PLOT #n`. The credits line (`MiamiStreet.tsx:300`) always says "All signs on the Avenue are plots; open plots say so", which is false in hidden (open plots wear house art) and mentions the Avenue.

### 3. MEDIUM — Concurrent duplicate webhook deliveries create a false "refund needed" row for a valid purchase
- **Where:** `supabase/migrations/20261009120000_cruise_avenue_plots.sql:137-151`. The duplicate check (`exists … events/refunds_needed`) runs **before** `select … for update`.
- **Failure scenario:** Stripe delivers the same `checkout.session.completed` twice concurrently (retry after a timeout, or `stripe events resend` while the first is in flight). Both deliveries pass the exists check. Delivery A locks, applies and commits. Delivery B gets the lock, reads the new `value_cents`, which is not equal to `prior_value_cents`, and records a `stale_price` refund for the **same session that owns the plot**. An operator following the "Refunds needed" list then refunds a buyer who keeps the plot. There is no double-apply, though: the unique `stripe_session_id` index and the value check prevent that.
- **Fix:** repeat the duplicate check after acquiring the row lock, or take `pg_advisory_xact_lock(hashtext(p_session_id))` first. Alternatively, in the stale branch return `'duplicate'` when `claim_session_id = p_session_id`. PGlite is single-connection, so no test covers this. Add a two-connection test against the Postgres 16 container.

### 4. MEDIUM — Reduced motion is not honoured across the city or the CSS; pulses are beat-synchronous
- **Where:** `StreetEnvironment.tsx:272` (neon emissive up to about 3× on each kick), `:579` (flag swing), `:336` (palm sway), `StreetSky.tsx:127` (horizon pulse), `master.css` (70 s ticker scroll, `.mm-disc.spin`, `mm-in`). There is no `prefers-reduced-motion` rule anywhere in `master.css`. Only the car and radio use `useReducedMotion` (`ConvertibleCar.tsx:131`, `CockpitRadio.tsx:40`).
- **Risk:** the groove runs at 112 BPM (about 1.9 Hz). Live analysis on fast tracks can push kick pulses toward about 3 Hz. The neon areas are small, so this is probably below WCAG 2.3.1, but reduced-motion users get the full beat-pulsing city. Pass 3 adds no flashing that I can see; the VFD tune is a sweep, per the `CockpitRadio.tsx:18` comment.
- **Fix:** have `pulse.ts` export a `reduced` flag and clamp `kick` to 0 or smooth `bass` when it is set. Add `@media (prefers-reduced-motion: reduce)` to stop the ticker, disc spin and entrance animations.

### 5. MEDIUM — Drive-bys inflated by unattended TV loops and non-production traffic
- **Where:** `MiamiStreet.tsx:79` `useDriveBys(..., running)` also runs in `?tv=1` autopilot, which loops forever (`onFinish` → `reset(true)`). The visit route has no environment or phase gate.
- **Failure scenario:** a TV left on counts every plot about 48 times a day (the dedupe window is 30 minutes). Preview, dev and QA sessions on production also count. These numbers are the "audience proof" to be sold (LAUNCH-PHASES), and AGENTS.md says not to count demo analytics as sponsorship outcomes.
- **Fix:** don't count, or tag separately, `tv`/autopilot drive-bys (send `{tv:true}` and store it in a separate column). Optionally require a user gesture in the last N minutes. The current wording ("anonymous, unverified counter") is honest; keep it.

### 6. MEDIUM — Cockpit: the A-pillar still crosses plot #1 (billboard) on desktop
- **Evidence:** `after-desktop-driver-sunset-mobile.png`. The left windshield frame runs diagonally through the billboard at about x 400–440 px of 1600 and cuts "BU▮NA ONDA" and "▮ADIO". The before image had the same problem ("BU▮A ONDA R▮DIO"). After moving the eye the pillar is closer and thicker, so this is not fixed and is about as bad. The phone after-image (`after-phone-landscape-driver-night-mobile.png`) shows the same pillar crossing the billboard.
- **Fix:** move `CONVERTIBLE_EYE` slightly right, or thin or angle the left pillar so the billboard at s=34 sits fully in the left windshield pane over the 60 m → 5 m approach. Then measure occlusion with `?metrics=1` at 40/80/125 m, not only at 0 m.

### 7. MEDIUM — Cockpit evidence JSON does not measure what it claims
- **Where:** `docs/cruise/pass3/cockpit/after-measurements.json`. `headUnit` is `{x:75.9, y:75.9, w:1600, h:900}` for **every** driver shot (all times, both qualities). `w`/`h` equal the viewport, and x equals y. Chase shots also report a head unit (`49.6, 69.5`) where none is visible. In `before-measurements.json` it is `null`.
- **Impact:** the artifact cannot support any "head unit visible/legible" claim. Only the PNGs can. `softwareMsPerFrame` (38–52 ms) suggests a software or contended renderer, so it is not a performance figure.
- **Fix:** project the head-unit bounding box corners to screen space and report the on-screen rectangle and its occluded fraction. Mark the current file as invalid.

### 8. LOW-MEDIUM — Phone cockpit: the HUD sits on the instruments
- **Evidence:** `after-phone-landscape-driver-night-mobile.png`. The `mm-status` line ("COCKPIT · 0 MPH · 60 FPS · 0 m") is printed over the speedometer face, the ▶ Cruise button covers the wheel hub, and the cassette deck sits under the drive controls. The rear-view mirror is now off-screen at the top. The FPS readout is shown to every visitor (`MiamiStreet.tsx:261`).
- **Fix:** hide FPS unless `?metrics`. In `mm-cockpit`, move `mm-status` above the dash line or drop it, since the speedometer already shows speed.

### 9. LOW — Post-checkout return has no confirmation, and lands in preview, not the configured phase
- **Where:** `app/api/cruise/plots/claim/route.ts:56` uses `success_url …?avenue=1&claimed=N`. `claimed` is never read (no hit in `components/cruise/master`), and `avenue=1` forces `'preview'` (`plots.ts:126`).
- **Impact:** the buyer pays and comes back to an unchanged street with no "payment received, sign in review" message, which invites a support ticket or a second payment.
- **Fix:** read `claimed` and show a toast ("Thanks, plot #N is in review").

### 10. LOW — The word "impressions" in new Avenue-facing text
- `docs/cruise/avenue/TERMS-DRAFT.md:74` ("They are not verified human impressions"). It is negated, but the rule is never to use the word. Reword to "not verified views".
- The `AvenueUI.tsx:25` comment is not user-facing.

### 11. LOW — Smaller correctness and honesty notes
- `claim/route.ts:26`: the 413 check relies on `content-length`. A chunked body is fully parsed first. It is bounded by platform limits, so impact is minor.
- `GET /api/cruise/plots` is public in every phase and returns prices, values and visits. Hidden is a UI-only hide, which is acceptable but should be stated in LAUNCH-PHASES.
- `PlotCard` copy "Defend it by holding the top bid" (`AvenueUI.tsx:90`) implies an auction. It is actually a fixed 1.5× buyout.
- New untracked public routes `app/cruise/cockpit-test`, `app/cruise/projection-test` would ship with a merge. Decide whether to keep them.
- `docs/cruise/CURRENT-BUILD.md` is stale. It describes Island Trail as primary and the R2 catalog as broken, and says Claude "did not participate".
- `lib/radio-metadata.ts:37-38`: production behaviour is unchanged when env vars are present. Without Supabase it silently skips metadata, which is fine for preview.
- The webhook diff is behaviour-neutral for items and orders. Only sessions with `metadata.kind === 'cruise_plot'` divert, and item checkout (`app/api/checkout/route.ts:106`) never sets `kind`. The cruise `payment_intent.succeeded` has no `checkout_surface`, so it is acknowledged without fulfillment. I confirmed this by reading the code. I could not run it against Stripe.
- Studio cookie = plaintext password (pre-existing, noted in GATE4 §Security 3). The middleware fails open (pre-existing). The Avenue page and API correctly use the fail-closed `lib/cruise/studio-auth.ts`.

## Specific challenges from the lead: answers

- **Hidden leak?** The ticker, Avenue button, drawer, nearby plot cards and TV claim QR are all gated (`showAds`). **Plot cards are not gated:** they leak through clicks on pending, pulled or claimed plots (finding 2). They do not leak through open plots: open plots are blocked in hidden.
- **Pending/pulled at floor or owner content public?** No. `mergePlots` keeps them `claimed` with `PENDING_OWNER` and no URL, and `priceCents` gives the buyout of the stored value. The claim route uses the same server-side merge. Ticker names are withheld until `name_approved`. This is covered by tests.
- **Webhook tricks?** Metadata is server-set. A forged event needs the `whsec`. The amount and currency are checked against `expected_cents`. Replays return `duplicate`. **A concurrent duplicate gives a false refund row** (finding 3). There is no double-apply.
- **Rate limits honest?** Yes. The comments and GATE4 state that the limits are per-instance and best effort, and that a distributed attacker can defeat them. The DB dedupe is real.
- **Reduced motion and flashing?** The cockpit respects reduced motion. The city and CSS do not (finding 4). I found no new strobe.
- **A-pillar on the billboard?** Yes, it still occludes plot #1 (finding 6).
- **/cruise regression?** None found. Outside master, the Avenue routes, studio and docs, the diff is the webhook branch, `music-audio.ts` (private→readonly field) and `radio-metadata.ts` (env guard).
- **Secrets?** Yes: `.claude/settings.local.json` holds a service_role JWT (finding 1).

## Claims I could NOT verify
- The 48-cell matrix with zero console errors (Chrome 154, UHD 630). I found no artifact on disk. Note that `perf/run.log` says **Edge** 154, headless.
- The FPS numbers (10–22 chase, 3–4 legacy cockpit). Dev-mode sampling is not representative, and there is no production-build measurement.
- The per-station pulse source (Jolt live; NTS and R2 groove), R2 CORS on production origins, and audio continuity across 7 camera cycles, Explore, the plot card and the claim form. These need a browser, and there is no recording or log for pass 3 in `docs/cruise/pass3`.
- Stripe TEST end-to-end: BLOCKED, as the lead reported (`docs/cruise/avenue/GATE4-EVIDENCE.md:76`). supabase-js on the edge runtime against real PostgREST is also not verified.
- That the studio moderation page renders with data. GATE4 says it was verified only as a 404 when unauthorised.
- Performance results: `docs/cruise/pass3/perf/RESULTS.md` was not available.
