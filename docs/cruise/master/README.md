# Playable Miami street — review package

Local preview: http://127.0.0.1:3040/cruise/miami-test

Branch: `experiment/cruise-miami-master`. Production was not deployed. Original `/cruise`, `/cruise/projection-test` and `/cruise/cockpit-test` remain separate routes.

## Reproduce

From this repository, with the existing dependencies installed:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3040
node node_modules/typescript/bin/tsc --noEmit
node scripts/master-proof.mjs
node scripts/master-proof.mjs --review-final
node scripts/master-radio-video.mjs
```

The proof uses Microsoft Edge through Playwright. It tries a local `@playwright/test` installation, then the existing sibling `cruise-master-20261005` installation. On a fresh checkout, install `@playwright/test` as a development dependency and provide Edge, or adapt the documented browser channel. No test assets or radio streams are mocked. A running local server is required. Browser temporary-profile access may require execution permission in a sandbox.

Start cruise, use arrows/WASD to steer and change speed, Space to pause, Q/E or hold the glance buttons to look. Touch steering buttons are below the canvas. Cruise starts paused. It follows a gently curving lane with bounded lateral steering, not rigid-body tire physics. The built street is approximately 220 m; travel stops at 210 m with an end margin. Default speed is 3.5 m/s (12.6 km/h), selectable from 2–8 m/s. Restart returns to the beginning. Both cameras use vertical FOV: chase 65°, cockpit 62°.

Select Radio to open accessible playback controls; the physical dashboard knobs and presets also operate the same player. Audio survives camera changes and business details. Explore pauses driving; resuming remains an explicit action. Directory revisits all three demo placements. No payment, real sponsorship claim, outbound purchase or fictitious business destination was added.

## Implementation and boundaries

- Static original Deco street geometry with continuous curb/sidewalk/road coordinates, textured asphalt, palms, shoreline, glazing, record bins and clothing displays.
- Buena Onda Record Store, Branches Vintage, three supported approach signs and a supported Vice Nights banner. Approach signs are distinct from the side-facing facade lettering; their measured exposure must not be represented as separate facade exposure.
- Existing Island Trail car and improved cabin are primary. Existing Classic Coupe and Coastal Coupe remain selectable; their quality is not equivalent to the primary vehicle.
- Original radio hook/stations and physical radio are reused. Missing R2 configuration causes the local Buena Onda catalog API to return 500; this is shown as unavailable, not replaced with pretend playback.
- Day, sunset and night remain selectable. This isolated street has no rain mode, traffic or pedestrian simulation. The original Cruise still contains its previous options.
- Mobile preset uses DPR 1 and no shadow-map pass; a restrained ground contact patch supports the car. Desktop preset adds dynamic shadows and up to DPR 1.5. Environment reflections are approximate room lighting, not a captured street reflection. No expensive postprocessing or new renderer was introduced.
- The road is interactive 3D. No driving footage is used in this route.

## Measurement method

`window.__streetSamples` records sampled FPS, per-window frame-time p95, draw calls, triangles, texture count, JS heap, route distance and ad geometry. `window.__streetEvents` records separate visibility-qualified, card-appearance, card-dismissal and explore events. These are local bounded arrays with no identifiers or network transmission. There are no outbound business links, so no outbound-click claim is made.

A qualified exposure requires the full projected sign within the canvas and browser viewport, adequate projected dimensions (at least 130 CSS pixels wide on the measured landscape/desktop layouts and 28 high), front-facing angle below about 69°, clear raycasts to the center and four inset corners, and five uninterrupted seconds while cruising. Hidden scene ancestors, hidden tabs, paused cruising, HUD overlap and an open details dialog do not qualify. Rays stop before the sign face, avoiding false obstruction from its own backing. The first positive sample starts at zero; only consecutive positive intervals accumulate. Camera changes and a restart reset continuity; a placement qualifies at most once per run across camera switches. This sampled geometric test does not establish human readability of small subtitle text or semantic recognition. Screenshots and native video frames provide a separate visual check of the main brand/message.

Proof runs are ordinary forward drives with no free-camera staging or test-only speed adjustment. The desktop chase recording adds capture overhead. FPS is the mean of sampled windows while moving; reported p95 is the mean of window p95 values, not a pooled global percentile. JS heap is not GPU memory. Measurements are local development-server observations, not production loading or network benchmarks.

Test machine: Dell G7 7588, Intel Core i7-8750H (12 logical processors), approximately 16 GB RAM. Browser GPU identification and exact version/resolution are saved in `measurements.json`. Phone tests use desktop Edge mobile viewport/touch emulation, not Android OS or a physical phone. Physical Android 30 FPS acceptance remains unverified.

## Review and provenance

Independent reviewer: `gpt-6-astra`, reviewing source, actual screenshots and measured evidence. Implementation, environment, controller/proof and research agents used the inherited Codex/GPT-6 model; its exact backend variant is not exposed by this session. Claude was not used: there was no callable Claude tool or installed CLI on PATH. An SDK dependency alone is not an available review session, and no paid API call was made.

See [Astra review](ASTRA-REVIEW.md), [engine/reference/hosting decision](RESEARCH.md), and [asset manifest](ASSETS.md). `AGENTS.md` supplies reusable, subordinate repository orchestration guidance.

The two requested visual-reference attachments were not available in this conversation. The implemented scene can be compared with the written direction, but exact image matching is unverified. Actual renders still show simplified modular architecture, sparse street life and approximate reflections; this is not a demonstrated hyperrealistic result.

No new paid assets, generation, subscriptions or recurring services were used. The existing Next hosting approach can serve this scene with client-side GPU rendering; the catalog still needs its existing server/storage configuration. Incremental paid service commitments are zero. Actual bandwidth/hosting bills were not audited. Mindblown hosting is not recommended for the complete experience under its documented external-origin restrictions; Unreal streaming would add a GPU-host dependency without a demonstrated need.

## Final results: PARTIAL

The playable scene and radio integration work. The full visual and advertising acceptance criteria are not met; this is an isolated review prototype, not a finished production experience.

Authoritative exposure/performance evidence: [review-final.json](review-final.json). Earlier local `quick.json`, `initial.json` and `visibility-final.json` are diagnostic records not included in the review commit; `measurements.json` is retained as functional evidence from the preceding revision. Their ad durations must not replace the conservative final results below. `measurements.json` remains the detailed radio/vehicle/day/night functional evidence; the later radio-video check covers the final Escape and night-lighting fixes.

| Final ordinary drive | Mean FPS | Lowest sampled window FPS | Billboard | Buena Onda | Branches |
|---|---:|---:|---:|---:|---:|
| Desktop chase, video recorded | 51.55 | 38.10 | 5.730 s | **4.938 s — unmet** | 5.065 s |
| Desktop cockpit, video recorded | 35.20 | 29.36 | 6.007 s | **4.648 s — unmet** | **4.574 s — unmet** |
| Phone landscape emulation, chase | 56.12 | 17.42 | **0.267 s — unmet** | **0.533 s — unmet** | **0.533 s — unmet** |
| Phone landscape emulation, cockpit | 55.26 | 25.59 | **0 s — unmet** | **0 s — unmet** | **0 s — unmet** |

Each run drove for approximately 62 real seconds at the same default speed and sunset/mobile-quality settings. Under frame stalls, the controller discards catch-up time; not every recorded run reached the endpoint in 62 seconds. Desktop viewport was 1440×1000, canvas 1398×678. Emulated phone viewport was 844×390, canvas 832×258; browser DPR was 3 but the renderer stayed at DPR 1. All used Edge 154.0.4258.62, ANGLE/Direct3D11 on Intel UHD Graphics 630. These are not physical Android results. High average FPS does not establish a sustained 30 FPS floor.

Mean window p95 frame times were respectively 40.30, 58.01, 41.06 and 35.32 ms. Recording has material overhead: the preceding non-recorded desktop cockpit run averaged 40.93 FPS. Initial-ready times were 5.72 / 2.44 / 1.99 / 2.01 seconds against the local development server. JS heap ranged roughly 76–123 MiB. Resource Timing reported about 4.83 MB transferred and 16.35 MB decoded development resources; cross-origin streams may report zero without timing permission. These are not production bundle, cold-network or GPU-memory measurements.

At the retained desktop chase maximum-exposure samples, signs occupied about 330–337×156–159 CSS pixels at 17.5–17.8 m and 46–48° view angle. Cockpit samples were about 252–295×114–135 pixels at 20.8–22.5 m and 33–37°. These are endpoint samples, not the dimensions throughout the entire qualifying interval. Full per-window distance, dimensions, angle, occlusion and continuity are in the JSON. The windshield pillar eventually cuts across the storefront sign sightline. On phone-sized canvases, sufficient text size occurs too late to produce five seconds. A zero result means no continuous qualified interval, not that a sign never renders.

### Functional evidence

- Keyboard steering works immediately after Start, without a canvas-focus workaround. Touch steering changes lateral position; pause stops distance and reports zero speed. Existing wheels/gauges follow runtime speed and the primary steering wheel follows input.
- Both cameras work; physical radio selection changes Jolt to NTS 1. NTS produces real `playing` events and advancing media time. Volume changes to 0.35. Playback continues across camera changes and while a business pauses driving. Live Jolt playback and NTS 2 playback were not independently certified; their existing selectable sources are retained.
- Explore pauses, Directory revisits businesses, and the modal blocks resume. An Escape-after-backdrop-click failure was found in the final benchmark run and fixed with document-level handling; its targeted result is recorded separately in `radio-video.json`.
- Landscape canvas and both 44×49 px steering controls fit entirely within the initial 844×390 viewport, with no scrolling workaround. Touch still operates. Portrait 390×844 radio/layout checks pass; portrait sustained performance and ad exposure were not benchmarked.
- Day/sunset/night selections and both legacy alternate vehicles load. Legacy GTO interior mirrors are visibly faceted and its radio partly clips at the lower edge; those inherited assets do not meet the primary cockpit quality standard.
- No page exceptions or missing scene assets were recorded. The local catalog API returns 500 because R2 environment configuration is missing. A favicon request returns 404. Stream requests aborted during intentional station replacement are recorded separately.
- TypeScript `--noEmit`, proof-script syntax checks and development-route compilation pass. A whole-site optimized production build was not performed; no production-readiness claim is made.

### Evidence to open

- [Exterior gameplay, 56.84 seconds](chase-gameplay.webm)
- [Cockpit drive with live NTS playback state, 58.60 seconds](cockpit-radio-gameplay.webm)
- [Billboard](billboard-review.png), [Buena Onda exterior approach](desktop-chase-40m-review.png) and [Branches exterior approach](desktop-chase-125m-review.png)
- [Cockpit approach](desktop-driver-80m-review.png) and [radio playing during the drive](radio-driving-80m.png)
- [Actual phone-sized viewport](android-landscape-viewport-review.png)
- [Native timed approach frames](frames/) and [recording provenance](media.json)

The WebM screen recordings are silent; playback is proved separately by actual media events/time progression, not by claiming audio was captured. Human visual review supports recognizable main brand names in selected desktop frames, not five seconds of readable small print.

The final targeted retest confirms Escape closes details after a backdrop click. NTS remained playing with 55.40 seconds of advancing media time during an actual 185.44 m cockpit drive. Night lighting was recaptured after reducing the overly bright environment contribution. A short paused desktop-shadow preset check is also saved; its transition and recording overhead make it unsuitable as a sustained driving benchmark. Reproduce the trimmed clips/native frames with `node scripts/master-media.mjs`; set `FFMPEG_PATH` if the installed executable differs from this machine's existing Playwright FFmpeg path.

### Recommendation

Continue with Three.js and this isolated street foundation, but do not promote this build as photorealistic or advertising-ready. The next bounded work should improve the primary vehicle/facade material detail and redesign mobile typography/sign sightlines with the cockpit pillars and default speed together. Keep the 220 m scope. Restore authorized local catalog configuration and test a physical midrange Android device before making performance or monetizable-impression claims. No engine migration is justified by this evidence.
