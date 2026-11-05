# Pass 6 convertible rendering

Owner: `/root/performance` (Agent B). Runtime identifies Codex based on GPT-6; exact model variant is not exposed reliably.

## BUILT

Only `components/cruise/master/ConvertibleCar.tsx` is changed by this agent. Original Cruise code was read as a reference and remains untouched.

- Desktop cockpit mirror renders every third frame instead of every second frame, and does not render the scene at night. Night uses a dark blue static mirror instead of the bright sunset fallback. Mobile continues to use a static mirror.
- Original `HeroCar.tsx` paint treatment is adapted to the convertible's existing cream color: metalness 0.72, roughness 0.18; Desktop clearcoat 1 with roughness 0.065. Mobile retains MeshStandardMaterial to avoid reintroducing the previously measured clearcoat cost.
- Paint environment intensity follows Original Cruise's quality/time values: Desktop 1.58, Mobile 1.2, plus 0.38 at night. Exterior metal adopts metalness 0.94, roughness 0.28, environment intensity 1.25. These are material properties, not extra lights or render passes.
- Paint and exterior metal receive descriptive material names for browser inspection. Windshield transparency and cockpit radio, leather and wood geometry remain unchanged.
- Desktop headlights already explicitly use `castShadow={false}`. The existing Mobile decal fallback and quality gate are retained.

## VERIFIED

Source comparison: Original `components/cruise/vehicle/HeroCar.tsx` defines the paint/metal values and paint environment intensity described above. `StreetSky.tsx` supplies the scene environment map, so these material environment settings have an existing input.

## FAILED / BLOCKERS

The prior Mobile 1440x900 production cockpit result was 28.97 FPS. Its mirror was already inactive and its headlights already decal-only. The mirror reduction therefore **cannot be claimed as a fix for that measured Mobile bottleneck**. The final Mobile-quality resolution policy passes 30 FPS in this hardware run, while final Desktop-quality cockpit remains **FAILED at 19.59 FPS**. New paint settings alone do not establish an FPS gain. Matched image review and both final quality measurements are recorded below.

Physical Android and casting: **BLOCKED — PHYSICAL DEVICE REQUIRED**. No deployment, dependency installation or production write was performed.

## NEXT ACTION

Retain Mobile as the performance default; do not describe the optional Desktop quality as meeting the 30 FPS target on this Intel UHD 630. Complete physical-device checks when hardware is available. Any further Desktop optimization should address a measured bottleneck rather than weaken radio visibility or add an adaptive-renderer subsystem speculatively.

| Owner | Files | Status | Evidence | Blockers |
|---|---|---|---|---|
| Agent B | ConvertibleCar.tsx | Implemented; matched pixels reviewed | Source reference and linked before/after screenshots | Visual change is subtle/mixed, not clear overall superiority |
| Lead; Agent B independently reviewed | Matched image and production timing artifacts | Verified within stated hardware/method | Final Mobile and Desktop tables below | Desktop quality fails 30 FPS; physical devices unavailable |

## Independent resolution review

Agent B opened the actual production-local cockpit PNGs at DPR 1, 0.9 and 0.85. At 0.85 the scene and small VFD lettering soften visibly; this is not identical image quality. The primary `JOLT RADIO` title remains readable, the EQ/presets/knobs retain their recognizable shapes, and the DOM control dock remains sharp. Lighting and composition survive. Tiny VFD labels are already marginal at full resolution and should not be the sole source of essential station information.

Evidence: [DPR 1](resolution-profile/1440x900-1-1.png), [DPR 0.9](resolution-profile/1440x900-2-0.9.png), [DPR 0.85](resolution-profile-085/1440x900-2-0.85.png). This review concerns desktop-sized screenshot readability, not physical-phone behavior or verified pointer hit targets.

Agent B independently read the lead's `resolution-profile-085/1440x900.json`: production-local, Mobile quality, night cockpit held at 30 m, live Jolt, 10-second warmup and 20-second measurements, Intel UHD 630. DPR 1 / 0.85 / 1 yielded 27.10 / **32.37** / 27.58 mean FPS; the 0.85 case had p5 30.01 FPS and p95 frame 50 ms. Actual buffer reduced from 1440x900 to 1224x765. This supports a fill-cost benefit but is a stationary experiment, not the required sustained cruising acceptance result.

Recommendation: a bounded 0.85 scale for **night + Mobile quality + more than one million CSS pixels** is an acceptable sharpness/performance tradeoff if the lead's final moving production run confirms it. Preserve phone-sized canvases, daylight/sunset and Desktop quality policies. Do not infer physical-phone, 4K or casting success. Application integration and final sustained results remain lead-owned.

## Loop source review

Read-only inspection of the revised lifecycle found no blocking race: reset waits for actual opaque cover, increments a camera-reset revision, snaps the camera and waits another frame before acknowledging; hidden tabs defer the reset safely; auto-director and camera inputs are guarded during the covered transition. The resume effect still requires visible/ready state and no active loop cover. This is an editorial fade/cut between shots, not spatially seamless repeating geometry. Browser recordings remain necessary to verify its appearance.

## Final Mobile-quality production performance: independently checked

Agent B read all three `night-after-mobile/*-night-perf.json` files and the benchmark setup. Each camera starts at distance 0 with driving resumed and runs for approximately 60 seconds. Camera samples stayed entirely within the named camera: desktop 3,053 chase / 2,052 cockpit samples; portrait 3,598 / 3,604; landscape 3,602 / 3,602. No page exceptions were recorded. End snapshots at 210 m can occur at the loop boundary; they do not mean the whole measurement was stationary.

Local production build, night, Mobile quality, live Jolt, Intel UHD 630 / headless Edge 154.0.4258.62. No video recording during FPS sampling. The integrated night/large-canvas scale is 0.85; phone-sized canvases retain DPR 1. Browser context DPR is 1 desktop / 3 phone emulation.

| CSS viewport | Camera | Actual buffer | Mean FPS | p5 FPS | p95 frame ms | Max frame ms | Ending JS heap MB |
|---|---|---|---:|---:|---:|---:|---:|
| 1440x900 | Chase | 1224x765 | 50.85 | 46.00 | 33.4 | 50.1 | 48.5 |
| 1440x900 | Cockpit | 1224x765 | **34.18** | **30.50** | 50.0 | 66.7 | 58.5 |
| 390x844 portrait emulation | Chase | 390x844 | 59.94 | 60.02 | 16.8 | 100.0 | 53.8 |
| 390x844 portrait emulation | Cockpit | 390x844 | 60.02 | 60.01 | 16.8 | 18.2 | 33.7 |
| 844x390 landscape emulation | Chase | 844x390 | 60.02 | 60.01 | 16.8 | 17.1 | 53.7 |
| 844x390 landscape emulation | Cockpit | 844x390 | 60.00 | 60.02 | 16.8 | 33.5 | 36.6 |

The measured **Mobile-quality desktop cockpit now exceeds 30 FPS in both sustained mean and p5 one-second windows**. Compared with Pass 5's 28.97 mean / 27.55 p5 at a full 1440x900 buffer, this gain comes with the explicitly reviewed resolution tradeoff; it is not a same-resolution material-only improvement. A p95 frame interval of 50 ms still indicates uneven pacing, so this is not a 60 FPS experience.

Phone-sized emulation remains near the desktop monitor's 60 Hz ceiling, **not physical-phone validation**. Heap values are JavaScript memory only. Desktop quality has a separate, costlier rendering path; its final failing results are below and this Mobile-quality pass must not be generalized to it. Matched material pixel comparisons follow.

## Matched Mobile/sunset material image review

Agent B opened all eight desktop/portrait chase/cockpit images from `before/` and `after/`, matched at 40 m, sunset and Mobile quality. Dynamic music bars, pedestrians and hands differ between captures and are not material regressions.

- [Desktop chase before](before/local-desktop-chase.png) / [after](after/local-desktop-chase.png): the large rear body panel changes from pale cream/pink to a darker plum reflection, with a stronger localized highlight. The car separates its surfaces a little more clearly, but loses some of its light cream appearance. Road, sky and building composition are effectively unchanged. This is a subtle, mixed material change rather than a dramatic visual upgrade.
- [Desktop cockpit before](before/local-desktop-driver.png) / [after](after/local-desktop-driver.png): the hood becomes warmer and more reflective; the radio remains in the same visible position with readable primary station text. The cabin retains its strong copper/orange sunset cast. The new paint does not solve the flat, stylized environment appearance or add radio usability by itself.
- [Portrait chase before](before/local-portrait-chase.png) / [after](after/local-portrait-chase.png): the darker rear panel is the clearest difference. Camera framing and unobstructed road view remain intact. The before image presents a brighter cream car; preference for the after image's richer reflection is subjective.
- [Portrait cockpit before](before/local-portrait-driver.png) / [after](after/local-portrait-driver.png): the full head unit and dock stay visible; hood warmth changes subtly. No new clipping or dock obstruction is evident in these stills. Still-image visibility alone does not verify touch interactions.

These captures verify that the material treatment is visible and preserves framing. They do **not** justify a claim of photorealism or unmistakable overall visual superiority.

## Desktop-quality final review: visual preservation, performance failure

Agent B opened [chase before](before-desktop-quality/local-desktop-chase.png) / [after](after-desktop-quality/local-desktop-chase.png) and [cockpit before](before-desktop-quality/local-desktop-driver.png) / [after](after-desktop-quality/local-desktop-driver.png), matched at sunset and 40 m. Desktop clearcoat produces the same most noticeable change as Mobile: the rear panel becomes darker/plum with a stronger localized highlight, and the hood becomes warmer/reflective. Both cockpit images show the live street reflection in the mirror and a visible radio with readable primary title. These stills do not establish mirror frame cadence. Shadows and rich road illumination remain; overall composition and radio placement are preserved. The material change remains a preference-dependent refinement, not a large visual leap.

Agent B independently read `night-after-desktop-quality/local-desktop-night-perf.json`: approximately 60 seconds each, local production, live Jolt, night, Desktop quality, 1440x900 CSS and drawing buffer, window DPR 1, Intel UHD 630 / Edge 154.0.4258.62. Camera samples were exclusively chase (1,788) and cockpit (1,176); no page exceptions.

| Desktop quality, night | Mean FPS | p5 FPS | p95 frame ms | Max frame ms | Ending JS heap MB |
|---|---:|---:|---:|---:|---:|
| Chase | 29.79 | 27.11 | 50.1 | 83.3 | 60.4 |
| Cockpit | **19.59** | **18.39** | **83.4** | 100.2 | 42.1 |

**Desktop quality fails the 30 FPS target on this hardware.** Its pre-change night baseline was approximately 29.61 chase / 16.03 cockpit; the final cockpit improvement is useful but insufficient. The desktop window already had DPR 1, so lowering the maximum Desktop DPR from 1.5 to 1.25 cannot explain this particular result. Mirror removal at night is consistent with less rendering work, but the whole integrated before/after does not isolate every material/lighting contribution.

An earlier final Desktop-quality attempt mixed cameras across a loop cut and is retained as invalid evidence; its 29.54 FPS must not be presented as cockpit performance. The pure-camera run above supersedes it. The definitive distinction is **Mobile-quality default passes this measured target; optional Desktop quality does not**. Neither establishes physical-phone or casting success.
