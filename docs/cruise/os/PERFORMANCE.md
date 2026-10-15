# Cruise OS performance and readiness

October 15, 2026. Application commit `d725c89`; production build `xIOfRl6VF9vnd47j3jC9T`. The source was frozen during final measurements. No deployment.

## Conditions

Windows 10 Home 10.0.19045, Intel Core i7-8750H, 12 logical processors, 16,964,153,344 bytes RAM. Edge 155.0.4283.45 headless, ANGLE / Intel UHD Graphics 630 / Direct3D11. Viewport 1280x720, browser DPR 1, Auto quality, Countach, same starting route. Actual scene DPR adapts and is reported below. Original production server is 3077; OS production server is 3081.

One browser/context at a time; other QA browsers and builds had stopped. Each route used a fresh context on the same browser for the initial comparison. This does not erase filesystem, server or driver caches. Original ran before OS; order, thermal state, radio network and adaptive DPR are not controlled experimental variables. A separate OS repeat used a new browser and added a bounded Long Tasks observer. No physical mobile or GPU-memory measurement.

## Actual sustained moving-gameplay results

[Initial raw data and screenshots](evidence/performance/results.json); [focused repeat](evidence/performance-repeat/results.json). The scene moves throughout, after vehicle/route readiness. Ten initial samples are excluded. FPS values are the scene's one-second averages, not individual frame times.

| Measure | Original, 120 samples | OS, 120 samples | OS focused repeat, 90 samples |
|---|---:|---:|---:|
| Post-warmup samples | 110 | 110 | 80 |
| Average FPS | 47.14 | 48.82 | 47.50 |
| Minimum one-second average | 32.12 | 18.04 | 31.99 |
| Fifth percentile one-second average | 39.81 | 36.27 | 42.49 |
| Samples below 30 | 0 | 2 | 0 |
| Actual scene DPR range | 0.85-1.00 | 0.75-1.00 | 0.92-1.00 |
| Maximum observed JS heap, bytes | 172,628,794 | 189,655,973 | 178,111,067 |
| Distance during sampled drive | 1,823 m | 1,817 m | 1,523 m |
| Wall seconds from Start, including readiness | 128.29 | 127.98 | 99.74 |

Moving scene, playing radio, no page exceptions and no horizontal overflow passed in all three runs. The 19.64 km route was not fully traversed. JS heap is not total process or GPU memory. No 60 FPS guarantee is supported. The initial OS run did not meet a sustained 30 FPS floor; the passing repeat does not erase that failure or establish consistent compliance.

## Slow-window investigation

Initial OS samples 46/47 fell to 22.84/18.04 FPS near route meters 110/129. Draw calls were 224/226 and reported triangles approximately 537,514/539,602. Original samples near the same location reported the same counts and approximately 49 FPS: there is no observed draw-call or triangle explosion attributable to OS.

The OS heap dropped about 22 MB across the slow window. This is consistent with collection/allocation activity, not proof of a GC pause. Synchronous world-cell generation reported 52.6 ms; its timer covers the last completed cell rather than the entire frame or GPU upload. Adaptive DPR dropped from 0.92 to 0.75 after the first slow sample. Buffer resizing and world allocations are plausible contributors, but the first dip preceded resizing. No cause has been isolated.

The focused repeat did not reproduce the severe dip. It recorded five post-warmup main-thread Long Tasks, maximum 282 ms, including a later stall around 69 seconds. Long Tasks do not diagnose GPU waits or GC causality. The independent source/trace reviewer identified synchronous cell building, allocation pressure and DPR/composer buffer resizing as profiling candidates. No renderer changes were made based on this single association.

Do not call the higher initial OS average an optimization: it used lower adaptive DPR. A comparable average and passing repeat are useful evidence for local playtesting, not a statistically controlled superiority claim.

## Local loading observations

| Measure | Original initial run | OS initial run | OS repeat |
|---|---:|---:|---:|
| DOM ready, ms | 77 | 196 | 71 |
| Start action available after navigation, ms | 369 | 400 | 387 |
| Vehicle and route ready after Start, ms | 5,826 | 5,760 | 7,616 |

These are local-server observations in fresh contexts, not public cold-network/LCP or time-to-audible-music benchmarks. Development screenshots earlier showed a dark scene at five seconds; frozen production screenshots show the actual Miami scene once prepared. Audio is independent of vehicle loading. No quantified slow-connection or real-phone loading claim is made.

## Reproduction and decision

`node scripts/cruise-os-performance.mjs` records sequential old/new production runs. `PERF_SECONDS` accepts 60-180 samples; `PERF_VARIANT=os` selects the focused variant and `PERF_OUT` preserves separate evidence. Default `OS_URL` is local 3081. Only the repeat had Long Tasks instrumentation; the script later includes that instrumentation for future runs. Do not run this alongside other browser QA or builds.

**Recommendation: controlled local playtest; continue development before a broad public launch.** Core UI and playback tasks pass, and originals remain available for comparison. The intermittent slow window, actual mobile/assistive-input behavior, station permissions and representative-user preferences remain unresolved. Public deployment has not been authorized. Before claiming the performance floor, profile real frame timings through the slow route segment on supported hardware and repeat under defined resource conditions. See [PLAYTEST](PLAYTEST.md) and [RESULTS](RESULTS.md).
