# Project Cinema: source assets and license gate

Research date: October 10, 2026. Owner: `/root/cinema_assets`, delegated asset/automotive/digital-human research. Exact runtime model variant is not exposed; no model-specific participation claim. Documentation only: no assets downloaded, accounts changed, purchases, installations or production writes.

## Decision

Start inspection with the **already acquired Pontiac GTO 67** rather than the RX-7 or another unverified download. Its commercial-use provenance is documented and it has substantially more geometry, but neither polygon count nor a publisher's description proves a photographic interior. **No hero vehicle has passed the cinematic quality gate.** Test the cockpit before constructing the city or rendering 900 frames.

MetaHuman is the strongest researched hand-rig candidate. Epic's free City Sample components are credible environment/traffic candidates. None of these Unreal assets has been acquired or rendered during this pass. Acquire only the selected component packs after hardware and download authorization; do not fetch the full city merely to obtain a few facades.

## Manifest

| Role / asset | Source and license evidence | Acquisition / quality status | Next inspection |
| --- | --- | --- | --- |
| Hero candidate: Pontiac GTO 67, thecali | Existing `public/cruise/vehicle/gto-candidate/LICENSE.txt` explicitly records CC0 commercial permission; [Bitterli's original resource page](https://benedikt-bitterli.me/resources/) identifies thecali and original source. [CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/). Conversion provenance names ErfanMo77 in local manifest. | Already local. `gto-high.glb` 2,110,820 bytes; manifest reports 301,739 triangles, 23 material primitives, source 1,063,228 triangles. File size checked this pass; triangle counts inherited manifest, not remeasured. Cinematic quality **UNVERIFIED**. | Inspect steering wheel, dashboard, gauges, windshield thickness, seat scale, UVs and texture resolution at actual final framing. Prefer preserved source before browser simplification if found. Do not assume Meshopt GLB imports directly into Unreal without conversion. |
| Existing RX-7, IvOfficial | [Poly Pizza source](https://poly.pizza/m/SnIoWlh7S2), existing [project ledger](../ASSETS.md), CC BY 3.0. Retain author/source/license and modification attribution. | Already local; prior ledger 19,720 triangles. Existing cabin is project-authored procedural geometry behind originally opaque glazing. **Not accepted as cinema hero.** | Can remain browser comparison reference. More expensive shaders will not supply missing interior detail. |
| Alternate investigation: 1940 Ford V8, Saurav Maity | [Author's Sketchfab listing](https://sketchfab.com/3d-models/1940-ford-v8-d9e2efb283534eebae96cf0963820d35). Official indexed listing states CC Attribution, 22.6k triangles and complete interior. Direct fetch returned 403. | **Not acquired. License category indexed; exact license version/download terms not independently confirmed.** Author quality claim only. Older era than desired. | Only revisit if GTO fails; resolve license at acquisition and inspect actual interior. No assumption that low count or a free label passes quality. |
| Rejected cockpit candidate: 1967 Mustang Fastback, Mark Peters | [Author listing](https://sketchfab.com/3d-models/1967-ford-mustang-fastback-4096px2-02933292f4d64a52a9bec5923e24b0af) explicitly says interior and underside were not created. Indexed CC Attribution. | Not acquired. **Rejected for first-person hero**, regardless of exterior density. | No work needed for this proof. |
| Driver hands: MetaHuman generated character | [Current official licensing](https://www.metahuman.com/license); [Unreal EULA](https://www.unrealengine.com/eula/unreal). Current MetaHuman page places it under the Unreal license, with conditional free eligibility. | Not acquired/generated. Terms researched; account eligibility and applicable acquired version not checked. No hand realism verified. | Create one driver with proper arm/finger rig; preserve acquisition/version record. Resolve any legacy-content terms separately. |
| Traffic: City Sample Vehicles, Epic Games | [Official Fab pack](https://www.fab.com/listings/2909157b-ddfa-4cef-a925-69dc2467021f): free, 13 vehicles, explicitly UE-only. [Epic Content License](https://www.unrealengine.com/eula/content). | Not acquired. Page restriction verified; account acquisition terms must be retained. Not automatically a vintage interior solution. | Use selected background vehicles, animate deterministic trajectories; disable unnecessary gameplay/destruction systems for offline sequence. |
| City modules: City Sample Buildings, Epic Games | [Official Fab pack](https://www.fab.com/listings/008fe959-5511-428e-93bd-f99b1179f6d5): free modular buildings, explicitly UE-only. Same Epic content license. | Not acquired. Candidate for detailed near facades and distant skyline. Published listing is not our rendered quality evidence. | Select a few coherent building families; fit downhill road instead of importing a complete flat city. |
| Cockpit surfaces: Automotive Materials, Epic Games | [Official Fab pack](https://www.fab.com/listings/5dd132fe-ee32-4e8c-9cd3-7496547dfb29): free interior/exterior materials including leather, metals and wood. Page parser does not expose a concrete license field. | Not acquired. **Asset-specific acquisition license remains unverified**; do not blanket-label it Fab Standard. | Confirm offered terms and engine compatibility, then test small material swatches on actual hero mesh. |
| Road: existing Clean Asphalt / Asphalt 02, Poly Haven | Existing project manifests; [Clean Asphalt](https://polyhaven.com/a/clean_asphalt), [Asphalt 02](https://polyhaven.com/a/asphalt_02), [official CC0 policy](https://polyhaven.com/license). | Existing browser derivatives local. CC0 commercial use verified at publisher policy. No new high-resolution master acquired. | Inspect source resolution; render normal/roughness response under grazing headlights. Do not stretch a small browser crop across the hero foreground. |
| Streetlights, markings, neutral artwork | New project-authored geometry/materials, or separately cleared assets entered here before use. | Planned; no cinema geometry created. | Use plausible fixture dimensions, physical lights and restrained reflections. Own simple lane markings are appropriate; own blocky hands are not. |

The GTO credit is optional under its recorded CC0 terms, but retain `Pontiac GTO 67 by thecali; rendering-resource conversion by Benedikt Bitterli; glTF conversion provenance: ErfanMo77; modified for Buena Onda` for traceability. A model copyright license is not a claim of automotive-brand endorsement.

## License handling for an offline film

The [Epic Content License, section 3(b)](https://www.unrealengine.com/eula/content) permits distribution of licensed content incorporated in rendered linear media; section 5(a) defines UE-only content. Our proposed route uses **Unreal to render those assets and delivers only the resulting film**, preserving the UE production restriction. Do not ship Unreal source meshes in the website or publicly redistribute downloaded packs. Preserve the actual entitlement and terms accepted when acquiring each asset; the generic [Fab Standard summary](https://www.fab.com/eula) does not override a specific UE-only designation or an older entitlement.

Current [MetaHuman licensing](https://www.metahuman.com/license) differs from legacy MetaHuman content provisions. Record the creation/download version and governing agreement instead of mixing old restrictions with new marketing terms. No revenue eligibility or license purchase is asserted for the founder's business in this research.

## Hand and cockpit acceptance procedure

Use Epic's [vehicle visualization and MetaHuman wheel-constraint tutorial](https://dev.epicgames.com/community/learning/courses/0y6/unreal-engine-virtual-production-for-visualization-guide-chapter-3-shoot-day-and-delivery/kYR4/unreal-engine-metahuman-adding-vehicles-to-your-visualization). The official workflow uses arm IK, authored finger grip poses and parent constraints to the wheel. For this film, a keyed vehicle path is simpler to reproduce than a live physics take; wheel angle and hand motion must follow that path.

1. Set real dimensions and an eye-height cockpit camera. Inspect a daylight diagnostic frame before relying on darkness.
2. Author left/right grip targets on the wheel, elbow pole positions and finger contact poses. Check wrists and sleeve intersection at steering extremes, not just neutral.
3. Render short neutral/left/right steering samples at final resolution. Check skin, windshield reflections, gauge clarity, dashboard roughness and forearm proportions.
4. Verify all frames around corrections for floating fingers, clipping, stretch and temporal trails. Show an alternate framing hiding unfinished hands if necessary; label it explicitly rather than claiming the hand gate passed.
5. Only after founder-quality acceptance build the full 30-second animated scene. Keep station titles/song data outside the baked dashboard.

No image-output inspection or rendered comparison was performed by this research agent. A bounded search of `docs` and `public` found no GTO/classic-named preview image, and existing script/doc searches did not establish a GTO screenshot mapping. No unrelated car screenshot was passed off as GTO evidence. All artistic recommendations are proposed criteria, not verified scene quality.

The lead's hardware audit found no accessible Unreal installation and only a GTX 1060 Max-Q with 6 GB VRAM, 16 GB system RAM, and critically low C: free space. Rendering is therefore **BLOCKED - SUITABLE GPU / UNREAL ENVIRONMENT REQUIRED** for this pass. The new 33-second reference was not located; the older 18.62-second founder clip is a different reference. Asset selection remains provisional until that reference and an authorized rendering environment are available.

## Gate and ledger

| Owner | Files | Status | Evidence | Blockers |
| --- | --- | --- | --- | --- |
| `/root/cinema_assets` | `docs/cruise/cinema/ASSETS.md` | Research complete; assets not newly acquired | Local GTO license/manifest/files, official Epic/Poly Haven pages, indexed author vehicle pages | Hero interior quality, MetaHuman acquisition, actual acquisition terms, suitable rendering environment |

Next action: inspect the local GTO on the authorized render workstation, render cockpit/hand diagnostic frames, then decide whether it meets the reference. No purchase, large download or replacement car is silently authorized by this shortlist.
