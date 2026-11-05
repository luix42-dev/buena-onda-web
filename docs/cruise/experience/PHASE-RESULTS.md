# Experience First phase gates

**Current checkpoint:** all five phases have local implementations or playtest preparation. Final build,49 unit tests,9 sustained-drive checks,10 resized-sharing/quality checks,5 realtime-presence checks and10 feedback checks pass. The final desktop trace averages49.59FPS with31.85 sampled minimum. Earlier failures are retained as history. Public deployment and human/device/rights validation remain open.

Protected base `6fbffd2`, branch `feature/experience-first-20261015`. Original Human Radio on port 3074 remains authoritative and unchanged. New local development route uses port 3076. No deployment.

## Audit / research — complete

AGENTS, actual routes/components, recent history, existing radio and renderer inspected. [Competitor comparison](COMPETITOR-RESEARCH.md) was completed before application changes. Five required competitors plus focused technical references researched; two interactively entered. Source/claim/unknown distinctions and license boundaries retained. [Baseline](evidence/baseline/results.json): 90-second moving capture, actual audio advancement, no page errors, 44.03 average scene FPS on Intel UHD 630 at 1280×720 / DPR 1. See [performance report](PERFORMANCE-REPORT.md).

## Phase 1 — Beautiful Opening Minute

Passed the desktop gate. New optional `/cruise/experience` route reuses the Miami scene and persistent audio owner. Scene-first entry, one Start action, optional vehicle/settings, automatic cockpit reveal after 12 driving seconds, manual camera override, accessible radio deck and radio-only fallback. Advertising is held until 60 driving seconds. Movement waits for the vehicle model; audio starts from the user gesture. Original route defaults are preserved.

[Warm retest](evidence/phase1/results.json): all nine checks passed, vehicle ready after 1.71 seconds, Start ready in 2.145 seconds on a warm development server, no page exceptions or overflow. Average moving scene 51.71 FPS, minimum 39.39, p5 47.16, 80 samples after warmup. [Actual cockpit](evidence/phase1/drive-30s.png). An earlier cold development run exposed movement before the model loaded and a hidden-control test locator; both corrected. Failed evidence retained in `phase1-cold-failed`. Compilation-heavy first navigation is not a production load benchmark. Physical mobile and new-user comprehension remain untested.

## Phase 2 — One Unforgettable Stretch of Miami

Passed the scoped desktop regression gate. Reused five existing landmark models and full 19.6 km route; modest opt-in Countach/Wrangler windshield gaze correction, visible optional landmark inspection, validated 30-45-minute simulation-time sunset (default 40). Readiness guard also waits for map data while radio remains independent. No new city meshes or imported assets. See research/MIAMI-CORRIDOR.md.

Six atmosphere/camera unit tests passed. evidence/phase2/results.json: all nine browser checks passed, 45.49 average FPS, 32.35 minimum, 36.01 p5, zero of 80 samples below 30 FPS. This run did not reproduce Phase 1's 51.71 average; variable scene/warmth makes a causal performance gain unsupported. Phase 2 visual scope is composition, not a completed photorealistic rebuild; mobile/full-loop memory remain external validation gates.

## Phase 3 — Effortless Radio Discovery

Passed focused radio gate: searchable editorial directory, one-action deck seek, opt-in last-station memory without autoplay, explicit station-link precedence and experience sharing path. Existing favorites/manual order, Surprise Me, My Finds, source attribution, export and audio owner reused. Client metadata now validates shape, exact official source, provenance and fresh timestamps.

27 focused radio tests passed plus six prior atmosphere tests; full TypeScript check passed. evidence/phase3/results.json: all 12 browser assertions passed, including real Jolt audio, search, manual presets, remembered station without autoplay, explicit link override, marked fixture save/export/persistence and metadata-outage fallback with disabled song save. Manufactured fixture data is not live identification evidence. External stream and licensing blockers remain in research/RADIO-RELIABILITY.md.

## Phase 4 — Sharing, Presence and Simple Analytics

Postcard/local diagnostics gate passed: actual rendered 1280 x 1040 PNG with car/location/station, credits and scene/car/station link; preview/download/share/copy, no broadcast audio. Social preview uses an actual captured gameplay image. Local technical counters default off, omit taste/identity fields, retain 30 days, export/delete and report explicitly per-browser. No collector or audience dashboard claim.

All 48 focused tests passed (atmosphere 6, radio 27, postcards 4, metrics 10, lease 1). evidence/phase4/results.json: eight browser checks passed including nonblank actual PNG, scene-preserving copied link, consented 15/60-second counters, local export/deletion and no marketing hosts on fresh direct entry. Native mobile share-sheet delivery was not tested. The exact 14-second current-station retune failure was reproduced and fixed in shared audio; evidence/mobile-portrait-fixed passes. Realtime presence browser gate passed five checks: two genuinely connected, consenting QA browser sessions observed 2; explicit opt-out returned the count to 1, then hid it. No persistent presence IDs were written. Raw evidence: evidence/presence/results.json. Disconnected-transport expiry is unit-tested, not a reproduced network partition. The production build passed; this does not establish sustained rendering performance.

Leased presence uses existing infrastructure, isolated environment-specific channel, ephemeral browser-session IDs, 15-second heartbeat, 45-second lease and five-second expiry check, hidden on failure. Counts cover consenting active browser sessions, not people, multiplayer or total visitors. Source-reviewed and real two-context join/opt-out tested; counts are QA sessions, not audience traffic. Advertising contracts/renderers preserved and experience first minute remains clear. Cross-tab metrics are diagnostic estimates with non-atomic localStorage concurrency; BFCache presence recovery can require re-enable/remount.

## Phase 5 — Public Playtest and Launch Validation

The launch package is prepared after the functional gates. The [feedback-page QA](evidence/phase5-feedback/results.json) passed all 10 checks, covering required answers, bounds, explicit local export/clipboard actions, mobile viewport fit, no automatic storage/restoration, and no submission or external network requests. These are automated fixtures, not real participant responses. The production build passed. No deployment or real participant study has been performed.

**The longer production performance gate failed the proposed 30 FPS minimum in later route sections.** The [180-second production run](evidence/final-production/results.json) passed all nine functional checks but averaged 34.86 FPS, with a minimum of 17.69, p5 of 19.41, and 77 of 170 post-warmup samples below 30 FPS. Earlier 90-second samples do not establish sustained performance over this longer route.

A separate feedback browser briefly overlapped the earlier portion of the run, approximately 16:11:41-16:11:46 UTC. That limited overlap cannot explain the persistent decline in the last 90 seconds; no cause is established. The lead is adding an adaptive DPR response for Auto quality and will retest. No fix or speedup is claimed until a new result exists. The [performance report](PERFORMANCE-REPORT.md) retains the failing result and its limitations.

## Independent inspection of stable sharing evidence

The [stable Phase 4 browser run](evidence/phase4/results.json) passed eight checks. Its [QA diagnostics export](evidence/phase4/QA-local-diagnostics.json) records one measured start, both 15/60-second milestones, 69 observed experience/listening seconds and one postcard share/copy action. These are local QA counters, not audience data.

The [actual PNG](evidence/phase4/actual-gameplay-postcard.png) was opened and independently inspected: it shows the Countach cockpit, Ocean Drive scenery, readable Jolt/vehicle attribution, OpenStreetMap and asset credits, and the scene link. It uses the generic human-radio fallback rather than inventing a song title. Native mobile share-sheet delivery remains untested.

## Final validation checkpoint

Final build and49focused tests passed. The adaptive180second production retest passed allnine functional checks:46.18averageFPS,41.69p5,28.95minimum,one/170below30; sceneDPR0.92?1.00, last60sampleaverage47.89. This is improved observed behavior, not a strict30FPS-floor or60FPS claim. Final evidence: [results](evidence/final-adaptive/results.json). Original3074worktree remainscleanat6fbffd2. Phase5launchpackage and10feedbackchecks are complete as local preparation; no publicdeployment, actualhumanstudy or audienceconversionclaim. Rights, physicaldevices, coldloading, longsoak and audiencecollection remain open.

## Final accepted local checkpoint

The Canvas-owned quality correction passed manual Low/High and lower-resolution postcard validation (10/10), then an isolated production drive passed all nine functional assertions. Performance:49.59averageFPS,31.85minimum,43.66p5,zero/170samplesbelow30;last60average53.19,actualDPR0.92?1.00. [Final controlled trace](evidence/final-controlled/results.json). All49focused tests and final build pass. Earlier failed/intermediate traces are retained and superseded, not deleted.

All five phases have local implementations or launch preparation, with explicit external gaps. Ready for supervised private playtesting. Continue development before public promotion: permissions, physical mobile/background audio, cold networks, full-loop memory, human editorial review and audience measurement remain open. No deployment or real-person study was performed.
