# Buena Onda Cruise — review build

Preview: http://localhost:3021/cruise

The existing Three.js / React Three Fiber renderer remains the launch path. It runs locally in a browser, needs no installation for visitors or remote GPU streaming, and keeps cars, cameras, radio, replaceable shop signs, and discovery in the same scene. The isolated checkout is `D:\10-VENTURES\12-buena-onda\cruise-master-20261005`; original `cruise-music-experiment` remains untouched. Local branch `cruise/master-20261005`, pre-edit checkpoint `ebaed6a`.

## Included

- Continuous 2.304 km coastal/causeway/highway loop; automatic cruise, Day and Night, exterior and driver views. Warmer directional light, blue coastal sky, lower western skyline/open eastern ocean, narrower beach, spaced authored deco hotels, clearer cabins.
- Coastal Coupe: licensed RX-7-derived car, three paints, original cabin. Classic Coupe: licensed GTO-derived car with modeled interior and fixed paint. The Classic is an older muscle-car shape, not claimed to be an '80s model. Garage rotates only the selected car and supports drag/previous/next.
- Existing Buena Onda playlist, Jolt, NTS 1 and NTS 2 manifest; external-only Poolsuite remains correctly external. One radio owner survives mood/camera/car changes; loading/error/retry, pause, mute and volume retained.
- Buena Onda Record Store, Branches Vintage House and Tideway Motel: dimensional buildings, parking/frontage access, warm shopfronts and replaceable signs. Branches and Tideway are clearly fictional demos; Buena Onda is house content. No purchased or generated storefront assets.
- Dismissible nearby prompt, modal place cards, keyboard/touch support, Along the Route directory, deliberate outbound links, clipboard links with manual fallback. Shared addresses open the correct card before a start gesture and approach the place on first start. Active browsing never requests a route reset.

Demo links: [Records](http://localhost:3021/cruise?place=records), [Branches](http://localhost:3021/cruise?place=branches), [Motel](http://localhost:3021/cruise?place=tideway).

## Actual MiniMax comparison

[Open comparison player](http://localhost:3021/cruise?mode=minimax-test). This is an explicit test, separate from garage choices. Only one fixed convertible cockpit, blue-hour/night shot exists; it does not match either selectable coupe.

- Connected Higgsfield catalog: `minimax_hailuo`, variant `minimax-2.3`, requested 6 seconds at 768p. This is third-party Higgsfield model access, not a claim of direct MiniMax API access. Text-only request; existing renderer screenshots were unsuitable references for a photographic atmosphere test.
- User authorized one 6-credit job. Account balance verified 166 → 160 credits. No assets/subscriptions purchased, no second generation. Job `e88a4a87-9d69-45f9-828d-bbe20fdec8e0`.
- Actual MP4: 1366×768, 5.875 seconds, 623,254 bytes; `public/cruise/experiments/minimax/night-driver.mp4`. Real playback test: three loops, muted inline footage, independent live Jolt audio advanced from 1.00 to 16.44 seconds while sponsor card opened/closed, no stalls or browser errors. Four waiting events occurred across initial playback/loop boundaries; no network throttling applied. Warm local startup measured 1.10 s, not a public cold-load promise.
- Six extracted frames reviewed: stable-looking cockpit, horizon and road; plausible forward progression and strong coastal atmosphere. Frame inspection cannot rule out all brief warping. The final roadway/shoreline differs from the start: hard loop visibly resets scenery. Elevated convertible framing is not an exact '80s coupe match. Therefore retained for review, not substituted for the continuous drive. Sponsor card is explicitly a screen overlay, not a tracked physical sign. No video exposure is inferred from playback time.

| Criterion | Improved real-time drive | Actual MiniMax clip |
|---|---|---|
| Atmosphere | Stylized, consistent coast with readable day/night | More photographic, attractive blue-hour light |
| Continuity | Continuous wrapped route | 5.875 s with visible scenery reset |
| Car/camera | Two cars × two views × two moods | One unmatched fixed cockpit only |
| Places/ads | Three replaceable world locations + directory/cards | Independent screen sponsor control only |
| Browser/mobile | WebGL, adaptive DPR/detail; mobile emulation checked | Small muted MP4; mobile layout checked |
| Delivery/cost | Existing hosting, no GPU streaming charge | Exactly 6 credits for this clip; no recurring generation needed for sponsor cards |
| Decision | Launch path | Bounded comparison retained; no footage library |

No Unreal/Godot prototypes or splats were built. Existing assets and renderer address the problem without rebuilding browser delivery and product logic. There was no suitable licensed splat/scan in the inspected asset set to evaluate. Historical experimental footage was not presented as this MiniMax result.

## Configuration and measurement

`lib/cruise/campaigns.ts` extends the existing campaign registry with `CRUISE_PLACES`: stable place/placement IDs, name, storefront/landmark/billboard type, module/localZ/x anchor, image, description, campaign ID, address and house/demo/sponsored status. Campaigns retain destination, generated text/color creative, local creative replacement path, enabled/priority and active dates. Configure an HTTPS sponsor destination and matching creative in that registry; no video regeneration is involved. Original SVG place art is in `public/cruise/places`; `scripts/cruise-place-art.mjs` reproduces it.

Events use the existing `lib/cruise/analytics.ts` transport, bounded to 100 diagnostic entries and forwarded to `window.gtag` when installed:

- `cruise_place_exposure`: estimated visible duration. Sign center must be in camera frustum, front-facing >0.16, within 180 m, and projected area >0.0015 for two continuous seconds. Credit that initial interval once; then credit only new duration. Flush on visibility break, hiding, unmount, or 30-second batches. Loading assets produces no exposure. Garage, hidden page and place/radio/credits overlays do not accrue. No pixel-level occlusion/attention test; payload explicitly reports `occlusion_tested:false`.
- `cruise_place_open`: once per actual card opening/change, including an explicit deep link; React renders do not create repeated opens.
- `cruise_place_outbound`: deliberate destination click only; never automatic navigation.
- `cruise_place_share`: successful clipboard write only. Manual fallback is not falsely counted as a copy.

These browser tests are test events, not audience results. No production analytics backend or GA installation is introduced. Existing legacy billboard analytics remain available for the preserved experimental renderer.

## Verification

- Production build passed; `/cruise` 14.5 kB route JavaScript / 113 kB first-load JavaScript, before intent-loaded 3D assets.
- Typecheck passed. 21 existing campaign/radio/route/vehicle tests passed.
- Desktop integration passed all three deep links/cards/share/qualified exposures, hidden-page guards, deliberate outbound events, active-drive continuity, both cars × both moods × both views, mute and pause. `master/functional/functional.json` retains `passed:false` because its later mobile phase timed out when a build overlapped the serving directory. The server was stopped and rebuilt cleanly; the separate final `master/functional/mobile.json` passes with zero errors/missing assets. The interrupted report is retained for traceability, not presented as an all-green run.
- Final production soak passed: 617.206 seconds (10m17s), 29 measured intervals, four station sources, four car changes, camera/mood changes, all three place exposures, cards and fullscreen. Zero browser errors, failed Cruise assets, or overlapping streams. No product edits during the session. `master/soak/soak.json` contains the raw evidence; `master/acceptance.json` combines the completed checks without altering the interrupted report.
- Actual renderer: ANGLE / Intel UHD Graphics 630 / Direct3D 11. At 1280×800, interval FPS ranged 45.6–60.0 with median 59.4; samples include control use and garage visits. Warmup was 34.9 FPS while another capture briefly overlapped; it is retained separately. Local garage ready: 2.22 s, drive ready: 8.15 s from navigation. These are warm local measurements, not public cold-load guarantees. Observed JS heap 35.8–67.0 MiB; GPU geometry 92–198, textures 41–49, programs 40–73. Resources decreased after car changes; this finite run is not proof against every long-term leak.
- Hardware: Intel i7-8750H (6 cores/12 threads), approximately 15.8 GiB RAM; Intel UHD 630 and NVIDIA GTX 1060 Max-Q 6 GiB installed. Browser test reports identify the GPU actually used. Edge 154.0.4258.53; 1280×800 desktop. Mobile is Chromium Pixel 7 emulation on this desktop, not a physical device; no CPU throttling.
- Before/after motion, screenshots, cards, extracted video frames and JSON reports: `master/index.html`. Baseline was freshly captured from the preserved launch code; its radio timeout was caused by sandbox networking, fixed by running the preview with normal network access.

## Run and deploy

From this directory: `npm run cruise:build`, then `npm run cruise:start` (port 3021; optional `PORT`). `npm run cruise:review` serves the evidence at http://127.0.0.1:3022. Dependencies currently reuse the original checkout through a local `node_modules` junction. For a separate machine, use the lockfile with `npm ci` and supply the existing private environment configuration. Build artifacts use `.next-master-prod`; stop that preview before rebuilding and use a separate directory for development.

No push or public deployment performed. The existing site's documented Next/Vercel path is preferred; merge only the Cruise changes into the main repository, reuse its configured environment and normal build. Do not use the existing Cloudflare `next-on-pages` adapter without resolving its installed Next-version mismatch. No required native app or GPU streaming infrastructure.

Verified cost: this task spent exactly 6 existing generation credits. Local hosting has no new service fee. Public hosting is traffic/plan-dependent; this session did not inspect the existing hosting bill. Vercel Hobby is for personal non-commercial use; an advertising business needs an appropriate commercial plan. [Vercel pricing](https://vercel.com/pricing), [Hobby restrictions](https://vercel.com/docs/plans/hobby).

## Limits

Straight modular highway, two cars instead of four, deliberately stylized geometry, estimated visibility without occlusion, no physical phone/Safari test, external radio availability dependent on providers. Classic's older body style is disclosed. The generated video's hard loop is retained as a comparison limitation. No extra city districts, missions, NPCs, music-reactive scenery, advertiser checkout, or dashboard added.

ClaimAvenue was inspected for place-card/directory/share-address patterns; design and assets here are original. [Reference](https://claimavenue.com/). Model/catalog verification used the connected Higgsfield tools; current official MiniMax documentation now foregrounds newer models, so no claim that 2.3 is its newest model: [MiniMax video docs](https://platform.minimax.io/docs/guides/video-generation).

Routing: architecture/art direction used explicitly selected GPT-6 Astra; implementation checks used GPT-6.1 Sol, with root integration. GPT-6 Luna was requested for an inventory worker but remained pending initialization and was interrupted; no completed work is attributed to it. No token usage counters were available.
