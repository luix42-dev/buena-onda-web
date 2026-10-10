# Buena Onda Cruise - Current Build Snapshot

> Archived pass-1 snapshot, preserved verbatim when pass 3 replaced `docs/cruise/CURRENT-BUILD.md` (the original file was never committed).

Snapshot date: October 9, 2026

## Build identity

- **Status:** PARTIAL - working playable improvement, with remaining visual and advertising acceptance gaps.
- **Repository:** `D:\10-VENTURES\12-buena-onda\cruise-publish-20261006`
- **Branch:** `experiment/cruise-miami-master`
- **Implementation commit:** `9f172e8` - Add isolated playable Miami street with radio and measured review evidence.
- **Local preview:** http://127.0.0.1:3040/cruise/miami-test
- **Rendering:** Existing Three.js / React Three Fiber inside Next.js.
- **Deployment:** Local experiment only. No production deployment, paid assets, generation credits or new recurring services.

## Built

One approximately 220-meter, gently curving coastal Miami street, with 210 meters of playable travel and an end margin. The scene uses interactive 3D geometry, not prerecorded driving footage.

- Pastel Art Deco buildings, textured asphalt, sidewalks, curbs, palms, coastline and street furniture.
- Turquoise **Buena Onda Record Store**, including record displays.
- Pink **Branches Vintage**, including clothing displays.
- Supported roadside advertising and a suspended **Vice Nights** banner. Sponsorships are clearly labeled demonstrations.
- Primary **Island Trail** vehicle with improved cockpit materials, instruments, visible physical radio and steering-wheel response.
- Existing Classic Coupe and Coastal Coupe remain selectable.
- Cockpit and chase cameras, glance controls, keyboard and touch steering, pause and restart.
- Default cruising speed of **3.5 m/s (12.6 km/h)**. Handling follows the lane with bounded lateral steering; it is not a rigid-body vehicle simulation.
- Existing radio sources and playback controls: station selection, play/pause, volume and loading/error states.
- Business discovery cards and a directory. Explore pauses driving while radio playback remains independent.
- Local exposure and interaction measurements, with visibility, angle, dimensions, occlusion and continuity checks.
- Day, sunset and night settings, plus mobile and desktop-shadow quality presets.

The original Cruise and earlier projection/cockpit experiments remain separate from this route.

## Verified

- Keyboard steering works immediately after Start; touch steering changes the vehicle's lateral position.
- Pause stops travel, both cameras work, and business details block accidental resume.
- The physical radio preset changes the selected station. NTS 1 produced actual playback events and advancing media time.
- Audio continued across camera changes and while driving was paused.
- A separate cockpit recording verified more than 55 seconds of NTS playback during approximately 185 meters of driving.
- Landscape emulation displays the road and both steering buttons within the initial viewport. Portrait radio/layout checks found no horizontal overflow.
- The final Escape-after-backdrop-click fix passed its targeted retest.
- TypeScript checks and development-route compilation passed. No page exceptions or missing scene assets were recorded in the final gameplay checks.

## Measured performance and advertising

Final runs used Edge 154.0.4258.62 on an Intel UHD Graphics 630 laptop, sunset lighting and the mobile-quality preset at renderer DPR 1. Desktop viewport: 1440 x 1000. Phone landscape emulation: 844 x 390, using the same desktop GPU.

| View | Mean FPS | Billboard exposure | Buena Onda exposure | Branches exposure |
|---|---:|---:|---:|---:|
| Desktop chase, recorded | 51.55 | 5.730 s | 4.938 s | 5.065 s |
| Desktop cockpit, recorded | 35.20 | 6.007 s | 4.648 s | 4.574 s |
| Phone emulation, chase | 56.12 | 0.267 s | 0.533 s | 0.533 s |
| Phone emulation, cockpit | 55.26 | 0 s | 0 s | 0 s |

The advertising target is five uninterrupted seconds per primary placement in both cameras. **That target is not met.** These measurements concern the approach signs, not independent facade impressions. They are conservative sampled geometric qualifications, not proof that all small text is readable. Zero means no continuous qualified interval, not that the sign never appears.

Recording adds overhead. High average FPS does not establish a sustained 30 FPS minimum. **No physical Android device was tested.** Full measurement details are in [the review package](README.md) and [the final data](review-final.json).

## Failed criteria and blockers

- The scene remains visibly stylized and modular; photorealistic visual quality has not been demonstrated.
- Some desktop storefront exposures narrowly miss five seconds. Phone-sized advertising exposure is substantially below target.
- Windshield pillars and sign framing still limit cockpit advertising visibility.
- The local Buena Onda music catalog returns an error because its existing R2 server configuration is missing. NTS playback works; not every retained external station was independently certified.
- Physical midrange Android performance remains unverified.
- The legacy GTO cockpit has faceted mirrors and some radio clipping. It does not match the primary vehicle's cockpit quality.
- This street does not add traffic, pedestrians or rain. The original Cruise retains its previous systems.
- The two requested visual-reference attachments were unavailable, so an exact image comparison was not possible.
- A whole-site optimized production build was not performed. This is not a production-readiness certification.

## Run locally

With the existing project dependencies installed:

```powershell
cd D:\10-VENTURES\12-buena-onda\cruise-publish-20261006
npm run dev -- --hostname 127.0.0.1 --port 3040
```

Open http://127.0.0.1:3040/cruise/miami-test and select **Start cruise**.

Use arrows/WASD for steering and speed, Space to pause, Q/E or the glance buttons to look, and the on-screen buttons for touch steering. Open Radio for accessible controls or use the physical dashboard controls.

## Evidence and implementation files

- [Exterior gameplay - 56.84 seconds](chase-gameplay.webm)
- [Cockpit gameplay with NTS playback state - 58.60 seconds](cockpit-radio-gameplay.webm)
- [Billboard screenshot](billboard-review.png)
- [Buena Onda approach screenshot](desktop-chase-40m-review.png)
- [Branches approach screenshot](desktop-chase-125m-review.png)
- [Cockpit with radio playing](radio-driving-80m.png)
- [Phone landscape viewport](android-landscape-viewport-review.png)
- [Complete review and reproduction instructions](README.md)
- [Asset sources and licenses](ASSETS.md)
- [Engine, Mindblown and REA findings](RESEARCH.md)
- [Independent Astra review](ASTRA-REVIEW.md)
- [Main experience component](../../../components/cruise/master/MiamiStreet.tsx)
- [Street environment](../../../components/cruise/master/StreetEnvironment.tsx)
- [Driving and cameras](../../../components/cruise/master/DriveController.tsx)
- [Exposure measurements](../../../components/cruise/master/StreetMetrics.tsx)

The screen recordings are silent; actual audio playback was verified separately through media events and advancing playback time. They are captures of the implemented game, not generated reference images.

## Review and next action

Independent review was performed by **gpt-6-astra** using source code, actual screenshots, timed frames and measurements. Implementation specialists used the inherited Codex/GPT-6 model; its exact backend variant was not exposed. Claude was unavailable and did not participate.

**Recommendation: PARTIAL - continue developing this Three.js foundation.** Keep the street scope fixed. Prioritize cockpit/facade materials and mobile sign typography/sightlines, restore the authorized catalog configuration, and test physical Android hardware before claiming photorealism, sustained mobile performance or advertising readiness.
