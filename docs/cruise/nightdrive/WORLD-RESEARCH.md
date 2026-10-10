# Nightdrive world research

Owner: `/root/ux_music`; exact model identifier unavailable. Research checked 2026-10-10. No external code or assets copied; no dependencies installed. This document proposes architecture, not measured rendering results.

## Decision

Use **A: deterministic continuous road streaming**, with **two authored district palettes inspired by B's emphasis on composition**. This is a limited hybrid, not B's full authored-segment architecture. The road must never end or teleport. Coast and neon-city sections should last hundreds of metres, with smooth transitions, rather than shuffle scenery every few seconds. Avoid a runtime WFC solver: adjacency constraints and backtracking add unpredictable work without improving this deliberately single-route music experience.

### A versus B versus the selected prototype

These are engineering judgments about the approaches, **not measurements of three implementations**. Only the selected hybrid prototype was built. B means authored street segments joined through generated connections; it does not require WFC.

| Approach | Visual quality | Reliability | Performance | Implementation cost |
|---|---|---|---|---|
| **A: streaming road skeleton** with generated roadside forms | Continuous curves and potentially endless variation, but basic generators can look repetitive or generic. | One shared analytic sampler makes continuity straightforward; deterministic placement is reproducible. | Fixed pools can bound memory; generation bursts and visible detail still require measurement. | Lowest initial scope of these options; substantial art work remains if the forms lack character. |
| **B: authored segments with generated connections** | Strongest control over memorable compositions, landmarks and district identity; repeated authored pieces can become recognizable. | Requires compatible road widths, endpoint positions/tangents, grades, prop clearances and camera-safe joins; connectors add failure cases. | Can also use a bounded pool. Asset complexity and connection generation determine cost; authored does not inherently mean faster or slower. | Higher upfront segment authoring and connection/QA work; a useful library must exist before variety pays off. |
| **Selected: A's road plus two authored palettes** | Coast/neon shapes provide a limited change of atmosphere; this is **not a full authored segment library** or a richly varied journey. | Retains one sampler and fixed slot reuse; avoids arbitrary segment junctions and runtime constraint solving. | Keeps a bounded geometry/instance budget while adding palette variation. Actual performance belongs to this prototype's browser evidence only. | Bounded first prototype using existing assets and simple forms; upgrading its art direction remains separate work. |

Choose the hybrid to prove uninterrupted driving and bounded resources first. If its visual repetition remains the limiting factor, add a small set of deliberately composed roadside scenes against the same road interface, then reassess before adopting B's more expensive segment-connection system.

| Primary source | Relevant finding | License verification and reuse decision |
|---|---|---|
| [Slow Roads](https://slowroads.io/) and [creator's technical article](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/slow-roads/index.md) | Generate ahead of the visitor; keep detail near the road; recycle buffers and spread generation work across time. | Official site identifies CC BY-NC-ND 4.0. Inspiration only; do not copy application code/assets into this commercial project. The article is a separate publication, not an application source license. |
| [Marian Kleineberg's WFC article](https://marian42.de/article/wfc/) and [repository](https://github.com/marian42/wavefunctioncollapse) | Authored module connectors can enforce adjacency, but the author documents contradictions, cross-boundary propagation and occasionally late backtracking. Useful vocabulary design; unsuitable complexity for this first bounded lab. | [Repository LICENSE](https://github.com/marian42/wavefunctioncollapse/blob/master/LICENSE) verified MIT, copyright 2018 Marian Kleineberg. Any future code reuse would retain its notice and verify individual asset provenance. No reuse here. |
| [Turbo Racer, Deniz Bazan / blobidea](https://blobidea.com/projects/turbo-racer) | Author describes 64 m chunks, bounded road heading, changing regions and a constant loaded window. Its Godot/WebGL2 timing is author-reported, not a benchmark for our Three.js implementation. | No application-code reuse license found on the project page; footer reserves rights. A stated CC0 asset-kit origin does not license the application or establish every individual asset's rights. Inspiration only. |
| [StarKnightt/nightdrive](https://github.com/StarKnightt/nightdrive) | README describes a shared road sampler for geometry and movement, instanced vegetation and terrain LOD. It also contains extensive driving-game systems that are unnecessary for Cruise. | GitHub repository metadata returned `license: null`; inspected root listing has no LICENSE. No grant verified: no copying. README claims are not independently verified runtime findings. |
| [ryanfitzpatrickio/san_verde](https://github.com/ryanfitzpatrickio/san_verde) | Authored road/editor data plus procedural buildings is a useful hybrid. Its WebGPU/Three.js 0.183.2 stack and vehicle/traffic systems are outside the existing lab stack. | GitHub repository metadata returned `license: null`; inspected root listing has no LICENSE. No grant verified: no copying, including vehicles/textures. |

## Minimal existing-route audit

Original active Cruise declares 36 modules in `lib/cruise/routes.ts:43`, with 64 m module length in `lib/cruise/constants.ts:12`. Its runtime wraps distance modulo the 2,304 m world at `components/cruise/performance/Runtime.tsx:51`; `moduleZ` recycles placements. It is a finite repeating authored route, not an unbounded generated journey.

Miami uses the fixed 630 m endpoint in `components/cruise/master/route.ts` and clamps movement before `onFinish` in `DriveController.tsx:83`. Its covered Director cut conceals a reset; extending its fixed scenery further would continue growing geometry. Neither original route is being altered for this lab.

## Bounded first implementation contract

Root agreed a **13-slot pool of 96 m chunks**, four behind and eight ahead of the current chunk, with fog ending at 340 m. This rear margin matters because a camera can show scenery behind the vehicle. The road sampler uses a seed and unbounded longitudinal parameter, with analytic position and derivatives; geometry, vehicles and cameras read the same function. Gentle bounded lateral curves and elevation avoid self-intersections. Convert parameter advance to physical distance using the derivative metric.

Chunk coordinates remain local. Translate each chunk relative to the current sampled vehicle position, retaining monotonically increasing logical distance. Refill retired slots only beyond the visible range; fixed geometry/instance capacities and shared materials keep memory bounded. Build identical road-edge samples on shared chunk boundaries. Keep lighting cheap and music reactions subtle; no new postprocessing or dynamic lights.

Two authored palettes supply open coast and denser neon blocks. Seeded section lengths and building variation should avoid immediate repetition, but **two palettes are not a full multi-region journey**. District blending should span at least 160 m. Do not migrate WFC, physics, police, editor tooling, external assets or WebGPU.

## Verification required

Pure tests must cover determinism, analytic derivative accuracy, bounded slope/curvature and matching chunk seams. Browser evidence must cover repeated slot reuse, both districts, forward and rearward views at seams, district transitions, no reset, and stable geometry/texture counts across a sustained soak. Measure generation duration, sustained night FPS and frame pacing using the real app. Logical distance jumps can stress pool replacement, but do not substitute for uninterrupted real-time driving. A finite bounded pool is an implementation property; smooth presentation and performance still require evidence.

## Initial implementation evidence

Implemented original repository code in `components/cruise/nightdrive/road.ts` and `NightWorld.tsx`: analytic shared road sampling, fixed thirteen-slot geometry/instance allocation, 96 m chunk reassignment, coast/neon scenery palettes, two traffic forms and cheap night pools. Logical distance has no endpoint here. Road generation timings record the most recent and maximum **individual chunk** generation cost, not total first-frame construction, GPU upload time or frame duration.

`node --import tsx --test tests/nightdrive-road.test.ts` passed **3/3** on 2026-10-10: deterministic sampling, finite-difference derivative/seam checks and district continuity/bounds. These are pure function tests. Real browser presentation, frame pacing, resource plateau, reduced-motion behavior and rearward-camera culling are not established by them; the lead owns integration and browser verification.
