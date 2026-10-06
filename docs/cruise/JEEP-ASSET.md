# Island Trail original vehicle

`island-trail` is an original, component-built late-eighties-inspired open-top off-roader. It is not an authentic Jeep model, licensed Jeep product, or branded reconstruction. The production name is **Island Trail**; the original wordmark, eight-opening grille, and coastal stripe treatment carry no Jeep marks.

## Source decision — 2026-10-05

The existing GLBs were inspected before authoring: `rx7-fc-optimized.glb` (329,392 bytes, 10 meshes), `gto-candidate/gto-low.glb` (1,941,060 bytes, 15 meshes), and `experiments/vehicle-lab/bmw-m6.glb` (10,492,292 bytes, 113 meshes). They are coupes and were not used as the off-roader's exterior or dashboard.

Exactly two external model candidates were reviewed:

| Candidate | Published licensing evidence | Decision |
| --- | --- | --- |
| [Jeep Wrangler (Mk1)(YJ) 1987 — Nieve5677](https://sketchfab.com/3d-models/jeep-wrangler-mk1yj-1987-fe6a76fe0b234b879f0f11c14ac0282b) | Listing identifies Creative Commons Attribution, 1.4 million triangles and 1 million vertices. Sketchfab's [official download guidance](https://sketchfab.com/developers/download-api/guidelines) requires authenticated downloads. | Not downloaded or incorporated. Too heavy as a direct runtime asset; no authenticated source available in the session. |
| [Jeep — Alex Safayan](https://poly.pizza/m/4gOfX6DR4yG) | The original listing identifies Creative Commons Attribution and describes a model made with Blocks; Poly Pizza [credits](https://poly.pizza/l/fL7LhqoSKl/credits) name CC-BY 3.0. | Not downloaded or incorporated. Its block-art treatment does not satisfy the close seated-camera detail requirement. |

The supplied photographs `01_front_three_quarter_full.jpg`, `02_side_profile.jpg`, `08_interior_dash.jpg`, and `09_interior_seats.jpg` were viewed as proportion and material references. No photograph, logo, image crop, traced texture, or third-party geometry is included in the new asset. No paid generation or paid download was used. No new third-party asset attribution is required by the incorporated files; the application retains its existing source-code ownership and licensing.

## Implementation

- `components/cruise/vehicle/RetroJeep.tsx`: original body tub, separate front and rear wheel openings, rectangular lamps, exposed hinges/latches, eight-opening grille, steel wheels, treaded tires, spare, axles, roll hoop/braces, open windshield, mirrors, wipers, inner door panels, seats, pedals, analog instruments and shifters.
- `components/cruise/vehicle/jeepTextures.ts`: deterministic procedural vinyl/rubber grain, woven upholstery, original dial faces, climate markings, manual shift diagram and wordmark.
- `public/cruise/vehicle/jeep/manifest.json`: provenance and dimensions. The `VehicleDefinition.model` value is a metadata URI for this procedural renderer, **not a GLB**; the HeroCar dispatch must render `RetroJeep` directly.
- `lib/cruise/vehicles.ts` and `lib/cruise/launch.ts`: additive third-vehicle metadata and Salt/Lagoon/Sand paint choices. Both existing vehicles remain available.

The shallow dashboard is specific to this vehicle. `PhysicalRadio` is the shared head-unit component and reads the existing `CockpitContext`; the vehicle does not create another audio instance or reuse the coupe dash. Gauge needles reflect runtime speed. All four road wheels rotate around local X at speed/radius, the steering wheel responds to actual route curvature, and parking suppresses driving motion. Headlamps, tail lamps and gauges respond to light/day/night state.

## Coordinates and camera

Coordinates are meters in driving-local space: +Y up and -Z forward. The outer render group adds `HERO_X` only; it has no model-scale or rotation conversion.

| Anchor | Position |
| --- | --- |
| Driver eye metadata | `[-0.43, 1.73, 0.38]` |
| Driver seat cushion | `[-0.43, 0.94, 0.32]` |
| Steering center | `[-0.43, 1.31, -0.11]` |
| Radio component center | `[0.055, 1.125, -0.50]`, front +Z, scale 1 |
| Suggested radio focus camera | `[-0.28, 1.49, 0.38]`, target `[0.055, 1.16, -0.50]`, FOV about 43° |
| Front wheel centers | `[±0.855, 0.438, -1.19]` |
| Rear wheel centers | `[±0.855, 0.438, 1.15]` |
| Road wheel radius / wheelbase | `0.394 / 2.34` |

The camera rig applies metadata differences to its existing composition, so the table lists vehicle anchors rather than claiming exact final interpolated camera coordinates. The seated eye clears the seat, roofless roll cage, steering wheel and windshield.

## Bounds and resource ownership

There is no GLB download or per-frame geometry generation. Repeated tread blocks are merged into one reusable geometry, and identical rounded boxes, rods, rings and dial circles share cached geometries per mounted vehicle. Eleven small deterministic textures are created once per mount. Every geometry in the owned cache, every material and all eleven textures are explicitly disposed on unmount. Shared PhysicalRadio resources remain owned by that component.

The cabin point light and headlight spotlight remain mounted at zero intensity when off. This keeps shader light counts stable across mood changes. An isolated preflight exposed a 5,748 ms first-night frame gap with program count doubling from 34 to 68; the targeted fix preserves the visible night lighting and avoids that shader-variant trigger. Final performance evidence is in JEEP-HANDOFF.md.

Typecheck/build and the all-car functional matrix passed. Day/night cockpit screenshots, physical radio interactions and original gauge/wiper framing fixes are reviewable in `jeep-city/index.html`; the images show a stylized original interior, not photorealism.
