# Buena Onda Cruise ? implementation report

October 15, 2026. Worktree: `cruise-experience-20261015`. Branch: `feature/experience-first-20261015`, based on protected Human Radio commit `6fbffd2`. No deployment, purchases, paid recognition, or new subscriptions.

## 1. Existing work and preservation

The authoritative base was Human Radio on port 3074. Its station adapters, official metadata, My Finds, exports, ordered favorites, Surprise Me, source links, and persistent audio were reused. So were the geographic Miami world, 19.6 km loop, five Ocean Drive landmarks, vehicle assets and cabins, physical radio, cameras, traffic, map, and advertising contracts.

Original Cruise route files, previous worktrees, and the running 3074 build were preserved. Most shared changes require `experienceFirst`; the shared audio bug repair and stricter metadata validation also benefit existing modes. No framework, city, or audio engine was replaced.

## 2. Competitor findings

[Comparison matrix and ten ranked opportunities](COMPETITOR-RESEARCH.md). RoamVista showed the value of scene-first entry and real radio. Partyvia showed traffic and social presentation, plus entry friction and synthesized stations that differ from Cruise's identity. Roadarium and Hop sources informed bounded geometry, workers, LOD, and moving origins; their scale and performance were not reproduced here. NIGHTDRIVE and selected showcases reinforced coherent atmosphere.

No competitor code or assets were imported. The [GTA iOS assessment](research/GTA-IOS-ASSESSMENT.md) found native robustness patterns worth studying, but no practical browser integration or GTA asset rights.

## 3. What was implemented

| Phase | Reviewable result |
| --- | --- |
| Opening minute | New experience route; one Start action; optional ride/settings; model/map readiness guard; cockpit reveal with manual override and reduced-motion support; persistent radio; first minute free of Cruise ads |
| Miami stretch | Full route and five landmarks preserved; restrained Countach/Wrangler windshield correction; optional landmark inspection; validated 30?45 minute sunset, default 40 |
| Radio | Editorial search; deck station seek; optional last-station memory without autoplay; explicit shared-link precedence; correct experience links; strict metadata shape, source, provenance, and freshness validation |
| Sharing and measurement | Actual-frame PNG postcards with credits and scene/car/station links; real gameplay social image; optional local counters/report/export/deletion; ephemeral leased presence with a real 1 ? 2 ? 1 session test |
| Playtest package | [Three X hooks, authentic capture plan, invitation, measurement definitions, and backlog](LAUNCH-PLAN.md); voluntary feedback download/copy without automatic submission or storage |

QA found a genuine audio bug: retuning the current station armed a 12-second timeout that stopped healthy playback. The audio hook now recognizes verified existing playback without arming another timeout. The exact 14-second portrait retest passed. [Failure history](VALIDATION-NOTES.md).

The first sustained production run exposed sub-30 FPS rendering later in the route. The new route now adjusts scenery resolution in Auto quality, with manual overrides and synchronized postprocessing. After correcting Canvas ownership of DPR, the final sustained run passed the measured 30 FPS minimum; details follow.

## 4. Local previews

- [Production preview](http://127.0.0.1:3077/cruise/experience).
- [Development preview](http://127.0.0.1:3076/cruise/experience).
- [Original Human Radio](http://127.0.0.1:3074/cruise/human-radio).
- [Radio-only entry](http://127.0.0.1:3077/cruise/experience?listen=1), [local report](http://127.0.0.1:3077/cruise/experience/report), [feedback](http://127.0.0.1:3077/real-miami/experience/playtest-feedback.html).

These loopback URLs work on the host workstation, not the public internet. The postcard control appears after 65 driving seconds. Example sunset setting: `?sunsetMinutes=30`.

## 5. Evidence and tests

[Final moving scene](evidence/final-controlled/drive-180s.png), [before](evidence/baseline/drive-30s.png), [Ocean Drive after](evidence/phase2/drive-30s.png), [actual downloaded postcard](evidence/phase4/actual-gameplay-postcard.png), [two consenting QA sessions](evidence/presence/two-sessions.png). These are real captures, not generated graphics.

- **49 focused tests passed**: atmosphere 6, radio 27, postcards 4, metrics 10, presence lease 1, resolution 1. Full TypeScript and the final production build passed; [final build log](evidence/build-final.log), [unit output](evidence/unit-tests.log). Existing config, Browserslist, hooks, and image warnings remain. Build success is not a dependency security audit.
- [Phase 1](evidence/phase1/results.json) and [Phase 2](evidence/phase2/results.json): nine browser checks each, covering movement, audio, cockpit, switching stations, and listening after Canvas removal.
- [Radio](evidence/phase3/results.json): 12 checks, including real Jolt audio, search, presets, memory without autoplay, link precedence, fixture save/export/persistence, and metadata failure. Manufactured metadata is explicitly labeled **FIXTURE**, not live identification.
- [Postcards and diagnostics](evidence/phase4/results.json): eight checks. Nonblank 1280 ? 1040 PNG, scene-preserving copied link, default-off consent, 15/60-second counters, export, deletion, no taste identifiers, and no marketing hosts on fresh direct entry.
- [Presence](evidence/presence/results.json): five checks. Two independent connected browser sessions produced 1 ? 2 ? 1 counts with explicit opt-out and no persistent presence IDs. Abrupt network partition and BFCache recovery were not reproduced.
- [Viewport summary](evidence/mobile/validation-summary.json): portrait, landscape, tablet, reduced motion, manual camera, and delayed-map behavior across linked independent runs. Failed runs remain preserved. This is emulation, not physical-device validation. Volume targets meet 24 px minimum but miss the 44 px recommendation.
- [Feedback](evidence/phase5-feedback/results.json): ten browser checks for bounded exports, accessibility, responsive layouts, and no automatic storage or submission. Responses are QA fixtures, not actual audience feedback.

## 6. Performance and its limits

[Performance report](PERFORMANCE-REPORT.md). Windows, headless Edge 155, Intel UHD 630, i7-8750H, approximately 15.8 GiB RAM, 1280 ? 720, DPR 1 initially. Development averages were 44.03 FPS baseline, 51.71 in the warm opening pass, and 45.49 after framing changes. Those runs do not establish a causal speedup.

The 180-second production run averaged **34.86 FPS**, with **17.69 minimum**, **19.41 p5**, and **77 of 170 samples below 30**. Functional checks still passed. This fails the sustained rendering target. A five-second feedback-browser overlap around seconds 62?68 is documented; it cannot explain the later persistent slowdown. JS heap peak was approximately 200 MB, not GPU memory.

The intermediate adaptive trace and a failed manual Low check exposed Canvas resetting child DPR changes. Parent state now owns the value. The [final corrected production run](evidence/final-controlled/results.json) passed all nine functional checks and the measured rendering gate: **49.59 FPS average, 31.85 minimum, 43.66 p5, zero of 170 samples below 30**. The last 60 samples averaged **53.19 FPS**; actual scene DPR ranged **0.92?1.00**. Peak observed JS heap was 172 MB, not GPU memory. No other browser test/build overlapped this repeat.

[Manual quality and resized capture](evidence/final-low-sharing/results.json) passed ten checks: Low held 0.75, High returned to 1.00, and the actual PNG exported at 960?860 including attribution. The earlier failed and intermediate traces remain intact. This is a passing three-minute desktop result, not a controlled causal speedup or a guarantee for every device. FPS values are sampled approximately one-second averages, not a guarantee for every frame. The final sample was at 189.88 wall seconds and 2.66 km of the 19.64 km loop. No physical mobile, GPU-memory, thermal, cold internet, sustained 60 FPS, or complete-loop performance claim is made.

## 7. Radio and licensing findings

[Reliability findings](research/RADIO-RELIABILITY.md), [official station audit](../human-radio/STATIONS.md), [metadata sources](../human-radio/METADATA.md). Real Jolt playback was freshly verified; NTS selection and media continuity were observed. Technical reachability does not establish embedding permission.

Kiosk's audited HLS outage remains an external station link. The owned playlist's upstream and rights questions remain open. WDNA, Depa, FG, Sucker Free, and other candidates were not invented as playable integrations. Programs remain distinct from verified tracks. Live song coverage is still limited: a show-only broadcast cannot produce a verified song save. The saved-track UI was tested with a marked fixture, not a newly identified live song. No recognition token, trial, recording submission, or paid API was added.

Car CC BY attribution, ODbL map credit, and CC0 texture credit remain. Commercial station, metadata, asset, and trademark questions require appropriate review. No GTA files were imported. No payments, buyouts, or property transfers were activated.

## 8. Remaining launch work

The [ranked backlog](LAUNCH-PLAN.md) prioritizes station rights and physical mobile/background audio; cold/slow loading and context-loss recovery; 20?45 minute moving memory tests; an audience measurement/consent decision; real human comprehension tests; selective architecture; native sharing; and presence recovery. Multiplayer and commercial Claim Avenue expansion remain later work.

Current facades are stylized procedural interpretations, not a completed photorealistic reconstruction. Generated world regions are retained; three minutes cannot prove 45-minute stability. Radio-only mode removes 3D, but the route's vehicle preload still needs a network-budget review. Local counters cannot establish global visitors, unique-session conversion, or seven-day retention. The requested 15% save, 20% return, and 10-minute listening targets remain hypotheses.

Fresh direct-entry marketing suppression was tested. Previously loaded SPA scripts cannot reliably be unloaded by unmounting components. LocalStorage writes/deletions are not transactional across simultaneous tabs. Presence describes consenting, visible cruising browser sessions, including parked sessions; radio-only listeners are excluded. It does not measure people, all visitors, or multiplayer. Station descriptions still need human editorial sign-off. No actual audience study or promotional video has been completed.

## 9. Costs

[Cost scenarios and official pricing references](COSTS.md). No new paid plans were activated; new local subscriptions cost $0. Existing bills and quotas were not audited. Hypothetical new base plans start around $20/month for Vercel Pro or $45 combined with Supabase Pro, before usage, tax, and extra resources. These are planning scenarios, not a purchase or budget cap. Traffic arithmetic is separated from billing estimates.

## 10. Exact changes and recommendation

Implementation commits: `d9fc017` opening/research; `06ed869` Miami framing/dusk; `064c2bd` radio discovery; `d9d1eb2` postcards, diagnostics, presence, and audio fix. `3b076ce` contains Canvas-owned resolution, manual-quality regression evidence, and the passing sustained run. The final package commit contains feedback and documentation. [Exact file manifest](CHANGED-FILES.txt); source of truth: `git log 6fbffd2..HEAD` and `git diff --name-status 6fbffd2..HEAD` on this branch.

Recommendation: **continue private development and supervised playtests**. An authorized limited public playtest remains conditional on rights, physical mobile, sustained performance, cold loading, and operations/measurement decisions. This is not deployment authorization.


Independent final QA opened the final scene and resized postcard, confirmed visible/readable cabin and radio controls, verified both passing JSON reports, and recommended local playtesting. That review does not certify rights, physical phones, or full-loop stability.

To restart this local production preview from the worktree:

```powershell
$env:CRUISE_DIST_DIR = '.next-experience-final-build'
npm run build
npm run start -- --hostname 127.0.0.1 --port 3077
```

Use a free port if 3077 is already running. These commands build and serve locally; deployment is separate.
