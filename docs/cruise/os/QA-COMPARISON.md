# Interface QA and comparison

October 15, 2026. Evidence is automated Windows Edge 155 at DPR 1. Old route 3077 is a production server; the first CruiseOS runs on 3080 use development mode. Repeated fresh contexts still share browser/server caches. The timing table below is descriptive, not a controlled speed comparison, usability study or proof of better retention.

## Actual task paths

Counts are explicit control activations from the resting drive; text entry and scrolling are additional actions. They do not measure ease of understanding.

| Task | Preserved experience | CruiseOS | Tradeoff |
| --- | --- | --- | --- |
| Open radio / tune listed station | Tune & discover → Tune (2) | Radio → Tune (2) | Same activation count; OS gives Radio a simpler named destination. |
| Save current station | Open radio → star (2) | Save station on deck (1) | New direct access. |
| Open saved stations / finds | Open radio → collection tab (2) | Glovebox → collection (2) | Same count; clearer separation from tuning is a design judgment. |
| Open settings | Cruise options (1) | Glovebox → Settings (2) | One additional activation to reduce permanent top-level destinations. |
| Choose camera | Camera → view (2) | Camera select → option (native select interaction) | One persistent select; OS must preserve manual choice. |
| Capture postcard | Capture postcard after 65 seconds (1) | Glovebox → Postcards → Capture (3) | Additional navigation; avoids a permanent independent overlay/trigger. |
| Pause / next station / mute | Persistent deck button (1) | Persistent deck button (1) | Both provide direct transport. |

## Automated durations

Milliseconds around awaited Playwright actions. Model/audio/network readiness is separate. One observation per cell; no statistical significance or human-task conclusion. Start timings include actionability/stability waits and therefore cannot be called playback latency.

| Action | Old desktop / portrait | OS desktop / portrait |
| --- | --- | --- |
| Start click | 531 / 4875 | 6451 / 487 |
| Open Radio | 155 / 113 | 131 / 86 |
| Favorite current listed station | 76 / 48 | 68 / 47 |
| Tune selection | 127 / 82 | 126 / 84 |
| Open Glovebox | Not applicable | 73 / 62 |
| Open Saved stations from Glovebox | Not applicable | 65 / 56 |
| Open Settings from Glovebox | Not applicable | 86 / 57 |

Sources: [baseline raw JSON](evidence/baseline/results.json), [extended raw JSON](evidence/extended/results.json). Baseline vehicle ready was11.19 seconds desktop and10.99 portrait after navigation. OS extended was15.31 and7.47 seconds respectively. Different build modes/loading conditions prevent attributing these differences to UI changes.

## Verified checks and preserved failures

Baseline: nine assertions per desktop/portrait pass; desktop then continues a 300-second observation with advancing NTS audio and 4.54 km traveled. This is neither full-loop nor FPS certification.

Extended OS: desktop 29 assertions and five other contexts 28 each pass: desktop 1280×720, portrait 390×844, landscape 844×390, tablet 820×1180, narrow 320×740, and reduced-motion desktop. Checks cover native-dialog exclusivity/Tab containment, radio search/tuning/favorites, collection transitions, Settings listening controls, Escape back/close behavior and focus restoration, mute/pause/volume, audio continuity, listening-only world removal, reload persistence and no autoplay. No page exceptions. Downloaded and visually inspected [actual postcard PNG](evidence/extended/actual-gameplay-postcard.png) contains the gameplay scene, station/car/place attribution and CruiseOS link. It contains no recorded radio audio.

The first [current run](evidence/current/results.json) failed two harness expectations because Escape from Settings intentionally returns to Glovebox before closing. Corrected extended assertions explicitly verify both steps. Initial Radio alignment was a real visual issue and was corrected before extended capture.

The extended narrow context passed fit/overflow tests but visual review found only 36 pixels of volume input. The later layout gives volume its own row. [Narrow-fixed](evidence/narrow-fixed/results.json) and [narrow-final](evidence/narrow-final/results.json) artifacts retain failed development runs with returning Start invitation or absent Pause after active edits/build reloads. Their successful layout checks do not establish final audio reliability. A stable production rerun is required before closing this issue.

Browser console includes station CORS-analysis failures while the fallback audio continues. Request logs identify NTS stream failures and aborted API/world/stream requests during teardown/reload. Some first-load 404 console entries have no matching captured response URL; their origin remains unidentified. Do not call the console clean.

## Frozen production rerun

[Final production results](evidence/final-production/results.json), server 3081: desktop 31/31 and narrow 320×74030/30 assertions pass with no page exceptions. The earlier development audio failures did not recur. Narrow volume input is 228.97px wide. Start and Just listen bottom edges are 433.47px / 431.97px, above the deck's 562px top. Actual entry, radio, Settings and final-drive screenshots were reviewed. This closes the observed narrow-layout and unstable-development-run followup for the tested production conditions.

| Production action | Desktop / narrow 320, milliseconds |
| --- | --- |
| Start click | 3778 / 2011 |
| Open Radio | 99 / 100 |
| Save station | 47 / 50 |
| Tune selection | 247 / 84 |
| Open Glovebox | 77 / 58 |
| Saved stations from Glovebox | 59 / 50 |
| Settings from Glovebox | 67 / 52 |

Production vehicle-ready time after navigation: 10.72 seconds desktop, 8.09 narrow. Even production-to-production timings use different running servers and cache conditions; no causal speed improvement is established.

Advertising modal safety is source-reviewed only: `JeepNight` passes `measurementsEnabled` only when `!radio && !landmark && !osOverlay && visible && view !== 'director'`; CruiseOS reports whether a panel is open. No actual advertiser exposure sample, paid campaign, occlusion fixture or human readability claim was generated by this QA.

## Explicit fixtures

[Fixture evidence](evidence/fixtures-final/fixtures.json) passes ten checks: synthetic song save and finds persistence; deliberate metadata 503 removes current-song saving and shows unavailable; standard-mapped synthetic gamepad held baseline is ignored, then fresh B presses return Settings→Glovebox→world; deliberately blocked Jolt stream offers Retry while Radio search remains usable; optional `?follow=1` selects The Carlyle, advances naturally about 12 m over 3 seconds and retains Jolt. Metadata screenshots explicitly contain `QA FIXTURE - NOT LIVE IDENTIFICATION`. No such title is claimed to have aired.

The fixture run's final arrival assertion failed because the harness passed odometer distance into `__miamiInspect`, which expects absolute route meters. [Corrected focused probe](evidence/follow-final/follow-probe.json) passes arrival/dismiss with raw geographic evidence: route 18861.65m before, setter 18981.5m, route 18982.47m after; the cue reads `You are here. Enjoy the view as you cruise past.` Old fixture outputs and the wrong-coordinate probe remain preserved. The script now uses `__miamiGeo.routeMeters` for route-coordinate calculations. This is a diagnostic arrival, not natural traversal of the full destination distance.

The fully corrected [fixture suite](evidence/fixtures-corrected/fixtures.json) subsequently passes 11/11 checks with no page exceptions, including its diagnostic arrival assertion. The complete earlier failed outputs remain unchanged. The corrected probe separately verifies dismissal.

Controller fixtures override `navigator.getGamepads` with a synthetic standard mapping. They establish limited menu-edge handling, not hardware discovery, complete controller-only operation, analog driving or physical gamepad compatibility. Follow the Frequency remains default-off and geographic; no personalized music choice or route change is inferred.

## Reproducing the harness

Run `node scripts/cruise-os-proof.mjs` from this worktree. `BASE_URL` selects the complete route URL; `PROOF_OUT` selects a new evidence directory. `--baseline` uses preserved 3077 controls. `--extended` adds landscape, tablet, 320 px and reduced-motion contexts. `PROOF_VIEWPORT` optionally selects comma-separated names such as `desktop,narrow`. `JOURNEY_SECONDS` adds0–300seconds of desktop observation. `--fixtures` runs explicitly synthetic metadata/controller/outage plus optional follow checks. `--follow-probe` records a focused diagnostic arrival. `--obstruction-only` samples old 3077 and `BASE_URL` in desktop/portrait. Use a fresh output directory to retain earlier failures. Browser launch may need the approved narrow script permission to create Playwright's temporary profile. Failed critical assertions exit1; no deployment occurs.

No representative users, physical phones, screen readers or physical controllers were tested. Reduced-motion emulation verifies that a configured browser can operate the same tasks; it does not establish every animation's safety or a vestibular-accessibility result. Source screenshots show a recognizable stylized Miami scene; photorealism and aesthetic preference remain subjective.
