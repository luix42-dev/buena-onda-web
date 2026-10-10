# Buena Onda Cruise — Current Build (pass 3)

Snapshot: October 9, 2026 · Branch `experiment/cruise-miami-master` · Route `/cruise/miami-test` · Local only, **not deployed**. Not production-ready, not photorealistic.
Previous snapshot (pass 1 measurements, Astra review): `docs/cruise/master/CURRENT-BUILD-pass1.md`.

**Status: PARTIAL.** Next.js integration, radio behaviour, cockpit polish, Avenue security and moderation are built and tested in code. The Stripe TEST end-to-end purchase, physical TV/Chromecast/AirPlay and physical Android are **not** verified.

## Who did the work (actual participants)

| Role | Agent / model | Files owned |
|---|---|---|
| A: Integration lead, radio (C folded in, browser-bound) | Claude Opus 5.5 (`claude-opus-5-5`), main Claude Code session | `MiamiStreet.tsx`, `StreetEnvironment.tsx`, `StreetSky.tsx`, `StreetMetrics.tsx`, `AvenueUI.tsx`, `pulse.ts`, `master.css`, `lib/radio-metadata.ts`, docs |
| B: Graphics/cockpit | Claude Opus 5.5 subagent | `ConvertibleCar.tsx`, `CockpitRadio.tsx`, `DriveController.tsx`, `master/cockpit/*` |
| D: Avenue commerce/security | Claude Opus 5.5 subagent | `app/api/cruise/**`, webhook cruise branch, migration, `plots.ts`, `lib/cruise/{plot-fulfillment,rate-limit,studio-auth}.ts`, studio moderation, `docs/cruise/avenue/*`, tests |
| E: TV/performance measurement | Claude Sonnet 5.5 subagent | `scripts/cruise-pass3-{measure,tv}.mjs`, `docs/cruise/pass3/perf/*` |
| F: Independent review | Fable 5.1 subagent (different model) | `docs/cruise/pass3/REVIEW-F.md` |

**Astra was not available in this environment and did not participate in pass 3.** The ledger is `docs/cruise/pass3/LEDGER.md`. External costs: **none** (no paid assets, services or credits; no new npm dependencies).

## Pass 4 release — October 10, 2026 (supersedes local-only snapshot above)

- **BUILT / DEPLOYED:** At the owner's explicit request, pushed commits through `4e6e8fd` to main before key rotation. Vercel production deployment `dpl_Hmwv2AS1wvPDZo66htju4ezwFQKU` is Ready and aliased to `buenaondalifestyle.com`. Avenue remains hidden by default; no production migration or environment changes were made.
- **VERIFIED:** Pre-push `npm test` passed 60/60; `npm run typecheck` passed. Vercel's production build succeeded with configuration/lint warnings. Live browser evidence is in `docs/cruise/pass4/live-smoke.json`; reproducible check: `node scripts/cruise-pass4-live-smoke.mjs` (uses the existing sibling checkout's Playwright dependency).
- **FAILED / BLOCKERS:** Leaked legacy service-role key retirement is still unconfirmed. Stripe TEST purchase, new sustained FPS measurements, sign visibility improvements, studio auth changes, scratchpad cleanup, and physical-device checks remain pending. Browser playback state and analysis do not establish audible output.
- **NEXT ACTION:** Owner updates the API keys, verifies a replacement deployment, and disables the exposed legacy key; then decide on history purge and resume the Pass 4 sequence. Participant: Codex primary agent only; no subagents participated in this release.

## Pass 4 intake — October 9, 2026 (historical)

- **BUILT:** No Pass 4 application changes yet. Participant: Codex (primary agent only; no subagents).
- **VERIFIED:** GitHub main remains `106aa22c7ceccd780dc54bd1529e8b6de22ad74a`; the four Cruise commits through `608ce76` have not reached main. Vercel inspection reports production deployment `dpl_85roTCtNDAB2SHgfmssLxSJj8di3` Ready, created October 6. This does not verify the Pass 3 Cruise build in production. The inspection returned deployment details despite an update-worker timeout.
- **FAILED:** The security prerequisite remains unmet: the owner explicitly confirmed the leaked service-role key has not been rotated.
- **BLOCKERS:** Await replacement and retirement of the exposed credential. No production migration, environment changes, deploy, Stripe TEST checkout, new FPS/visibility measurement or physical-device verification performed in Pass 4. Scratchpad `wt` is clean and its `node_modules` is a junction to this repo's dependencies; removal remains pending.
- **NEXT ACTION:** Replace the legacy key following Supabase's current API-key migration guidance, update consumers, verify the replacement, and deactivate the compromised legacy key. This repository reads `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; account for both before disabling legacy keys. Set an independent `CRUISE_DRIVEBY_SALT`. Production environment changes and any required redeploy need owner approval. After revocation is confirmed, ask the owner whether to purge git history, then continue the requested Pass 4 sequence. Do not put replacement secrets in chat or git.

Reference: https://supabase.com/docs/guides/getting-started/api-keys#rotate-a-leaked-or-compromised-key

## BUILT

- **Next.js integration:** `/cruise/miami-test` runs inside the real Next 14 dev server (client-only dynamic import, no SSR of WebGL). A read-only QA probe `window.__cruise()` reports pulse source, playback, camera, vehicle, time and quality.
- **Radio:** `/api/radio/tracks` works locally with R2 credentials. Only the five `CF_R2_*` names were copied from the Vercel Development env into git-ignored `.env.local`; values were never displayed, and the temporary pull file was deleted. `lib/radio-metadata.ts` now skips Supabase title/order metadata when Supabase isn't configured. Production always has it configured, so behaviour there is unchanged.
- **Cockpit (Agent B):**
  - Eye point and framing:
    - aspect-aware vertical FOV, about 52° at 16:9 and 44° in phone landscape (it was 62°);
    - the windshield header is raised out of the sightline;
    - thin chrome pillars and a matte glare-shield dash.
  - Instruments and surfaces:
    - procedural walnut, leather and gauge textures;
    - larger gauge numerals and chrome bezels;
    - a detailed steering wheel.
  - Gloved hands on the wheel (2 draw calls) that follow the steering, with a Garage toggle.
  - Night: instrument backlight, an additive headlight pool, a no-shadow SpotLight on Desktop, and under-dash neon (visible in chase).
  - VFD:
    - dot-matrix styling;
    - a 0.9 s tuning sweep on station change (0.35 s with reduced motion);
    - honest LIVE SPECTRUM / AUTO RHYTHM labels.
  - Glow is faked with additive halos and no postprocessing, per the owner's decision.
  - Static interior merged and presets instanced: draw calls in cockpit Mobile 352 → 302, cockpit Desktop 814 → 746, chase 366 → 308.
- **Lead fixes:**
  - House business cards say "On Ocean Drive", never "Sponsored".
  - The cockpit status readout moved off the wheel. FPS shows only with `?metrics=1`.
  - Stars no longer render as an aliasing dot grid (sin-free hash, jittered and twinkling).
  - Lamp flags (#7–22) and bench panels (#23–30) are now instrumented for StreetMetrics. Sign raycasting runs only with `?metrics=1`; it used to run for every visitor four times a second.
- **Reduced motion:** `pulse.ts` removes beat-synchronous kicks and snares city-wide and damps levels. CSS stops the ticker, the disc spin and the entrance animations.
- **TV mode:**
  - Screen Wake Lock while the cruise runs, and an autofocused start gate for TV remotes.
  - Media Session play/pause/next/previous (station), plus ChannelUp/Down and Enter.
  - Remote (Presentation API) messages are validated against known stations, cameras, times and volume range.
  - Unattended TV loops count each plot's drive-by once per page session, not every lap.
- **Analytics for the opening trigger:** `cruise_start` and `cruise_session` (`duration_seconds`, `listening_seconds`, `route`, `tv`) go through the existing GA4 `trackCruiseEvent` contract.
- **The Avenue (Agent D, details in `docs/cruise/avenue/GATE4-EVIDENCE.md`):**
  - **Moderation:**
    - new claims and buyouts land *pending*;
    - the studio moderation page `/studio/cruise/avenue` and its API (approve / pull / restore / note / resolve refund) are written to the `cruise_plot_moderation` audit table;
    - the server-side auth fails closed: `STUDIO_PASSWORD` is required, the cookie is compared in constant time, and Origin must match.
  - **Public data:** the GET never exposes owner email or session ids. Pending or pulled plots are never offered at the floor price.
  - **Webhook:**
    - checks amount and currency, and handles async success, expired and failed sessions;
    - permanent problems return 200 and write a durable `cruise_plot_refunds_needed` row; transient DB errors return 500 so Stripe retries;
    - cruise sessions never reach item/order fulfillment.
  - **Claim route:** Checkout expires after 31 minutes. House plots and plots above 30 are refused, and each IP is limited to 5 claims a minute.
  - **Drive-bys:** 1 KB cap, seed plots only, a per-IP limit, and a 30-minute database dedupe on a salted daily hash (no raw IP stored). This is honestly documented as an anonymous, unverified counter.
- **Lead fixes after review:**
  - The hidden phase no longer leaks prices or claim/buyout cards through plot clicks.
  - Credits only mention the Avenue when it is visible.
  - Concurrent duplicate webhook deliveries are serialized with a per-session advisory lock, so no false refund row is written.
  - "Impressions" was removed from the terms draft.
  - Returning from Checkout shows a notice that makes no claim the payment succeeded.
  - The TV start gate is focused once the street is ready, so a remote OK/Enter starts it. This was found by the Gate 6 TV soak.
  - Billboard #1 moved from s=34 to s=56 and was lowered by 2.8 m to lengthen its cockpit approach (see FAILED).
- **Draft terms:** `docs/cruise/avenue/TERMS-DRAFT.md`, marked DRAFT — NOT PUBLISHED, with [LEGAL REVIEW] flags. It is not linked from anywhere.

## VERIFIED

**Gate 1 — Next.js integration: PASSED (functional).** `npm run typecheck` is clean at baseline and after every change. Chrome 154 with Intel UHD 630 (ANGLE D3D11) at a 1707×757 viewport, DPR 1.125, ran an in-page loop over **4 vehicles × chase/cockpit × day/sunset/night × Mobile/Desktop = 48 combinations**:
- every switch landed in the requested state;
- **0 console errors or exceptions**;
- audio kept playing throughout.

The 1-second rAF samples taken right after each switch (dev build, memory-starved machine) are diagnostic only:
- convertible: chase 11–22 FPS, cockpit 10–16 FPS;
- Island Trail and Classic Coupe cockpit: 3–4 FPS in these post-switch samples. **This was a measurement artifact:** proper driving runs (`--vehicle`) give Island Trail 36.3 chase / 23.3 cockpit and Classic Coupe 37.4 / 24.4, close to the convertible. No change to the shared legacy code was needed.

Gate 6 below holds the measured numbers. The matrix was run in a live browser session, and no artifact file was saved for it.

**Gate 2 — Radio reality check (Chrome 154, 127.0.0.1:3040, user-gesture play):**

| Preset | Plays | `pulse.source` | Cause / limitation |
|---|---|---|---|
| Buena Onda Radio (R2 playlist) | Yes, after R2 env (6 tracks) | `groove` locally | The R2 bucket CORS (`cors.json`) allows production origins and `localhost:3000–3002`, not `127.0.0.1:3040`. curl confirmed `Access-Control-Allow-Origin` for buenaondalifestyle.com and www, so production should analyse live. **Not verified in production.** |
| Jolt | Yes | **`live`** (energy samples 0.01–0.09) | — |
| NTS 1 | Yes | `groove` ("capture restricted") | NTS's published relay `stream-relay-geo.ntslive.net` 302-redirects **without CORS headers**, so the media is tainted. The redirect target `streams.radiomast.io/nts1` is CORS-clean; the owner chose to keep the published URL. |
| NTS 2 | Yes | `groove` | Same as NTS 1. |

- Before R2 config, `/api/radio/tracks` returned 500 "Missing R2 environment variables". After it, the route failed on missing Supabase; that is fixed (above).
- Continuity: with Jolt live, **7 consecutive camera cycles** (chase / cockpit / side / crane / low / hood) kept `playing:true, source:live`. Vehicle switch kept live analysis.
- Explore card, plot card, claim form and closing them all kept `playing:true`.
- Dev-only caveat: a Fast Refresh remount (another agent editing a module) re-creates `MusicAudio`, and the city falls back to groove until the next station change. This doesn't happen in production builds.
- Live analysis and visuals pause when the tab is hidden (by design: `frameloop` never, analysis inactive). Audio continues.

**Gate 3 — Cockpit: PARTIAL.** The before/after captures are in `docs/cruise/pass3/cockpit/` (headless Edge with software rendering, so no performance claims). The road and the windshield are clearly more open, and the head unit sits in the lower-right third on desktop and phone landscape. The independent reviewer found the **left A-pillar crossing billboard #1** in the desktop cockpit view. Measurement showed the bigger loss was framing; the billboard was moved, and the cockpit now gets 2.7 s of the 5-s target (see FAILED). `after-measurements.json` head-unit numbers are invalid (`MEASUREMENTS-INVALID.md`); use the PNGs.

**Gate 4 — The Avenue: code and logic VERIFIED, end-to-end payment BLOCKED.**
- `node --import tsx --test tests/cruise-avenue-*.test.ts` → **33/33 pass**: the migration on pglite, the real route handlers, and locally signed TEST Stripe events. The lead re-ran it after the review fixes; still 33/33.
- `npm test` → 60/60 (Agent D).
- Agent D also applied the migration to a throwaway Postgres 16.13 container, with the same results.
- **Two-connection webhook race on real PostgreSQL 16.13** (`scripts/cruise-avenue-race-test.sh`, throwaway container):
  - with the advisory lock, a concurrent duplicate delivery returns `duplicate` and writes 0 refund rows;
  - the control run with the lock removed reproduces the bug (`stale_price` plus a false refund row for a customer who paid once).
- Dev-server smoke test with no env:
  - GET falls back to the seed;
  - visit: 204, 413 for an oversized body, 429 after a burst;
  - claim: 503;
  - moderate API: 401;
  - `/studio/cruise/avenue`: 404 (fails closed).

**Gate 5 — TV:** see Gate 6 / `docs/cruise/pass3/perf/RESULTS.md` for the emulated soak. **Real TV browser, Chromecast (Android Chrome) and AirPlay (iPhone): BLOCKED — PHYSICAL DEVICE REQUIRED.** Note that a Chromecast receiver must load a publicly reachable HTTPS URL, so casting cannot be tested against `127.0.0.1`.

**Gate 6 — Performance and visibility: MEASURED, targets not met.** Full data: `docs/cruise/pass3/perf/RESULTS.md`.
- **Test setup:**
  - headless Edge 154.0.4258.62 on Intel UHD Graphics 630 (ANGLE D3D11, hardware GL, not SwiftShader);
  - a Windows 10 laptop running the Next dev server, not a production build;
  - sunset with the Mobile preset unless noted.
- FPS comes from runs without `?metrics`. Sign exposure comes from separate `?metrics=1` runs; sign sampling drops the page to about 0.8 FPS, so exposure is recomputed in simulated seconds as qualified distance ÷ 3.5 m/s.

| View | Viewport / DPR | Mean FPS | p5 FPS (1 s) | p95 frame | Draw calls |
|---|---|---:|---:|---:|---:|
| Desktop chase | 1600×900 / 1 | 32.6 → **41.9** after optimization | 30.0 → **38.4** | 50 → 34 ms | 243 |
| Desktop cockpit | 1600×900 / 1 | 23.7 → **27.3** after optimization | 19.7 → **25.6** | 67 ms | 237 |
| Desktop cockpit, **Desktop** preset | 1600×900 / 1 | 18.1 → **19.4** after optimization | 13.3 → **15.9** | 100 → 83 ms | 727 |
| Desktop chase, night | 1600×900 / 1 | 29.7 → **41.8** after optimization | 16.5 → **38.8** | 67 → 34 ms | 244 |
| Phone-landscape chase (emulated) | 844×390 / 3 | 58.9 | 53.1 | 17 ms | 244 |
| Phone-landscape cockpit (emulated) | 844×390 / 3 | 58.8 | 53.1 | 17 ms | 233 |

- About 314k triangles. JS heap is 94–112 MB (not GPU memory). Load-to-ready takes 7–11 s.
- **FPS regression versus pass 1: profiled and partly recovered.**
  - Before: desktop chase fell from 51.6 to 32.6 FPS and desktop cockpit from 35.2 to 23.7, at the same pixel count.
  - `scripts/cruise-pass3-profile.mjs` (`?profile`) pauses the cruise and hides one scene subtree at a time.
  - Results are in `docs/cruise/pass3/perf/profile-*.json`. Three causes were found and fixed:
    1. **Sky shader** (about 5 ms/frame): it was drawn first, so it shaded every pixel behind buildings, with 15 octaves of sin-hash noise. It now draws at the far plane after opaque geometry, with a sin-free hash and 3-octave fine layers.
    2. **Cockpit radio** (about 5 FPS in *both* cameras): two canvases were redrawn and re-uploaded with full mipmap chains 30×/s, even in chase view. Now: 2 Hz outside the cabin, 24 Hz inside, no mipmaps on the live screens, and the static background cached.
    3. **Clearcoat paint** on the car body: now Desktop preset only, like the wood.
  - After (same scripts, driving): chase **41.9**, night chase **41.8** (p5 16.5 → 38.8), cockpit **27.3**.
  - Desktop-preset cockpit: 18.1 → 19.4. The cockpit result was confirmed with a second run on an idle GPU (27.26). It is still below pass 1, whose cockpit was a much simpler car.
  - A later attempt to halve the radio canvas resolution could not be measured reliably: another browser was using the GPU and the numbers drifted 27 → 12 FPS between identical runs. It was reverted.
- Phone emulation runs at the vsync cap, but that comes from the desktop GPU and says nothing about a phone.

Continuous geometric sign qualification, in simulated seconds (target 5 s; a proxy, not proof of readability):

| Sign | Desktop chase | Desktop cockpit | Phone chase | Phone cockpit |
|---|---:|---:|---:|---:|
| Billboard #1 | **6.05** → **6.1** after the move | 1.35 → 2.7 after the move | 3.25 → 3.25 | 0 → 1.25 |
| Buena Onda sign | 4.65 | 2.25 | 2.65 | 0 |
| Branches sign | **6.70** | 3.95 | 2.65 | 0 |
| Lamp flags #7–22, bench panels #23–30 | 0 | 0 | 0 | 0 |

- Only desktop chase meets 5 s, and only for two signs.
- Lamp flags and bench panels never qualify: they are too small, or occluded, when they are large enough.
- **TV soak** (1920×1080 emulation, 6 min):
  - autopilot, the auto-director (six cameras) and five loop restarts all worked;
  - `playing` stayed true in 72/72 samples (a state flag, not audible output);
  - the heap ended lower than it started;
  - Enter, ChannelUp and ChannelDown worked.
- **Start-gate bug found by the soak:** a disabled button loses `autoFocus`. Fixed: the gate is focused once the street is ready. Re-checked in headless Edge at 1920×1080: the gate was focused, and Enter alone started the cruise.

## FAILED

- **Billboard #1 in the cockpit: 2.7 s, below the 5-s target** (reviewer finding 6, partly fixed).
  - **Diagnosis:** with a cockpit capture and per-sample criteria, the main loss was not the pillar. The sign sat only 42 m from the start and left the frame through the left edge about 30 m out.
  - **Change:** billboard #1 moved from s=34 to s=56 (`StreetEnvironment.tsx` and `plots.ts`), and the panel centre lowered from 7.4 m to 4.6 m. The plot number and price are unchanged.
  - **Re-measured** (`?metrics=1`, first 75 m, `*-ads-bb56.json.gz`): desktop cockpit 1.35 → 2.7 s, desktop chase 6.05 → 6.1 s.
  - **Still in the way:**
    - the sign is now framed for about 25 m (~7 s), but the left A-pillar (part of the merged chrome `BufferGeometry`) interrupts it four times. That is one pillar crossing the sign's five sample points one after another as the sign sweeps from about 13° to 24° left. A thinner pillar only shortens each break; removing them needs a different windshield or a sign on the other side. The occlusion rule was deliberately **not** loosened;
    - lamp flag #10 (s=43, ocean side) briefly covers the billboard. **Resolved commercially:** plot 10 is now a house "Buena Onda Radio" flag, not for sale (`plots.ts` and the unapplied migration), so no buyer can block another buyer. The flag still physically crosses the sightline. Any ocean-side flag between the start and s=56 would cross it, so moving the flag doesn't help.
  - **Phone views re-measured after the move:** phone chase 3.25 s (unchanged; the sign is under the 130-px width minimum until close), phone cockpit 0 → 1.25 s. Night was not re-measured.
- **Five-second readable exposure:** see the Gate 6 table; phone-sized exposure remains far below target.
- **Desktop FPS is still below pass 1** after optimization: chase 41.9 vs 51.6, cockpit 27.3 vs 35.2. See Gate 6.
- The dash and hood still fill roughly the bottom 40% of the cockpit frame.

## BLOCKERS

1. **SECURITY (pre-existing, urgent):** `.claude/settings.local.json` is tracked in git, pushed to `origin` (last in `b024a25`), and contains a **Supabase `service_role` JWT**.
   - **Owner action:** rotate the service-role key and JWT secret in Supabase now, and set `CRUISE_DRIVEBY_SALT` (the drive-by hash currently falls back to the service key).
   - Pass 3 adds the file to `.gitignore` and removes it from the index (`git rm --cached`); the local file is kept.
   - **Purging it from history rewrites pushed branches and needs the owner's explicit decision.**
2. **Stripe TEST end-to-end (plot #7 claim → Checkout 4242 → webhook → DB → owner shown → ticker → 1.5× buyout quote): BLOCKED.** It needs `STRIPE_SECRET_KEY` (sk_test), `STRIPE_WEBHOOK_SECRET` (from `stripe listen`), a **local** Supabase URL and service key, `CRUISE_PLOTS_ENABLED=1`, `STUDIO_PASSWORD` and optional `CRUISE_DRIVEBY_SALT`.
   - Local Supabase failed. The CLI's DB init runs as user `nobody`, and Docker Desktop then crashed under memory pressure.
   - The owner chose to skip for now. The steps are in `GATE4-EVIDENCE.md`.
3. **Physical devices:** TV browser, Chromecast, AirPlay and Android: BLOCKED — PHYSICAL DEVICE REQUIRED.
4. ~~Concurrency test for the webhook advisory lock~~ **done** on real PostgreSQL 16.13 (see Gate 4).
5. **Pre-existing studio auth weaknesses (not changed in pass 3):** `middleware.ts` and `lib/studio-auth.ts` let everyone in when `STUDIO_PASSWORD` is unset, don't cover `/api`, and store the password itself as the cookie value. The new Avenue moderation uses its own fail-closed check.

## Opening the Avenue (proposal for Luis to confirm)

Measured with the existing GA4 events now sent by `/cruise/miami-test` (`cruise_start`, `cruise_session.duration_seconds` / `listening_seconds`):

- **Proposed trigger:** 4 consecutive weeks with **≥ 1,000 weekly sessions** and **average session ≥ 4 minutes**, plus the terms reviewed by counsel.
- These numbers are placeholders for the owner's decision. No audience data exists yet, because the route is not deployed.
- Drive-bys keep counting in hidden mode as the audience asset. They are an anonymous, unverified counter, not an audited metric.

## NEXT ACTION

1. Owner: rotate the leaked Supabase service-role key, then decide on the history purge.
2. Owner: provide the Stripe TEST + local Supabase env (or a stable Docker), then run the plot #7 script in `GATE4-EVIDENCE.md`. Also review `TERMS-DRAFT.md` with counsel.
3. Billboard #1 cockpit sightline: consider a narrower cockpit A-pillar profile. Then re-run `node scripts/cruise-pass3-measure.mjs --mode ads --only a,b,c,d` (about 27 min per view). Owner: confirm that plot 10 stays a house flag.
4. Performance: profile the cockpit again on an idle machine (`node scripts/cruise-pass3-profile.mjs --cam driver --root 5,1`), and measure a production build (`next build` + `next start`), not the dev server.
5. Physical Android FPS test, plus real TV / Chromecast / AirPlay tests on an HTTPS preview URL. A preview deploy needs the owner's authorization.

## Run locally

```powershell
cd D:\10-VENTURES\12-buena-onda\cruise-publish-20261006
npx next dev --hostname 127.0.0.1 --port 3040
```

Pages:
- http://127.0.0.1:3040/cruise/miami-test (launch/hidden)
- `?avenue=preview` (Avenue UI; claims still 503)
- `?tv=1` (lean-back)
- `?metrics=1` (sign exposure sampling and FPS readout)
