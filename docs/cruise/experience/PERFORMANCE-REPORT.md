# Experience First performance evidence

**Current result:** final Canvas-controlled production run passed all nine functional checks and the sampled 30 FPS minimum: 49.59 average, 31.85 minimum, 43.66 p5, zero/170 below30, actual scene DPR0.92?1.00. These are approximately one-second averages, not every-frame latency guarantees. [Final evidence](evidence/final-controlled/results.json). Prior and failed runs remain below for provenance.

**Current result: the 180-second production run fails the proposed 30 FPS minimum in later route sections.** It averages 34.86 FPS, with a minimum of 17.69, p5 of 19.41, and 77 of 170 post-warmup samples below 30 FPS. Functional checks and earlier 90-second samples do not close this performance gap. An adaptive DPR change is being prepared for Auto quality; no improvement is verified yet.

## Baseline — authoritative Human Radio build

Measured October 15, 2026 against http://127.0.0.1:3074/cruise/human-radio at `6fbffd2`. Source and radio were unchanged. Competitor browsers were closed. Headless Edge 155.0.4283.45, Windows desktop, 1280×720, DPR 1, Auto/high, Countach cockpit, sunset. ANGLE Intel UHD 630/D3D11 (not the machine's separate NVIDIA GPU). Warm local Next development server; fresh browser context. No physical mobile claim.

The car actually traveled and the Jolt audio clock advanced through 90 seconds of capture. After excluding the first 10 one-second samples, 80 scene-FPS observations averaged 44.03, p5=36.47, minimum 26.33; 2 below 30 FPS. Maximum observed JS heap 238,348,066 bytes, not total RAM/VRAM. DOM ready at 163 ms and start control ready at 5.713 seconds are local warm-server measurements, not cold internet startup. No page exceptions or document overflow. [Raw results](evidence/baseline/results.json), [30s frame](evidence/baseline/drive-30s.png).

## Comparison method and acceptance

Use the same browser/hardware/resolution/DPR/quality where possible. Record differences in camera, workload, geography, cache and build type. Scene reports are one-second averaged rendered-frame counters, not GPU timer queries; minimum and p5 refer to those samples. Browser screenshots can perturb timing. Audio evidence is advancing HTMLMediaElement time/state, not a microphone/audible-quality assessment. Heap is a browser estimate. Do not compare unmeasured competitor performance or label desktop emulation as a phone.

Target 60 FPS on suitable hardware; preserve at least 30 FPS on declared lower-end profiles where feasible. A target is not a measured result. Any retained graphical change needs actual moving evidence and a separate visual review. Do not claim indefinite-world memory safety from a short corridor test.

Later phase results are appended only after their runs. The existing 19.6 km route and five anchors must remain; reducing the playable map is not an optimization accepted by this plan.

## Phase 1 warm desktop retest

Same Edge/Intel UHD 630/1280x720 / DPR 1 development setup, moving scene for 90 seconds. 51.71 average FPS, 39.39 minimum, 47.16 p5; zero of 80 post-warmup samples below 30 FPS. Peak observed JS heap 268,163,716 bytes (not GPU memory). Baseline 44.03 average is context, not a controlled causal speedup claim: compilation/cache and scene timing differ. All nine functional checks passed. Raw evidence: `evidence/phase1/results.json`. Cold failed run retained separately; no production or phone performance claim.

## Phase 2 desktop regression

Same moving 90-second method: 45.49 average FPS, 32.35 minimum, 36.01 p5; zero of 80 samples below 30 FPS. JS heap peak 276,037,554 bytes. All nine functional checks passed. Scene timing differs and render work increased in sightline; no speedup claim. Raw `evidence/phase2/results.json`.

## Host and limitations

Host query: Intel Core i7-8750H at 2.20 GHz, 12 logical processors, 16,964,153,344 bytes installed RAM (approximately 15.8 GiB). Renderer reports integrated Intel UHD 630 via ANGLE/D3D11. Headless Edge 155.0.4283.45. FPS is application scene-frame sampling, not a physical display measurement. No GPU-memory, power, thermal, end-to-end audio latency or cold mobile-network results. Concurrent unit/build/browser work should be excluded from controlled performance comparisons. The brief feedback-browser overlap in the retained production run is disclosed below; overlapping functional tests are not isolated FPS benchmarks.

## Longer production validation - performance gate failed

The [final-production artifact](evidence/final-production/results.json) records the local production validation route on port 3077, at 1280 x 720 and DPR 1, using Edge 155.0.4283.45 and Intel UHD 630 through ANGLE/D3D11. The lead identifies the server as the production build. The script's retained `mode` string still says "development server"; this is a stale exporter label, not an independently verified build-mode field.

The intended 180-second moving capture contains 170 post-warmup FPS samples. Average is 34.86 FPS, minimum 17.69 and p5 19.41; 77 samples fall below 30 FPS. Maximum observed JavaScript heap is 199,883,682 bytes. The final sampled Jolt audio time reaches approximately 184.43 seconds while the car continues moving. All nine functional checks pass, including station switching, audio continuity without 3D and Canvas removal. Browser console CORS/404 errors are retained separately from the empty page-exception list.

**This run does not sustain the proposed 30 FPS minimum over later route sections.** Its average cannot hide the below-target samples. The earlier 90-second passing samples cover a shorter interval and do not contradict this later failure. A smaller observed heap does not establish a rendering improvement or identify the bottleneck.

A separate feedback browser ran briefly at approximately 16:11:41-16:11:46 UTC. The lead estimates that overlap at roughly 62-68 seconds of the performance capture. The overlap means this is not a perfectly isolated run, but its short duration cannot explain the persistent drop across the last 90 seconds. No causal diagnosis or speedup claim is supported by that timing alone.

The lead is preparing an adaptive DPR response for Auto quality and will repeat the measurement. Until new evidence exists, the longer-route performance gate remains failed. Retain this artifact even if a later test improves.

## Intermediate adaptive production retest ? superseded

The isolated repeat used the final production build, Auto quality, the same desktop/browser and 1280 ? 720 CSS viewport. Browser device scale remained 1; actual scene DPR was measured between **0.92 and 1.00**. Postprocessing targets now follow DPR changes. Manual High stays manual; experience-only Low uses 0.75 DPR and skips glow. Original route settings remain unchanged.

Across 180 moving iterations (170 samples after warmup), average was **46.18 FPS**, p5 **41.69**, minimum **28.95**, and the final 60 samples averaged **47.89 FPS**. One sample was below 30, at wall second 60.82 before the resolution change; **the strict 30 FPS minimum is still not met**. Peak observed JS heap 184,044,797 bytes is not GPU memory. All nine functional assertions passed. [Raw adaptive evidence](evidence/final-adaptive/results.json).

Start was available 1.995 seconds after navigation and the vehicle was ready 1.558 seconds after Start on this local production server. These are local-browser load measurements, not a cold internet/mobile benchmark. Earlier production evidence remains intact. The observed improvement is a sequential comparison, not proof that DPR alone caused it: hardware state, route timing and load vary. No other browser test or build ran during this repeat.

The new resolution helper brings focused unit coverage to 49 passing tests. The final production build also passed; see evidence/build-final.log. Sustained 60 FPS, physical mobile performance and a complete-loop/45-minute soak remain unverified.

### Resolution ownership correction

A subsequent manual Low check failed: Canvas repeatedly reapplied its configured DPR, so component-only setDpr did not persist. The intermediate trace is retained and cannot establish a sustained resolution setting. Resolution is now owned by parent Canvas state, with AdaptiveScenery requesting updates through a stable callback; manual Low must hold 0.75 and High must return to 1 on this DPR-1 browser. The final controlled-state repeat is separate evidence. No performance claim is made for the overlapping development-build/manual-quality check.

## Final Canvas-controlled production gate ? passed on this desktop

The corrected parent-owned DPR run passed all nine functional checks and the measured 30 FPS minimum: **49.59 FPS average, 31.85 minimum, 43.66 p5, zero of 170 post-warmup samples below 30**. The final 60 samples averaged **53.19 FPS**. Actual scene DPR ranged **0.92?1.00**, with a 1280?720 CSS viewport and browser device scale1. Peak JS heap172,315,706bytes is not GPU memory. No other browser test/build overlapped the 180 moving iterations. [Raw evidence](evidence/final-controlled/results.json).

Manual Low held0.75, Manual High returnedto1, and actual lower-resolution PNG capture succeeded at960?860 including its caption area: [ten passing checks](evidence/final-low-sharing/results.json). That development/manual check overlapped compilation and is not an FPS benchmark.

All49 focused tests and the final production build passed. The failed unadapted run, intermediate adaptation trace and Low-reset failure remain preserved. This sequential improvement does not isolate DPR from every hardware/route/cache variable. It establishes a passing three-minute run on this desktop, not universal30FPS, sustained60FPS, physical mobile or a complete19.6km/45minute test.

Final local load timing: DOM ready325ms, Start available1.754s after navigation, first recorded vehicle-ready sample6.479s after Start. These timings do not prove a vehicle reveal within five seconds on every run.
