# Cruise TV Asset Ledger

## Launch update — September 2026

The historical entries below describe earlier checkpoints. The launch adds no purchased/generated asset collection. It reuses these local resources:

- Coastal Coupe: RX-7 asset documented below, CC BY 3.0; public in-app credit remains accessible from the garage. Launch paint and windshield/cockpit geometry are local modifications.
- Classic Coupe: `public/cruise/vehicle/gto-candidate/gto-low.glb`, “Pontiac GTO 67” by thecali, CC0 via Benedikt Bitterli's rendering resources. Adjacent `LICENSE.txt` and `manifest.json` are retained; public credit is shown in the garage.
- Skyline/coastal GLBs: the existing project manifest `public/worlds/higgs/asset.json` attributes these adaptations to Quaternius Downtown City MegaKit, CC0. `scripts/cruise-blender-skyline.py` identifies `Metal_FullWindow.gltf` as its source. This is inherited project provenance; the original source archive is not re-downloaded or independently audited in this milestone. Coastal models are fetched by the retained loader but have no placements in the launch route.
- Palm Tree v2 by Yughues/Nobiax: existing `yughues-provenance.json` records CC0, source, processing and hashes. Launch beach palms currently use the procedural fallback; the retained authored loader still fetches its bounded cached resource.
- Road: existing Asphalt 02 aggregate crop, Rob Tuytel / Poly Haven, CC0, sourced from `https://polyhaven.com/a/asphalt_02`; evidence is in `public/worlds/higgs/asset.json`, the adjacent Asphalt 02 provenance, and `scripts/cruise-blender-asphalt.py`.
- The retained sunset component still fetches `belfast-sunset-1k.hdr` although launch selects only day/night procedural skies. It is not used as a new launch mood.
- Radio now retains the already-enabled Buena Onda catalog, Jolt, NTS 1 and NTS 2. Poolsuite remains an external link. Third-party streams are listener playback, not an assertion of affiliation, sponsorship or rebroadcast rights.
- Launch thumbnails are original local SVG silhouettes. House ads are static canvas typography from the existing campaign manifest. No AI asset generation was used.

See `LAUNCH.md` for validation and release limitations. `launch/runtime-assets.json` records the exact shipped local asset hashes.

## Hero vehicle: Mazda RX-7

- Source: [Mazda RX-7 by IvOfficial on Poly Pizza](https://poly.pizza/m/SnIoWlh7S2)
- Original GLB: [Poly Pizza download](https://static.poly.pizza/69f2fddf-f111-4baf-93be-24ba26111602.glb)
- License: [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/)
- Required attribution: `"Mazda RX-7" by IvOfficial, licensed under CC BY 3.0, via Poly Pizza.`
- Local file: `public/cruise/vehicle/rx7-fc-optimized.glb`
- Source size: 1,360,144 bytes (1.30 MiB)
- Optimized size: 329,392 bytes (0.33 MB); Meshopt compression using glTF Transform 4.5.0.
- Geometry: 19,720 triangles, 12 nodes, 10 meshes
- Measured bounds: 4.320 m long, 1.793 m wide, 1.274 m high

The distributed GLB is quantized and Meshopt-compressed without flattening or
joining the separately animated wheel nodes. The initial general optimization
pipeline joined wheels and was rejected. Reproduce the retained pipeline with
`gltf-transform meshopt source.glb rx7-fc-optimized.glb` (CLI 4.5.0).
At runtime, Buena Onda replaces the
source materials with a pearl-silver clear-coat finish, tinted glass,
dark trim, warm lamps, and silver wheels. Four source wheel groups are animated
independently. The cabin behind the source model's opaque glazing was empty, so
the integration adds an original dashboard, instruments, steering wheel, center
console, and tan seats in application code. No third-party game assets are used.

`docs/cruise/reference/rx7-fc-source-preview.jpg` is the source preview retained
for visual provenance. It is not served as part of the app. Original textured
trim and taillights are retained. Public credits are in Cruise Settings > Credits.

## Original environment and cockpit

Road aggregate, all five world families, authored transition geometry,
skyline layers, hotel/tower/storefront facades, palms, lamps, signs, bridge and
overpass structures, water, traffic vehicles, pedestrian impostor atlas, rain,
sky/environment maps, cockpit displays and contact shadow are generated from
project-owned code.
No external environment textures, HDR service, paid assets, or font downloads
outside the existing Next font infrastructure are required at runtime.

The compact car and environment intentionally share simplified geometry with
PBR materials. This checkpoint does not claim photographic or AAA fidelity.

## Radio

The sole enabled station reuses the existing, operational Buena Onda catalog at
`/api/radio/tracks`, backed by the site's existing R2 configuration. No audio
files were copied into this worktree and no new music source was introduced.
Playback was verified against the real catalog. Track-level rights metadata is
not present in this repository; this change does not assert new music clearance.
Vice Nights, Onda Tropical and Natsu Service remain disabled in the manifest.
