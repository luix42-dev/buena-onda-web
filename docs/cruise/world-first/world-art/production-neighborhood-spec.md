# Production neighborhood slice: next art step

Research checked 2026-10-11 EDT / 2026-10-12 UTC. `/root/world_art`, configured `gpt-6-astra`. No assets downloaded, purchased, imported or rendered in this research pass. These are specific textured realism candidates, not a claim that publisher renders establish quality in our scene.

Build one **200m road segment with connected sloping terrain and two cross streets**. Its purpose is to replace the current gap between the elevated road and detached window field with an inhabited neighborhood. Preserve the approved current camera while testing this art; record the revised72m-vista camera separately from the earlier24m contract.

## Three concrete free candidates

All three assets explicitly show CC0 on their publisher pages. [Poly Haven's asset license](https://polyhaven.com/license) permits commercial use, modification and redistribution. These public listings expose download controls rather than a locked-vault prompt; the publisher describes public assets as available without signup. [Access policy](https://polyhaven.com/). No account action or download was attempted.

| Candidate and role | Published data and access | Required integration / unresolved facts |
|---|---|---|
| **[Modular Urban Apartments Facade](https://polyhaven.com/a/modular_urban_apartments_facade)** — James Ray Cock. Primary near residential facades: actual doors, window recesses, corners and trim replace emissive cubes. | CC0; page shows **118K triangles**, **663.38 MB**, a4K selection plus1K/2K/8K choices, and Blend/glTF/USD/FBX/ZIP options. | Start with selected modules and2K maps, not every texture at8K. Published size is the current page's displayed download configuration, not a measured transfer or installed footprint. Specific LODs, per-module counts and working UE5.8 import are **unverified**. |
| **[Modular Factory Facade](https://polyhaven.com/a/modular_factory_facade)** — James Ray Cock. One older masonry/service block behind the main frontage provides material/roofline variation and a believable side-street destination. | CC0; **175K triangles**, displayed **900.83 MB**,4K selection with lower/higher choices; Blend/glTF/USD/FBX/ZIP. Separate brick, door, garage, trim and window texture sets are listed. | Use a small subset, not the entire example assembly. Limit the industrial identity to one side street; this is a fictional coastal neighborhood, not a uniform factory district. Prebuilt LODs and native engine compatibility **unverified**. |
| **[Street Lamp01](https://polyhaven.com/a/street_lamp_01)** — Josh Dean. Two to four detailed pedestrian fixtures near an older storefront or small plaza, giving visible glass, base and mounting detail. | CC0; **31K triangles**, **3.9m tall**, displayed **31.41 MB**; model formats include FBX/glTF. Base color, metal, normal, roughness and opacity maps listed. | Ornate cast-iron style suits the pedestrian pocket, not every modern boulevard pole. Create reduced LODs if needed; supplied LODs are **unverified**. Mesh is not a configured Unreal light: author actual emission/light falloff separately. |

These are ordinary model/material deliverables rather than a publisher-required Nanite/Lumen city project; that supports a conventional raster import plan. It does **not** establish successful GTX1060MaxQ/6GB or UE5.8 performance. Published triangle totals are not the active triangles of the final assembled street. Download sizes vary with format/resolution, and no2K package byte size was verified.

For palms, first reuse the **already local [Yughues Palm Tree v2](https://opengameart.org/content/palm-tree-v2)**, CC0, with its checked provenance and1,032-triangle/901,120-byte derivative in `asset-manifest.json`. Use6–10irregular placements, preserve alpha masks and correct transforms, and inspect leaf silhouettes at the final camera. This is an available textured candidate, not a certified cinematic palm. The bounded Fab/Poly Haven search did not establish a better full palm with both explicit usable licensing and verified realism/LOD data. Free-label Fab palms with absent license details were not promoted to cleared replacements.

## Assemble the slice

Use a terrain ribbon extending roughly100–150m to either side, joining the road embankment to lower lots. Two side streets should physically descend into the lower block grid; visible curbs, retaining walls, steps and building foundations must meet that terrain. This is the missing spatial connection. Keep a bay-facing gap and preserve the broad distant-city sightline.

Compose four to six visible buildings from the apartment kit, generally two to four floors, with varied setbacks and one corner entry. Put the single masonry service block farther away. Give the camera-facing facades real depth and restrained wear; remove unseen interiors/back faces only after verifying shadows/reflections. Use selected window/door/trim modules, not a tiled bright-window material stretched over a whole cube. Mostly dark windows, a few coherent inhabited rooms and two warm shop entrances should establish occupancy.

Reuse cleared asphalt normal/roughness and author curbs, drainage seams, patched lane paint and limited damp areas. Confirm every material compiles before capture; the earlier ComponentMask/default-material checkerboard must not recur. A couple of believable near surfaces matter more than another hundred distant boxes.

## Laptop lighting and acceptance

Start with raster/DX11, cached or baked illumination for fixed architecture, and at most two nearby shadow-casting lights. Allow near facades, curb edges and the closest palms to cast shadows: the current all-batches-no-shadows setting removes important depth cues. Far skyline keeps emissive textures and no individual window lights. Test glass/foliage overdraw; use masked leaves and conservative translucency. Keep shared textures at1K/2K initially, with a single4K hero surface only if framing requires it. These are proposed limits, not a benchmark.

Render a neutral diagnostic still and the intended night still at the locked eye, then two seconds of motion. Accept only if terrain/streets connect the near road to the city, surfaces remain readable between lamp pools, architecture has actual material/detail variation, palms read naturally, and the vista survives. Only after that inspect memory/frame time and commit to the longer sequence. The presently failed native art gate remains unchanged by this shortlist.
