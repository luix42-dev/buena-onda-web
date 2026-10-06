# Buena Onda Cruise — Island Trail, city and radio

Working preview: http://localhost:3024/cruise

Before/after, radio discovery and city recordings: http://127.0.0.1:3025/

Continues `8cb5901` on isolated branch `cruise/jeep-city-radio`. The prior build remains at port 3021 and prior review at 3022. No reset, purchase, generation job, deployment or push was performed in this milestone. The previous MiniMax comparison remains unchanged; no additional credits were spent.

## What changed

Three.js / React Three Fiber remains the browser renderer. Island Trail adds an original late-eighties-inspired open off-roader with its own body, seats, windshield, steering, analog instruments, shifters and radio. It is explicitly not an authentic/licensed Jeep model. Coastal Coupe and Classic Coupe remain selectable, with day/night, driver/exterior and radio-focus views. Curated paint switches normalize to the selected car's palette.

Cockpit work emphasizes visible proportions, shallow molded dash, rubber/vinyl grain, fabric weave, exact dial markings, parked wipers and restrained instrument lighting. The head unit has physical power/volume/seek/presets and exact canvas-rendered station labels. Geometry/materials remain stylized: this build is not described as photographic or hyperrealistic.

The Radio button or actual dashboard radio enters an interpolated close-up. Back to drive/Escape restores the previous view while cruise and music continue. Reduced-motion users get immediate positioning. The matching expanded panel has keyboard controls, a drag knob, accessible slider, mute, status and four real presets. Loading/selected/playing/unavailable states are distinct. `useCruiseAudio` remains the single owner; source revision guards and playback intent prevent stale callbacks and overlapping streams.

First-use help advances through focus, station choice, volume and return. Skip and Radio help replay are available; completion/skip is remembered. A place card temporarily hides radio controls and owns Escape first, then focus can be closed. No demonstration changes volume or station without interaction.

The 2.304 km continuous corridor now bends gently through four districts: pastel South Beach frontage; an open-water causeway with piers/parapets; taller Downtown/Bayside streets and an underpass; and low MiMo shops/motels. Garage's Choose your drive supports district starts or the full route and remembers selection. Road, buildings, palms, landmarks and steering share the same periodic tangent path. Fixed module pools, instancing, visibility culling and low-tier scenery/shadow reductions bound resource use.

## Places, configuration and metrics

- [Buena Onda Records](http://localhost:3024/cruise?place=records): house content along South Beach frontage.
- [Branches Vintage House](http://localhost:3024/cruise?place=branches): clearly labeled house/demo concept on Biscayne Vintage Row.
- [Tideway Motel](http://localhost:3024/cruise?place=tideway): fictional/demo MiMo landmark.

Cards, directory, copy links and deliberate destination actions preserve stable IDs. Opening a card in an active drive does not reposition it or interrupt radio. A deep link starts at the place approach after user input; explicitly selecting another district in the garage takes priority.

| Configuration | Location |
| --- | --- |
| Place ID, location, logo/image, copy, status; campaign creatives/destinations/dates | `lib/cruise/campaigns.ts` |
| Branches curbward sign offset, independent of its building | `CRUISE_PLACES[].anchor.signX` (local lateral offset, metres) |
| Route modules/district IDs and path | `lib/cruise/routes.ts`, `lib/cruise/routePath.ts` |
| Cars, paints, camera anchors | `lib/cruise/launch.ts`, `lib/cruise/vehicles.ts` |
| Actual stations and stream capabilities | `lib/cruise/stations.ts` |
| Shared radio and physical/expanded controls | `useCruiseAudio.ts`, `CockpitContext.tsx`, `PhysicalRadio.tsx`, `radio/RadioConsole.tsx` |
| Tutorial storage | `buena-onda-radio-help-v1`; garage preferences `buena-onda-cruise-launch` |

Existing `trackCruiseEvent` forwards to `window.gtag` when installed and keeps a bounded 100-event local diagnostic buffer. No initialized production collection endpoint was found; ingestion remains unconfigured. Card-open, outbound-click, successful-share-copy and exposure are separate events. Test activity is not audience data.

Exposure still requires a front-facing sign center in the frustum, distance under 180 m, projected area over 0.0015 and two continuous qualifying seconds. The initial interval is credited once, then only new time, flushed on visibility loss, page hide, unmount or 30-second batches. Garage, hidden tabs and expanded place/radio/credits overlays do not qualify. Loading does not count. Added raycasts at 4 Hz sample up to three sign points against marked opaque buildings and landmark shells; all three blocked resets qualification. Payload: `estimated_visible_duration_occlusion_sampled`, `occlusion_tested:true`, `occlusion_samples:3`. Foliage, cabin, transparent details and unmarked skyline geometry are excluded; partial signs may qualify and motion can add up to 250 ms error. This estimates exposure, not attention or verified impressions. Browser checks inspect real emitted payloads; no synthetic occluder was injected.

## Assets and references

See [JEEP-ASSET.md](JEEP-ASSET.md) for supplied photographic references, two rejected external candidates, original asset provenance, dimensions and resource disposal. No new third-party vehicle mesh or texture was copied. Repeated tire treads are merged, geometry/materials are cached per mounted vehicle, and owned resources are disposed. Only the selected car is loaded.

See [JEEP-REFERENCES.md](JEEP-REFERENCES.md) and [CITY-REFERENCE.md](CITY-REFERENCE.md). All four READMEs/license metadata were inspected; deep inspection was limited to Neon Mayhem (parcel reservation/batching concepts, Apache-2.0) and Sketchbook (camera target/input separation, MIT). Implementations here are independent. Spiderbench's view-only code/assets were not incorporated; no Spider-Man NYC code or OSM data was used. No new third-party notices are required; existing asset notices remain.

Actual worker routing selected GPT-6 Astra at ultra effort for the original cockpit and shader-stall diagnosis, and GPT-6.1 Sol at high effort for city/path/placement work. The lead retained shared audio, interface, integration and acceptance. At most two workers ran alongside the lead; no recursive delegation or extra generation jobs. Token-usage counters were unavailable.

## Verification

- Production build and typecheck passed. Cruise route JavaScript is 17.3 kB / 116 kB first load, excluding subsequently loaded scene assets. Twenty-seven campaign/radio/route/path/vehicle contracts passed. Existing unrelated Browserslist, event-cache and Studio dynamic-rendering warnings remain.
- The desktop functional proof covers all three cars in both moods and both driving views; focus entry/restoration; actual physical volume dragging; keyboard slider/knob controls; power/mute/seek/presets; twelve rapid switches; and an injected stream failure followed by successful recovery. First-use completion, skip and replay passed. Place cards preserve audio and own Escape before the radio panel. Raw report: `jeep-city/functional/functional.json`.
- All 18 car/camera/place combinations passed card, link, clipboard and audio compatibility. Initial sampled exposure qualified in 17; a late camera switch biased the low coupe/Branches observation. Moving the Branches pylon curbward and correcting test timing passed all six affected views. The original report remains unchanged alongside `places/branches-fixed/report.json`. One deliberate outbound action produced one separate outbound event; no automatic advertiser navigation occurred.
- Mobile layout checks used desktop Pixel 7 touch emulation at 390 x 844, 320 x 700 and 844 x 390. The expanded radio's controls and place cards fit without page overflow. No physical phone or actual human usability participant was available.
- A performance preflight exposed a 5,748 ms first-night frame gap and shader programs doubling from 34 to 68. Keeping light counts stable fixed that trigger. A subsequent run stopped near nine minutes because a test selector matched both the directory entry and nearby Record Store prompt; the harness is now scoped to the dialog. `performance-preflight.json` and `soak/selector-interrupted.json` preserve both findings. Neither interrupted run is presented as the final ten-minute session.

Final production soak passed **601.895 seconds (10m02s)**: all three cars, four stations and districts, both cameras/moods, repeated directory/cards and fullscreen. Zero browser errors, missing Cruise assets or overlapping source streams. No product changes, competing browser captures or builds occurred during this run. `jeep-city/soak/soak.json` contains the raw data; `acceptance.json` combines it with the completed functional and place checks.

| Measured desktop result | Value |
| --- | --- |
| Actual renderer / viewport | Edge, ANGLE / Intel UHD 630 / Direct3D11; 1280 x 800 CSS pixels |
| Settings throughout final samples | Medium detail, DPR 1; adaptive mode enabled |
| Median interval FPS / range | **49.1 / 27.5–60.0** across 28 intervals, including controls and garage/car loading |
| Median interval p95 frame time | 33.4 ms |
| Largest post-warmup frame gap | 3,348.8 ms during the first coupe change; loading stalls remain |
| Frames over 100 ms | 35 of 27,602 sampled frames |
| Local garage / drive ready | 1.94 s / 7.64 s from navigation; warm local server, not a public cold-load guarantee |
| Observed resource ranges | 107–297 geometries, 25–57 textures, 32–42 shader programs; JS heap 35.1–75.4 MiB |

This is slower in dense areas than the prior reported 59.4 FPS median. The computer and CSS resolution match, but the earlier run spent 26 of 30 samples at DPR 0.85; this final run stayed at DPR 1 and includes the more detailed third car/city. It is not a controlled equal-render-scale comparison. Open causeway intervals approach 60 FPS; dense driver views can be around 30–40. Resource counts fall after car/district changes instead of increasing continuously; this finite session is not a proof against every long-term leak. Hardware: Intel i7-8750H, approximately 15.8 GiB RAM; a GTX1060 Max-Q is installed, but the measured browser used Intel. `hardware.json` and the browser reports preserve the actual target.

The first-night interval after the fix retained 34 shader programs and a maximum frame gap of 116.8 ms, compared with the preflight's 5,748 ms spike. Initial scene compilation and first car loads still cause pauses: the initial warmup included a 5,048.3 ms gap. Warmup is recorded separately from the 28 interval statistics.

The separate desktop Pixel 7 emulation performance check used 390 x 844 CSS pixels, low detail, DPR 1 and no CPU throttle. After 20 seconds of warmup, three 15-second samples measured 60.0 FPS chase, 60.0 driver and 58.9 radio focus, each with p95 about 16.8 ms; focus entry had a 299.8 ms maximum gap. This verifies the available desktop's touch layout/tier, not a real phone's ability to sustain 30 FPS. Edge version: 154.0.4258.53. Raw data: `jeep-city/review/review.json`.

Browser videos are silent captures; real audio advancement, source identity and lack of overlap were measured separately. The final release radio recording was refreshed after the lighting fix (45.2 seconds). The district/place recording is 90.16 seconds and deliberately uses garage selections and deep links, rather than portraying those jumps as continuous driving. Both are 1280 x 800; actual player time advancement, seeking, gallery comparisons and asset loading passed. Extracted motion frames and close-up day/night screenshots were visually inspected. The gallery also retains the fresh 45.04-second baseline.

## Run and deployment

From `D:\10-VENTURES\12-buena-onda\cruise-master-20261005`:

```text
npm run cruise:jeep:build
npm run cruise:jeep:start
npm run cruise:jeep:review
```

Production build uses `.next-jeep-prod`; stop its server before rebuilding. Preview defaults to port 3024 (optional `PORT`); the evidence server binds 127.0.0.1:3025 and supports video range requests. Dependencies currently use the preserved checkout's local junction. On another machine use `npm ci` and the existing private environment configuration. Normal site deployment uses its existing Next/Vercel path, environment and build command; merge/review these Cruise changes first. No native install or remote GPU stream is required for visitors.

Incremental paid spend this milestone: zero. Local serving adds no service fee. Current public hosting rates/plan were not re-audited, so no new cost estimate is claimed. Deployment remains unperformed.

Limits: original stylized off-roader rather than an authenticated high-detail Jeep scan; repeated periodic scenery and procedural facades; sampled exposure without complete occlusion coverage; external radio availability; physical mobile/Safari and human usability testing unavailable. No missions, free roaming, traffic, pedestrian simulation or advertising marketplace added.
