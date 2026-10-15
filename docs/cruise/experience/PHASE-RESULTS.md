# Experience First phase gates

Protected base `6fbffd2`, branch `feature/experience-first-20261015`. Original Human Radio on3074 remains authoritative and unchanged. New local development route uses3076. No deployment.

## Audit / research — complete

AGENTS, actual routes/components, recent history, existing radio and renderer inspected. [Competitor comparison](COMPETITOR-RESEARCH.md) was completed before application changes. Five required competitors plus focused technical references researched; two interactively entered. Source/claim/unknown distinctions and license boundaries retained. [Baseline](evidence/baseline/results.json):90second moving capture, actual audio advancement, no page errors,44.03average sceneFPSon Intel UHD630 at1280×720/DPR1. See [performance report](PERFORMANCE-REPORT.md).

## Phase1 — Beautiful Opening Minute

Passed the desktop gate. New optional `/cruise/experience` route reuses the Miami scene and persistent audio owner. Scene-first entry, one Start action, optional vehicle/settings, automatic cockpit reveal after 12 driving seconds, manual camera override, accessible radio deck and radio-only fallback. Advertising is held until 60 driving seconds. Movement waits for the vehicle model; audio starts from the user gesture. Original route defaults are preserved.

[Warm retest](evidence/phase1/results.json): all nine checks passed, vehicle ready after 1.71 seconds, Start ready in 2.145 seconds on a warm development server, no page exceptions or overflow. Average moving scene 51.71 FPS, minimum 39.39, p5 47.16, 80 samples after warmup. [Actual cockpit](evidence/phase1/drive-30s.png). An earlier cold development run exposed movement before the model loaded and a hidden-control test locator; both corrected. Failed evidence retained in `phase1-cold-failed`. Compilation-heavy first navigation is not a production load benchmark. Physical mobile and new-user comprehension remain untested.

## Phase2 — One Unforgettable Stretch of Miami

Passed the scoped desktop regression gate. Reused five existing landmark models and full19.6km route; modest opt-in Countach/Wrangler windshield gaze correction, visible optional landmark inspection, validated30?45minute simulation-time sunset (default40). Readiness guard also waits for map data while radio remains independent. No new city meshes or imported assets. See research/MIAMI-CORRIDOR.md.

Six atmosphere/camera unit tests passed. evidence/phase2/results.json: all nine browser checks passed,45.49averageFPS,32.35minimum,36.01p5,zero of80 samples below30. This run did not reproduce Phase1's51.71average; variable scene/warmth makes a causal performance gain unsupported. Phase2 visual scope is composition, not a completed photorealistic rebuild; mobile/full-loop memory remain external validation gates.

## Phase3 — Effortless Radio Discovery

Passed focused radio gate: searchable editorial directory, one-action deck seek, opt-in last-station memory without autoplay, explicit station-link precedence and experience sharing path. Existing favorites/manual order, Surprise Me, My Finds, source attribution, export and audio owner reused. Client metadata now validates shape, exact official source, provenance and fresh timestamps.

27 focused radio tests passed plus six prior atmosphere tests; full TypeScript check passed. evidence/phase3/results.json: all12 browser assertions passed, including real Jolt audio, search, manual presets, remembered station without autoplay, explicit link override, marked fixture save/export/persistence and metadata-outage fallback with disabled song save. Manufactured fixture data is not live identification evidence. External stream and licensing blockers remain in research/RADIO-RELIABILITY.md.

## Phase4 — Sharing, Presence and Simple Analytics

Postcard/local diagnostics gate passed: actual rendered1280x1040 PNG with car/location/station, credits and scene/car/station link; preview/download/share/copy, no broadcast audio. Social preview uses an actual captured gameplay image. Local technical counters default off, omit taste/identity fields, retain30days, export/delete and report explicitly per-browser. No collector or audience dashboard claim.

All48 focused tests passed (atmosphere6, radio27, postcards4, metrics10, lease1). evidence/phase4/results.json: eight browser checks passed including nonblank actualPNG, scene-preserving copiedlink, consented15/60second counters, localexport/deletion and no marketing hosts on fresh direct entry. Native mobile share-sheet delivery was not tested. The exact14second current-station retune failure was reproduced and fixed in sharedaudio; evidence/mobile-portrait-fixed passes. Realtime presence browser gate passed five checks: two genuinely connected, consenting QA browser sessions observed2; explicit opt-out returned the count to1, then hid it. No persistent presence IDs were written. Raw evidence: evidence/presence/results.json. Disconnected-transport expiry is unit-tested, not a reproduced network partition. Fullbuild pending.

Leased presence uses existing infrastructure, isolated environment-specific channel, ephemeral browser-session IDs,15sheartbeat/45slease/5sexpirycheck, hidden on failure. Counts cover consenting active browser sessions, not people, multiplayer or total visitors. Source-reviewed and real two-context join/opt-out tested; counts are QA sessions, not audience traffic. Advertising contracts/renderers preserved and experience firstminute remains clear. Cross-tab metrics are diagnostic estimates with nonatomic localStorage concurrency; BFCache presence recovery can require re-enable/remount.

## Phase5 — Public Playtest and Launch Validation

Launch package in progress after Phase4 critical gates. No deployment or real participant study authorized/performed.
