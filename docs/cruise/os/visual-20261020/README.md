# Colony Hotel: real architectural depth experiment

Branch: `experiment/cruise-os-visual-20261020`. Starting application: Cruise OS commit `2715376`. No deployment or paid assets/services.

## What changed

Only `/cruise/os?visual=rooms` enables the experiment, and only the existing mapped Colony Hotel changes. Its footprint, height, signs, placement and road remain intact. The solid street wall is replaced by a wall with genuine window openings. Rooms extend 1.75 m behind that plane, with solid walls, floors, ceilings, furniture, folded curtains and lamps. Transparent front glazing preserves a glass cue. The existing room drawings remain on the back walls; they are not a replacement for the navigable world. Shallow Art Deco overhangs gain rounded corners and baked underside shading. Lamps follow the existing sunset/night blend.

No changes to vehicles, cockpit camera, radio/audio lifecycle, UI, route, advertisements or original `/cruise`. Disabling the query flag restores the existing facade. No new downloaded textures, models, lights, shadow maps or framework dependencies.

## See it

- Original frozen build: http://127.0.0.1:3081/cruise/os?at=17.5&time=night
- Enhanced production preview: http://127.0.0.1:3096/cruise/os?visual=rooms&at=17.5&time=night
- Choose a ride, Start cruising, then Menu → Places → Take a closer look. Back to drive restores cruising.

The `at` parameter uses the existing shared-route mechanism to begin just before Colony, rather than requiring a drive from the north end of Ocean Drive. The default entry/cameras are unchanged.

## Evidence and limits

Matching night captures: [original](before-night/colony.png), [experiment](after-night/colony.png). Matching route metre 67.5, Countach, landmark camera, night blend 1, 1440×900, browser DPR 1. Screenshots use an explicit diagnostic teleport and parked landmark view; these are not continuous-driving performance evidence. Live radio, pedestrians and traffic can vary between captures.

Sunset captures: [original](before/colony.png), [intermediate experiment](after-sunset/colony.png). These precede the final glazing/lamp refinement and sunset elapsed time differs slightly. Night is the stricter final comparison. [Portrait cockpit](portrait/cockpit.png) exercised the final source in the development server at 390×844: Start, park, camera switching and Menu/Places worked, with no document-width overflow or page exception. This does not establish mobile hardware performance. The existing roof band still restricts the portrait windshield.

Independent screenshot review found a localized depth improvement, not a dramatic scene-wide realism jump. It also identified overly uniform lamps and weak glazing cues; the final iteration adds shaped lamps with alternating positions and transparent front glazing. Expand only after evaluating passing cockpit views and whether the effect is worthwhile to the listener. The rest of the city remains at its existing fidelity.

Final independent review found no blocking frontal/oblique visual defect. The passing coastal capture crops most Colony rooms at the screen edge, so it provides weak evidence for upper-floor oblique seams or the subjective strength of motion parallax. The raycast proves geometric depth; human preference and a convincing moving visual payoff remain unproven.

The geometry regression raycasts through an opening to actual room geometry behind the original wall, while the default facade still intercepts at the original front plane. Synthetic fixture: 17 → 21 material-batched meshes, 3,440 → 5,824 triangles. This is a fixture budget, not the total world or actual mapped-hotel geometry count. Materials/geometries remain under existing disposal ownership.

## Reproduce

```powershell
$env:CRUISE_DIST_DIR='.next-cruise-os-visual-build'
npm run build
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3096
```

```powershell
node --import tsx --test tests/cruise/landmark-depth.test.ts
$env:PROOF_URL='http://127.0.0.1:3096/cruise/os?diagnostics=1&visual=rooms&at=17.5&time=night'
$env:PROOF_OUT='docs/cruise/os/visual-20261020/after-night'
node scripts/visual-hotel-proof.mjs
node scripts/visual-hotel-performance.mjs
```

Performance results live in [performance/results.json](performance/results.json). Headless Windows Edge testing is not physical-phone, full-loop or thermal validation. JS heap excludes GPU memory. Existing local 404/network errors and externally hosted radio streams remain outside this architectural experiment; no page exceptions were observed in captured runs. No claim of comprehensive advertising or physical-device validation. Initial harness attempts used an outdated Start button name and then tried to click a zero-height document body; those were corrected to the actual accessible name and a canvas-coordinate click. They were harness failures, not passed application tests.

## Final validation

Production build `xoxQFqCN5vWxnG_deqJq2` passed compile, type/lint checks and page generation. Existing Next config, hook and image warnings remain in `build.log`. Final geometry regression: 1/1 passes. Final desktop moving trial: 1280×720, browser DPR 1, Auto scenery (renderer DPR adapted between 1 and .92), 5 seconds warmup followed by 30 one-second samples per variant. No other automated browser or build ran during those samples.

| Measure | Original | Enhanced |
| --- | ---: | ---: |
| Mean scene FPS | 43.36 | 44.54 |
| p5 of one-second FPS averages | 38.76 | 38.86 |
| Minimum one-second FPS average | 38.50 | 38.29 |
| Draw-call range | 198–245 | 198–245 |
| Distance during sampled interval | 419.33 m | 418.38 m |
| Peak JS heap | 159.3 MB | 184.9 MB |

Both variants passed movement, no page exceptions, camera change, station drawer visibility and actual same-element audio-time advancement across those changes (10/10 combined checks). The enhanced run is not evidence of a speedup: one trial, adaptive DPR, live audio/traffic and normal timing variance limit that inference. No material FPS regression was observed in this sample. The desktop 50–60 FPS aspiration is **not met in this headless test**; no physical-mobile claim is made. Sample heap is not stable retained heap or GPU memory. Existing advertisements were preserved in source but not comprehensively exercised.

Edge version: `155.0.4283.62`, local Windows laptop. Ready after navigation/automated Start: original 13.18 s, enhanced 5.67 s. These are single-run readiness times, including variable asset/network warmup and user-action automation; do not infer a loading-speed improvement. Asset transfer sizes and GPU memory were not measured.

## Recommendation

**IMPROVE before scaling.** Real geometry depth is proven; a whole-scene fidelity breakthrough is not. Next useful gate is human assessment of moving oblique views and a larger, visibly stronger facade treatment on this same hotel. No additional operating cost was introduced ($0 new assets/API usage); existing hosting and radio terms still apply.
