# Roadarium and Hop Earth: evidence for an experience-first Cruise

Research date: October 15, 2026. Researcher: `/root/metadata`, using the available parent model; no claim of an unavailable specialist model. Scope: public sites, shipped public JavaScript, author presentations and public discussions. **No competitor was interactively driven, no account created, no purchase made, no code or asset reused.** Only this research document was written.

## What was actually inspected

Direct Node HTTPS GETs returned HTTP 200 for both landing pages, Roadarium's application shell and the specific scripts linked below. The research browser could not render Roadarium's application root; fetching its shell separately exposed its script URL. Reading a JavaScript file establishes shipped code paths, not their activation, quality or frame rate. The source lengths below are decoded JavaScript string lengths, **not transferred/compressed network bytes or loading measurements**.

| Public resource | Evidence obtained |
| --- | --- |
| [Roadarium landing page](https://www.roadarium.com/) | Product positioning, geography attribution, screenshots and practice flow |
| [Roadarium application](https://app.roadarium.com/) | HTTP 200 shell; linked main module, ~1.75 million characters |
| [Roadarium main module inspected](https://app.roadarium.com/app/main-3WZIO2KW.js) | Tiled geography, rendering and cockpit implementation indicators |
| [Hop Earth](https://hop.earth/) | HTTP 200 shell; current terrain attribution and linked scripts |
| [Hop current bundle](https://hop.earth/bundle10140031.js) | ~3.52 million characters; worker, settings, instancing and payment paths |
| [Hop front controller](https://hop.earth/front.js) | Public update banner, route URL handling and asset service-worker registration |
| [Hop terrain worker](https://hop.earth/assets/scripts/terrainFetchWorker.js) | Tile request/retry and terrain processing path |

Bundle filenames are ephemeral snapshots. No restricted account, leaderboard or payment endpoints were queried. A linked public GitHub project returned HTTP 451 through the research browser; its contents and license were not verified or obtained through an alternate route. No permission to reuse a competitor's delivered JavaScript is implied.

## Roadarium: recognizable geography plus a clear reason to return

**Public product evidence.** Roadarium presents actual city streets as route familiarization and driving practice. Its current homepage says 115 cities, OSM plus other open geographic data, and Natural Earth for the world map. It advertises city/route selection, free driving, cockpit mirrors, navigation, traffic, pedestrians, indicators and automatic transmission. Progress is browser-local and organized by skills and places; example progress records are explicitly marked examples. Its keyboard/mouse entry and repeated practice provide a clear return loop. These are first-party product descriptions and published screenshots, not features exercised here. [Roadarium](https://www.roadarium.com/)

**Author claim and scope mismatch.** The October 10 three.js showcase instead claims 119 cities, three.js/OSM, left/right traffic rules, trams, pedestrians and phone support. It says no signup is required. The author acknowledges limited ability to explain implementation. Replies challenge the distorted world-map presentation; the author says distortion makes room for labels. Treat 115/119 as inconsistent public counts, not a verified catalog. [Author showcase and replies](https://discourse.threejs.org/t/roadarium-drive-the-real-streets-of-119-cities-in-your-browser/95169)

**Shipped implementation evidence.** The inspected main module imports a separate Three.js bundle. It computes integer tile coordinates using a configurable tile dimension; a neighborhood selector defaults to radius two and restricts requests to indexed tiles. The fetch path loads separate road-tile and terrain JSON. There is an instanced-mesh construction path, procedural vehicle geometry with high/medium/low levels at default distances 0/30/80, a device-pixel-ratio cap of 1.5, and cockpit material/shader code. Some instance groups explicitly disable frustum culling. These are observations of code, not proof that all objects are streamed, properly culled, or rendered within budget. Exact spatial units, active-city extent, memory ceilings and eviction behavior were not established. A keyword search found no Worker constructor in this module; this does not prove the whole application lacks workers. [Inspected delivered module](https://app.roadarium.com/app/main-3WZIO2KW.js)

**Mobile, economics and reliability.** In a creator-posted learner-driver discussion, the author describes the project as free without advertising or tracking. This is not an independent privacy audit or a verified sustainable business model. Users report London-load failures, long loading and Safari crashes; one identifies iPhone 17/Safari/iOS 27.0.1. The author acknowledges substantial resource use and reports fixes. These are dated self-reports, not reproduced failures or controlled performance measurements. No FPS, memory or mobile reliability number is warranted. [Creator discussion and user reports](https://www.reddit.com/r/LearnerDriverUK/comments/1x3806j/i_wanted_to_drive_around_my_own_city_so_i_built_a/)

**Unverified here:** in-drive music, station integration, public route-sharing UX, photorealism in motion, exact city coverage, sustained mobile play, or loading time. A city query link is visible in public links; that is weaker evidence than completing a share flow. There is no basis to turn this research into a claim that Roadarium offers a licensed human-radio experience.

## Hop Earth: continuous geographic discovery and the cost of generated roads

**Primary technical history.** In the creator's SIGGRAPH 2025 presentation, OSM centerlines and terrain feed a custom tile server with curve fitting, sampled road heights and variable road profiles. It describes procedural geometry, manual intersection refinement, collision work off the main thread, memory compression and texture transcoding. Rendering techniques include bespoke road LOD/multi-draw and cached shadows. Its 120 FPS discussion is a design budget, not a benchmark for our hardware. Importantly, that historical presentation still lists continuous realtime-world delivery as future work; it cannot prove the current world streams correctly. [Creator presentation, printed pages 62–75](https://www.khronos.org/assets/uploads/developers/presentations/WebGL%2BWebGPU_SIGGRAPH_2025.pdf)

**Current shipped evidence.** The current bundle creates a terrain-fetch worker, transfers geometry buffers in another worker path, contains instancing and adjustable LOD/road-quality settings, and includes music-volume settings. It also includes subscription/payment UI and PayPal finalization code. Code presence does not establish current price, payment success, music selection, playback rights, or a visible working radio. No cockpit implementation was established. [Current bundle](https://hop.earth/bundle10140031.js)

The front controller displays an October 11, 2026 update announcing infinite driving with a dynamic origin and grass. It captures an encoded route from the URL and registers an asset service worker. This is evidence for published positioning, route-state portability and a cache mechanism, not a completed shared journey, offline capability or confirmed leak-free infinite driving. [Front controller](https://hop.earth/front.js)

The terrain worker requests spatial tiles from a Hop subdomain, has a 30-second request timeout, retries failures and posts processing results. This supports a tiled worker architecture; it does not establish generation/upload latency or guarantee invisible tile boundaries. The current landing page attributes Copernicus DEM, IGN and CNIG elevation datasets, so the 2025 ESRI description should not be assumed to describe every present terrain source. [Terrain worker](https://hop.earth/assets/scripts/terrainFetchWorker.js), [current attribution](https://hop.earth/)

**Author and user reports.** An earlier creator launch post labels mobile experimental and offers free trial play followed by a discount for continued access. Discussion includes missing road segments, abrupt physics collisions, server congestion and mobile-control problems, with author fixes. A newer creator update says free browser play and confirms solo free driving alongside racing. This establishes changing messaging, not today's entitlement, price or account requirements. We did not test signup, free access, multiplayer or payments. [Launch and feedback](https://www.reddit.com/r/playmygame/comments/1u3kjrz/hopearth_its_like_google_maps_need_for_speed/), [later update](https://www.reddit.com/r/IndieGaming/comments/1waue33/hopearth_drive_anywhere_on_the_planet_update/)

**Unverified here:** current traffic behavior, cockpit view, licensed music/radio catalog, exact recurring cost, phone performance, continuous-drive stability, and live session-sharing completion. Do not infer these from broad “drive anywhere” copy or marketing videos.

## First 5 / 15 / 60 seconds

| Project | 5 seconds | 15 seconds | 60 seconds |
| --- | --- | --- | --- |
| Roadarium | Not observed in an interactive browser | Not observed | Not observed |
| Hop Earth | Not observed in an interactive browser | Not observed | Not observed |

HTTP success and source download are not time-to-drive. Public screenshots, promotional demos and author FPS claims cannot substitute for a fresh session. No browser/device, viewport, DPR, quality setting or FPS sample exists for this research pass. Any later interactive comparison must record those, cold/warm cache, network conditions and elapsed interaction milestones. Physical mobile validation remains separate from emulation.

## Ranked patterns for Cruise's existing Next.js / R3F geographic world

These are **recommendations and engineering inferences**, not claims that the competitors implement Cruise's intended music product.

| Rank | Pattern to adapt | Fit and bounded implementation | Evidence required before expanding |
| --- | --- | --- | --- |
| 1 | A place-specific start with one immediate action | Reuse the existing cockpit/vehicle and geographic world; begin on a recognizable Miami segment with a default station available after the entry gesture. Put the first landmark ahead of the windshield. Keep audio outside scenery lifecycle. Small scope; no framework replacement. | Timestamp first audio, first frame and first recognizable location; confirm cockpit radio is usable immediately. |
| 2 | Geography with intentional routes | Offer a few editorial Miami drives with a clear visual promise: coastal light, causeway skyline, neighborhood neon. Optional free cruising continues after the segment. Reuse mapped roads and approved landmarks; avoid a giant city chooser before the first drive. | Verify actual road continuity, land/water relationships and landmark sightlines; no claim of street accuracy from OSM alone. |
| 3 | A bounded active world | Index existing geometry into nearby chunks, prefetch forward by heading and speed, retain a small rear buffer, and release distant GPU resources. Preserve the road under the vehicle until the next segment is ready. Start with one continuous corridor rather than worldwide scope. | Log resident chunks, requests, CPU/GPU memory proxies and frame stalls during a 10-minute drive; inspect seams at slow and fast speeds. |
| 4 | Repeated detail with explicit budgets | Reuse instanced palms, lamps and secondary vehicles; use distance-based detail and a measured DPR cap. Keep the cockpit and nearby signs legible. Apply budgets before increasing city extent. | Before/after draw calls, triangles, frame-time percentiles, loading and mobile thermal behavior; no arbitrary promise of 120 FPS. |
| 5 | A portable place-and-station link | Encode an allowlisted route/start and station ID in a URL, giving recipients the same authored starting moment. Keep listening history out of the URL. A screenshot/share action is optional after the radio is working. | Open a fresh session from the link; verify legal/usable station fallback and no account requirement. |
| 6 | Optional local journey memory | Save deliberately chosen routes and visited places locally, adjacent to My Finds. Use small invitations to return to a place, without score pressure or music personalization. | Prove persistence, export/delete behavior and that no fake place/visit is recorded. |
| 7 | Workers and origin rebasing when needed | Move proven heavy geometry/terrain preparation off the main thread and transfer buffers; upload in bounded batches. Add a stable logical geographic origin plus a render-local origin only when extent measurements justify it. | Profile the actual bottleneck and verify camera, physics, landmarks and advertisements remain aligned across a rebase. |

Avoid copying the expensive parts first: global terrain hosting, a custom renderer fork, complex country-specific driving instruction, synchronized races, real-world traffic simulation and subscription infrastructure. Road continuity and recognizable Miami are more valuable to this product than a worldwide city count. The prior radio/persistence work should remain intact while testing these world changes on an isolated route.

## Concrete next experiment

Reuse the best current Jeep cockpit and a verified Miami corridor. Author a 60-second uninterrupted arrival sequence with the station always reachable, one compelling skyline/landmark reveal, and a seamless continuation. Measure audio-start time, first visual, first landmark, frame-time stability and audio continuity. Only then decide whether the bottleneck is geometry, content composition, loading or controls. This research supports that experiment; it does not establish that either competitor has solved Cruise's experience or licensing requirements.
