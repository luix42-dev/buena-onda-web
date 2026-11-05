# Sustained performance: bounded investigation

October 15, 2026. Read-only review of [unadapted final-production capture](../evidence/final-production/results.json), `MiamiWorld.tsx`, `MiamiStreetDetail.ts`, `CruiseGlow.tsx` and `MiamiCrowd.tsx`. No browser, profiler, application change or benchmark was launched by this reviewer. The lead is implementing and separately testing Auto-only DPR adaptation; this report does not claim that mitigation succeeds.

## What the capture establishes

Windows headless Edge 155, Intel UHD 630 through ANGLE/D3D11, 1280×720, recorded DPR 1. The lead identifies the server on 3077 as a production build; the raw script's generic `mode` string still says development server. Preserve that metadata discrepancy and use server/build evidence to establish build type.

The reported post-warmup average is **34.86 scene FPS**, minimum **17.69**, p5 **19.41**, with **77/170 samples below 30**. All recorded functional checks pass, including moving vehicle and advancing radio. The sustained graphics gate nevertheless fails. These are one-second scene counters, not individual frame-time percentiles or GPU timings. The nominal 180-iteration capture reaches 184.99 wall seconds because waits, inspection and screenshots add overhead.

Approximate means grouped by recorded wall time:

| Wall seconds | Scene FPS | Reported triangles | Draw calls | Geometry objects, start→end |
| --- | ---: | ---: | ---: | --- |
| 0–30 | 52.29 | 529k | 273 | 197→334 |
| 30–60 | 48.13 | 506k | 227 | 340→435 |
| 60–90 | 42.75 | 562k | 230 | 435→505 |
| 90–120 | 33.39 | 476k | 212 | 511→536 |
| 120–150 | 20.47 | 555k | 206 | 536→551 |
| 150–180 | 22.81 | 407k | 187 | 551→578 |

The first 90 wall seconds average 47.67 FPS; the next 90 average 25.47. A brief screenshot/readback around 62 seconds cannot, by itself, explain a persistent late slowdown. Falling triangle/draw-call counts do not establish a cheaper total frame: material coverage, overdraw, postprocessing, resident resources and CPU work also matter.

## Plausible explanations and limits

- **Fragment/postprocess cost:** `CruiseGlow` renders through a half-float target, an HDR gather/grade pass and FXAA. Its base gather samples multiple neighbors across the viewport even in cockpit mode. Window/material coverage, alpha-tested double-sided foliage and transparent lighting surfaces can change fragment work independently of triangle count. This makes a resolution experiment reasonable; no GPU timing proves this is the bottleneck.
- **Growing resource residency:** `MiamiWorld` retains cells once built until unmount. Across the complete capture, built cells grow 29→76, geometry objects 197→578 and textures 64→103, while active cells finish near their starting count (26→27). This is source-intended caching, not proof of a leak. GPU memory sizes, eviction, upload stalls and driver pressure were not measured.
- **CPU/allocation work:** world culling traverses cells each frame; pending builds are sorted and processed against a four-millisecond loop budget. One individual build may overshoot that budget. Street-detail selection allocates/filter/sorts nearby candidates each frame; a water color is also allocated per frame. Crowd animation is distance-bounded. These are optimization candidates, not measured causes. Pending geometry is usually zero in the late samples, weakening a claim that continuous baking alone explains the drop.
- **Hardware power/thermal effects:** a time-dependent fall on integrated graphics is compatible with reduced clocks or shared-system contention, but no clock, temperature, CPU utilization or GPU utilization data exists here. Do not call this thermal throttling. Likewise, JavaScript heap falls from about 167 MB to 147 MB, with a 200 MB peak; it does not show monotonic JS growth, nor does it measure GPU memory or exclude GC pauses.

## Cheapest next steps

1. **Test bounded Auto-only DPR adaptation with hysteresis.** Preserve manual quality choices, glow, full route and audio ownership. Lower resolution only after sustained poor samples and avoid rapid resize/recovery oscillation. At DPR 0.8, pixel count is 64% of DPR 1 at the same CSS size; total frame cost will not necessarily fall by that ratio. Verify physical radio readability and camera framing.
2. **Synchronize the postprocessing targets.** The pre-adaptation `CruiseGlow` sizing effect depends on CSS size and renderer identity, not current DPR. A Canvas DPR change at unchanged CSS dimensions can leave composer targets/texel uniforms stale. Update composer pixel ratio, target size and FXAA/gather texels when actual DPR changes; confirm actual drawing-buffer/target dimensions in the retest. Merely changing a React DPR prop is insufficient evidence.
3. **Reduce cheap CPU churn if profiling justifies it.** Cache the water color, reuse candidate storage, update spatial detail selection on distance/time thresholds and avoid sorting when no cells need building. Expect modest savings until measured; do not present these as a solution to a halved sustained rate.
4. **If the gate still fails, distinguish route cost from elapsed time.** Repeat the same heavy route section with fixed settings, and separately hold a stable scene. A short CPU trace plus available GPU timing/OS utilization can discriminate hypotheses. Future bounded cell eviction or distant animation/shadow budgets require resource-ownership tests; they should not shrink the playable Miami route or remove the successful scene indiscriminately.

Retest the full duration after builds and other browsers stop. Report actual DPR changes, resolution, quality, route/camera, audio continuity and late-window performance separately from the overall mean. Dynamic-resolution results need their own profile label; they are not fixed-DPR-1 benchmark improvements. Keep failed evidence. If the final sustained gate remains unmet, recommend continued development or a clearly described lower-resource profile rather than a general smooth-performance claim.

Follow-up source check: the lead has added `viewport.dpr` to the composer sizing effect, mounted `AdaptiveScenery` only in the experience mode and added `renderDpr` to scene telemetry. This addresses the identified synchronization/observability gap in source. A new sustained capture was not available to this reviewer when this report was written; no performance recovery is claimed.
