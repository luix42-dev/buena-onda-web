# Phase 1 report — Recognizable, cinematic, living Miami

Lead: Opus 5.5 (`claude-opus-5-5`): visual direction, Director, look pass, landmark, crowd system, integration, measurement.
Delegated (these actually ran):
- **Sonnet** (`general-purpose`, model `sonnet`): CC0 NPC asset sourcing and optimization. Wrote only `public/real-miami/people/**` and `docs/cruise/npc/ASSETS.md`.
- **Sonnet** (`general-purpose`, model `sonnet`): live-cruisers presence hook, component and tests. Wrote only `components/real-miami/presence/**`, `tests/presence.test.ts` and `docs/cruise/presence/README.md`.

No Haiku agent ran. QA scripts and measurement were run by the lead.

## Verdict: **PARTIAL**

Built and measured with no regression against the handoff baseline. Not PASS because physical-mobile performance, the Beach City reference comparison, and several street-dressing gaps remain.

## Exit criteria

| Criterion | Result | Evidence / note |
|---|---|---|
| ≥3 recognizable landmarks, ideally 5 | **PASS (count)** | Colony, Breakwater, Clevelander, Carlyle (pre-existing) + The Leslie (new). Recognizability judged by the lead only; no independent human review yet |
| Look Bible; major gaps vs reference closed | **PARTIAL** | `LOOK-BIBLE.md`: G1–G3 closed (night palette, landmark wash, 5th landmark); G4–G11 open; Beach City screenshots not supplied |
| Corridor transitions into simplified scenery | **unchanged** | Existing chunk/LOD streaming untouched; not re-reviewed |
| 12–20 NPCs, 6+ vignettes, no sync, no pop-in <40 m, <2 ms | **PARTIAL** | 16 defined; 14 visible per time of day; 9 vignettes; randomized phase and time scale; hidden only beyond 110 m. Crowd JS 0.05–0.12 ms/frame. Parked desktop A/B with 6 animating: −1.0 FPS cockpit, −1.6 FPS chase (≈0.45 ms). **Mid-range physical phone not measured** |
| Director restored + ≥7 shot types, cuts on music, never loses car | **PASS (emulated)** | 9 types. Cut log shows `bar`-reason cuts on a live-FFT beat (0.62 s ≈ 97 BPM). Safety cuts are logged. Gallery for all 9 in 1280×720 and 390×844 |
| Radio, cars, garage, controls, ads, cockpit/roadside split intact | **PASS (tested subset)** | Handoff regressions on the new build: Cadillac portrait cue (all 8 checks true, incl. `strictWorldNotQualified`, `noWorldExposure`, `popupPreservesRadio`); expiry (5/5 checks true in both viewports). Driver/chase/radio camera code unchanged. Director disables ad measurement |
| FPS vs baseline at the same positions | **PASS** | Table below |
| Desktop + mobile-emulated in both modes | **PASS (emulation)** | Table below; stability run below |
| No critical regressions | **PASS (observed)** | No page errors in any run |

## Performance (headless Edge, D3D11; route 17.5 m; 20 × 1 s samples; DPR 1)

| View | Baseline 3066 (today) | Handoff baseline | New build 3067 |
|---|---|---|---|
| Desktop cockpit | 49.87 mean / 36.30 min | 47.80 / 31.86 | **51.07 / 37.57** |
| Desktop chase | 59.30 / 54.85 | 56.50 / 49.61 | **59.72 / 57.30** |
| Desktop Director | — | — | **57.39 / 46.69** |
| Portrait cockpit | 59.77 / 56.10 | 58.81 / 38.85 | **59.68 / 54.23** |
| Portrait chase | 60.02 / 59.93 | 59.92 / 59.02 | **60.02 / 60.01** |
| Portrait Director | — | — | **59.67 / 53.12** |

Cockpit is still under the 50–60 target on desktop, as it was before this work. Fixed-step screenshots are not FPS evidence; only the sampled runs are.

## 10-minute stability (portrait emulation)

390×844 `isMobile` emulation, headless Edge D3D11, one sample every 5 s. **Emulation only, not a physical phone**: the launch gate (10 min stable on a mobile device) is **not yet met**.

| Run | Samples | Mean FPS | <30 FPS samples | Heap start → end (max) | Radio playing throughout | Errors |
|---|---|---|---|---|---|---|
| Director, 10 min (`results-10min.json`) | 120 | 59.67 | 1 (startup, 10 s) | 102.9 → 148.4 (166.3) MB | yes | 0 |
| Cockpit, 10 min (`results-10min.json`) | 120 | 59.56 | 1 (startup, 7 s) | 134.7 → 167.5 (167.5) MB | yes | 0 |
| Director, 4 min, after instance-key change | 48 | 58.95 | 1 (startup) | 110 → 129.9 (182.7) MB | yes | 0 |
| **Director, 10 min, final build** (`results-director-10min-final.json`) | 120 | **59.39** | 1 (startup, first 5 s) | 126.9 → 152.4 (171.7) MB | yes | 0 |

The only sub-30 samples are in the first ~10 s while chunks stream in. The heap rises during the first minutes as world cells are built and retained (by design), then oscillates instead of climbing.

Director observations from these runs:
- 16 of 24 recent cuts were bar-locked and 2 were phrase-locked.
- Safety cuts produced a few sub-second shots. Fixed afterwards: a safety cut now goes to a car-locked shot, and the roof mount no longer fails the framing check (the car is beneath that lens by design).
- Landmark passes fire naturally: Carlyle, Clevelander and Breakwater in the first minute of a fresh drive (`$TEMP` trace reproduced in the session). Earlier "missing" passes were a diagnostics artifact: `snapshot()` only lists the last 24 cuts, so cumulative `totals` were added.

Final 10-minute Director run, cumulative (`totals`):
- **84 cuts, all 9 shot types used:** rear chase 21, side track 14, aerial 12, roof mount 12, reflection 9, low front 6, windshield 4, landmark pass 3, ocean side 3.
- **Cut reasons:** bar 20, phrase 6, bar-overdue beat 2, landmark ahead 3, held one beat after exit 5, line-of-sight safety 9 (11 %), time with no beat 39, car out of frame 0.
- **The 39 time-based cuts** happened when the live station gave no detectable kicks (talk, ambient, or analysis unavailable). The Director then cuts on time instead of a fake rhythm, by design. On beat-driven music the cuts lock to bars.
