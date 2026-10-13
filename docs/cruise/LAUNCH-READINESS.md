# Buena Onda Cruise — Launch readiness (2026-10-13)

Branch `opus/p0-cinematic-20261013` (cut from `experiment/miami-cockpit-ads-20261013` @ `ede1dbd`). **Not merged back, not deployed.** Target: before 2026-11-19.

## Status by phase

| Phase | Item | State | Evidence |
|---|---|---|---|
| P0 | Director Camera (9 shots, music-locked cuts, safety) | built, measured | `docs/cruise/SHOT-LIST.md`, `docs/cruise/opus/director-gallery/`, `perf-final/` |
| P0 | Look pass v1 (night palette, pastel frontage, street wash) | built | `docs/cruise/LOOK-BIBLE.md` §5 |
| P0 | 5th landmark: The Leslie | built | `docs/cruise/opus/dev-leslie-1/` |
| P0 | NPCs: 16 people, 9 vignettes | built, A/B measured (desktop) | `docs/cruise/opus/perf-npc-park-*` |
| P0 | Quality tiers (auto + override) | built | `lib/real-miami/quality.ts` |
| P1 | Live cruisers counter | built; observed live once ("1 cruising now"), then not within 6 s on a second load | `docs/cruise/presence/README.md` |
| P2 | Now Playing + Save a Song | pre-existing (handoff); untouched | handoff §3 |
| P2 | Recommend a Record | **not built** | — |
| P3 | Share the drive (`?station&at&time&cam`, native share / clipboard) | built, verified headless | `docs/cruise/opus/share/` |
| P3 | Open Graph image | built (Director frame of the Colony) | `public/real-miami/og/cruise-colony-night.jpg` |
| P4 | Founding ad locations / CLAIM THIS SPOT | **not started**: visibility at launch is Luis's call | — |
| P5 | Analytics: Director time | Director reported as `cinematic: true` (camera `chase`) to the existing analytics hook | `CampaignBridge.tsx` |
| P5 | 10-minute mobile stability gate | emulation only (see report); **physical device not run** | `docs/cruise/opus/stability/` |

## Decisions needed from Luis

1. **Cockpit trade-off.** In the cockpit, parked in front of the night Clevelander crowd (6 people animating), desktop FPS goes from 49.6 to 48.6. In moving cockpit runs at the baseline position it was 51.1 vs the 49.9 baseline. Accept, or cap crowd animation while in the cockpit?
2. **Ads at public launch:** keep the current house billboards and the discreet cue visible, or hide them? Nothing was changed.
3. **Presence on the production Supabase project:** local test tabs joined the real `cruise:presence` channel (no DB writes, nothing persisted). OK to keep it enabled for local runs?
4. **Merge** `opus/p0-cinematic-20261013` into `experiment/miami-cockpit-ads-20261013`?
5. **Beach City references:** drop screenshots into `docs/cruise/refs/beach-city/` to finish the Look Bible matrix.

## Not done / blockers

- Physical iPhone/Android testing, iOS Safari audio, and hidden-tab behavior: unverified (needs a device; hidden-tab was already unverified in the handoff).
- Look gaps G4–G11 (props, park lighting, parked cars, wet reflections, windshield-shot exposure, ocean, black asphalt between pools).
- Director: no depth of field; footprint-only occlusion ignores palms and traffic.
- Recommend a Record (P2.3) and Founding ad locations (P4).

## How to run (separate dist dir and port; never 3066 or 3062)

```powershell
$env:CRUISE_DIST_DIR='.next-opus-check'; npm run build; npm run start -- -p 3067
node scripts/opus-capture.mjs --url http://127.0.0.1:3067 --label check --views driver,chase,director --fps 20
node scripts/opus-stability.mjs --url http://127.0.0.1:3067 --minutes 10 --modes director,driver
```
Handoff regression tests run against any URL with `$env:CRUISE_TEST_URL`. They overwrite `docs/cruise/miami-ads/*`, so copy the outputs elsewhere and `git checkout -- docs/cruise/miami-ads` afterwards (as done for `docs/cruise/opus/regression/`).

## Deployment

Not performed. When authorized: merge to the experiment branch, run the full build plus the four handoff regression modes, then use the existing Vercel flow in `docs/cruise/PRODUCTION-RELEASE.md`. Keep `?experience=legacy` and the non-default campaigns on the legacy path.
