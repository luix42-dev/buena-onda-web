# Vehicle direction prototype

Owner: `/root/performance`, Agent B (Codex based on GPT-6; exact variant not exposed). Only `ConvertibleCar.tsx` was edited for the vehicle prototype. Original `/cruise` remains untouched.

## Built

The default convertible now reuses the existing licensed RX-7 shell (`rx7-fc-optimized.glb`, IvOfficial, CC BY 3.0; see `docs/cruise/ASSETS.md`) instead of the traffic LOD. It is rotated toward -Z and scaled 1.02, retaining the existing cockpit, radio and camera anchors. Glass is removed and the roof is clipped above the belt. The source texture atlas, shaped fenders, wheels and rear light panels are retained. No asset purchase or dependency installation was required.

The cabin filter now removes a triangle only when all three vertices fall inside the cabin cutout. The old centroid test could delete a long hood triangle crossing the cutout boundary. Wheels are excluded from cabin trimming. The old classic-car hood ornament was removed because it floated above the lower sports-car hood.

## Independently verified geometry and pixels

CPU decoding of the existing Meshopt GLB found the front painted geometry below Y=0.902, safely below the 1.08 clipping plane. None of the sampled front triangles lay entirely above that plane. The old centroid filter removed 12 long front-body triangles; the all-vertices criterion preserves them. The lower RX-7 hood is nevertheless hidden behind the existing high cowl in the driver camera. This is a proportion/fit limitation, not evidence that the entire hood is missing.

Agent B opened all six actual final views: [chase](functional/car-chase.png), [driver](functional/car-driver.png), [side](functional/car-side.png), [aerial](functional/car-aerial.png), [low](functional/car-low.png), [hood](functional/car-hood.png).

Verdict: **a meaningful exterior-shape improvement, but a founder-direction prototype rather than a polished replacement**. Rear lights, shaped fenders and sloping nose are more convincing than the earlier rectangular traffic shell. The actual hood is present, and the radio remains framed in the cockpit. However, tall flat leather door panels protrude above the lower body; the windshield and rear seat proportions also expose the mismatch between the old cabin and the sports shell. Side and aerial views are the clearest failures. It is not convincing from every angle.

Lowering only door panels/rails could reduce one mismatch without moving the radio or eye point, but would not finish the windshield/cowl/seat integration. No speculative extra geometry or fake hood cap was added. Founder direction review should precede another proportion pass.

## Rendering cost: measured asset counts, no causal FPS claim

These counts come directly from GLB JSON primitives/accessors before runtime trimming:

| Source shell | Meshes | Material primitives | Source triangles | Visible primitives after glass removal |
|---|---:|---:|---:|---:|
| Classic traffic LOD | 1 | 5 | 18,943 | 4 |
| RX-7 | 10 | 18 | 19,720 | 17 |

RX-7 primitives: eight `Miscs`, three `Body_paint`, four `Rims`, one `Black_matte`, one `Glass`, one `Emission.001`. Per-mesh cloned materials mean the shell can add approximately 13 visible draw calls despite a similar triangle count. A future static merge by compatible material could reduce 17 to roughly five visible body draws, preserving the atlas and clipping, but **no merge was implemented or benchmarked in this pass**.

The lead observed a much larger night-FPS regression during the broader feedback integration. These asset counts alone do not establish its cause. Simultaneous browser rendering and world changes must be controlled before attributing the regression to the car, palm batching or map length. No claimed FPS recovery or regression is assigned to an unisolated cause here.

## Map-size context

Source comparison supports the user's sense that the original map was larger: Original Cruise defines 36 modules of 64 m, totaling 2,304 m across South Beach, causeway, downtown and MiMo; the prior Miami test loop covered 210 m of one corridor. This is a source-level comparison of route definitions, not proof that every visible part of either route is unique. The route extension is owned and validated separately by the lead/map agent.

## Status

License provenance rechecked October 10, 2026: the [current Poly Pizza source page](https://poly.pizza/m/SnIoWlh7S2) identifies IvOfficial and Creative Commons Attribution. The existing repository asset ledger records version 3.0; [CC BY 3.0 terms](https://creativecommons.org/licenses/by/3.0/) permit commercial adaptation with attribution, license reference and identification of changes. The current page's plain-text extraction did not independently expose the version number. No new asset was downloaded.

- Implemented: reversible RX-7 exterior adaptation and safe triangle retention.
- Verified: original asset counts, hood-height diagnosis, six-view screenshot review and preserved radio framing.
- Failed: convincing cabin/body fit in every camera.
- Next: founder review of the sports-convertible direction, followed by a bounded proportion pass if accepted.
- Not verified here: physical devices, all-angle touch interactions, isolated car-only sustained FPS, production deployment.
