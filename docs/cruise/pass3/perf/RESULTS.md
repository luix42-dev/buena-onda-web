# Pass 3 Gate 6 / Gate 5 measurements (Agent E)

Scripts: `scripts/cruise-pass3-measure.mjs` (`--mode perf|ads --only a..f`), `scripts/cruise-pass3-tv.mjs`. Raw data: `*-perf.json`, `*-ads.json.gz` (full sample dumps, gzipped), `tv-soak.json`. Screenshots: `*-perf.png`, `*-ads.png`, `tv-*.png`.

**Renderer (every run):** `ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)` — hardware GL, headless Edge 154.0.4258.62 with `--enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist`. Not SwiftShader. Windows 10 laptop, Next dev server (not a production build). Emulation only: **no physical Android or TV device was tested.**

## Method note: two passes per view
`?metrics=1` sign sampling (raycasts against every visible mesh) drops the page to about 0.8 FPS on this machine (a full drive takes about 27 min). So:
- **FPS/frame time** come from the `perf` pass (no `?metrics`; rAF deltas over the ~60 s drive, one rAF per frame, 1-s windows).
- **Ad exposure** comes from the `ads` pass. Because sim dt is clamped to 0.05 s per frame while the in-page "continuous" counter adds real dt (capped 0.4 s), the in-page seconds are inflated; exposure below is recomputed from the sample dump as continuous qualified distance / 3.5 m/s (sim seconds). FPS from the `ads` pass is not valid and is not used. This is a geometric proxy, not proof of human readability.

## Gate 6 performance (sunset, Mobile quality unless noted; JS heap is not GPU memory)
| Run | View | Viewport / DPR | Quality | Mean FPS | p5 FPS (1-s windows) | Worst 1-s | p95 frame ms | GL draws/frame | JS heap MB | Load-to-ready |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| a | Desktop chase | 1600x900 / 1 | mobile | 32.6 | 30.0 | 28.5 | 50.0 | 243 | 97 | 7.2 s |
| b | Desktop cockpit | 1600x900 / 1 | mobile | 23.7 | 19.7 | 17.7 | 66.8 | 234 | 100 | 11.1 s |
| c | Phone-land. chase (emulated) | 844x390 / 3 | mobile | 58.9 | 53.1 | 13.8 | 16.8 | 244 | 105 | 7.6 s |
| d | Phone-land. cockpit (emulated) | 844x390 / 3 | mobile | 58.8 | 53.1 | 21.6 | 16.8 | 233 | 112 | 7.1 s |
| e | Desktop cockpit | 1600x900 / 1 | **desktop** | 18.1 | 13.3 | 12.0 | 99.9 | 728 | 104 | 7.4 s |
| f | Desktop chase, **night** | 1600x900 / 1 | mobile | 29.7 | 16.5 | 16.2 | 66.8 | 241 | 94 | 11.2 s |

Triangles (from ads pass, in-page `gl.info`): about 314k per frame in all four views. Runs a-d: about 60 s of driving, 0 page exceptions. Console errors in all runs: the expected R2 CORS block for audio analysis and a 404 resource (both pre-existing, 127.0.0.1 origin). Phone-emulation caveat: it renders at DPR 1 of a small canvas on the desktop GPU, so it says nothing about a phone GPU; the 60 FPS cap is vsync, and its worst 1-s window (13.8) shows a stall.

**Comparison with CURRENT-BUILD.md (Edge, same iGPU, 1440x1000 recorded; different build/vehicle/default):** desktop chase 51.55 -> 32.6 and desktop cockpit 35.20 -> 23.7, both clear regressions (about -37% and -33%). Phone emulation 56.12/55.26 -> 58.9/58.8 (no regression). Caveats: viewport differs (1600x900 vs 1440x1000), the dev server and a busy laptop add noise, and the old figures were recording-time numbers. Cockpit Desktop quality (18.1 FPS, 728 draws) and night chase (p5 16.5) are the weakest cases. Draw calls (about 240) are unchanged between chase and cockpit, so the cockpit cost is likely fill/mirror/shadow-pass related; this was not profiled.

## Gate 6 ad exposure (sim seconds of continuous geometric qualification; target 5 s)
| Ad | a chase | b cockpit | c phone chase | d phone cockpit |
|---|---:|---:|---:|---:|
| billboard | **6.05 yes** | 1.35 no | 3.25 no | 0 no |
| buena | 4.65 no | 2.25 no | 2.65 no | 0 no |
| branches | **6.70 yes** | 3.95 no | 2.65 no | 0 no |
| plot-7..22 (lamp flags) | 0 (briefly pass geometry, never visible) | 0 | 0 | 0 |
| plot-23..30 (bench panels) | 0 | 0 | 0 | 0 |

Typical `blockedBy`: billboard — unnamed BufferGeometry (20 frames); buena — `plot-11` plane (123 frames), unnamed BufferGeometry, `plot-9`; branches — unnamed BufferGeometry (324), BoxGeometry (303), `plot-15` plane. Cockpit adds a CylinderGeometry and `ad-buena` plane blocker. Lamp/bench ads pass the geometric size test for only a handful of frames (e.g. plot-7 17 frames, plot-23 153 frames in run a) and then fail on-screen/occlusion, so none reaches continuity. Only chase on desktop meets 5 s (billboard, branches); Buena Onda sign misses (4.65 s). Cockpit and phone views miss for all primaries (phone cockpit essentially never qualifies).

### Billboard criterion analysis (run a, from `a-desktop-chase-sunset-mobile-ads.json.gz`)
An earlier ads attempt read 0 for the billboard because the page keeps only the last 600 samples; this script now captures every sample via a `window.__street` setter. With the full 1001 samples the billboard is `visible` in 122 frames over 1.75-22.9 m (6.05 sim s). Failures per criterion over 1001 frames: cos<=.35 in 766 (sign faces away after passing: angle 95-160 deg beyond ~40 m), width<130 px in 477 (far away), height<28 px in 96. Of 235 frames passing cos+width+height, 113 were not visible: 20 occluded (unnamed BufferGeometry), 93 not occluded, so they failed the on-screen test (a corner within 0.98 NDC or HUD overlap; sign width then is ~490 px of 1600, i.e. the sign is close and partly outside the frame at 23-39 m). Frame 0 (distance 0, paused) is also not visible. `maxWidthPx` values of 10^5-10^6 for buena/branches are points behind/near the camera plane projecting to huge sizes; they are not real sizes and are ignored. Reported as a measurement finding, not a fix.

## Gate 5 TV mode (`/cruise/miami-test?tv=1`, 1920x1080, emulation only)
- **Start gate:** visible ("Start the Cruise / Full screen · radio on · lean back"), but **NOT focused**: `document.activeElement` is the body wrapper, and pressing Enter alone does not start (gate still present). The button has `autoFocus` but is `disabled` until `ready`, so focus is lost at mount. A click starts it. Finding to fix: focus the gate when it becomes enabled.
- After click: gate removed, autopilot drives, only a "Radio" button remains in the UI (plus lockup/lower-third), screenshot `tv-driving-1080p.png`.
- **Auto-director:** cycled driver, side, aerial, low, hood, chase over the soak (cut about every 15-25 s).
- **Loop/restart:** 5 restarts observed (street end at 208-210 m back to ~10 m about every 63 s), `restart` event count 5, 71 samples over 6 min. The 900 ms fade was too short to catch with 5-s sampling (not observed directly; restart itself is confirmed).
- **Audio:** `playing` true in all 72 samples, station `buena-onda-radio` throughout, source `groove` (R2 CORS fallback, expected). Headless Edge with `--autoplay-policy=no-user-gesture-required` did start playback; this proves state flags only, not audible output.
- **Keys:** Enter toggles playback (true -> false -> true) after the gate; ChannelUp -> `jolt-radio`, ChannelDown -> back to `buena-onda-radio` (dispatched as synthetic KeyboardEvent on window since Playwright has no ChannelUp key). Audio playing afterwards.
- **Heap over 6 min:** 107 -> 90 MB, max 115, sawtooth GC pattern, slope -1.2 MB/min: no unbounded growth in this window (6 min is short).
- **FPS in TV soak:** not captured (TV mode hides the in-page FPS readout). No claim is made.
- **Page errors:** no `pageerror`s; console errors only the audio CORS / failed-resource set above (also R2 CORS on a second track).
- **4K:** one 3840x2160 screenshot taken (`tv-driving-4k.png`), no FPS claim.
- **Physical TV / Chromecast / AirPlay:** BLOCKED — PHYSICAL DEVICE REQUIRED.

## Addendum (lead, after this report)
- **TV start gate:** fixed in `MiamiStreet.tsx` (focus once ready). Re-checked headless at 1920x1080: the gate is focused, and Enter alone starts the cruise.
- **Billboard #1:**
  - A cockpit capture showed it leaving the frame through the **left edge** about 30 m out. It was also only 42 m from the start.
  - It was moved from s=34 to s=56, and the panel centre lowered from 7.4 to 4.6 m.
  - Re-measured with `--mode ads --only a,b --stop 75 --tag -bb56` (`*-ads-bb56.json.gz`): cockpit 1.35 → 2.7 s, chase 6.05 → 6.1 s.
  - Remaining interruptions: the cockpit chrome (merged `BufferGeometry`, the A-pillar) and lamp flag `plot-10` at s=43.
  - Phone and night views were not re-measured after the move.
- The measure script gained `--stop <m>` and `--tag <suffix>` for partial runs.
