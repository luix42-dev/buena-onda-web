# Pass 6: rendering, loop transition and Avenue pre-open security

Date: October 10, 2026. Base: `c23833c`, branch `experiment/cruise-miami-master`. Local work only; no push, deployment, production data write, dependency installation or purchase. Avenue remains hidden. Original `/cruise` rendering is unchanged; the explicitly authorized shared Studio authentication fixes also protect existing administration endpoints.

**Verdict: BLOCKED for release.** The default-quality desktop performance target passes locally. Desktop quality still fails; real Stripe TEST verification and credential retirement remain incomplete.

## Implemented

- Desktop mirror renders every third frame and is disabled at night. Night uses a dark fallback. Headlight SpotLights remain explicitly shadowless.
- Desktop renderer DPR is capped at 1.25. Mobile quality uses DPR 0.85 only at night above one million CSS pixels; phone-sized canvases and daytime Mobile remain DPR 1. This measured tradeoff softens fine 3D detail while the DOM dock stays sharp.
- Loop reset waits for an opaque cover, switches shot, snaps the camera and waits for a rendered-frame acknowledgement before revealing the street. Reduced motion retains the selected shot and uses an immediate cover. This is an editorial fade/cut, not continuous world wrapping.
- Convertible paint and exterior metal use Original Cruise's material treatment. Desktop clearcoat is retained; Mobile uses the cheaper Standard material shader. Cream paint color, geometry and cockpit remain intact.
- Shared Studio auth fails closed, covers Studio/admin APIs, uses signed 12-hour sessions and rejects old password cookies. Login/logout require same-origin requests. Users must log in again after a future deployment. No new signing-secret configuration is required.

## Verification

Final isolated production build exited 0. Standalone typecheck passed before the final small origin/DPR edits; the final build also completed type checking. Full sequential suite: **62/62 passed**, 20.49 seconds. Runtime missing-password auth smoke: **5/5 passed**, covering Studio page redirect, Studio/admin API rejection and login-unconfigured response.

The first runtime auth smoke correctly exposed an Origin mismatch caused by Next normalizing 127.0.0.1 to localhost internally. The fix uses the actual Host header and request protocol, ignores x-forwarded-host, and is covered by a regression test. Initial and final smoke artifacts are retained. The initial build completed its route table but PowerShell reported exit 1 while redirecting stderr; the final command explicitly propagated the native exit code and returned 0. Existing Next configuration/lint warnings and blocked dummy-data reads remain in logs.

### Controlled resolution experiment

Intel UHD 630 / ANGLE D3D11, Windows Edge 154, local optimized production, 1440x900, Mobile/night/cockpit held at 30 m, Jolt LIVE. Each case warmed 10 seconds and sampled 20 seconds; no simultaneous browser benchmark.

| A/B/A | First full-resolution FPS | Reduced-resolution FPS | Repeat full-resolution FPS | Reduced p5 FPS |
|---|---:|---:|---:|---:|
| DPR 1 / 0.9 / 1 | 27.53 | 30.72 | 27.51 | 28.54 |
| DPR 1 / 0.85 / 1 | 27.10 | 32.37 | 27.58 | 30.01 |

The 0.85 policy was selected for more headroom. Actual buffer becomes 1224x765 (27.75% fewer pixels). Independent pixel review finds the main radio title, EQ and controls usable, with softer scene edges and weaker tiny VFD sublabels. This is a sharpness/performance tradeoff, not identical output or a physical-phone result. [Full resolution](resolution-profile-085/1440x900-1-1.png) / [85%](resolution-profile-085/1440x900-2-0.85.png).

### Final moving production measurements

Night, Jolt LIVE, 60 seconds per camera, one Edge GPU browser at a time. Each measured camera starts at local distance 0; camera samples are retained to detect automatic-cut contamination. CSS size, actual buffer and heap are in each JSON. Timings are not physical Android results and JS heap is not GPU memory.

| Quality / viewport | Actual buffer | Chase FPS | Cockpit FPS | Cockpit p5 FPS | Cockpit p95 ms |
|---|---|---:|---:|---:|---:|
| Mobile / 1440x900 | 1224x765 | 50.85 | 34.18 | 30.50 | 50.0 |
| Mobile / 390x844 emulation | 390x844 | 59.94 | 60.02 | 60.01 | 16.8 |
| Mobile / 844x390 emulation | 844x390 | 60.02 | 60.00 | 60.02 | 16.8 |
| Desktop / 1440x900 | 1440x900 | 29.79 | 19.59 | 18.39 | 83.4 |

The default Mobile-quality desktop target passes on this machine: both the mean and cockpit p5 exceed 30 FPS. This is not a guarantee that every frame or every device stays above 30. Chase reaches the covered endpoint at the end of its sample; all recorded camera samples remain chase. Cockpit samples all remain driver. Prior Pass 5 full-resolution production cockpit was 28.97 FPS; route-phase differences prevent attributing the entire cross-run difference to one change. Controlled A/B/A above isolates the resolution effect.

**Desktop quality still FAILS the 30 FPS target** on Intel UHD 630: 29.79 chase, 19.59 cockpit. Baseline Desktop quality was 29.61/16.03; the mirror changes improve cockpit timing but do not make this setting suitable for a 30 FPS promise. Desktop retains the richer two-light/shadow/clearcoat treatment. Default Mobile quality is the measured option above 30 on this machine. Phone-emulation windows use DPR 3, renderer 1; desktop window DPR 1. Ending cockpit JS heaps were 58.5 / 33.7 / 36.6 / 42.1 MB in table order; these are snapshots, not a leak test.

## External blockers

- Leaked Supabase credential retirement remains unconfirmed. Luis owns deployment after retirement; no deployment was performed.
- Real Stripe TEST plot #7 flow is blocked: no verified isolated Supabase project, Stripe TEST credentials or test webhook destination. Recent production storefront checkout work does not prove isolation. PGlite and locally signed event fixtures are not external end-to-end evidence.
- Physical Android, Chromecast, AirPlay and TV tests remain **BLOCKED — PHYSICAL DEVICE REQUIRED**. Phone viewports in this report are desktop emulation.

## Participants and ledger

Actual participants are Codex lead `/root`, `/root/performance` (materials/rendering and independent review), `/root/ux_music` (loop lifecycle and test harness), and `/root/qa_security` (shared auth and isolated-environment audit). They used the inherited session model; an exact runtime model identifier was not exposed. The user's Pass 6 “Astra” label is not evidence that a separate Astra model participated.

| Owner | Files / responsibility | Status | Evidence | Blockers |
|---|---|---|---|---|
| Lead | Browser profiling, integration, final documentation | Implemented and locally verified | Production build; 62 unit/route tests; 62 browser checks; 5 auth smoke checks | Desktop-quality FPS, external security/payment/device gates |
| Rendering specialist | ConvertibleCar; RENDERING.md | Implemented; independent pixel and metric review | Matched PNGs; A/B/A; pure-camera 60s results | Desktop-quality target fails; physical devices |
| UX/music specialist | MiamiStreet, DriveController, scoped CSS; loop harness; LOOP.md | Implemented; runtime verified | 62 browser checks and extracted recording frames | True wrapping remains planned |
| Security specialist | Shared/Avenue auth, middleware, necessary callers, tests; SECURITY.md | Implemented; targeted tests passed | 26/26 tests | Real isolated Stripe environment; key retirement |

True wrapping-street scope is documented in [LOOP.md](LOOP.md); auth behavior and migration limits in [SECURITY.md](SECURITY.md); material mapping in [RENDERING.md](RENDERING.md).

### Rejected timing sample

The first final Desktop-quality cockpit run was invalid: the pending loop cut switched to chase, leaving only 7 driver samples and 1,767 chase samples. Its apparent 29.54 FPS is **not cockpit performance**. The artifact is retained in night-after-desktop-quality-invalid. The harness now waits for the cover to clear, pauses before selecting the requested camera, and rejects any mixed-camera timing. Mobile runs had pure requested-camera samples and remain valid.

## Matched material evidence

Sunset, convertible at distance 40, same camera/quality/viewport. Music, pedestrians and traffic are dynamic, so these are controlled settings rather than identical pixels.

| View / quality | Before | After |
|---|---|---|
| Desktop chase / Mobile | [PNG](before/local-desktop-chase.png) | [PNG](after/local-desktop-chase.png) |
| Desktop cockpit / Mobile | [PNG](before/local-desktop-driver.png) | [PNG](after/local-desktop-driver.png) |
| Portrait cockpit / Mobile | [PNG](before/local-portrait-driver.png) | [PNG](after/local-portrait-driver.png) |
| Landscape cockpit / Mobile | [PNG](before/local-landscape-driver.png) | [PNG](after/local-landscape-driver.png) |
| Desktop chase / Desktop | [PNG](before-desktop-quality/local-desktop-chase.png) | [PNG](after-desktop-quality/local-desktop-chase.png) |
| Desktop cockpit / Desktop | [PNG](before-desktop-quality/local-desktop-driver.png) | [PNG](after-desktop-quality/local-desktop-driver.png) |

Independent review: subtle and mixed. The rear deck shifts from pale cream to a darker plum reflection; the hood gains stronger highlights but loses some bright cream appearance. Primary radio text, controls and framing remain intact. The unchanged simple vehicle geometry limits the improvement; this is not a dramatic quality leap or a photorealism claim. Each capture folder also contains short WebM recordings and state JSON.

## Final transition and renderer regression

**62/62 browser checks passed**, no page errors, in the real isolated Next production build. All six normal-motion cameras, chase/cockpit reduced motion, and simulated tab return reset only under opaque cover, render the new camera before reveal, resume driving and retain radio playback. The reduced-motion camera remains selected. [Results](loop/results.json), [recording](loop/loop-check.webm), [extracted frames](loop/transition-contact-sheet.png).

The lead inspected the extracted recording: chase fades to opaque, then the new cockpit shot appears without an exposed spatial sweep. The fade/cut remains visible by design. The recording includes deliberate test setup teleports between scenarios; these are outside automatic-loop assertion windows and outside the selected contact sheet. Tests force a near-end position; this is not a multi-lap soak or physical OS suspension test. Audible sound was not independently listened to.

Runtime checks confirm zero night mirror reflection passes, approximately one reflection per three main frames at sunset, two shadowless Desktop headlights, Desktop DPR capped at 1.25, large Mobile night DPR 0.85, and DPR 1 after resizing to a phone or returning to daytime. Material properties were read from the live scene.

True wrapping is planned, not implemented: rough planning cost **4-9 engineering days (28-64 focused hours)**, with a prototype and re-estimation checkpoint before integration. This is an uncertain effort estimate, not measured work or a price quote; see LOOP.md. No new assets or services are assumed.

## Reproduction

Use the existing isolated-build runner for build/start on 3041; it overrides service settings and prevents server production writes. The browser scripts intercept mutations and analytics. Run one GPU browser at a time.

- `node --import tsx --test --test-concurrency=1 "tests/**/*.test.ts"`
- `node scripts/cruise-pass5-isolated-build.mjs build 3041` then `node scripts/cruise-pass5-isolated-build.mjs start 3041` (separate terminal).
- `node scripts/cruise-pass6-auth-check.mjs`
- `node scripts/cruise-pass6-compare.mjs --phase night-after-mobile --views desktop,portrait,landscape --perf --seconds 60 --station jolt --local-url http://127.0.0.1:3041/cruise/miami-test`.
- Add `--quality desktop` and a separate output phase for the heavier setting.
- `node scripts/cruise-pass6-loop-check.mjs`; `--review-only` regenerates the contact sheet from the existing recording.

Next: review the local visuals; retain the default-quality tradeoff if acceptable; investigate Desktop shadow/material cost separately if that quality setting must reach 30. Luis retires the key and verifies STUDIO_PASSWORD before any deployment. Establish isolated Supabase/Stripe TEST before plot #7 E2E. Avenue stays hidden.
