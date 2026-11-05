# Director Camera — Shot List

Code: `components/real-miami/director/director.ts`. Toggle: dock **Director** button or `D` key. `V` still toggles cockpit/chase exactly as before.
Diagnostics: `window.__director()` (shot, elapsed, beat interval, cut history with reasons); with `?diagnostics=1`, `window.__directorForce('<shot>')`. `?directorSeed=N` makes a sequence reproducible.

## Recovered history

The previous runtime director (`components/cruise/cameras/director.ts`, `useDirector.ts`, `CameraRig.tsx`, commit `adc7a76`) was **never removed**. It still drives the legacy `LaunchExperience` (`?experience=legacy`). It was simply never ported when the real-Miami geographic renderer (`JeepNight`) replaced the default route, which only had driver/chase. Its scheduling ideas (weighted choice, no back-to-back repeats, min/max holds, a compatibility horizon) were ported by hand. The geometry is new because the old one assumed a synthetic straight module road. The UE `docs/cruise/world-first/director` (`63012c2`) is an offline Unreal render, not runtime code. The legacy files are untouched.

## Shots

| # | Shot | Rig | Lens (horizontal FOV) | Motion | Hold | Notes |
|---|---|---|---|---|---|---|
| 1 | **Aerial** (establishing) | follows car, 34–48 m up, 55–73 m back, ocean side preferred | 36° | slow drift outward and in | 3–4 bars | Opens every episode; returns after ≥6 other shots |
| 2 | **Long lens** side track | parallel to car, 11–24 m off (ocean side first) | `2·atan(4.1/L)` ≈ 19–40° | subtle handheld | 2–3 bars | Buildings compress behind the car |
| 3 | **Low front** ¾ | 6–10 m ahead, 0.55 m high, road-centre side | 54° | car pushes toward lens; handheld | 2–3 bars | Rejected if traffic within 22 m ahead |
| 4 | **Roof mount** | locked to car, above roof | 74° | rigid | 2–3 bars | Horizon steady, street rushing |
| 5 | **Windshield** | locked 2.7 m ahead of bumper, looking in | 38° | light handheld | 2 bars | Car renders in cockpit mode: cabin and radio lit, glazing hidden |
| 6 | **Landmark pass** (locked-off) | static, Lummus Park side, facing a hero hotel | fit to facade, 38–72° | none | until car exits frame + 1 beat | Fires 2.2–5.5 s before closest approach, on a beat |
| 7 | **Rear chase** | low (0.74 m) behind, road-centre side | 60° | handheld | 2–3 bars | Taillights, street |
| 8 | **Reflection** (road-level) | 0.17 m above asphalt, ahead | 50° | none | 2 bars | Night only. Real planar reflections are not built yet (Look Bible G7) |
| 9 | **Ocean side** | static in Lummus Park ~36–46 m east, 2.3 m high | 44° | pans between hotel row and car | until exit + 1 beat | Ocean Drive only |

## Editing rules (as implemented)

- **Cut on the music.** A beat clock follows rising edges of the shared `pulse.kick`, but **only when `pulse.source === 'live'`** (real FFT of the playing station). The synthetic 112 BPM "groove" fallback is not music, so cuts fall back to time when analysis isn't available. The interval is the median of the last nine beats; cuts land on an estimated bar boundary (every 4th beat) or on a strong-phrase event. Slow songs hold longer automatically. Holds are clamped to 4–12 s (×1.4 with reduced motion).
- **Sequence**: open on an aerial; weighted choice that never repeats the previous shot and down-weights its category; landmark passes pre-empt on a beat; an aerial returns after six shots.
- **Hard cuts only**, no whip pans or snap zooms. Handheld is two low-frequency sines at 2–4 cm.
- **Safety** (every cut is logged with its reason): the camera is never inside an OSM footprint (0.3–0.6 m margin); line of sight to the car is checked at 8 Hz against extruded footprints (cut after 0.35 s blocked); a non-fixed shot that loses the car for 0.6 s cuts; fixed shots cut if the car never enters within 6 s; front shots cut if traffic closes within 16 m.
- **Ads**: fixed shots reject a look target within 12–14 m of any ad placement. While directing, **ad measurement and the HUD ad cue are off**. Director frames never generate world exposure or impressions.
- **People**: crowd paths that could cross the park cameras sit 21 m east of the road, behind the landmark-pass camera (~13 m). No shot targets a person.
- **Portrait**: vertical FOV is capped at 64° (side crop, like vertical video). The framing check uses the effective FOV.
- **Letterbox** 2.39:1 is CSS only, landscape only, on by default and toggled with the `2.39` button. **Title card**: station plus BUENA ONDA CRUISE, fading after 3 s. The HUD recedes after 3 s idle.
- **Tiers**: low drops Reflection and Ocean side, plus grain and streak.

## Known limits

- Footprint line of sight ignores palms, poles, awnings and traffic, so a brief occlusion by a palm trunk is possible.
- Bar alignment is estimated (downbeat unknown); some cuts will land on beat 1 of a different bar phase than a human editor would pick.
- No depth of field yet (tier-gated DOF was specified; not built, to protect the mobile budget).
