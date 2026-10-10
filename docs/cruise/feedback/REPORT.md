# Founder feedback — bounded first pass

October 10, 2026; local work after `bbe52ee`, branch `experiment/cruise-miami-master`. No push, deployment, production writes, purchases or new dependencies. Key retirement remains unconfirmed. Avenue stays hidden; Original route and default catalog remain unchanged.

**KEEP IMPROVING.** The [first-pass boundary](FIRST-PASS-BOUNDARY.md) requires a hard stop for Luis to accept, reject or redirect this prototype before further implementation. Silence and passing tests are not approval.

Preview: http://127.0.0.1:3041/cruise/miami-test . Isolated dummy settings deliberately prevent owned R2 playback and service writes; select a verified external station.

## Founder verdict

| Question | Finding |
|---|---|
| Better looking than Original? | Not conclusively. Miami retains sunset/music strengths; cabin proportions and repeated hotel forms remain weaknesses. No fresh numeric scorecard is fabricated. |
| Original's scale restored? | No. Miami grows from 210 to 630 m, versus Original's 2,304 m and four districts. Speed remains 3.5 m/s; similar lap time does not mean equal map size. |
| Car convincing from every angle? | No. Shaped fenders, nose and rear lights improve the shell. Tall flat cabin sides, windshield and seats do not fit the lower sports body convincingly. |
| Director improved? | Preserved and functional. This pass does not change sequencing or claim comparative cinematography gains. |
| LA footage/camera matched? | Not implemented. `cli-1.mp4` located, not analyzed; later pass requires founder direction approval. |
| How many of twelve stations play? | Eight configured; seven external stations verified playing in Edge. Four new stations work. Owned Buena Onda unverified in isolation; remaining four candidates deferred. |
| Cast workflow corrected? | Primary Cast explains current-tab/screen mirroring without starting a receiver or pausing audio. Optional TV Remote Mode is explicit and separate. Physical TV/audio remains unverified. |
| Cockpit radio preserved? | Anchors, controls and framing retained; final pixels reviewed. Physical mobile touch untested. |
| Public-release blockers? | Key retirement, unfinished vehicle fit, world continuity, physical devices/casting, station permission limits and isolated Stripe environment. |

The three visitor-visible changes are a longer three-section road, a more shaped but imperfect car, and four new stations with clearer casting behavior. [Earlier Original comparison](../pass5/REPORT.md) includes actual three-viewport screenshots, recordings and a ten-dimension scorecard. It is historical Pass 5 evidence, not a fresh benchmark of this build. Original's restrained road composition and world recycling remain worth adapting; Miami's music analysis, dock and cockpit remain worth preserving.

## Visual evidence

| View | Before | Final prototype |
|---|---|---|
| Desktop sunset chase | [PNG](before/local-desktop-chase.png) | [PNG](final/local-desktop-chase.png) |
| Desktop cockpit | [PNG](before/local-desktop-driver.png) | [PNG](final/local-desktop-driver.png) |
| Landscape cockpit | Historical comparison above | [PNG](final/local-landscape-driver.png) |
| Portrait cockpit | Historical comparison above | [PNG](final/local-portrait-driver.png) |
| Recordings | [Desktop](before/local-desktop.webm) | [Desktop](final/local-desktop.webm), [landscape](final/local-landscape.webm), [portrait](final/local-portrait.webm) |

Six final-body views: [Chase](functional/car-chase.png), [Cockpit](functional/car-driver.png), [Side](functional/car-side.png), [Crane](functional/car-aerial.png), [Low](functional/car-low.png), [Hood](functional/car-hood.png). These predate palm partitioning only. Independent review found cabin/body fit unacceptable from Side/Crane. [Vehicle findings, counts and licensing](VEHICLE.md).

Route progression: [storefronts](functional/route-40.png), [promenade](functional/route-330.png), [hotels](functional/route-520.png), [near endpoint](functional/route-620.png). Nine actual route images independently reviewed; no visible road gap or lane-crossing geometry found in these frames. [Map scope](MAP-EXTENT.md). Initial `after/` captures precede the hood-triangle correction and are retained as intermediate evidence.

## Radio and casting

[Final functional JSON](functional/results.json): Jolt, NTS 1/2, Rinse France, The Lot Radio, Kiosk Radio and dublab reported playing without playback error. Jolt and all four new stations reported live spectrum. NTS 1/2 used the labeled groove fallback because capture was restricted. The harness retains two failed combined playback-plus-live-analysis assertions; these are analysis limitations, not playback failures. No independent human listening test is claimed.

Lot uses its cheapest advertised HLS rendition; Kiosk offers only 1080p video+audio, a bandwidth/decoding concern despite hidden video. HLS instances are destroyed on switch/unmount. Existing installed library only, no dependency installation. Public player URLs do not establish third-party commercial embedding, rebroadcast or sponsorship permission; those rights remain unconfirmed. [Sources and limitations](RADIO.md).

Mirroring guidance checked against [Chrome](https://support.google.com/chrome/answer/3228332?hl=en), [Android](https://support.google.com/chromecast/answer/6059461) and [Apple](https://support.apple.com/en-us/102661). A website cannot universally start native mirroring. [Cast UI](functional/mirror-instructions.png). Optional TV Remote Mode deliberately starts a separate receiver. Chromecast, AirPlay and TV-browser verification: **BLOCKED — PHYSICAL DEVICE REQUIRED**.

## Validation

Final isolated production build passed, including type/lint checks. Full sequential suite: **64/64 passed**, after final audio/car integration and before the last palm partitioning change; final build covers that later change. [Build](build.log), [tests](tests.log). Existing Next configuration warnings and deliberately blocked service reads remain.

The bounded rendering correction partitions swaying palms into 160 m batches with conservative motion bounds and shared materials. No causal FPS gain is claimed: other previews also closed before final measurements. Earlier `night/` results are confounded diagnostic data, not controlled A/B evidence. Final performance and soak findings follow below.

## Milestone ledger

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| `/root` lead | MiamiStreet, cast comment, QA scripts, docs | Implemented; integrated checks | Build, 64 tests, browser artifacts | Founder direction, physical casting |
| `/root/performance` | ConvertibleCar, vehicle report | Implemented; six views independently reviewed | GLB counts, hood diagnosis, pixels | Cabin/body fit fails |
| `/root/ux_music` | route.ts, DriveController, StreetEnvironment, map report | Implemented; nine route views independently reviewed | Dimensions and actual images | Original larger; real wrapping absent |
| `/root/qa_security` | stations/types, audio/context/radio, tests, radio report | Implemented; independent source/result audit | Seven playing, five live FFT, isolation | Rights, physical devices, isolated Stripe |

Actual IDs above used inherited session models. Exact runtime variants were not exposed; no Astra/Opus identity is invented.

Planned, not implemented: larger district architecture, new vehicle laboratory, LA camera, broader night art direction and four remaining stations. Implemented and bounded verification: prototype changes above. Independently reviewed: six vehicle views, nine route views, asset counts and final radio/security diff/results. None is physical-device verification.

## Hard stop

Stop after the local review commit. Luis accepts, rejects or redirects the car silhouette/cabin fit, world direction and radio/mirroring workflow before another implementation pass. Security retirement and explicit deployment authorization remain separate gates. Stripe plot #7 remains blocked until a verified non-production Supabase and Stripe TEST environment exists.

## Final fixed-camera night performance

Windows, Edge 154.0.4258.62, Intel UHD 630 / ANGLE D3D11, isolated production build. Mobile quality, night, Jolt playing with live FFT, 30 seconds per camera, camera stability checked. One automated GPU browser; Luis confirmed other Cruise previews closed. Other background workloads were not terminated or controlled. Phone dimensions are desktop emulation, not physical devices.

| CSS viewport | Window / renderer DPR | Actual buffer | Camera | Mean FPS | p5 one-second FPS | p95 frame ms | Ending JS heap MB |
|---|---|---|---|---:|---:|---:|---:|
| 1440x900 | 1 / 0.85 | 1224x765 | Chase | 50.25 | 47.23 | 33.4 | 53.9 |
| 1440x900 | 1 / 0.85 | 1224x765 | Cockpit | 32.57 | 29.04 | 50.0 | 57.2 |
| 844x390 | 3 / 1 | 844x390 | Chase | 60.02 | 60.02 | 16.8 | 70.3 |
| 844x390 | 3 / 1 | 844x390 | Cockpit | 59.72 | 58.05 | 16.8 | 67.6 |
| 390x844 | 3 / 1 | 390x844 | Chase | 60.02 | 60.02 | 16.8 | 56.4 |
| 390x844 | 3 / 1 | 390x844 | Cockpit | 46.76 | 31.95 | 49.9 | 51.3 |

**Not a complete sustained-minimum pass:** desktop cockpit's mean exceeds 30, but p5 is 29.04. Portrait also has uneven pacing despite its higher average. No page errors or camera changes in these runs. Desktop high quality was not re-benchmarked in this bounded pass; its historical failure is not claimed resolved. JS heap is not GPU memory. Detailed evidence: [desktop](night-final/local-desktop-night-perf.json), [landscape](night-final/local-landscape-night-perf.json), [portrait](night-final/local-portrait-night-perf.json).

Historical Pass 6 Mobile/night desktop means were 50.85/34.18, measured for 60 seconds. Different duration and other workload conditions prevent causal attribution of the difference. This first pass does not establish a performance improvement over Pass 6.

## Ten-minute continuous cruise

[Raw soak evidence](soak/results.json), actual duration **600.573 seconds**. Same Edge/Intel desktop GPU,1440x900 CSS,1224x765 buffer,Mobile quality/night,The Lot Radio with live analysis and Auto Director. No forced route-clock advancement: three natural630m resets occurred. Cover opacity at sampled reset frames was0.999756,0.999757 and1. No recorded playback-state interruption,page error or WebGL context loss. This verifies application state, not independently heard receiver audio.

The functional soak passed, but **the performance floor failed**:30-second mixed-camera window means ranged **29.58–46.97 FPS**. Per-window p95 frame time ranged33.4–66.7ms; worst single sampled frame116.7ms. Camera changes prevent treating these as fixed-view benchmarks.

WebGL geometries settled from261 to262 after warm-up; textures stayed131. JS heap ranged50.2–76.0MB,first65.1,last75.7,with repeated drops rather than monotonic growth. No unbounded resource growth observed in ten minutes; JS heap is not GPU memory and this does not rule out longer-term leaks. [30-second cockpit](soak/at-30s.png), [300-second chase](soak/at-300s.png), [600-second frame](soak/at-600s.png).

One sandbox launch failed before the browser test because Playwright could not create its temporary directory. The approved rerun above completed. No benchmark was attributed to the failed launch.

Final numeric evidence was independently checked by `/root/performance`: fixed-camera samples contain only the requested camera, and the completed soak has twenty30-second windows. The reviewer agrees that functional stability passes while the consistent30-FPS requirement does not. Final sunset captures at all three viewports passed with no page errors; lead pixel review confirms radio framing, with the car-fit limitation still visible.

## Endpoint and renderer regression

**62/62 checks passed**,no page errors in [results](loop/results.json). The harness places the car at629.8m before sampling all six camera modes,reduced motion and a simulated hidden tab. Real full-lap evidence comes separately from the soak. Radio remains playing; resets and camera changes stay under cover; the new shot renders before reveal. Desktop headlights remain two shadowless SpotLights,mirror updates every third frame and is off at night,DPR caps remain intact.

[Transition recording](loop/loop-check.webm), [extracted frames](loop/transition-contact-sheet.png). Lead inspected the extracted transition: old chase fades out,cover hides reset,new cockpit fades in. This is still a noticeable cinematic transition,not seamless spatial wrapping. The [previous wrapping scope/cost analysis](../pass6/LOOP.md) remains the next architectural step after direction approval. The initial sandbox launch was blocked before testing; the approved rerun completed.
