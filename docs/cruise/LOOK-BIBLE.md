# Buena Onda Cruise — Look Bible v1

Author: Opus 5.5 (visual direction), 2026-10-13. Applies to the real-Miami `/cruise` experience.

**Reference status — read first.** `docs/cruise/refs/beach-city/` does not exist yet; no Beach City Modular Pack screenshots were provided, so this bible does **not** claim a side-by-side match against that "finish" target. Accuracy comes from the existing landmark registry (OSM footprints + cited hotel/preservation sources) and public knowledge of Ocean Drive. When Luis adds the screenshots, fill §5's "reference" column and re-score the gaps.

## 1. Palette

| Use | Hex | Notes |
|---|---|---|
| Oceanfront pastels (random per OSM building, ×0.82 in vertex color) | `#f2c4c8` `#bfe2d4` `#f3e1a4` `#cec3e5` `#b8dbe9` `#f5d0ad` `#eef0e4` `#f6d9e4` | pink, mint, lemon, lilac, aqua, peach, bone, blush |
| Inland blocks | HSL(0.055–0.135, 0.16, 0.56) | sun-bleached neutrals so the oceanfront reads as the event |
| Trim white | `#fbf6e6` / `#fcf3de` | eyebrows, cornices, parapets |
| Colony | wall `#ece9db`, neon `#6cb9ff` | registry |
| Breakwater | wall `#efece0`, trim `#4279a9`, accent `#ead585`, neon `#75c9ef` | registry |
| Clevelander | wall `#eee8dc`, neon `#ff56c4` | registry |
| Carlyle | wall `#e9eee7`, trim `#9bc8bc`, neon `#ebadbd` | registry |
| The Leslie (new) | wall `#f1d35a`, trim `#fbf6e6`, accent `#e1a43c`, neon `#7fd8ff` | approximate |
| Sidewalk | `#bab5a4` + Poly Haven paving | |
| Asphalt | `#89949c` × clean-asphalt map, wetness roughness map | |
| Sky, sunset | top `#2c2f7a` mid `#d0548f` horizon `#ff8f52` sun `#ffb25e` | unchanged |
| Sky, night (v1) | top `#03070f` mid `#0d1a33` horizon `#3d2a3f` | was `#060a24` / `#1b1d4f` / `#4a2d63` |
| Fog, night (v1) | `#141a27`, 70→420 m | was `#231f45` |
| Hemisphere, night (v1) | sky `#3e5070`, ground `#5b3b24`, 0.58 | was `#5562a8` / `#20182c`, 0.5 |
| Moon key, night (v1) | `#8ea4c6`, 0.32 | was `#7d8fd8`, 0.35 |

Previous night values are recorded above so the change is reversible in one edit (`components/real-miami/master/StreetSky.tsx`).

## 2. Lighting recipe

- **Night key** is a weak steel-blue moon from the ocean side; **fill** comes from the ground (sodium bounce `#5b3b24`), not from a violet sky. This is the single biggest change: v0 lit everything navy-violet.
- **Street wash** (new, `applyOceanDriveFacade`): every facade, including the five landmarks, gets an emissive warm wash `(1.0, .68, .42) × night × (0.3 fading out by 8.5 m + 0.04)`. This reads as cafe light and uplights pooling on the ground floor, with no extra lights or passes.
- **Neon**: landmark neon emissive 0.2 → 2.0 with night; generic neon strips 0.15 → 1.3. Bloom threshold in `CruiseGlow` stays `smoothstep(.45, 1.3, luminance)`.
- **Streetlights**: warm `#fff1cf` heads; pooled light decals at 0.2 × darkness.
- **Exposure**: ACES, 1.25 at night, 0.95 at sunset (unchanged).
- **Director grade** (Director mode only, faded in over ~0.3 s): teal/steel shadows `×(.82,.98,1.1)`; night highlights sodium/magenta `+(.05,.012,.03)`; sunset highlights warm gold `+(.06,.03,-.025)`; blacks crushed by 1.2 %; vignette 42 %; grain 3.5 % (high/medium tiers); horizontal anamorphic streak on bright neon (6 taps, high/medium tiers).

## 3. Material notes

| Surface | Target |
|---|---|
| Stucco | roughness .88–.94, plaster normal at .25, color pinned 85 % to the painted tint (weathering, not concrete) |
| Glass | roughness .12–.19, metalness .18–.38, interior room drawings emissive at night (landmarks) |
| Asphalt | roughness .92 with wetness roughness map, envMapIntensity 1.6 (enhanced look) |
| Chrome / trim metal | `#c4bba4`, roughness .43, metalness .4 |
| People | one shared vertex-color material, roughness .78, faint warm emissive at night (.22 × night) |

## 4. Street dressing list

| Item | Status |
|---|---|
| Palms on Ocean Drive's park side | existing (procedural, instanced) |
| Streetlights + light pools | existing |
| Storefronts, awnings, cafe signage | existing (`MiamiStreetDetail`) |
| Traffic | existing (2 classic cars) |
| People (12–20) | **new**: 16 people in 9 vignettes |
| Planters, cafe tables/umbrellas, valet stands, bollards | not built (gap G4) |
| Lifeguard tower | not built (gap G5); the beachgoer is placed where one would be |
| Parked period cars | not built (gap G6) |

## 5. Gap matrix (current frame vs. target)

Matched frames: `docs/cruise/opus/baseline-3066/1280x720-chase.png` (before) vs `docs/cruise/opus/perf-final/` and `dev-look-1/1280x720-chase.png` (after), route 17.5 m, Countach chase.

| # | Gap | Before | After v1 | Status |
|---|---|---|---|---|
| G1 | Night reads as uniform navy/violet; pastels lost | yes | steel sky, warm bounce, pastels visible | **closed** |
| G2 | Landmarks gray against neighbors at night | yes | landmarks share the street wash | **closed** |
| G3 | Only 4 hero landmarks | 4 | 5 (The Leslie added) | **closed** |
| G4 | Sidewalk props (tables, umbrellas, planters) | none | none | open |
| G5 | Lummus Park / beach is unlit black from aerials | yes | yes | open (needs palm uplights or path lamps) |
| G6 | No parked period cars or valet stands | yes | yes | open |
| G7 | Wet-street reflections at night | roughness-only sheen | unchanged | open (planar reflector, hero corridor only, is the plan) |
| G8 | Car body very dark in the windshield shot | n/a | dark | open (needs a front fill or exposure lift for that shot) |
| G9 | Ocean / Atlantic horizon | flat colored plane | unchanged | open (tidewater, MIT, is the candidate) |
| G10 | Beach City "finish" comparison | n/a | no reference supplied | blocked on screenshots |
| G11 | Asphalt between streetlight pools reads pure black from low/fixed shots | yes | yes | open (lift road albedo at night or add wider/softer pools) |
