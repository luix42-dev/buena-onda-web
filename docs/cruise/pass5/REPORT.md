# Pass 5 comparative verdict

Date: 2026-10-10. Local work only. Original `/cruise` was not changed. No deployment, push, production write, purchase or dependency installation occurred.

**Final verdict: BLOCKED.** Luis confirmed that the leaked legacy service-role key rollover is not completed. The local Miami experience is substantially easier to use than the served Miami version, but it is not yet an unequivocal replacement for Original.

## Founder questions

1. **Which looks better?** Miami has the stronger sunset identity and more street activity. At matched daytime settings the visual lead disappears: Original has better road/material definition, more convincing vehicle proportions and a calmer coastal composition. Neither is photorealistic.
2. **Which feels better to use?** Local Pass 5 has the clearest radio and controls: one dock, a Start gate, automatic travel, no unsolicited store card covering the radio, and a working physical preset. The served Miami version still has the old obstructive interface and stops at the route endpoint. Local changes are not live.
3. **Is it a better music visualizer?** It has a real advantage, not merely more driving controls. Jolt live analysis varied from 0.037 to 0.196, drove actual banner geometry, and survived six camera changes. Original's served LaunchExperience does not connect its optional environmental audio-analysis system. However, local Buena Onda Radio and NTS used the honestly labeled synthetic groove fallback; not every stream/browser is synchronized. The served Miami R2 station did report live analysis. Audible output was not independently listened to.
4. **Three visitor-visible differences:** warmer sunset and a busier Deco street; a visible cockpit radio with one coherent control dock; an automatic ride that resumes after interactions instead of getting stuck. Original still wins on restrained composition and continuous-world architecture.
5. **What improved?** Portrait dock shrank to two rows (112 CSS pixels); portrait framing now brings both radio knobs into view; landscape head unit remains above the dock; store popups stay off the hidden public experience; manual steering was removed; restart/tab/detail recovery works; reduced-motion EQ is static and pulse responses are damped; unauthorized Avenue previews stay hidden. Mobile night rendering trades physical facade illumination for a measured performance gain while Desktop retains two real headlights.
6. **What prevents a definitive Cruise?** The leaked key, remaining shared Studio-auth weaknesses, lack of physical phone/casting evidence, incomplete Stripe TEST environment, synthetic fallback on some streams, a visible fade/reset rather than seamless geometry, oversized signage and simple vehicle materials. These are explicit limits, not completed work.

## Scorecard

Scores are comparative product judgments, not scientific metrics or user-study results. Static judgments were independently reviewed by `/root/qa_security`; the lead combines these with functional and performance evidence. Default first impressions compare Original DAY with Miami SUNSET. The additional matched DAY images remove that lighting advantage. Original sunset and manual quality selection are **N/A**. Vehicles are each route's default, not identical assets.

| Dimension | Original served | Miami served | Local Pass 5 | Evidence / limitation |
|---|---:|---:|---:|---|
| Visual appeal | 6 | 7 | 7 | Sunset identity favors Miami; matched DAY is 6/6, with clearer Original road/materials. |
| Miami atmosphere | 6 | 7 | 7 | Deco colors, ocean and population; matched DAY atmosphere is 6/6. |
| Music visualization | N/A | 7 | 7 | Original environmental analysis unwired; served R2 live, local Jolt live, other local streams groove. No all-browser sync claim. |
| Cockpit | 6 | 3 | 7 | Served store card blocks radio; local framing and actual preset click verified. |
| Driving illusion | 7 | 3 | 6 | Original wraps world modules; served Miami stops at 210 m; local automatically fades/resets. Original seam invisibility not proven by a complete-lap recording. |
| Vehicles | 6 | 5 | 5 | Original Jeep reads better; local retains two traffic cars but hero surfaces remain plain. |
| Environment | 6 | 7 | 7 | Miami adds life/detail; signs and tower wall dominate, nighttime Mobile facades darken. |
| Interface | 5 | 4 | 7 | Faint Original controls, fragmented served Miami controls, coherent local dock; emulated pointer checks, not physical touch testing. |
| Performance | 7 | 6 | 6 | Optimized local night cockpit 28.97 FPS at 1440x900; phone-sized emulation about 60 FPS. See non-equivalence caveats below. |
| Lean-back appeal | 6 | 5 | 7 | Local automatic recovery and unobstructed music framing help; physical TV/casting unverified, fade/reset remains. |

Retain Miami's music analysis, sunset option, cockpit, responsive dock and automatic controls. Adapt Original's coastal breathing room, material separation and world recycling in a later bounded iteration. Do not replace or modify the Original route based on this pass.

## Visual evidence

Each folder contains chase/cockpit PNGs, browser-state JSON and short WebM recordings at 390x844, 844x390 and 1440x900. Windows Edge on Intel UHD 630 was used; phone dimensions are desktop emulation, not phones. Window DPR is 3 for phone emulation and 1 for desktop; actual WebGL buffers are recorded independently.

| View | Original | Served Miami before | Local after |
|---|---|---|---|
| Portrait cockpit | [PNG](before/original-portrait-driver.png) | [PNG](before/live-portrait-driver.png) | [PNG](after/local-portrait-driver.png) |
| Landscape cockpit | [PNG](before/original-landscape-driver.png) | [PNG](before/live-landscape-driver.png) | [PNG](after/local-landscape-driver.png) |
| Desktop cockpit | [PNG](before/original-desktop-driver.png) | [PNG](before/live-desktop-driver.png) | [PNG](after/local-desktop-driver.png) |
| Portrait recording | [WebM](before/original-portrait.webm) | [WebM](before/live-portrait.webm) | [WebM](after/local-portrait.webm) |
| Landscape recording | [WebM](before/original-landscape.webm) | [WebM](before/live-landscape.webm) | [WebM](after/local-landscape.webm) |
| Desktop recording | [WebM](before/original-desktop.webm) | [WebM](before/live-desktop.webm) | [WebM](after/local-desktop.webm) |

Matched DAY: [portrait](matched-day/local-portrait-driver.png), [landscape](matched-day/local-landscape-driver.png), [desktop](matched-day/local-desktop-driver.png), compared against Original DAY above. Before/local images precede dock compaction, final portrait shift and Mobile lighting fallback, but already contain the initial resume integration.

Mobile night tradeoff at the same position: [two real lights](night-profile/baseline-1440x900-0-lights.png) versus [decal retained](night-profile/baseline-1440x900-1-decal.png). [Desktop night](functional/desktop-quality-night.png) retains physical illumination. The Mobile fallback is darker on nearby facades; it is not visually equivalent.

## Measured performance and functional evidence

Each sustained night run samples each camera for 60 seconds, Mobile quality where selectable. Hardware: Intel UHD 630 / ANGLE D3D11, Edge 154, Windows, 1440x900 CSS and buffer for local desktop. These are not physical Android numbers.

| Local development, night | Before fallback | After fallback |
|---|---:|---:|
| Chase mean FPS | 35.64 | 42.06 |
| Cockpit mean FPS | 23.02 | 28.06 |
| Cockpit p5 FPS, one-second windows | 21.64 | 26.14 |

Controlled stationary A/B/A at 30 m, 20-second samples after 10-second warmups: **22.42 lights on / 27.00 off / 22.50 on**. This supports a shader-light cost rather than a speculative optimization. Draw calls stayed 287 and triangles 293,200. Complete frame arrays are retained for this experiment.

Original production desktop chase/cockpit: 41.79/36.27 FPS. Served Miami: 41.72/30.44. These are **not equivalent benchmarks**: Original reduced its cockpit buffer to 1224x765; served Miami stopped at 210 m; local is a development build and uses groove for R2. Original's 3115.5 ms stall was retained. At 844x390 emulation, Original was about 60 FPS and local before fallback 59.12 FPS cockpit. JS heap measurements are in raw JSON and the [performance report](PERFORMANCE-REVIEW.md); they are not GPU memory or a leak test.

The isolated optimized build passed, followed by typecheck and **60/60 tests**. Existing config/lint warnings and deliberately blocked data reads remain in the build log. The first fully offline attempt failed on Studio's existing Google font dependency; the successful build allowed only Google Fonts HTTPS GETs, with dummy service settings and other outgoing connections blocked. No real `.env` file was changed.

Production-build Mobile/night/Jolt LIVE at full renderer DPR 1, 60 seconds per camera:

| CSS viewport / actual buffer | Chase FPS | Cockpit FPS | Cockpit p5 FPS | Cockpit p95 frame ms | Ending cockpit JS heap |
|---|---:|---:|---:|---:|---:|
| 1440x900 | 44.87 | 28.97 | 27.55 | 50.2 | 53.4 MB |
| 390x844 | 59.99 | 59.75 | 58.05 | 16.8 | 45.8 MB |
| 844x390 | 60.02 | 59.60 | 57.08 | 16.8 | 37.5 MB |

Phone windows reported DPR 3 but the Mobile renderer used DPR 1. These remain desktop GPU measurements. The desktop cockpit still misses 30 FPS at full resolution. An optional resolution experiment could not launch because its browser permission request was aborted. No resolution change or benefit is claimed; the verified full-resolution implementation is retained.

The first production benchmark setup failed before measurement: the deliberately unavailable owned playlist cleared playback intent, and choosing Jolt correctly preserved the paused state. The corrected harness used the real Play button. Failed setups are retained separately in `production-setup-failed/` and `production-audio-diagnostic/`; no FPS is attributed to them.

Final interaction evidence: **31/31** checks and no page errors in [functional/results.json](functional/results.json), with an [interaction recording](functional/interaction.webm). Both portrait and landscape physical presets were clicked using projected mouse coordinates, not handler invocation. This is not finger/device testing. Single observed production desktop load-to-ready times were 6.60 s Original and 8.57 s served Miami; these are not repeated controlled loading benchmarks, and local timings are not directly comparable to network delivery.

## Planned / implemented / independently verified

| Work | State | Evidence / blocker |
|---|---|---|
| Handoff integration, dock, start gate, automatic driving, two traffic cars, weapon-name mesh removal | Implemented; bounded checks verified | Existing Pass 5 preserved; actual Next browser and source review. Mesh-name scan is not exhaustive visual detection. |
| Radio framing and recovery | Implemented; independently inspected | Final PNGs and functional JSON; physical finger usability not tested. |
| Mobile lighting fallback | Implemented; measured and visually reviewed | A/B/A plus sustained before/after, Desktop count and screenshot. |
| Avenue preview restriction | Implemented; source review verified | Server cookie check exposes boolean only; anonymous browser stays hidden; shared auth weaknesses remain. |
| Reduced motion | Implemented; partial runtime verification | Static HTML EQ checked; pulse damping code reviewed; some decorative clocks still animate. |
| Truly seamless recycling | Planned | Current fade/reset is automatic, not geometrically seamless. |
| Legacy key retirement | BLOCKED | Luis: not completed. No deploy/publish/production writes. |
| Stripe TEST plot #7 | BLOCKED | No verified isolated non-production Supabase/Stripe setup. PGlite fulfillment tests are not real Checkout/webhook/moderation/ticker/buyout E2E. |
| Desktop Chrome to Chromecast | BLOCKED — PHYSICAL DEVICE REQUIRED | No receiver audio/video/control verification. |
| Android Chrome to Chromecast | BLOCKED — PHYSICAL DEVICE REQUIRED | No hardware available. |
| iPhone AirPlay mirroring with TV mode | BLOCKED — PHYSICAL DEVICE REQUIRED | Local TV Enter check does not verify AirPlay. |
| Smart-TV browser / Android FPS | BLOCKED — PHYSICAL DEVICE REQUIRED | Desktop emulation is not evidence of either. |

## Actual participants and scope

Lead `/root`; `/root/ux_music` covered C+D; `/root/performance` covered B; `/root/qa_security` covered E then independent A. These are Codex agents using the inherited session model. The exact runtime model identifier was not exposed; none is invented. Claude authored the inherited five-file handoff, but its exact model was not independently established. No founder/device tester participation beyond Luis's security/memory status replies is claimed.

All browser runs intercepted mutation requests and analytics. Drive-by code remains active in all phases, but this QA traffic was deliberately excluded from production audience data. Original route and shared authentication were not modified. Unrelated untracked work remains untouched. See [ledger](LEDGER.md), [QA/security](QA-SECURITY.md), [visual review](VISUAL-REVIEW.md) and [UX/music review](UX-MUSIC-REVIEW.md).
