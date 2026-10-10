# Project Cinema: reproducible Unreal scene specification

2026-10-10. Owner `/root/cinema_unreal`, delegated Unreal technical research. Inherited session model; exact runtime model variant is not exposed. **Specification only: no Unreal project, rig, source scene or rendered frame has been created or verified by this agent.**

## Decision and hardware gate

Use one offline Unreal scene and a normal browser video player. No Unreal runtime, Pixel Streaming server, per-viewer GPU session, procedural open-world framework or new web rendering engine is needed for this proof.

Epic's official release announcement identifies UE 5.8 as released June 23, 2026. Proposed engine baseline: an available stable 5.8 patch, pinned by exact build identifier when a suitable workstation is available. Verify chosen vehicle and MetaHuman compatibility before installation; do not use preview engine features merely because they are available. [Release announcement](https://www.unrealengine.com/news/unreal-engine-5-8-is-now-available).

Epic currently recommends 32 GB RAM and at least 8 GB graphics memory. Its current Lumen requirements list RTX 2000+, RX 6000+ and Intel Arc A-series or newer, DX12 and SM6. Root's authoritative local inspection identified a Dell G7 7588 with Intel UHD630 **and NVIDIA GTX1060 Max-Q, 6144 MiB** (nvidia-smi), approximately 16 GB RAM, NVIDIA driver 462.31, C: only approximately 140 MB free and D: approximately 177 GB free. No Unreal/Blender installation was found on PATH, standard Program Files locations or installed-software registry entries. This search is not proof that a portable copy exists nowhere. Neither detected GPU is in the current Lumen feature list. **BLOCKED — SUITABLE GPU / UNREAL ENVIRONMENT REQUIRED**. This is a feature/production feasibility assessment, not a claim that no version of the Unreal editor could ever start on that computer. [Epic hardware requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine).

Do not download an engine, samples or large asset packs, rent hardware or launch paid rendering without founder authorization. A render-ready existing workstation is sufficient; no specific GPU purchase is required by this document.

## Licensing gate

The current EULA treats qualifying rendered videos without Engine Code as non-engine products, exempt from engine royalties; seat requirements are separate. The personal/indie seat exception depends on the applicable company-group revenue calculation, not an assumption that every small-looking project qualifies. Marketplace content is licensed separately. Record entity eligibility and accepted terms before acquisition. No fee or entitlement has been verified for Buena Onda. [Current EULA, sections 4(a)(i) and 6](https://www.unrealengine.com/eula/unreal).

MetaHuman is included under standard Unreal licensing; Epic states that standard terms apply above its revenue threshold. This does not certify any downloaded human, accessory, texture or vehicle from another publisher. Record each source and license independently. [MetaHuman licensing](https://www.metahuman.com/license). No assets were acquired by this workstream.

## Source project contract — proposed, not generated

Create a Blueprint Film/Video project `BuenaOndaCinema`, centimetre units, Z up. One authored 800 m boulevard is enough; this is a 30-second film, not a streaming city. Keep Unreal source outside the web public directory; deliver only cleared encoded output to the browser.

| Asset name | Purpose |
|---|---|
| `Content/Cinema/Maps/L_NightBoulevard` | Fixed shot environment, deterministic traffic and lighting |
| `Content/Cinema/Sequences/LS_Night_30_Cockpit` | Primary 900-frame sequence |
| `Content/Cinema/Sequences/LS_Night_30_Director` | Same scene with one optional 16–23 s elevated exterior insert |
| `Content/Cinema/Sequences/LS_Continuity_10` | Separately authored join experiment, not a claimed seamless loop |
| `Content/Cinema/Rigs/BP_HeroVehicle` | Licensed hero, wheel/steering pivots, camera mounts |
| `Content/Cinema/Rigs/BP_Driver` | Licensed skeletal driver and body Control Rig |
| `Content/Cinema/Render/MRQ_Night_Lumen_1080` | Saved queue preset, output and sampling settings |
| `Content/Cinema/Render/MRQ_Night_Path_1080` | Comparison preset after hardware capability check |

Save engine version, plugin list, project rendering settings, sequence display rate/tick resolution, asset hashes/provenance, material overrides and render preset together. Do not publicly redistribute source assets merely because rendered-video distribution is permitted.

## Authoring recipe

1. Establish scale from the licensed car's dimensions, wheelbase, wheel radius, seat and eye position. Verify interior normals, glass thickness/material, UVs, dashboards, panel gaps and visible underbody before framing. Reject an exterior-only car rather than fabricate a box interior.
2. Author a roughly 600 m visible descent within the 800 m corridor. Starting design: 3–5% downhill, two 3.4 m lanes in the travel direction, a gentle long-radius bend. These are tunable artistic proposals, not measurements of the reference. Start the hero on a spline and bake its transform; avoid live Chaos physics for a deterministic first film.
3. Add detailed curb, asphalt, markings, poles and near facades within camera reach. Use varied low/mid-rise silhouettes and distant skyline layers with plausible occlusion and haze. No full-city simulation is required. Prevent obvious duplicated landmarks and uniform window grids.
4. Key hero travel by arc length. Proposed speed curve: 12 m/s at start, 12 through 8 s, ease to 16 by 16 s, hold to 23 s, ease to 14 by 30 s. Integrate that speed curve for position; derive heading from path tangent and wheel roll from actual distance/radius. Bank/suspension should be small authored motion, never unrelated camera shake.
5. Animate two or three traffic vehicles on independent, baked paths with clear spacing. No vehicle enters the hero's lane or intersects another body. Review reflections and off-camera cast shadows as well as the direct image.
6. Place physical street/vehicle lights and selective emissive windows. Begin with restrained warm street lighting, neutral headlights, dark unlit facades and a cooler sky. Use actual sources for near illumination; emissive billboards must not bathe the whole road in neon. Road roughness and puddles vary locally, not mirror-like everywhere.
7. Use a CineCamera at measured driver eye height. Starting proposal: 36 mm sensor width, 28–35 mm focal length, focus set beyond the near dashboard, f/4–5.6, 180-degree shutter equivalent. Tune depth of field so both hands and road remain readable. Lock exposure/white balance for the shot; avoid automatic pumping under streetlights. Preserve sufficient cockpit width for mobile letterboxing rather than extreme portrait crop.

All numeric scene/camera values above require rendered-frame review. They are not proven quality settings.

## Hands and steering

Epic's vehicle tutorial demonstrates parenting MetaHuman hand IK controls to the steering wheel, with explicit finger poses. It also distinguishes steering-driven animation from manual Control Rig work. That supports a reproducible rigging approach; it does not automatically produce correct contact or an attractive pose. [Epic vehicle/MetaHuman tutorial](https://dev.epicgames.com/community/learning/courses/0y6/unreal-engine-virtual-production-for-visualization-guide-chapter-3-shoot-day-and-delivery/kYR4/unreal-engine-metahuman-adding-vehicles-to-your-visualization).

Proposed rig: seat the pelvis and feet, choose natural elbow pole targets, place two hand grip targets under the actual steering-wheel pivot, enable arm IK, constrain wrist controls while maintaining offsets, and author finger curl against the real rim. Drive the wheel angle from the same road curvature that drives the car. Inspect ±maximum steering and all transition frames for wrist twist, finger float and rim penetration. Avoid large hand-over-hand turns in the first downhill shot. Bake approved control animation for repeatability. Skin, cuffs and hands need actual close-up review under dashboard and passing-light conditions.

Render a diagnostic hands-visible crop and a separate intentional hands-hidden camera variant. If the hands fail, report that failure and show the alternate; do not describe the hands requirement as passed.

## Render comparison and reproducibility

Movie Render Queue supports saved jobs and presets; Movie Render Graph is a graph interface to the same pipeline. A single queue preset is simpler for this one film; no graph automation is necessary. Enable the Movie Render Queue plugin, restart, add the saved Level Sequence and map, and save the queue/preset. [Epic pipeline documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/movie-render-pipeline-in-unreal-engine).

| Candidate | Proposed use | Evidence needed before selection |
|---|---|---|
| High-quality Lumen | First stills and short moving draft | Dashboard/glass reflection accuracy, light leaks, temporal stability |
| Lumen with hardware RT | Same scene on supported hardware | Measured time and improved windshield/interior/reflection quality |
| Path tracing | Offline comparison/final only if beneficial | Clean skin, glass, motion and denoising; acceptable measured frame time |

Epic documents Path Tracer integration with Sequencer/MRQ and requires hardware ray tracing, DX12 and corresponding project support; its documentation also mentions DXR-driver-enabled GTX cards. The detected GTX1060 has no dedicated RT cores, but that fact alone is not proof that every DXR path is unsupported. No driver/feature or render test was performed, and this old 6 GB laptop GPU is not an established suitable production environment. Path tracing is not a CPU fallback for UHD630. Exact supported features and driver compatibility must be checked on the chosen machine. [Path Tracer documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/path-tracer-in-unreal-engine).

Proposed first preset: 1920×1080, 30 fps, frames 0–899 inclusive, no baked music, no burn-in on delivery. Keep separate diagnostic burn-in renders. Save 16-bit EXR archival frames and a reviewed display-referred image sequence for encoding. Explicitly record color transform/tone curve/working space so the browser encode does not double-tone-map the master.

Begin Lumen calibration at spatial 1 / temporal 8 samples with 64 warm-up frames; compare short trials before raising counts. Begin path calibration at spatial 64 / temporal 4 and compare 256 / 4 only if noise persists. These are trial values, not validated recommendations for every material or UE patch. Ensure sufficient pre-roll, correct subframe animation and no exposure/groom warm-up discontinuity. Save antialiasing overrides and denoiser state; inspect moving poles, fingers and reflections rather than judging one still. [Epic image-quality settings](https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-rendering-image-quality-settings-in-unreal-engine).

First render representative frames at 0, 8, 16, 23 and 29 s. Then render a two-second moving sample spanning a passing streetlight. Only after those pass render all 900 frames. Log warm-up time, seconds/frame, peak memory reported by the renderer, failures/retries, output bytes, hardware and preset hash. No runtime, cost or render-speed estimate is presented as measured before this job exists.

## Quality and continuity gates

| Gate | Pass evidence | Current state |
|---|---|---|
| A: feasibility | Compatible installed engine/GPU, cleared assets, exact reference reviewed | BLOCKED: no engine found, system disk nearly full, existing hardware not validated; exact 33-second reference unavailable |
| B: visual proof | Actual reference-matched stills; believable skin, cockpit, road and city | BLOCKED: no render |
| C: animation | 900 frames, correct hands/steering/wheels/traffic; cockpit vs one-insert comparison | BLOCKED: depends on B |
| D/E: website | Independently playing video/radio, responsive start and volume, measured decoding | Root/web workstream; a fixture cannot pass B/C |
| F: founder | Local comparisons plus measured cost/size; explicit acceptance | Not reached |

The 30-second hero film is not promised to loop. For the separate continuity clip define equal entry/exit speed, steering, lane offset, camera transform, horizon, grade, light phase and traffic state in a reusable road connector. Render overlap handles on both sides; compare adjacent frames around the join and presentation timestamps. A crossfade that ghosts the cockpit is not a successful join. Keep ambiance independent and crossfade only cleared ambient recordings if required; never crossfade or re-encode live radio to hide a visual edit.

Gate B/C failure is a stop on cinematic production, not permission to relabel existing real footage, AI output or a browser scene as an Unreal render. After success, estimate 40-minute production using actual render seconds/frame and encoded bytes/second, multiplied by unique scenes/cars/camera variants. Do not render the long library or deploy at this stage.
