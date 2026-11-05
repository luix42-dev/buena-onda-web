# Handoff acknowledgment — Opus 5.5

Date: 2026-10-13. Read in full: `docs/cruise/HANDOFF-OPUS-20261013.txt` (329 lines) and `AGENTS.md`.

## Worktree state at start

- Worktree `cruise-brand-integration-20261013`, branch `experiment/miami-cockpit-ads-20261013`.
- `git status`: clean. HEAD `ede1dbd` (handoff-only), app checkpoint `947fa0d`, prior `f2f463f`.
- Port 3066: `next start -p 3066` from **this** worktree (pid 22456) — the current optimized build.
- Port 3062: `next start` from `cruise-publish-20261006` (pid 7800) — the La Sala casting session. **Not touched.**
- 3064/3065: not listening.

## Protected files and behavior (as understood)

Routing / separation
- `app/(site)/cruise/page.tsx` (`?mode=video`, `?mode=minimax-test` preserved)
- `app/(site)/cruise/CruiseClient.tsx` (default campaign → RealMiami; `?experience=legacy` and non-default campaigns → `components/cruise/LaunchExperience`)
- `components/real-miami/CampaignBridge.tsx` (exposure vs HUD presence clocks, click routing, 6 s retained cue)

Cars / cockpit / radio
- `components/real-miami/jeep/Countach.tsx` + `public/real-miami/vehicle/countach-1988/countach.glb` (converted metal-rough runtime GLB; do not swap back to the spec-gloss original). Rotate Y −π/2, length 4.14 m, ground +0.015 m, only `Meshpart24Mtl` hidden in cockpit.
- `EightiesCar.tsx` (Fiero GT 1987), `ClassicConvertible.tsx` (Cadillac Eldorado Biarritz 1959), `Wrangler.tsx` + assets (preserved fallback, not deleted or repurposed).
- `RidePicker.tsx`, `GarageEnvironment.tsx`, `CastControl.tsx`, thumbnails in `public/real-miami/vehicle/garage/`.
- `components/real-miami/vehicle/PhysicalRadio.tsx`, `CockpitContext.tsx`, `components/real-miami/audio/*` (incl. `useCruiseAudio.ts` tuning noise), `lib/real-miami/music-audio.ts`, `lib/real-miami/stations.ts`, `app/api/cruise/now-playing/route.ts`, `useRadioLibrary` + `RadioSongPanel` (key `buena-onda:saved-radio:v1`, 200 items).
- One shared playback owner: camera/car/garage/ad changes must never create a new station owner.

World / ads
- `components/real-miami/miami/MiamiWorld.tsx`, `MiamiMap.tsx` (OSM attribution stays), `CruiseGlow.tsx`, `MiamiLandmarks.ts`, `lib/real-miami/miami-geo.ts`, `public/real-miami/miami/world.json`, `landmarks.json`.
- `lib/real-miami/advertising.ts` (MB-HOUSE-001/002/003 coordinates, stable MB-ROUTE-* IDs), `MiamiAds.tsx` (private BVHs, blocker diagnostics), `DiscreetAdCue.tsx`, `ad-cue.module.css`.
- `three-mesh-bvh@0.8.3` direct pinned dependency + `public/real-miami/miami/advertising-bvh-LICENSE.txt`.
- Strict world exposure (4 Hz, 10 headline rays, 2 s continuous) stays **separate** from the HUD readability policy (≥64×24 px, facing ≥.35, area ≥.003, ≥half probes clear, ≥750 ms). Cockpit link visibility never counts as a billable impression.
- Diagnostics: `window.__jeepNight()`, `__miamiGeo()`, `__miamiAds()`, `__miamiInspect(m)` with `?diagnostics=1`.
- Evidence: `docs/cruise/miami-ads/*` including historical failures (`after-bvh-original-hud-results.json` exit1, `hidden-results.json` exit1). Not deleted or rewritten.

Do-not-run / do-not-touch
- `scripts/sync-real-miami.mjs` — not run.
- `cruise-publish-20261006` (original checkout) and `cruise-miami-geo-20261012` (older geo experiment, port 3062).
- No deploy, purchase, paid API, engine migration, destructive git/file cleanup.

## Asset licenses

| Asset | Source | License |
|---|---|---|
| Countach 5000QV | Sketchfab, Randomness / @throwbackthursdaymodels | CC BY 4.0 (attribution in UI + folder) |
| Wrangler Jeep 2012 | Sketchfab, funassets | CC BY 4.0 |
| Fiero GT / Cadillac | provenance files in their vehicle folders (to re-check in audit) | per folder |
| Asphalt | Dimitrios Savva / Poly Haven | CC0 |
| Plaster, paving | Poly Haven | CC0 |
| Geography | OpenStreetMap contributors | ODbL 1.0 |
| three-mesh-bvh 0.8.3 | npm | MIT |

## Camera positions (Countach, `COUNTACH_CAMERA_PROFILE`)

- Driver `[-.34,.79,.15]`, portrait `[-.27,.80,.22]`; target `[-.34,.59,-3.2]`, portrait `[-.27,.57,-3.2]`.
- Chase `[-1.0,2.1,7.2]`, portrait `[-.5,2.4,8.2]`, target `[0,.56,0]`.
- Radio close-up camera `[0,.91,.02]` → target `[0,.72,-.48]`; FOV 34 desktop / 55 portrait.
- PhysicalRadio `[0,.72,-.48]` scale .60; spectrum `[0,.665,-.442]`. The old .58 / 14 cm-lower position is NOT to return.
- Driving FOV: driver 62 (portrait 90), chase 58 (portrait 64); landmark view 58/70.

## Preview startup (from handoff)

```powershell
$env:CRUISE_DIST_DIR='.next-miami-ads-check'; npm run build; npm run start -- -p 3066   # only if 3066 isn't already serving it
$env:CRUISE_DIST_DIR='.next-miami-ads-dev';   npm run dev -- -p 3065                   # development, separate dir/port
```
Heavy builds sequential (Windows memory). Never mix dev/build output with an actively served dir.

## Baseline numbers (headless Edge/D3D11, 20×1 s samples)

Desktop 1280×720: driver mean 47.80 / min 31.86; chase 56.50 / 49.61. Portrait 390×844: driver 58.81 / 38.85; chase 59.92 / 59.02. Hidden-tab suppression UNVERIFIED.

## Conflicts between the handoff and the launch prompt

1. **Servers.** The prompt makes "running servers" a hard stop; the handoff gives server commands and all tests need one. Measuring NPCs/Director/look against baseline is impossible without building and serving my changes. → Asked Luis for authorization to use a separate dist dir + port (not 3066, not 3062).
2. **Director Camera was never removed.** It still lives at `components/cruise/cameras/{director.ts,useDirector.ts,CameraRig.tsx}` (commit `adc7a76`), used by the legacy `LaunchExperience` (`?experience=legacy`). It was simply never ported into the real-Miami `JeepNight` renderer, which only has driver/chase. The UE "director" in `docs/cruise/world-first/director` (`63012c2`) is an offline Unreal render, not runtime code.
3. **Landmarks.** Handoff: Colony, Breakwater, Clevelander, Carlyle exist. Prompt adds The Leslie (not built) and Lummus Park edge.
4. **`30-BuenaOnda/cruise-spec.md`** not found in the workspace or `D:\Cerebro\30-BuenaOnda`.
5. **`docs/cruise/refs/beach-city/`** does not exist yet — the Look Bible gap matrix will compare against real-world notes and current frames until Luis adds screenshots.
6. **`app/(site)/about/page.tsx` uncommitted edit** is not in this worktree (tree is clean); it must belong to another checkout. Will not touch it anywhere.
7. **"Orchestrator"** is not a named tool here; delegation will use the Agent tool with real model identifiers logged.
