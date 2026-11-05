# Third-party sources — Buena Onda Cruise (real-Miami experience)

Only sources actually shipped or adopted in code are listed. Pre-existing entries come from the 2026-10-13 handoff; entries marked **new** were added in the Opus launch pass.

| Source | What | License | Where |
|---|---|---|---|
| **new** Quaternius: "Man", "Man in Long Sleeves", "Man in Suit", "Woman", "Woman in Tank Top", "Woman in Dress" (via poly.pizza) | 6 animated sidewalk characters + shared clips (Idle, Walk, Run, Clap) | CC0 1.0 | `public/real-miami/people/` (provenance: `LICENSE.txt`, `docs/cruise/npc/ASSETS.md`) |
| Lamborghini Countach 5000QV, Randomness / @throwbackthursdaymodels (Sketchfab) | hero car, exterior + cabin | CC BY 4.0 | `public/real-miami/vehicle/countach-1988/` |
| Wrangler Jeep 2012, funassets (Sketchfab) | preserved fallback vehicle | CC BY 4.0 | `public/real-miami/vehicle/` |
| Fiero GT / Cadillac Eldorado sources | selectable cars | CC BY 4.0 (per in-app credits) | vehicle folders |
| OpenStreetMap contributors | roads, footprints, coast, landmark footprints (incl. new The Leslie, way 380861927) | ODbL 1.0 | `public/real-miami/miami/world.json`, `landmarks.json` |
| Poly Haven (Dimitrios Savva et al.) | asphalt, plaster, paving | CC0 | `public/real-miami/materials/` |
| three-mesh-bvh 0.8.3 | ad-visibility ray acceleration | MIT | npm, `public/real-miami/miami/advertising-bvh-LICENSE.txt` |
| three.js examples: SkeletonUtils, BufferGeometryUtils, EffectComposer, FXAA | runtime utilities | MIT (three.js) | npm `three@0.170.0` |
| **new** @gltf-transform/cli 4.1.1 | offline NPC GLB cleanup only (not shipped) | MIT | build-time tool, run outside the repo |

Not used: nothing was copied, ported or adapted from `oh-ashen-one/spider-man-2` (view-only license). `dgreenheck/tidewater` and `dgreenheck/ez-tree` are evaluated candidates only; neither is integrated yet. No Fab / Beach City Modular Pack content is used (not purchased; look reference only).
