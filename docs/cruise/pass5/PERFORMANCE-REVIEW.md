# Pass 5 performance review

Owner: Agent B, `/root/performance`. Model: the runtime identifies this agent as Codex based on GPT-6; no exact model variant is exposed reliably. Do not attribute this work to another model.

## Status

Static review and exclusive-browser night measurements completed by Agent B. Security remains blocked: Luis has not completed rotation of the exposed credential. No deployment or production writes were performed. All browser mutation/analytics requests were intercepted; radio read/playback remained available.

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| Agent B | ConvertibleCar.tsx | Implemented Mobile spotlight fallback | Controlled A/B/A below; Desktop lights retained | Final production-build and physical-phone measurement |
| Agent B | StreetEnvironment.tsx, DriveController.tsx, CockpitRadio.tsx (read only) | Inspected | Pending five-file Pass 5 diff and current implementation | No speculative renderer rewrites |
| Agent B | This report | Implemented | Source findings and measurement plan below | No physical Android hardware |

## Findings ranked by likely value

1. **Measure the two new spotlights before accepting Mobile night lighting.** Pass 5 replaces the previous Mobile decal-only beam with two shadowless spotlights, each with 120 m reach and intensity 2200 at night. Shadowless does not mean free: lit surfaces still evaluate the added lights. The claim in the source that these are affordable on phones has no device evidence. Preserve the Desktop lights. If the measured Mobile night case falls below 30 FPS, keep the brighter/wider 12.5 by 30 m beam decal, lamp pools and glowing lenses while omitting real Mobile spotlights. Measure before/after in the same camera and location; do not hide all vehicle geometry to infer spotlight cost.
2. **Avoid reintroducing costly Mobile paint after the previous optimization.** The two traffic cars use MeshPhysicalMaterial clearcoat unconditionally. The main convertible already uses cheaper Mobile paint and wood. Traffic occupies fewer pixels, so the benefit is unproven; do not change this ahead of a larger measured bottleneck. Retain the reduction from four traffic cars to two.
3. **Preserve existing radio optimization.** The 1024 by 256 screen and 512 by 128 EQ textures already update at 24 Hz within 2 m and 2 Hz outside the cabin, without live mipmaps. Radio legibility and responsiveness are central to the product. Do not cut its update cadence speculatively.
4. **Desktop mirror is a second scene render every other frame.** Its target is only 384 by 112, but scene traversal, draw submission and lighting still occur. Mobile already uses a static reflection. Investigate mirror only if Desktop quality is the measured bottleneck; it cannot explain a Mobile-quality regression.
5. **Pending loop is a fade/reset, not a seamless spatial loop.** DriveController stops at 210 m; MiamiStreet fades then resets after 900 ms. Inspect a full transition recording before calling continuous cruising seamless. Manual A/D and W/S behavior also remains in DriveController despite the removed steering UI. These are product issues, not a reason to rewrite the renderer.

Traffic creates replacement paint/chrome/glass materials without explicit owned-material disposal. This is a bounded lifecycle concern to measure during repeated remounts/vehicle changes, not proof of an active memory leak or a first-priority FPS fix. JS heap cannot establish GPU memory usage.

## Reuse the existing measurement approach, repair its assumptions

`scripts/cruise-pass3-profile.mjs` and `scripts/cruise-pass3-measure.mjs` contain useful frame sampling and subtree bisection, but cannot be used unchanged as Pass 5 evidence:

- Both use old Start/time selectors. Pass 5 has the Start gate and `Time of day: …` accessible name.
- Both hardcode localhost port 3040 and write into Pass 3 evidence. Use the lead's actual Next server and a Pass 5 output directory.
- The measurement matrix is 1600 by 900 and landscape phone only. Required comparison is 1440 by 900, 844 by 390 and 390 by 844.
- The measured window DPR is not necessarily the renderer DPR. Mobile Canvas forces DPR 1 even if the browser context emulates DPR 3. Record both and the canvas drawing-buffer dimensions.
- `hardwareGL` matches Intel only. Preserve the actual renderer string; NVIDIA/AMD are not automatically software rendering.
- The script drops frame intervals at least 2000 ms. Retain them and count long stalls for honest sustained pacing. Backgrounded runs should be identified and invalidated explicitly, not silently filtered.
- FPS from `?metrics=1` is contaminated by expensive visibility raycasts. Keep performance and ad-exposure runs separate. `?profile=1` exposes scene and renderer without enabling those raycasts.
- Snapshot `gl.info.render.calls` can omit a separate mirror pass. The existing WebGL draw counter spans passes, but wraps hot methods; apply the same instrumentation to each comparison. Renderer resource counts are not bytes of GPU memory.
- Old bisection `--root 5,1` is an index path, not a stable semantic identity. Enumerate and confirm the target node first after hierarchy changes.

## Measurement plan

Use the real Next production build/start, one browser/GPU workload at a time. No simultaneous video encodes, screenshots or other rendering sessions during timed FPS windows. Record commit/worktree state, Next build mode, browser version, OS and renderer, viewport, context DPR, renderer DPR, drawing buffer, quality, camera, time, warmup and sample duration.

1. Capture original production and experimental production at equivalent sunset settings where available. Mark absent original features N/A. Keep these separate from the locally integrated Pass 5 candidate.
2. Warm the local candidate for at least 10 seconds after ready, select Mobile quality, and run night chase and cockpit for at least 60 seconds each at the three required viewports. Keep audio playing with the actual source labeled. Include one full lap/reset in the overall functional capture.
3. Report sustained mean FPS, 1-second-window p5/worst FPS, p95/p99/max frame interval, intervals above 50/100/2000 ms, draw calls, triangle and texture counts, and JS heap start/end/range. A single instantaneous FPS counter is insufficient.
4. At a fixed night camera/location, compare real spotlights enabled/disabled with unchanged decal/lamp pools. Light-count changes may recompile shaders: exclude warmup after each toggle. Restore lights and repeat A/B/A if the difference is close to noise.
5. If baseline is under 30 FPS and spotlight removal materially helps, implement the Mobile fallback and repeat the complete sustained run. Keep before/after screenshots to ensure the road remains convincingly lit.
6. Only then profile remaining cockpit subtrees or traffic shader cost. No speculative rewrite of audio, batching or shadows.

Physical Android FPS: **BLOCKED — PHYSICAL DEVICE REQUIRED**. Desktop phone emulation measures a smaller canvas on the desktop GPU; it does not demonstrate ordinary-phone performance.

## Original music capability and loop scope

Bounded source tracing confirms `app/(site)/cruise/CruiseClient.tsx` renders `LaunchExperience`. That component calls `useCruiseAudio()` without a MusicAudio instance and passes no `music` prop to `CruiseScene`. CruiseScene mounts MiamiChoreographyRuntime only when music exists; CruiseWorld's reactive-material installation returns when music is absent. The original public route therefore provides radio playback without wiring this environmental analysis path. MiamiStreet does construct MusicAudio, passes it into useCruiseAudio, and drives pulse updates. This is a verified source-level capability advantage for Miami Test, **not** visual proof of convincing synchronization and not grounds for a fabricated numeric visual score.

A genuinely seamless repeating street needs spatial continuity of road, buildings, traffic and camera state; swapping in periodic world tiles would exceed a targeted Pass 5 repair. Current `.8s` fade and `.9s` reset nominally hide the discontinuity. Record the transition and describe it as a fade/reset loop. A small timing adjustment is justified only if actual footage exposes the reset. With reduced-motion CSS the fade transition is removed, so inspect whether the resulting full-screen cut is acceptable rather than claiming smooth continuity.

## Verification ledger

- Planned: physical-phone checks and any further evidence-supported cockpit optimization. Local production-build night measurements are now complete below.
- Implemented: Mobile uses the existing brighter/wider beam decal and glowing lenses, without the two real spotlights. Desktop retains both spotlights. Source comments now describe the actual quality split.
- Independently verified: Agent B inspected before/decal-only output images and measured reversible light A/B/A before implementing the quality split. The lead owns integrated functional/visual regression. No production readiness is claimed.

## Measured night results (2026-10-10)

Hardware: Windows desktop, ANGLE Intel UHD Graphics 630 Direct3D11, headless Edge 154.0.4258.62. One browser workload at a time, no video recording during timed windows. Every sustained run sampled approximately 60 seconds per camera after a 3.5-second initial warmup (1.8 seconds after switching camera). Mobile emulation is **not** physical-phone testing. Browser context DPR was 1 desktop / 3 landscape; actual buffers are below. Local was Next development mode; production results are explicitly separate. JS heap is not GPU memory.

| Build / viewport | Camera | Mean FPS | p5 FPS (1-s windows) | p95 frame ms | Max frame ms | Actual buffer | Ending JS heap MB |
|---|---|---:|---:|---:|---:|---|---:|
| Original production, 1440x900 | Chase | 41.79 | 31.95 | 33.5 | 50.0 | 1440x900 | 50.7 |
| Original production, 1440x900 | Cockpit | 36.27 | 29.51 | 33.5 | 3115.5 | 1224x765 | 64.3 |
| Original production, 844x390 emulation | Chase | 59.99 | 60.01 | 16.8 | 50.0 | 844x390 | 46.6 |
| Original production, 844x390 emulation | Cockpit | 60.02 | 60.01 | 16.8 | 17.0 | 844x390 | 37.2 |
| Miami production, 1440x900 | Chase | 41.72 | 37.75 | 33.5 | 83.3 | 1440x900 | 43.1 |
| Miami production, 1440x900 | Cockpit | 30.44 | 28.07 | 50.0 | 66.7 | 1440x900 | 37.8 |
| Local Pass 5 before fallback, 1440x900 | Chase | 35.64 | 32.47 | 49.9 | 66.7 | 1440x900 | 115.9 |
| Local Pass 5 before fallback, 1440x900 | Cockpit | 23.02 | 21.64 | 66.8 | 133.3 | 1440x900 | 102.5 |
| Local Pass 5 before fallback, 844x390 emulation | Chase | 60.02 | 60.01 | 16.8 | 16.9 | 844x390 | 106.2 |
| Local Pass 5 before fallback, 844x390 emulation | Cockpit | 59.12 | 55.10 | 16.8 | 49.8 | 844x390 | 95.2 |
| Local Pass 5 after fallback, 1440x900 | Chase | 42.06 | 37.75 | 33.5 | 66.6 | 1440x900 | 106.4 |
| Local Pass 5 after fallback, 1440x900 | Cockpit | 28.06 | 26.14 | 66.6 | 83.3 | 1440x900 | 110.7 |

Raw evidence: `night-baseline/*-night-perf.json` and `night-live/live-desktop-night-perf.json`. The comparison script calculates statistics from all frame intervals, including long stalls, but only the light-profile script persists the individual intervals. Original quality adapts automatically and reduced desktop cockpit resolution to 85%; there is no equivalent user quality selector. Original also defaults to Island Trail rather than the convertible. Production Miami reached 210 m and stopped; its cockpit measurement is a stopped scene at route end, whereas local and original continue cruising. These confounds prohibit attributing all differences to code quality. Local analysis reported `groove` / capture restricted; production Miami reported `live` with energy changes, playing true, no audio error.

### Controlled light cost and resulting change

`scripts/cruise-pass5-light-profile.mjs --seconds 20` used local Next development, Mobile quality, night, driver camera held at 30 m, 1440x900/DPR1. Each case warmed for 10 seconds and measured 20 seconds. Only the two convertible SpotLights changed visibility; geometry, decal, camera and materials stayed otherwise identical.

| Case | Mean FPS | p5 FPS | p95 frame ms | Draw calls | Triangles |
|---|---:|---:|---:|---:|---:|
| A: Two spots on | 22.42 | 21.91 | 83.0 | 287 | 293,200 |
| B: Spots off, decal retained | 27.00 | 25.73 | 66.6 | 287 | 293,200 |
| A repeat: Two spots on | 22.50 | 21.30 | 83.2 | 287 | 293,200 |

The repeat brackets the result: removing the lights improved this static case about 20%, but **did not reach 30 FPS**. Texture count stayed 130. Full interval arrays, renderer details and heap samples: `night-profile/baseline-1440x900.json`.

Visual evidence was actually opened and inspected: [spots on](night-profile/baseline-1440x900-0-lights.png) versus [decal only](night-profile/baseline-1440x900-1-decal.png). The fallback keeps a warm road pool, luminous radio/signs/windows and ocean highlights, but nearby building facades and palms are noticeably darker. This is a measured performance tradeoff, not visually identical lighting. Desktop retains the richer surface illumination. No physical-device success is claimed.

### Integrated fallback regression

After the quality gate and lead's preview-authorization integration, `night-after/local-desktop-night-perf.json` repeats 60 seconds per camera at Mobile night, 1440x900/DPR1. Chase improved 35.64 to 42.06 mean FPS (+18%); cockpit improved 23.02 to 28.06 (+22%). Cockpit p5 improved 21.64 to 26.14, max frame interval reduced 133.3 to 83.3 ms. The cockpit **still fails the 30 FPS target in this local development test**. Local source remained groove fallback, radio playing, no playback error. Final landscape was not remeasured after this change; pre-change landscape already reached about 60 FPS on the desktop GPU, not a phone.

`git diff --check -- components/cruise/master/ConvertibleCar.tsx` and `node --check scripts/cruise-pass5-light-profile.mjs` passed. Integrated typecheck/tests and production-build measurements remain the lead's responsibility; no duplicate full suite was run during GPU timing.

### Final isolated production build: verified full-resolution measurements

The lead built and ran the integrated candidate locally at `127.0.0.1:3041` using a production build. Agent B independently read the resulting `night-production/*-night-perf.json` files. This is a local production-mode test, **not a deployment**. Same Intel UHD 630 / headless Edge 154.0.4258.62, Mobile quality, night, approximately 60 seconds per camera. Jolt played with `source=live`; actual drawing-buffer DPR was 1 in all three viewports. Browser context DPR was 1 desktop and 3 for phone emulation.

| Viewport / actual buffer | Camera | Mean FPS | p5 FPS | p95 frame ms | Max frame ms | Ending JS heap MB |
|---|---|---:|---:|---:|---:|---:|
| 1440x900 | Chase | 44.87 | 41.33 | 33.5 | 50.1 | 48.4 |
| 1440x900 | Cockpit | **28.97** | **27.55** | 50.2 | 83.4 | 53.4 |
| 390x844, portrait emulation | Chase | 59.99 | 60.01 | 16.8 | 33.3 | 58.9 |
| 390x844, portrait emulation | Cockpit | 59.75 | 58.05 | 16.8 | 116.6 | 45.8 |
| 844x390, landscape emulation | Chase | 60.02 | 60.02 | 16.8 | 17.1 | 53.6 |
| 844x390, landscape emulation | Cockpit | 59.60 | 57.08 | 16.8 | 33.5 | 37.5 |

**The 30 FPS cockpit target is still missed at desktop resolution**, even in the optimized production build. Phone-sized canvases approach 60 FPS on this desktop GPU; this establishes neither Android performance nor sustained physical-phone thermal behavior. Heap figures describe JavaScript memory only, not GPU memory or a proven long-duration leak trend.

The initial isolated-run setup failure was retained in `production-setup-failed` evidence. The isolated build had no owned playlist; its initial playback failure cleared playback intent. The harness needed to press the existing Play control after selecting Jolt, then require actual live analysis. This was a harness setup correction, not an application playback fix.

### Resolution experiment: planned, not run

A bounded Mobile-only DPR 0.9 alternative above one million CSS pixels was considered, preserving Desktop quality and phone-sized canvases. It could reduce shaded pixels by 19% without introducing an adaptive controller, but image sharpness and cockpit-radio readability would need direct comparison.

`scripts/cruise-pass5-resolution-profile.mjs` was prepared for production-local DPR 1 / 0.9 / 1 A/B/A with live Jolt, fixed cockpit position, 10-second warmup and 20-second samples. Browser launch failed on temporary-directory permissions; the subsequent approval request was aborted before a session started. **No resolution benchmark or associated screenshots were produced, and no application DPR change was made.** This remains a hypothesis, not a measured improvement. The lead ended this experiment rather than delaying delivery further.
