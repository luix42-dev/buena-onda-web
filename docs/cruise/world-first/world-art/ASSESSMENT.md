# World-first preconstruction assessment

2026-10-11. Owner `/root/world_art`, configured model `gpt-6-astra`. Scope: world architecture and environment art, no vehicle, interface, purchases, downloads or deployment. This assessment precedes this agent's new scene specification. No claim that a new scene has already passed visual review.

The strongest missing element is a broad, layered metropolis viewed down a legible road. Replacing the renderer without changing that composition would preserve the current visual failure.

## Evidence actually inspected

- `docs/cruise/cinema/reference/frame-04.png` and `reference/contact-3s.jpg`: direct image inspection. The near boulevard points almost centrally into an extensive light field. Dark palms and side buildings frame rather than occlude it. Glossy road and traffic produce bright near motion cues; warm cabin fills approximately the lower 40â€“45%. The skyline is primarily a spread of lights, not a wall of identical skyscrapers. Sky flecks and extreme light streaks are stylized. The contact sheet visibly repeats compositions and ends in New Retro branding. This does not establish how the source was made or give us its reuse rights.
- `docs/cruise/nightdrive/final/desktop-driver.png`: direct inspection. A narrow canyon of flat, repeated building blocks/windows encloses the view; the broad distant city field is absent. Dense near boxes are not equivalent to city scale.
- `docs/cruise/projection/desktop-current.png`: direct inspection. Original Cruise comparison shows a broad sparse road, ocean on the right, palms and isolated skyline left. It has useful coastal geography but lacks the founder's density and downhill reveal.
- `docs/cruise/projection/EVALUATION.txt`: inherited measured report, not a new benchmark. Prior 8-second projection source had baked hood, unknown lens and a visible join to the replacement foreground. Fixed-camera plate curving did not recover scene depth.
- Actual Jeep Night source at `D:/10-VENTURES/12-buena-onda/cruise-jeep-live-20261011`: `JeepNight.tsx` imports `NightWorld.tsx`. Its fixed 13-chunk pool is useful engineering; each chunk has at most ten box buildings, three window columns per facade, and cone-frond palms. `road.ts` has only Â±1.8m vertical variation over long wavelengths. These are source findings, not a fresh public-site screenshot claim.
- Original Cruise source: `CruiseWorld.tsx`, `WorldBackdrop.tsx`, `AuthoredSkyline.tsx`, `AuthoredCoastal.tsx`. The original has road normal/roughness support and authored assets missing from minimal NightWorld, but its far backdrop is still a short-range set of bands; high quality selects only six authored towers. Source audit does not assert every asset is visible on the live route.

## Construction decision

Compose one intentional descending boulevard with a three-dimensional foreground, continuous middle-distance neighborhood mass and a wide distant city field. Hold the forward eye camera steady. Add bay geography as an opening in the right-hand street frontage, not as an empty substitute for the city. Reuse cleared asphalt and the existing detailed palm before creating replacements. Simple new building volumes are acceptable for a composition/raster feasibility proof; they are not automatically near-photographic finished architecture.

The first visual gate must inspect 0/20/40/59-second world-only frames for road legibility, city width, graded depth and silhouette repetition. Then inspect two seconds of moving near lamps/palms for sliding, popping, shimmer and exposure changes. Only after that should the full 60-second sequence render. A native raster proof can establish feasibility on the available laptop; no quality claim follows merely from being Unreal.

## Hardware and licensing boundaries

The recorded laptop is GTX 1060 Max-Q 6GB with 16GB RAM (`docs/cruise/cinema/hardware.json`); that file is historical, not a current free-memory reading. Epic lists GTX 1070 or higher for Lumen software ray tracing and RTX 2000 or higher for its hardware path. Raster, restrained dynamic lights and cached/baked reflection/lighting are the practical starting point. This is a recommendation, not a measured frame-time estimate. [Epic Lumen requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-technical-details-in-unreal-engine).

Kenney City Commercial and Nature are locally evidenced CC0 assets suitable for background silhouettes, but their stylized geometry alone does not solve near photographic detail. The existing Yughues palm and Poly Haven road textures have local provenance and publisher license evidence. City Sample Buildings are a future Unreal-only option, not acquired or cleared for this pass. CiThruS code MIT does not establish all supplied content rights. Exact paths and status belong to `asset-manifest.json`.

## Longer journey implications

A 60-second forward shot is a segment, not an endless world. Its endpoint must carry pose, speed, grade, curvature, lane widths, lighting/exposure, traffic trajectories and deterministic scenery state into the next segment. Returning to the first frame after a long descent resets altitude and landmarks even if the codec join is smooth. At nominal 12m/s, 40 minutes covers 28.8km; twenty or forty repeats of a short movie do not demonstrate that journey. A future graph of authored neighborhood segments needs compatible connectors, bounded resource residency and recurring landmarks that retain spatial identity. The current deliverable must distinguish measured playback stability from route diversity and visual continuity.

