# Ads v2: lots of ads, without clutter

Luis decided on 2026-10-13 that ads are visible at launch, with billboards, video projections on buildings and many more placements, as long as they don't clutter the drive.

## Built
- **Four world surfaces** (`lib/real-miami/advertising.ts`, `components/real-miami/miami/MiamiAds.tsx`):
  - **billboard**: roadside, open ground only. It now appears every 440 m instead of every 520 m.
  - **poster**: the existing OSM ad plots.
  - **projection**: a video or motion loop projected onto a real OSM facade that faces the route. It uses additive light with a soft-edge mask, so the windows show through. It appears at night only and fades out by day. Only street-facing walls at least 14 m long on buildings at least 12 m tall qualify.
  - **blade**: a vertical neon sign mounted perpendicular to a facade and facing oncoming traffic, in the Ocean Drive and Beach City style.
- **Clutter budget** (`AD_BUDGET`):
  - Any two world ads are at least 55 m apart.
  - Projections are at least 240 m apart, blades at least 130 m apart and billboards at least 180 m apart.
  - Caps are 18 projections and 36 blades.
  - No ad is placed within 70 m of a hero landmark (Colony, Breakwater, Clevelander, Carlyle, Leslie), so Director hero shots stay clean.
- **Motion rule**: only the nearest framed projection plays. The others hold a dim still. Each campaign shares a single `<video>`. Low quality tier and `prefers-reduced-motion` fall back to the motion poster or still.
- **Campaign rotation**: the featured campaign holds every other slot and the rest of the active roster rotates through the others. Every second projection goes to a campaign that has a real video (currently only Vice Nights).
- **Measurement**: projections and blades report as analytics format `wall` and keep the existing strict viewability and readability rules. A projection never counts as visible when the night blend is below 0.3. Additive projection light is excluded from the occlusion rays.
- **Presence**: production keeps `cruise:presence`. Local and preview runs join `cruise:presence:<env>`, so dev tabs no longer inflate the live count. This relies on `NEXT_PUBLIC_VERCEL_ENV`, which Vercel exposes by default.

## Verified
`node scripts/opus-ads.mjs --label ads-v2 --per 2 --fps 15` was run against a production build on 127.0.0.1:3067 in headless Edge with D3D11 at 1280x720, chase camera, night. The raw data is in [results.json](results.json).
- **Roster**: 55 placements over the 19.6 km route: 3 posters, 10 billboards, 14 projections and 28 blades. Six campaigns rotate.
- **Placement**: about 220 ms to generate in Node, once per drive rather than per frame.
- **Captures**: a projection on Collins Avenue reached viewable at 57 m, and Ocean Drive blades and billboards render as intended. The HUD companion cue fires for the projection.
- **FPS**: driving through the Collins stretch at the high tier, mean 60.0 and minimum 59.0 over 15 one-second samples.
- **Tests**: `tests/miami-ads.test.ts` checks the minimum gap, the caps, the landmark clear zones, stable ids, rotation and motion campaigns on projections. 3 of 3 pass. `tests/presence.test.ts` passes 6 of 6, and `tsc` is clean.

## Not verified / limits
- **Readability**: no projection or blade reached strict `readable` in these parked frames. Blades are only 20–28 px wide at 43–52 m. They work as ambient signage plus the HUD cue, not as readable world impressions. Do not sell blades as readable impressions.
- **Video content**: only Vice Nights has a video. Every other campaign uses the canvas motion poster, so more campaign loops are needed for real video variety.
- **Cockpit and mobile**: cockpit FPS with ads v2 and real phone performance were not measured.
- **Console errors**: four 404s and one connection timeout appeared during the run. They were not attributed to this change and are still to be checked against the 3066 baseline.

## Next
Add more campaign video loops. Do a readable-size pass on blades, either wider blades or a closer setback on Ocean Drive. Measure cockpit FPS with `opus-capture --views driver --fps 20`.
