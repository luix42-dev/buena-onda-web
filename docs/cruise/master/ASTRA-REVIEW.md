# Independent Astra review

Reviewer model: `gpt-6-astra`. Date: 2026-10-09. Scope: `/cruise/miami-test`, its implementation, actual screenshots, and browser evidence. The reviewer edited this document only; no paid calls or deployment.

**Verdict: PARTIAL. The local prototype is reviewable and playable, but overall acceptance is not approved.** Five-second advertising for both stores in both views fails the final measurements. Physical Android performance is untested. The two requested reference attachments were unavailable, so visual matching cannot be approved.

## Authoritative evidence and measured result

Use `review-final.json` and the `*-review.png` captures for the final ordinary-driving measurements. `measurements.json` supplies separate functional/audio evidence; `radio-video.json` supplies the later sustained-radio and Escape retest. Earlier `quick.json` and `visibility-final.json` are diagnostic runs; they predate the corrected exposure timer and must not be substituted for final durations.

The final test uses Edge 154.0.4258.62 on Intel UHD Graphics 630 through ANGLE/Direct3D11, sunset, Island Trail, mobile quality, renderer DPR 1, and the actual product default 3.5 m/s. Desktop viewport is 1440 x 1000. Mobile is 844 x 390 desktop Edge viewport/touch emulation with device DPR 3 and a DPR-1 canvas. Both desktop views were recorded; the mobile runs were not. Runs were sequential, with no second review browser launched.

| View / profile | Mean moving-window FPS | Mean window p95 frame time | Billboard exposure | Buena Onda exposure | Branches exposure |
|---|---:|---:|---:|---:|---:|
| Desktop chase, recorded | 51.55 | 40.30 ms | 5.730 s | **4.938 s** | 5.065 s |
| Desktop cockpit, recorded | 35.20 | 58.01 ms | 6.007 s | **4.648 s** | **4.574 s** |
| Landscape emulation, chase | 56.12 | 41.06 ms | **0.267 s** | **0.533 s** | **0.533 s** |
| Landscape emulation, cockpit | 55.26 | 35.32 ms | **0 s** | **0 s** | **0 s** |

Exposure is the longest sampled uninterrupted geometric qualification, not total time added across occlusion gaps. None of these durations establishes readability of the fine subtitle. Buena Onda does not qualify in either desktop view; Branches does not qualify in cockpit. Mobile results fail decisively. The final events correctly omit qualification events for these failures.

Each drive lasted approximately 62 seconds. Final sampled distances were 209.43, 202.11, 206.62, and 207.38 m respectively, so do not describe every run as a completed traversal. The scene builds approximately 220 m; the controller intentionally stops at 210 m. This is not 220 m of playable travel. The earlier functional run reached the 210 m stop.

Mean FPS is not a sustained floor. The lowest moving windows were approximately 38.10, 29.36, 17.42, and 25.59 FPS in the row order above. Screenshot/video capture adds overhead, and these are local development-server measurements. The reported p95 column averages window percentiles; it is not a pooled percentile. JS heap is not GPU memory. No physical Android, thermal, battery, or GPU-memory acceptance is established.

## What the actual captures verify

I inspected desktop chase and cockpit approach frames, final store captures, the landscape viewport and store captures, radio functional evidence, and the Classic Coupe cockpit. The rendered street is coherent: continuous road/curbs, receding Deco frontage, palms, shore, and a clear forward route. Buena Onda's teal frontage and repeated record bins differ from Branches' pink frontage and clothing displays. Their main labels identify the businesses at useful points in the desktop approach. The freestanding signs no longer visibly collide with facade lettering in the reviewed final frames.

The primary Island Trail cockpit frames a physical radio and forward road together. Its speed/RPM needles now respond to driving. The slightly more central eye position improves the left sign sightline but crops part of the steering wheel at the desktop left edge. In the mobile captures the radio is visually present, but small text and physical button targets are much less legible; the accessible Radio panel remains important.

I also inspected all six native extracted frames `frames/buena-chase-24s.png` through `buena-chase-29s.png`. They span five seconds of ordinary forward driving (HUD distance approximately 52-69 m), with the complete main “BUENA ONDA RECORD STORE” title legible in each sampled frame. This is positive desktop chase visual evidence: human recognition can begin before the stricter 130 px geometric threshold. It does not override the measured 4.938 s qualification, establish fine-print readability, or establish cockpit/mobile acceptance. The supplied gameplay videos are silent browser captures; radio operation is supported by the separate media evidence, not by an audible video track.

This is a stylized prototype, with sparse street life, repeated building modules, simple shop displays, flat-looking outdoor light, and approximate reflections. It is not evidence of a hyperrealistic finished Miami environment or a match to the missing reference images. The selectable Classic Coupe still has conspicuous faceted mirror artifacts and lower-edge radio clipping; loading successfully is not equivalent to visual-quality approval for that vehicle.

The later `night-cockpit-review.png` and `night-chase-review.png` were also inspected. Reduced environment light produces a recognizably darker night scene, with the radio display, instruments, sign titles, and road remaining visible. `desktop-shadows-review.png` confirms the higher-quality setting renders; its short paused sample is not a sustained performance test. These are paused visual checks, not a sustained night performance or exposure benchmark; the table above remains sunset-only at mobile quality.

## Functional and instrumentation review

- Keyboard steering, pause with zero reported speed, and Explore pausing the car pass the functional proof.
- NTS 1 playback is verified by actual media events, advancing `currentTime`, `readyState` 3, and `paused: false`, with continuation through a camera change while driving is paused. The later `radio-video.json` records playback still active at 55.40 seconds of media time while the car has driven to 185.44 m. Volume changes and physical preset operation are recorded. The local Buena Onda catalog still returns HTTP 500 and the UI reports unavailable; default catalog playback is not approved.
- The final landscape viewport and bounding boxes fit both road and steering controls without scrolling: canvas y=60.19 with height 258; arrows y=325.19 with height 49.19 in a 390 px viewport. No horizontal document overflow. Emulated touch moves lateral position from 2 to 1.462. This closes the earlier below-fold control defect at the emulation level.
- The modal blocks background resume. `review-final.json` honestly retains the original `escapeCloses: false`; the corrected global Escape handler is subsequently verified by `escapeAfterBackdropClick: true` in `radio-video.json`. The later focused retest closes this finding without rewriting earlier evidence.
- Source fixes inspected: moving cockpit no longer forces parked mode; decreasing distance resets exposure history; hidden ancestors are excluded; raycasts stop before the target sign face instead of hitting its backing; the first visible sample starts at zero; qualification is deduplicated per run across camera changes; HUD overlap, offscreen viewport regions, hidden documents, paused cruising, and an open dialog cannot qualify.
- The HUD now sits bottom-right, away from the left-side business signs. Earlier top-left overlap is corrected in actual captures and excluded geometrically in code.

These changes remove the identified false-counting mechanisms. The metric still samples at roughly quarter-second cadence and tests five inset points, so it is a conservative engineering proxy rather than pixel-exact occlusion or a human-reading test. It should never be represented as real sponsor impressions. The earlier 5.004-second cockpit figure was appropriately superseded rather than treated as a pass.

## Required next work

1. Redesign sign placement and framing for a robust five-second interval in both views, especially the smaller mobile canvas, while keeping actual buildings and cockpit pillars in occlusion checks. Preserve normal product driving in the retest; do not weaken thresholds to manufacture a pass.
2. Repair the catalog configuration and verify the default radio source if Buena Onda playback is required.
3. Complete physical Android testing with a named device/browser, sustained run, real touch interaction, and explicit quality/DPR. Desktop emulation cannot close that criterion.
4. Resolve or clearly retain the Classic Coupe visual limitations, and obtain the missing references before claiming visual match.

The independent review is complete for the final driving evidence. Its conclusion is a working local prototype with material unmet acceptance criteria, not approval to claim the complete requested result.
